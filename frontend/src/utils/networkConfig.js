// Network Configuration Utility
// Handles dynamic IP detection and fallback options

import ipDetector from './ipDetector';

class NetworkConfig {
  constructor() {
    this.baseURL = null;
    this.isInitialized = false;
    this.initPromise = this.initialize();
  }

  async initialize() {
    if (this.isInitialized) return;
    
    this.baseURL = await this.getBaseURL();
    console.log('🎯 Final NetworkConfig baseURL:', this.baseURL);
    console.log('🎯 NetworkConfig created at:', new Date().toISOString());
    
    // Validate URL format
    try {
      new URL(this.baseURL);
      console.log('✅ NetworkConfig URL is valid');
    } catch (error) {
      console.error('❌ NetworkConfig URL is invalid:', error);
      console.error('❌ Invalid URL:', this.baseURL);
    }
    
    this.isInitialized = true;
  }

  async getBaseURLSync() {
    if (!this.isInitialized) {
      await this.initPromise;
    }
    return this.baseURL;
  }

  // Synchronous getter with fallback
  getBaseURLSyncFallback() {
    if (this.baseURL) {
      return this.baseURL;
    }
    
    // Smart fallback based on current hostname
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      console.warn('⚠️ NetworkConfig not initialized, using hostname fallback:', hostname);
      return `http://${hostname}:8001`;
    }
    
    // Fallback to localhost
    console.warn('⚠️ NetworkConfig not initialized, using localhost fallback');
    return 'http://localhost:8001';
  }

  async getBaseURL() {
    // Priority order:
    // 1. Custom URL from localStorage (user set)
    // 2. Environment variable (REACT_APP_API_URL)
    // 3. Hostname-based detection (for cross-device)
    // 4. Auto-detect working backend (dynamic IP)
    // 5. Localhost fallback
    
    console.log('🔍 NetworkConfig Debug (SMART DETECTION):');
    console.log('- window.location.hostname:', window.location.hostname);
    console.log('- process.env.REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    
    const customURL = localStorage.getItem('custom_api_url');
    if (customURL) {
      console.log('✅ Using custom API URL:', customURL);
      return customURL.trim();
    }
    
    const envURL = process.env.REACT_APP_API_URL;
    if (envURL) {
      console.log('✅ Using environment API URL:', envURL);
      return envURL.trim();
    }
    
    // Smart hostname-based detection for cross-device access
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const hostnameURL = `http://${hostname}:8001`;
      console.log('✅ Using hostname-based URL (cross-device):', hostnameURL);
      
      // Test if this URL works
      const isReachable = await this.testConnection(hostnameURL);
      if (isReachable) {
        console.log('✅ Hostname-based URL is reachable');
        localStorage.setItem('last_working_backend', hostnameURL);
        return hostnameURL;
      } else {
        console.warn('⚠️ Hostname-based URL not reachable, trying other methods');
      }
    }
    
    // Auto-detect working backend using dynamic IP
    console.log('🔍 Auto-detecting working backend...');
    try {
      const backendURL = await ipDetector.getBackendURL();
      console.log('✅ Auto-detected backend URL:', backendURL);
      
      // Cache the working URL
      localStorage.setItem('last_working_backend', backendURL);
      
      return backendURL;
    } catch (error) {
      console.warn('⚠️ Auto-detection failed:', error);
    }
    
    // Last resort: localhost
    console.warn('⚠️ All detection failed, falling back to localhost');
    return 'http://localhost:8001';
  }

  // Test if an API URL is reachable
  async testConnection(url) {
    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        timeout: 3000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Get current configuration info
  async getConfigInfo() {
    const detectionInfo = await ipDetector.getDetectionInfo();
    return {
      currentURL: this.baseURL,
      hostname: window.location.hostname,
      port: window.location.port,
      isLocalhost: window.location.hostname === 'localhost',
      detectionInfo: detectionInfo
    };
  }

  // Clear cache and reinitialize
  async clearCache() {
    ipDetector.clearCache();
    this.isInitialized = false;
    this.initPromise = this.initialize();
    await this.initPromise;
  }
}

const networkConfig = new NetworkConfig();
export default networkConfig;