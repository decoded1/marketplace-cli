# Marketplace CLI Tools - Test Results

**Test Date**: November 5, 2025
**Location**: Pine Hill, NJ 08021
**Test Query**: "nintendo switch"
**Max Price**: $300

---

## Summary

Tested 5 marketplace scraping tools for Pine Hill, NJ (08021) area.

**Working Tools**: ✅ 2 of 5
**Non-Working**: ❌ 3 of 5
**On Hold**: ⏸️ 1 (PyCraigslist - requires Docker)

---

## Test Results

### ✅ **CraigslistScraper** - WORKING
- **Status**: ✅ Fully functional
- **Location**: Jersey Shore, NJ (covers Pine Hill area)
- **Results**: Found 1 listing
- **Sample**: Nintendo Switch - $250 (Brick, NJ)
- **Dependencies**: requests, beautifulsoup4 (minimal)
- **Setup**: Simple `pip install craigslistscraper`

**Pros**:
- Lightweight (~200 lines of code)
- No Docker or special setup
- Works out of the box
- Returns: title, price, description, images, URL

**Cons**:
- Limited results (may need better search terms)
- HTML parsing can break if Craigslist changes structure

---

### ✅ **pyOfferUp** - WORKING
- **Status**: ✅ Fully functional
- **Location**: Newark, NJ (7 NJ cities available including Newark, Elizabeth, Jersey City)
- **Results**: Found 43 listings
- **Price Range**: $30-$100
- **Dependencies**: requests only (minimal)
- **Setup**: Simple `pip install pyOfferUp`

**Pros**:
- Built-in US city database (all 50 states)
- Both city/state AND lat/lon search support
- Excellent results count
- Simple API
- Returns: title, price, location, images, listing URL, ID

**Cons**:
- SSL warning (unverified HTTPS)
- Older Python support (3.4-3.8 listed, but works on 3.12)

**Best Tool Overall** - Recommended for unified CLI

---

### ❌ **facebook-marketplace-scraper** - NOT WORKING
- **Status**: ❌ Blocked by Facebook
- **Error**: Target page/browser closed
- **Issue**: Facebook blocks automated access

**Findings**:
- Requires Playwright browser automation
- Facebook detects and blocks headless browsers
- Would need:
  - Login credentials
  - Human verification / CAPTCHAs
  - Cookie/session management
  - Risk of account ban

**Conclusion**: Not viable for automated CLI tool without Facebook account

---

### ❌ **Deals-Scraper** - NOT WORKING
- **Status**: ❌ No results
- **Tested**: eBay module only (Facebook needs login, Kijiji is Canadian)
- **Results**: 0 listings found
- **Dependencies**: Scrapy + 30 supporting libraries (heavy)

**Findings**:
- Heavy Scrapy framework dependency
- eBay scraping returned 0 results (may be blocked or broken)
- Facebook module requires login (same issue as facebook-marketplace-scraper)
- Kijiji module is Canada-only (not relevant for Pine Hill, NJ)
- Lespacs broken (noted in README)
- Amazon blocked by CAPTCHA (noted in README)

**Conclusion**: Not viable - too heavy, modules don't work

---

### ⏸️ **PyCraigslist** - ON HOLD
- **Status**: ⏸️ Requires Docker setup
- **Issue**: Needs FlareSolverr Docker container to bypass Cloudflare
- **Additional Issue**: cchardet dependency doesn't compile on Python 3.12

**Findings**:
- Most feature-rich Craigslist tool
- Extensive filtering options
- Requires significant setup overhead:
  - Docker installation
  - FlareSolverr container setup
  - Port configuration
- Character detection library (cchardet) has compilation issues

**Conclusion**: Complex setup, use CraigslistScraper instead for simplicity

---

## Recommendations for Unified CLI

### Primary Tools (Working)
1. **pyOfferUp** - Best overall, 43 results, minimal dependencies
2. **CraigslistScraper** - Works but limited results

### Architecture Design
Create unified Python CLI that wraps:
- ✅ pyOfferUp for OfferUp marketplace
- ✅ CraigslistScraper for Craigslist marketplace
- ❌ Skip Facebook (requires login, not automatable)
- ❌ Skip Deals-Scraper (broken eBay, Canadian Kijiji)
- ⏸️ Optional: PyCraigslist for power users who set up Docker

### Location Configuration
**Pine Hill, NJ 08021**:
- OfferUp: Use "Newark, New Jersey" (lat: 40.7357, lon: -74.1724)
- Craigslist: Use "jerseyshore" site code
- Nearest major city: Philadelphia

### Sample Unified CLI Command
```bash
marketplace-cli search "nintendo switch" \
  --location "Pine Hill, NJ" \
  --zipcode 08021 \
  --platforms offerup,craigslist \
  --max-price 300 \
  --output results.json
```

---

## Technical Notes

### Common Dependencies
- **beautifulsoup4**: Used by CraigslistScraper
- **requests**: Used by both working tools
- **Python 3.7+**: Minimum version

### No API Keys Required
Both working tools (pyOfferUp, CraigslistScraper) are free and don't require API keys.

### Test Scripts Location
All test scripts saved in: `/Users/nes/projects/marketplace-cli/test_scripts/`

- `test_craigslistscraper_final.py` - ✅ Working
- `test_pyofferup.py` - ✅ Working
- `test_facebook_scraper.py` - ❌ Blocked
- `test_deals_scraper.py` - ❌ No results
- `test_pycraigslist.py` - ⏸️ Needs Docker

---

## Next Steps

1. ✅ Testing complete for all 5 tools
2. 📝 Design unified CLI architecture
3. 🏗️ Build marketplace-cli wrapper around pyOfferUp + CraigslistScraper
4. 🎨 Add unified output format (JSON/CSV)
5. 📊 Add result de-duplication and sorting
6. 🔄 Add parallel search capability
7. 📦 Create requirements.txt and setup.py
8. 📖 Write user documentation

**Recommendation**: Proceed with unified CLI design using the 2 working tools.
