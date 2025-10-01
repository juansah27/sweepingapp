// Environment Configuration
// Flexible configuration without hardcoding

const config = {
  // Default values
  defaults: {
    host: 'localhost',
    port: 8001,
    protocol: 'http',
    timeout: 30000
  },
  
  // Environment variable mapping
  env: {
    apiUrl: process.env.REACT_APP_API_URL,
    host: process.env.REACT_APP_DEFAULT_HOST,
    port: process.env.REACT_APP_DEFAULT_PORT,
    protocol: process.env.REACT_APP_DEFAULT_PROTOCOL,
    timeout: process.env.REACT_APP_API_TIMEOUT,
    debug: process.env.REACT_APP_DEBUG === 'true'
  },
  
  // Network detection settings
  network: {
    enabled: true,
    preferredInterfaces: ['Wi-Fi', 'Ethernet', 'Local Area Connection'],
    excludeIPs: ['127.0.0.1', '::1'],
    timeout: 3000
  }
};

// Get API base URL
export const getApiBaseUrl = () => {
  // Priority 1: Full URL from environment
  if (config.env.apiUrl) {
    return config.env.apiUrl;
  }
  
  // Priority 2: Construct from individual env vars
  const host = config.env.host || config.defaults.host;
  const port = config.env.port || config.defaults.port;
  const protocol = config.env.protocol || config.defaults.protocol;
  
  if (config.env.host || config.env.port) {
    const constructedUrl = `${protocol}://${host}:${port}`;
    return constructedUrl;
  }
  
  // Priority 3: Auto-detect network IP
  if (config.network.enabled) {
    const detectedIP = detectNetworkIP();
    if (detectedIP) {
      const detectedUrl = `${config.defaults.protocol}://${detectedIP}:8001`;
      return detectedUrl;
    }
  }
  
  // Priority 4: Default fallback
  const defaultUrl = `${config.defaults.protocol}://${config.defaults.host}:${config.defaults.port}`;
  return defaultUrl;
};

// Auto-detect network IP
const detectNetworkIP = () => {
  try {
    // Check localStorage for cached working backend
    const cachedBackend = localStorage.getItem('last_working_backend');
    if (cachedBackend) {
      console.log('🔍 Using cached backend:', cachedBackend);
      return cachedBackend.replace('http://', '').replace(':8001', '');
    }

    // Get current host IP from window.location
    const currentHost = window.location.hostname;
    if (currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      console.log('🔍 Using current host IP:', currentHost);
      return currentHost;
    }

    // Skip WebRTC detection for now to avoid initialization issues
    console.log('🔍 Using default localhost fallback');
    return null;
  } catch (error) {
    console.warn('Error detecting network IP:', error.message);
    return null;
  }
};

// Detect IP using WebRTC
const detectIPFromWebRTC = () => {
  return new Promise((resolve) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    pc.createDataChannel('');
    pc.createOffer().then(offer => pc.setLocalDescription(offer));
    
    pc.onicecandidate = (ice) => {
      if (ice && ice.candidate && ice.candidate.candidate) {
        const candidate = ice.candidate.candidate;
        const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
        if (ipMatch && !ipMatch[1].startsWith('127.') && !ipMatch[1].startsWith('169.254.')) {
          console.log('🔍 Detected IP via WebRTC:', ipMatch[1]);
          resolve(ipMatch[1]);
          pc.close();
        }
      }
    };
    
    // Timeout after 3 seconds
    setTimeout(() => {
      pc.close();
      resolve(null);
    }, 3000);
  });
};

// Get API timeout
export const getApiTimeout = () => {
  return parseInt(config.env.timeout) || config.defaults.timeout;
};

// Check if debug mode is enabled
export const isDebugMode = () => {
  return config.env.debug || false;
};

// Get all configuration
export const getConfig = () => {
  return {
    apiBaseUrl: getApiBaseUrl(),
    timeout: getApiTimeout(),
    debug: isDebugMode(),
    network: config.network
  };
};

export default config;
