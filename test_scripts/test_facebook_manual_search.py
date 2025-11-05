#!/usr/bin/env python3
"""
Facebook Marketplace - Manual Search Test
Navigate to Marketplace, let user search manually, then scrape results
"""

from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import json
import time
import os

session_file = '/Users/nes/projects/marketplace-cli/facebook_session.json'

print("=" * 60)
print("Facebook Marketplace - Manual Search Test")
print("=" * 60)

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=False,
        args=[
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--no-sandbox'
        ]
    )

    # Load session if available
    if os.path.exists(session_file):
        print(f"\nLoading saved session...")
        context = browser.new_context(storage_state=session_file)
    else:
        print(f"\nNo saved session, using fresh context...")
        context = browser.new_context()

    page = context.new_page()

    print("\n1. Navigating to Facebook Marketplace...")
    page.goto("https://www.facebook.com/marketplace")
    print("✓ Marketplace loaded")

    print("\n" + "=" * 60)
    print("MANUAL SEARCH INSTRUCTIONS")
    print("=" * 60)
    print("\nIn the browser window:")
    print("1. If not logged in, please login now")
    print("2. Search for 'nintendo switch' in the search box")
    print("3. Set location to Philadelphia or your area")
    print("4. Set max price to $300")
    print("5. Wait for results to load")
    print("\nScript will wait 60 seconds, then scrape whatever is on screen...")
    print("=" * 60)

    time.sleep(60)

    # Save session
    if not os.path.exists(session_file):
        print("\n✓ Saving session for future use...")
        context.storage_state(path=session_file)

    # Get current page HTML
    print("\n✓ Scraping current page...")
    html = page.content()

    # Save raw HTML for inspection
    with open('/Users/nes/projects/marketplace-cli/facebook_marketplace_raw.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("✓ Raw HTML saved to: facebook_marketplace_raw.html")

    # Parse with BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')

    # Try to find listing links
    # Facebook Marketplace listings usually have /marketplace/item/ in the URL
    links = soup.find_all('a', href=True)
    listing_links = [link for link in links if '/marketplace/item/' in link.get('href', '')]

    print(f"\n✓ Found {len(listing_links)} potential marketplace item links")

    if listing_links:
        print("\nFirst 5 listing URLs:")
        for i, link in enumerate(listing_links[:5]):
            url = link['href']
            if not url.startswith('http'):
                url = f"https://www.facebook.com{url}"
            print(f"  {i+1}. {url}")

    # Try to extract any text that looks like prices
    text_content = soup.get_text()
    import re
    prices = re.findall(r'\$\d+(?:,\d{3})*(?:\.\d{2})?', text_content)
    print(f"\n✓ Found {len(prices)} price tags: {prices[:10]}")

    print("\nBrowser will stay open for 30 seconds for you to inspect...")
    time.sleep(30)

    browser.close()

print("\n" + "=" * 60)
print("✓ Test complete!")
print("\nNext step: Analyze facebook_marketplace_raw.html")
print("to understand the exact HTML structure for parsing")
print("=" * 60)
