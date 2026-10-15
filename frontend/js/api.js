const API_BASE_URL = (typeof window !== 'undefined' && window.location.port === '8989')
  ? `${window.location.origin}/api`
  : (typeof window !== 'undefined' && window.location.hostname
      ? `${window.location.protocol}//${window.location.hostname}:8989/api`
      : 'http://localhost:8989/api');

// Utility for fetching data with auth
async function fetchAPI(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json'
  };

  const token = localStorage.getItem('jwtToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // For 204 No Content
    if (response.status === 204) return null;

    const textData = await response.text();
    let data;
    try {
      data = textData ? JSON.parse(textData) : null;
    } catch (e) {
      data = textData;
    }
    
    if (!response.ok) {
      throw new Error(data?.message || data || 'API Error');
    }
    
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    if (window.ShopNovaUI) {
        ShopNovaUI.showToast(error.message || 'Something went wrong', 'error');
        ShopNovaUI.playSound('error');
    }
    throw error;
  }
}

// Global Activity Logger
async function logActivity(productId, action) {
  const userId = localStorage.getItem('userId');
  if (!userId) return; // Only log for logged-in users

  try {
    await fetchAPI('/activity', 'POST', {
      userId: parseInt(userId),
      productId: parseInt(productId),
      action: action
    });
  } catch (err) {
    console.error('Failed to log activity', err);
  }
}
