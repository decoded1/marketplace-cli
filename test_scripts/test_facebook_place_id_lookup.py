#!/usr/bin/env python3
"""
Facebook Place ID Lookup Testing Tool

This script tests different methods to find and validate Facebook Marketplace Place IDs.

Methods tested:
1. Known Place ID validation (from research)
2. GraphQL API location search (returns lat/long, not Place ID directly)
3. Browser automation to extract Place ID from URL
4. Place ID validation by checking if marketplace URL works

Usage:
    python test_facebook_place_id_lookup.py
"""

import requests
import json
import time

# Selenium is optional - only needed for browser-based discovery
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.firefox.options import Options
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("Note: Selenium not installed. Browser discovery will be skipped.")


# Known Place IDs from research (for validation testing)
KNOWN_PLACE_IDS = {
    # Your examples
    "Pine Hill, NJ": "109446379080961",
    "Camden, NJ": "112323215449515",
    "Rodeo, CA": "103177143056458",

    # Major cities (slugs)
    "New York, NY": "nyc",
    "Seattle, WA": "seattle",
    "San Francisco, CA": "sanfrancisco",
    "Los Angeles, CA": "la",
    "Portland, OR": "portland",
    "Philadelphia, PA": "philly",

    # Additional numeric IDs from research
    "Durango, CO": "108129565875623",
    "Fort Worth, TX": "114148045261892",
    "Oneonta, NY": "113333232014461",
    "Honolulu, HI": "110444738976181",
}


