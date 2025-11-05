#!/usr/bin/env python3
"""
Test script for CraigslistScraper
Tests lightweight Craigslist scraper
"""

import craigslistscraper as cs
import json

def test_basic_search():
    """Test basic search for items in Newark, NJ area"""
    print("=" * 60)
    print("Testing CraigslistScraper - Basic Search")
    print("=" * 60)

    try:
        # Search for Nintendo Switch in Minneapolis (example from README)
        # Then we'll try Newark/NJ
        print("\nTesting with Minneapolis first (from README example)...")
        search = cs.Search(
            query="nintendo switch",
            city="minneapolis",
            category="sss"  # for sale
        )

        # Fetch the search results
        status = search.fetch()
        print(f"Fetch status: {status}")

        if status != 200:
            print(f"✗ Failed to fetch search (status {status})")
            return False

        print(f"✓ Successfully fetched search results")
        print(f"  Found {len(search.ads)} ads")

        # Get first 3 ads
        results = []
        for idx, ad in enumerate(search.ads[:3]):
            status = ad.fetch()
            if status == 200:
                data = ad.to_dict()
                results.append(data)
                print(f"\n{idx + 1}. {data.get('title', 'N/A')}")
                print(f"   Price: {data.get('price', 'N/A')}")
                print(f"   Location: {data.get('location', 'N/A')}")
                print(f"   URL: {data.get('url', 'N/A')}")
            else:
                print(f"✗ Failed to fetch ad {idx + 1} (status {status})")

        # Save results
        with open('craigslistscraper_test_results.json', 'w') as f:
            json.dump(results, f, indent=2)

        print(f"\n✓ Success! Fetched {len(results)} detailed ads")
        print("  Results saved to: craigslistscraper_test_results.json")
        return True

    except Exception as e:
        print(f"\n✗ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_newark_search():
    """Test search in Newark/New Jersey area"""
    print("\n" + "=" * 60)
    print("Testing CraigslistScraper - Newark, NJ Search")
    print("=" * 60)

    # Try different city names for Newark area
    cities_to_try = [
        "newark",
        "jersey",
        "newjersey",
        "jerseyshore",
        "newyork"
    ]

    for city in cities_to_try:
        try:
            print(f"\nTrying city: '{city}'...")
            search = cs.Search(
                query="nintendo switch",
                city=city,
                category="sss"
            )

            status = search.fetch()
            if status == 200:
                print(f"  ✓ Success! Found {len(search.ads)} ads for city '{city}'")

                # Try to get first ad detail
                if search.ads:
                    first_ad = search.ads[0]
                    ad_status = first_ad.fetch()
                    if ad_status == 200:
                        data = first_ad.to_dict()
                        print(f"  Sample ad: {data.get('title', 'N/A')}")
                        print(f"  Price: {data.get('price', 'N/A')}")

                        # Save this working config
                        with open('craigslistscraper_nj_working.json', 'w') as f:
                            json.dump({
                                'city': city,
                                'sample_ad': data,
                                'total_ads': len(search.ads)
                            }, f, indent=2)

                        return True
            else:
                print(f"  ✗ Failed (status {status})")

        except Exception as e:
            print(f"  ✗ Error: {type(e).__name__}: {e}")

    print("\n✗ Could not find working city name for Newark/NJ area")
    return False

if __name__ == "__main__":
    print("CraigslistScraper Functionality Test")
    print("Lightweight scraper with minimal dependencies")
    print()

    # Run tests
    test1 = test_basic_search()
    test2 = test_newark_search()

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Basic search test (Minneapolis): {'✓ PASS' if test1 else '✗ FAIL'}")
    print(f"Newark/NJ search test:           {'✓ PASS' if test2 else '✗ FAIL'}")

    if test1 or test2:
        print("\n✓ CraigslistScraper is working!")
        print("  This tool can be used in the unified CLI")
    else:
        print("\n✗ CraigslistScraper tests failed")
        print("  May need to check Craigslist site structure or connectivity")
