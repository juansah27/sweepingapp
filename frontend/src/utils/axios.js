import axios from 'axios';

// Dynamic API URL detection
const getApiBaseUrl = () => {
  // Get current hostname from browser
  const hostname = window.location.hostname;
  
  // If accessing via IP (cross-device), use same IP for backend
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:8001`;
  }
  
  // For localhost, use the proxy (which points to 8001)
  // The proxy will handle the routing without adding /api prefix
  return '';
};

const API_BASE_URL = getApiBaseUrl();
console.log('🚀 Axios initialized with dynamic baseURL:', API_BASE_URL);

// Create axios instance with dynamic base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Increased to 60 seconds for upload operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Use dynamic baseURL
    config.baseURL = getApiBaseUrl();
    console.log('🔄 Dynamic baseURL:', config.baseURL, 'for URL:', config.url);
    
    // Set longer timeout for upload operations
    if (config.url && (config.url.includes('/upload') || config.url.includes('/api/upload') || config.url.includes('/bulk'))) {
      config.timeout = 120000; // 2 minutes for upload operations
      console.log('⏱️ Extended timeout for upload operation:', config.url);
    }
    
    // Don't set Content-Type for FormData - let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);


// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.warn('Request timed out:', error.config?.url);
    }
    
    // Handle 401 errors
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Handle 504 Gateway Timeout
    if (error.response?.status === 504) {
      console.warn('Gateway timeout for:', error.config?.url);
    }
    
    return Promise.reject(error);
  }
);

export default api;
