const showScrapeSection = async (doChecks = true) => {
    pushToLastSection(() => {
        showScrapeSection(doChecks);
    });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    if (!extensionInfo.domains.some(domain => tab.url.includes(domain))) {
        Object.keys(scrapers).forEach(id => {
            scrapers[id].check = false;
        });
        doChecks = false;
    }

    hideSections();
    footerBtns.style.display = 'flex';
    if (doChecks) {
        const getScraperChecks = async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return null;

            try {
                return await chrome.tabs.sendMessage(tab.id, { action: "checkScrapers" });
            } catch (error) {
                console.error('Error getting scraper checks:', error);
                return null;
            }
        };
        const checks = await getScraperChecks();
        if (checks) {
            Object.entries(checks).forEach(([id, checkResult]) => {
                if (scrapers[id]) {
                    scrapers[id].check = checkResult;
                }
            });
        }
    }
    scrapeSection.style.display = 'flex';
    while (scrapeSection.firstChild) {
        scrapeSection.removeChild(scrapeSection.firstChild);
    }

    const sortedScrapers = Object.values(scrapers).sort((a, b) => {
        if (a.check && !b.check) return -1;
        if (!a.check && b.check) return 1;
        return 0;
    });

    const tutorialDiv = document.createElement('div');
    tutorialDiv.className = 'scrapeDiv tutorialDiv';
    const tutorialLink = document.createElement('a');
    tutorialLink.href = `${extensionInfo.backendUrl}/extension/${extensionInfo.id}/tutorial`;
    tutorialLink.target = '_blank';
    tutorialLink.textContent = 'How to use this extension?';
    tutorialDiv.appendChild(tutorialLink);
    scrapeSection.appendChild(tutorialDiv);

    sortedScrapers.forEach(scraper => {
        const scrapeDiv = document.createElement('div');
        scrapeDiv.className = 'scrapeDiv';

        const scrapeButton = document.createElement('button');
        scrapeButton.className = 'scrapeBtn';
        scrapeButton.onclick = async () => {
            const scraperId = scraper.id;


            window.close();


            chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
                if (!tab) return;

                chrome.tabs.sendMessage(tab.id, {
                    action: "startMonitoring",
                    scraperId
                })
            });
        };
        scrapeButton.textContent = scraper.name;
        scrapeButton.dataset.scraperId = scraper.id;
        scrapeDiv.appendChild(scrapeButton);

        if (!scraper.check) {
            scrapeDiv.className = 'scrapeDiv unavailable';
            scrapeButton.disabled = true;

            const guideButton = document.createElement('button');
            guideButton.className = 'guideBtn';
            guideButton.textContent = '?';
            guideButton.dataset.scraperId = scraper.id;

            guideButton.onclick = () => {
                showGuideSection(scraper.guideQuestion, scraper.guide);
            }

            scrapeDiv.appendChild(guideButton);
        }

        scrapeSection.appendChild(scrapeDiv);
    });
    checkMaintenanceStatus();
}

const checkMaintenanceStatus = () => {
    fetch(`${extensionInfo.backendUrl}/extension/${extensionInfo.id}/maintenance-status`)
        .then(maintenanceResponse => maintenanceResponse.json())
        .then(maintenanceData => {
            const maintenanceScrapers = maintenanceData.maintenance || [];

            // Update buttons for scrapers in maintenance
            maintenanceScrapers.forEach(scraperId => {
                const button = document.querySelector(`button[data-scraper-id="${scraperId}"]`);
                if (button) {
                    button.textContent = `${button.textContent} (Maintenance)`;
                    button.classList.add('maintenance');
                    button.disabled = true;
                }
            });
        })
        .catch(error => {
            console.error('Error fetching maintenance status:', error);
        });
};