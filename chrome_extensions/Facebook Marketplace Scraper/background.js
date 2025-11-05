// Data processing functions moved from exportSection.js and content.js
const collectHeaders = (data) => {
    const headerSet = new Set();
    data.forEach(item => {
        Object.keys(item || {}).forEach(key => headerSet.add(key));
    });
    return Array.from(headerSet);
};

const escapeCSVValue = (value) => {
    if (value === null || value === undefined) {
        return '';
    }
    const str = String(value);
    if (/[",\n\r]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
};

const serializeToCSV = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
        return '';
    }
    const headers = collectHeaders(data);
    const rows = data.map(row => 
        headers.map(header => escapeCSVValue(row?.[header] ?? '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
};

const escapeHtml = (value) => {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const serializeToHTML = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
        return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Export</title></head><body><p>No data available.</p></body></html>';
    }
    const headers = collectHeaders(data);
    const headerRow = headers.map(h => `<th>${escapeHtml(h)}</th>`).join('');
    const bodyRows = data.map(row => {
        const cells = headers.map(header => `<td>${escapeHtml(row?.[header] ?? '')}</td>`).join('');
        return `<tr>${cells}</tr>`;
    }).join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Export</title><style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px;}</style></head><body><table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
};

const escapeXml = (value) => {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

const serializeToXML = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
        return '<?xml version="1.0" encoding="UTF-8"?>\n<items/>\n';
    }
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<items>\n';
    data.forEach(row => {
        xml += '  <item>\n';
        Object.entries(row || {}).forEach(([key, value]) => {
            xml += `    <field name="${escapeXml(key)}">${escapeXml(value)}</field>\n`;
        });
        xml += '  </item>\n';
    });
    xml += '</items>\n';
    return xml;
};

const serializeToTXT = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
        return '';
    }
    return data.map(row => {
        return Object.entries(row || {})
            .map(([key, value]) => `${key}: ${value ?? ''}`)
            .join('\t');
    }).join('\n');
};

const buildExportContent = (format, data) => {
    switch (format) {
        case 'csv':
            return { content: serializeToCSV(data), mime: 'text/csv', extension: 'csv' };
        case 'json':
            return { content: JSON.stringify(data, null, 2), mime: 'application/json', extension: 'json' };
        case 'rawjson':
            return { content: JSON.stringify(data, null, 2), mime: 'application/json', extension: 'json' };
        case 'html':
            return { content: serializeToHTML(data), mime: 'text/html', extension: 'html' };
        case 'xml':
            return { content: serializeToXML(data), mime: 'application/xml', extension: 'xml' };
        case 'txt':
            return { content: serializeToTXT(data), mime: 'text/plain', extension: 'txt' };
        case 'xlsx':
            // Provide HTML table content that Excel can open; saved with .xlsx extension
            return { content: serializeToHTML(data), mime: 'application/vnd.ms-excel', extension: 'xlsx' };
        default:
            // Fallback to CSV for unknown formats
            return { content: serializeToCSV(data), mime: 'text/csv', extension: format || 'csv' };
    }
};

const downloadContent = (content, mime, extension) => {
    return new Promise((resolve, reject) => {
        const blob = new Blob([content], { type: mime });
        const reader = new FileReader();
        reader.onload = (event) => {
            chrome.downloads.download({
                url: event.target.result,
                filename: `export_${Date.now()}.${extension}`,
                saveAs: true
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (!downloadId) {
                    reject(new Error('Download could not be initiated.'));
                } else {
                    resolve(true);
                }
            });
        };
        reader.onerror = () => reject(new Error('Failed to read data for download.'));
        reader.readAsDataURL(blob);
    });
};

