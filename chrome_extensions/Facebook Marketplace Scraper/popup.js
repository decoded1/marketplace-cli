const prepareMain = async () => {
    main.style.height = '600px';
    footerBtns.style.display = 'flex';
    settingsBtn.style.display = 'block';
    headerText.innerHTML = `${extensionInfo.name}: Unlimited Access`;
    const { user } = await chrome.storage.local.get(['user']);
    
    // Configure dynamic footer button based on user status
    const dynamicFooterBtn = document.getElementById('dynamicFooterBtn');
    if (user.status === 'free') {
        dynamicFooterBtn.innerHTML = '<img src="images/ruby.svg" alt="Upgrade" style="width: 12px; height: 12px; margin-right: 5px;">Upgrade to Premium';
        dynamicFooterBtn.onclick = () => {
            showPaymentSection();
        };
        handleFreeUserUI();
    }else if (user.status === 'free_trial') {
        dynamicFooterBtn.innerHTML = '<img src="images/ruby.svg" alt="Upgrade" style="width: 12px; height: 12px; margin-right: 5px;">Upgrade to Premium';
        dynamicFooterBtn.onclick = () => {
            showPaymentSection();
        };
        handleTrialUserUI();
    }else{
        dynamicFooterBtn.textContent = 'Check our other extensions';
        dynamicFooterBtn.onclick = () => {
            window.open('https://nifty.codes/#ourExtensions', '_blank');
        };
        upgradeBtn.style.display = 'none';
    }
    
    const contactUsBtn = document.getElementById('contactUsBtn');
    contactUsBtn.href = `${extensionInfo.backendUrl}/e/${extensionInfo.id}/contact`;

    await showPopupIfNeeded();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    if (!extensionInfo.domains.some(domain => tab.url.includes(domain))) {
        Object.keys(scrapers).forEach(id => {
            scrapers[id].check = false;
        });
        await showScrapeSection(false);
        return;
    } else {
        const isContentScriptLoaded = await checkContentScript();
        if (!isContentScriptLoaded) {
            showReloadSection();
            return;
        }
        const result = await chrome.storage.local.get(['selectedScraper']);
        if (result.selectedScraper) {
            await showFinalSection();
            return;
        }
    }
    await showScrapeSection();
}

const checkContentScript = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return false;

    try {
        await chrome.tabs.sendMessage(tab.id, { action: "ping" });
        return true;
    } catch (error) {
        return false;
    }
};

const checkVersionForDevelopment = async () => {
    return new Promise((resolve) => {
        chrome.management.getSelf(async function(info) {
            
            if (info.installType === "development") {
                try {
                    const response = await fetch(`${extensionInfo.backendUrl}/extension/${extensionInfo.id}/version`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.version && data.version !== extensionInfo.version) {
                            showVersionUpdateOverlay();
                            return;
                        }
                    }
                } catch (error) {
                    console.error('Failed to check version:', error);
                }
            }
            resolve();
        });
    });
};

const showVersionUpdateOverlay = () => {
    // Create and show the update overlay
    const overlay = document.createElement('div');
    overlay.id = 'versionUpdateOverlay';
    overlay.className = 'version-update-overlay';
    overlay.innerHTML = `
        <div class="version-update-content">
            <h3>Extension Outdated</h3>
            <p>Your extension is outdated. Update to get the latest features and bug fixes.</p>
            <div class="version-update-buttons">
                <a href="${extensionInfo.backendUrl}/e/${extensionInfo.id}/manual?update=true" target="_blank" class="update-btn">Update</a>
                <button id="uninstallExtensionBtn" class="uninstall-btn">Uninstall Extension</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add uninstall functionality
    document.getElementById('uninstallExtensionBtn').addEventListener('click', () => {
        chrome.management.uninstallSelf();
    });
};

(async () => {
    checkVersionForDevelopment();
    main.style.height = 'unset';
    headerText.style.display = 'flex';
    showLoginSection();
})();

