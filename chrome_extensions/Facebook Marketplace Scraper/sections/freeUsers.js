function handleFreeUserUI() {
    // Show promotion div and hide logo text for free users
    headerText.innerHTML = 'Get Unlimited Access for $9.99/month';
    membershipBtn.style.display = 'none';
    
    headerText.onclick = () => {
        showPaymentSection();
    };

    freeLimitDiv.style.display = 'block';
    // Add paid indicators to premium features
    if (customizeFieldsBtn) {
        // Ensure the paid indicator div exists
        const btnDiv = customizeFieldsBtn.closest('.actionBtnDiv');
        if (btnDiv && !btnDiv.querySelector('.paidDiv')) {
            const paidDiv = document.createElement('div');
            paidDiv.className = 'paidDiv';
            paidDiv.innerHTML = '<img src="images/ruby.svg" alt="Paid">';
            btnDiv.appendChild(paidDiv);
        }
    }

    // Add paid indicators to export formats
    const exportFormats = ['XLSX', 'XML', 'TXT'];
    exportFormats.forEach(format => {
        const exportBtn = document.getElementById(`export${format}Btn`);
        if (exportBtn) {
            exportBtn.classList.add('paid');
            exportBtn.onclick = () => {
                showPaymentSection();
            };

            // Ensure the paid indicator div exists
            const exportOption = exportBtn.closest('.exportOption');
            if (exportOption && !exportOption.querySelector('.paidDiv')) {
                const paidDiv = document.createElement('div');
                paidDiv.className = 'paidDiv';
                paidDiv.innerHTML = '<img src="images/ruby.svg" alt="Paid">';
                exportOption.appendChild(paidDiv);
            }
        }
    });
}


async function handleTrialUserUI() {
    // Show promotion div and hide logo text for free users
    headerText.innerHTML = 'Get Unlimited Access for $9.99/month';
    membershipBtn.style.display = 'none';
    
    headerText.onclick = () => {
        showPaymentSection();
    };
    await updateTrialCountdown();
}

async function updateTrialCountdown() {
    const headerText = document.getElementById('headerText');
    const { user } = await chrome.storage.local.get(['user']);

    if (!user?.freeTrialExpiry) {
        headerText.innerHTML = 'Get Unlimited Access for $9.99/month';
        return;
    }

    function formatTimeRemaining(expiryDate) {
        const now = new Date().getTime();
        const expiry = new Date(expiryDate).getTime();
        const timeLeft = expiry - now;
        
        if (timeLeft <= 0) {
            return 'Trial Expired';
        }

        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m ${seconds}s remaining`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s remaining`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s remaining`;
        } else {
            return `${seconds}s remaining`;
        }
    }

    function updateText() {
        const timeRemaining = formatTimeRemaining(user.freeTrialExpiry);
        headerText.innerHTML = `Free Trial - ${timeRemaining} - Upgrade Now`;
    }

    // Update immediately and then every second
    updateText();
    setInterval(updateText, 1000);
}
