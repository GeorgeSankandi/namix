// Re-usable function to get token
const getToken = () => {
    try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (userInfo && userInfo.token) {
            return userInfo.token;
        }
    } catch (e) {
        console.error('Error getting token:', e);
    }
    return null;
};

// --- Products ---
export const fetchProducts = async (category = '', keyword = '', curated = '', seller = '') => {
  try {
    let url = `/api/products?`;
    if (category) url += `category=${encodeURIComponent(category)}&`;
    if (keyword) url += `keyword=${encodeURIComponent(keyword)}&`;
    if (curated) url += `curated=${encodeURIComponent(curated)}&`;
    if (seller) url += `seller=${encodeURIComponent(seller)}&`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return [];
  }
};

export const fetchProductById = async (productId) => {
  try {
    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) {
        if(response.status === 404) return null;
        throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch product ${productId}:`, error);
    return null;
  }
};

export const createProduct = async (productData) => {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: headers,
      credentials: 'same-origin',
      body: JSON.stringify(productData),
    });
    if (!response.ok) {
      let errorMsg = 'Failed to create product';
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorMsg;
      } catch (e) {}
      throw new Error(`${response.status}: ${errorMsg}`);
    }
    return await response.json();
};

export const updateProduct = async (productId, productData) => {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(`/api/products/${productId}`, {
      method: 'PUT',
      headers: headers,
      credentials: 'same-origin',
      body: JSON.stringify(productData),
    });
    if (!response.ok) {
      let errorMsg = 'Failed to update product';
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorMsg;
      } catch (e) {}
      throw new Error(`${response.status}: ${errorMsg}`);
    }
    return await response.json();
};

export const deleteProduct = async (productId) => {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(`/api/products/${productId}`, { 
        method: 'DELETE',
        headers: headers,
        credentials: 'same-origin'
    });
    if (!response.ok) throw new Error('Failed to delete product');
    return await response.json();
};

// --- Users & Auth ---
export const sessionLogin = async (email, password) => {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    const { message } = await response.json().catch(() => ({}));
    throw new Error(message || 'Login failed');
  }
  return await response.json();
};

export const sessionSignup = async (name, email, password, sellerType = 'customer', sellerIdNumber = '', businessRegistrationNumber = '', physicalAddress = '', businessRegistrationDocument = null) => {
  let response;
  if (businessRegistrationDocument) {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('sellerType', sellerType);
    formData.append('sellerIdNumber', sellerIdNumber);
    formData.append('businessRegistrationNumber', businessRegistrationNumber);
    formData.append('physicalAddress', physicalAddress);
    formData.append('businessRegistrationDocument', businessRegistrationDocument);

    response = await fetch('/auth/signup', {
      method: 'POST',
      body: formData,
    });
  } else {
    response = await fetch('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, sellerType, sellerIdNumber, businessRegistrationNumber, physicalAddress })
    });
  }

  if (!response.ok) {
    const { message } = await response.json().catch(() => ({}));
    throw new Error(message || 'Signup failed');
  }
  return await response.json();
};

export const sessionLogout = async () => {
  const response = await fetch('/auth/logout', { method: 'POST' });
  if (!response.ok) throw new Error('Logout failed');
  return await response.json();
};

export const forgotPassword = async (email) => {
  const response = await fetch('/auth/forgot', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
  });
  if (!response.ok) throw new Error('Failed');
  return await response.json();
};

export const resetPassword = async (token, password) => {
  const response = await fetch(`/auth/reset/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
  if (!response.ok) {
    const { message } = await response.json().catch(() => ({}));
    throw new Error(message || 'Failed');
  }
  return await response.json();
};

export const fetchAllUsers = async () => {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch('/api/users', { headers, credentials: 'same-origin' });
    if (!response.ok) throw new Error('Unauthorized to fetch users');
    return await response.json();
};

export const deleteUser = async (userId) => {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`/api/users/${userId}`, { method: 'DELETE', headers, credentials: 'same-origin' });
    if (!response.ok) throw new Error('Failed to delete user');
    return await response.json();
};

export const approveUser = async (userId, isApproved) => {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`/api/users/${userId}/approve`, {
        method: 'PUT',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({ isApproved })
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update approval status');
    }
    return await response.json();
};

// --- Gift Card ---
export const fetchGiftCardBalance = async () => {
    try {
        const response = await fetch('/api/users/balance', {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        });
        if (!response.ok) {
            if (response.status === 401) return { balance: 0 };
            throw new Error('Could not fetch balance');
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch gift card balance:', error);
        return { balance: 0 };
    }
};

// --- Viewers & Reviews ---
export const addViewer = async (productId, opts = {}) => {
  const body = { viewTime: opts.viewTime || new Date() };
  if (opts.name) body.name = opts.name;
  
  const response = await fetch(`/api/products/${productId}/viewers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error('Failed to add viewer');
  return await response.json();
};

export const addReview = async (productId, review) => {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const response = await fetch(`/api/products/${productId}/reviews`, {
    method: 'POST',
    headers: headers,
    credentials: 'same-origin',
    body: JSON.stringify(review)
  });
  if (!response.ok) throw new Error('Failed to add review');
  return await response.json();
};

export const fetchAllViewers = async () => {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch('/api/products/viewers/all', { headers, credentials: 'same-origin' });
    if (!response.ok) throw new Error('Unauthorized to fetch viewers');
    return await response.json();
};

export const deleteViewerById = async (productId, viewerId) => {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(`/api/products/${productId}/viewers/${viewerId}`, {
        method: 'DELETE',
        headers: headers,
        credentials: 'same-origin'
    });
    if (!response.ok) throw new Error('Failed to delete viewer');
    return await response.json();
};

// --- Transactions ---
export const getAllTransactions = async () => {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch('/api/transactions', { headers, credentials: 'same-origin' });
    if (!response.ok) throw new Error('Unauthorized to fetch transactions');
    return await response.json();
};

export const updateTransaction = async (id, transactionData) => {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify(transactionData),
    });
    if (!response.ok) throw new Error('Failed to update transaction');
    return await response.json();
};

// --- FAQs ---
export const fetchFAQs = async () => {
    try {
        const response = await fetch('/api/faqs');
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch FAQs:', error);
        return [];
    }
};

// --- Settings ---
export const fetchSettings = async () => {
  const response = await fetch('/api/settings', { headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' });
  if (!response.ok) throw new Error('Failed to fetch settings');
  return await response.json();
};

export const updateSetting = async (key, value) => {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const response = await fetch('/api/settings', {
    method: 'PUT',
    headers: headers,
    credentials: 'same-origin',
    body: JSON.stringify({ key, value }),
  });
  if (!response.ok) throw new Error('Failed to update setting');
  return await response.json();
};

// --- AI & Uploads ---
export const uploadHero = async (file) => {
  const fd = new FormData();
  fd.append('image', file);
  const response = await fetch('/api/upload/hero', { method: 'POST', body: fd, credentials: 'same-origin' });
  if (!response.ok) throw new Error('Hero upload failed');
  return await response.json();
};

export const generateProductImages = async (title) => {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch('/api/ai/generate-images', {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to generate images');
    }
    return response.json();
};