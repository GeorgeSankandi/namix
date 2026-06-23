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

    const togglePasswordIcon = e.target.closest('.toggle-password');
    if (togglePasswordIcon) {
        e.preventDefault();
        const inputField = togglePasswordIcon.parentElement.querySelector('input');
        if (inputField) {
            if (inputField.type === 'password') {
                inputField.type = 'text';
                togglePasswordIcon.classList.remove('fa-eye');
                togglePasswordIcon.classList.add('fa-eye-slash');
            } else {
                inputField.type === 'password';
                togglePasswordIcon.classList.remove('fa-eye-slash');
                togglePasswordIcon.classList.add('fa-eye');
            }
        }
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
                alert('Product deleted successfully.');
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

    // Handle Viewer Deletion in Admin Dashboard
    if (deleteBtn && deleteBtn.dataset.viewerId) {
        e.preventDefault();
        const productId = deleteBtn.dataset.productId;
        const viewerId = deleteBtn.dataset.viewerId;
        if (confirm('Are you sure you want to remove this viewer?')) {
            try {
                await api.deleteViewerById(productId, viewerId);
                alert('Viewer removed successfully.');
                location.reload();
            } catch (err) {
                alert(`Failed to delete viewer: ${err.message}`);
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
            const faqSaveBtn = document.getElementById('faq-save-btn');
            if (faqSaveBtn) faqSaveBtn.textContent = 'Update FAQ';
            const faqsTabBtn = document.querySelector('.admin-tab-btn[data-tab="faqs"]');
            if (faqsTabBtn) faqsTabBtn.click();
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
                alert('FAQ removed successfully.');
                location.reload();
            } catch (err) {
                alert(`Failed to delete FAQ: ${err.message}`);
            }
        }
        return;
    }

    const editBrandBtn = e.target.closest('.edit-brand-btn');
    if (editBrandBtn) {
        e.preventDefault();
        const brandId = editBrandBtn.dataset.brandId;
        try {
            const allBrands = await api.getBrands();
            const brandToEdit = allBrands.find(b => String(b._id) === String(brandId));
            if (brandToEdit) {
                document.getElementById('brand-id-hidden').value = brandToEdit._id;
                document.getElementById('brand-name').value = brandToEdit.name;
                const brandSaveBtn = document.getElementById('brand-save-btn');
                if (brandSaveBtn) brandSaveBtn.textContent = 'Update Brand';
            }
        } catch (err) {
            console.error('Failed to prepare brand update form:', err);
        }
        return;
    }

    const deleteBrandBtn = e.target.closest('.delete-brand-btn');
    if (deleteBrandBtn) {
        e.preventDefault();
        const brandId = deleteBrandBtn.dataset.brandId;
        if (confirm('Are you sure you want to delete this brand?')) {
            try {
                await api.deleteBrand(brandId);
                alert('Brand deleted successfully.');
                location.reload();
            } catch (err) {
                alert('Error deleting brand: ' + err.message);
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
            { day: 27, phase: "Payday-Peak", peak: "09:00", persona: "Early-Adopter", score: 100 },
            { day: 28, phase: "Payday-Peak", peak: "10:00", persona: "Early-Adopter", score: 98 },
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
            simLog.innerHTML += `  - Created ${createdCount} viewers.\n`;
            simLog.scrollTop = simLog.scrollHeight;
            await delay(300);
        }

        simLog.innerHTML += '\n=========================\n✅ Simulation Complete!';
        simLog.scrollTop = simLog.scrollHeight;
        startSimBtn.disabled = false;
        startSimBtn.textContent = 'Start One-Month Simulation';
        alert('Traffic simulation complete! Check the "Manage Viewers" tab.');
        return;
    }
});

