# Marketplace CLI Tools Reference

A comprehensive checklist for evaluating and organizing marketplace scraping/query tools for inclusion in the marketplace-cli collection.

## Evaluation Criteria
- [ ] **Functionality**: Does it work reliably?
- [ ] **Code Quality**: Is it well-structured and maintainable?
- [ ] **Documentation**: Is it properly documented?
- [ ] **Dependencies**: Are dependencies reasonable and up-to-date?
- [ ] **Value**: Does it provide unique value to the collection?

---

## Craigslist Tools

### clscrape
- **URL**: https://github.com/jseconners/clscrape
- **Last Updated**: December 2022
- **Stars**: ⭐ 0
- **Description**: Command line Craigslist scraper outputs JSON with structured listing data
- [ ] Review functionality
- [ ] Test reliability
- [ ] Check code quality
- [ ] Verify documentation
- [ ] **Decision**: ⬜ Include / ⬜ Exclude / ⬜ Needs Work

### CraigslistScraper
- **URL**: https://github.com/ryanirl/CraigslistScraper
- **Last Updated**: June 2024
- **Stars**: ⭐ 49
- **Description**: Lightweight Python library (~200 lines) for scraping Craigslist from terminal sessions
- **Python**: 3.7+
- **Dependencies**: requests, beautifulsoup4
- **Features**: Lazy data fetching, both search and individual ad parsing, JSON export with to_dict()
- [ ] Review functionality
- [ ] Test reliability
- [ ] Check code quality
- [ ] Verify documentation
- [ ] **Decision**: ⬜ Include / ⬜ Exclude / ⬜ Needs Work

### SearchExpander
- **URL**: https://github.com/Same-Writer/SearchExpander
- **Last Updated**: July 2021
- **Stars**: ⭐ 1
- **Description**: Scrapes Craigslist across multiple cities with email notifications support
- [ ] Review functionality
- [ ] Test reliability
- [ ] Check code quality
- [ ] Verify documentation
- [ ] **Decision**: ⬜ Include / ⬜ Exclude / ⬜ Needs Work

### PyCraigslist
- **URL**: https://github.com/irahorecka/pycraigslist
- **Last Updated**: October 2025
- **Stars**: ⭐ 52
- **Description**: Python API wrapper for Craigslist with structured queries and filters (price, images, date, etc.)
- **Python**: 3.7+ (supports 3.6-3.9)
- **Dependencies**: httpx, beautifulsoup4, tenacity, cchardet, lxml, fake_headers
- **Installation**: `pip install pycraigslist`
- **Features**:
  - 7 main categories (community, events, forsale, gigs, housing, jobs, resumes, services)
  - Subcategory support (e.g., forsale.cta for cars & trucks)
  - Advanced filters (price range, search distance, zip code, condition, location, etc.)
  - Multi-language support (filters adapt to region language)
  - Detailed search with `.search_detail()` including lat/lon, post body, and metadata
  - Exception handling (ConnectionError, HTTPError, InvalidFilterValue)
- **Warning**: Requires FlareSolverr (Docker proxy) to bypass Cloudflare anti-scraping measures
- [ ] Review functionality
- [ ] Test reliability
- [ ] Check code quality
- [ ] Verify documentation
- [ ] **Decision**: ⬜ Include / ⬜ Exclude / ⬜ Needs Work

---

## OfferUp Tools

### OfferupUnofficalAPI
- **URL**: https://github.com/everettperiman/OfferupUnofficalAPI
- **Last Updated**: February 2021
- **Stars**: ⭐ 2
- **Description**: Unofficial API for OfferUp ecommerce site marketplace operations
- [ ] Review functionality
- [ ] Test reliability
- [ ] Check code quality
- [ ] Verify documentation
- [ ] **Decision**: ⬜ Include / ⬜ Exclude / ⬜ Needs Work

