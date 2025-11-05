// Popup positioning and drag functionality
let resizeTimeout;
let wasDragging = false; // Flag to track if dragging occurred to prevent accidental clicks

// Update popup position on window resize and maintain viewport bounds
async function updatePopupPosition() {
    const popup = document.getElementById('scrapePopup');
    if (!popup) return;

    // Get stored position and screen dimensions
    const storage = await chrome.storage.local.get(['popupPosition', 'screenDimensions']);
    const storedPosition = storage.popupPosition;
    const storedDimensions = storage.screenDimensions;

    // Get current dimensions
    const currentDimensions = {
        width: window.innerWidth,
        height: window.innerHeight
    };

    // Calculate position: Use stored only if dimensions match, else default
    const position = (storedPosition && storedDimensions?.width === currentDimensions.width
        && storedDimensions?.height === currentDimensions.height)
        ? storedPosition
        : { top: '20px', right: '20px', left: 'auto' }; // Default position

    // Apply calculated position
    popup.style.top = position.top;
    if (position.left && position.left !== 'auto') {
        popup.style.left = position.left;
        popup.style.right = 'auto';
    } else {
        popup.style.left = 'auto';
        popup.style.right = position.right || '20px'; // Ensure a right value if left is auto
    }

    // --- Keep popup within bounds after applying position ---
    // Necessary because the calculated position might be off-screen after resize
    const rect = popup.getBoundingClientRect(); // Get dimensions *after* applying style
    let newLeft = rect.left;
    let newTop = rect.top;

    const maxX = window.innerWidth - popup.offsetWidth;
    const maxY = window.innerHeight - popup.offsetHeight;

    // Clamp coordinates to viewport boundaries
    newLeft = Math.min(Math.max(0, newLeft), maxX);
    newTop = Math.min(Math.max(0, newTop), maxY);

    // Apply clamped position only if it changed
    if (popup.style.left !== `${newLeft}px` || popup.style.top !== `${newTop}px`) {
        popup.style.left = `${newLeft}px`;
        popup.style.top = `${newTop}px`;
        popup.style.right = 'auto'; // Explicitly set right to auto when left is set
    }
}

// Debounce resize events to avoid excessive position calculations
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updatePopupPosition, 250);
});

// Unified function to get export stats from background.js
const getExportStatsFromBackground = async () => {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getExportStats' });
        if (response?.status === 'success') {
            return response.stats;
        } else {
            console.error('Failed to get export stats:', response?.error);
            return {
                user: { status: 'free' },
                daily_exports: 0,
                exportable_rows: 0,
                total_rows: 0
            };
        }
    } catch (error) {
        console.error('Error getting export stats:', error);
        return {
            user: { status: 'free' },
            daily_exports: 0,
            exportable_rows: 0,
            total_rows: 0
        };
    }
};

// Update export button texts based on user's plan and available data
const updateButtonTexts = async (scraperId) => {
    const popup = document.getElementById('scrapePopup');
    if (!popup) return;

    const stats = await getExportStatsFromBackground();
    
    const limitText = ` (${stats.total_rows})`;

    const exportFormats = ['HTML', 'CSV', 'JSON', 'RAW JSON', 'XLSX', 'XML', 'TXT'];
    exportFormats.forEach(format => {
        const buttonId = `export${format.replace(' ', '')}Btn`;
        const button = document.getElementById(buttonId);
        if (button) {
            button.textContent = `Export as ${format}${limitText}`;
            
            button.classList.remove('paid');
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.disabled = false;
        }
    });

    // Show/hide free limit text and premium disclaimer
    const freeLimitDiv = document.getElementById('freeLimitDiv');
    if (freeLimitDiv) {
        freeLimitDiv.style.display = 'block';
    }
};

// Update save button text based on current data state
const updateSaveButton = (scraperId) => {
    const currentData = window.scrapedData[scraperId] || [];
    const saveButton = document.getElementById('saveScrapedData');
    if (currentData.length === 0) {
        saveButton.textContent = 'Export Data';
        saveButton.style.border = '2px solid #4A90E2';
    } else {
        saveButton.textContent = 'Add to Export List';
        saveButton.style.border = 'none';
    }
};

// Update popup counts and button states when data changes
const updatePopupCounts = async (scraperId) => {
    const countElement = document.getElementById('recordCount');
    if (!countElement) return;

    const currentData = window.scrapedData[scraperId] || [];
    const storage = await chrome.storage.local.get('extractedData');
    window.extractedData = storage.extractedData || [];

    if(storage.extractedData){
        try {
            storage.extractedData = JSON.parse(storage.extractedData);
        } catch (e) {
            storage.extractedData = [];
        }
    }
    const exportCount = storage.extractedData?.length || 0;

    countElement.innerHTML = `<b>${exportCount}</b> currently in export list<br><b>${currentData.length}</b> new items found`;

    // Update button texts when counts change
    await updateButtonTexts(scraperId);
    updateSaveButton(scraperId);
};

