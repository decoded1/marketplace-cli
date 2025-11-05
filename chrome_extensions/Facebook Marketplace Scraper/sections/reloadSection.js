const showReloadSection = () => {
    hideSections();
    reloadSection.style.display = 'flex';
};

reloadBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
        chrome.tabs.reload(tab.id);
        window.close();
    }
});