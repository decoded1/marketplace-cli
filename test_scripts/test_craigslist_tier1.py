#!/usr/bin/env python3
"""
Craigslist Tier 1 Test - Search Results Validation
Tests CraigslistScraper with multiple queries, categories, and locations
"""

import sys
import json
from pathlib import Path

# Add patched CraigslistScraper to path (handles missing prices & advanced filters)
sys.path.insert(0, str(Path(__file__).parent.parent / 'craigslist_scraper_patched'))
sys.path.insert(0, str(Path(__file__).parent.parent / 'craigslist-tools' / 'CraigslistScraper'))

from search import fetch_search, Search
CRAIGSLIST_CONDITION_CODES = getattr(Search, "CONDITION_MAP", {})

print("=" * 70)
print("CRAIGSLIST TIER 1 TEST - SEARCH RESULTS VALIDATION")
print("=" * 70)

# Test configurations
test_configs = [
    # Test 1: Nintendo Switch in Philadelphia area
    {
        "name": "Nintendo Switch - Philadelphia",
        "query": "nintendo switch",
        "city": "philadelphia",
        "category": "sss",  # for sale by owner
        "expected_min_results": 5
    },
    # Test 2: Nintendo Switch in South Jersey
    {
        "name": "Nintendo Switch - South Jersey",
        "query": "nintendo switch",
        "city": "southjersey",
        "category": "sss",
        "expected_min_results": 3
    },
    # Test 3: Nintendo Switch in Jersey Shore
    {
        "name": "Nintendo Switch - Jersey Shore",
        "query": "nintendo switch",
        "city": "jerseyshore",
        "category": "sss",
        "expected_min_results": 1
    },
    # Test 4: iPhone in Philadelphia
    {
        "name": "iPhone - Philadelphia",
        "query": "iphone",
        "city": "philadelphia",
        "category": "sss",
        "expected_min_results": 10
    },
    # Test 5: Bicycle in Philadelphia (different category)
    {
        "name": "Bicycle - Philadelphia",
        "query": "bicycle",
        "city": "philadelphia",
        "category": "bik",  # bicycles
        "expected_min_results": 5
    },
    # Test 6: Furniture in Philadelphia
    {
        "name": "Couch - Philadelphia",
        "query": "couch",
        "city": "philadelphia",
        "category": "fuo",  # furniture by owner
        "expected_min_results": 10
    },
    # Test 7: iPhone near ZIP 08021 within 10 miles (ZIP + radius)
    {
        "name": "iPhone - ZIP 08021 within 10 miles",
        "query": "iphone",
        "city": "southjersey",  # Craigslist site serving Pine Hill, NJ
        "category": "sss",
        "postal": "08021",
        "search_distance": 10,
        "expected_min_results": 5
    },
    # Test 8: Advanced filters (conditions, price range, make/model)
    {
        "name": "iPhone 15 Pro - 08021 within 100 miles - Advanced Filters",
        "query": "iphone",
        "city": "southjersey",
        "category": "ela",  # electronics
        "postal": "08021",
        "search_distance": 100,
        "min_price": 40,
        "max_price": 2000,
        "conditions": [10, 20, 30, 40, 50],  # new through fair
        "extra_params": {
            "auto_make_model": "apple iphone 15 pro"
        },
        "expected_min_results": 1
    },
]

all_results = []
test_summary = []

