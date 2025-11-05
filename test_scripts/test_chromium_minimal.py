#!/usr/bin/env python3
"""
Minimal Chromium test with detailed logging
"""

from playwright.sync_api import sync_playwright
import time
import sys

print("=" * 60)
print("Minimal Chromium Launch Test")
print("=" * 60)

try:
    print("\n[1/5] Creating Playwright instance...")
    with sync_playwright() as p:
        print("✓ Playwright instance created")

        print("\n[2/5] Launching Chromium browser...")
        sys.stdout.flush()

        browser = p.chromium.launch(
            headless=False,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ]
        )
        print("✓ Browser launched")

        print("\n[3/5] Creating browser context...")
        sys.stdout.flush()
        context = browser.new_context()
        print("✓ Context created")

        print("\n[4/5] Creating new page...")
        sys.stdout.flush()
        page = context.new_page()
        print("✓ Page created")

        print("\n[5/5] Navigating to Google...")
        page.goto("https://www.google.com")
        print("✓ Navigation successful")

        print("\n✅ ALL TESTS PASSED!")
        print("Browser will stay open for 10 seconds...")
        time.sleep(10)

        browser.close()
        print("\n✓ Browser closed cleanly")

except Exception as e:
    print(f"\n❌ ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("Test completed successfully!")
print("=" * 60)