const sendToWebhook = async (url, content, mime, metaData) => {
    const headers = { 'Content-Type': mime };
    if (metaData) {
        headers['X-Export-Metadata'] = JSON.stringify(metaData);
    }
    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: content
    });
    if (!response.ok) {
        let errorBody = 'unknown error';
        try {
            errorBody = await response.text();
        } catch (e) { /* ignore */ }
        throw new Error(`Webhook request failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }
};

const processDataForExport = async () => {
    try {
        const storage = await chrome.storage.local.get([
            'extractedData', 
            'excludedFields', 
            'selectedScraper', 
            'fieldOrder', 
            'fieldRenames'
        ]);
        
        let { 
            extractedData = `[]`, 
            excludedFields = {}, 
            selectedScraper, 
            fieldOrder = {}, 
            fieldRenames = {} 
        } = storage;

        extractedData = JSON.parse(extractedData);

        // Get customization settings for the current scraper
        const currentScraperExcluded = excludedFields[selectedScraper] || [];
        const currentScraperOrder = fieldOrder[selectedScraper];
        const currentScraperRenames = fieldRenames[selectedScraper] || {};

        return extractedData
            .filter(item => item.checkedForExport)
            .map(item => {
                const processedItem = {};
                const originalFields = Object.keys(item).filter(key => key !== 'checkedForExport');

                // Determine field order
                let orderedFields;
                if (currentScraperOrder) {
                    orderedFields = [...new Set([...currentScraperOrder, ...originalFields])];
                    orderedFields = orderedFields.filter(field => originalFields.includes(field));
                } else {
                    orderedFields = originalFields;
                }
                
                // Ensure 'id' is always first if it exists
                if (orderedFields.includes('id')) {
                    orderedFields = orderedFields.filter(field => field !== 'id');
                    orderedFields.unshift('id');
                }

                // Build the new object with renames, exclusions, and order
                orderedFields.forEach(originalField => {
                    if (currentScraperExcluded.includes(originalField)) {
                        return; // Skip excluded
                    }
                    const displayName = currentScraperRenames[originalField] || originalField;
                    processedItem[displayName] = item[originalField];
                });

                return processedItem;
            });
    } catch (error) {
        console.error('Error processing data for export:', error);
        return [];
    }
};

const processRawDataForExport = async () => {
    try {
        const { exportedRawData = `[]` } = await chrome.storage.local.get(['exportedRawData']);
        return JSON.parse(exportedRawData);
    } catch (error) {
        console.error('Error processing raw data for export:', error);
        return [];
    }
};

const getExportStats = async () => {
    try {
        const storage = await chrome.storage.local.get([
            'user', 
            'extractedData'
        ]);

        let { 
            user = { status: 'paid' },
            extractedData = `[]`
        } = storage;

        extractedData = JSON.parse(extractedData);

        const checkedCount = extractedData.filter(item => item.checkedForExport).length;
        const normalizedUser = { ...user, status: 'paid' };
        await chrome.storage.local.set({ user: normalizedUser });

        return { 
            user: normalizedUser,
            daily_exports: 0,
            exportable_rows: checkedCount,
            total_rows: checkedCount
        };
    } catch (error) {
        console.error('Error getting export stats:', error);
        return {
            user: { status: 'paid' },
            daily_exports: 0,
            exportable_rows: 0,
            total_rows: 0
        };
    }
};

const updateExportStats = async (user) => {
    try {
        const { user: storedUser = {} } = await chrome.storage.local.get(['user']);
        const normalizedUser = {
            ...storedUser,
            ...user,
            status: 'paid'
        };

        const newTotalExports = (normalizedUser.export?.totalCount || 0) + 1;
        normalizedUser.export = { ...normalizedUser.export, totalCount: newTotalExports };

        await chrome.storage.local.set({ user: normalizedUser });

        return newTotalExports;
    } catch (error) {
        console.error('Error updating export stats:', error);
        return 0;
    }
};

const handlePostExportCleanup = async () => {
    try {
        const { keepDataAfterExport } = await chrome.storage.local.get(['keepDataAfterExport']);
        
        if (!keepDataAfterExport) {
            await chrome.storage.local.remove(['selectedScraper', 'extractedData', 'exportedRawData']);
            return { shouldNavigateToScrape: true };
        } else {
            return { shouldNavigateToFinal: true };
        }
    } catch (error) {
        console.error('Error handling post-export cleanup:', error);
        return { shouldNavigateToFinal: true };
    }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'download') {
        chrome.downloads.download({
            url: message.url,
            filename: message.filename,
            saveAs: true
        }, (downloadId) => {
            if (downloadId) {
                
            } else {
                 console.error("Download failed:", chrome.runtime.lastError?.message || "Unknown error");
            }
        });
    } else if (message.action === 'exportDataFormat') {
        const { format, data, backendUrl, metaData } = message;
        if (!format || !data || !backendUrl) {
            console.error("exportDataFormat message missing required parameters (format, data, backendUrl).");
            sendResponse({ status: 'error', error: 'Missing parameters' });
            return true;
        }

        (async () => {
            let jwt_token, webhookUrl, webhookEnabled;
            try {
                const storage = await chrome.storage.local.get(['jwt_token', 'webhookUrl', 'webhookEnabled']);
                jwt_token = storage.jwt_token;
                webhookUrl = storage.webhookUrl;
                webhookEnabled = storage.webhookEnabled;

                if (!jwt_token) {
                     throw new Error("JWT token not found in storage.");
                }

            } catch (storageError) {
                console.error("Error fetching data from storage:", storageError);
                sendResponse({ status: 'error', error: `Storage error: ${storageError.message}` });
                return;
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwt_token}`
            };
            const useWebhook = webhookEnabled && webhookUrl;
            if (useWebhook) {
                headers['Webhook-Url'] = webhookUrl;
                if (metaData) {
                    try {
                        headers['Webhook-Metadata'] = JSON.stringify(metaData);
                    } catch (stringifyError) {
                        console.error("Error stringifying metadata for webhook:", stringifyError);
                    }
                }
            }

            const timeout = Math.max(5000, Math.min(data.length / 2, 90000));

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(`${backendUrl}/export/${format}`, {
                    method: 'POST',
                    headers: headers,
                    body: data,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    let errorBody = 'unknown error';
                    try {
                        errorBody = await response.text();
                    } catch (e) { /* ignore */ }
                    throw new Error(`Backend export failed: ${response.status} ${response.statusText} - ${errorBody}`);
                }

                if (useWebhook) {
                    sendResponse({ status: 'success' });
                } else {
                    const blob = await response.blob();
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const downloadUrl = event.target.result;
                        chrome.downloads.download({
                            url: downloadUrl,
                            filename: `export_${Date.now()}.${format}`,
                            saveAs: true
                        }, (downloadId) => {
                            if (chrome.runtime.lastError) {
                                console.error("Download failed:", chrome.runtime.lastError.message);
                                sendResponse({ status: 'error', error: `Download failed: ${chrome.runtime.lastError.message}` });
                            } else if (downloadId) {
                                sendResponse({ status: 'success' });
                            } else {
                                console.error("Download failed: No download ID received.");
                                sendResponse({ status: 'error', error: 'Download could not be initiated.' });
                            }
                        });
                    };
                    reader.onerror = (error) => {
                        console.error("Error reading blob for download:", error);
                        sendResponse({ status: 'error', error: 'Failed to read data for download.' });
                    };
                    reader.readAsDataURL(blob);
                }

            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    sendResponse({ status: 'timeout' });
                } else {
                    console.error(`Error during export fetch for ${format}:`, error);
                    sendResponse({ status: 'error', error: error.message });
                }
            }
        })();

        return true;

    } else if (message.action === 'trackRawJsonExport') {
        sendResponse({ success: true });
        return true;

    } else if (message.action === 'trackFallbackExport') {
        sendResponse({ success: true });
        return true;

    } else if (message.action === 'downloadCsvFallback') {
        const { csvContent } = message;
        if (typeof csvContent !== 'string') {
            console.error("downloadCsvFallback message missing or invalid csvContent.");
            sendResponse({ success: false, error: "Missing or invalid csvContent" });
            return true;
        }

        (async () => {
            try {
                const { webhookEnabled, webhookUrl } = await chrome.storage.local.get(['webhookEnabled', 'webhookUrl']);
                if (webhookEnabled && webhookUrl) {
                    await sendToWebhook(webhookUrl, csvContent, 'text/csv');
                    sendResponse({ success: true });
                    return;
                }

                await downloadContent(csvContent, 'text/csv', 'csv');
                sendResponse({ success: true });
            } catch (error) {
                console.error("Error during CSV fallback processing:", error);
                sendResponse({ success: false, error: error.message });
            }
        })();

        return true;

    } else if (message.action === 'initiateExport') {
        const { format, extensionInfo, scraperId } = message;
        
        if (!format || !extensionInfo) {
            console.error("initiateExport message missing required parameters (format, extensionInfo).");
            sendResponse({ status: 'error', error: 'Missing parameters' });
            return true;
        }

        (async () => {
            try {
                const stats = await getExportStats();
                const { webhookEnabled, webhookUrl } = await chrome.storage.local.get(['webhookEnabled', 'webhookUrl']);
                const isWebhookExport = Boolean(webhookEnabled && webhookUrl && format !== 'rawjson');

                const selectedData = format === 'rawjson'
                    ? await processRawDataForExport()
                    : await processDataForExport();

                if (!selectedData || selectedData.length === 0) {
                    sendResponse({ status: 'error', error: 'No data selected for export.' });
                    return;
                }

                const normalizedUser = { ...stats.user, status: 'paid' };
                const exportedAt = Date.now();
                const metaData = {
                    exported_at: exportedAt,
                    scraper_id: extensionInfo.id,
                    scraping_option_id: scraperId,
                    totalData: selectedData.length,
                    format
                };

                const payload = buildExportContent(format, selectedData);

                if (!payload || typeof payload.content !== 'string') {
                    sendResponse({ status: 'error', error: 'Unsupported export format.' });
                    return;
                }

                try {
                    if (isWebhookExport) {
                        await sendToWebhook(webhookUrl, payload.content, payload.mime, metaData);
                    } else {
                        await downloadContent(payload.content, payload.mime, payload.extension);
                    }
                } catch (exportError) {
                    console.error('Error delivering export data:', exportError);
                    sendResponse({ status: 'error', error: exportError.message });
                    return;
                }

                const newTotalExports = await updateExportStats(normalizedUser);
                const cleanupResult = await handlePostExportCleanup();

                sendResponse({ 
                    status: 'success', 
                    isWebhook: isWebhookExport,
                    totalExports: newTotalExports,
                    ...cleanupResult
                });
            } catch (error) {
                console.error('Error during export initiation:', error);
                sendResponse({ status: 'error', error: error.message });
            }
        })();

        return true;

    } else if (message.action === 'getExportStats') {
        (async () => {
            try {
                const stats = await getExportStats();
                sendResponse({ status: 'success', stats });
            } catch (error) {
                console.error('Error getting export stats:', error);
                sendResponse({ status: 'error', error: error.message });
            }
        })();
        return true;
    }

    return false;
});
