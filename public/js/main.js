// --- START OF FILE public/js/main.js ---

import { handleRouteChange } from './router.js';
import { CartManager } from './cart.js';
import * as ui from './ui.js';
import * as api from './api.js';
import { initChatbot } from './chatbot.js';
import { login as adminLogin, logout as adminLogout } from './adminAuth.js';
import { login, register, logout, updateAuthUI } from './auth.js';


// --- Initial Load & Route Changes ---
window.addEventListener('hashchange', handleRouteChange);
window.addEventListener('load', () => {
    updateAuthUI(); 
    handleRouteChange(); 
    initChatbot(); 
    ui.initFloatingCart();
    ui.initMobileNav();
    ui.initHamburgerMenu();
});

// --- CENTRALIZED EVENT DELEGATION ---
document.body.addEventListener('click', async (e) => {
    const addToCartBtn = e.target.closest('.add-to-cart-btn');
    if (addToCartBtn) {
        e.preventDefault();
        const productId = addToCartBtn.dataset.id;
        const selectedColorSwatch = document.querySelector('.color-swatch.selected');
        const selectedColor = selectedColorSwatch ? selectedColorSwatch.dataset.color : null;
        const selectedSizeSwatch = document.querySelector('.size-btn.selected');
        const selectedSize = selectedSizeSwatch ? selectedSizeSwatch.dataset.size : null;
        CartManager.addItem(productId, 1, selectedColor, selectedSize);
        return; 
    }

    if (e.target.id === 'logout-link') {
        e.preventDefault();
        logout();
        return;
    }

    const adminLogoutBtn = e.target.closest('#logout-btn');
    if (adminLogoutBtn) {
        e.preventDefault();
        adminLogout();
        return;
    }

    const backToAdminBtn = e.target.closest('#back-to-main-admin');
    if (backToAdminBtn) {
        e.preventDefault();
        const mainAdminInfo = sessionStorage.getItem('mainAdminInfo');
        if (!mainAdminInfo) return;

        if (mainAdminInfo === 'SESSION') {
            try {
                const res = await fetch('/auth/me', { credentials: 'same-origin' });
                if (!res.ok) throw new Error('Not authenticated');
                const user = await res.json();
                const userInfo = user.user || user;
                localStorage.setItem('userInfo', JSON.stringify({ ...userInfo, token: userInfo.token || null }));
                sessionStorage.removeItem('mainAdminInfo');
                location.reload();
            } catch (err) {
                alert('Failed to restore admin session. Please login again.');
                sessionStorage.removeItem('mainAdminInfo');
                location.hash = '#admin-login';
            }
            return;
        }

        localStorage.setItem('userInfo', mainAdminInfo);
        sessionStorage.removeItem('mainAdminInfo');
        location.reload();
        return;
    }

    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
        e.preventDefault();
        const mongoId = editBtn.dataset.mongoId;
        const allProducts = await api.fetchProducts(); 
        const productToEdit = allProducts.find(p => String(p._id) === String(mongoId));
        if (productToEdit) {
            ui.populateProductForm(productToEdit, allProducts);
        }
        return;
    }

    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn && deleteBtn.dataset.id && !deleteBtn.dataset.viewerId) { 
        e.preventDefault();
        const mongoId = deleteBtn.dataset.id;
        if (confirm('Are you sure you want to delete this product?')) {
            try {
                await api.deleteProduct(mongoId);
                alert('Product deleted');
                location.reload();
            } catch (err) {
                if (err.message.includes('401')) {
                    alert('Session expired. Please login again.');
                    logout();
                } else {
                    alert(`Delete failed: ${err.message}`);
                }
            }
        }
        return;
    }

    const deleteUserBtn = e.target.closest('.delete-user-btn');
    if (deleteUserBtn) {
        e.preventDefault();
        const userId = deleteUserBtn.dataset.userId;
        if (confirm('Are you sure you want to delete this user? This cannot be undone.')) {
            try {
                await api.deleteUser(userId);
                alert('User deleted successfully.');
                location.reload();
            } catch (error) {
                alert('Failed to delete user: ' + error.message);
            }
        }
        return;
    }
    
    const viewSellerBtn = e.target.closest('.view-seller-btn');
    if (viewSellerBtn) {
        e.preventDefault();
        const sellerEmail = viewSellerBtn.dataset.sellerEmail;
        if (confirm(`Impersonate this seller? Your session will be stored, and you'll be logged in as ${sellerEmail}.`)) {
            const mainAdminInfo = localStorage.getItem('userInfo');
            if (mainAdminInfo) {
                sessionStorage.setItem('mainAdminInfo', mainAdminInfo);
            } else {
                sessionStorage.setItem('mainAdminInfo', 'SESSION');
            }
            
            const allUsers = await api.fetchAllUsers();
            const sellerUser = allUsers.find(u => u.email === sellerEmail);
            
            if (sellerUser) {
                localStorage.setItem('userInfo', JSON.stringify(sellerUser)); 
                location.hash = '#admin';
                location.reload();
            } else {
                alert('Could not find seller information.');
            }
        }
        return;
    }

    const editFaqBtn = e.target.closest('.edit-faq-btn');
    if (editFaqBtn) {
        e.preventDefault();
        const faqId = editFaqBtn.dataset.faqId;
        const allFaqs = await api.fetchFAQs();
        const faqToEdit = allFaqs.find(f => f._id === faqId);
        if (faqToEdit) {
            document.getElementById('faq-id-hidden').value = faqToEdit._id;
            document.getElementById('faq-question').value = faqToEdit.question;
            document.getElementById('faq-answer').value = faqToEdit.answer;
            const addFaqTabBtn = document.querySelector('.admin-tab-btn[data-tab="faqs"]');
            if (addFaqTabBtn) addFaqTabBtn.click();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
    }

    const deleteFaqBtn = e.target.closest('.delete-faq-btn');
    if (deleteFaqBtn) {
        e.preventDefault();
        const faqId = deleteFaqBtn.dataset.faqId;
        if (confirm('Are you sure you want to delete this FAQ?')) {
            try {
                await api.deleteFAQ(faqId);
                alert('FAQ deleted successfully.');
                location.reload();
            } catch (err) {
                alert('Error deleting FAQ: ' + err.message);
            }
        }
        return;
    }
    
    const viewTransactionBtn = e.target.closest('.view-transaction-btn');
    if(viewTransactionBtn){
        e.preventDefault();
        const transactionRow = viewTransactionBtn.closest('tr');
        const transactionId = transactionRow ? transactionRow.dataset.transactionId : null;
        if (transactionId) {
            const allTransactions = await api.getAllTransactions();
            const transaction = allTransactions.find(t => t._id === transactionId);
            if(transaction) {
                ui.showTransactionDetailsPopup(transaction);
            }
        }
        return;
    }

    if (e.target.id === 'start-simulation-btn') {
        e.preventDefault();
        const startSimBtn = e.target;
        const simLog = document.getElementById('simulation-log');
        
        if (!simLog) return;

        startSimBtn.disabled = true;
        startSimBtn.textContent = 'Simulation in Progress...';
        simLog.innerHTML = 'Starting simulation...\n=========================\n';

        const delay = ms => new Promise(res => setTimeout(res, ms));

        const allProducts = await api.fetchProducts();

        const simulationPlan = [
            { day: 1, phase: "Post-Payday", peak: "21:00", persona: "High-Ticket", score: 85 },
            { day: 2, phase: "Post-Payday", peak: "21:00", persona: "High-Ticket", score: 82 },
            { day: 3, phase: "Post-Payday", peak: "22:00", persona: "High-Ticket", score: 78 },
            { day: 4, phase: "Maintenance", peak: "10:00", persona: "B2B", score: 65 },
            { day: 5, phase: "Maintenance", peak: "10:30", persona: "B2B", score: 60 },
            { day: 6, phase: "Weekend", peak: "14:00", persona: "Casual", score: 45 },
            { day: 7, phase: "Weekend", peak: "15:00", persona: "Casual", score: 48 },
            { day: 8, phase: "Work-Week", peak: "09:30", persona: "Procurement", score: 75 },
            { day: 9, phase: "Work-Week", peak: "10:00", persona: "Procurement", score: 77 },
            { day: 10, phase: "Work-Week", peak: "10:30", persona: "Procurement", score: 72 },
            { day: 11, phase: "Mid-Month", peak: "12:30", persona: "Researcher", score: 60 },
            { day: 12, phase: "Mid-Month", peak: "13:00", persona: "Researcher", score: 58 },
            { day: 13, phase: "Weekend", peak: "20:00", persona: "Hobbyist", score: 55 },
            { day: 14, phase: "Weekend", peak: "21:00", persona: "Hobbyist", score: 52 },
            { day: 15, phase: "Mid-Month", peak: "10:00", persona: "Upgrader", score: 70 },
            { day: 16, phase: "Mid-Month", peak: "11:00", persona: "Upgrader", score: 68 },
            { day: 17, phase: "Mid-Month", peak: "11:30", persona: "Upgrader", score: 65 },
            { day: 18, phase: "Slump", peak: "13:00", persona: "Window-Shopper", score: 40 },
            { day: 19, phase: "Slump", peak: "14:00", persona: "Window-Shopper", score: 38 },
            { day: 20, phase: "Weekend", peak: "11:00", persona: "Home-Office", score: 50 },
            { day: 21, phase: "Weekend", peak: "12:00", persona: "Home-Office", score: 53 },
            { day: 22, phase: "Lead-up", peak: "19:00", persona: "Wishlist-Builder", score: 78 },
            { day: 23, phase: "Lead-up", peak: "20:00", persona: "Wishlist-Builder", score: 80 },
            { day: 24, phase: "Lead-up", peak: "21:00", persona: "Wishlist-Builder", score: 82 },
            { day: 25, phase: "Payday-Eve", peak: "23:30", persona: "Impulse", score: 92 },
            { day: 26, phase: "Payday-Eve", peak: "00:00", persona: "Impulse", score: 95 },
            { day: 27, phase: "Payday-Eve", peak: "09:00", persona: "Early-Adopter", score: 100 },
            { day: 28, phase: "Payday-Eve", peak: "10:00", persona: "Early-Adopter", score: 98 },
            { day: 29, phase: "Retention", peak: "18:00", persona: "Bundle-Buyer", score: 82 },
            { day: 30, phase: "Retention", peak: "19:00", persona: "Bundle-Buyer", score: 80 },
            { day: 31, phase: "Retention", peak: "20:00", persona: "Bundle-Buyer", score: 78 }
        ];
        
        const personaProductMap = {
            'High-Ticket': products => products.filter(p => p.currentPrice > 10000),
            'B2B': products => products.filter(p => ['hp-aio', 'dell-laptops', 'hp-laptops', 'imacs', 'office'].includes(p.category) || (p.curatedPages && p.curatedPages.includes('office'))),
            'Casual': products => products.filter(p => p.currentPrice < 8000),
            'Procurement': products => products.filter(p => ['hp-aio', 'dell-laptops', 'hp-laptops', 'imacs', 'office'].includes(p.category) || (p.curatedPages && p.curatedPages.includes('office'))),
            'Researcher': products => products.filter(p => p.category === 'iphones' || p.category === 'samsung-phones'),
            'Hobbyist': products => products.filter(p => ['playstation', 'xbox', 'gaming-accessories', 'gaming'].includes(p.category)),
            'Home-Office': products => products.filter(p => ['hp-aio', 'laptops', 'macbooks'].includes(p.category)),
            'Wishlist-Builder': products => products.filter(p => p.currentPrice > 15000),
            'Impulse': products => products.filter(p => p.onSale),
            'Early-Adopter': products => products.filter(p => (p.title.includes('16') || p.title.includes('S25') || p.title.includes('M4'))),
            'Bundle-Buyer': products => products.filter(p => p.curatedPages && p.curatedPages.includes('combos')),
            'Upgrader': products => products.filter(p => p.category === 'iphones' || p.category === 'samsung-phones'),
            'Window-Shopper': products => products
        };

        for (const step of simulationPlan) {
            simLog.innerHTML += `Day ${step.day} (${step.persona}):\n`;
            const targetProducts = personaProductMap[step.persona] ? personaProductMap[step.persona](allProducts) : allProducts;
            
            if (targetProducts.length === 0) {
                simLog.innerHTML += `  - No products match persona. Skipping.\n`;
                continue;
            }

            const viewerCount = Math.max(1, Math.ceil(step.score / 10));
            let createdCount = 0;

            for (let i = 0; i < viewerCount; i++) {
                const product = targetProducts[Math.floor(Math.random() * targetProducts.length)];
                const today = new Date();
                const simDate = new Date(today);
                simDate.setDate(today.getDate() + (step.day - 1));
                
                const [hour, minute] = step.peak.split(':').map(Number);
                simDate.setHours(hour, minute, Math.floor(Math.random() * 60));

                try {
                    await api.addViewer(product.productId, { viewTime: simDate.toISOString() });
                    createdCount++;
                } catch (err) {
                    console.error(`Failed to add viewer for product ${product.productId}:`, err);
                }
            }
            simLog.innerHTML += `  - Created ${createdCount} viewers for products like "${targetProducts[0].title}".\n`;
            simLog.scrollTop = simLog.scrollHeight;
            await delay(300);
        }

        simLog.innerHTML += '\n=========================\n✅ Simulation Complete!';
        simLog.scrollTop = simLog.scrollHeight;
        startSimBtn.disabled = false;
        startSimBtn.textContent = 'Start One-Month Simulation';
        alert('Traffic simulation complete! Check the "Manage Viewers" tab to see the results.');
        return;
    }
});

