const detailsBackBtn = document.getElementById('detailsBackBtn');

const showDetailsSection = async (item) => {
    pushToLastSection(() => {
        showDetailsSection(item);
    });
    hideSections();
    detailSection.style.display = 'flex';
    const detailsText = document.getElementById('detailsText');

    const { selectedScraper } = await chrome.storage.local.get(['selectedScraper']);
    const visibleField = window.scrapers[selectedScraper].visibleField;
    detailsText.textContent = item[visibleField];


    detailsBackBtn.onclick = async () => {
        await showFinalSection();
    };


    const detailsBody = document.getElementById('detailsBody');
    detailsBody.innerHTML = '';

    Object.entries(item).forEach(([key, value]) => {
        if (key == "checkedForExport") {
            return;
        }
        const detailDiv = document.createElement('div');
        detailDiv.className = 'detailDiv';

        const detailField = document.createElement('div');
        detailField.className = 'detailField';
        detailField.textContent = key;
        detailDiv.appendChild(detailField);

        const detailValue = document.createElement('div');
        detailValue.className = 'detailValue';
        if (typeof value == "string" && value.startsWith("http")) {
            detailValue.innerHTML = `<a href="${value}" target="_blank" style="color: #BAC0CE; text-decoration: underline;">${value}</a>`;
        } else {
            detailValue.textContent = value;
        }
        detailDiv.appendChild(detailValue);

        detailsBody.appendChild(detailDiv);
    });
};