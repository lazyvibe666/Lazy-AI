import asyncio
from playwright.async_api import async_playwright

async def main():
    print("==================================================")
    print("Launching Chromium in visible mode for manual login...")
    print("==================================================")
    p = await async_playwright().start()
    user_data_dir = r"C:\LazyAiBackend\AIBrowserProfile"
    
    context = await p.chromium.launch_persistent_context(
        user_data_dir=user_data_dir,
        headless=False,
        viewport={'width': 1280, 'height': 800},
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    )
    
    page = context.pages[0] if context.pages else await context.new_page()
    await page.goto("https://google.com")
    
    print("\nBrowser is open! Log into your Google, Instagram, or any other accounts now.")
    print("When you are finished, simply CLOSE THE BROWSER WINDOW to save the profile.\n")
    
    # Wait until all pages are closed by the user
    try:
        while len(context.pages) > 0:
            await asyncio.sleep(1)
    except Exception:
        pass
        
    await context.close()
    await p.stop()
    print("\nProfile saved successfully! You can now use the Agent AI.")

if __name__ == "__main__":
    asyncio.run(main())
