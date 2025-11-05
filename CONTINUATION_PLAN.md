# Marketplace CLI - Continuation Plan

**Date**: November 5, 2025
**Location**: Pine Hill, NJ 08021
**Status**: Testing complete, investigating workarounds before building unified CLI

---

## Current Situation

We've tested all 5 marketplace scraping tools. Results:
- ✅ **pyOfferUp**: Working perfectly (43 results)
- ⚠️ **CraigslistScraper**: Working but limited (1 result)
- ❌ **facebook-marketplace-scraper**: Blocked by Facebook
- ❌ **Deals-Scraper**: eBay module broken
- ⏸️ **PyCraigslist**: Requires Docker/FlareSolverr

---

## USER'S PRIMARY OBJECTIVES

### 🎯 Priority 1: Get Facebook Marketplace Working
**User Quote**: *"I need you to create a continuation MD file as my token usage is about to run out... my primary objective moving forward is to figure out what is the least resistant way that we can figure out how to get Facebook marketplace up and running if that requires an API key or me logging in then I'm OK with doing that."*

**User is willing to**:
- Provide API keys
- Login with Facebook credentials
- Use authenticated sessions
- Try alternative approaches

**Action Items**:
1. ✅ Investigate facebook-marketplace-scraper code in detail
2. ✅ Check if it supports manual login/cookies
3. ✅ Research Facebook Marketplace API options
4. ✅ Test headful browser mode (non-headless) with manual login
5. ✅ Explore session/cookie persistence methods
6. ✅ Check for alternative Facebook Marketplace libraries

---

### 🎯 Priority 2: Fix/Improve Craigslist Access
**User Quote**: *"I feel like some of these tools that failed or are only working partially might be able to be fixed or there might be a workaround if we dig a little deeper into the project files."*

**Goals**:
- Investigate why CraigslistScraper only returned 1 result
- Determine if PyCraigslist's Docker requirement is absolute
- Find workarounds or fixes

**Action Items**:
1. ✅ Deep dive into CraigslistScraper code
2. ✅ Test different search terms and categories
3. ✅ Check Craigslist site structure changes
4. ✅ Investigate PyCraigslist Docker requirement
   - Is FlareSolverr 100% necessary?
   - Can we bypass Cloudflare another way?
   - Test PyCraigslist without Docker to confirm it fails
5. ✅ Research alternative Craigslist scraping methods

---

### 🎯 Priority 3: Resolve "Lanes" Before Building CLI
**User Quote**: *"The main goal is to figure out how to smooth out all the lanes in order to build the unit CLI tool and we've already resolved the OfferUp lane. And now we just need to resolve the facebook marketplace and craigslist Lane. As these are the primary sources, I need to pull data from and care about the most."*

**Current Lane Status**:
- ✅ **OfferUp Lane**: RESOLVED (pyOfferUp working perfectly)
- ⚠️ **Craigslist Lane**: PARTIALLY RESOLVED (CraigslistScraper works but limited)
- ❌ **Facebook Lane**: NOT RESOLVED (blocked)

**User Priority Order**:
1. Facebook Marketplace (most important)
2. Craigslist (second most important)
3. OfferUp (already working)

**User Statement**: *"I do not want to create the unified CLI until we can iron out some of these kinks"*

---

## Docker Questions to Answer

**User Quote**: *"Also, please explain to me if there is a way to use Docker along with the other programs that don't need Docker to function. Also, we need to figure out if it is 100% necessary that Docker needs to run in order for PyCraigslist to operate properly."*

### Questions to Investigate:
1. **Can Docker coexist with non-Docker tools?**
   - Yes, but need to understand the architecture
   - Docker would only run for PyCraigslist if needed
   - Other tools (pyOfferUp, CraigslistScraper) run natively

2. **Is Docker 100% necessary for PyCraigslist?**
   - Need to test PyCraigslist without FlareSolverr
   - Check if Cloudflare blocking is consistent
   - Research alternative Cloudflare bypass methods
   - Determine if chardet workaround is sufficient

3. **How would Docker integration work?**
   - Unified CLI could check if Docker is running
   - Fall back to CraigslistScraper if no Docker
   - Use PyCraigslist (with Docker) for advanced features

---

## Technical Investigation Roadmap

### Phase 1: Facebook Marketplace Deep Dive

#### A. Investigate Existing Tool
- [ ] Read full `app.py` and `gui.py` from facebook-marketplace-scraper
- [ ] Check if Streamlit GUI supports manual login
- [ ] Look for cookie/session saving functionality
- [ ] Test headful browser mode (browser visible, not headless)
- [ ] Research Playwright's `context.storage_state()` for saving login

#### B. Research Facebook APIs
- [ ] Check if Facebook Marketplace has official API
- [ ] Research Facebook Graph API for Marketplace access
- [ ] Look for third-party Facebook Marketplace APIs
- [ ] Check if Facebook Business API supports Marketplace

