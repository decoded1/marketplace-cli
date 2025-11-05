#!/usr/bin/env python3
"""
Facebook Marketplace HTML Inspector
This script loads a saved session and saves the raw HTML for analysis
"""

from playwright.sync_api import sync_playwright
import time
import os

session_file = '/Users/nes/projects/marketplace-cli/facebook_session.json'
output_file = '/Users/nes/projects/marketplace-cli/facebook_marketplace_html.html'

if not os.path.exists(session_file):
    print("❌ Session file not found. Please run test_facebook_with_login.py first.")
    exit(1)

print("=" * 60)
print("Facebook Marketplace HTML Inspector")
print("=" * 60)
print("\nLoading saved session and fetching marketplace HTML...")

with sync_playwright() as p:
    browser = p.firefox.launch(headless=False)
    context = browser.new_context(storage_state=session_file)
    page = context.new_page()

    # Navigate to marketplace
    marketplace_url = 'https://www.facebook.com/marketplace/philly/search/?query=nintendo%20switch&maxPrice=300'
    print(f"\nNavigating to: {marketplace_url}")
    page.goto(marketplace_url)

    # Wait for content to load
    print("Waiting for content to load...")
    time.sleep(5)

    # Scroll to load items
    print("Scrolling to load more items...")
    for i in range(3):
        page.keyboard.press('End')
        time.sleep(1)

    # Get the HTML
    html = page.content()

    # Save to file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"\n✓ HTML saved to: {output_file}")
    print(f"File size: {len(html)} bytes")

    # Keep browser open for 30 seconds for manual inspection
    print("\nBrowser will stay open for 30 seconds for manual inspection...")
    time.sleep(30)

    browser.close()

print("\n✓ Done! You can now inspect the HTML file to improve parsing.")