// Main function to create and show the scraping popup
const showScrapingPopup = async (scraperId) => {
    // Remove existing popup to prevent duplicates
    const existingPopup = document.getElementById('scrapePopup');
    if (existingPopup) {
        existingPopup.remove();
    }

    // Create main popup container
    const popup = document.createElement('div');
    popup.id = 'scrapePopup';
    popup.style.cssText = `
        font-family: sans-serif;
        position: fixed;
        /* Default position set here, updatePopupPosition will override */
        top: 20px;
        right: 20px;
        left: auto;
        background: #161C26;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.4);
        z-index: 100000000;
        width: 350px;
        opacity: 0.97;
        user-select: none;
        overflow: hidden;
    `;

    // Add header container with drag handle and control buttons
    const headerContainer = document.createElement('div');
    headerContainer.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    `;

    // Create header with extension name and scraper info
    const header = document.createElement('div');
    header.style.cssText = `
        margin: 0;
        color: #BAC0CE;
        font-weight: bold;
        font-size: 18px;
    `;
    header.innerHTML = `${extensionInfo.name}<br><span style="font-size: 14px; color: #BAC0CE; opacity: 0.8;">${window.scrapers[scraperId].name}</span>`;

    // Create minimize button that doubles as drag handle
    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '−';
    minimizeBtn.style.cssText = `
        background: transparent;
        color: #BAC0CE;
        border: none;
        border-radius: 5px;
        text-align: center;
        cursor: grab; /* Updated cursor for dragging */
        padding: 2px 8px;
        line-height: 1;
        font-size: 14px;
        font-weight: bold;
        position: absolute;
        left: 0px;
        top: 0px;
    `;
    minimizeBtn.classList.add('minimize-btn');
    minimizeBtn.dataset.minimized = 'false';
    
    // Handle minimize functionality while preventing click during drag
    minimizeBtn.addEventListener('click', () => {
        if (wasDragging) { // Prevent click action if dragging just happened
            wasDragging = false; // Reset for next click
            return;
        }

        const isMinimized = minimizeBtn.dataset.minimized === 'true';
        
        // Elements to toggle
        if (isMinimized) {
            // Expand
            minimizeBtn.textContent = '−';
            minimizeBtn.dataset.minimized = 'false';
            
            popup.style.height = 'unset';
        } else {
            // Minimize
            minimizeBtn.textContent = '+';
            minimizeBtn.dataset.minimized = 'true';
            
            popup.style.height = '100px';
        }
    });

    // Create cancel button for clearing export list
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Clear Export List';
    cancelBtn.style.cssText = `
        background: #2F343D;
        color: #BAC0CE;
        border: none;
        border-radius: 5px;
        text-align: center;
        cursor: pointer;
        padding: 4px 8px;
        line-height: 1;
        font-size: 10px;
        font-weight: bold;
        position: absolute;
        right: 0px;
        top: 0px;
    `;
    cancelBtn.classList.add('cancel-btn');
    
    // Handle clear export list with confirmation
    cancelBtn.addEventListener('click', async () => {
        if (cancelBtn.textContent === 'Are you sure?') {
            await chrome.storage.local.remove(['selectedScraper', 'extractedData', 'exportedRawData']);
        } else {
            cancelBtn.textContent = 'Are you sure?';
            setTimeout(() => {
                cancelBtn.textContent = 'Clear Export List';
            }, 3000);
        }
    });

    // Add clear found items button
    const clearFoundBtn = document.createElement('button');
    clearFoundBtn.textContent = 'Clear Found List';
    clearFoundBtn.style.cssText = `
        background: #2F343D;
        color: #BAC0CE;
        border: none;
        border-radius: 5px;
        text-align: center;
        cursor: pointer;
        padding: 4px 8px;
        line-height: 1;
        font-size: 10px;
        font-weight: bold;
        position: absolute;
        bottom: 0;
        right: 0;
        display: none;
    `;
    clearFoundBtn.classList.add('cancel-btn');
    clearFoundBtn.id = "clearFoundData";
    
    // Handle clearing found items with prevention of re-scraping
    clearFoundBtn.addEventListener('click', () => {
        if (clearFoundBtn.textContent === 'Are you sure?') {
            // Get IDs of items to remove
            const idsToRemove = window.scrapedData[scraperId].map(item => item.id);
            
            // Add removed IDs to the deleted list to prevent re-scraping
            deletedIds = [...new Set([...deletedIds, ...idsToRemove])];

            // Clear items from scrapedData
            window.scrapedData[scraperId] = [];
            
            // Remove items from scrapedDataHistory
            window.scrapedDataHistory[scraperId] = window.scrapedDataHistory[scraperId].filter(
                item => !idsToRemove.includes(item.id)
            );

            // Remove items from rawData
            idsToRemove.forEach(id => {
                delete rawData[id];
            });

            updatePopupData();
        } else {
            clearFoundBtn.textContent = 'Are you sure?';
            setTimeout(() => {
                clearFoundBtn.textContent = 'Clear Found List';
            }, 3000);
        }
    });

    // Append header and cancel button to container
    headerContainer.appendChild(header);
    popup.appendChild(minimizeBtn);
    headerContainer.appendChild(cancelBtn);

    // Append clear found button after header container
    headerContainer.insertBefore(clearFoundBtn, headerContainer.nextSibling);

    // Add scrollbar styles for better UI
    const style = document.createElement('style');
    style.textContent = `#scrapePopup ::-webkit-scrollbar { width: 6px; } #scrapePopup ::-webkit-scrollbar-track { background: transparent; } #scrapePopup ::-webkit-scrollbar-thumb { background: #BAC0CE; border-radius: 3px; } #scrapePopup ::-webkit-scrollbar-thumb:hover { background: rgb(231, 231, 231); } #scrapePopup button { transition: background-color 0.2s ease; } #scrapePopup #saveScrapedData:hover, #scrapePopup #clearData:hover, #scrapePopup .cancel-btn:hover, #scrapePopup .minimize-btn:hover, #scrapePopup .delete-btn:hover, #scrapePopup .exportBtn:hover, #scrapePopup #autoScrapeData:hover, #scrapePopup #autoListButton:hover, #scrapePopup #exportBackBtn:hover, #scrapePopup #advancedSettingsButton:hover, #scrapePopup #startAutoButton:hover, #scrapePopup #startAutoButton.active:hover, #scrapePopup #autoListBackButton:hover { background-color: #404651 !important; } #scrapePopup .item-row { transition: background-color 0.2s ease; } #scrapePopup .item-row:hover { background-color: #2F343D; }`;
    document.head.appendChild(style);

    // Create data info container with count display
    const dataInfoDiv = document.createElement('div');
    dataInfoDiv.id = 'dataInfoDiv';
    dataInfoDiv.style.cssText = `position: relative; margin-bottom: 10px;`;
    
    const recordCount = document.createElement('p');
    recordCount.id = 'recordCount';
    recordCount.style.cssText = `margin-bottom: 10px; font-size: 14px; line-height: 1.4; color: #BAC0CE;`;

    // Create scraped items container with scrolling
    const itemsContainer = document.createElement('div');
    itemsContainer.id = 'scrapedItems';
    itemsContainer.style.cssText = `max-height: 200px; overflow-y: auto; margin-bottom: 10px; border: 1px solid #2F343D; border-radius: 5px; background: #161C26;`;

    // Add popup guide text from scraper configuration
    const popupGuide = document.createElement('p');
    popupGuide.style.cssText = `margin: 15px 0; padding: 7px; background-color: #242830; border-radius: 5px; font-size: 12px; color: #BAC0CE; opacity: 0.9; text-align: left;`;
    // Add prefix and get text from scraper config
    const tipText = window.scrapers[scraperId].popupGuide || '';
    popupGuide.innerHTML = tipText ? `${extensionInfo.loginWarning ? `${extensionInfo.loginWarning}<br>` : ''}<b>Tip:</b> ${tipText}` : ''; // Show login warning first, then tip
    // Hide if no text
    if (!tipText) popupGuide.style.display = 'none';

    // Create buttons container with main action buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `display: flex; flex-direction: column; width: 100%; gap: 10px;`;

    // Create upper buttons div
    const upperButtonsDiv = document.createElement('div');
    upperButtonsDiv.style.cssText = `display: flex; gap: 10px;`;

    // Create save button (main action for adding data to export)
    const saveButton = document.createElement('button');
    saveButton.id = 'saveScrapedData';
    saveButton.textContent = 'Add to Export List';
    saveButton.style.cssText = `flex: 1; padding: 8px 16px; background: #2F343D; color: #BAC0CE; border: none; border-radius: 5px; text-align: center; cursor: pointer; font-weight: bold;`;

    // Create auto button for pagination (only show if scraper supports it)
    const autoButton = document.createElement('button');
    autoButton.id = 'autoScrapeData';
    autoButton.textContent = 'Auto';
    autoButton.style.cssText = `padding: 8px 16px; background: #2F343D; color: #BAC0CE; border: none; border-radius: 5px; text-align: center; cursor: pointer; font-weight: bold; min-width: 80px; display: ${window.scrapers[scraperId].autoPagination ? 'block' : 'none'};`;

    // Create lower buttons div
    const lowerButtonsDiv = document.createElement('div');
    lowerButtonsDiv.style.cssText = `width: 100%; display: flex;`;

    // Create auto list button for URL navigation
    const autoListButton = document.createElement('button');
    autoListButton.id = 'autoListButton';
    autoListButton.textContent = 'Automatic URL Navigation';
    autoListButton.style.cssText = `padding: 4px 16px; background: #2F343D; color: #BAC0CE; border: none; border-radius: 5px; text-align: center; cursor: pointer; font-weight: bold; font-size: 14px; height: 28px; flex: 1;`;

    // Add buttons to their respective divs
    upperButtonsDiv.appendChild(saveButton);
    upperButtonsDiv.appendChild(autoButton);
    lowerButtonsDiv.appendChild(autoListButton);

    // Add button divs to container
    buttonsContainer.appendChild(upperButtonsDiv);
    buttonsContainer.appendChild(lowerButtonsDiv);

    // Create export section (initially hidden)
    const exportSection = document.createElement('div');
    exportSection.id = 'exportSection';
    exportSection.style.cssText = `display: none; flex-direction: column; gap: 10px; width: 100%; background-color: #161C26; border-radius: 5px; box-sizing: border-box; z-index: 1; height: 520px;`;

    // Create export header
    const exportHeader = document.createElement('div');
    exportHeader.id = 'exportHeader';
    exportHeader.style.cssText = `width: 100%; display: flex; flex-direction: row; gap: 10px; align-items: center;`;

    const exportText = document.createElement('span');
    exportText.id = 'exportText';
    exportText.textContent = 'Export Data';
    exportText.style.cssText = `font-size: 18px; font-weight: bold; color: #BAC0CE;`;

    const exportLimitInfo = document.createElement('div');
    exportLimitInfo.id = 'exportLimitInfo';
    exportLimitInfo.style.cssText = `font-size: 12px; color: #BAC0CE; text-align: center; display: none;`;

    exportHeader.appendChild(exportText);
    exportHeader.appendChild(exportLimitInfo);

    // Create export body with format buttons
    const exportBody = document.createElement('div');
    exportBody.id = 'exportBody';
    exportBody.style.cssText = `display: flex; flex-direction: column; gap: 15px; flex: 1; border-radius: 5px; padding: 5px; box-sizing: border-box;`;

    // Create export buttons for different formats
    const exportFormats = ['HTML', 'CSV', 'JSON', 'RAW JSON', 'XLSX', 'XML', 'TXT'];
    exportFormats.forEach(format => {
        const exportOption = document.createElement('div');
        exportOption.className = 'exportOption';
        exportOption.style.cssText = `display: flex; flex-direction: row; gap: 10px; position: relative;`;
        const exportBtn = document.createElement('button');
        exportBtn.className = 'exportBtn';
        exportBtn.id = `export${format.replace(' ', '')}Btn`;
        exportBtn.textContent = `Export as ${format}`;
        exportBtn.style.cssText = `flex: 1; height: 35px; background-color: #2F343D; border: none; border-radius: 5px; text-align: center; color: #BAC0CE; font-size: 16px; font-weight: bold; cursor: pointer; transition: background-color 0.2s ease;`;
        exportOption.appendChild(exportBtn);
        exportBody.appendChild(exportOption);
    });

    // --- Start Webhook Toggle Addition ---
    // Create webhook toggle container (initially hidden)
    const webhookToggleContainer = document.createElement('div');
    webhookToggleContainer.id = 'contentWebhookToggleContainer'; // Unique ID for content script
    webhookToggleContainer.style.cssText = `margin-top: 10px; padding-top: 10px; border-top: 1px solid #404651; display: none; /* Hidden by default */`;
    const webhookToggleDiv = document.createElement('div');
    // Use existing classes if defined globally, otherwise apply styles
    webhookToggleDiv.className = 'settingsToggle exportWebhookToggle'; // Reuse popup class if possible
    webhookToggleDiv.style.cssText = `display: flex; align-items: center; justify-content: space-between;`;
    const webhookToggleLabel = document.createElement('label');
    webhookToggleLabel.htmlFor = 'contentExportWebhookToggle'; // Unique ID
    webhookToggleLabel.textContent = 'Use Webhook for Export';
    webhookToggleLabel.style.cssText = `font-size: 14px; color: #BAC0CE; font-weight: bold; cursor: pointer;`;
    const webhookToggle = document.createElement('input');
    webhookToggle.type = 'checkbox';
    webhookToggle.id = 'contentExportWebhookToggle'; // Unique ID
    webhookToggle.className = 'toggleSwitch'; // Add class for potential external styling
    // Apply styles directly matching settings.css
    webhookToggle.style.cssText = ` 
        appearance: none;
        position: relative;
        display: inline-block;
        width: 40px;
        height: 20px;
        cursor: pointer;
        vertical-align: middle;
        background-color: #2F343D;
        border-radius: 10px;
    `; 
    
    // Inject pseudo-element styles matching settings.css
    let toggleStyle = document.getElementById('contentToggleSwitchStyle');
    if (!toggleStyle) {
        toggleStyle = document.createElement('style');
        toggleStyle.id = 'contentToggleSwitchStyle'; // Give it an ID to prevent duplicates
        toggleStyle.textContent = `#contentExportWebhookToggle::before { content: ''; position: absolute; top: 0; left: 0; width: 20px; height: 20px; background-color: #404651; border-radius: 10px; transition: transform 0.2s ease, background-color 0.2s ease; } #contentExportWebhookToggle:checked::before { background-color: #4A90E2; transform: translateX(20px); }`;
        document.head.appendChild(toggleStyle);
    }
    
    // Add event listener to update storage on change
    webhookToggle.addEventListener('change', async () => await chrome.storage.local.set({ webhookEnabled: webhookToggle.checked }));
    // Assemble toggle elements
    webhookToggleDiv.appendChild(webhookToggleLabel);
    webhookToggleDiv.appendChild(webhookToggle);
    webhookToggleContainer.appendChild(webhookToggleDiv);
    exportBody.appendChild(webhookToggleContainer); // Add to export body

    // Show webhook toggle only if webhook URL is configured
    const { webhookUrl, webhookEnabled } = await chrome.storage.local.get(['webhookUrl', 'webhookEnabled']);
    if (webhookToggleContainer && webhookToggle) {
        if (webhookUrl) {
            webhookToggleContainer.style.display = 'block';
            webhookToggle.checked = webhookEnabled || false;
        } else {
            webhookToggleContainer.style.display = 'none';
        }
    }
    // --- End Webhook Toggle Addition ---

    // Create free limit div for free users
    const freeLimitDiv = document.createElement('div');
    freeLimitDiv.id = 'freeLimitDiv';
    freeLimitDiv.style.cssText = `display: block; text-align: center; margin-top: 10px;`;
    const freeLimitText = document.createElement('span');
    freeLimitText.id = 'freeLimitText';
    freeLimitText.textContent = 'All rows will be exported (no limits).';
    freeLimitText.style.cssText = `color: #BAC0CE; font-size: 12px; opacity: 0.8;`;
    freeLimitDiv.appendChild(freeLimitText);

    // Create export footer with back button
    const exportFooter = document.createElement('div');
    exportFooter.id = 'exportFooter';
    exportFooter.style.cssText = `display: flex; flex-direction: column; gap: 10px; width: 100%;`;
    const exportBackBtn = document.createElement('button');
    exportBackBtn.id = 'exportBackBtn';
    exportBackBtn.textContent = 'Back';
    exportBackBtn.style.cssText = `width: 100%; height: 35px; background-color: #2F343D; border: none; border-radius: 5px; text-align: center; color: #BAC0CE; font-size: 14px; font-weight: bold; cursor: pointer; transition: background-color 0.2s ease;`;
    exportFooter.appendChild(exportBackBtn);

    // Assemble export section
    exportSection.appendChild(exportHeader);
    exportSection.appendChild(exportBody);
    exportSection.appendChild(freeLimitDiv);
    exportSection.appendChild(exportFooter);

    // Create Auto List section using the automation manager function
    const autoListSection = createAutoListSection();

    // Create main content container
    const mainContent = document.createElement('div');
    mainContent.id = 'mainContent';
    mainContent.style.cssText = `position: relative; width: 100%; height: 100%;`;

    // Move existing content into mainContent
    mainContent.appendChild(headerContainer);
    mainContent.appendChild(dataInfoDiv);
    mainContent.appendChild(itemsContainer);
    mainContent.appendChild(popupGuide);
    mainContent.appendChild(buttonsContainer);

    // Add mainContent and sections to popup
    popup.appendChild(mainContent);
    popup.appendChild(exportSection);
    popup.appendChild(autoListSection);

    // Auto pagination event handler
    autoButton.addEventListener('click', () => isAutoPaginationRunning ? stopAutoPagination() : startAutoPagination());

    // Check if auto pagination was running before page reload
    chrome.storage.local.get('autoPaginationStatus', (result) => {
        if (result.autoPaginationStatus?.scraperId === scraperId && result.autoPaginationStatus?.running) {
            startAutoPagination();
        }
    });

    // Append elements to dataInfoDiv
    dataInfoDiv.appendChild(recordCount);
    dataInfoDiv.appendChild(clearFoundBtn);

    // Try appending popup until document.body exists
    const appendPopup = () => document.body ? document.body.appendChild(popup) : setTimeout(appendPopup, 100);
    appendPopup();

    // Set correct initial position
    await updatePopupPosition();
    popup.dataset.scraperId = scraperId;
    updatePopupData();

    // Export button handlers - simplified export function with all processing handled in background.js
    const exportData = async (format) => {
        const buttonId = `export${format.toUpperCase().replace(' ','')}Btn`;
        const exportButton = document.getElementById(buttonId);
        const originalContent = exportButton.innerHTML;

        // Get webhook settings to determine UI behavior
        const { webhookEnabled, webhookUrl } = await chrome.storage.local.get(['webhookEnabled', 'webhookUrl']);
        const isWebhookExport = webhookEnabled && webhookUrl && format !== 'rawjson';

        // Show appropriate loading indicator
        if (!isWebhookExport && format !== 'rawjson') {
            exportButton.innerHTML = 'Downloading<span class="loading-dots">...</span>';
            exportButton.style.cssText = `
                flex: 1;
                height: 35px;
                background-color: #2F343D;
                border: none;
                border-radius: 5px;
                text-align: center;
                color: #BAC0CE;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: background-color 0.2s ease;
            `;

            // Add loading dots animation
            let style = document.getElementById('loadingDotsStyle');
            if (!style) {
                style = document.createElement('style');
                style.id = 'loadingDotsStyle';
                style.textContent = `
                    @keyframes loadingDots {
                        0% { content: '.'; }
                        33% { content: '..'; }
                        66% { content: '...'; }
                        100% { content: '.'; }
                    }
                    .loading-dots::after {
                        content: '.';
                        animation: loadingDots 1.5s infinite;
                        display: inline-block;
                        width: 1em;
                        text-align: left;
                    }
                `;
                document.head.appendChild(style);
            }
        } else if (isWebhookExport) {
            exportButton.innerHTML = 'Sending...';
        } else if (format === 'rawjson' && !isWebhookExport) {
            exportButton.innerHTML = 'Downloading<span class="loading-dots">...</span>';
        }

        try {
            // Send export request to background script which handles everything
            const response = await chrome.runtime.sendMessage({
                action: 'initiateExport',
                format: format,
                extensionInfo: extensionInfo,
                scraperId: scraperId
            });

            if (!response) {
                console.error('No response from background script');
                exportButton.innerHTML = originalContent;
                return;
            }

            if (response.status === 'limitReached') {
                // Show limit message in UI
                exportLimitInfo.style.display = 'block';
                exportLimitInfo.textContent = response.message;
                exportButton.innerHTML = originalContent;
                return;
            } else if (response.status === 'error') {
                console.error('Export failed:', response.error);
                exportButton.innerHTML = 'Export Failed';
                await new Promise(resolve => setTimeout(resolve, 2000));
                exportButton.innerHTML = originalContent;
                return;
            } else if (response.status === 'success') {
                
                // Handle webhook success feedback
                if (response.isWebhook) {
                    exportButton.innerHTML = 'Sent!';
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
                
                // Handle fallback feedback
                if (response.isFallback) {
                    exportButton.innerHTML = 'Fallback Complete';
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }

                // Handle post-export popups
                if (response.totalExports === 5) {
                    const { has_seen_review_popup = false } = await chrome.storage.local.get(['has_seen_review_popup']);
                    if (!has_seen_review_popup) {
                        document.getElementById('reviewPopup').style.display = 'flex';
                    }
                }

                // Handle cleanup navigation - close popup if data was cleared
                if (response.shouldNavigateToScrape) {
                    const popup = document.getElementById('scrapePopup');
                    if (popup) popup.remove();
                }
            }

        } catch (error) {
            console.error('Error sending export message to background:', error);
            exportButton.innerHTML = 'Error';
            await new Promise(resolve => setTimeout(resolve, 2000));
        } finally {
            // Always restore button text
            exportButton.innerHTML = originalContent;
        }
    };

    // Set up export button handlers
    const exportButtons = { 'exportCSVBtn': 'csv', 'exportJSONBtn': 'json', 'exportXLSXBtn': 'xlsx', 'exportXMLBtn': 'xml', 'exportTXTBtn': 'txt', 'exportHTMLBtn': 'html', 'exportRAWJSONBtn': 'rawjson' };
    Object.entries(exportButtons).forEach(([buttonId, format]) => {
        const button = document.getElementById(buttonId);
        if (button) button.onclick = () => exportData(format);
    });

    exportBackBtn.addEventListener('click', () => {
        exportSection.style.display = 'none';
        mainContent.style.display = 'block';
    });
    autoListButton.addEventListener('click', () => {
        mainContent.style.display = 'none';
        autoListSection.style.display = 'flex';
        document.getElementById('urlTextareaContainer').style.display = 'block';
    });
    document.getElementById('autoListBackButton').addEventListener('click', () => {
        autoListSection.style.display = 'none';
        mainContent.style.display = 'block';
    });

    saveButton.addEventListener('click', async () => {
        const currentData = window.scrapedData[scraperId] || [];
        if (currentData.length === 0) {
            mainContent.style.display = 'none';
            exportSection.style.display = 'flex';
            try {
                const stats = await getExportStatsFromBackground();
                if (stats.user?.status === 'free') {
                    const remainingExports = 10 - stats.daily_exports;
                    exportLimitInfo.style.display = 'block';
                    exportLimitInfo.textContent = `${remainingExports} free exports left for today`;
                } else {
                    exportLimitInfo.style.display = 'none';
                }
            } catch (error) {
                exportLimitInfo.style.display = 'none';
            }
        } else {
            const storage = await chrome.storage.local.get(['extractedData', 'exportedRawData']);
            if(storage.extractedData) {
                try {
                storage.extractedData = JSON.parse(storage.extractedData)
                } catch(e) {
                    storage.extractedData = [];
                }
            }
            const existingData = storage.extractedData || [];
            const newData = currentData.map(item => ({ ...item, checkedForExport: true }));
            const rawDataToExport = currentData.map(item => rawData[item.id]);
            const updatedData = [...existingData, ...newData.filter(item => !existingData.some(existing => existing.id === item.id))];
            await chrome.storage.local.set({
                extractedData: JSON.stringify(updatedData),
                exportedRawData: JSON.stringify([...(storage.exportedRawData ? JSON.parse(storage.exportedRawData) : []), ...rawDataToExport])
            });
            window.scrapedData[scraperId] = [];
            updatePopupData();
        }
    });

    let isDragging = false, currentX, currentY, initialX, initialY;
    const dragStart = (e) => {
        if (e.target !== minimizeBtn) return;
        isDragging = true;
        minimizeBtn.style.cursor = 'grabbing';
        initialX = e.clientX - popup.offsetLeft;
        initialY = e.clientY - popup.offsetTop;
        wasDragging = false;
    };
    const dragEnd = () => {
        if (isDragging) {
            setTimeout(() => { isDragging = false; }, 100);
            minimizeBtn.style.cursor = 'grab';
        }
    };
    const drag = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        const maxX = window.innerWidth - popup.offsetWidth;
        const maxY = window.innerHeight - popup.offsetHeight;
        currentX = Math.min(Math.max(0, currentX), maxX);
        currentY = Math.min(Math.max(0, currentY), maxY);
        popup.style.left = `${currentX}px`;
        popup.style.top = `${currentY}px`;
        popup.style.right = 'auto';
        wasDragging = true;
        const storePosition = () => {
            chrome.storage.local.set({ popupPosition: { top: popup.style.top, left: popup.style.left, right: 'auto' }, screenDimensions: { width: window.innerWidth, height: window.innerHeight } });
            document.removeEventListener('mouseup', storePosition);
        };
        document.addEventListener('mouseup', storePosition);
    };
    minimizeBtn.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
};

