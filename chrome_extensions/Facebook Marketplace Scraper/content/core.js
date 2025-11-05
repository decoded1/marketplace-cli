// Script injection for fetch override
const injectScript = (file) => {
    const script = document.createElement('script');
    script.setAttribute('src', chrome.runtime.getURL(file));
    script.async = false;
    (document.head || document.documentElement).appendChild(script);
};

// Global data structures for scraped content
window.scrapedData = {}; // Current scraped data by scraper ID
window.scrapedDataHistory = {}; // Persistent history of scraped data
window.exportedRawData = {}; // Raw data before formatting
window.extractedData = []; // Data ready for export
let rawData = {}; // Raw scraped data mapped by item ID
let deletedIds = []; // Track manually deleted items to prevent re-scraping
// Track scraping page success/failure stats for auto navigation
let successPages = 0;
let failedPages = 0;
let failedUrls = []; // Track failed URLs for potential retry
let totalExportCount = 0; // Track total export count

let monitoringInterval = null;
let currentScraperId = null;

// Debug logging functionality
const logDebugData = async (type, data) => {
    try {
        const timestamp = new Date().toISOString();
        let logEntry = `\n[${timestamp}] ${type}:\n`;
        
        switch (type) {
            case 'INTERCEPTED':
                const { url, method, data: interceptData, contentType } = data;
                logEntry += `URL: ${url}\n`;
                logEntry += `Method: ${method}\n`;
                logEntry += `Content-Type: ${contentType}\n`;
                logEntry += `Data: ${JSON.stringify(interceptData).substring(0, 10000)}\n`;
                break;
                
            case 'WINDOW_KEY_FOUND':
                const { key, value } = data;
                logEntry += `Key: ${key}\n`;
                logEntry += `Value: ${JSON.stringify(value).substring(0, 10000)}\n`;
                break;
                
            case 'OBJECT_ASSEMBLED':
                const { key: objectKey, results } = data;
                logEntry += `Key: ${objectKey}\n`;
                logEntry += `Results Keys: ${Object.keys(results || {}).join(', ')}\n`;
                logEntry += `Results Type: ${typeof results}\n`;
                logEntry += `Results Length: ${Array.isArray(results) ? results.length : 'N/A'}\n`;
                break;
        }
        
        logEntry += `${'='.repeat(50)}\n`;
        
        // Get existing debug log from storage
        const storage = await chrome.storage.local.get('debugLog');
        let debugLog = storage.debugLog || '';
        
        // Add new entry
        debugLog += logEntry;
        
        // Limit log size to prevent storage issues (keep last 1MB)
        const maxLogSize = 1 * 1024 * 1024; // 1MB
        if (debugLog.length > maxLogSize) {
            // Delete oldest entries by finding complete log entries
            const entries = debugLog.split('\n[').filter(entry => entry.trim() !== '');
            
            // Keep removing oldest entries until we're under the limit
            while (entries.length > 0 && entries.join('\n[').length > maxLogSize) {
                entries.shift(); // Remove oldest entry
            }
            
            // Reconstruct the log, ensuring proper formatting
            if (entries.length > 0) {
                debugLog = '\n[' + entries.join('\n[');
            } else {
                debugLog = logEntry; // If all entries were removed, keep just the new one
            }
        }
        
        // Save back to storage
        await chrome.storage.local.set({ debugLog });
    } catch (error) {
        console.error('Error logging debug data:', error);
    }
};

// Check if user navigated to a new page and reset scraper data if needed
const checkNewPage = () => {
    // Iterate through all scraper keys
    [...new Set([...Object.keys(window.scrapedDataHistory), ...Object.keys(window.scrapedData)])].forEach(scraperId => {
        const scraper = window.scrapers[scraperId];
        if (scraper.newPage) {
            if (scraper.newPage.getIdentifier()) {
                if (scraper.newPage.check()) {
                    // Clear data for new page
                    window.scrapedData[scraperId] = [];
                    window.scrapedDataHistory[scraperId] = [];
                    scraper.newPage.setIdentifier();
                }
            } else {
                scraper.newPage.setIdentifier();
            }
        }
    });
}

