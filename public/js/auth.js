// js/auth.js
import * as api from './api.js';

// Helper to get user info from localStorage
const getUserInfo = () => {
    try {
        return JSON.parse(localStorage.getItem('userInfo'));
    } catch (e) {
        return null;
    }
};

// Helper to format currency
const formatCurrency = (amount) => `N$${amount.toFixed(2)}`;

// Get the authentication token from localStorage
export const getToken = () => {
    const userInfo = getUserInfo();
    return userInfo ? userInfo.token : null;
};

// Checks if a user is logged in
export const isLoggedIn = () => {
    return !!getUserInfo();
};

// Checks if the logged-in user is an administrator
export const isAdmin = () => {
    const userInfo = getUserInfo();
    return userInfo && userInfo.isAdmin === true;
};

// Attempts to log the user in via API
export const login = async (email, password) => {
    try {
        // Try session-based login first
        const res = await api.sessionLogin(email, password);
        const userInfo = res.user || res; // session endpoint returns { user }
        // store minimal user info to indicate logged-in state
        localStorage.setItem('userInfo', JSON.stringify({ ...userInfo, token: null }));
        updateAuthUI();
        return userInfo; // Return user info on success
    } catch (error) {
        console.error('Login failed:', error);
        alert(error.message || 'Login failed. Please check your credentials.');
        return null;
    }
};

// Attempts to register a new user via API
export const register = async (name, email, password) => {
    try {
        const res = await api.sessionSignup(name, email, password);
        const userInfo = res.user || res;
        localStorage.setItem('userInfo', JSON.stringify({ ...userInfo, token: null }));
        updateAuthUI();
        return true; // Return true on success
    } catch (error) {
        console.error('Registration failed:', error);
        alert(error.message || 'Registration failed. Please try again.');
        return false;
    }
};

// Logs the user out
export const logout = () => {
    try { api.sessionLogout().catch(()=>{}); } catch(e){}
    localStorage.removeItem('userInfo');
    updateAuthUI();
    location.hash = '#home'; // Redirect to home
};

// Updates the UI (login/register/logout links) based on auth state
export const updateAuthUI = async () => {
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');
    const logoutLink = document.getElementById('logout-link');
    const balanceDisplay = document.getElementById('account-balance');
    const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');

    if (!loginLink || !registerLink || !logoutLink || !balanceDisplay) {
        return;
    }

    if (isLoggedIn()) {
        loginLink.classList.add('hidden');
        registerLink.classList.add('hidden');
        logoutLink.classList.remove('hidden');
        balanceDisplay.classList.remove('hidden');
        
        // Fetch and display gift card balance
        try {
            const balanceData = await api.fetchGiftCardBalance();
            const balanceSpan = balanceDisplay.querySelector('span');
            balanceSpan.textContent = `Balance: ${formatCurrency(balanceData.balance || 0)}`;
        } catch (error) {
            console.error('Failed to fetch gift card balance:', error);
            const balanceSpan = balanceDisplay.querySelector('span');
            balanceSpan.textContent = 'Balance: N$0.00';
        }

        addToCartBtns.forEach(btn => {
            btn.classList.add('visible');
        });
    } else {
        loginLink.classList.remove('hidden');
        registerLink.classList.remove('hidden');
        logoutLink.classList.add('hidden');
        
        // Show balance as N$0.00 when logged out
        balanceDisplay.classList.remove('hidden');
        const balanceSpan = balanceDisplay.querySelector('span');
        balanceSpan.textContent = 'Balance: N$0.00';
        
        addToCartBtns.forEach(btn => {
            btn.classList.remove('visible');
        });
    }
};