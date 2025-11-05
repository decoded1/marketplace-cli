let isLoginMode = true;

const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePassword = (password) => {
    return password.length >= 8;
};

const showError = (message) => {
    const originalText = loginText.textContent;
    const originalColor = loginText.style.color;
    
    loginText.textContent = message;
    loginText.style.color = '#ff4444';  // Red color for error
    loginText.style.fontSize = '20px';
    
    // Reset after 3 seconds
    setTimeout(() => {
        loginText.textContent = originalText;
        loginText.style.color = originalColor;
        loginText.style.fontSize = '24px';
    }, 3000);
};

const handleAuth = async () => {
    const originalContent = loginBtn.innerHTML;
    loginBtn.innerHTML = '<img src="images/white-loading.svg" class="loadingImg">';

    try {
        const { user: storedUser = {} } = await chrome.storage.local.get(['user']);
        const normalizedUser = { ...storedUser, status: 'paid' };
        await chrome.storage.local.set({
            jwt_token: 'offline-token',
            user: normalizedUser,
            lastLoginTime: Date.now()
        });
        await prepareMain();
    } catch (error) {
        console.error('Authentication shortcut failed:', error);
        loginBtn.innerHTML = originalContent;
    }
};
const switchAuthFunc = () => {
    isLoginMode = !isLoginMode;
    loginText.textContent = isLoginMode ? 'Login to your account' : 'Create an Account';
    loginBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
    switchAuthBtn.textContent = isLoginMode ? 'Sign up' : 'Login';
    switchAuthText.firstChild.textContent = isLoginMode ? 
        "Don't have an account? " : 
        "Already have an account? ";
}
switchAuthFunc();

switchAuthBtn.addEventListener('click', switchAuthFunc);

loginBtn.addEventListener('click', handleAuth);

// Keep the existing token validation function
const validateExistingToken = async () => {
    // Save original button content and show loading
    const originalContent = loginBtn.innerHTML;
    loginBtn.innerHTML = '<img src="images/white-loading.svg" class="loadingImg">';

    try {
        const { user: storedUser = {} } = await chrome.storage.local.get(['user']);
        const normalizedUser = { ...storedUser, status: 'paid' };
        await chrome.storage.local.set({
            jwt_token: 'offline-token',
            user: normalizedUser,
            lastLoginTime: Date.now()
        });
        await prepareMain();
        return true;
    } catch (error) {
        console.error('Token validation failed:', error);
        loginBtn.innerHTML = originalContent;
        return false;
    }
};
};

// Keep the existing showLoginSection function
const showLoginSection = async () => {
    const isValid = await validateExistingToken();
    if (!isValid) {
        hideSections();
        loginSection.style.display = 'flex';
    }
}