// Listener for Transaction Verification & Seller Approval Toggles (Change Event)
document.body.addEventListener('change', async (e) => {
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

    if (e.target.classList.contains('seller-approve-toggle')) {
        const checkbox = e.target;
        const userId = checkbox.dataset.userId;
        const isApproved = checkbox.checked;

        const confirmationMessage = isApproved
            ? 'Are you sure you want to approve this seller?'
            : 'Are you sure you want to deactivate this seller?';

        if (confirm(confirmationMessage)) {
            try {
                await api.approveUser(userId, { isApproved });
                alert(`Seller account has been ${isApproved ? 'approved' : 'deactivated'}.`);
                location.reload();
            } catch (error) {
                alert('Failed to update seller status: ' + error.message);
                checkbox.checked = !isApproved; 
            }
        } else {
            checkbox.checked = !isApproved; 
        }
    }

    if (e.target.classList.contains('seller-bestseller-toggle')) {
        const checkbox = e.target;
        const userId = checkbox.dataset.userId;
        const showBestSellerBadge = checkbox.checked;

        try {
            await api.approveUser(userId, { showBestSellerBadge });
            alert('Seller bestseller badge successfully updated.');
        } catch (error) {
            alert('Failed to update bestseller badge.');
            checkbox.checked = !showBestSellerBadge;
        }
    }

    if (e.target.classList.contains('seller-verified-toggle')) {
        const checkbox = e.target;
        const userId = checkbox.dataset.userId;
        const isVerified = checkbox.checked;

        try {
            await api.approveUser(userId, { isVerified });
            alert('Seller verification status updated successfully.');
        } catch (error) {
            alert('Failed to update verification status.');
            checkbox.checked = !isVerified;
        }
    }
    
    if (e.target.classList.contains('dynamic-hero-file-input')) {
        const fileInput = e.target;
        const settingKey = fileInput.dataset.settingKey;
        if (fileInput.files.length > 0) {
            try {
                const fd = new FormData();
                fd.append('image', fileInput.files[0]);
                const res = await fetch('/api/upload/hero', { method: 'POST', body: fd });
                if (!res.ok) throw new Error('Upload failed');
                const data = await res.json();
                if (data.image) {
                    const textInput = document.querySelector(`input[name="${settingKey}"]`);
                    if (textInput) {
                        textInput.value = data.image;
                        textInput.dispatchEvent(new Event('change'));
                        alert('Image uploaded successfully.');
                    }
                }
            } catch (err) {
                alert('File upload failed: ' + err.message);
            }
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

    // --- Admin Brand Form (Create/Update) ---
    if (e.target.id === 'brand-form') {
        e.preventDefault();
        const brandId = document.getElementById('brand-id-hidden').value;
        const name = document.getElementById('brand-name').value;

        try {
            if (brandId) {
                await api.updateBrand(brandId, { name });
                alert('Brand updated successfully!');
            } else {
                await api.createBrand({ name });
                alert('Brand created successfully!');
            }
            location.reload();
        } catch (err) {
            alert('Error saving brand: ' + err.message);
        }
        return;
    }
    
    // --- Admin Site Settings Form ---
    if (e.target.id === 'site-settings-form') {
        e.preventDefault();
        const form = e.target;
        const inputs = form.querySelectorAll('input[type="text"]:not(.card-title-input):not(.card-link-input):not(.card-image-url-input)');
        const fileInputs = form.querySelectorAll('input[type="file"]:not(.dynamic-hero-file-input):not(.card-image-file-input)');
        
        try {
            for (const input of inputs) {
                if (input.name) {
                    await api.updateSetting(input.name, input.value);
                }
            }
            for (const fileInput of fileInputs) {
                if (fileInput.files.length > 0) {
                    const fd = new FormData();
                    fd.append('image', fileInput.files[0]);
                    const res = await fetch('/api/upload/hero', { method: 'POST', body: fd });
                    const data = await res.json();
                    
                    let settingKey = fileInput.dataset.settingKey;
                    
                    if (settingKey && data.image) {
                        await api.updateSetting(settingKey, data.image);
                    }
                }
            }
            
            if (window.currentUnderHeroCards) {
                await api.updateSetting('home_under_hero_cards', JSON.stringify(window.currentUnderHeroCards));
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

    // --- Reseller Profile form update (Requirement 3/8) ---
    if (e.target.id === 'reseller-profile-form') {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData();
        formData.append('name', document.getElementById('profile-name').value);
        formData.append('businessName', document.getElementById('profile-business-name').value);
        formData.append('phone', document.getElementById('profile-phone').value);
        formData.append('defaultWarranty', document.getElementById('profile-warranty').value);
        formData.append('defaultDeliveryOption', document.getElementById('profile-delivery').value);
        
        // Append location, geocoded fields, and physicalAddress parameters to Form Data payload
        formData.append('physicalAddress', document.getElementById('profile-physical-address').value);
        formData.append('latitude', document.getElementById('profile-lat').value);
        formData.append('longitude', document.getElementById('profile-lon').value);
        
        const fileInput = document.getElementById('profile-image-file');
        if (fileInput && fileInput.files.length > 0) {
            formData.append('profileImage', fileInput.files[0]);
        }

        try {
            const updatedUser = await api.updateUserProfile(formData);
            localStorage.setItem('userInfo', JSON.stringify({ ...updatedUser, token: api.getToken() }));
            alert('Profile settings saved successfully!');
            location.reload();
        } catch (error) {
            alert('Failed to update profile settings: ' + error.message);
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
            localStorage.setItem('userInfo', JSON.stringify({ ...userInfo, token: userInfo.token || null }));
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
        const sellerIdNumber = e.target.elements.sellerIdNumber ? e.target.elements.sellerIdNumber.value.trim() : '';
        const businessRegistrationNumber = e.target.elements.businessRegistrationNumber ? e.target.elements.businessRegistrationNumber.value.trim() : '';
        const physicalAddress = e.target.elements.physicalAddress ? e.target.elements.physicalAddress.value.trim() : '';
        const businessName = e.target.elements.businessName ? e.target.elements.businessName.value.trim() : '';
        const phone = e.target.elements.phone ? e.target.elements.phone.value.trim() : '';
        
        // Multi-select parse to comma-separated string (Requirement 7)
        const sellerTypeSelect = e.target.elements.sellerType;
        let sellerType = 'customer';
        if (sellerTypeSelect) {
            const selected = Array.from(sellerTypeSelect.selectedOptions).map(opt => opt.value);
            sellerType = selected.join(',');
        }

        const registrationDocumentInput = e.target.elements.businessRegistrationDocument;
        const businessRegistrationDocument = registrationDocumentInput && registrationDocumentInput.files.length ? registrationDocumentInput.files[0] : null;

        const sellerIdImageInput = e.target.elements.sellerIdImage;
        const sellerIdImage = sellerIdImageInput && sellerIdImageInput.files.length ? sellerIdImageInput.files[0] : null;

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

        const isSeller = sellerType.split(',').some(val => val !== 'customer');
        if (isSeller) {
            if (!physicalAddress) {
                if (msgEl) {
                    msgEl.textContent = 'Physical address is required for reseller accounts.';
                    msgEl.classList.remove('success');
                    msgEl.classList.add('error');
                }
                return;
            }
        }
        
        try {
            const res = await api.sessionSignup(name, email, password, sellerType, sellerIdNumber, businessRegistrationNumber, physicalAddress, businessRegistrationDocument, sellerIdImage, businessName, phone);
            
            if (res.pendingApproval) {
                if (msgEl) {
                    msgEl.textContent = res.message;
                    msgEl.classList.remove('error');
                    msgEl.classList.add('success');
                }
                e.target.reset();
            } else {
                const userInfo = res.user || res;
                localStorage.setItem('userInfo', JSON.stringify({ ...userInfo, token: userInfo.token || null }));
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

    const dynamicFiltersInput = document.getElementById('product-clothing-filters-hidden');
    let clothingFilters = [];
    if (dynamicFiltersInput && dynamicFiltersInput.value) {
        try {
            clothingFilters = JSON.parse(dynamicFiltersInput.value);
        } catch (parseError) {
            console.error('Failed to parse dynamic clothing filters:', parseError);
        }
    }
    
    const features = Array.from(document.querySelectorAll('#product-features-container .ai-feature-input'))
                         .map(input => input.value.trim())
                         .filter(Boolean);

    let colors = [];
    const colorsHidden = document.getElementById('product-colors-hidden');
    if (colorsHidden && colorsHidden.value) {
        try {
            colors = JSON.parse(colorsHidden.value);
        } catch (e) {
            colors = [];
        }
    }

    const sizeSelect = document.getElementById('product-sizes-select');
    const sizes = sizeSelect ? Array.from(sizeSelect.selectedOptions).map(opt => opt.value) : [];

    const mainImageUrl = form.elements['product-image'].value;
    const carouselUrls = [
        form.elements['carousel-url-1']?.value,
        form.elements['carousel-url-2']?.value,
        form.elements['carousel-url-3']?.value,
        form.elements['carousel-url-4']?.value,
    ];

    // Grab the current logged-in reseller ID
    const currentUser = JSON.parse(localStorage.getItem('userInfo'));
    const currentUserId = currentUser ? currentUser._id : undefined;

    const product = {
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
        exploreMoreReseller: form.elements['product-exploreMoreReseller']?.value || undefined,
        
        // Pass current logged-in user _id as owner/seller of the created product
        seller: currentUserId,

        freeTransport: document.getElementById('product-freeTransport')?.checked || false,
        deliveryPriceWindhoek: parseFloat(document.getElementById('product-deliveryPriceWindhoek')?.value) || 0,
        deliveryPriceOutside: parseFloat(document.getElementById('product-deliveryPriceOutside')?.value) || 0,
        cashOnDelivery: document.getElementById('product-cashOnDelivery')?.checked || false,
        warrantyDuration: document.getElementById('product-warrantyDuration')?.value || 'No Warranty',
        promotionStatus: document.getElementById('product-promotionStatus')?.value || 'None',

        safeInsuranceEnabled: document.getElementById('product-safeInsuranceEnabled')?.checked || false,
        safeInsurancePrice: parseFloat(document.getElementById('product-safeInsurancePrice')?.value) || 0,

        showTradeIn: document.getElementById('product-showTradeIn')?.checked,
        showLayBye: document.getElementById('product-showLayBye')?.checked,
        showDeposit: document.getElementById('product-showDeposit')?.checked,
        showDeliveryNationwide: document.getElementById('product-showDeliveryNationwide')?.checked,
        showOneYearWarranty: document.getElementById('product-showOneYearWarranty')?.checked,
        showFifteenDayReturns: document.getElementById('product-showFifteenDayReturns')?.checked
    };
    
    if (product.image && !product.thumbnails.includes(product.image)) {
        product.thumbnails.unshift(product.image);
    }

    const comboProductIdsInput = document.getElementById('combo-product-ids-hidden');
    const isCombo = document.getElementById('product-curate-combos')?.checked;
    
    if (isCombo && comboProductIdsInput && comboProductIdsInput.value) {
        try {
            product.comboProductIds = JSON.parse(comboProductIdsInput.value);
            const comboEndDateValue = document.getElementById('product-comboEndDate')?.value;
            if (comboEndDateValue) {
                product.comboEndDate = new Date(comboEndDateValue);
            }
            const comboPrice = document.getElementById('product-comboSalePrice')?.value;
            if (comboPrice) {
                product.currentPrice = parseFloat(comboPrice);
            }
        } catch (e) {
            console.error("Error parsing combo IDs", e);
        }
    }

    const giftCardEnabled = document.getElementById('product-giftCardEnabled');
    if (giftCardEnabled) {
        product.giftCardEnabled = giftCardEnabled.checked;
        if (giftCardEnabled.checked) {
            product.giftCardType = document.getElementById('product-giftCardType')?.value || 'percent';
            product.giftCardValue = parseFloat(document.getElementById('product-giftCardValue')?.value) || 0;
        }
    }

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
            if (!product.image) product.image = filePaths[0];
            product.thumbnails = [...filePaths, ...product.thumbnails];
        }
    }

    const canvas = document.getElementById('combo-image-canvas');
    if (isCombo && canvas) {
        if (product.comboProductIds && product.comboProductIds.length > 0) {
            try {
                const dataURL = canvas.toDataURL('image/jpeg', 0.9);
                const blob = await (await fetch(dataURL)).blob();
                const file = new File([blob], `combo-${Date.now()}.jpg`, { type: 'image/jpeg' });
                const fd = new FormData();
                fd.append('image', file);
                const res = await fetch('/api/upload/product', { method: 'POST', body: fd });
                if (res.ok) {
                    const json = await res.json();
                    product.image = json.image; 
                    product.thumbnails.unshift(json.image);
                }
            } catch (err) {
                console.error("Combo image upload failed", err);
            }
        }
    }

    if (product.thumbnails) {
        product.thumbnails = [...new Set(product.thumbnails)];
    }

    try {
        if (hiddenId) {
            await api.updateProduct(hiddenId, product);
            alert('Product updated successfully!');
        } else {
            await api.createProduct(product);
            alert('Product created successfully!');
        }
        location.reload();
    } catch (err) {
        if (err.message && err.message.includes('401')) {
            alert('Your session has expired. Please log in again.');
            logout(); 
            return;
        }
        alert(`Error saving product: ${err.message}`);
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
            message: `❌ Password must contain at least ${minLength} characters.`
        };
    }
    
    if (capitalLetterCount < minCapitalLetters) {
        return {
            valid: false,
            message: `❌ Password must contain at least ${minCapitalLetters} capital letter(s).`
        };
    }
    
    if (numberCount < minNumbers) {
        return {
            valid: false,
            message: `❌ Password must contain at least ${minNumbers} number(s).`
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