### pyOfferUp
- **URL**: https://github.com/oscar0812/pyOfferUp
- **Last Updated**: June 2023
- **Stars**: ⭐ 18
- **Description**: Python package to scrape OfferUp listings by keyword and location with detailed JSON output
- **Python**: 3.4-3.8
- **Dependencies**: requests (minimal dependencies)
- **Installation**: `pip install pyOfferUp`
- **Features**:
  - Built-in US city/state database with coordinates (all 50 states)
  - Search by city and state: `fetch.get_listings(query, state, city, limit)`
  - Search by latitude/longitude: `fetch.get_listings_by_lat_lon(query, lat, lon, limit)`
  - Returns structured JSON with listingId, price, title, location, image URL, listing URL, flags, etc.
  - Helper functions: `places.available_states()`, `places.available_cities(state)`
- [ ] Review functionality
- [ ] Test reliability
- [ ] Check code quality
- [ ] Verify documentation
- [ ] **Decision**: ⬜ Include / ⬜ Exclude / ⬜ Needs Work

---

## Facebook Marketplace Tools

### facebook-marketplace-scraper
- **URL**: https://github.com/passivebot/facebook-marketplace-scraper
- **Last Updated**: April 2024
- **Stars**: ⭐ 352
- **Description**: Scrapes Facebook Marketplace using Playwright BeautifulSoup and Streamlit
- **Python**: 3.x
- **Dependencies**: playwright, beautifulsoup4, fastapi, streamlit, uvicorn, Pillow, requests
- **Features**:
  - Streamlit GUI for user-friendly interface
  - FastAPI backend for API creation
  - Browser automation with Playwright (bypasses some anti-scraping)
  - Supported cities list built-in
  - User inputs: city, search query, max price
  - Returns: images, prices, locations, item URLs
  - IP information retrieval endpoint
  - JSON data formatting
- **Warning**: Use at own risk - potential Meta/Facebook bans
- [ ] Review functionality
- [ ] Test reliability
- [ ] Check code quality
- [ ] Verify documentation
- [ ] **Decision**: ⬜ Include / ⬜ Exclude / ⬜ Needs Work

---

## Multi-Platform Tools

### Deals-Scraper
- **URL**: https://github.com/JustSxm/Deals-Scraper
- **Last Updated**: April 2024
- **Stars**: ⭐ 95
- **Description**: Scrapes Facebook Marketplace Kijiji eBay Amazon and Lespacs deals
- **Python**: 3.x
- **Dependencies**: Scrapy 2.7.0, requests, lxml, Twisted, beautifulsoup4, ~30 supporting libraries
- **Configuration**: Uses INI config file (config.ini)
- **Features**:
  - Multi-platform scraping (Facebook, Kijiji, eBay, Amazon*, Lespacs*)
  - Price range filters (min/max per scraper)
  - Keyword blacklist/exclusions
  - Strict mode for precise keyword matching
  - Scheduled recurring runs (interval in minutes)
  - Sorting options (best_match, price, distance, creation_time)
  - Facebook: City ID based search, requires browser login
  - Kijiji: City URL + identifier, seller type filter (owner/dealer/all)
  - eBay: Price range filtering
  - Extensible framework for adding custom websites
- **Notes**:
  - Amazon module blocked by anti-scraping (CAPTCHA)
  - Lespacs currently broken (website changes)
  - Canadian-focused (good for Quebec with Lespacs/Kijiji)
- [ ] Review functionality
- [ ] Test reliability
- [ ] Check code quality
- [ ] Verify documentation
- [ ] **Decision**: ⬜ Include / ⬜ Exclude / ⬜ Needs Work

---

## API Services (CLI Compatible)

### ZenRows
- **URL**: https://www.zenrows.com/blog/ebay-web-scraping
- **Last Updated**: N/A (Commercial API Service)
- **Description**: Python terminal based API for eBay scraping with rotation
- [ ] Review functionality
- [ ] Test reliability
- [ ] Check code quality
- [ ] Verify documentation
- [ ] **Decision**: ⬜ Include / ⬜ Exclude / ⬜ Needs Work