const createScrapedItemRow = (item, scraperId) => {
    const itemRowDiv = document.createElement('div');
    itemRowDiv.classList.add('item-row');
    itemRowDiv.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 5px; border-bottom: 1px solid #2F343D; height: 100%;`;
    const itemRow = document.createElement('div');
    itemRow.style.cssText = `flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #BAC0CE;`;
    const titleSpan = document.createElement('span');
    titleSpan.textContent = item[window.scrapers[scraperId].visibleField] || 'Untitled';
    itemRow.appendChild(titleSpan);
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-btn');
    deleteBtn.textContent = '×';
    deleteBtn.style.cssText = `background: #2F343D; color: #BAC0CE; border: none; border-radius: 5px; padding: 2px 6px; cursor: pointer; margin-left: 5px; font-weight: bold;`;
    deleteBtn.onmousedown = (e) => {
        e.stopPropagation();
        deletedIds.push(item.id);
        deletedIds = [...new Set(deletedIds)];
        window.scrapedData[scraperId] = window.scrapedData[scraperId].filter(dataItem => dataItem.id !== item.id);
        itemRowDiv.remove();
        updatePopupCounts(scraperId);
    };
    if (window.scrapers[scraperId]?.highlighter) {
        itemRowDiv.onmousedown = () => {
            const itemElem = window.scrapers[scraperId].highlighter(rawData[item.id] || item);
            if (itemElem) itemElem.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        };
        itemRowDiv.onmouseenter = () => window.scrapers[scraperId].highlighter(rawData[item.id] || item);
        deleteBtn.onmouseenter = () => window.scrapers[scraperId].dehighlighter(rawData[item.id] || item);
        itemRowDiv.onmouseleave = () => window.scrapers[scraperId].dehighlighter(rawData[item.id] || item);
        itemRowDiv.style.cursor = 'pointer';
    }
    itemRowDiv.appendChild(itemRow);
    itemRowDiv.appendChild(deleteBtn);
    return itemRowDiv;
};

