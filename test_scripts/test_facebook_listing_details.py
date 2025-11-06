#!/usr/bin/env python3
"""
Test scraping detailed information from individual Facebook Marketplace listings
"""

from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import json
import time
import os

session_file = '/Users/nes/projects/marketplace-cli/facebook_session.json'

print("=" * 60)
print("Facebook Marketplace - Listing Details Test")
print("=" * 60)

# Load the search results to get a sample listing URL
with open('/Users/nes/projects/marketplace-cli/facebook_results_automated.json', 'r') as f:
    search_results = json.load(f)

if not search_results:
    print("No search results found. Run test_facebook_automated_search.py first.")
    exit(1)

# Take first 3 listings as examples
sample_listings = search_results[:3]

print(f"\nWill scrape detailed info for {len(sample_listings)} listings...")

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=False,
        args=['--disable-blink-features=AutomationControlled', '--no-sandbox']
    )

    context = browser.new_context(storage_state=session_file)
    page = context.new_page()

    detailed_results = []

    for i, listing in enumerate(sample_listings):
        print(f"\n[{i+1}/{len(sample_listings)}] Scraping: {listing['title'][:50]}...")
        print(f"URL: {listing['url']}")

        try:
            page.goto(listing['url'], timeout=30000)
            time.sleep(3)  # Wait for page to load

            html = page.content()
            soup = BeautifulSoup(html, 'html.parser')

            # Save HTML for inspection
            with open(f'/Users/nes/projects/marketplace-cli/facebook_listing_{i+1}.html', 'w', encoding='utf-8') as f:
                f.write(html)

            # Try to extract various details
            details = {
                'url': listing['url'],
                'basic_title': listing['title'],
                'basic_price': listing['price'],
            }

            # Look for description
            # Descriptions are usually in specific div containers
            description_selectors = [
                'div[class*="description"]',
                'span[class*="description"]',
                'div[dir="auto"]',  # Facebook often uses this for text content
            ]

            for selector in description_selectors:
                desc_elements = soup.select(selector)
                if desc_elements:
                    # Get text from elements that look like descriptions (longer text)
                    for elem in desc_elements:
                        text = elem.get_text(strip=True)
                        if len(text) > 50 and len(text) < 1000:  # Reasonable description length
                            details['description'] = text
                            break
                if 'description' in details:
                    break

            # Look for seller information
            details['seller_name'] = 'Unknown'
            details['seller_location'] = listing.get('location', 'Unknown')

            # Look for condition, category, etc.
            # These are often in label/value pairs
            all_text = soup.get_text()

            # Check for common keywords
            if 'Condition:' in all_text or 'condition:' in all_text.lower():
                details['has_condition_info'] = True
            if 'Brand:' in all_text or 'brand:' in all_text.lower():
                details['has_brand_info'] = True

            # Count images
            images = soup.find_all('img')
            details['image_count'] = len([img for img in images if 'scontent' in str(img.get('src', ''))])

            detailed_results.append(details)
            print(f"✓ Extracted: {len(details)} fields")

        except Exception as e:
            print(f"✗ Error: {e}")
            detailed_results.append({'url': listing['url'], 'error': str(e)})

    # Save results
    output_file = '/Users/nes/projects/marketplace-cli/facebook_listing_details.json'
    with open(output_file, 'w') as f:
        json.dump(detailed_results, f, indent=2)

    print(f"\n✓ Detailed results saved to: {output_file}")

    # Display summary
    print("\n" + "=" * 60)
    print("DETAILED INFORMATION SUMMARY")
    print("=" * 60)
    for i, details in enumerate(detailed_results):
        print(f"\nListing {i+1}:")
        print(f"  Title: {details.get('basic_title', 'N/A')[:60]}")
        print(f"  Price: {details.get('basic_price', 'N/A')}")
        print(f"  Description: {details.get('description', 'Not found')[:100]}")
        print(f"  Images: {details.get('image_count', 0)}")
        print(f"  Has condition info: {details.get('has_condition_info', False)}")
        print(f"  Has brand info: {details.get('has_brand_info', False)}")

    print("\nBrowser will stay open for 10 seconds...")
    time.sleep(10)

    browser.close()

print("\n" + "=" * 60)
print("Analysis complete!")
print("Check the saved HTML files to see the full page structure")
print("=" * 60)