// Set up monitoring interval to update popup when data changes
const setMonitoringInterval = () => {
    let previousDataCount = 0;
    monitoringInterval = setInterval(async () => {
        const storage = await chrome.storage.local.get('selectedScraper');
        if (!storage.selectedScraper) {
            // Clean up popup if no scraper selected
            const existingPopup = document.getElementById('scrapePopup');
            if (existingPopup) {
                existingPopup.remove();
            }
            clearInterval(monitoringInterval);
            monitoringInterval = null;
            return;
        }

        // Only update if data count has changed to avoid unnecessary UI updates
        const currentDataCount = window.scrapedData[storage.selectedScraper]?.length || 0;
        if (currentDataCount !== previousDataCount) {
            previousDataCount = currentDataCount;
            updatePopupData();
        }
    }, 500);
};

// Unified handler for different data sources (fetch, window, object, page, multi)
const handleDataSource = async (scraperId, sourceType, data) => {
    try {
        const scraper = window.scrapers[scraperId];
        // Add delay before scraping to prevent overwhelming the page
        await new Promise(resolve => setTimeout(resolve, scraper[`${sourceType}Delay`] || 0));

        const results = scraper.scrape[sourceType](data);
        if (!results) return;

        const formattedResults = results.map(item => {
            const formatted = scraper.format[sourceType](item);
            // Store raw data for potential export later
            rawData[formatted.id] = item;
            return formatted;
        });

        handleNewResults(scraperId, formattedResults);
    } catch (error) {
        console.error(`Error processing ${sourceType} for ${scraperId}:`, error);
    }
};

// Handle new scraped results with deduplication and storage
const handleNewResults = async (scraperId, formattedResults) => {
    // Filter duplicates from formatted results using id
    const uniqueResults = formattedResults.filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id)
    );

    // Initialize histories if not exists
    if (!window.scrapedData[scraperId]) window.scrapedData[scraperId] = [];
    if (!window.scrapedDataHistory[scraperId]) window.scrapedDataHistory[scraperId] = [];

    // Get all existing data from storage and memory
    const storage = await chrome.storage.local.get('extractedData');
    if (storage.extractedData) {
        try {
            storage.extractedData = JSON.parse(storage.extractedData);
        } catch (e) {
            storage.extractedData = [];
        }
    }
    const existingData = [
        ...(storage.extractedData || []),
        ...window.scrapedDataHistory[scraperId]
    ];

    // Filter out duplicates against existing data and check deletedIds to prevent re-adding manually deleted items
    const newResults = uniqueResults.filter(item =>
        !existingData.some(existing => existing.id === item.id) &&
        !window.scrapedData[scraperId].some(existing => existing.id === item.id) &&
        !deletedIds.includes(item.id) // Prevent re-scraping deleted items
    );

    // Only update if there's new data to avoid unnecessary UI updates
    if (newResults.length > 0) {
        // Add to both current and history for persistence
        window.scrapedData[scraperId].push(...newResults);
        window.scrapedDataHistory[scraperId].push(...newResults);
        updatePopupData();
    }
}; 

// Listen for intercepted network requests and window data from fetchOverride.js
window.addEventListener('message', (event) => {
    if (event.data.type === 'INTERCEPTED') {
        // Log debug data
        logDebugData('INTERCEPTED', event.data);
        
        // Handle intercepted fetch requests
        const { url, method, data, contentType } = event.data;
        Object.keys(window.scrapers).forEach(async key => {
            const scraper = window.scrapers[key];
            if (scraper.check.fetch?.(url, method, contentType, data)) {
                await handleDataSource(key, 'fetch', data);
            }
        });
    } else if (event.data.type === 'WINDOW_KEY_FOUND') {
        // Log debug data
        logDebugData('WINDOW_KEY_FOUND', event.data);
        
        // Handle window object data extraction
        const { key, value } = event.data;
        Object.keys(window.scrapers).forEach(async scraperId => {
            const scraper = window.scrapers[scraperId];
            if (scraper.check?.window?.(key, value)) {
                await handleDataSource(scraperId, 'window', value);
            }
        });
    } else if (event.data.type === 'OBJECT_ASSEMBLED') {
        // Log debug data
        logDebugData('OBJECT_ASSEMBLED', event.data);
        
        // Handle assembled object data from window monitoring
        const { key, results } = event.data;
        Object.keys(window.scrapers).forEach(async scraperId => {
            const scraper = window.scrapers[scraperId];
            if (scraper.check?.object?.(key, results)) {
                await handleDataSource(scraperId, 'object', results);
            }
        });
    }
});