const updatePopupData = async () => {
    const popup = document.getElementById('scrapePopup');
    if (!popup) return;
    const scraperId = popup.dataset.scraperId;
    const currentData = window.scrapedData[scraperId] || [];
    const clearFoundBtn = popup.querySelector('#clearFoundData');
    if (clearFoundBtn) clearFoundBtn.style.display = currentData.length > 0 ? 'block' : 'none';
    await updatePopupCounts(scraperId);
    const itemsContainer = document.getElementById('scrapedItems');
    if (itemsContainer) {
        itemsContainer.innerHTML = '';
        currentData.slice(0, 5000).forEach(item => {
            const itemRow = createScrapedItemRow(item, scraperId);
            itemsContainer.appendChild(itemRow);
        });
    }
};

const exportData = async (format) => {
    const buttonId = `export${format.toUpperCase().replace(' ','')}Btn`;
    const exportButton = document.getElementById(buttonId);
    const originalContent = exportButton.innerHTML;
    const { webhookEnabled, webhookUrl } = await chrome.storage.local.get(['webhookEnabled', 'webhookUrl']);
    const isWebhookExport = webhookEnabled && webhookUrl && format !== 'rawjson';
    if (!isWebhookExport && format !== 'rawjson') {
        exportButton.innerHTML = 'Downloading<span class="loading-dots">...</span>';
        exportButton.style.cssText = `flex: 1; height: 35px; background-color: #2F343D; border: none; border-radius: 5px; text-align: center; color: #BAC0CE; font-size: 16px; font-weight: bold; cursor: pointer; transition: background-color 0.2s ease;`;
        let style = document.getElementById('loadingDotsStyle');
        if (!style) {
            style = document.createElement('style');
            style.id = 'loadingDotsStyle';
            style.textContent = `@keyframes loadingDots { 0% { content: '.'; } 33% { content: '..'; } 66% { content: '...'; } 100% { content: '.'; } } .loading-dots::after { content: '.'; animation: loadingDots 1.5s infinite; display: inline-block; width: 1em; text-align: left; }`;
            document.head.appendChild(style);
        }
    } else if (isWebhookExport) {
        exportButton.innerHTML = 'Sending...';
    } else if (format === 'rawjson' && !isWebhookExport) {
        exportButton.innerHTML = 'Downloading<span class="loading-dots">...</span>';
    }
    try {
        const response = await chrome.runtime.sendMessage({ action: 'initiateExport', format: format, extensionInfo: extensionInfo, scraperId: currentScraperId });
        if (!response) {
            exportButton.innerHTML = originalContent;
            return;
        }
        if (response.status === 'limitReached') {
            exportLimitInfo.style.display = 'block';
            exportLimitInfo.textContent = response.message;
            exportButton.innerHTML = originalContent;
        } else if (response.status === 'error') {
            exportButton.innerHTML = 'Export Failed';
            await new Promise(resolve => setTimeout(resolve, 2000));
            exportButton.innerHTML = originalContent;
        } else if (response.status === 'success') {
            if (response.isWebhook) {
                exportButton.innerHTML = 'Sent!';
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            if (response.isFallback) {
                exportButton.innerHTML = 'Fallback Complete';
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            if (response.totalExports === 5) {
                const { has_seen_review_popup = false } = await chrome.storage.local.get(['has_seen_review_popup']);
                if (!has_seen_review_popup) document.getElementById('reviewPopup').style.display = 'flex';
            }
            if (response.shouldNavigateToScrape) {
                const popup = document.getElementById('scrapePopup');
                if (popup) popup.remove();
            }
        }
    } catch (error) {
        exportButton.innerHTML = 'Error';
        await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
        exportButton.innerHTML = originalContent;
    }
}; 