// Listener for Transaction Verification & Seller Approval Toggles (Change Event)
document.body.addEventListener('change', async (e) => {
    // Transaction Verification
    if (e.target.classList.contains('verify-switch')) {
        const checkbox = e.target;
        const row = checkbox.closest('tr');
        const transactionId = row.dataset.transactionId;
        const verified = checkbox.checked;

        try {
            await api.updateTransaction(transactionId, { verified });
            if (verified) row.classList.add('verified');
            else row.classList.remove('verified');
        } catch (err) {
            console.error('Failed to verify transaction:', err);
            alert('Failed to update status');
            checkbox.checked = !verified; 
        }
    }

    // Seller Account Approval Toggle
    if (e.target.classList.contains('seller-approve-toggle')) {
        const checkbox = e.target;
        const userId = checkbox.dataset.userId;
        const isApproved = checkbox.checked;

        const confirmationMessage = isApproved
            ? 'Are you sure you want to approve this seller? They will be able to log in.'
            : 'Are you sure you want to deactivate this seller? They will lose access to their dashboard.';

        if (confirm(confirmationMessage)) {
            try {
                await api.approveUser(userId, isApproved);
                alert(`Seller account has been ${isApproved ? 'approved' : 'deactivated'}.`);
                const listItem = checkbox.closest('.seller-account-item') || checkbox.closest('li');
                const statusBadge = listItem.querySelector('.status-badge');
                if (statusBadge) {
                    if (isApproved) {
                        statusBadge.textContent = 'Active';
                        statusBadge.style.background = '#e6ffed';
                        statusBadge.style.color = '#065f46';
                    } else {
                        statusBadge.textContent = 'Deactivated';
                        statusBadge.style.background = '#e0e0e0';
                        statusBadge.style.color = '#333';
                    }
                }
            } catch (error) {
                alert('Failed to update seller status: ' + error.message);
                checkbox.checked = !isApproved; 
            }
        } else {
            checkbox.checked = !isApproved; 
        }
    }
});

