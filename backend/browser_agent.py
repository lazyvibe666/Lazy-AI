import traceback
import json
import os
import asyncio
import threading
import queue
import subprocess
import random
import string
import time
import re
from playwright.sync_api import sync_playwright

# ─── ROTATING USER AGENTS ─────────────────────────────────────────────────────
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]

# ─── FINGERPRINT SPOOFING JS ──────────────────────────────────────────────────
# Injected into every page to randomize canvas fingerprint, WebGL, audio context,
# screen resolution, platform, and hardware concurrency — making each session unique
def get_fingerprint_spoof_script(seed: int) -> str:
    rng = random.Random(seed)
    canvas_noise = rng.uniform(0.0001, 0.0003)
    hw_concurrency = rng.choice([4, 6, 8, 12, 16])
    device_memory = rng.choice([4, 8, 16])
    platform = rng.choice(["Win32", "Win64", "MacIntel", "Linux x86_64"])
    screen_w = rng.choice([1920, 1920, 2560, 1440, 1366])
    screen_h = rng.choice([1080, 1080, 1440, 900, 768])

    return f"""
(() => {{
    // 1. Canvas fingerprint noise
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type) {{
        const ctx = this.getContext('2d');
        if (ctx) {{
            const imgData = ctx.getImageData(0, 0, this.width || 1, this.height || 1);
            for (let i = 0; i < imgData.data.length; i += 4) {{
                imgData.data[i] = Math.min(255, imgData.data[i] + Math.floor(Math.random() * {canvas_noise * 255:.4f}));
            }}
            ctx.putImageData(imgData, 0, 0);
        }}
        return origToDataURL.apply(this, arguments);
    }};

    // 2. Navigator spoofing
    Object.defineProperty(navigator, 'hardwareConcurrency', {{ get: () => {hw_concurrency} }});
    Object.defineProperty(navigator, 'deviceMemory', {{ get: () => {device_memory} }});
    Object.defineProperty(navigator, 'platform', {{ get: () => '{platform}' }});
    Object.defineProperty(navigator, 'webdriver', {{ get: () => false }});
    Object.defineProperty(navigator, 'languages', {{ get: () => ['en-US', 'en'] }});

    // 3. Screen spoofing
    Object.defineProperty(screen, 'width', {{ get: () => {screen_w} }});
    Object.defineProperty(screen, 'height', {{ get: () => {screen_h} }});
    Object.defineProperty(screen, 'availWidth', {{ get: () => {screen_w} }});
    Object.defineProperty(screen, 'availHeight', {{ get: () => {screen_h - 40} }});

    // 4. WebGL vendor/renderer spoofing
    const origGetParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {{
        if (param === 37445) return 'Google Inc. (NVIDIA)';
        if (param === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)';
        return origGetParam.call(this, param);
    }};

    // 5. Chrome-specific objects (bypass bot detection)
    window.chrome = {{ runtime: {{}} }};
    Object.defineProperty(navigator, 'plugins', {{ get: () => [1, 2, 3, 4, 5] }});

    // 6. Timezone normalization
    const origDateTimeFormat = Intl.DateTimeFormat;
    window.Intl.DateTimeFormat = function(locale, options) {{
        options = options || {{}};
        return new origDateTimeFormat(locale, options);
    }};
}})();
"""


