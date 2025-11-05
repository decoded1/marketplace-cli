# Facebook Marketplace - Investigation & Solution

**Date**: November 5, 2025
**Location**: Pine Hill, NJ 08021
**Status**: ✅ SOLUTION FOUND

---

## Key Finding: The Tool Already Supports Login!

After reviewing the `app.py` source code, I discovered that **facebook-marketplace-scraper already has login functionality built-in**. It was just using placeholder credentials.

### Evidence from Source Code

**File**: `/facebook-marketplace-tools/facebook-marketplace-scraper/app.py`

**Lines 129-143**:
```python
browser = p.chromium.launch(headless=False)  # ← Visible browser!
page = browser.new_page()
page.goto(initial_url)
time.sleep(2)
try:
    email_input = page.wait_for_selector('input[name="email"]').fill('YOUR_EMAIL_HERE')  # ← Needs real email
    password_input = page.wait_for_selector('input[name="pass"]').fill('YOUR_PASSWORD_HERE')  # ← Needs real password
    time.sleep(2)
    login_button = page.wait_for_selector('button[name="login"]').click()
    time.sleep(2)
    page.goto(marketplace_url)
except:
    page.goto(marketplace_url)  # ← Falls back to unauthenticated
```

**Key Points**:
1. Browser launches in **headful mode** (`headless=False`) - perfect for login
2. Tool attempts login with `YOUR_EMAIL_HERE` / `YOUR_PASSWORD_HERE` placeholders
3. If login fails, it tries to scrape without authentication (which Facebook blocks)

---

## Solution Options

### Option 1: Manual Login (Recommended for Testing)
**Best for**: Initial testing, avoiding Facebook bot detection

**How it works**:
1. Launch browser in visible mode
2. Pause script and let you login manually
3. Save session/cookies after successful login
4. Reuse saved session for future scrapes (no re-login needed)

**Advantages**:
- ✅ No credentials in code
- ✅ Handles 2FA automatically
- ✅ Session can be reused
- ✅ Lower ban risk (looks like human)

**Implementation**: See `test_facebook_with_login.py`

---

### Option 2: Automated Login with Credentials
**Best for**: Scheduled/automated scraping

**How it works**:
1. Store credentials in environment variables
2. Script automatically fills login form
3. Save session after successful login
4. Handle 2FA if required

**Advantages**:
- ✅ Fully automated
- ✅ Can run headless after first login
- ✅ Good for scheduled scraping

**Disadvantages**:
- ⚠️ Requires storing credentials
- ⚠️ May trigger 2FA
- ⚠️ Higher ban risk if used excessively

**Implementation**: See `test_facebook_with_login.py` (supports both)

---

### Option 3: Session Persistence (Best Long-term)
**Best for**: Production use

**How it works**:
1. Login once manually or automatically
2. Save browser state using Playwright's `storage_state()`
3. Load saved state for all future scrapes
4. No re-login needed until session expires

**Advantages**:
- ✅ Login only once
- ✅ Fast subsequent scrapes
- ✅ Can run headless after first login
- ✅ No credentials needed after first login

**Implementation**:
```python
# Save session after login
context.storage_state(path='facebook_session.json')

# Load session for future use
context = browser.new_context(storage_state='facebook_session.json')
```

This is **already implemented** in `test_facebook_with_login.py`!

---

## Testing Plan

### Step 1: Manual Login Test
```bash
cd /Users/nes/projects/marketplace-cli
python test_scripts/test_facebook_with_login.py
```

**What happens**:
1. Browser opens (visible)
2. Script asks you to login manually
3. After login, script continues scraping
4. Session saved to `facebook_session.json`

**Expected result**: ✅ Should find Nintendo Switch listings in Philadelphia

---

### Step 2: Session Reuse Test
```bash
# Run again - should NOT ask for login
python test_scripts/test_facebook_with_login.py
```

**What happens**:
1. Script loads saved session
2. No login needed
3. Scrapes immediately

**Expected result**: ✅ Faster scraping, no login prompt

---

### Step 3: Automated Login Test (Optional)
```bash
# Set credentials
export FACEBOOK_EMAIL='your_email@example.com'
export FACEBOOK_PASSWORD='your_password'

# Run script
python test_scripts/test_facebook_with_login.py
```

**What happens**:
1. Script automatically fills login form
2. May prompt for 2FA
3. Saves session for future use

---

## Security Considerations

### Storing Credentials Safely

**Option A: Environment Variables** (Recommended)
```bash
# Add to ~/.zshrc or ~/.bashrc
export FACEBOOK_EMAIL='your_email@example.com'
export FACEBOOK_PASSWORD='your_password'
```

**Option B: .env File** (Good for development)
```bash
# Create .env file (already in .gitignore)
echo "FACEBOOK_EMAIL=your_email@example.com" >> .env
echo "FACEBOOK_PASSWORD=your_password" >> .env

# Load in Python
from dotenv import load_dotenv
load_dotenv()
```