#### C. Alternative Approaches
- [ ] Test with real Facebook login (headful browser)
- [ ] Save cookies after manual login, reuse in headless mode
- [ ] Use browser profiles with saved sessions
- [ ] Research selenium-stealth or undetected-chromedriver alternatives

#### D. GitHub Research
- [ ] Search for other Facebook Marketplace scrapers
- [ ] Check forks of facebook-marketplace-scraper for fixes
- [ ] Look for recent (2024-2025) Marketplace scraping tools

### Phase 2: Craigslist Deep Dive

#### A. CraigslistScraper Investigation
- [ ] Test with different search queries
- [ ] Try different Craigslist categories (sss, cta, apa, etc.)
- [ ] Check if Jersey Shore site has limited listings
- [ ] Test nearby Craigslist sites (philly, newjersey, etc.)
- [ ] Read source code to understand parsing logic
- [ ] Check if HTML selectors are outdated

#### B. PyCraigslist Docker Investigation
- [ ] Test PyCraigslist without FlareSolverr to confirm necessity
- [ ] Research what Cloudflare protection Craigslist uses
- [ ] Check if protection varies by location/site
- [ ] Look for FlareSolverr alternatives (cloudscraper, curl_cffi)
- [ ] Test if issue is just cchardet or actual Cloudflare

#### C. Compare Both Tools
- [ ] Run same search on both CraigslistScraper and PyCraigslist
- [ ] Compare results to actual Craigslist website
- [ ] Determine which tool is more reliable
- [ ] Document pros/cons of each approach

### Phase 3: Docker Architecture Planning

#### A. Docker Setup Investigation
- [ ] Install Docker Desktop on macOS
- [ ] Set up FlareSolverr container
- [ ] Test PyCraigslist with FlareSolverr
- [ ] Document setup process for user

#### B. Hybrid Architecture Design
- [ ] Design unified CLI that supports both Docker and non-Docker modes
- [ ] Implement Docker detection (check if Docker daemon running)
- [ ] Create fallback logic: PyCraigslist → CraigslistScraper
- [ ] Plan configuration for user to enable/disable Docker features

---

## Information Gathered So Far

### Test Results Summary
- **Location**: Pine Hill, NJ 08021
- **Test Query**: "nintendo switch"
- **Max Price**: $300

### Working Tools
1. **pyOfferUp**
   - Results: 43 listings
   - Price range: $30-$100
   - Location: Newark, NJ
   - Dependencies: requests only
   - Status: ✅ Production ready

2. **CraigslistScraper**
   - Results: 1 listing
   - Price: $250
   - Location: Jersey Shore, NJ (Brick, NJ)
   - Dependencies: requests, beautifulsoup4
   - Status: ⚠️ Works but limited results

### Blocked/Broken Tools
1. **facebook-marketplace-scraper**
   - Error: `TargetClosedError: Target page, context or browser has been closed`
   - Issue: Facebook detects and blocks headless browsers
   - Technology: Playwright + BeautifulSoup + FastAPI + Streamlit
   - Status: ❌ Needs login/cookie solution

2. **Deals-Scraper**
   - eBay module: 0 results
   - Facebook module: Same login issue
   - Kijiji module: Canada-only
   - Status: ❌ Not viable (too many broken parts)

3. **PyCraigslist**
   - Issue: Requires FlareSolverr Docker container
   - Additional issue: cchardet doesn't compile on Python 3.12
   - Workaround: chardet can replace cchardet
   - Status: ⏸️ Needs Docker investigation

### Location Configuration for Pine Hill, NJ 08021
- **OfferUp**: Newark, NJ (available cities: Newark, Elizabeth, Jersey City)
- **OfferUp Coordinates**: lat=40.7357, lon=-74.1724
- **Craigslist**: jerseyshore site code
- **Nearest Major City**: Philadelphia
- **Facebook Marketplace**: Would use "philly" city code

---

## Files and Directories

### Test Scripts
Located in: `/Users/nes/projects/marketplace-cli/test_scripts/`
- `test_pyofferup.py` - ✅ Working
- `test_craigslistscraper_final.py` - ✅ Working
- `test_facebook_scraper.py` - ❌ Blocked
- `test_deals_scraper.py` - ❌ No results
- `test_pycraigslist.py` - ⏸️ Needs Docker

### Tool Directories
- `/craigslist-tools/PyCraigslist/` - On hold
- `/craigslist-tools/CraigslistScraper/` - Working
- `/offerup-tools/pyOfferUp/` - Working
- `/facebook-marketplace-tools/facebook-marketplace-scraper/` - Needs fix
- `/multi-platform-tools/Deals-Scraper/` - Abandoned

### Documentation
- `TEST_RESULTS.md` - Comprehensive test results
- `marketplace-cli-tools.md` - Tool evaluation checklist
- `README.md` - Project overview
- `.env.example` - API key templates

---

## Next Session Action Plan

### Immediate Tasks (Priority Order)