// Submit Form Handler Routing
document.body.addEventListener('submit', async e => {
    
    // --- Admin Login Form ---
    if (e.target.id === 'admin-login-form') {
        e.preventDefault();
        const email = e.target.elements.email.value;
        const password = e.target.elements.password.value;
        const msgEl = document.getElementById('admin-login-message');
        if (msgEl) msgEl.textContent = '';
        try {
            const success = await adminLogin(email, password);
            if (success) {
                location.hash = '#admin';
            }
        } catch (err) {
            if (msgEl) {
                msgEl.textContent = err.message || 'Login failed.';
                msgEl.classList.add('error');
            }
        }
        return;
    }

    // --- Admin Product Form (Create/Update) ---
    if (e.target.id === 'product-form') {
        e.preventDefault();
        await handleProductFormSubmit(e);
        return;
    }

    // --- Admin FAQ Form (Create/Update) ---
    if (e.target.id === 'faq-form') {
        e.preventDefault();
        const faqId = document.getElementById('faq-id-hidden').value;
        const question = document.getElementById('faq-question').value;
        const answer = document.getElementById('faq-answer').value;

        try {
            if (faqId) {
                await api.updateFAQ(faqId, { question, answer });
                alert('FAQ updated successfully!');
            } else {
                await api.createFAQ({ question, answer });
                alert('FAQ created successfully!');
            }
            location.reload();
        } catch (err) {
            alert('Error saving FAQ: ' + err.message);
        }
        return;
    }
    
    // --- Admin Site Settings Form ---
    if (e.target.id === 'site-settings-form') {
        e.preventDefault();
        const form = e.target;
        const inputs = form.querySelectorAll('input[type="text"]');
        const fileInputs = form.querySelectorAll('input[type="file"]');
        
        try {
            // Handle URL inputs
            for (const input of inputs) {
                if (input.name) {
                    await api.updateSetting(input.name, input.value);
                }
            }
            // Handle File uploads for hero images
            for (const fileInput of fileInputs) {
                if (fileInput.files.length > 0) {
                    const fd = new FormData();
                    fd.append('image', fileInput.files[0]);
                    const res = await fetch('/api/upload/hero', { method: 'POST', body: fd });
                    const data = await res.json();
                    
                    let settingKey = fileInput.dataset.settingKey;
                    if (!settingKey) {
                        if (fileInput.id.startsWith('home-hero-file-')) {
                            const index = fileInput.id.split('-').pop();
                            settingKey = `home_hero_${index}`;
                        } else if (fileInput.id.startsWith('cat-hero-file-')) {
                            const catKey = fileInput.id.replace('cat-hero-file-', '');
                            settingKey = `heroImage_${catKey}`;
                        } else if (fileInput.id.startsWith('payment-carousel-file-')) {
                            const index = fileInput.id.split('-').pop();
                            settingKey = `payment_carousel_${index}`;
                        }
                    }
                    
                    if (settingKey && data.image) {
                        await api.updateSetting(settingKey, data.image);
                    }
                }
            }
            
            alert('Site settings saved successfully!');
            location.reload();
        } catch (error) {
            alert('Failed to save settings: ' + error.message);
        }
        return;
    }

    // --- Admin Page Settings Form ---
    if (e.target.id === 'page-settings-form') {
        e.preventDefault();
        const fileInput = document.getElementById('about-us-image-file-tab');
        if (fileInput && fileInput.files.length > 0) {
            try {
                const fd = new FormData();
                fd.append('image', fileInput.files[0]);
                const res = await fetch('/api/upload/hero', { method: 'POST', body: fd });
                const data = await res.json();
                if (data.image) {
                    await api.updateSetting('about_us_image', data.image);
                    alert('Page settings saved!');
                    location.reload();
                }
            } catch (err) {
                alert('Upload failed: ' + err.message);
            }
        } else {
            alert('No file selected.');
        }
        return;
    }

    // --- Customer Login ---
    if (e.target.id === 'login-form') {
        e.preventDefault();
        const email = e.target.elements.email.value;
        const password = e.target.elements.password.value;
        const msgEl = document.getElementById('login-message');
        if (msgEl) msgEl.textContent = '';
        try {
            const res = await api.sessionLogin(email, password);
            const userInfo = res.user || res;
            localStorage.setItem('userInfo', JSON.stringify({ ...userInfo, token: null }));
            updateAuthUI();
            if (msgEl) {
                msgEl.textContent = 'Logged in';
                msgEl.classList.remove('error');
                msgEl.classList.add('success');
            }
            setTimeout(() => { location.hash = '#home'; }, 400);
        } catch (err) {
            if (msgEl) {
                msgEl.textContent = err.message || 'Login failed.';
                msgEl.classList.remove('success');
                msgEl.classList.add('error');
            }
        }
        return;
    }

    // --- Customer Registration ---
    if (e.target.id === 'register-form') {
        e.preventDefault();
        const name = e.target.elements.name.value;
        const email = e.target.elements.email.value;
        const password = e.target.elements.password.value;
        const sellerType = e.target.elements.sellerType ? e.target.elements.sellerType.value : 'customer';
        const sellerIdNumber = e.target.elements.sellerIdNumber ? e.target.elements.sellerIdNumber.value.trim() : '';
        const businessRegistrationNumber = e.target.elements.businessRegistrationNumber ? e.target.elements.businessRegistrationNumber.value.trim() : '';
        const physicalAddress = e.target.elements.physicalAddress ? e.target.elements.physicalAddress.value.trim() : '';
        const registrationDocumentInput = e.target.elements.businessRegistrationDocument;
        const businessRegistrationDocument = registrationDocumentInput && registrationDocumentInput.files.length ? registrationDocumentInput.files[0] : null;

        const msgEl = document.getElementById('register-message');
        if (msgEl) msgEl.textContent = '';
        
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            if (msgEl) {
                msgEl.textContent = passwordValidation.message;
                msgEl.classList.remove('success');
                msgEl.classList.add('error');
            }
            return;
        }

        if (sellerType !== 'customer') {
            if (!physicalAddress) {
                if (msgEl) {
                    msgEl.textContent = 'Physical address is required for reseller accounts.';
                    msgEl.classList.remove('success');
                    msgEl.classList.add('error');
                }
                return;
            }
            if (!businessRegistrationDocument) {
                if (msgEl) {
                    msgEl.textContent = 'Business registration PDF document is required for reseller accounts.';
                    msgEl.classList.remove('success');
                    msgEl.classList.add('error');
                }
                return;
            }
        }
        
        try {
            const res = await api.sessionSignup(name, email, password, sellerType, sellerIdNumber, businessRegistrationNumber, physicalAddress, businessRegistrationDocument);
            
            if (res.pendingApproval) {
                if (msgEl) {
                    msgEl.textContent = res.message;
                    msgEl.classList.remove('error');
                    msgEl.classList.add('success');
                }
                e.target.reset();
            } else {
                const userInfo = res.user || res;
                localStorage.setItem('userInfo', JSON.stringify({ ...userInfo, token: null }));
                updateAuthUI();
                if (msgEl) {
                    msgEl.textContent = 'Account created';
                    msgEl.classList.remove('error');
                    msgEl.classList.add('success');
                }
                setTimeout(() => { location.hash = '#home'; }, 400);
            }
        } catch (err) {
            if (msgEl) {
                msgEl.textContent = err.message || 'Registration failed.';
                msgEl.classList.remove('success');
                msgEl.classList.add('error');
            }
        }
        return;
    }

    // --- Forgot Password ---
    if (e.target.id === 'forgot-form') {
        e.preventDefault();
        const email = e.target.elements.email.value;
        const msgEl = document.getElementById('forgot-message');
        if (msgEl) msgEl.textContent = '';
        try {
            const res = await api.forgotPassword(email);
            if (msgEl) {
                msgEl.textContent = res.message || 'If that email exists, a reset link was sent.';
                msgEl.classList.remove('error');
                msgEl.classList.add('success');
            }
        } catch (err) {
            if (msgEl) {
                msgEl.textContent = err.message || 'Failed to request reset.';
                msgEl.classList.remove('success');
                msgEl.classList.add('error');
            }
        }
        return;
    }

    // --- Reset Password ---
    if (e.target.id === 'reset-form') {
        e.preventDefault();
        const password = e.target.elements.password.value;
        const token = e.target.elements['reset-token'] ? e.target.elements['reset-token'].value : '';
        const msgEl = document.getElementById('reset-message');
        if (msgEl) msgEl.textContent = '';
        if (!token) {
            if (msgEl) {
                msgEl.textContent = 'Reset token missing.';
                msgEl.classList.add('error');
            }
            return;
        }
        try {
            const res = await api.resetPassword(token, password);
            if (msgEl) {
                msgEl.textContent = res.message || 'Password reset successful.';
                msgEl.classList.remove('error');
                msgEl.classList.add('success');
            }
            setTimeout(() => { location.hash = '#login'; }, 1200);
        } catch (err) {
            if (msgEl) {
                msgEl.textContent = err.message || 'Failed to reset password.';
                msgEl.classList.remove('success');
                msgEl.classList.add('error');
            }
        }
        return;
    }
});


