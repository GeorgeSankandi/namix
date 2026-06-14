import * as api from './api.js';
import * as ui from './ui.js';
import { CartManager } from './cart.js';
import { isLoggedIn as isAdminLoggedIn, getSellerType, getToken } from './adminAuth.js';
import { updateAuthUI } from './auth.js';

// Special curated categories
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

    // Theme Management
    document.body.classList.remove('theme-green', 'theme-red', 'theme-yellow', 'admin-mode');
    updateAuthUI();
    
    if (path === 'trending' || path === 'trade-in') document.body.classList.add('theme-green');
    else if (path === 'on-sale') document.body.classList.add('theme-red');
    else if (path === 'new-arrivals' || path === 'second-hand') document.body.classList.add('theme-yellow');

    ui.clearRoot();
    window.scrollTo(0, 0);

    // Apply Site Settings (Hero Images)
    try {
        const settingsArr = await api.fetchSettings();
        if (Array.isArray(settingsArr)) {
            // Convert array [{key, value}] to object {key: value}
            const settingsObj = settingsArr.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
            ui.updateCategoryData(settingsObj);
        }
    } catch (e) {
        console.warn('Failed to load settings', e);
    }

    // Handle Curated Pages
    if (specialCategories[path]) {
        const products = await api.fetchProducts('', '', path);
        if (path === 'combos') ui.renderCombosPage(products); // Falls back to category page if not defined
        else ui.renderCategoryPage(products, path);
        updateMobileNavActiveState(path, '');
        // Initialize slideshow timers for any newly rendered dynamic heros
        ui.initDynamicHeros();
        return;
    }

    switch (path) {
        case 'home':
            ui.renderHomePage();
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
            else ui.renderNotFound ? ui.renderNotFound() : (location.hash = '#home');
            break;

        case 'seller':
            // Fetch products belonging solely to this specific seller
            const sellerProducts = await api.fetchProducts('', '', '', param);
            ui.renderCategoryPage(sellerProducts, null, 'Reseller Products');
            break;

        case 'cart':
            const cartItems = CartManager.getCart();
            const detailedCartItems = (await Promise.all(
                cartItems.map(async (item) => {
                    const productDetails = await api.fetchProductById(item.id);
                    if (!productDetails) return null;
                    return {
                        ...productDetails,
                        quantity: item.quantity,
                        selectedColor: item.selectedColor || null,
                        selectedSize: item.selectedSize || null
                    };
                })
            )).filter(item => item !== null);
            ui.renderCartPage(detailedCartItems);
            break;

        case 'checkout':
            const itemsForCheckout = CartManager.getCart();
            const detailedItemsForCheckout = (await Promise.all(
                itemsForCheckout.map(async (item) => {
                    const productDetails = await api.fetchProductById(item.id);
                    if (!productDetails) return null;
                    return { 
                        ...productDetails, 
                        quantity: item.quantity,
                        selectedColor: item.selectedColor || null,
                        selectedSize: item.selectedSize || null
                    };
                })
            )).filter(item => item !== null);
            ui.renderCheckoutPage(detailedItemsForCheckout);
            break;

        case 'chat':
            // Optional: param may contain seller id
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

        // Static Pages
        case 'about': ui.renderAboutPage ? ui.renderAboutPage() : ui.renderHomePage(); break;
        case 'how-to-sell': ui.renderHowToSellPage ? ui.renderHowToSellPage() : ui.renderHomePage(); break;
        case 'terms': ui.renderTermsAndConditionsPage ? ui.renderTermsAndConditionsPage() : ui.renderHomePage(); break;
        case 'privacy': ui.renderPrivacyPolicyPage ? ui.renderPrivacyPolicyPage() : ui.renderHomePage(); break;
        case 'faqs': ui.renderFaqsPage ? ui.renderFaqsPage() : ui.renderHomePage(); break;
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
            console.log('router: admin route hit, isAdminLoggedIn=', isAdminLoggedIn());
            if (isAdminLoggedIn()) {
                document.body.classList.add('admin-mode');
                const sellerType = getSellerType();
                const token = getToken();

                console.log('router: admin authenticated, sellerType=', sellerType, 'token=', !!token);

                // If user impersonates seller via URL
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
                    console.log('router: loading admin dashboard data; sellerType=', sellerType, 'token present=', !!token);
                    // Fetch ALL data required for dashboard in parallel
                    const [
                        productsResult, 
                        usersResult, 
                        viewersResult, 
                        transactionsResult, 
                        faqsResult, 
                        settingsResult
                    ] = await Promise.allSettled([
                        api.fetchProducts().catch(e => { console.error('fetchProducts failed:', e); return []; }),
                        (sellerType === 'admin') ? api.fetchAllUsers().catch(e => { console.error('fetchAllUsers failed:', e); return []; }) : Promise.resolve([]),
                        (sellerType === 'admin') ? api.fetchAllViewers().catch(e => { console.error('fetchAllViewers failed:', e); return []; }) : Promise.resolve([]),
                        api.getAllTransactions().catch(e => { console.error('getAllTransactions failed:', e); return []; }),
                        api.fetchFAQs().catch(e => { console.error('fetchFAQs failed:', e); return []; }),
                        api.fetchSettings().catch(e => { console.error('fetchSettings failed:', e); return []; })
                    ]);

                    console.log('router: admin data fetch results', { products: productsResult, users: usersResult, viewers: viewersResult, transactions: transactionsResult, faqs: faqsResult, settings: settingsResult });

                    const allProducts = productsResult.status === 'fulfilled' ? productsResult.value : [];
                    const allUsers = usersResult.status === 'fulfilled' ? usersResult.value : [];
                    const allViewers = viewersResult.status === 'fulfilled' ? viewersResult.value : [];
                    const allTransactions = transactionsResult.status === 'fulfilled' ? transactionsResult.value : [];
                    const allFAQs = faqsResult.status === 'fulfilled' ? faqsResult.value : [];
                    const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : [];

                    console.log('router: calling renderAdminPage with', { productsCount: allProducts.length, usersCount: allUsers.length, viewersCount: allViewers.length, transactionsCount: allTransactions.length, faqsCount: allFAQs.length, sellerType });
                    
                    ui.renderAdminPage(allProducts, allUsers, allViewers, allTransactions, allFAQs, settings, sellerType);
                    console.log('router: rendered admin page successfully');
                } catch (err) {
                    console.error('Error loading admin dashboard:', err);
                    // Still render the page with empty data so user can see it
                    ui.renderAdminPage([], [], [], [], [], [], sellerType);
                }
            } else {
                console.log('router: not admin logged in, redirecting to admin-login');
                location.hash = '#admin-login';
            }
            break;
        
        case 'admin-login':
             ui.renderAdminLoginPage();
             break;

        default:
            ui.renderHomePage();
            break;
    }
    
    updateMobileNavActiveState(path, param);
    // Initialize slideshow timers for any newly rendered dynamic heros
    ui.initDynamicHeros();
};