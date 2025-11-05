const settingsSection = document.getElementById('settingsSection');
const footerBtns = document.getElementById('footerBtns');
const guideSection = document.getElementById('guideSection');
const paymentSection = document.getElementById('paymentSection');
const finalSection = document.getElementById('finalSection');
const detailSection = document.getElementById('detailSection');
const fieldSection = document.getElementById('fieldSection');
const exportSection = document.getElementById('exportSection');
const loginBtn = document.getElementById('loginBtn');
const loginSection = document.getElementById('loginSection');
const scrapeSection = document.getElementById('scrapeSection');
const reloadSection = document.getElementById('reloadSection');
const reloadBtn = document.getElementById('reloadBtn');
const settingsBtn = document.getElementById('settingsBtn');
const reportBtn = document.getElementById('reportBtn');
const requestFeatureBtn = document.getElementById('requestFeatureBtn');
const brandingText = document.getElementById('brandingText');
const freeLimitDiv = document.getElementById('freeLimitDiv');
const headerText = document.getElementById('headerText');
const customizeFieldsBtn = document.getElementById('customizeFieldsBtn');
const loginText = document.getElementById('loginText');
const switchAuthBtn = document.getElementById('switchAuthBtn');
const switchAuthText = document.getElementById('switchAuthText');
const paymentBackBtn = document.getElementById('paymentBackBtn');
const membershipBtn = document.getElementById('membershipBtn');
const upgradeBtn = document.getElementById('upgradeBtn');
const paymentBtn = document.getElementById('paymentBtn');
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
forgotPasswordBtn.href = `${extensionInfo.backendUrl}/extension/${extensionInfo.id}/reset-password`;

const hideSections = () => {
    footerBtns.style.display = 'none';
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
}

const goToLastSection = [];
const pushToLastSection = (func) => {
    if (goToLastSection.length === 0 || 
        goToLastSection[goToLastSection.length - 1].toString().indexOf(func.toString()) === -1) {
        goToLastSection.push(func);
    }
}
const goBackToLastSection = () => {
    const lastSection = goToLastSection[goToLastSection.length - 2];
    goToLastSection.splice(-2, 2);
    if (lastSection) {
        lastSection();
    } else {
        window.close();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if(!extensionInfo.website) {
        brandingText.style.display = 'none';
    } else {
        if (extensionInfo.website.url) {
            brandingText.innerHTML = `Powered By <b><a href="${extensionInfo.website.url}" target="_blank">${extensionInfo.website.name}</a></b>`;
        } else {
            brandingText.innerHTML = `Powered By <b>${extensionInfo.website.name}</b>`;
        }
    }
});