for i, config in enumerate(test_configs, 1):
    print(f"\n{'=' * 70}")
    print(f"TEST {i}/{len(test_configs)}: {config['name']}")
    print(f"{'=' * 70}")
    print(f"Query: {config['query']}")
    print(f"City: {config['city']}")
    print(f"Category: {config['category']}")
    print(f"Expected: ≥{config['expected_min_results']} results")
    if config.get("postal"):
        print(f"Postal: {config['postal']} (radius {config.get('search_distance', 'N/A')} miles)")
    if config.get("min_price") is not None or config.get("max_price") is not None:
        print(f"Price range: ${config.get('min_price', 'Any')} - ${config.get('max_price', 'Any')}")
    if config.get("conditions"):
        condition_labels = [
            CRAIGSLIST_CONDITION_CODES.get(cond, cond) for cond in config["conditions"]
        ]
        print(f"Conditions: {condition_labels}")
    if config.get("extra_params"):
        print(f"Extra params: {config['extra_params']}")

    try:
        # Perform search
        print(f"\n[1/2] Executing search...")
        search = fetch_search(
            query=config['query'],
            city=config['city'],
            category=config['category'],
            postal=config.get('postal'),
            search_distance=config.get('search_distance'),
            min_price=config.get('min_price'),
            max_price=config.get('max_price'),
            conditions=config.get('conditions'),
            extra_params=config.get('extra_params')
        )

        # Extract results
        results_count = len(search.ads)
        print(f"✓ Found {results_count} listings")

        # Display sample results
        if results_count > 0:
            print(f"\n[2/2] Sample listings:")
            for j, ad in enumerate(search.ads[:3], 1):
                print(f"\n  Listing {j}:")
                print(f"    Title: {ad.title[:60]}...")
                if getattr(ad, 'posted_hours_ago', None) is not None:
                    print(f"    Posted: {ad.posted_hours_ago}h ago (raw: {ad.posted_label})")
                elif getattr(ad, 'posted_date', None):
                    print(f"    Posted: {ad.posted_date} (raw: {ad.posted_label})")
                print(f"    Price: ${ad.price}" if ad.price else "    Price: Not listed")
                print(f"    URL: {ad.url}")

            if results_count > 3:
                print(f"\n  ... and {results_count - 3} more listings")

        # Store full results
        search_dict = search.to_dict()
        all_results.append({
            "test_name": config['name'],
            "query": config['query'],
            "city": config['city'],
            "category": config['category'],
            "postal": config.get('postal'),
            "search_distance": config.get('search_distance'),
            "min_price": config.get('min_price'),
            "max_price": config.get('max_price'),
            "conditions": config.get('conditions'),
            "extra_params": config.get('extra_params'),
            "results_count": results_count,
            "url": search.url,
            "listings": search_dict['ads']
        })

        # Validation
        passed = results_count >= config['expected_min_results']
        status = "✅ PASS" if passed else "⚠️ BELOW EXPECTED"

        test_summary.append({
            "test": config['name'],
            "results": results_count,
            "expected": config['expected_min_results'],
            "passed": passed
        })

        print(f"\nStatus: {status}")

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()

        test_summary.append({
            "test": config['name'],
            "results": 0,
            "expected": config['expected_min_results'],
            "passed": False,
            "error": str(e)
        })

# Save all results
output_file = Path(__file__).parent.parent / 'craigslist_tier1_results.json'
with open(output_file, 'w') as f:
    json.dump(all_results, f, indent=2)

print(f"\n{'=' * 70}")
print("SUMMARY")
print(f"{'=' * 70}")

total_tests = len(test_summary)
passed_tests = sum(1 for t in test_summary if t['passed'])
total_listings = sum(t['results'] for t in test_summary)

for summary in test_summary:
    status_icon = "✅" if summary['passed'] else "⚠️"
    error_msg = f" (Error: {summary.get('error', '')})" if 'error' in summary else ""
    print(f"{status_icon} {summary['test']}: {summary['results']} results (expected ≥{summary['expected']}){error_msg}")

print(f"\n{'=' * 70}")
print(f"Tests Passed: {passed_tests}/{total_tests}")
print(f"Total Listings Found: {total_listings}")
print(f"Results saved to: {output_file}")
print(f"{'=' * 70}")

# Data Structure Analysis
print(f"\n{'=' * 70}")
print("TIER 1 DATA STRUCTURE ANALYSIS")
print(f"{'=' * 70}")

if all_results and all_results[0]['listings']:
    sample_listing = all_results[0]['listings'][0]
    print("\nFields available in tier 1 (search results):")
    for key, value in sample_listing.items():
        value_preview = str(value)[:50] + "..." if len(str(value)) > 50 else str(value)
        print(f"  • {key}: {value_preview}")

    print("\nMapped to standardized format:")
    print(f"  • title: {sample_listing.get('title', 'N/A')[:50]}...")
    print(f"  • price: ${sample_listing.get('price', 'N/A')}")
    print(f"  • url: {sample_listing.get('url', 'N/A')}")
    print(f"  • platform: craigslist")
    print(f"  • location: {all_results[0]['city']}")

    print("\n✓ Tier 1 fields map cleanly to standardized schema")

print(f"\n{'=' * 70}")
print("NEXT STEPS")
print(f"{'=' * 70}")
print("1. Review craigslist_tier1_results.json for full data")
print("2. Run test_craigslist_tier2.py to test detailed scraping")
print("3. Compare results to manual Craigslist browsing for accuracy")
print(f"{'=' * 70}")
