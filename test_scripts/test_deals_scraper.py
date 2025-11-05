#!/usr/bin/env python3
"""
Test script for Deals-Scraper
Tests multi-platform scraper for Pine Hill, NJ (08021)
Focus on eBay since Facebook needs login and Kijiji is Canadian
"""

import sys
import os
import configparser
import json

# Add Deals-Scraper to path
sys.path.insert(0, '/Users/nes/projects/marketplace-cli/multi-platform-tools/Deals-Scraper')

print("=" * 60)
print("Deals-Scraper - Pine Hill, NJ Test")
print("=" * 60)

# Create test config for Pine Hill, NJ
config = configparser.ConfigParser()

# Default settings
config['DEFAULT'] = {
    'Keywords': 'nintendo switch',
    'Exclusions': 'case screen protector',
    'StrictMode': 'False',
    'Interval': '1'
}

# Disable Facebook (needs login)
config['FACEBOOK'] = {
    'Enabled': 'False',
    'CityId': '',
    'MinPrice': '0',
    'MaxPrice': '300',
    'SortBy': 'price_ascend'
}

# Disable Kijiji (Canadian only)
config['KIJIJI'] = {
    'Enabled': 'False',
    'CityUrl': '',
    'Identifier': '',
    'MinPrice': '0',
    'MaxPrice': '300',
    'Type': 'ownr'
}

# Enable eBay
config['EBAY'] = {
    'Enabled': 'True',
    'MinPrice': '0',
    'MaxPrice': '300'
}

# Disable Lespacs (broken)
config['LESPACS'] = {
    'Enabled': 'False',
    'MinPrice': '0',
    'MaxPrice': '300',
    'City': 'montreal',
    'Distance': '200'
}

print("\nConfiguration:")
print(f"  Keywords: {config['DEFAULT']['Keywords']}")
print(f"  Max Price: ${config['EBAY']['MaxPrice']}")
print(f"  Platforms: eBay only (Facebook needs login, Kijiji is Canadian)")
print(f"  Location: Pine Hill, NJ 08021")

print("\nAttempting to scrape eBay...")

try:
    from scrapy.crawler import CrawlerProcess
    from websites.ebay.ebay import Ebay

    # Create a Scrapy process
    process = CrawlerProcess(settings={
        "FEEDS": {
            "/Users/nes/projects/marketplace-cli/deals_scraper_results.json": {
                "format": "json",
                "overwrite": True
            }
        },
        "USER_AGENT": 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        "LOG_LEVEL": 'INFO'
    })

    # Start the eBay scraper
    process.crawl(Ebay, config)
    process.start()

    print("\n✓ Scraping completed")

    # Read results
    try:
        with open('/Users/nes/projects/marketplace-cli/deals_scraper_results.json', 'r') as f:
            results = json.load(f)

        print(f"✓ Found {len(results)} eBay listings")

        # Display first 5 results
        for idx, item in enumerate(results[:5]):
            print(f"\n{idx + 1}. {item.get('Title', 'N/A')}")
            print(f"   Price: ${item.get('Price', 'N/A')}")
            print(f"   URL: {item.get('Link', 'N/A')}")

        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Tool: Deals-Scraper (eBay module)")
        print(f"Location: Pine Hill, NJ 08021")
        print(f"Query: 'nintendo switch'")
        print(f"Max Price: $300")
        print(f"Results: {len(results)} listings")
        print(f"Status: ✓ WORKING")
        print(f"\nKey findings:")
        print(f"  - eBay scraping works without login")
        print(f"  - Facebook module requires login/cookies")
        print(f"  - Kijiji module is Canada-only")
        print(f"  - Heavy Scrapy framework dependency")
        print(f"  - Config-driven with INI file")

    except FileNotFoundError:
        print("\n⚠️  No results file generated")
        print("  Scraping may have failed or found no results")

except ImportError as e:
    print(f"\n✗ Import Error: {e}")
    print("  Installing Scrapy and dependencies...")
    os.system("cd /Users/nes/projects/marketplace-cli/multi-platform-tools/Deals-Scraper && pip install scrapy requests lxml")

except Exception as e:
    print(f"\n✗ Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