class BrowserAgent:
    def __init__(self):
        self.request_queue  = queue.Queue()
        self.response_queue = queue.Queue()
        self._session_seed  = random.randint(1, 999999)
        self._user_agent    = random.choice(USER_AGENTS)
        self.worker_thread  = threading.Thread(target=self._worker_loop, daemon=True)
        self.worker_thread.start()

    def shutdown(self):
        """Cleanly shutdown the browser thread."""
        self.request_queue.put("SHUTDOWN")
        self.worker_thread.join(timeout=8.0)

    def _kill_zombies(self):
        """Kill any lingering Chromium processes holding the profile lock."""
        try:
            import psutil
            killed = 0
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    cmdline = proc.info.get('cmdline')
                    name = proc.info.get('name', '').lower()
                    
                    if name in ('chrome.exe', 'msedge.exe', 'chromium.exe') and cmdline:
                        # Check if AIBrowserProfile is in the command line
                        if any('AIBrowserProfile' in arg for arg in cmdline):
                            proc.kill()
                            killed += 1
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    pass
            if killed > 0:
                print(f"[BrowserAgent] Killed {killed} zombie browser processes.")
        except ImportError:
            print("[BrowserAgent] psutil not installed, cannot kill zombies robustly.")
        except Exception as e:
            print(f"[BrowserAgent] Zombie kill error: {e}")

    def _remove_singleton_lock(self, user_data_dir: str):
        locks = [
            "SingletonLock",
            "SingletonCookie",
            "SingletonSocket",
            os.path.join("Default", "lockfile")
        ]
        for lock in locks:
            lock_file = os.path.join(user_data_dir, lock)
            if os.path.exists(lock_file):
                try:
                    if os.path.isdir(lock_file):
                        import shutil
                        shutil.rmtree(lock_file)
                    else:
                        os.remove(lock_file)
                    print(f"[BrowserAgent] Removed dangling {lock}.")
                except Exception as e:
                    print(f"[BrowserAgent] Warning: Could not remove {lock}: {e}")

    def _worker_loop(self):
        while True:
            try:
                self._kill_zombies()
                with sync_playwright() as p:
                    import tempfile
                    import os
                    user_data_dir = os.path.join(tempfile.gettempdir(), f"AIBrowser_{os.getpid()}_{random.randint(1000,9999)}")
                    self._remove_singleton_lock(user_data_dir)

                    spoof_js = get_fingerprint_spoof_script(self._session_seed)

                    context_args = dict(
                        user_data_dir=user_data_dir,
                        channel="chrome",
                        headless=False,
                        viewport={'width': 1280, 'height': 800},
                        user_agent=self._user_agent,
                        locale="en-US",
                        timezone_id="America/New_York",
                        args=[
                            '--disable-blink-features=AutomationControlled',
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-infobars',
                            '--ignore-certificate-errors',
                            '--disable-session-crashed-bubble',
                            '--hide-scrollbars',
                            '--disable-dev-shm-usage',
                            '--disable-gpu-sandbox',
                            '--disable-web-security',
                            '--allow-running-insecure-content',
                            f'--window-size={random.randint(1200, 1400)},{random.randint(750, 900)}',
                        ],
                        ignore_default_args=["--enable-automation"],
                    )

                    try:
                        context = p.chromium.launch_persistent_context(**context_args)
                    except Exception as e:
                        if "existing browser session" in str(e).lower() or "lock" in str(e).lower():
                            print("[BrowserAgent] Playwright reported lock. Forcing hard retry...")
                            self._kill_zombies()
                            import time
                            time.sleep(1)
                            self._remove_singleton_lock(user_data_dir)
                            context = p.chromium.launch_persistent_context(**context_args)
                        else:
                            raise e

                    # Inject fingerprint spoof script into every new page
                    context.add_init_script(spoof_js)

                    page = context.pages[0] if context.pages else context.new_page()

                    # Apply spoof to existing page immediately
                    try:
                        page.evaluate(spoof_js)
                    except Exception:
                        pass

                    print(f"[BrowserAgent] Browser started. UserAgent: {self._user_agent[:50]}...")
                    print(f"[BrowserAgent] Fingerprint seed: {self._session_seed}")

                    shutdown = False
                    while True:
                        action_json = self.request_queue.get()
                        if action_json is None or action_json == "SHUTDOWN":
                            print("[BrowserAgent] Shutting down gracefully...")
                            try:
                                context.close()
                            except Exception:
                                pass
                            self.request_queue.task_done()
                            shutdown = True
                            break

                        needs_restart = False
                        try:
                            result = self._handle_action_sync(page, action_json)
                        except Exception as e:
                            error_msg = str(e)
                            print(f"[ERROR TRACE]:\n{traceback.format_exc()}")
                            if "Target closed" in error_msg or "lock" in error_msg.lower():
                                result = (
                                    "Browser Error: The browser crashed or was closed unexpectedly. "
                                    "The agent is auto-restarting the browser... Try your action again."
                                )
                                needs_restart = True
                            elif "Timeout" in error_msg:
                                result = (
                                    f"Browser Timeout: The page took too long to respond. "
                                    f"The current page state is: {self._safe_get_url(page)}"
                                )
                            else:
                                result = f"Browser Error ({type(e).__name__}): {error_msg}"

                        self.response_queue.put(result)
                        self.request_queue.task_done()

                        if needs_restart:
                            break  # Breaks inner loop to restart context
                    
                    if shutdown:
                        return # Exit thread

            except Exception as startup_error:
                print(f"[BrowserAgent] Fatal error: {startup_error}\n{traceback.format_exc()}")
                import time
                time.sleep(2)  # Wait before retrying entire loop

    def _safe_get_url(self, page) -> str:
        try:
            return page.url
        except Exception:
            return "unknown"

    def _handle_action_sync(self, page, action_json: str) -> str:
        # Clean JSON — AI sometimes wraps it in markdown
        clean = action_json.strip()
        clean = re.sub(r'^```(?:json)?\s*', '', clean)
        clean = re.sub(r'\s*```$', '', clean)

        action = json.loads(clean)
        cmd = action.get("command", "").strip().lower()
        print(f"[BrowserAgent] Executing: {cmd}")

        if cmd == "goto":
            url = action.get("url", "").strip()
            if not url.startswith("http"):
                url = "https://" + url
            try:
                page.goto(url, timeout=30000, wait_until="domcontentloaded")
            except Exception:
                print(f"[BrowserAgent] Goto timeout — grabbing DOM anyway.")
            page.wait_for_timeout(600)
            return self._get_dom_summary_sync(page)

        elif cmd == "click":
            selector = action.get("selector", "")
            try:
                page.click(selector, timeout=5000)
            except Exception:
                # Fallback: try clicking by text content
                text = action.get("text", "")
                if text:
                    try:
                        page.get_by_text(text, exact=False).first.click(timeout=3000, force=True)
                    except Exception:
                        return f"Click failed: could not find selector '{selector}' or text '{text}'"
                else:
                    return f"Click failed: selector '{selector}' not found"
            page.wait_for_timeout(800)
            return self._get_dom_summary_sync(page)

        elif cmd == "type":
            selector = action.get("selector", "")
            text = action.get("text", "")
            try:
                page.fill(selector, text, timeout=5000)
            except Exception:
                # Fallback: try clicking it forcibly then typing
                try:
                    page.click(selector, timeout=2000, force=True)
                    page.keyboard.type(text)
                except Exception as ex:
                    return f"Type failed: could not type into selector '{selector}'. Exception: {str(ex)}"
            if action.get("enter", False):
                page.keyboard.press("Enter")
                page.wait_for_timeout(1000)
                return self._get_dom_summary_sync(page)
            return "Typed successfully."

        elif cmd == "scroll":
            direction = action.get("direction", "down")
            amount = action.get("amount", 800)
            dy = amount if direction == "down" else -amount
            page.evaluate(f"window.scrollBy(0, {dy})")
            page.wait_for_timeout(400)
            return self._get_dom_summary_sync(page)

        elif cmd == "get_dom":
            return self._get_dom_summary_sync(page)

        elif cmd == "screenshot":
            # Return page URL and title as summary (we can't send images to the AI)
            title = page.title()
            url   = page.url
            return f"Page screenshot requested.\nTitle: {title}\nURL: {url}\n" + self._get_dom_summary_sync(page)

        elif cmd == "back":
            page.go_back(timeout=5000)
            page.wait_for_timeout(500)
            return self._get_dom_summary_sync(page)

        elif cmd == "wait":
            ms = min(action.get("ms", 1000), 5000)  # Cap at 5s
            page.wait_for_timeout(ms)
            return self._get_dom_summary_sync(page)

        elif cmd == "extract_text":
            selector = action.get("selector", "body")
            try:
                text = page.locator(selector).inner_text(timeout=3000)
                return f"Extracted text from '{selector}':\n{text[:3000]}"
            except Exception as e:
                return f"Extract failed: {e}"

        else:
            return (
                f"Unknown command '{cmd}'. "
                f"Available commands: goto, click, type, scroll, get_dom, back, wait, extract_text"
            )

    def _get_dom_summary_sync(self, page) -> str:
        try:
            # Get page title
            try:
                title = page.title()
            except Exception:
                title = "Unknown"

            # Smart interactive element extraction
            script = r"""
            () => {
                let elements = [];
                let seen = new Set();
                let interactables = document.querySelectorAll(
                    'a[href], button, input:not([type="hidden"]), textarea, select, [role="button"], [role="link"], [role="tab"], [role="menuitem"]'
                );
                interactables.forEach((el) => {
                    let rect = el.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) return;
                    if (rect.top < -200 || rect.top > window.innerHeight + 200) return; // Skip off-screen

                    let text = (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
                    text = text.substring(0, 60).replace(/\n+/g, ' ').replace(/\s+/g, ' ');
                    if (!text || seen.has(text)) return;
                    seen.add(text);

                    // Build the best possible selector
                    let selector = el.tagName.toLowerCase();
                    if (el.id) {
                        selector = '#' + el.id;
                    } else if (el.getAttribute('data-testid')) {
                        selector = `[data-testid="${el.getAttribute('data-testid')}"]`;
                    } else if (el.getAttribute('name')) {
                        selector += `[name="${el.getAttribute('name')}"]`;
                    } else if (el.className && typeof el.className === 'string') {
                        let classes = el.className.trim().split(/\s+/).slice(0, 2).join('.');
                        if (classes) selector += '.' + classes;
                    }

                    let href = el.getAttribute('href') || '';
                    if (href && !href.startsWith('#') && !href.startsWith('javascript')) {
                        elements.push(`[LINK] Selector: \`${selector}\` | Text: "${text}" | href: "${href.substring(0, 80)}"`);
                    } else {
                        elements.push(`[${el.tagName}] Selector: \`${selector}\` | Text: "${text}"`);
                    }
                });
                return elements.slice(0, 20).join('\n');
            }
            """
            interactive_map = page.evaluate(script)

            # Get clean visible text (smarter than innerText — strips nav/footer)
            text_script = r"""
            () => {
                // Try to get main content area
                let mainEl = document.querySelector('main, article, [role="main"], #content, .content, .article, .post');
                let el = mainEl || document.body;
                let text = el ? el.innerText : '';
                // Collapse whitespace
                return text.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
            }
            """
            raw_text = page.evaluate(text_script)
            clean_text = raw_text[:1200] if raw_text else ""

            # Meta description
            meta_script = r"""
            () => {
                let m = document.querySelector('meta[name="description"]');
                return m ? m.getAttribute('content') || '' : '';
            }
            """
            try:
                meta_desc = page.evaluate(meta_script)[:200]
            except Exception:
                meta_desc = ""

            output = f"--- Page: {title} ---\n"
            output += f"--- URL: {page.url} ---\n"
            if meta_desc:
                output += f"--- Description: {meta_desc} ---\n"
            output += f"\n[CLICKABLE ELEMENTS]\n{interactive_map}\n"
            output += f"\n[VISIBLE TEXT]\n{clean_text}"
            return output

        except Exception as e:
            print(f"[ERROR TRACE]:\n{traceback.format_exc()}")
            return f"DOM Error: {type(e).__name__} - {str(e)}"

    async def execute_action(self, action_json: str) -> str:
        """Non-blocking async interface — enqueues to dedicated browser thread."""
        self.request_queue.put(action_json)
        return await asyncio.to_thread(self.response_queue.get)


browser_agent = BrowserAgent()
