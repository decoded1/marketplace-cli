// Auto pagination and auto list management state
let isAutoPaginationRunning = false;
let isAutoListRunning = false;

// Auto pagination: automatically load more content on current page
const startAutoPagination = async () => {
    const scraperId = currentScraperId;
    if (!window.scrapers[scraperId].autoPagination) return;
    
    isAutoPaginationRunning = true;
    await chrome.storage.local.set({ autoPaginationStatus: { scraperId, running: true } });
    document.getElementById('autoScrapeData').textContent = 'Stop';

    const delay = window.scrapers[scraperId].paginationDelay || 0;
    const paginationType = window.scrapers[scraperId].paginationType || "loaded";
    const waitForTimeout = window.scrapers[scraperId].paginationWaitForTimeout || 10000;

    // Wait for custom condition before proceeding (e.g., loading indicator disappears)
    const waitForCondition = async () => {
        if (!window.scrapers[scraperId].paginationWaitFor) return true;
        const startTime = Date.now();
        while (Date.now() - startTime < waitForTimeout) {
            if (!isAutoPaginationRunning) return false;
            if (await window.scrapers[scraperId].paginationWaitFor()) return true;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return false;
    };

    const runPagination = async () => {
        // Click save button first to preserve current data
        if (window.scrapedData[scraperId]?.length > 0) document.getElementById('saveScrapedData').click();
        // Wait for any animations/transitions
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get current data count if pagination type is "loaded"
        const currentCount = window.scrapedData[scraperId]?.length || 0;
        
        // For preloaded content, wait and check conditions before pagination
        if (paginationType === "preloaded") {
            if (!(await waitForCondition())) return stopAutoPagination();
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Run the pagination function from scraper config
        const paginationResult = await window.scrapers[scraperId].autoPagination();
        if (!paginationResult) return stopAutoPagination();

        // For loaded content, wait and check conditions after pagination
        if (paginationType === "loaded") {
            if (!(await waitForCondition())) return stopAutoPagination();
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Check if new data was found (only for loaded pagination type)
        const newCount = window.scrapedData[scraperId]?.length || 0;
        
        // If pagination was stopped or (for loaded type) no new data was found, stop auto pagination
        if (!isAutoPaginationRunning) return stopAutoPagination();
        
        if (paginationType === "loaded" && newCount === currentCount) {
            // Recheck 3 times with delay to ensure no new data is loading
            for (let i = 0; i < 3; i++) {
                await new Promise(resolve => setTimeout(resolve, delay));
                const recheckCount = window.scrapedData[scraperId]?.length || 0;
                if (recheckCount > currentCount) break; // New data found, continue pagination
                // If we've checked 3 times and found no new data, stop pagination
                if (i === 2) return stopAutoPagination();
            }
        }
        // Continue pagination recursively
        runPagination();
    };
    runPagination();
};

const stopAutoPagination = async () => {
    isAutoPaginationRunning = false;
    await chrome.storage.local.set({ autoPaginationStatus: { scraperId: currentScraperId, running: false } });
    document.getElementById('autoScrapeData').textContent = 'Auto';
};

// Create the Auto List section UI for URL navigation
const createAutoListSection = () => {
    const autoListSection = document.createElement('div');
    autoListSection.id = 'autoListSection';
    autoListSection.style.cssText = `display: none; flex-direction: column; gap: 8px; width: 100%; background-color: #161C26; border-radius: 8px; box-sizing: border-box; z-index: 1; overflow: hidden;`;
    
    // Auto List header
    const autoListHeader = document.createElement('div');
    autoListHeader.id = 'autoListHeader';
    autoListHeader.style.cssText = `width: 100%; display: flex; flex-direction: row; gap: 10px; align-items: center; margin-bottom: 5px;`;
    const autoListHeaderText = document.createElement('span');
    autoListHeaderText.id = 'autoListHeaderText';
    autoListHeaderText.textContent = 'Automatic URL Navigation';
    autoListHeaderText.style.cssText = `font-size: 18px; font-weight: bold; color: #BAC0CE;`;
    autoListHeader.appendChild(autoListHeaderText);
    
    const autoListBody = document.createElement('div');
    autoListBody.id = 'autoListBody';
    autoListBody.style.cssText = `display: flex; flex-direction: column; gap: 12px; flex: 1; overflow: hidden;`;
    
    const autoListDescription = document.createElement('p');
    autoListDescription.id = 'autoListDescription';
    autoListDescription.textContent = 'Enter one URL per line to auto scrape data from multiple pages.';
    autoListDescription.style.cssText = `color: #BAC0CE; font-size: 13px; margin: 0; margin-bottom: 5px; opacity: 0.9;`;
    
    // URL textarea with line counter
    const urlTextareaContainer = document.createElement('div');
    urlTextareaContainer.id = 'urlTextareaContainer';
    urlTextareaContainer.style.cssText = `position: relative; width: 100%; height: 260px; margin-bottom: 5px;`;
    const urlTextarea = document.createElement('textarea');
    urlTextarea.id = 'urlTextarea';
    urlTextarea.placeholder = 'Enter one URL per line...';
    urlTextarea.style.cssText = `width: 100%; height: 100%; background-color: #2F343D; border: none; border-radius: 5px; color: #BAC0CE; font-size: 13px; padding: 8px; resize: none; box-sizing: border-box; line-height: 1.8; white-space: nowrap; border: 7px solid #2F343D;`;
    const urlCountDisplay = document.createElement('div');
    urlCountDisplay.id = 'urlCountDisplay';
    urlCountDisplay.style.cssText = `position: absolute; top: -22px; right: 0; color: #BAC0CE; font-size: 11px; opacity: 0.8;`;
    urlCountDisplay.textContent = '0 URLs';

    // Create progress bar container for visual feedback during URL navigation
    const progressBarContainer = document.createElement('div');
    progressBarContainer.id = 'progressBarContainer';
    progressBarContainer.style.cssText = `width: 100%; height: 6px; background-color: #2F343D; border-radius: 3px; margin-top: 8px; overflow: hidden; display: none; position: relative;`;

    // Create progress bar with shimmer effect
    const progressBar = document.createElement('div');
    progressBar.id = 'progressBar';
    progressBar.style.cssText = `height: 100%; width: 0%; background: linear-gradient(to right, #4A90E2, #63B3ED); transition: width 0.3s ease; position: relative; overflow: hidden;`;
    
    // Add shimmer effect to progress bar for visual appeal
    const progressBarShimmer = document.createElement('div');
    progressBarShimmer.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient( 90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0) 100% ); animation: shimmer 2s infinite;`;
    
    // Add shimmer animation style
    const shimmerStyle = document.createElement('style');
    shimmerStyle.textContent = `@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`;
    document.head.appendChild(shimmerStyle);
    
    progressBar.appendChild(progressBarShimmer);
    progressBarContainer.appendChild(progressBar);

    // Update URL count when textarea changes
    urlTextarea.addEventListener('input', () => {
        const lines = urlTextarea.value.split('\n').filter(line => line.trim().length > 0);
        urlCountDisplay.textContent = `${lines.length} URLs`;
    });

    urlTextareaContainer.appendChild(urlTextarea);
    urlTextareaContainer.appendChild(urlCountDisplay);

    autoListBody.appendChild(autoListDescription);
    autoListBody.appendChild(urlTextareaContainer);
    autoListBody.appendChild(progressBarContainer);

    // Create Auto List buttons container with two layers
    const autoListButtonsContainer = document.createElement('div');
    autoListButtonsContainer.style.cssText = `display: flex; flex-direction: column; gap: 10px; margin-top: 10px;`;

    // Create top layer buttons container
    const topButtonsContainer = document.createElement('div');
    topButtonsContainer.style.cssText = `display: flex; flex-direction: row; gap: 10px;`;

    // Create Start Auto button
    const startAutoButton = document.createElement('button');
    startAutoButton.id = 'startAutoButton';
    startAutoButton.textContent = 'Start Auto';
    startAutoButton.style.cssText = `flex: 1; height: 35px; background-color: #2F343D; border: none; border-radius: 5px; text-align: center; color: #BAC0CE; font-size: 14px; font-weight: bold; cursor: pointer; transition: background-color 0.2s ease;`;

    // Create Skip URL button (initially hidden, shows during navigation)
    const skipUrlButton = document.createElement('button');
    skipUrlButton.id = 'skipUrlButton';
    skipUrlButton.textContent = 'Skip';
    skipUrlButton.style.cssText = `height: 35px; width: 60px; background-color: #2F343D; border: none; border-radius: 5px; text-align: center; color: #BAC0CE; font-size: 14px; font-weight: bold; cursor: pointer; transition: background-color 0.2s ease; display: none;`;

    // Create Pause button (initially hidden, shows during navigation)
    const pauseJourneyButton = document.createElement('button');
    pauseJourneyButton.id = 'pauseJourneyButton';
    pauseJourneyButton.textContent = 'Pause';
    pauseJourneyButton.style.cssText = `height: 35px; width: 70px; background-color: #2F343D; border: none; border-radius: 5px; text-align: center; color: #BAC0CE; font-size: 14px; font-weight: bold; cursor: pointer; transition: background-color 0.2s ease; display: none;`;

    // Create Back button
    const autoListBackButton = document.createElement('button');
    autoListBackButton.id = 'autoListBackButton';
    autoListBackButton.textContent = 'Back';
    autoListBackButton.style.cssText = `flex: 1; height: 35px; background-color: #2F343D; border: none; border-radius: 5px; text-align: center; color: #BAC0CE; font-size: 14px; font-weight: bold; cursor: pointer; transition: background-color 0.2s ease;`;

    // Append top buttons
    topButtonsContainer.appendChild(startAutoButton);
    topButtonsContainer.appendChild(autoListBackButton);
    topButtonsContainer.appendChild(pauseJourneyButton); // Add pause button
    topButtonsContainer.appendChild(skipUrlButton); // Add skip button

    // Create bottom layer with Advanced Settings button
    const bottomButtonsContainer = document.createElement('div');
    bottomButtonsContainer.id = 'bottomButtonsContainer';
    bottomButtonsContainer.style.cssText = `display: flex; flex-direction: column; gap: 10px;`;

    // Create Advanced Settings button
    const advancedSettingsButton = document.createElement('button');
    advancedSettingsButton.id = 'advancedSettingsButton';
    advancedSettingsButton.textContent = 'Advanced Settings';
    advancedSettingsButton.style.cssText = `width: 100%; height: 25px; background-color: #2F343D; border: none; border-radius: 5px; text-align: center; color: #BAC0CE; font-size: 14px; font-weight: bold; cursor: pointer; transition: background-color 0.2s ease;`;

    // Create Advanced Settings content container
    const advancedSettingsContent = document.createElement('div');
    advancedSettingsContent.id = 'advancedSettingsContent';
    advancedSettingsContent.style.cssText = `display: none; padding: 10px; background-color: #2F343D; border-radius: 5px; margin-top: 10px; flex-direction: column; gap: 0px;`;

    // Create checkbox container for auto pagination toggle
    const checkboxContainer = document.createElement('div');
    checkboxContainer.style.cssText = `display: flex; align-items: center; gap: 8px;`;

    const autoCheckbox = document.createElement('input');
    autoCheckbox.type = 'checkbox';
    autoCheckbox.id = 'autoCheckbox';
    autoCheckbox.checked = false; // Default to unchecked
    autoCheckbox.style.cssText = `cursor: pointer;`;

    const autoCheckboxLabel = document.createElement('label');
    autoCheckboxLabel.htmlFor = 'autoCheckbox';
    autoCheckboxLabel.textContent = 'Enable Auto pagination and data loading';
    autoCheckboxLabel.style.cssText = `color: #BAC0CE; font-size: 13px; cursor: pointer;`;

    const autoCheckboxHint = document.createElement('span');
    autoCheckboxHint.textContent = '(Auto feature loads more data or opens new pages automatically)';
    autoCheckboxHint.style.cssText = `color: #BAC0CE; font-size: 11px; opacity: 0.7; margin-left: 5px;`;

    // --- Max Wait Setting ---
    // Create maxWait container for controlling when to move to next URL
    const maxWaitContainer = document.createElement('div');
    maxWaitContainer.style.cssText = `display: flex; flex-direction: column; gap: 5px;`;

    const maxWaitLabel = document.createElement('label');
    maxWaitLabel.htmlFor = 'maxWaitInput';
    maxWaitLabel.textContent = 'Wait time after last data found (milliseconds):';
    maxWaitLabel.style.cssText = `color: #BAC0CE; font-size: 13px;`;

    const maxWaitInput = document.createElement('input');
    maxWaitInput.type = 'number';
    maxWaitInput.id = 'maxWaitInput';
    maxWaitInput.value = '5000'; // Default value
    maxWaitInput.min = '0'; // Minimum value
    maxWaitInput.step = '100';
    maxWaitInput.style.cssText = `background-color: #161C26; border: 1px solid #4A5060; border-radius: 4px; color: #BAC0CE; font-size: 13px; padding: 4px 8px; width: 80px;`;

    const maxWaitHint = document.createElement('span');
    maxWaitHint.textContent = '(How long to wait before moving to next URL when no new data is detected)';
    maxWaitHint.style.cssText = `color: #BAC0CE; font-size: 11px; opacity: 0.7; margin-left: 5px;`;

    // Assemble Max Wait Setting
    maxWaitContainer.appendChild(maxWaitLabel);
    maxWaitContainer.appendChild(maxWaitInput);
    maxWaitContainer.appendChild(maxWaitHint);

    // --- Timeout Setting ---
    const timeoutContainer = document.createElement('div');
    timeoutContainer.style.cssText = `display: flex; flex-direction: column; gap: 5px;`;
    const timeoutLabel = document.createElement('label');
    timeoutLabel.htmlFor = 'timeoutInput';
    timeoutLabel.textContent = 'Maximum time per URL (milliseconds):';
    timeoutLabel.style.cssText = `color: #BAC0CE; font-size: 13px;`;
    const timeoutInput = document.createElement('input');
    timeoutInput.type = 'number';
    timeoutInput.id = 'timeoutInput';
    timeoutInput.value = '60000'; // Default value (60 seconds)
    timeoutInput.min = '1000'; // Minimum value (1 second)
    timeoutInput.step = '1000';
    timeoutInput.style.cssText = `background-color: #161C26; border: 1px solid #4A5060; border-radius: 4px; color: #BAC0CE; font-size: 13px; padding: 4px 8px; width: 80px;`;
    const timeoutHint = document.createElement('span');
    timeoutHint.textContent = '(Force skip to next URL if page takes longer than this to process)';
    timeoutHint.style.cssText = `color: #BAC0CE; font-size: 11px; opacity: 0.7; margin-left: 5px;`;
    timeoutContainer.appendChild(timeoutLabel);
    timeoutContainer.appendChild(timeoutInput);
    timeoutContainer.appendChild(timeoutHint);

    // --- Retry Setting ---
    const retryContainer = document.createElement('div');
    retryContainer.style.cssText = `display: flex; flex-direction: column; gap: 5px;`;
    const retryLabel = document.createElement('label');
    retryLabel.htmlFor = 'retryInput';
    retryLabel.textContent = 'Retry attempts per URL:';
    retryLabel.style.cssText = `color: #BAC0CE; font-size: 13px;`;
    const retryInput = document.createElement('input');
    retryInput.type = 'number';
    retryInput.id = 'retryInput';
    retryInput.value = '2'; // Default value (2 retry)
    retryInput.min = '0'; // Minimum value (0 means no retries)
    retryInput.max = '5'; // Maximum value to prevent excessive retries
    retryInput.step = '1';
    retryInput.style.cssText = `background-color: #161C26; border: 1px solid #4A5060; border-radius: 4px; color: #BAC0CE; font-size: 13px; padding: 4px 8px; width: 80px;`;
    const retryHint = document.createElement('span');
    retryHint.textContent = '(How many times to refresh page if it fails to load or scrape properly)';
    retryHint.style.cssText = `color: #BAC0CE; font-size: 11px; opacity: 0.7; margin-left: 5px;`;
    retryContainer.appendChild(retryLabel);
    retryContainer.appendChild(retryInput);
    retryContainer.appendChild(retryHint);

    // --- Pause Setting ---
    const pauseContainer = document.createElement('div');
    pauseContainer.style.cssText = `display: flex; flex-direction: column; gap: 5px;`;
    const pauseCheckboxContainer = document.createElement('div');
    pauseCheckboxContainer.style.cssText = `display: flex; align-items: center; gap: 8px;`;
    const pauseCheckbox = document.createElement('input');
    pauseCheckbox.type = 'checkbox';
    pauseCheckbox.id = 'pauseCheckbox';
    pauseCheckbox.checked = false;
    pauseCheckbox.style.cssText = `cursor: pointer;`;
    const pauseCheckboxLabel = document.createElement('label');
    pauseCheckboxLabel.htmlFor = 'pauseCheckbox';
    pauseCheckboxLabel.textContent = 'Enable automatic pausing';
    pauseCheckboxLabel.style.cssText = `color: #BAC0CE; font-size: 13px; cursor: pointer;`;
    const pauseCheckboxHint = document.createElement('span');
    pauseCheckboxHint.textContent = '(Temporarily stop navigation after processing a set number of URLs)';
    pauseCheckboxHint.style.cssText = `color: #BAC0CE; font-size: 11px; opacity: 0.7; margin-left: 5px;`;
    pauseCheckboxContainer.appendChild(pauseCheckbox);
    pauseCheckboxContainer.appendChild(pauseCheckboxLabel);
    
    // Pause sub-settings container (hidden by default)
    const pauseSubSettings = document.createElement('div');
    pauseSubSettings.id = 'pauseSubSettings';
    pauseSubSettings.style.cssText = `display: none; flex-direction: column; gap: 8px; margin-left: 20px; padding: 8px; border-left: 2px solid #4A5060; background-color: #1A2027; border-radius: 4px;`;
    
    // Pause After setting
    const pauseAfterContainer = document.createElement('div');
    pauseAfterContainer.style.cssText = `display: flex; flex-direction: column; gap: 3px;`;
    const pauseAfterLabel = document.createElement('label');
    pauseAfterLabel.htmlFor = 'pauseAfterInput';
    pauseAfterLabel.textContent = 'Pause after (URLs):';
    pauseAfterLabel.style.cssText = `color: #BAC0CE; font-size: 12px;`;
    const pauseAfterInput = document.createElement('input');
    pauseAfterInput.type = 'number';
    pauseAfterInput.id = 'pauseAfterInput';
    pauseAfterInput.value = '10';
    pauseAfterInput.min = '1';
    pauseAfterInput.step = '1';
    pauseAfterInput.style.cssText = `background-color: #161C26; border: 1px solid #4A5060; border-radius: 4px; color: #BAC0CE; font-size: 12px; padding: 4px 8px; width: 70px;`;
    pauseAfterContainer.appendChild(pauseAfterLabel);
    pauseAfterContainer.appendChild(pauseAfterInput);

    // Pause For setting
    const pauseForContainer = document.createElement('div');
    pauseForContainer.style.cssText = `display: flex; flex-direction: column; gap: 3px;`;
    const pauseForLabel = document.createElement('label');
    pauseForLabel.htmlFor = 'pauseForInput';
    pauseForLabel.textContent = 'Pause for (milliseconds):';
    pauseForLabel.style.cssText = `color: #BAC0CE; font-size: 12px;`;
    const pauseForInput = document.createElement('input');
    pauseForInput.type = 'number';
    pauseForInput.id = 'pauseForInput';
    pauseForInput.value = '30000';
    pauseForInput.min = '1000';
    pauseForInput.step = '1000';
    pauseForInput.style.cssText = `background-color: #161C26; border: 1px solid #4A5060; border-radius: 4px; color: #BAC0CE; font-size: 12px; padding: 4px 8px; width: 70px;`;
    pauseForContainer.appendChild(pauseForLabel);
    pauseForContainer.appendChild(pauseForInput);

    // Assemble pause sub-settings
    pauseSubSettings.appendChild(pauseAfterContainer);
    pauseSubSettings.appendChild(pauseForContainer);
    
    // Toggle pause sub-settings visibility
    pauseCheckbox.addEventListener('change', () => pauseSubSettings.style.display = pauseCheckbox.checked ? 'flex' : 'none');
    
    pauseContainer.appendChild(pauseCheckboxContainer);
    pauseContainer.appendChild(pauseCheckboxHint);
    pauseContainer.appendChild(pauseSubSettings);
    
    // --- Load Saved Advanced Settings ---
    chrome.storage.local.get('autoListAdvancedSettings', (result) => {
        if (result.autoListAdvancedSettings) {
            const settings = result.autoListAdvancedSettings;
            autoCheckbox.checked = settings.autoEnabled ?? false;
            maxWaitInput.value = settings.maxWait ?? '5000';
            timeoutInput.value = settings.timeout ?? '60000';
            retryInput.value = settings.retries ?? '2';
            pauseCheckbox.checked = settings.pauseEnabled ?? false;
            pauseAfterInput.value = settings.pauseAfter ?? '10';
            pauseForInput.value = settings.pauseFor ?? '30000';
            
            // Show/hide pause sub-settings based on saved state
            pauseSubSettings.style.display = pauseCheckbox.checked ? 'flex' : 'none';
        }
    });

    // Toggle Advanced Settings content visibility
    advancedSettingsButton.addEventListener('click', () => {
        const content = document.getElementById('advancedSettingsContent');
        if (content.style.display === 'none') {
            content.style.display = 'flex';
            advancedSettingsButton.textContent = 'Close Advanced Settings';
            topButtonsContainer.style.display = 'none';
            urlTextareaContainer.style.display = 'none';
            autoListDescription.style.display = 'none';
            progressBarContainer.style.display = 'none'; // Hide progress bar when opening advanced settings
        } else {
            content.style.display = 'none';
            topButtonsContainer.style.display = 'flex';
            urlTextareaContainer.style.display = 'block';
            autoListDescription.style.display = 'block';
            progressBarContainer.style.display = isAutoListRunning ? 'block' : 'none'; // Show progress bar only if running
            advancedSettingsButton.textContent = 'Advanced Settings';
        }
    });

    // Assemble the Advanced Settings content
    checkboxContainer.appendChild(autoCheckbox);
    checkboxContainer.appendChild(autoCheckboxLabel);
    advancedSettingsContent.appendChild(checkboxContainer);
    advancedSettingsContent.appendChild(autoCheckboxHint);
    
    // Add dividers between settings sections
    const divider1 = document.createElement('hr');
    divider1.style.cssText = `border: none; border-top: 1px solid #4A5060; margin: 10px 0;`;
    advancedSettingsContent.appendChild(divider1);
    advancedSettingsContent.appendChild(maxWaitContainer);
    const divider2 = document.createElement('hr');
    divider2.style.cssText = `border: none; border-top: 1px solid #4A5060; margin: 10px 0;`;
    advancedSettingsContent.appendChild(divider2);
    advancedSettingsContent.appendChild(timeoutContainer);
    const divider3 = document.createElement('hr');
    divider3.style.cssText = `border: none; border-top: 1px solid #4A5060; margin: 10px 0;`;
    advancedSettingsContent.appendChild(divider3);
    advancedSettingsContent.appendChild(retryContainer);
    const divider4 = document.createElement('hr');
    divider4.style.cssText = `border: none; border-top: 1px solid #4A5060; margin: 10px 0;`;
    advancedSettingsContent.appendChild(divider4);
    advancedSettingsContent.appendChild(pauseContainer);

    // Assemble the bottom buttons
    bottomButtonsContainer.appendChild(advancedSettingsButton);
    bottomButtonsContainer.appendChild(advancedSettingsContent);
    
    // Append button layers to the main buttons container
    autoListButtonsContainer.appendChild(topButtonsContainer);
    autoListButtonsContainer.appendChild(bottomButtonsContainer);
    
    // Append the main buttons container to the body
    autoListBody.appendChild(autoListButtonsContainer);
    
    // Assemble Auto List section
    autoListSection.appendChild(autoListHeader);
    autoListSection.appendChild(autoListBody);

    // Event handlers for Auto List functionality
    startAutoButton.addEventListener('click', () => isAutoListRunning ? stopAutoList() : startAutoList());
    
    // Skip URL button - sets flag to skip current URL processing
    skipUrlButton.addEventListener('click', async () => isAutoListRunning && await chrome.storage.local.set({ skipCurrentUrl: true }));
    
    // Manual pause/resume functionality
    let isManuallyPaused = false;
    pauseJourneyButton.addEventListener('click', async () => {
        if (isAutoListRunning) {
            isManuallyPaused = !isManuallyPaused;
            if (isManuallyPaused) {
                pauseJourneyButton.textContent = 'Resume';
                pauseJourneyButton.style.backgroundColor = '#404651';
                
                // Update status to show manual pause
                await updateAutoListStatus({ isManuallyPaused: true });
                
                // Update status info
                const statusInfo = document.getElementById('autoListStatusInfo');
                if (statusInfo) statusInfo.innerHTML = `<span style="color: #FFB84D;">Manually Paused</span><br><span style="font-size: 11px; opacity: 0.8;">Click Resume to continue</span>`;
            } else {
                pauseJourneyButton.textContent = 'Pause';
                pauseJourneyButton.style.backgroundColor = '#2F343D';
                
                // Clear manual pause state
                await updateAutoListStatus({ isManuallyPaused: false });
                
                // Continue processing if not in an automatic pause
                const { autoListStatus } = await chrome.storage.local.get('autoListStatus');
                if (!autoListStatus.autoListStatus?.isPaused) processNextUrl();
            }
        }
    });

    // Check if Auto List was running before page reload and restore state
    chrome.storage.local.get(['autoListStatus', 'scrapingStats'], async (result) => {
        if (result.autoListStatus?.scraperId === currentScraperId && result.autoListStatus?.running) {
            // Restore previous state
            isAutoListRunning = true;
            
            // Restore stats if available
            if (result.scrapingStats) {
                successPages = result.scrapingStats.successPages || 0;
                failedPages = result.scrapingStats.failedPages || 0;
                failedUrls = result.scrapingStats.failedUrls || [];
                totalExportCount = result.scrapingStats.exportCount || await getExportListCount();
            } else {
                totalExportCount = await getExportListCount();
            }
            
            // Restore advanced settings
            if (autoCheckbox) autoCheckbox.checked = result.autoListStatus.autoEnabled ?? true;
            const maxWaitInputElem = document.getElementById('maxWaitInput');
            if (maxWaitInputElem) maxWaitInputElem.value = result.autoListStatus.maxWait || '5000';
            const timeoutInputElem = document.getElementById('timeoutInput');
            if (timeoutInputElem) timeoutInputElem.value = result.autoListStatus.urlTimeout || '60000';
            const retryInputElem = document.getElementById('retryInput');
            if (retryInputElem) retryInputElem.value = result.autoListStatus.maxRetries || '1';
            const pauseCheckboxElem = document.getElementById('pauseCheckbox');
            const pauseAfterInputElem = document.getElementById('pauseAfterInput');
            const pauseForInputElem = document.getElementById('pauseForInput');
            const pauseSubSettingsElem = document.getElementById('pauseSubSettings');
            if (pauseCheckboxElem) pauseCheckboxElem.checked = result.autoListStatus.pauseEnabled || false;
            if (pauseAfterInputElem) pauseAfterInputElem.value = result.autoListStatus.pauseAfter || '10';
            if (pauseForInputElem) pauseForInputElem.value = result.autoListStatus.pauseFor || '30000';
            if (pauseSubSettingsElem) pauseSubSettingsElem.style.display = result.autoListStatus.pauseEnabled ? 'flex' : 'none';
            
            document.getElementById('urlTextarea').value = result.autoListStatus.urlList.join('\n');
            const lines = document.getElementById('urlTextarea').value.split('\n').filter(line => line.trim().length > 0);
            document.getElementById('urlCountDisplay').textContent = `${lines.length} URLs`;
            
            document.getElementById('progressBarContainer').style.display = 'block';
            const progressPercentage = ((result.autoListStatus.currentUrlIndex + 1) / result.autoListStatus.urlList.length) * 100;
            document.getElementById('progressBar').style.width = `${progressPercentage}%`;
            
            document.getElementById('startAutoButton').textContent = 'Stop Auto';
            document.getElementById('autoListBackButton').style.display = 'none';
            const bottomContainer = document.getElementById('bottomButtonsContainer');
            if (bottomContainer) bottomContainer.style.display = 'none';
            
            let statusInfo = document.getElementById('autoListStatusInfo');
            if (!statusInfo) {
                statusInfo = document.createElement('div');
                statusInfo.id = 'autoListStatusInfo';
                statusInfo.style.cssText = `margin-top: 8px; color: #BAC0CE; font-size: 12px; text-align: center; padding: 6px; background-color: #2F343D; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-height: 27px;`;
            }
            
            if (!result.autoListStatus.urlList[result.autoListStatus.currentUrlIndex]) return stopAutoList();
            restoreUIAndProcess(result.autoListStatus);
        }
    });

    return autoListSection;
};

const restoreUIAndProcess = async (autoListStatus) => {
    const { currentUrlIndex, urlList, currentRetryCount, maxRetries, isPaused, pauseStartTime, pauseFor, isManuallyPaused } = autoListStatus;
    const targetUrl = urlList[currentUrlIndex];
    const retryInfo = currentRetryCount > 0 ? ` (Retry ${currentRetryCount}/${maxRetries})` : '';
    let statusInfo = document.getElementById('autoListStatusInfo');
    if (!statusInfo) {
        statusInfo = document.createElement('div');
        statusInfo.id = 'autoListStatusInfo';
        statusInfo.style.cssText = `
            margin-top: 8px;
            color: #BAC0CE;
            font-size: 12px;
            text-align: center;
            padding: 6px;
            background-color: #2F343D;
            border-radius: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        autoListBody.appendChild(statusInfo);
    }
    if (isPaused && pauseStartTime) {
        const elapsedPauseTime = Date.now() - pauseStartTime;
        const remainingPauseTime = Math.max(0, pauseFor - elapsedPauseTime);
        if (remainingPauseTime > 0) {
            statusInfo.textContent = `Paused - Resuming in ${Math.ceil(remainingPauseTime / 1000)} seconds...`;
            document.getElementById('autoListBody').appendChild(statusInfo);
            let timeLeft = Math.ceil(remainingPauseTime / 1000);
            const countdownInterval = setInterval(() => {
                timeLeft--;
                if (timeLeft > 0) {
                    statusInfo.textContent = `Paused - Resuming in ${timeLeft} seconds...`;
                } else {
                    clearInterval(countdownInterval);
                    statusInfo.textContent = 'Resuming...';
                    updateAutoListStatus({ isPaused: false, pauseStartTime: null }).then(() => {
                        statusInfo.textContent = `Processing ${currentUrlIndex + 1}/${urlList.length}: ${targetUrl}${retryInfo}`;
                        processNextUrl();
                    });
                }
            }, 1000);
            setTimeout(async () => {
                if (timeLeft <= 0) return;
                clearInterval(countdownInterval);
                await updateAutoListStatus({ isPaused: false, pauseStartTime: null });
                statusInfo.textContent = `Processing ${currentUrlIndex + 1}/${urlList.length}: ${targetUrl}${retryInfo}`;
                processNextUrl();
            }, remainingPauseTime);
        } else {
            await updateAutoListStatus({ isPaused: false, pauseStartTime: null });
            statusInfo.textContent = `Processing ${currentUrlIndex + 1}/${urlList.length}: ${targetUrl}${retryInfo}`;
            document.getElementById('autoListBody').appendChild(statusInfo);
            processNextUrl();
        }
    } else {
        statusInfo.textContent = `Processing ${currentUrlIndex + 1}/${urlList.length}: ${targetUrl}${retryInfo}`;
        document.getElementById('autoListBody').appendChild(statusInfo);
        processNextUrl();
    }
    
    const urlTextareaCont = document.getElementById('urlTextareaContainer');
    if (urlTextareaCont) urlTextareaCont.style.display = 'none';
    
    await updateScrapingStats();
    
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('autoListSection').style.display = 'flex';

    const skipBtn = document.getElementById('skipUrlButton');
    if (skipBtn) skipBtn.style.display = 'block';
    
    const pauseBtn = document.getElementById('pauseJourneyButton');
    if (pauseBtn) {
        pauseBtn.style.display = 'block';
        if (isManuallyPaused) {
            pauseBtn.textContent = 'Resume';
        } else {
            pauseBtn.textContent = 'Pause';
        }
    }

    if (!isPaused && document.getElementById('autoCheckbox').checked && window.scrapers[currentScraperId].autoPagination) {
        if (!isAutoPaginationRunning) {
            // Only start auto pagination after some data is found
            const checkForDataAndStart = () => {
                if (window.scrapedData[currentScraperId]?.length > 0) {
                    startAutoPagination();
                } else {
                    // Check again after a short delay
                    setTimeout(checkForDataAndStart, 1000);
                }
            };
            checkForDataAndStart();
        }
    }
};

const startAutoList = async () => {
    const urls = document.getElementById('urlTextarea').value.split('\n').filter(url => url.trim().length > 0);
    if (urls.length === 0) return;

    isAutoListRunning = true;
    document.getElementById('startAutoButton').textContent = 'Stop Auto';
    document.getElementById('autoListBackButton').style.display = 'none';
    document.getElementById('skipUrlButton').style.display = 'none';
    document.getElementById('pauseJourneyButton').style.display = 'none';
    document.getElementById('bottomButtonsContainer').style.display = 'none';
    
    successPages = 0;
    failedPages = 0;
    failedUrls = [];
    totalExportCount = await getExportListCount();
    
    document.getElementById('progressBarContainer').style.display = 'block';
    const initialProgress = (1 / urls.length) * 100;
    document.getElementById('progressBar').style.width = `${initialProgress}%`;

    const maxWaitValue = parseInt(document.getElementById('maxWaitInput')?.value, 10) || 5000;
    const timeoutValue = parseInt(document.getElementById('timeoutInput')?.value, 10) || 60000;
    const maxRetriesValue = parseInt(document.getElementById('retryInput')?.value, 10) || 1;
    const autoEnabledValue = document.getElementById('autoCheckbox').checked;

    const pauseEnabledValue = document.getElementById('pauseCheckbox').checked;
    const pauseAfterValue = parseInt(document.getElementById('pauseAfterInput')?.value, 10) || 10;
    const pauseForValue = parseInt(document.getElementById('pauseForInput')?.value, 10) || 30000;
    
    await chrome.storage.local.set({ autoListAdvancedSettings: { autoEnabled: autoEnabledValue, maxWait: maxWaitValue, timeout: timeoutValue, retries: maxRetriesValue, pauseEnabled: pauseEnabledValue, pauseAfter: pauseAfterValue, pauseFor: pauseForValue } });
    
    await updateAutoListStatus({
        scraperId: currentScraperId,
        running: true,
        urlList: urls,
        currentUrlIndex: 0,
        autoEnabled: autoEnabledValue,
        maxWait: maxWaitValue,
        urlTimeout: timeoutValue,
        maxRetries: maxRetriesValue,
        currentRetryCount: 0,
        pauseEnabled: pauseEnabledValue,
        pauseAfter: pauseAfterValue,
        pauseFor: pauseForValue,
        processedUrls: 0
    });
    
    let statusInfo = document.getElementById('autoListStatusInfo');
    if (!statusInfo) {
        statusInfo = document.createElement('div');
        statusInfo.id = 'autoListStatusInfo';
        statusInfo.style.cssText = `margin-top: 8px; color: #BAC0CE; font-size: 12px; text-align: center; padding: 6px; background-color: #2F343D; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
        document.getElementById('autoListBody').appendChild(statusInfo);
    }
    statusInfo.textContent = `Navigating to 1/${urls.length}: ${urls[0]}`;
    window.location.href = urls[0];
    if(window.location.href == urls[0]){
        location.reload();
    }
};

const stopAutoList = async () => {
    isAutoListRunning = false;
    document.getElementById('startAutoButton').textContent = 'Start Auto';
    document.getElementById('autoListBackButton').style.display = 'block';
    document.getElementById('skipUrlButton').style.display = 'none';
    document.getElementById('pauseJourneyButton').style.display = 'none';
    document.getElementById('bottomButtonsContainer').style.display = 'block';
    
    const progressBarContainer = document.getElementById('progressBarContainer');
    if (progressBarContainer) progressBarContainer.style.display = 'none';
    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.style.width = '0%';

    const { autoListStatus } = await chrome.storage.local.get('autoListStatus');
    const urlList = autoListStatus?.urlList || [];
    const currentIndex = autoListStatus?.currentUrlIndex || 0;
    const hasFailedUrls = (autoListStatus?.failedUrls?.length > 0) || (failedUrls.length > 0);
    const isComplete = currentIndex >= urlList.length - 1;

    if (isComplete && hasFailedUrls) {
        showCompletionScreen();
    } else {
        successPages = 0;
        failedPages = 0;
        failedUrls = [];
        
        const statusInfo = document.getElementById('autoListStatusInfo');
        if (statusInfo) statusInfo.remove();
        const statsContainer = document.getElementById('statsContainer');
        if (statsContainer) statsContainer.remove();
        const completionSection = document.getElementById('completionSection');
        if (completionSection && completionSection.parentNode) completionSection.parentNode.removeChild(completionSection);
    
        if (isAutoPaginationRunning) stopAutoPagination();
        
        await chrome.storage.local.remove(['autoListStatus', 'scrapingStats']);

        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('autoListSection').style.display = 'none';
    }
};

const showCompletionScreen = async () => {
    const { autoListStatus, scrapingStats } = await chrome.storage.local.get(['autoListStatus', 'scrapingStats']);
    const currentFailedUrls = autoListStatus?.failedUrls || failedUrls;
    
    let completionSection = document.getElementById('completionSection');
    if (!completionSection) {
        completionSection = document.createElement('div');
        completionSection.id = 'completionSection';
        completionSection.style.cssText = `display: flex; flex-direction: column; border-radius: 8px; color: #BAC0CE; gap: 16px; width: 100%; max-width: 400px; position: relative;`;
        document.getElementById('scrapePopup').appendChild(completionSection);
    }
    
    const header = document.createElement('div');
    header.style.cssText = `display: flex; justify-content: center; font-size: 16px; font-weight: bold; color: #BAC0CE; border-bottom: 1px solid #4A5060; padding-bottom: 12px;`;
    header.textContent = 'URL Navigation Finished';
    
    const statsSection = document.createElement('div');
    statsSection.style.cssText = `display: flex; flex-direction: column; gap: 8px; font-size: 14px;`;
    const totalUrls = autoListStatus?.urlList?.length || 0;
    const successfulUrls = scrapingStats?.successPages || successPages;
    const failedUrlsCount = scrapingStats?.failedUrls?.length || failedUrls.length;
    const exportCount = scrapingStats?.exportCount || totalExportCount;
    statsSection.innerHTML = `<div>Total URLs: ${totalUrls}</div><div>Successfully Processed: ${successfulUrls}</div><div>Failed: ${failedUrlsCount}</div><div>Total Items Added: ${exportCount}</div>`;
    
    const failedUrlsSection = document.createElement('div');
    failedUrlsSection.style.cssText = `display: flex; flex-direction: column; gap: 8px; max-height: 150px; overflow-y: auto; border: 1px solid #4A5060; border-radius: 4px; padding: 8px; font-size: 13px; background-color: #242830;`;
    if (currentFailedUrls.length > 0) {
        failedUrlsSection.innerHTML = `<div style="font-weight: bold; margin-bottom: 4px;">Failed URLs:</div>`;
        currentFailedUrls.forEach(url => {
            const urlElement = document.createElement('div');
            urlElement.style.cssText = `white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #BAC0CE; opacity: 0.8; min-height:15px;`;
            urlElement.textContent = url;
            failedUrlsSection.appendChild(urlElement);
        });
    } else {
        failedUrlsSection.innerHTML = `<div>No failed URLs to display.</div>`;
    }
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `display: flex; gap: 8px; justify-content: space-between;`;
    const retryButton = document.createElement('button');
    retryButton.textContent = 'Retry Failed URLs';
    retryButton.style.cssText = `background-color: #2F343D; border: 1px solid #4A5060; border-radius: 4px; color: #BAC0CE; padding: 8px 12px; cursor: pointer; flex: 1;`;
    retryButton.disabled = currentFailedUrls.length === 0;
    if (retryButton.disabled) {
        retryButton.style.opacity = '0.5';
        retryButton.style.cursor = 'not-allowed';
    }
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Done';
    cancelButton.style.cssText = `background-color: #2F343D; border: 1px solid #4A5060; border-radius: 4px; color: #BAC0CE; padding: 8px 12px; cursor: pointer; flex: 1; max-width: 80px;`;
    
    retryButton.addEventListener('click', () => retryFailedUrls(currentFailedUrls));
    cancelButton.addEventListener('click', () => {
        completionSection.style.display = 'none';
        chrome.storage.local.remove(['autoListStatus', 'scrapingStats']);
        successPages = 0;
        failedPages = 0;
        failedUrls = [];
        const statusInfo = document.getElementById('autoListStatusInfo');
        if (statusInfo) statusInfo.remove();
        const statsContainer = document.getElementById('statsContainer');
        if (statsContainer) statsContainer.remove();
        const progressBarContainer = document.getElementById('progressBarContainer');
        if (progressBarContainer) progressBarContainer.style.display = 'none';
        if (document.getElementById('autoListSection')) document.getElementById('autoListSection').style.display = 'none';
        if (document.getElementById('mainContent')) document.getElementById('mainContent').style.display = 'block';
        setTimeout(() => {
            if (completionSection && completionSection.parentNode) completionSection.parentNode.removeChild(completionSection);
        }, 300);
    });
    
    buttonsContainer.appendChild(retryButton);
    buttonsContainer.appendChild(cancelButton);
    completionSection.innerHTML = '';
    completionSection.appendChild(header);
    completionSection.appendChild(statsSection);
    completionSection.appendChild(failedUrlsSection);
    completionSection.appendChild(buttonsContainer);
    
    if (document.getElementById('mainContent')) document.getElementById('mainContent').style.display = 'none';
    if (document.getElementById('autoListSection')) document.getElementById('autoListSection').style.display = 'none';
    completionSection.style.display = 'flex';
};

const retryFailedUrls = async (urlsToRetry) => {
    document.getElementById('urlTextarea').value = urlsToRetry.join('\n');
    const completionSection = document.getElementById('completionSection');
    if (completionSection) completionSection.style.display = 'none';
    if (document.getElementById('autoListSection')) document.getElementById('autoListSection').style.display = 'flex';
    const statusInfo = document.getElementById('autoListStatusInfo');
    if (statusInfo) statusInfo.remove();
    const statsContainer = document.getElementById('statsContainer');
    if (statsContainer) statsContainer.remove();
    document.getElementById('startAutoButton').textContent = 'Start Auto';
    document.getElementById('autoListBackButton').style.display = 'block';
    document.getElementById('skipUrlButton').style.display = 'none';
    document.getElementById('pauseJourneyButton').style.display = 'none';
    document.getElementById('bottomButtonsContainer').style.display = 'block';
    const lines = document.getElementById('urlTextarea').value.split('\n').filter(line => line.trim().length > 0);
    document.getElementById('urlCountDisplay').textContent = `${lines.length} URLs`;
};

const skipToNextUrl = async () => {
    const { autoListStatus } = await chrome.storage.local.get('autoListStatus');
    if (!autoListStatus?.running || !isAutoListRunning) return await stopAutoList();

    const { urlList, currentUrlIndex } = autoListStatus;
    const targetUrl = urlList[currentUrlIndex];
    
    // Clear any monitoring intervals/timeouts from processNextUrl
    const existingIntervals = window.autoListMonitorInterval;
    const existingTimeouts = window.autoListMonitorTimeout;
    if (existingIntervals) clearInterval(existingIntervals);
    if (existingTimeouts) clearTimeout(existingTimeouts);

    // Mark current URL as failed since it was skipped
    failedPages++;
    if (!failedUrls.includes(targetUrl)) failedUrls.push(targetUrl);
    await updateAutoListStatus({ failedUrls: [...failedUrls] });
    await updateScrapingStats();

    // Cancel any pausing states
    await updateAutoListStatus({ 
        isPaused: false, 
        pauseStartTime: null, 
        isManuallyPaused: false,
        currentRetryCount: 0 // Reset retry count for next URL
    });

    const statusInfo = document.getElementById('autoListStatusInfo');
    if (statusInfo) {
        statusInfo.innerHTML = `<span style="color: #FFB84D;">Skipped URL ${currentUrlIndex + 1}/${urlList.length}</span><br><span style="font-size: 11px; opacity: 0.8;">Moving to next URL...</span>`;
    }

    // Move to next URL immediately
    const nextIndex = currentUrlIndex + 1;
    if (nextIndex < urlList.length) {
        const nextUrl = urlList[nextIndex];
        await updateAutoListStatus({ 
            currentUrlIndex: nextIndex, 
            navigating: true, 
            navigationTarget: nextUrl, 
            currentRetryCount: 0 
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        window.location.href = nextUrl;
    } else {
        await stopAutoList();
    }
};

const processNextUrl = async () => {
    const { autoListStatus } = await chrome.storage.local.get('autoListStatus');
    if (!autoListStatus?.running || !isAutoListRunning) return await stopAutoList();
    if (autoListStatus.isManuallyPaused) return;

    const { urlList, currentUrlIndex, maxWait, urlTimeout, maxRetries, currentRetryCount } = autoListStatus;
    if (currentUrlIndex >= urlList.length) return await stopAutoList();

    const targetUrl = urlList[currentUrlIndex];
    const progressBar = document.getElementById('progressBar');
    const statusInfo = document.getElementById('autoListStatusInfo');
    if (progressBar) {
        const progressPercentage = ((currentUrlIndex + 1) / urlList.length) * 100;
        progressBar.style.width = `${progressPercentage}%`;
    }
    if (statusInfo) {
        const retryInfo = currentRetryCount > 0 ? ` (Retry ${currentRetryCount}/${maxRetries})` : '';
        try {
            const path = new URL(targetUrl).pathname + new URL(targetUrl).search;
            statusInfo.textContent = `Processing ${currentUrlIndex + 1}/${urlList.length}: ${path}${retryInfo}`;
        } catch {
            statusInfo.textContent = `Processing ${currentUrlIndex + 1}/${urlList.length}: ${targetUrl}${retryInfo}`;
        }
    }

    if (autoListStatus.navigating && autoListStatus.navigationTarget === window.location.href) {
        await updateAutoListStatus({ navigating: false, navigationTarget: null });
    }

    const initialExportCount = await getExportListCount();
    await new Promise(resolve => setTimeout(resolve, 500));

    let monitorInterval = null;
    let monitorTimeout = null;
    let lastDataSaveTime = Date.now();
    let lastDataCount = window.scrapedData[currentScraperId]?.length || 0;

    const finishPageAndNavigate = async (noRetry = false) => {
        if(monitorInterval) clearInterval(monitorInterval);
        if(monitorTimeout) clearTimeout(monitorTimeout);
        if(window.autoListMonitorInterval) clearInterval(window.autoListMonitorInterval);
        if(window.autoListMonitorTimeout) clearTimeout(window.autoListMonitorTimeout);
        if (!isAutoListRunning) return;

        const finalExportCount = await getExportListCount();
        totalExportCount = finalExportCount;
        
        const newItemsAdded = finalExportCount > initialExportCount || (window.scrapedData[currentScraperId]?.length || 0) > 0;
        const needsRetry = !newItemsAdded && currentRetryCount < maxRetries && !noRetry;
        
        if (needsRetry) {
            await updateAutoListStatus({ currentRetryCount: currentRetryCount + 1, exportCount: totalExportCount });
            if (statusInfo) {
                try {
                    const path = new URL(targetUrl).pathname + new URL(targetUrl).search;
                    statusInfo.textContent = `Retrying ${currentUrlIndex + 1}/${urlList.length}: ${path} (Retry ${currentRetryCount + 1}/${maxRetries})`;
                } catch {
                    statusInfo.textContent = `Retrying ${currentUrlIndex + 1}/${urlList.length}: ${targetUrl} (Retry ${currentRetryCount + 1}/${maxRetries})`;
                }
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            window.location.reload();
            return;
        }
        
        if (newItemsAdded) {
            if (document.getElementById('saveScrapedData') && (window.scrapedData[currentScraperId]?.length || 0) > 0) {
                if(document.getElementById('saveScrapedData').textContent === 'Add to Export List') document.getElementById('saveScrapedData').click();
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            successPages++;
        } else {
            failedPages++;
            if (!failedUrls.includes(targetUrl)) failedUrls.push(targetUrl);
            await updateAutoListStatus({ failedUrls: [...failedUrls], exportCount: totalExportCount });
        }
        
        await updateScrapingStats();

        const currentStatus = await chrome.storage.local.get('autoListStatus');
        const currentProcessedUrls = (currentStatus.autoListStatus?.processedUrls || 0) + 1;
        
        const { pauseEnabled, pauseAfter, pauseFor } = currentStatus.autoListStatus || {};
        if (pauseEnabled && currentProcessedUrls % pauseAfter === 0) {
            await updateAutoListStatus({ processedUrls: currentProcessedUrls, isPaused: true, pauseStartTime: Date.now(), exportCount: totalExportCount });
            if (statusInfo) {
                let remainingTime = Math.ceil(pauseFor / 1000);
                statusInfo.textContent = `Paused - Resuming in ${remainingTime} seconds...`;
                const countdownInterval = setInterval(() => {
                    remainingTime--;
                    if (remainingTime > 0) {
                        statusInfo.textContent = `Paused - Resuming in ${remainingTime} seconds...`;
                    } else {
                        clearInterval(countdownInterval);
                        statusInfo.textContent = 'Resuming...';
                    }
                }, 1000);
            }
            await new Promise(resolve => setTimeout(resolve, pauseFor));
            await updateAutoListStatus({ isPaused: false, pauseStartTime: null, exportCount: totalExportCount });
        } else {
            await updateAutoListStatus({ processedUrls: currentProcessedUrls, exportCount: totalExportCount });
        }

        const nextIndex = currentUrlIndex + 1;
        if (nextIndex < urlList.length) {
            const nextUrl = urlList[nextIndex];
            await updateAutoListStatus({ currentUrlIndex: nextIndex, navigating: true, navigationTarget: nextUrl, currentRetryCount: 0, exportCount: totalExportCount });
            await new Promise(resolve => setTimeout(resolve, 500));
            window.location.href = nextUrl;
        } else {
            await stopAutoList();
        }
    };

    monitorTimeout = setTimeout(async () => {
        const { autoListStatus: timeoutAutoListStatus } = await chrome.storage.local.get('autoListStatus');
        if (timeoutAutoListStatus?.isManuallyPaused || timeoutAutoListStatus?.isPaused) return;
        finishPageAndNavigate();
    }, urlTimeout);
    window.autoListMonitorTimeout = monitorTimeout;

    let lastExportCount = initialExportCount;
    updateWaitTimer(lastDataSaveTime, maxWait);

    monitorInterval = setInterval(async () => {
        if (!isAutoListRunning) {
            if(monitorInterval) clearInterval(monitorInterval);
            if(monitorTimeout) clearTimeout(monitorTimeout);
            return;
        }
        const { autoListStatus: currentAutoListStatus } = await chrome.storage.local.get('autoListStatus');
        if (currentAutoListStatus?.isManuallyPaused) return;

        // Check for skip first to handle it immediately
        const { skipCurrentUrl } = await chrome.storage.local.get('skipCurrentUrl');
        if (skipCurrentUrl) {
            await chrome.storage.local.remove('skipCurrentUrl');
            skipToNextUrl();
            return;
        }

        const currentDataCount = window.scrapedData[currentScraperId]?.length || 0;
        const currentExportCount = await getExportListCount();
        if (currentDataCount > lastDataCount || currentExportCount > lastExportCount) {
            if (currentExportCount > lastExportCount) {
                totalExportCount = currentExportCount;
                await updateScrapingStats();
            }
            lastDataSaveTime = Date.now();
            lastDataCount = currentDataCount;
            lastExportCount = currentExportCount;
        }
        updateWaitTimer(lastDataSaveTime, maxWait);
        if (Date.now() - lastDataSaveTime > maxWait) finishPageAndNavigate();
    }, 500);
    window.autoListMonitorInterval = monitorInterval;
};

const updateAutoListStatus = async (newState) => {
    const { autoListStatus } = await chrome.storage.local.get('autoListStatus');
    const autoEnabled = (!autoListStatus && newState.autoEnabled !== undefined) ? newState.autoEnabled : autoListStatus?.autoEnabled;
    const updatedState = {
        scraperId: newState.scraperId || autoListStatus?.scraperId,
        running: newState.running ?? autoListStatus?.running ?? false,
        urlList: newState.urlList || autoListStatus?.urlList || [],
        currentUrlIndex: newState.currentUrlIndex ?? autoListStatus?.currentUrlIndex ?? 0,
        autoEnabled,
        maxWait: newState.maxWait ?? autoListStatus?.maxWait ?? 5000,
        navigating: newState.navigating ?? autoListStatus?.navigating ?? false,
        navigationTarget: newState.navigationTarget || autoListStatus?.navigationTarget || null,
        urlTimeout: newState.urlTimeout ?? autoListStatus?.urlTimeout ?? 60000,
        maxRetries: newState.maxRetries ?? autoListStatus?.maxRetries ?? 1,
        currentRetryCount: newState.currentRetryCount ?? autoListStatus?.currentRetryCount ?? 0,
        failedUrls: newState.failedUrls ?? autoListStatus?.failedUrls ?? [],
        pauseEnabled: newState.pauseEnabled ?? autoListStatus?.pauseEnabled ?? false,
        pauseAfter: newState.pauseAfter ?? autoListStatus?.pauseAfter ?? 10,
        pauseFor: newState.pauseFor ?? autoListStatus?.pauseFor ?? 30000,
        processedUrls: newState.processedUrls ?? autoListStatus?.processedUrls ?? 0,
        isPaused: newState.isPaused ?? autoListStatus?.isPaused ?? false,
        pauseStartTime: newState.pauseStartTime ?? autoListStatus?.pauseStartTime ?? null,
        isManuallyPaused: newState.isManuallyPaused ?? autoListStatus?.isManuallyPaused ?? false
    };

    totalExportCount = (newState.exportCount === undefined) ? await getExportListCount() : newState.exportCount;
    await chrome.storage.local.set({ autoListStatus: updatedState, scrapingStats: { successPages, failedPages, failedUrls, exportCount: totalExportCount } });
    return updatedState;
};

const getExportListCount = async () => {
    const storage = await chrome.storage.local.get(['extractedData']);
    if (storage.extractedData) {
        try {
            return JSON.parse(storage.extractedData).length || 0;
        } catch (e) {
            return 0;
        }
    }
    return 0;
};

const updateWaitTimer = (lastDataSaveTime, maxWait) => {
    let waitTimer = document.getElementById('waitTimer');
    if (!waitTimer) {
        waitTimer = document.createElement('div');
        waitTimer.id = 'waitTimer';
        waitTimer.style.cssText = `margin-top: 8px; color: #BAC0CE; font-size: 12px; text-align: center; padding: 6px; background-color: #2F343D; border-radius: 4px; width: 60px; min-width: 60px; box-sizing: border-box;`;
        const autoListBody = document.getElementById('autoListBody');
        const statsInfo = document.getElementById('scrapingStatsInfo');
        if (autoListBody && statsInfo) {
            let statsContainer = document.getElementById('statsContainer');
            if (!statsContainer) {
                statsContainer = document.createElement('div');
                statsContainer.id = 'statsContainer';
                statsContainer.style.cssText = `display: flex; gap: 8px; align-items: center; flex-wrap: nowrap;`;
                autoListBody.insertBefore(statsContainer, statsInfo);
                statsContainer.appendChild(statsInfo);
            }
            statsContainer.appendChild(waitTimer);
        }
    }
    if (lastDataSaveTime !== undefined && maxWait !== undefined) {
        const elapsedTime = Date.now() - lastDataSaveTime;
        const remainingWait = Math.max(0, Math.ceil((maxWait - elapsedTime) / 1000));
        waitTimer.textContent = `${remainingWait}s`;
    } else {
        waitTimer.textContent = '';
    }
};

const updateScrapingStats = async () => {
    let statsInfo = document.getElementById('scrapingStatsInfo');
    if (!statsInfo){
        statsInfo = document.createElement('div');
        statsInfo.id = 'scrapingStatsInfo';
        statsInfo.style.cssText = `margin-top: 8px; color: #BAC0CE; font-size: 12px; text-align: center; padding: 6px; background-color: #2F343D; border-radius: 4px; flex:1;`;
        const autoListBody = document.getElementById('autoListBody');
        const statsContainer = document.getElementById('statsContainer');
        if (autoListBody && statsContainer) {
            statsContainer.insertBefore(statsInfo, statsContainer.firstChild);
        } else if (autoListBody) {
            autoListBody.appendChild(statsInfo);
        }
    }
    
    const exportCount = await getExportListCount();
    statsInfo.textContent = `Success: ${successPages} | Failed: ${failedPages} | Added: ${exportCount}`;
    
    await chrome.storage.local.set({ scrapingStats: { successPages, failedPages, failedUrls, exportCount } });
}; 