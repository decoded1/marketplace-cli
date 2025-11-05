const showFinalSection = async (extractedData = []) => {
    pushToLastSection(() => {
        showFinalSection(extractedData);
    });
    hideSections();
    finalSection.style.display = 'flex';
    const rowsDivBody = document.getElementById('rowsDivBody');
    while (rowsDivBody.firstChild) {
        rowsDivBody.removeChild(rowsDivBody.firstChild);
    }

    let data = extractedData;
    if (extractedData.length == 0) {
        const result = await chrome.storage.local.get(['extractedData']);
        if (result.extractedData) {
            result.extractedData = JSON.parse(result.extractedData)
            data = result.extractedData
        }
    }
    const { selectedScraper } = await chrome.storage.local.get(['selectedScraper']);
    let visibleField = window.scrapers[selectedScraper].visibleField;
    data.forEach(item => {

        const rowDiv = document.createElement('div');
        rowDiv.className = 'rowDiv';
        rowDiv.dataset.item = JSON.stringify(item);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'rowCheckbox';
        checkbox.checked = item.checkedForExport;

        checkbox.addEventListener('change', async () => {
            const itemData = JSON.parse(rowDiv.dataset.item);
            itemData.checkedForExport = checkbox.checked;
            rowDiv.dataset.item = JSON.stringify(itemData);

            const result = await chrome.storage.local.get(['extractedData']);
            let extractedData = JSON.parse(result.extractedData);
            
            extractedData = extractedData.map(item => 
                item.id === itemData.id 
                    ? { ...item, checkedForExport: checkbox.checked }
                    : item
            );

            await chrome.storage.local.set({ extractedData: JSON.stringify(extractedData) });
        });

        rowDiv.appendChild(checkbox);
        const rowText = document.createElement('span');
        rowText.className = 'rowText';
        rowText.textContent = item[visibleField];
        rowDiv.appendChild(rowText);

        rowDiv.onclick = (e) => {
            if (e.target !== checkbox) {
                showDetailsSection(item);
            }
        };
        rowsDivBody.appendChild(rowDiv);
    });


/*     const selectBtn = document.getElementById('selectBtn');


    const updateSelectButtonText = () => {
        const checkboxes = document.querySelectorAll('.rowCheckbox');
        const isAllChecked = Array.from(checkboxes).every(cb => cb.checked);
        selectBtn.textContent = isAllChecked ? 'Deselect All' : 'Select All';
    };


    updateSelectButtonText(); */

/*     selectBtn.onclick = () => {
        const checkboxes = document.querySelectorAll('.rowCheckbox');
        const isAllChecked = Array.from(checkboxes).every(cb => cb.checked);

        checkboxes.forEach(checkbox => {
            checkbox.checked = !isAllChecked;

            checkbox.dispatchEvent(new Event('change'));
        });

        updateSelectButtonText();
    }; */


    const searchInput = document.getElementById('searchInput');
    searchInput.oninput = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const rows = document.querySelectorAll('.rowDiv');

        rows.forEach(row => {
            const text = row.querySelector('.rowText').textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? 'flex' : 'none';
        });
    };
}

document.getElementById('cancelBtn').onclick = async () => {
    const cancelBtn = document.getElementById('cancelBtn');
    
    if (cancelBtn.textContent === 'Are you sure?') {
        // Clear all storage data
        await chrome.storage.local.remove(['selectedScraper', 'extractedData', 'exportedRawData']);
        
        // Send message to content script to clear scraped data
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "cancelExtraction"});
        });
        
        await showScrapeSection();
    } else {
        cancelBtn.textContent = 'Are you sure?';
        setTimeout(() => {
            cancelBtn.textContent = 'Clear Export List';
        }, 3000);
    }
};

