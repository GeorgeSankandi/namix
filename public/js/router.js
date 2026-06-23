import * as api from './api.js';
import * as ui from './ui.js';
import { CartManager } from './cart.js';
import { isLoggedIn as isAdminLoggedIn, getSellerType, getToken } from './adminAuth.js';
import { updateAuthUI } from './auth.js';

const specialCategories = {
    trending: 'trending',
    'new-arrivals': 'new-arrivals',
    'on-sale': 'on-sale',
    'second-hand': 'second-hand',
    'combos': 'combos'
};

const updateMobileNavActiveState = (path, param) => {
    const mobileNavLinks = document.querySelectorAll('.mobile-bottom-nav a');
    let activeFound = false;
    mobileNavLinks.forEach(link => {
        link.classList.remove('active');
        const linkHash = link.getAttribute('href');
        if (path === 'category' && linkHash === `#category/${param}`) {
            link.classList.add('active');
            activeFound = true;
        }
    });

    if (!activeFound && path === 'category' && ui.categoryData[param]?.parent) {
        const parentCategory = ui.categoryData[param].parent;
        const parentLink = document.querySelector(`.mobile-bottom-nav a[href="#category/${parentCategory}"]`);
        if (parentLink) parentLink.classList.add('active');
    }
};

export const handleRouteChange = async () => {
    const hash = location.hash.slice(1) || 'home';
    const parts = hash.split('/');
    const path = parts[0];
    const param = parts[1] || '';

    document.body.classList.remove('theme-green', 'theme-red', 'theme-yellow', 'admin-mode');
    updateAuthUI();
    
    if (path === 'trending' || path === 'trade-in') document.body.classList.add('theme-green');
    else if (path === 'on-sale') document.body.classList.add('theme-red');
    else if (path === 'new-arrivals' || path === 'second-hand') document.body.classList.add('theme-yellow');

    ui.clearRoot();
    window.scrollTo(0, 0);

    try {
        const settingsArr = await api.fetchSettings();
        if (Array.isArray(settingsArr)) {
            const settingsObj = settingsArr.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
            ui.updateCategoryData(settingsObj);
        }
    } catch (e) {
        console.warn('Failed to load settings', e);
    }

    if (specialCategories[path]) {
        const products = await api.fetchProducts('', '', path);
        if (path === 'combos') ui.renderCombosPage(products);
        else ui.renderCategoryPage(products, path);
        updateMobileNavActiveState(path, '');
        ui.initDynamicHeros();
        return;
    }

    switch (path) {
        case 'home':
            await ui.renderHomePage();
            break;
        
        case 'category':
            const categoryInfo = ui.categoryData[param];
            let categoriesToFetch = [param];
            if (categoryInfo && categoryInfo.subcategories) {
                categoriesToFetch = categoryInfo.subcategories;
            }
            const categoryProducts = await api.fetchProducts(categoriesToFetch.join(','));
            ui.renderCategoryPage(categoryProducts, param);
            break;

        case 'product':
            const product = await api.fetchProductById(param);
            if (product) ui.renderProductPage(product);
            else location.hash = '#home';
            break;

        case 'seller':
            const sellerProducts = await api.fetchProducts('', '', '', param);
            ui.renderCategoryPage(sellerProducts, null, 'Reseller Products');
            break;

        case 'cart':
            const cartItems = CartManager.getCart();
            const detailedCartItems = [];
            const validCartItemsForStorage = [];

            for (const item of cartItems) {
                const productDetails = await api.fetchProductById(item.id);
                if (productDetails) {
                    detailedCartItems.push({
                        ...productDetails,
                        quantity: item.quantity,
                        selectedColor: item.selectedColor || null,
                        selectedSize: item.selectedSize || null
                    });
                    validCartItemsForStorage.push(item);
                }
            }

            // Synchronize local cache if any deleted/invalid products were found in cart
            if (validCartItemsForStorage.length !== cartItems.length) {
                localStorage.setItem('namixCart', JSON.stringify(validCartItemsForStorage));
                ui.updateFloatingCartButton();
            }

            ui.renderCartPage(detailedCartItems);
            break;

        case 'checkout':
            const itemsForCheckout = CartManager.getCart();
            const detailedItemsForCheckout = [];
            const validCheckoutItemsForStorage = [];

            for (const item of itemsForCheckout) {
                const productDetails = await api.fetchProductById(item.id);
                if (productDetails) {
                    detailedItemsForCheckout.push({
                        ...productDetails,
                        quantity: item.quantity,
                        selectedColor: item.selectedColor || null,
                        selectedSize: item.selectedSize || null
                    });
                    validCheckoutItemsForStorage.push(item);
                }
            }

            // Synchronize local cache if any deleted/invalid products were found in checkout
            if (validCheckoutItemsForStorage.length !== itemsForCheckout.length) {
                localStorage.setItem('namixCart', JSON.stringify(validCheckoutItemsForStorage));
                ui.updateFloatingCartButton();
            }

            ui.renderCheckoutPage(detailedItemsForCheckout);
            break;

        case 'chat':
            ui.renderChatPage(param || sessionStorage.getItem('chatTargetSeller') || '');
            break;

        case 'search':
            const searchTerm = decodeURIComponent(param);
            const searchResults = await api.fetchProducts('', searchTerm);
            ui.renderCategoryPage(searchResults, null, searchTerm);
            break;

        case 'payment':
            if (!param) ui.renderPaymentOptionsPage();
            else ui.renderPaymentMethodPage(param);
            break;

        case 'order-confirmation':
            ui.renderOrderConfirmationPage(param);
            break;

        case 'competitions':
            await ui.renderCompetitionsPage();
            break;

        // Static Pages
        case 'about': ui.renderAboutPage ? ui.renderAboutPage() : ui.renderHomePage(); break;
        case 'how-to-sell': ui.renderHowToSellPage ? ui.renderHowToSellPage() : ui.renderHomePage(); break;
        case 'terms': ui.renderTermsAndConditionsPage ? ui.renderTermsAndConditionsPage() : ui.renderHomePage(); break;
        case 'privacy': ui.renderPrivacyPolicyPage ? ui.renderPrivacyPolicyPage() : ui.renderHomePage(); break;
        case 'faqs': 
            if (ui.renderFaqsPage) {
                await ui.renderFaqsPage();
            } else {
                await ui.renderHomePage();
            }
            break;
        case 'contact': ui.renderContactPage ? ui.renderContactPage() : ui.renderHomePage(); break;
        case 'trade-in': ui.renderTradeInPage ? ui.renderTradeInPage() : ui.renderHomePage(); break;
        case 'shipping': ui.renderShippingInfoPage ? ui.renderShippingInfoPage() : ui.renderHomePage(); break;
        case 'returns': ui.renderReturnsPage ? ui.renderReturnsPage() : ui.renderHomePage(); break;

        // Auth Pages
        case 'login': ui.renderLoginPage ? ui.renderLoginPage() : (location.hash = '#home'); break;
        case 'register': ui.renderRegisterPage ? ui.renderRegisterPage() : (location.hash = '#home'); break;
        case 'forgot': ui.renderForgotPage ? ui.renderForgotPage() : (location.hash = '#home'); break;
        case 'reset': ui.renderResetPage ? ui.renderResetPage(param) : (location.hash = '#home'); break;

        // ADMIN ROUTE
        case 'admin':
            if (isAdminLoggedIn()) {
                document.body.classList.add('admin-mode');
                const sellerType = getSellerType();
                const token = getToken();

                if (parts.length >= 3 && parts[1] === 'seller' && sellerType === 'admin') {
                    const sellerEmail = decodeURIComponent(parts.slice(2).join('/'));
                    const allUsersFetch = await api.fetchAllUsers().catch(() => []);
                    const sellerUser = allUsersFetch.find(u => u.email === sellerEmail);
                    if (sellerUser) {
                        const mainAdminInfo = localStorage.getItem('userInfo');
                        if (mainAdminInfo) sessionStorage.setItem('mainAdminInfo', mainAdminInfo);
                        else sessionStorage.setItem('mainAdminInfo', 'SESSION');
                        
                        localStorage.setItem('userInfo', JSON.stringify(sellerUser));
                        location.hash = '#admin';
                        location.reload();
                        return;
                    }
                }

                try {
                    const [
                        productsResult, 
                        usersResult, 
                        viewersResult, 
                        transactionsResult, 
                        faqsResult, 
                        settingsResult,
                        competitionsResult
                    ] = await Promise.allSettled([
                        api.fetchProducts().catch(() => []),
                        (sellerType === 'admin') ? api.fetchAllUsers().catch(() => []) : Promise.resolve([]),
                        (sellerType === 'admin') ? api.fetchAllViewers().catch(() => []) : Promise.resolve([]),
                        api.getAllTransactions().catch(() => []),
                        api.fetchFAQs().catch(() => []),
                        api.fetchSettings().catch(() => []),
                        api.fetchCompetitions().catch(() => [])
                    ]);

                    const allProducts = productsResult.status === 'fulfilled' ? productsResult.value : [];
                    const allUsers = usersResult.status === 'fulfilled' ? usersResult.value : [];
                    const allViewers = viewersResult.status === 'fulfilled' ? viewersResult.value : [];
                    const allTransactions = transactionsResult.status === 'fulfilled' ? transactionsResult.value : [];
                    const allFAQs = faqsResult.status === 'fulfilled' ? faqsResult.value : [];
                    const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : [];
                    const allComps = competitionsResult.status === 'fulfilled' ? competitionsResult.value : [];
                    
                    await ui.renderAdminPage(allProducts, allUsers, allViewers, allTransactions, allFAQs, settings, sellerType, allComps);
                } catch (err) {
                    console.error('Error loading admin dashboard:', err);
                    await ui.renderAdminPage([], [], [], [], [], [], sellerType, []);
                }
            } else {
                location.hash = '#admin-login';
            }
            break;
        
        case 'admin-login':
             ui.renderAdminLoginPage();
             break;

        default:
            await ui.renderHomePage();
            break;
    }
    
    updateMobileNavActiveState(path, param);
    ui.initDynamicHeros();
};