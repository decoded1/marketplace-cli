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
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    if (!validateEmail(email)) {
        showError('Please enter a valid email');
        return;
    }
    
    if (!validatePassword(password)) {
        showError('Password must be 8+ characters');
        return;
    }

    // Save original button content and show loading
    const originalContent = loginBtn.innerHTML;
    loginBtn.innerHTML = '<img src="images/white-loading.svg" class="loadingImg">';
    
    try {
        const endpoint = isLoginMode ? 'login' : 'signup';
        const backendResponse = await fetch(`${extensionInfo.backendUrl}/user/${endpoint}/${extensionInfo.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });
        const backendData = await backendResponse.json();
        if (!backendResponse.ok) {
            showError(backendData.error);
            loginBtn.innerHTML = originalContent;
        }
        
        if(backendData.success){
            // Store JWT token and user status
            await chrome.storage.local.set({ 
                jwt_token: backendData.token,
                user: backendData.user,
                lastLoginTime: Date.now()
            });
            await prepareMain();
        }
    } catch (error) {
        console.error('Authentication failed:', error);
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
        const storage = await chrome.storage.local.get(['jwt_token', 'user', 'lastLoginTime']);
        
        // Check if we have a recent user (within last 120 minutes)
        const now = Date.now();
        if (storage.user && storage.lastLoginTime && 
            (now - storage.lastLoginTime < 120 * 60 * 1000)) {
            
            // Add status check even for recent users
            if (storage.jwt_token) {
                try {
                    fetch(`${extensionInfo.backendUrl}/user/check-user`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${storage.jwt_token}`
                        }
                    })
                    .then(statusResponse => {
                        if (statusResponse.ok) {
                            return statusResponse.json();
                        }
                    })
                    .then(statusData => {
                        if (statusData?.user && statusData.user.status !== storage.user.status) {
                            // Update user data if status has changed
                            chrome.storage.local.set({
                                user: statusData.user,
                                lastLoginTime: Date.now()
                            });
                            window.close();
                        }
                    })
                    .catch(error => {
                        console.error('Status check failed:', error);
                    });
                } catch (error) {
                    console.error('Status check failed:', error);
                }
            }
            
            await prepareMain();
            return true;
        }

        if (storage.jwt_token) {
            const validateResponse = await fetch(`${extensionInfo.backendUrl}/user/validate-token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${storage.jwt_token}`
                }
            });
            
            if (validateResponse.ok) {
                const validationData = await validateResponse.json();
                if (validationData.success) {
                    // Store the updated user data and timestamp
                    await chrome.storage.local.set({
                        user: validationData.user,
                        lastLoginTime: Date.now()
                    });
                    await prepareMain();
                    return true;
                }
            }
            // If validation fails, clear stored token and user
            await chrome.storage.local.remove(['jwt_token', 'user', 'lastLoginTime', 'extractedData', 'selectedScraper', 'exportedRawData']);
        }
        loginBtn.innerHTML = originalContent;
        return false;
    } catch (error) {
        console.error('Token validation failed:', error);
        loginBtn.innerHTML = originalContent;
        return false;
    }
};

// Keep the existing showLoginSection function
const showLoginSection = async () => {
    const isValid = await validateExistingToken();
    if (!isValid) {
        hideSections();
        loginSection.style.display = 'flex';
    }
}