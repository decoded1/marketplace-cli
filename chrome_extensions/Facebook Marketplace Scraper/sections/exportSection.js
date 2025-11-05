const exportBtn = document.getElementById('exportBtn');
const exportBackBtn = document.getElementById('exportBackBtn');
const exportBtns = document.querySelectorAll('.exportBtn');
const exportWebhookToggle = document.getElementById('exportWebhookToggle');
const webhookToggleContainer = document.getElementById('webhookToggleContainer');

const showExportSection = async () => {
    pushToLastSection(() => {
        showExportSection();
    });
    hideSections();
    exportSection.style.display = "flex";
    
    // Get export stats from background
    const response = await chrome.runtime.sendMessage({ action: 'getExportStats' });
    if (response?.status !== 'success') {
        console.error('Failed to get export stats:', response?.error);
        return;
    }
    
    const stats = response.stats;
    
    // Check for webhook URL and show toggle if present
    const { webhookUrl, webhookEnabled } = await chrome.storage.local.get(['webhookUrl', 'webhookEnabled']);
    if (webhookUrl) {
        webhookToggleContainer.style.display = 'block';
        exportWebhookToggle.checked = webhookEnabled;
    } else {
        webhookToggleContainer.style.display = 'none';
    }
    
    // Update export limit info
    const exportLimitDiv = document.getElementById('exportLimitInfo');
    exportLimitDiv.style.display = 'none';

    // Update button texts and visibility based on user status
    const updateButtonText = (btnId, format) => {
        const btn = document.getElementById(btnId);
        btn.textContent = `Export as ${format} (${stats.total_rows})`;
        btn.disabled = false;
        btn.title = '';
        btn.style.display = 'block';
    };

    updateButtonText('exportCSVBtn', 'CSV');
    updateButtonText('exportJSONBtn', 'JSON');
    updateButtonText('exportXLSXBtn', 'XLSX');
    updateButtonText('exportXMLBtn', 'XML');
    updateButtonText('exportTXTBtn', 'TXT');
    updateButtonText('exportHTMLBtn', 'HTML');
    updateButtonText('exportRAWJSONBtn', 'RAW JSON');
}

exportBtn.onclick = () => {
    showExportSection();
}
exportBackBtn.onclick = () => {
    showFinalSection();
}

const exportData = async (format) => {
    const buttonId = `export${format.toUpperCase()}Btn`;
    const exportButton = document.getElementById(buttonId);
    const originalContent = exportButton.innerHTML;

    // Fetch webhook settings locally to determine UI behavior (loading indicator)
    const { webhookEnabled, webhookUrl, selectedScraper } = await chrome.storage.local.get(['webhookEnabled', 'webhookUrl', 'selectedScraper']);
    const isWebhookExport = webhookEnabled && webhookUrl && format !== 'rawjson';

    // Show loading indicator only if it's NOT a webhook export
    if (!isWebhookExport && format !== 'rawjson') {
        exportButton.innerHTML = '<img src="images/white-loading.svg" class="loadingImg" />';
    } else if (isWebhookExport) {
        exportButton.innerHTML = 'Sending...';
    } else if (format === 'rawjson' && !isWebhookExport) {
        exportButton.innerHTML = '<img src="images/white-loading.svg" class="loadingImg" />';
    }

    try {
        // Send export request to background script
        const response = await chrome.runtime.sendMessage({
            action: 'initiateExport',
            format: format,
            extensionInfo: extensionInfo,
            scraperId: selectedScraper
        });

        if (!response) {
            console.error('No response from background script');
            exportButton.innerHTML = originalContent;
            return;
        }

        if (response.status === 'limitReached') {
            // Redirect to payment section if daily limit reached or premium format
            if (response.limitType === 'daily' || response.limitType === 'premium') {
                showPaymentSection();
                return;
            }
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

            // Handle post-export actions based on background script response
            if (response.totalExports === 5) {
                const { has_seen_review_popup = false } = await chrome.storage.local.get(['has_seen_review_popup']);
                if (!has_seen_review_popup) {
                    document.getElementById('reviewPopup').style.display = 'flex';
                }
            }

            // Navigate based on cleanup result
            if (response.shouldNavigateToScrape) {
                await showScrapeSection();
            } else if (response.shouldNavigateToFinal) {
                await showFinalSection();
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

document.getElementById('exportCSVBtn').onclick = () => exportData('csv');
document.getElementById('exportJSONBtn').onclick = () => exportData('json');
document.getElementById('exportXLSXBtn').onclick = () => exportData('xlsx');
document.getElementById('exportXMLBtn').onclick = () => exportData('xml');
document.getElementById('exportTXTBtn').onclick = () => exportData('txt');
document.getElementById('exportHTMLBtn').onclick = () => exportData('html');
document.getElementById('exportRAWJSONBtn').onclick = () => exportData('rawjson');

// Add webhook toggle handler
exportWebhookToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ webhookEnabled: exportWebhookToggle.checked });
});
