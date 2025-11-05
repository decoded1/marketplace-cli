const showPaymentSection = async () => {
    // Get user data
    const { user } = await chrome.storage.local.get(['user']);
    
    // Update email and plan
    document.querySelector('.userInfoItemValue').textContent = user.email;
    document.querySelector('.userInfoItem:nth-child(2) .userInfoItemValue').textContent = user.status;
    
    // Show/hide membership button based on status
    membershipBtn.style.display = user.status === 'paid' ? 'block' : 'none';

    pushToLastSection(() => {
        showPaymentSection();
    });
    hideSections();
    paymentSection.style.display = 'flex';
}

paymentBackBtn.addEventListener('click', goBackToLastSection);
membershipBtn.addEventListener('click', async () => {
    const { jwt_token } = await chrome.storage.local.get(['jwt_token']);
    try {
        const response = await fetch(`${extensionInfo.backendUrl}/payment/manage-subscription`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwt_token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get manage subscription URL');
        }

        const { url } = await response.json();
        chrome.tabs.create({ url });
    } catch (error) {
        console.error('Failed to get manage subscription URL:', error);
    }
});
// Payment button opens payment page
paymentBtn.addEventListener('click', async () => {
    // Save original button content and show loading
    const originalContent = paymentBtn.innerHTML;
    paymentBtn.innerHTML = '<img src="images/white-loading.svg" class="loadingImg">';
    
    const { user, jwt_token } = await chrome.storage.local.get(['user', 'jwt_token']);
    
    try {
        const response = await fetch(`${extensionInfo.backendUrl}/payment/checkout`, {
                method: 'POST',
                headers: {
                'Authorization': `Bearer ${jwt_token}`
            }
        });

        if (!response.ok) {
            console.error('Payment checkout failed:', response);
            if (response.json) {
                const error = await response.json();
                console.error('Payment checkout error:', error);
            }
            throw new Error('Failed to get checkout URL');
        }

        const { url } = await response.json();
        await chrome.storage.local.remove(['user', 'lastLoginTime']);
        chrome.tabs.create({ url, active: true });
    } catch (error) {
        console.error('Payment checkout failed:', error);
        // Restore original button content if there was an error
        paymentBtn.innerHTML = originalContent;
    }
});