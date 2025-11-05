#!/usr/bin/env python3
"""
Test script for PyCraigslist
Tests basic functionality without FlareSolverr first to see what happens
"""

# Workaround: chardet as cchardet replacement (cchardet doesn't build on Python 3.12)
import sys
sys.modules['cchardet'] = __import__('chardet')

import pycraigslist
import json
from pycraigslist.exceptions import ConnectionError, HTTPError, InvalidFilterValue

def test_basic_search():
    """Test basic search for items in Newark, NJ area"""
    print("=" * 60)
    print("Testing PyCraigslist - Basic Search")
    print("=" * 60)

    try:
        # Search for Nintendo Switch in New York/New Jersey area
        # Using newyork site, newjersey area
        print("\nSearching for 'nintendo switch' in New Jersey...")
        search = pycraigslist.forsale(
            site="newyork",
            area="njy",  # North Jersey
            query="nintendo switch",
            max_price=300
        )

        print(f"Search URL: {search.url}")
        print(f"Total results: {search.count}")

        # Try to fetch first 5 results
        print("\nFetching first 5 listings...")
        results = []
        for idx, item in enumerate(search.search(limit=5)):
            results.append(item)
            print(f"\n{idx + 1}. {item.get('title', 'N/A')}")
            print(f"   Price: {item.get('price', 'N/A')}")
            print(f"   Location: {item.get('neighborhood', 'N/A')}")
            print(f"   URL: {item.get('url', 'N/A')}")

        # Save results to file
        with open('pycraigslist_results.json', 'w') as f:
            json.dump(results, f, indent=2)

        print(f"\n✓ Success! Found {len(results)} results")
        print("  Results saved to: pycraigslist_results.json")
        return True

    except ConnectionError as e:
        print(f"\n✗ Connection Error: {e}")
        print("  This might be due to Cloudflare blocking.")
        print("  You may need FlareSolverr (Docker) to bypass.")
        return False

    except HTTPError as e:
        print(f"\n✗ HTTP Error: {e}")
        return False

    except InvalidFilterValue as e:
        print(f"\n✗ Invalid Filter: {e}")
        return False

    except Exception as e:
        print(f"\n✗ Unexpected Error: {type(e).__name__}: {e}")
        return False

def test_categories():
    """Test available categories"""
    print("\n" + "=" * 60)
    print("Testing PyCraigslist - Available Categories")
    print("=" * 60)

    try:
        # Get available housing categories
        categories = pycraigslist.housing.get_categories()
        print("\nHousing categories:")
        for key, value in categories.items():
            print(f"  {key}: {value}")

        # Get available for-sale categories
        categories = pycraigslist.forsale.get_categories()
        print("\nFor-sale categories:")
        for key, value in list(categories.items())[:10]:  # Show first 10
            print(f"  {key}: {value}")

        return True

    except Exception as e:
        print(f"\n✗ Error: {type(e).__name__}: {e}")
        return False

def test_filters():
    """Test available filters"""
    print("\n" + "=" * 60)
    print("Testing PyCraigslist - Available Filters")
    print("=" * 60)

    try:
        # Create a search instance
        search = pycraigslist.forsale.cta(site="newyork", area="njy")

        # Get available filters
        filters = search.get_filters()
        print("\nAvailable filters for cars & trucks:")
        for key, value in list(filters.items())[:15]:  # Show first 15
            print(f"  {key}: {value}")

        return True

    except Exception as e:
        print(f"\n✗ Error: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    print("PyCraigslist Functionality Test")
    print("Location: New Jersey (newyork site, njy area)")
    print()

    # Run tests
    test1 = test_categories()
    test2 = test_filters()
    test3 = test_basic_search()

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Categories test: {'✓ PASS' if test1 else '✗ FAIL'}")
    print(f"Filters test:    {'✓ PASS' if test2 else '✗ FAIL'}")
    print(f"Search test:     {'✓ PASS' if test3 else '✗ FAIL'}")

    if not test3:
        print("\n⚠️  Search failed - likely needs FlareSolverr Docker setup")
        print("   PyCraigslist can still be used if FlareSolverr is configured")