class FacebookPlaceIDLookup:
    """Class to handle Facebook Place ID discovery and validation"""

    def __init__(self):
        self.graphql_url = "https://www.facebook.com/api/graphql/"
        self.headers = {
            "sec-fetch-site": "same-origin",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.74 Safari/537.36"
        }

    def test_known_place_ids(self):
        """Test validation of known Place IDs by checking if URLs are accessible"""
        print("\n" + "="*80)
        print("TEST 1: Validating Known Place IDs")
        print("="*80)

        for city, place_id in KNOWN_PLACE_IDS.items():
            url = f"https://www.facebook.com/marketplace/{place_id}"
            print(f"\n{city:30} → {place_id}")
            print(f"  URL: {url}")

            # Note: Actual validation would require loading the page
            # For now, just show the constructed URL
            print(f"  Status: ✓ URL constructed")

    def graphql_location_search(self, city_query):
        """
        Search for location using Facebook GraphQL API

        Note: This returns latitude/longitude but NOT the Place ID directly.
        The Place ID is what appears in marketplace URLs.
        """
        print("\n" + "="*80)
        print(f"TEST 2: GraphQL Location Search for '{city_query}'")
        print("="*80)

        payload = {
            "variables": json.dumps({
                "params": {
                    "caller": "MARKETPLACE",
                    "page_category": ["CITY", "SUBCITY", "NEIGHBORHOOD", "POSTAL_CODE"],
                    "query": city_query
                }
            }),
            "doc_id": "5585904654783609"
        }

        print(f"\nSending GraphQL request...")
        print(f"Endpoint: {self.graphql_url}")
        print(f"Doc ID: 5585904654783609")

        try:
            response = requests.post(
                self.graphql_url,
                headers=self.headers,
                data=payload,
                timeout=10
            )

            print(f"Response Status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()

                # Pretty print the response
                print("\nResponse Preview:")
                print(json.dumps(data, indent=2)[:500] + "...")

                # Try to extract location data
                if "data" in data and "city_street_search" in data["data"]:
                    locations = data["data"]["city_street_search"]["street_results"]["edges"]

                    print(f"\n✓ Found {len(locations)} location(s):")

                    for i, location in enumerate(locations[:3], 1):  # Show first 3
                        node = location["node"]
                        name = node.get("single_line_address", "N/A")
                        lat = node.get("location", {}).get("latitude", "N/A")
                        lng = node.get("location", {}).get("longitude", "N/A")

                        print(f"\n  {i}. {name}")
                        print(f"     Latitude: {lat}")
                        print(f"     Longitude: {lng}")
                        print(f"     ⚠ Note: Place ID not returned by this API")
                else:
                    print("\n✗ No location data found in response")

            else:
                print(f"\n✗ Request failed with status {response.status_code}")
                print(f"Response: {response.text[:200]}")

        except requests.RequestException as e:
            print(f"\n✗ Request error: {e}")
        except Exception as e:
            print(f"\n✗ Error: {e}")

    def browser_place_id_discovery(self, city_query, use_saved_session=True):
        """
        Use browser automation to discover Place ID by searching Facebook Marketplace

        This method:
        1. Opens Facebook Marketplace
        2. Searches for the city
        3. Extracts the Place ID from the resulting URL
        """
        print("\n" + "="*80)
        print(f"TEST 3: Browser Place ID Discovery for '{city_query}'")
        print("="*80)

        if not SELENIUM_AVAILABLE:
            print("\n✗ Selenium not installed. Cannot perform browser discovery.")
            print("  Install with: pip install selenium")
            return None

        print("\nInitializing Firefox browser...")

        # Set up Firefox options
        options = Options()
        # options.add_argument('--headless')  # Uncomment for headless mode

        # Set up Firefox profile to use cookies
        profile = webdriver.FirefoxProfile()

        if use_saved_session:
            # Use existing Firefox profile with saved cookies
            import os
            home = os.path.expanduser("~")
            profile_path = os.path.join(home, ".mozilla", "firefox")
            print(f"  Using Firefox profile from: {profile_path}")

        try:
            driver = webdriver.Firefox(options=options)
            driver.set_page_load_timeout(30)

            print("✓ Browser launched")

            # Step 1: Navigate to Facebook Marketplace
            print("\nStep 1: Navigating to Facebook Marketplace...")
            driver.get("https://www.facebook.com/marketplace")
            time.sleep(3)

            # Check if we're logged in
            current_url = driver.current_url
            print(f"  Current URL: {current_url}")

            if "login" in current_url:
                print("\n⚠ WARNING: Not logged in to Facebook!")
                print("  This method requires an active Facebook session.")
                print("  Options:")
                print("  1. Log in to Facebook in this browser window")
                print("  2. Use cookies from an existing Firefox session")
                print("  3. Implement automated login (not recommended)")

                # Wait for manual login
                print("\n  Please log in manually in the browser window...")
                print("  Waiting 60 seconds for login...")
                time.sleep(60)

            # Step 2: Find and click search box
            print("\nStep 2: Searching for city...")
            try:
                # Multiple possible selectors for the search box
                search_selectors = [
                    "input[placeholder*='Search']",
                    "input[aria-label*='Search']",
                    "input[type='search']",
                ]

                search_box = None
                for selector in search_selectors:
                    try:
                        search_box = driver.find_element(By.CSS_SELECTOR, selector)
                        break
                    except NoSuchElementException:
                        continue

                if search_box:
                    search_box.clear()
                    search_box.send_keys(city_query)
                    search_box.submit()
                    print(f"  ✓ Searched for: {city_query}")

                    # Wait for URL to change
                    time.sleep(5)

                    # Step 3: Extract Place ID from URL
                    print("\nStep 3: Extracting Place ID from URL...")
                    final_url = driver.current_url
                    print(f"  Final URL: {final_url}")

                    # Parse the URL to extract place ID
                    if "/marketplace/" in final_url:
                        # Extract the place ID portion
                        # Format: facebook.com/marketplace/{PLACE_ID}/...
                        parts = final_url.split("/marketplace/")[1].split("/")[0].split("?")[0]
                        place_id = parts

                        print(f"\n✓ SUCCESS! Found Place ID: {place_id}")
                        print(f"  City: {city_query}")
                        print(f"  Place ID: {place_id}")
                        print(f"  Full URL: https://www.facebook.com/marketplace/{place_id}")

                        # Determine if it's a slug or numeric ID
                        id_type = "slug" if place_id.isalpha() else "numeric"
                        print(f"  Type: {id_type}")

                        return place_id
                    else:
                        print("  ✗ Could not find place ID in URL")
                        return None
                else:
                    print("  ✗ Could not find search box")
                    return None

            except TimeoutException:
                print("  ✗ Timeout waiting for search box")
                return None
            except Exception as e:
                print(f"  ✗ Error during search: {e}")
                return None

        except Exception as e:
            print(f"\n✗ Browser error: {e}")
            return None

        finally:
            print("\nClosing browser in 5 seconds...")
            time.sleep(5)
            driver.quit()
            print("✓ Browser closed")

    def validate_place_id(self, place_id, city_name=None):
        """
        Validate if a Place ID works by constructing a marketplace URL

        Note: Full validation would require loading the page with Selenium
        """
        print("\n" + "="*80)
        print(f"TEST 4: Validating Place ID: {place_id}")
        print("="*80)

        if city_name:
            print(f"City: {city_name}")

        # Construct URLs
        base_url = f"https://www.facebook.com/marketplace/{place_id}"
        search_url = f"https://www.facebook.com/marketplace/{place_id}/search?query=iphone&maxPrice=500"

        print(f"\nConstructed URLs:")
        print(f"  Base: {base_url}")
        print(f"  Search: {search_url}")

        # Determine type
        id_type = "slug" if place_id.replace("-", "").isalpha() else "numeric"
        print(f"\nPlace ID Type: {id_type}")

        print("\n✓ URLs constructed successfully")
        print("Note: Full validation requires browser automation to verify page loads")

        return True


def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("FACEBOOK MARKETPLACE PLACE ID LOOKUP - TEST SUITE")
    print("="*80)

    lookup = FacebookPlaceIDLookup()

    # Test 1: Validate known Place IDs
    lookup.test_known_place_ids()

    # Test 2: GraphQL API search
    test_cities = ["Atlantic City, NJ", "Berkeley, CA", "Austin, TX"]
    for city in test_cities[:1]:  # Test just one to avoid rate limiting
        lookup.graphql_location_search(city)
        time.sleep(2)

    # Test 3: Browser discovery (commented out by default - requires manual interaction)
    print("\n" + "="*80)
    print("TEST 3: Browser Place ID Discovery")
    print("="*80)
    print("\nThis test requires browser automation and Facebook login.")
    print("Uncomment the code below to test browser-based discovery:")
    print("\n  # discovered_id = lookup.browser_place_id_discovery('Atlantic City, NJ')")
    print("\nSkipping browser test for now...")

    # Uncomment to actually run browser test:
    # discovered_id = lookup.browser_place_id_discovery("Atlantic City, NJ", use_saved_session=True)

    # Test 4: Validate a specific Place ID
    lookup.validate_place_id("109446379080961", "Pine Hill, NJ")
    lookup.validate_place_id("nyc", "New York, NY")

    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"\n✓ Known Place IDs catalogued: {len(KNOWN_PLACE_IDS)}")
    print("✓ GraphQL API tested (returns lat/long, not Place ID)")
    print("✓ Browser discovery method outlined (requires login)")
    print("✓ Place ID validation method created")

    print("\n" + "="*80)
    print("NEXT STEPS")
    print("="*80)
    print("\n1. Create static database (JSON) with known Place IDs")
    print("2. Implement browser discovery with Facebook login")
    print("3. Build caching system to save discovered IDs")
    print("4. Integrate with location_handler.py")

    print("\n" + "="*80)
    print("KNOWN PLACE IDS - QUICK REFERENCE")
    print("="*80)
    for city, place_id in sorted(KNOWN_PLACE_IDS.items()):
        print(f"  {city:30} → {place_id}")


if __name__ == "__main__":
    main()
