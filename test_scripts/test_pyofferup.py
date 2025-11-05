#!/usr/bin/env python3
"""
Test script for pyOfferUp
Tests OfferUp scraping for Newark, NJ area
"""

from pyOfferUp import fetch, places
import json

print("=" * 60)
print("pyOfferUp - Newark, NJ Test")
print("=" * 60)

# First, let's check available NJ cities
print("\nAvailable cities in New Jersey:")
nj_cities = places.available_cities("New Jersey")
print(f"Found {len(nj_cities)} cities")
print(f"Cities near Newark: {[c for c in nj_cities if 'Newark' in c or 'Jersey' in c or 'Elizabeth' in c]}")

# Search for Nintendo Switch in Newark, NJ
print("\n" + "=" * 60)
print("Searching for 'nintendo switch' in Newark, NJ...")
print("=" * 60)

try:
    posts = fetch.get_listings(
        query="nintendo switch",
        state="New Jersey",
        city="Newark",
        limit=10
    )

    print(f"\n✓ Found {len(posts)} listings")

    # Display results
    for idx, post in enumerate(posts[:5]):  # Show first 5
        print(f"\n{idx + 1}. {post['title']}")
        print(f"   Price: ${post['price']}")
        print(f"   Location: {post['locationName']}")
        print(f"   URL: {post['listingUrl']}")
        if post.get('image'):
            print(f"   Image: {post['image']['url']}")
        print(f"   Listing ID: {post['listingId']}")

    # Save results
    output_file = 'offerup_results.json'
    with open(output_file, 'w') as f:
        json.dump(posts, f, indent=2)

    print(f"\n✓ Successfully scraped {len(posts)} listings")
    print(f"  Results saved to: {output_file}")

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Tool: pyOfferUp")
    print(f"Location: Newark, New Jersey")
    print(f"Query: 'nintendo switch'")
    print(f"Results: {len(posts)} listings fetched")
    print(f"Status: ✓ WORKING")
    print(f"\nKey findings:")
    print(f"  - Minimal dependencies (only requests)")
    print(f"  - Built-in city database for all 50 states")
    print(f"  - Simple API with city/state or lat/lon support")
    print(f"  - Returns: title, price, location, images, listing URL, ID")

except Exception as e:
    print(f"\n✗ Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

# Test lat/lon search as alternative
print("\n" + "=" * 60)
print("Testing latitude/longitude search...")
print("=" * 60)

try:
    # Newark, NJ coordinates
    newark_lat = 40.7357
    newark_lon = -74.1724

    print(f"\nSearching near coordinates: {newark_lat}, {newark_lon}")
    posts = fetch.get_listings_by_lat_lon(
        query="nintendo switch",
        lat=newark_lat,
        lon=newark_lon,
        limit=5
    )

    print(f"✓ Found {len(posts)} listings using lat/lon")
    if posts:
        print(f"  First result: {posts[0]['title']} - ${posts[0]['price']}")

except Exception as e:
    print(f"✗ Lat/lon search error: {type(e).__name__}: {e}")