1. **Facebook Marketplace Investigation** (HIGHEST PRIORITY)
   - [ ] Read facebook-marketplace-scraper source code thoroughly
   - [ ] Test Streamlit GUI with manual browser login
   - [ ] Research cookie/session persistence with Playwright
   - [ ] Test headful mode: `browser = p.chromium.launch(headless=False)`
   - [ ] Look for Facebook Marketplace API documentation
   - [ ] Search GitHub for alternative Facebook Marketplace tools
   - [ ] Check if facebook-marketplace-scraper has open issues/PRs with fixes

2. **Craigslist Investigation** (HIGH PRIORITY)
   - [ ] Test CraigslistScraper with more search terms
   - [ ] Try different categories and locations
   - [ ] Manually visit Craigslist to compare results
   - [ ] Test PyCraigslist WITHOUT Docker to confirm it fails
   - [ ] Research Cloudflare bypass alternatives

3. **Docker Research** (MEDIUM PRIORITY)
   - [ ] Install Docker Desktop on macOS
   - [ ] Set up FlareSolverr container following documentation
   - [ ] Test PyCraigslist with FlareSolverr working
   - [ ] Document if performance/results are significantly better

### Questions to Answer

#### Facebook Marketplace
1. Does facebook-marketplace-scraper support saving/loading browser sessions?
2. Can we use Playwright's storage_state() to persist login?
3. Is there a Facebook Marketplace API (official or unofficial)?
4. Are there better/newer Facebook Marketplace scraping tools?

#### Craigslist
1. Why did CraigslistScraper only return 1 result? (Low inventory or parsing issue?)
2. Does PyCraigslist work at all without FlareSolverr?
3. What specific Cloudflare protection does Craigslist use?
4. Are there Cloudflare bypass libraries that work without Docker?

#### Architecture
1. Can unified CLI gracefully handle Docker dependencies?
2. Should we have "basic mode" (no Docker) vs "advanced mode" (Docker)?
3. How do we detect if Docker is installed and running?

---

## User Preferences & Constraints

### What User Wants
✅ Facebook Marketplace working (top priority)
✅ Craigslist working reliably
✅ OfferUp working (already done)
✅ Willing to provide credentials/API keys
✅ Willing to use Docker if necessary
✅ Wants to iron out kinks before building unified CLI

### What User Doesn't Want
❌ To build unified CLI with broken components
❌ To use tools that don't work for Pine Hill, NJ area
❌ To skip investigation of potential fixes

---

## Success Criteria

Before proceeding to unified CLI design:

### Facebook Marketplace
- [ ] Can successfully scrape Facebook Marketplace for Pine Hill, NJ area
- [ ] Method is reliable and repeatable
- [ ] Solution is documented (login process, cookie management, etc.)

### Craigslist
- [ ] CraigslistScraper returns reasonable number of results (more than 1)
  OR
- [ ] PyCraigslist works with Docker and returns better results
- [ ] Docker setup is documented if required
- [ ] Fallback strategy is clear (PyCraigslist → CraigslistScraper)

### OfferUp
- [x] Already working (43 results) ✅

Once all three "lanes" are resolved, proceed to unified CLI design.

---

## Resources & Links

### Installed Tools
- pyOfferUp 0.3 (PyPI)
- craigslistscraper 1.1.2 (PyPI)
- playwright 1.40.0 (with chromium browser installed)
- streamlit 1.30.0
- fastapi 0.108.0

### Documentation
- Playwright: https://playwright.dev/python/docs/intro
- FlareSolverr: https://github.com/FlareSolverr/FlareSolverr
- Facebook Marketplace (unofficial): https://m.facebook.com/marketplace/directory/US/

### Potential Alternatives to Research
- `facebook-sdk` - Official Facebook SDK
- `selenium-stealth` - Bypass bot detection
- `undetected-chromedriver` - Selenium alternative
- `cloudscraper` - Cloudflare bypass without Docker
- `curl_cffi` - CURL with fingerprinting

---

## Notes for Future Self

### Context
User has limited tokens and may disconnect. This document contains everything needed to continue the investigation.

### User's Communication Style
- Direct and practical
- Willing to invest time in setup if it works
- Wants thorough investigation before moving forward
- Values working solutions over quick hacks

### Key Insight
User emphasized: *"I do not want to create the unified CLI until we can iron out some of these kinks"* - This means:
1. Don't rush to architecture design
2. Focus on making each tool work properly first
3. Investigate fixes and workarounds thoroughly
4. Document everything for reproducibility

### Remember
- Location: Pine Hill, NJ 08021
- Primary platforms: Facebook Marketplace, Craigslist, OfferUp
- User is OK with manual setup (Docker, login, API keys)
- Goal: Build reliable unified CLI once all components work

---

## Quick Start for Next Session

1. Read this entire document
2. Start with Facebook Marketplace investigation (highest priority)
3. Review facebook-marketplace-scraper code in detail
4. Test headful browser mode with manual login
5. Research session/cookie persistence
6. Document findings and report back to user

**End of Continuation Plan**