**Option C: macOS Keychain** (Most secure)
```bash
# Store in keychain
security add-generic-password -a "marketplace-cli" -s "facebook" -w "your_password"

# Retrieve in Python
import subprocess
password = subprocess.check_output([
    'security', 'find-generic-password',
    '-a', 'marketplace-cli', '-s', 'facebook', '-w'
]).decode('utf-8').strip()
```

---

## Facebook Anti-Bot Measures

### What Facebook Detects
1. **Headless browsers** (navigator.webdriver = true)
2. **Automation patterns** (too fast, repetitive)
3. **Missing browser fingerprint**
4. **No cookies/session**
5. **Unusual traffic patterns**

### How We Bypass
1. ✅ **Headful browser** for login (looks human)
2. ✅ **Session persistence** (cookies saved)
3. ✅ **Time delays** (human-like behavior)
4. ✅ **Real user agent** (not headless)
5. ✅ **Manual login option** (hardest to detect)

### Additional Stealth (If Needed)
```python
browser = p.chromium.launch(
    headless=False,
    args=[
        '--disable-blink-features=AutomationControlled',  # Hide automation
        '--disable-dev-shm-usage',
        '--no-sandbox',
    ]
)

# Add real user agent
context = browser.new_context(
    user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
)
```

---

## Integration with Unified CLI

### Architecture

```python
class FacebookMarketplaceScraper:
    def __init__(self, session_file='facebook_session.json'):
        self.session_file = session_file
        self.logged_in = os.path.exists(session_file)

    def search(self, query, location, max_price):
        if not self.logged_in:
            self.login()  # Prompt user to login

        # Use saved session to scrape
        results = self.scrape_with_session(query, location, max_price)
        return results

    def login(self):
        # Launch browser, let user login, save session
        pass
```

### CLI Usage
```bash
# First time - prompts for login
marketplace-cli search "nintendo switch" --platforms facebook --location "Pine Hill, NJ"

# Subsequent uses - no login needed
marketplace-cli search "macbook" --platforms facebook,offerup,craigslist
```

---

## Advantages of This Solution

1. ✅ **Works with existing tool** - No new dependencies
2. ✅ **User controls login** - Manual or automated
3. ✅ **Session persistence** - Login once, use forever
4. ✅ **Low ban risk** - Looks like human browsing
5. ✅ **Handles 2FA** - Can do manually
6. ✅ **Flexible** - Headful or headless mode

---

## Potential Issues & Solutions

### Issue 1: Facebook detects automation
**Solution**: Use manual login + session persistence

### Issue 2: Session expires
**Solution**: Prompt user to login again, save new session

### Issue 3: 2FA required
**Solution**: Manual login handles this automatically

### Issue 4: Account ban
**Solution**:
- Don't scrape too frequently
- Respect rate limits
- Use realistic time delays
- Consider rotating accounts (advanced)

---

## Next Steps

### Immediate (Now)
1. [ ] Test manual login with your Facebook account
2. [ ] Verify scraping works for Pine Hill, NJ area
3. [ ] Confirm session persistence works
4. [ ] Document results

### Short-term (This Session)
1. [ ] Improve HTML parsing (Facebook changes classes frequently)
2. [ ] Add error handling for expired sessions
3. [ ] Test with different queries and locations
4. [ ] Compare results to actual Facebook Marketplace website

### Long-term (Unified CLI)
1. [ ] Integrate into unified CLI with session management
2. [ ] Add automatic session refresh
3. [ ] Implement rate limiting
4. [ ] Add logging and monitoring

---

## Comparison: Original vs. Enhanced

### Original Test (test_facebook_scraper.py)
- ❌ Headless mode (blocked by Facebook)
- ❌ No login support
- ❌ No session persistence
- ❌ Result: 0 listings

### Enhanced Test (test_facebook_with_login.py)
- ✅ Headful mode for login
- ✅ Manual or automated login
- ✅ Session persistence
- ✅ Expected: Working scraper

---

## Files Created

1. **test_facebook_with_login.py** - Enhanced scraper with login support
2. **facebook_session.json** - Will be created after first successful login (in .gitignore)
3. **facebook_results_with_login.json** - Results from authenticated scraping

---

## Testing Checklist

- [ ] Run test_facebook_with_login.py
- [ ] Login manually when prompted
- [ ] Verify scraping finds results
- [ ] Check facebook_session.json was created
- [ ] Run again to test session reuse
- [ ] Verify no login prompt second time
- [ ] Compare results to actual Facebook Marketplace
- [ ] Test with different search terms
- [ ] Document findings

---

## Expected Outcome

✅ **Facebook Marketplace scraping should now work** for Pine Hill, NJ (Philadelphia area) with:
- Real data from Facebook Marketplace
- Reliable session-based authentication
- Low risk of detection/ban
- Easy integration into unified CLI

**Status**: Ready for testing - user action required (login with Facebook account)