/**
 * Dedicated handler for the complex product form submission.
 */
async function handleProductFormSubmit(e) {
    const form = e.target;
    const hiddenId = form.elements['product-id-hidden'].value;
    const category = form.elements['product-category'].value;
    const isClothes = ['clothes', 'clothing', 'womens-clothes', 'mens-clothes'].includes(category.toLowerCase());

    if (!hiddenId) {
        const hasMainImageUrl = form.elements['product-image'].value.trim() !== '';
        const hasUploadedImages = form.elements['product-images'].files.length > 0;
        
        if (!hasMainImageUrl && !hasUploadedImages) {
            alert('Error: You must provide at least one image via URL or upload when creating a new product.');
            return; 
        }
    }

    const curatedPages = [
        'product-curate-womens', 'product-curate-mens', 'product-curate-livingroom',
        'product-curate-bedroom', 'product-curate-office', 'product-curate-kitchen',
        'product-curate-kids-electronics', 'product-curate-kids-clothing', 'product-curate-kids-toys',
        'product-curate-trending', 'product-curate-new-arrivals', 'product-curate-combos'
    ]
    .filter(id => form.elements[id]?.checked)
    .map(id => {
        const map = {
            'product-curate-womens': 'womens-clothes', 'product-curate-mens': 'mens-clothes',
            'product-curate-livingroom': 'living-room', 'product-curate-bedroom': 'bedroom',
            'product-curate-office': 'office', 'product-curate-kitchen': 'kitchen',
            'product-curate-kids-electronics': 'kids-electronics', 'product-curate-kids-clothing': 'kids-clothing',
            'product-curate-kids-toys': 'kids-toys', 'product-curate-trending': 'trending',
            'product-curate-new-arrivals': 'new-arrivals', 'product-curate-combos': 'combos'
        };
        return map[id];
    });

    const clothingFilters = [
        'product-filter-tops', 'product-filter-bottoms', 'product-filter-official',
        'product-filter-traditional', 'product-filter-shoes', 'product-filter-accessories',
        'product-filter-furniture', 'product-filter-appliances'
    ]
    .filter(id => form.elements[id]?.checked)
    .map(id => id.replace('product-filter-', ''));
    
    const features = Array.from(document.querySelectorAll('#product-features-container .ai-feature-input'))
                         .map(input => input.value.trim())
                         .filter(Boolean);

    const colors = [
        form.elements['product-color-1']?.value.trim(),
        form.elements['product-color-2']?.value.trim(),
        form.elements['product-color-3']?.value.trim(),
    ].filter(Boolean);

    const sizeSelect = document.getElementById('product-sizes-select');
    const sizes = sizeSelect ? Array.from(sizeSelect.selectedOptions).map(opt => opt.value) : [];

    const mainImageUrl = form.elements['product-image'].value;
    const carouselUrls = [
        form.elements['carousel-url-1']?.value,
        form.elements['carousel-url-2']?.value,
        form.elements['carousel-url-3']?.value,
        form.elements['carousel-url-4']?.value,
    ].filter(Boolean);

    const productData = {
        productId: form.elements['product-id'].value,
        title: form.elements['product-title'].value,
        currentPrice: parseFloat(form.elements['product-currentPrice'].value),
        oldPrice: parseFloat(form.elements['product-oldPrice'].value),
        category: category,
        image: mainImageUrl,
        description: form.elements['product-description'].value,
        stock: form.elements['product-stockToggle'].checked ? parseInt(form.elements['product-stock'].value) : undefined,
        condition: form.elements['product-condition']?.value || 'new',
        onSale: form.elements['product-onSale'].checked,
        saleStartDate: form.elements['product-saleStartDate'].value ? new Date(form.elements['product-saleStartDate'].value) : undefined,
        saleEndDate: form.elements['product-saleEndDate'].value ? new Date(form.elements['product-saleEndDate'].value) : undefined,
        curatedPages: curatedPages,
        clothingFilters: clothingFilters,
        features: features,
        colors: colors,
        colorsEnabled: document.getElementById('enable-product-colors')?.checked || false,
        sizes: sizes,
        thumbnails: carouselUrls,
        exploreMoreReseller: form.elements['product-exploreMoreReseller']?.value || undefined
    };
    
    if (productData.image && !productData.thumbnails.includes(productData.image)) {
        productData.thumbnails.unshift(productData.image);
    }

    const comboProductIdsInput = document.getElementById('combo-product-ids-hidden');
    const isCombo = document.getElementById('product-curate-combos')?.checked;
    
    if (isCombo && comboProductIdsInput && comboProductIdsInput.value) {
        try {
            productData.comboProductIds = JSON.parse(comboProductIdsInput.value);
            const comboEndDateValue = document.getElementById('product-comboEndDate')?.value;
            if (comboEndDateValue) {
                productData.comboEndDate = new Date(comboEndDateValue);
            }
            const comboPrice = document.getElementById('product-comboSalePrice')?.value;
            if (comboPrice) {
                productData.currentPrice = parseFloat(comboPrice);
            }
        } catch (e) {
            console.error("Error parsing combo IDs", e);
        }
    }

    const giftCardEnabled = document.getElementById('product-giftCardEnabled');
    if (giftCardEnabled) {
        productData.giftCardEnabled = giftCardEnabled.checked;
        if (giftCardEnabled.checked) {
            productData.giftCardType = document.getElementById('product-giftCardType')?.value || 'percent';
            productData.giftCardValue = parseFloat(document.getElementById('product-giftCardValue')?.value) || 0;
        }
    }

    // CHANGED: Support uploading the cropped binary Blobs cached in window.croppedProductImages
    const croppedImages = window.croppedProductImages || [];
    if (croppedImages.length > 0) {
        const filePaths = [];
        for (let i = 0; i < croppedImages.length; i++) {
            const blob = croppedImages[i];
            const fd = new FormData();
            fd.append('image', blob, `cropped-image-${Date.now()}-${i}.jpg`);
            try {
                const res = await fetch('/api/upload/product', { method: 'POST', body: fd });
                if (res.ok) {
                    const json = await res.json();
                    filePaths.push(json.image);
                }
            } catch (err) {
                console.error("Upload failed", err);
            }
        }
        
        if (filePaths.length > 0) {
            if (!productData.image) productData.image = filePaths[0];
            productData.thumbnails = [...filePaths, ...productData.thumbnails];
        }
        window.croppedProductImages = []; // Reset after upload
    } else {
        const fileInput = document.getElementById('product-images');
        if (fileInput && fileInput.files.length > 0) {
            const filePaths = [];
            for (const file of fileInput.files) {
                const fd = new FormData();
                fd.append('image', file);
                try {
                    const res = await fetch('/api/upload/product', { method: 'POST', body: fd });
                    if (res.ok) {
                        const json = await res.json();
                        filePaths.push(json.image);
                    }
                } catch (err) {
                    console.error("Upload failed", err);
                }
            }
            
            if (filePaths.length > 0) {
                if (!productData.image) productData.image = filePaths[0];
                productData.thumbnails = [...filePaths, ...productData.thumbnails];
            }
        }
    }

    const canvas = document.getElementById('combo-image-canvas');
    if (isCombo && canvas) {
        if (productData.comboProductIds && productData.comboProductIds.length > 0) {
            try {
                const dataURL = canvas.toDataURL('image/jpeg', 0.9);
                const blob = await (await fetch(dataURL)).blob();
                const file = new File([blob], `combo-${Date.now()}.jpg`, { type: 'image/jpeg' });
                const fd = new FormData();
                fd.append('image', file);
                const res = await fetch('/api/upload/product', { method: 'POST', body: fd });
                if (res.ok) {
                    const json = await res.json();
                    productData.image = json.image; 
                    productData.thumbnails.unshift(json.image);
                }
            } catch (err) {
                console.error("Combo image upload failed", err);
            }
        }
    }

    if (productData.thumbnails) {
        productData.thumbnails = [...new Set(productData.thumbnails)];
    }

    try {
        if (hiddenId) {
            await api.updateProduct(hiddenId, productData);
            alert('Product updated successfully!');
        } else {
            await api.createProduct(productData);
            alert('Product created successfully!');
        }
        location.reload();
    } catch (err) {
        if (err.message && err.message.includes('401')) {
            alert('Your session has expired or the token is invalid. Please log in again.');
            logout(); 
            return;
        }
        
        alert(`Error saving product: ${err.message}`);
        console.error("Error saving product:", err);
    }
}


function validatePassword(password) {
    const minLength = 8;
    const minCapitalLetters = 1;
    const minNumbers = 2;
    
    const capitalLetterCount = (password.match(/[A-Z]/g) || []).length;
    const numberCount = (password.match(/[0-9]/g) || []).length;
    
    if (password.length < minLength) {
        return {
            valid: false,
            message: `❌ Password must contain at least ${minLength} characters. Current: ${password.length} characters.`
        };
    }
    
    if (capitalLetterCount < minCapitalLetters) {
        return {
            valid: false,
            message: `❌ Password must contain at least ${minCapitalLetters} capital letter(s). Current: ${capitalLetterCount} capital letter(s).`
        };
    }
    
    if (numberCount < minNumbers) {
        return {
            valid: false,
            message: `❌ Password must contain at least ${minNumbers} number(s). Current: ${numberCount} number(s).`
        };
    }
    
    return {
        valid: true,
        message: '✓ Password meets all requirements.'
    };
}

const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

const performSearch = () => {
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
        location.hash = `#search/${encodeURIComponent(searchTerm)}`;
    }
};

if (searchInput) {
    searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}
if (searchBtn) {
    searchBtn.addEventListener('click', performSearch);
}