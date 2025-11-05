#!/usr/bin/env python3
"""
Facebook Marketplace Scraper - WITH LOGIN SUPPORT
For Pine Hill, NJ (08021) - using Philadelphia area

This script uses Playwright with manual login capability.
You need to provide your Facebook credentials.
"""

from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import json
import time
import os

# CONFIGURATION
# You can either:
# 1. Set environment variables: FACEBOOK_EMAIL and FACEBOOK_PASSWORD
# 2. Or edit these values directly (NOT RECOMMENDED for git repos)

FACEBOOK_EMAIL = os.getenv('FACEBOOK_EMAIL', 'YOUR_EMAIL_HERE')
FACEBOOK_PASSWORD = os.getenv('FACEBOOK_PASSWORD', 'YOUR_PASSWORD_HERE')

def scrape_facebook_marketplace_with_login(city_code, query, max_price=300, save_session=True):
    """
    Scrape Facebook Marketplace with login support

    Args:
        city_code: Facebook city code (e.g., 'philly' for Philadelphia)
        query: Search query
        max_price: Maximum price filter
        save_session: Save browser state for future use
    """

    print("=" * 60)
    print("Facebook Marketplace Scraper - WITH LOGIN")
    print("=" * 60)

    marketplace_url = f'https://www.facebook.com/marketplace/{city_code}/search/?query={query}&maxPrice={max_price}'
    login_url = "https://www.facebook.com/login/device-based/regular/login/"

    # Path to save browser session
    session_file = '/Users/nes/projects/marketplace-cli/facebook_session.json'

    with sync_playwright() as p:
        # Launch browser in headful mode (visible) for login
        print("\nLaunching browser (visible mode for login)...")
        browser = p.chromium.launch(
            headless=False,  # Visible browser for login
            args=['--disable-blink-features=AutomationControlled']  # Hide automation
        )

        # Try to load existing session if available
        if os.path.exists(session_file) and save_session:
            print(f"Loading saved session from: {session_file}")
            context = browser.new_context(storage_state=session_file)
            page = context.new_page()
        else:
            context = browser.new_context()
            page = context.new_page()

        try:
            # Check if we need to login
            print("\nChecking login status...")
            page.goto("https://www.facebook.com")
            time.sleep(2)

            # If we see login form, we need to authenticate
            if "login" in page.url or page.locator('input[name="email"]').count() > 0:
                print("\n⚠️  Not logged in - attempting login...")

                if FACEBOOK_EMAIL == 'YOUR_EMAIL_HERE' or FACEBOOK_PASSWORD == 'YOUR_PASSWORD_HERE':
                    print("\n" + "=" * 60)
                    print("MANUAL LOGIN REQUIRED")
                    print("=" * 60)
                    print("\nPlease login manually in the browser window.")
                    print("The browser will wait for 60 seconds...")
                    print("\nAfter logging in successfully, the script will continue.")
                    print("\nPress Enter after you've logged in...")
                    input()
                else:
                    # Automated login
                    print(f"\nAttempting automated login for: {FACEBOOK_EMAIL}")
                    page.goto(login_url)
                    time.sleep(2)

                    page.fill('input[name="email"]', FACEBOOK_EMAIL)
                    page.fill('input[name="pass"]', FACEBOOK_PASSWORD)
                    page.click('button[name="login"]')

                    print("Waiting for login to complete...")
                    time.sleep(5)

                    # Check for 2FA or other verification
                    if "checkpoint" in page.url or "two_factor" in page.url:
                        print("\n⚠️  Two-factor authentication required!")
                        print("Please complete 2FA in the browser window...")
                        print("Press Enter after completing 2FA...")
                        input()

            else:
                print("✓ Already logged in!")

            # Save session for future use
            if save_session:
                print(f"\nSaving session to: {session_file}")
                context.storage_state(path=session_file)

            # Now scrape marketplace
            print(f"\n" + "=" * 60)
            print(f"Scraping Marketplace")
            print("=" * 60)
            print(f"URL: {marketplace_url}")

            page.goto(marketplace_url)
            time.sleep(3)

            # Scroll to load more items
            print("Scrolling to load items...")
            for i in range(3):
                page.keyboard.press('End')
                time.sleep(1)

            html = page.content()
            soup = BeautifulSoup(html, 'html.parser')

            # Parse listings
            # Note: Facebook changes class names frequently
            listings = soup.find_all('div', class_=lambda x: x and 'x9f619' in x if x else False)

            print(f"\nFound {len(listings)} potential listing containers")

            parsed = []
            for listing in listings[:20]:  # Limit to first 20
                try:
                    # Try to extract data - class names may vary
                    img_tag = listing.find('img')
                    image = img_tag['src'] if img_tag else None

                    # Find spans with text
                    spans = listing.find_all('span')
                    title = None
                    price = None
                    location = None

                    for span in spans:
                        text = span.get_text(strip=True)
                        if text:
                            if '$' in text and not price:
                                price = text
                            elif title is None and len(text) > 3:
                                title = text
                            elif location is None and len(text) > 2:
                                location = text

                    # Find link
                    a_tag = listing.find('a', href=True)
                    post_url = a_tag['href'] if a_tag else None

                    if title and price:
                        parsed.append({
                            'title': title,
                            'price': price,
                            'location': location or 'Unknown',
                            'image': image,
                            'url': f"https://www.facebook.com{post_url}" if post_url and post_url.startswith('/') else post_url
                        })
                except Exception as e:
                    continue

            print(f"\n✓ Successfully parsed {len(parsed)} listings")

            # Display results
            for idx, item in enumerate(parsed[:5]):
                print(f"\n{idx + 1}. {item['title']}")
                print(f"   Price: {item['price']}")
                print(f"   Location: {item['location']}")
                print(f"   URL: {item['url']}")

            # Save results
            output_file = '/Users/nes/projects/marketplace-cli/facebook_results_with_login.json'
            with open(output_file, 'w') as f:
                json.dump(parsed, f, indent=2)

            print(f"\n✓ Results saved to: {output_file}")

            return parsed

        except Exception as e:
            print(f"\n✗ Error: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return []

        finally:
            browser.close()

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Facebook Marketplace Scraper - Pine Hill, NJ")
    print("=" * 60)
    print("\nLocation: Pine Hill, NJ 08021 (using Philadelphia)")
    print("Query: 'nintendo switch'")
    print("Max Price: $300")
    print("\n" + "=" * 60)

    # Check for credentials
    if FACEBOOK_EMAIL == 'YOUR_EMAIL_HERE':
        print("\n⚠️  CREDENTIALS NOT SET")
        print("\nTo use automated login, set environment variables:")
        print("  export FACEBOOK_EMAIL='your_email@example.com'")
        print("  export FACEBOOK_PASSWORD='your_password'")
        print("\nOr you will be prompted to login manually in the browser.")
        print("\n" + "=" * 60)

    results = scrape_facebook_marketplace_with_login(
        city_code="philly",
        query="nintendo switch",
        max_price=300,
        save_session=True
    )

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Tool: facebook-marketplace-scraper (with login)")
    print(f"Location: Philadelphia (closest to Pine Hill, NJ 08021)")
    print(f"Results: {len(results)} listings")
    print(f"Status: {'✓ WORKING' if results else '⚠️ Check browser'}")
    print("\n" + "=" * 60)
    print("\nNOTES:")
    print("- Session saved for future use (no need to login again)")
    print("- Session file: facebook_session.json")
    print("- Browser opens in visible mode for login")
    print("- After first successful login, can run in headless mode")
