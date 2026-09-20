import os
import time
from playwright.sync_api import sync_playwright

print("Starting AI Browser Profile for login...")
print("Please wait...")

user_data_dir = r"C:\LazyAiBackend\AIBrowserProfile"
lock_file = os.path.join(user_data_dir, "SingletonLock")
if os.path.exists(lock_file):
    try:
        os.remove(lock_file)
        print("Removed dangling SingletonLock.")
    except Exception as e:
        print(f"Warning: {e}")

with sync_playwright() as p:
    context = p.chromium.launch_persistent_context(
        user_data_dir=user_data_dir,
        channel="chrome",
        headless=False,
        viewport={'width': 1280, 'height': 800},
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    )
    
    page = context.pages[0] if context.pages else context.new_page()
    
    print("\n" + "="*50)
    print("🌐 BROWSER OPEN 🌐")
    print("You can now log into Instagram, X (Twitter), YouTube, etc.")
    print("The AI will inherit all of your logged-in sessions!")
    print("When you are entirely finished, simply CLOSE THE BROWSER WINDOW.")
    print("="*50 + "\n")
    
    # Wait indefinitely until the user manually closes the browser
    try:
        page.wait_for_event("close", timeout=0)
    except Exception:
        pass

print("Browser closed. All cookies and logins have been saved to the AI's profile!")