// Handle messages from popup and background scripts
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "ping") {
        sendResponse(true);
    } else if (request.action === "checkScrapers") {
        // Check which scrapers are available on current page
        const results = {};
        Object.keys(window.scrapers).forEach(key => {
            const scraper = window.scrapers[key];
            results[key] =
                (scraper.check.page?.() !== false && scraper.check.page?.() != null) ||
                (scraper.check.multi?.() !== false && scraper.check.multi?.() != null) ||
                (window.scrapedDataHistory[key]?.length > 0) ||
                false;
        });
        sendResponse(results);
    } else if (request.action === "startMonitoring") {
        // Start monitoring for a specific scraper
        const scraper = window.scrapers[request.scraperId];
        currentScraperId = request.scraperId;
        try {
            // Initialize if not exists
            if (!window.scrapedData[currentScraperId]) window.scrapedData[currentScraperId] = [];
            if (!window.scrapedDataHistory[currentScraperId]) window.scrapedDataHistory[currentScraperId] = [];

            // Restore any historical data that wasn't just scraped
            if (window.scrapedDataHistory[currentScraperId].length > 0) {
                window.scrapedData[currentScraperId] = [...window.scrapedDataHistory[currentScraperId]];
            }

            // Handle page scraping if available and check passes
            if (scraper.check.page && scraper.check.page()) {
                await handleDataSource(currentScraperId, 'page', null);
            }

            showScrapingPopup(request.scraperId);

            if (monitoringInterval) {
                clearInterval(monitoringInterval);
            }
            await chrome.storage.local.set({ selectedScraper: request.scraperId });

            // Modified interval to check selectedScraper and update popup
            setMonitoringInterval();
            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
    return true;
});

// Initialize the content script
const initialize = () => {
    // Inject fetch override script to intercept network requests
    injectScript('fetchOverride.js');
    
    // Start checking for new pages
    checkNewPage();
    setInterval(checkNewPage, 50);

    // Auto-restore scraping state after page load
    setTimeout(async () => {
        // Check if Auto List was running before page reload
        const autoListStatus = await chrome.storage.local.get('autoListStatus');
        if (autoListStatus.autoListStatus?.running) {
            const scraper = window.scrapers[autoListStatus.autoListStatus.scraperId];
            if (scraper && scraper.autoPage) {
                // Set as the selected scraper for auto list functionality
                await chrome.storage.local.set({ selectedScraper: autoListStatus.autoListStatus.scraperId });
            }
        }

        const storage = await chrome.storage.local.get('selectedScraper');
        if (!storage.selectedScraper) {
            // Clear any existing popup if scraper was deselected
            const existingPopup = document.getElementById('scrapePopup');
            if (existingPopup) existingPopup.remove();
            if (monitoringInterval) {
                clearInterval(monitoringInterval);
                monitoringInterval = null;
            }
            return;
        }

        const scraper = window.scrapers[storage.selectedScraper];
        if (scraper) {
            showScrapingPopup(storage.selectedScraper);
            currentScraperId = storage.selectedScraper;

            if (monitoringInterval) clearInterval(monitoringInterval);
            setMonitoringInterval();
        }
    }, 1000);

    // Continuous monitoring for page and multi-type scrapers
    setInterval(async () => {
        Object.keys(window.scrapers).forEach(async scraperId => {
            const scraper = window.scrapers[scraperId];
            if (scraper.check?.page?.()) {
                await handleDataSource(scraperId, 'page', null);
            }
            if(scraper.check.multi?.() ){
                await handleDataSource(scraperId, 'multi', null);
            }
        });
    }, 1000);
};

// Start everything
initialize(); 