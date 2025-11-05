// Function to show popups based on user actions
const showPopupIfNeeded = async () => {
    const { 
        user = { status: 'free' },
        has_seen_trial_popup = false,
        has_seen_review_popup = false
    } = await chrome.storage.local.get(['user', 'has_seen_trial_popup', 'has_seen_review_popup']);

    // Only show popups for free users
    // Show free trial popup after 2 exports if not dismissed (DISABLED - COMMENTED OUT)
    // if (user.export.totalCount >= 2 && !has_seen_trial_popup && user.status === 'free') {
    //     document.getElementById('freeTrialPopup').style.display = 'flex';
    // }
    
    // Show review popup after 5 exports if not dismissed
    if (user.export.totalCount >= 5 && !has_seen_review_popup) {
        document.getElementById('reviewPopup').style.display = 'flex';
    }
};

// Add event listeners for popup buttons (DISABLED - COMMENTED OUT)
// document.getElementById('startFreeTrialBtn').addEventListener('click', async () => {
//     const { jwt_token } = await chrome.storage.local.get(['jwt_token']);
//     try {
//         const response = await fetch(`${extensionInfo.backendUrl}/user/start-trial`, {
//             method: 'POST',
//             headers: {
//                 'Authorization': `Bearer ${jwt_token}`
//             }
//         });
//         
//         if (response.ok) {
//             const data = await response.json();
//             await chrome.storage.local.set({ 
//                 user: data.user,
//                 has_seen_trial_popup: true
//             });
//             document.getElementById('freeTrialPopup').style.display = 'none';
//             window.close();
//         }
//     } catch (error) {
//         console.error('Failed to start trial:', error);
//     }
// });
// 
// document.getElementById('skipFreeTrialBtn').addEventListener('click', async () => {
//     await chrome.storage.local.set({ has_seen_trial_popup: true });
//     document.getElementById('freeTrialPopup').style.display = 'none';
// });

document.getElementById('rateExtensionBtn').addEventListener('click', async () => {
    await chrome.storage.local.set({ has_seen_review_popup: true });
    document.getElementById('reviewPopup').style.display = 'none';
    const userAgent = navigator.userAgent.toLowerCase();
    let browser = 'chrome';
    if (userAgent.includes('edg/')) {
        browser = 'edge';
    } else if (userAgent.includes('firefox/')) {
        browser = 'firefox';
    } else if (userAgent.includes('opr/')) {
        browser = 'opera';
    } else if (userAgent.includes('chrome/')) {
        browser = 'chrome';
    } else {
        browser = 'chrome';
    }

    chrome.tabs.create({ url: `${extensionInfo.backendUrl}/extension/${extensionInfo.id}/reviews?browser=${browser}` });
});

document.getElementById('skipReviewBtn').addEventListener('click', async () => {
    await chrome.storage.local.set({ has_seen_review_popup: true });
    document.getElementById('reviewPopup').style.display = 'none';
});

// Export the function to be used in other files
window.showPopupIfNeeded = showPopupIfNeeded;