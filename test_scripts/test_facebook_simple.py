#!/usr/bin/env python3
"""
Simple Facebook Marketplace test using original app.py approach
This will open a browser where you can login manually
"""

from playwright.sync_api import sync_playwright
import time

print("=" * 60)
print("Simple Facebook Marketplace Test")
print("=" * 60)
print("\nThis will open a browser window for 60 seconds.")
print("Please login to Facebook manually in the browser.")

with sync_playwright() as p:
    print("\nLaunching Firefox browser...")
    browser = p.firefox.launch(headless=False)
    page = browser.new_page()

    print("Opening Facebook...")
    page.goto("https://www.facebook.com")

    print("\n" + "=" * 60)
    print("MANUAL LOGIN WINDOW - 60 SECONDS")
    print("=" * 60)
    print("\n1. Login to Facebook in the browser window")
    print("2. Navigate to Facebook Marketplace")
    print("3. Search for 'nintendo switch' in Philadelphia")
    print("\nBrowser will stay open for 60 seconds...")

    # Wait 60 seconds for you to login
    time.sleep(60)

    browser.close()
    print("\n✓ Test complete")
    print("\nIf you were able to login and see Marketplace, the approach works!")
    print("Next step: Automate the scraping after login.")
