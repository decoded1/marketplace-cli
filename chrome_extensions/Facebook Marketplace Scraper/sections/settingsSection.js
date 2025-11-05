const settingsBackBtn = document.getElementById('settingsBackBtn');
const webhookToggle = document.getElementById('webhookToggle');
const webhookDetailsDiv = document.getElementById('webhookDetails');
const webhookUrlInput = document.getElementById('webhookUrlInput');
const webhookSaveBtn = document.getElementById('webhookSaveBtn');
const keepDataToggle = document.getElementById('keepDataToggle');

const showSettingsSection = async () => {
    // Get user data and update display
    const { user, webhookEnabled, webhookUrl, keepDataAfterExport } = await chrome.storage.local.get(['user', 'webhookEnabled', 'webhookUrl', 'keepDataAfterExport']);
    document.querySelector('.userInfoItemValue').textContent = user.email;
    document.querySelector('.userInfoItem:nth-child(2) .userInfoItemValue').textContent = user.status;

    // Set initial state for webhook settings
    webhookToggle.checked = webhookEnabled || false;
    if (webhookEnabled) {
        webhookDetailsDiv.style.display = 'flex';
        webhookUrlInput.value = webhookUrl || '';
    } else {
        webhookDetailsDiv.style.display = 'none';
    }

    // Set initial state for keep data setting
    keepDataToggle.checked = keepDataAfterExport || false;

    pushToLastSection(() => {
        showSettingsSection();
    });
    hideSections();
    settingsSection.style.display = 'flex';
}

// Add logout button handler
document.getElementById('logoutBtn').addEventListener('click', async () => {
    // Clear storage
    await chrome.storage.local.remove(['jwt_token', 'user', 'lastLoginTime', 'extractedData', 'selectedScraper', 'exportedRawData']);
    
    window.close();
});

document.getElementById('upgradeBtn').addEventListener('click', showPaymentSection);

// Webhook Toggle Handler
webhookToggle.addEventListener('change', async () => {
    const isEnabled = webhookToggle.checked;
    await chrome.storage.local.set({ webhookEnabled: isEnabled });
    if (isEnabled) {
        webhookDetailsDiv.style.display = 'flex';
        // Optionally load saved URL when toggled on
        const { webhookUrl } = await chrome.storage.local.get('webhookUrl');
        webhookUrlInput.value = webhookUrl || '';
    } else {
        webhookDetailsDiv.style.display = 'none';
        // Optionally clear URL when toggled off
        // await chrome.storage.local.remove('webhookUrl'); 
        // webhookUrlInput.value = '';
    }
});

// Webhook Save Button Handler
webhookSaveBtn.addEventListener('click', async () => {
    const url = webhookUrlInput.value.trim();
    if (url) {
        // Basic URL validation (optional, enhance as needed)
        try {
            new URL(url);
            await chrome.storage.local.set({ webhookUrl: url });
            // Indicate success (e.g., change button text briefly)
            const originalText = webhookSaveBtn.textContent;
            webhookSaveBtn.textContent = 'Saved!';
            setTimeout(() => {
                webhookSaveBtn.textContent = originalText;
            }, 1500);
        } catch (_) {
            alert('Invalid URL format. Please enter a valid URL.');
        }
    } else {
        // Clear URL if input is empty
        await chrome.storage.local.remove('webhookUrl');
        alert('Webhook URL cleared.');
    }
});

settingsBackBtn.addEventListener('click', goBackToLastSection);
settingsBtn.addEventListener('click', showSettingsSection);

// Keep Data Toggle Handler
keepDataToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ keepDataAfterExport: keepDataToggle.checked });
});

// Debug functionality
const downloadDebugBtn = document.getElementById('downloadDebugBtn');

// Download Debug Log Handler
downloadDebugBtn.addEventListener('click', async () => {
    try {
        const { debugLog } = await chrome.storage.local.get('debugLog');
        
        if (!debugLog || debugLog.trim() === '') {
            alert('No debug log data available to download.');
            return;
        }
        
        // Create filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `debug-log-${timestamp}.txt`;
        
        // Create and download the file
        const blob = new Blob([debugLog], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show success message
        const originalText = downloadDebugBtn.textContent;
        downloadDebugBtn.textContent = 'Downloaded!';
        setTimeout(() => {
            downloadDebugBtn.textContent = originalText;
        }, 2000);
    } catch (error) {
        console.error('Error downloading debug log:', error);
        alert('Error downloading debug log. Please try again.');
    }
});

