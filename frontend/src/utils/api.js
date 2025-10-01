import axios from 'axios';

console.log('📁 API.js file loaded at:', new Date().toISOString());

// Create axios instance with proxy path
console.log('🚀 Creating axios instance with proxy');
const api = axios.create({
  baseURL: '', // Use proxy path without /api prefix
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    // Enhanced debug logging
    console.log('🔧 API.js Request Interceptor - TIMESTAMP:', new Date().toISOString());
    console.log('- Request URL:', config.url);
    console.log('- Full URL will be:', config.baseURL + config.url);
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ API.js Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors and caching
api.interceptors.response.use(
  (response) => {
    // Log successful requests
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}`);
    return Promise.reject(error);
  }
);

// Cache for API responses
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache utility functions
const getCacheKey = (url, params) => {
  return `${url}?${new URLSearchParams(params).toString()}`;
};

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// Optimized API methods with caching
export const apiService = {
  // GET with caching
  get: async (url, params = {}, useCache = true) => {
    const cacheKey = getCacheKey(url, params);
    
    if (useCache) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        console.log(`📦 Cache hit: ${url}`);
        return cached;
      }
    }
    
    const response = await api.get(url, { params });
    const data = response.data;
    
    if (useCache) {
      setCachedData(cacheKey, data);
    }
    
    return data;
  },

  // POST without caching
  post: async (url, data) => {
    const response = await api.post(url, data);
    return response.data;
  },

  // PUT without caching
  put: async (url, data) => {
    const response = await api.put(url, data);
    return response.data;
  },

  // DELETE without caching
  delete: async (url) => {
    const response = await api.delete(url);
    return response.data;
  },

  // Upload file with progress tracking
  upload: async (url, formData, onProgress) => {
    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },

  // Clear cache
  clearCache: () => {
    cache.clear();
  },

  // Clear specific cache entry
  clearCacheEntry: (url, params = {}) => {
    const cacheKey = getCacheKey(url, params);
    cache.delete(cacheKey);
  }
};

// Specific API endpoints
export const authAPI = {
  login: (credentials) => apiService.post('/login', credentials),
  register: (userData) => apiService.post('/register', userData),
};

export const ordersAPI = {
  getOrders: (page = 1, pageSize = 50) => 
    apiService.get('/api/orders/list', { page, page_size: pageSize }),
  
  getOrdersByBrandBatch: (brand, batch) => 
    apiService.get(`/api/orders/by-brand-batch/${brand}/${batch}`),
  
  getInterfaceSummary: (brand, batch) => 
    apiService.get(`/api/orders/interface-summary/${brand}/${batch}`),
  
  getRealTimeInterfaceStatus: (brand, batch) => 
    apiService.get(`/api/orders/interface-status/real-time/${brand}/${batch}`),
  
  refreshInterfaceStatus: (brand, batch) => 
    apiService.post(`/api/orders/interface-status/refresh/${brand}/${batch}`),
  
  forceRefreshInterfaceStatus: (brand, batch) => 
    apiService.post(`/api/orders/interface-status/force-refresh/${brand}/${batch}`),
  
  updateOrderRemarks: (orderId, remarks) => 
    apiService.post(`/api/orders/${orderId}/remarks`, { remarks }),
  
  getSortedOrders: (date) => 
    apiService.get('/api/orders/sorted-by-interface-status-v2', { date }),
};

export const uploadAPI = {
  uploadFile: (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiService.upload('/api/upload', formData, onProgress);
  },
  
  uploadFileBackground: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiService.post('/api/upload-background', formData);
  },
  
  getUploadStatus: (taskId) => 
    apiService.get(`/api/upload-status/${taskId}`),
};

export const brandAPI = {
  getBrands: () => apiService.get('/api/listbrand'),
  getUniqueBrands: () => apiService.get('/api/listbrand/brands'),
  getUniqueMarketplaces: () => apiService.get('/api/listbrand/marketplaces'),
  createBrand: (brandData) => apiService.post('/api/listbrand', brandData),
  updateBrand: (id, brandData) => apiService.put(`/api/listbrand/${id}`, brandData),
  deleteBrand: (id) => apiService.delete(`/api/listbrand/${id}`),
};

export const historyAPI = {
  getUploadHistory: () => apiService.get('/api/file-upload-history'),
  createUploadHistory: (data) => apiService.post('/api/file-upload-history', data),
  deleteUploadHistory: (id) => apiService.delete(`/api/file-upload-history/${id}`),
};

export default api;
