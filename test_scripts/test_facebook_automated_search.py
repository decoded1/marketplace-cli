#!/usr/bin/env python3
"""
Facebook Marketplace - FULLY AUTOMATED scraper
Uses page interaction instead of direct URL navigation to avoid crashes
"""

from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import json
import time
import os
import re

def scrape_facebook_marketplace_automated(query, location, max_price=None):
    """
    Scrape Facebook Marketplace using automated search interaction

    Args:
        query: Search term (e.g., "nintendo switch")
        location: Location name (e.g., "Philadelphia, PA")
        max_price: Maximum price filter (optional)
    """

    session_file = '/Users/nes/projects/marketplace-cli/facebook_session.json'

    print("=" * 60)
    print("Facebook Marketplace - Automated Scraper")
    print("=" * 60)
    print(f"\nQuery: {query}")
    print(f"Location: {location}")
    print(f"Max Price: ${max_price}" if max_price else "Max Price: None")

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
            print(f"\n✓ Loading saved session...")
            context = browser.new_context(storage_state=session_file)
        else:
            print(f"\n⚠️  No saved session found")
            print("Browser will open - please login manually")
            print("Waiting 60 seconds...")
            context = browser.new_context()

        page = context.new_page()

        try:
            # Step 1: Navigate to base Marketplace (this works!)
            print("\n[1/5] Navigating to Facebook Marketplace...")
            page.goto("https://www.facebook.com/marketplace", timeout=30000)
            print("✓ Marketplace loaded")
            time.sleep(3)

            # Save session if this is first time
            if not os.path.exists(session_file):
                print("✓ Saving session...")
                context.storage_state(path=session_file)

            # Step 2: Find and use the Marketplace-specific search box
            print("\n[2/5] Searching in Marketplace...")
            try:
                # Look for Marketplace search input specifically
                # The Marketplace page has its own search box
                search_box = None

                # Try Marketplace-specific search selectors
                marketplace_selectors = [
                    'input[placeholder*="Search Marketplace"]',
                    'input[aria-label*="Search Marketplace"]',
                    'input[placeholder*="marketplace" i]',
                ]

                for selector in marketplace_selectors:
                    try:
                        if page.locator(selector).count() > 0:
                            search_box = page.locator(selector).first
                            print(f"✓ Found Marketplace search box with selector: {selector}")
                            break
                    except:
                        continue

                if search_box:
                    search_box.fill(query)
                    search_box.press("Enter")
                    print(f"✓ Searched for: {query}")
                    print("Waiting for marketplace results to load...")
                    time.sleep(5)  # Wait for results
                else:
                    print("⚠️  Could not find Marketplace search box")
                    print("Please search manually in the browser...")
                    time.sleep(30)

            except Exception as e:
                print(f"⚠️  Search automation failed: {e}")
                print("Please search manually...")
                time.sleep(30)

            # Step 3: Scroll to load more items
            print("\n[3/5] Loading more items...")
            for i in range(3):
                page.keyboard.press('End')
                time.sleep(2)
            print("✓ Scrolled page")

            # Step 4: Extract page HTML
            print("\n[4/5] Extracting page content...")
            print(f"Current URL: {page.url}")
            html = page.content()

            # Save HTML for debugging
            with open('/Users/nes/projects/marketplace-cli/facebook_automated_debug.html', 'w', encoding='utf-8') as f:
                f.write(html)
            print("✓ Debug HTML saved to: facebook_automated_debug.html")

            # Step 5: Parse with BeautifulSoup
            print("\n[5/5] Parsing listings...")
            soup = BeautifulSoup(html, 'html.parser')

            # Find marketplace item links
            links = soup.find_all('a', href=True)
            listing_links = [link for link in links if '/marketplace/item/' in link.get('href', '')]

            print(f"✓ Found {len(listing_links)} marketplace listings")

            # Extract structured data
            results = []
            for link in listing_links:
                try:
                    url = link['href']
                    if not url.startswith('http'):
                        url = f"https://www.facebook.com{url}"

                    # Try to find price and title nearby
                    parent = link.find_parent()
                    text_content = parent.get_text() if parent else link.get_text()

                    # Extract price
                    price_match = re.search(r'\$\d+(?:,\d{3})*', text_content)
                    price = price_match.group() if price_match else "Unknown"

                    # Title is often the link text or nearby
                    title = link.get_text(strip=True) or "Unknown"

                    # Try to find image
                    img = link.find('img')
                    image_url = img['src'] if img and 'src' in img.attrs else None

                    results.append({
                        'title': title,
                        'price': price,
                        'url': url,
                        'image': image_url
                    })
                except:
                    continue

            # Filter by max_price if specified
            if max_price:
                filtered_results = []
                for item in results:
                    try:
                        price_str = item['price'].replace('$', '').replace(',', '')
                        if price_str.isdigit() and int(price_str) <= max_price:
                            filtered_results.append(item)
                    except:
                        continue
                results = filtered_results

            print(f"✓ Parsed {len(results)} listings")

            # Display first 5
            print("\n" + "=" * 60)
            print("RESULTS")
            print("=" * 60)
            for i, item in enumerate(results[:5]):
                print(f"\n{i+1}. {item['title']}")
                print(f"   Price: {item['price']}")
                print(f"   URL: {item['url']}")

            # Save results
            output_file = '/Users/nes/projects/marketplace-cli/facebook_results_automated.json'
            with open(output_file, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"\n✓ Results saved to: {output_file}")

            print("\nBrowser will stay open for 10 seconds...")
            time.sleep(10)

            return results

        except Exception as e:
            print(f"\n✗ Error: {e}")
            import traceback
            traceback.print_exc()
            return []

        finally:
            browser.close()


if __name__ == "__main__":
    results = scrape_facebook_marketplace_automated(
        query="nintendo switch",
        location="Philadelphia, PA",
        max_price=300
    )

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total listings found: {len(results)}")
    print(f"Status: {'✅ SUCCESS' if results else '⚠️ No results'}")
    print("=" * 60)
