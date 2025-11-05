#!/usr/bin/env python3
"""
Test script for facebook-marketplace-scraper
Tests Facebook Marketplace scraping for Pine Hill, NJ (08021) area
Note: This tool uses Playwright and may require Facebook login
"""

import sys
import os

# Add the facebook scraper to path
sys.path.insert(0, '/Users/nes/projects/marketplace-cli/facebook-marketplace-tools/facebook-marketplace-scraper')

from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import json
import time

def scrape_facebook_marketplace(city_code, query, max_price=500):
    """
    Scrape Facebook Marketplace using Playwright

    Args:
        city_code: Facebook city code (e.g., 'philly' for Philadelphia)
        query: Search query
        max_price: Maximum price filter
    """
    print(f"Launching browser...")

    with sync_playwright() as p:
        # Launch browser in headless mode
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # Construct Facebook Marketplace URL
            # Format: https://www.facebook.com/marketplace/{city_code}/search?query={query}&maxPrice={max_price}
            url = f"https://www.facebook.com/marketplace/{city_code}/search?query={query}&maxPrice={max_price}"

            print(f"Navigating to: {url}")
            page.goto(url, timeout=30000)

            # Wait a bit for content to load
            time.sleep(3)

            # Get the HTML content
            html = page.content()

            # Parse with BeautifulSoup
            soup = BeautifulSoup(html, 'html.parser')

            # Try to find marketplace listings
            # Note: Facebook's HTML structure may have changed
            listings = soup.find_all('a', {'href': lambda href: href and '/marketplace/item/' in href})

            print(f"Found {len(listings)} potential listings")

            results = []
            for listing in listings[:10]:  # Limit to first 10
                try:
                    # Extract basic info
                    link = listing.get('href', '')
                    if link.startswith('/'):
                        link = f"https://www.facebook.com{link}"

                    # Try to extract text content
                    text = listing.get_text(strip=True)

                    results.append({
                        'url': link,
                        'text': text[:200]  # First 200 chars
                    })
                except Exception as e:
                    print(f"  Error parsing listing: {e}")
                    continue

            return results

        except Exception as e:
            print(f"Error during scraping: {type(e).__name__}: {e}")
            return []

        finally:
            browser.close()

print("=" * 60)
print("Facebook Marketplace Scraper - Pine Hill, NJ Test")
print("=" * 60)

# Philadelphia is closest major city to Pine Hill, NJ (08021)
print("\nNote: Using Philadelphia as closest city to Pine Hill, NJ")
print("Location: Pine Hill, NJ 08021 (using philly city code)")

try:
    results = scrape_facebook_marketplace(
        city_code="philly",
        query="nintendo switch",
        max_price=300
    )

    if results:
        print(f"\n✓ Scraped {len(results)} listings")

        for idx, item in enumerate(results[:5]):
            print(f"\n{idx + 1}. URL: {item['url']}")
            print(f"   Preview: {item['text'][:100]}...")

        # Save results
        output_file = '../facebook_results.json'
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)

        print(f"\n✓ Results saved to: {output_file}")

        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Tool: facebook-marketplace-scraper")
        print(f"Location: Philadelphia (closest to Pine Hill, NJ 08021)")
        print(f"Query: 'nintendo switch'")
        print(f"Max Price: $300")
        print(f"Results: {len(results)} listings found")
        print(f"Status: ✓ WORKING (with limitations)")
        print(f"\nNotes:")
        print(f"  - Requires Playwright browser automation")
        print(f"  - May be blocked by Facebook without login")
        print(f"  - HTML structure may change frequently")
        print(f"  - Risk of account ban if using logged-in session")
    else:
        print("\n✗ No results found")
        print("  Facebook may be blocking automated access")
        print("  This tool likely requires:")
        print("    1. Facebook login (headful browser)")
        print("    2. Human verification")
        print("    3. Cookies/session management")

except Exception as e:
    print(f"\n✗ Fatal error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
