#!/usr/bin/env python3
"""Test if Chromium can load Facebook"""

from playwright.sync_api import sync_playwright
import time

print("Testing if Chromium can load Facebook...")

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=False,
        args=[
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--no-sandbox'
        ]
    )
    context = browser.new_context()
    page = context.new_page()

    print("1. Testing Google...")
    try:
        page.goto("https://www.google.com", timeout=30000)
        print("✓ Google loaded")
    except Exception as e:
        print(f"✗ Google failed: {e}")

    time.sleep(2)

    print("\n2. Testing Facebook home...")
    try:
        page.goto("https://www.facebook.com", timeout=30000)
        print("✓ Facebook home loaded")
    except Exception as e:
        print(f"✗ Facebook home failed: {e}")

    time.sleep(2)

    print("\n3. Testing Facebook Marketplace...")
    try:
        page.goto("https://www.facebook.com/marketplace", timeout=30000)
        print("✓ Facebook Marketplace loaded")
    except Exception as e:
        print(f"✗ Facebook Marketplace failed: {e}")

    print("\nBrowser will stay open for 10 seconds...")
    time.sleep(10)

    browser.close()
    print("\n✓ Test complete")