### Crawlbase Crawling API
- **URL**: https://crawlbase.com/blog/how-to-scrape-ebay-using-javascript/
- **Last Updated**: N/A (Commercial API Service)
- **Description**: Crawling API with built-in eBay scraper for search results
- [ ] Review functionality
- [ ] Test reliability
- [ ] Check code quality
- [ ] Verify documentation
- [ ] **Decision**: ⬜ Include / ⬜ Exclude / ⬜ Needs Work

### ScraperAPI
- **URL**: https://www.scraperapi.com/web-scraping/ebay/
- **Last Updated**: N/A (Commercial API Service)
- **Description**: Supports Python and JavaScript implementations for eBay marketplace scraping
- [ ] Review functionality
- [ ] Test reliability
- [ ] Check code quality
- [ ] Verify documentation
- [ ] **Decision**: ⬜ Include / ⬜ Exclude / ⬜ Needs Work

### ScrapingAnt
- **URL**: https://scrapingant.com/blog/scrape-ebay-python
- **Last Updated**: N/A (Commercial API Service)
- **Description**: Python API for eBay scraping accessible through terminal
- [ ] Review functionality
- [ ] Test reliability
- [ ] Check code quality
- [ ] Verify documentation
- [ ] **Decision**: ⬜ Include / ⬜ Exclude / ⬜ Needs Work

### Bright Data FB Scraper
- **URL**: https://brightdata.com/products/web-scraper/facebook/marketplace
- **Last Updated**: N/A (Commercial API Service)
- **Description**: Facebook Marketplace scraper API for automated data extraction
- [ ] Review functionality
- [ ] Test reliability
- [ ] Check code quality
- [ ] Verify documentation
- [ ] **Decision**: ⬜ Include / ⬜ Exclude / ⬜ Needs Work

---

## Installation Guides & Documentation

### Apify CLI Documentation
- **URL**: https://docs.apify.com/cli
- **Description**: Official Apify command line interface documentation and installation guide

### Etsy API v3 Docs
- **URL**: https://www.etsy.com/developers/documentation
- **Description**: Official Etsy Open API v3 resources and developer documentation

---

## Notes

### Common Dependencies Across Tools
- **beautifulsoup4**: Used by all 5 downloaded tools (PyCraigslist, CraigslistScraper, facebook-marketplace-scraper, Deals-Scraper, pyOfferUp via requests)
- **requests**: Used by 4/5 tools (CraigslistScraper, facebook-marketplace-scraper, Deals-Scraper, pyOfferUp)
- **lxml**: Used by 3/5 tools (PyCraigslist, Deals-Scraper, facebook-marketplace-scraper via playwright)
- **Python 3.7+**: Minimum version recommended for all tools

### Special Requirements
- **PyCraigslist**: Requires FlareSolverr Docker container to bypass Cloudflare (significant setup overhead)
- **facebook-marketplace-scraper**: Requires Playwright browser installation (`playwright install`)
- **Deals-Scraper**: Heavy dependency stack with Scrapy framework (~30 packages)

### Authentication & Configuration
- **facebook-marketplace-scraper**: Requires Facebook login via browser (ban risk)
- **Deals-Scraper**: Uses config.ini file for all settings
- **No API keys required** for the 5 downloaded open-source tools

### Platform Compatibility
- All tools are Python-based and cross-platform (Windows, macOS, Linux)
- Docker required for PyCraigslist's FlareSolverr proxy
- Node.js NOT required (no package.json needed, Python-only ecosystem)

### Version Compatibility Notes
- **CraigslistScraper v1.1.1+**: Not backwards compatible with v1.0.1
- **pyOfferUp**: Older Python support (3.4-3.8) but may work on newer versions
- **PyCraigslist**: Most actively maintained (Oct 2025 update)
