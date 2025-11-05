#!/usr/bin/env python3
"""Find valid New Jersey Craigslist areas"""

# Workaround for cchardet
import sys
sys.modules['cchardet'] = __import__('chardet')

import pycraigslist

# Try to find New Jersey sites/areas
print("Checking Craigslist sites for New Jersey...")
print("=" * 60)

# Common NJ-related site names to try
nj_sites = ['newjersey', 'jerseyshore', 'southjersey', 'cnj', 'newyork']

for site in nj_sites:
    try:
        # Create a test search
        search = pycraigslist.forsale(site=site)
        print(f"\n✓ Site '{site}' is valid")
        print(f"  URL: {search.url}")
    except ValueError as e:
        print(f"\n✗ Site '{site}' failed: {e}")
    except Exception as e:
        print(f"\n? Site '{site}' error: {type(e).__name__}: {e}")
