// js/cart.js
// Update will be handled by ui.js updateFloatingCartButton function
let updateCartIcon = () => {
    // Placeholder - will be set by ui.js
};

export const setCartUpdateCallback = (callback) => {
    updateCartIcon = callback;
};

export const CartManager = (() => {
    let cart = JSON.parse(localStorage.getItem('namixCart')) || [];

    const save = () => {
        localStorage.setItem('namixCart', JSON.stringify(cart));
        updateCartIcon();
    };

    const addItem = async (productId, quantity = 1, selectedColor = null, selectedSize = null) => {
        // We need to get product details from API to show alert
        const response = await fetch(`/api/products/${productId}`);
        const product = await response.json();
        
        // Find item matching ID, Color, AND Size
        const existingItem = cart.find(item => 
            item.id === productId && 
            item.selectedColor === selectedColor &&
            item.selectedSize === selectedSize
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({ 
                id: productId, 
                quantity: quantity, 
                price: product.currentPrice, 
                image: product.image, 
                title: product.title, 
                selectedColor: selectedColor,
                selectedSize: selectedSize
            });
        }
        save();
        alert(`${product.title} added to cart!`);
    };
    
    const updateQuantity = (productId, newQuantity) => {
        // Logic for unique cart items logic is simplified here; 
        // in full implementation, we should pass color/size to update specific variant
        // For now, updating by ID for simplicity or first match
        const item = cart.find(item => item.id === productId);
        if (item) {
            if (newQuantity <= 0) removeItem(productId);
            else item.quantity = newQuantity;
            save();
        }
    };
    
    const removeItem = (productId) => {
        // Removes all instances of product ID; for variant specific, need to pass variant details
        cart = cart.filter(item => item.id !== productId);
        save();
    };
    
    return { 
        addItem, 
        updateQuantity, 
        removeItem, 
        getCart: () => cart, 
        clearCart: () => { cart = []; save(); }, 
        getCartCount: () => cart.reduce((total, item) => total + item.quantity, 0) 
    };
})();