// Dynamic IP Detection Utility
// Automatically detects and manages network IPs

class IPDetector {
  constructor() {
    this.cachedIPs = this.loadCachedIPs();
    this.detectionPromise = null;
  }

  // Load cached IPs from localStorage
  loadCachedIPs() {
    try {
      const cached = localStorage.getItem('detected_ips');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }

  // Save detected IPs to localStorage
  saveCachedIPs(ips) {
    try {
      localStorage.setItem('detected_ips', JSON.stringify(ips));
    } catch (error) {
      console.warn('Failed to cache IPs:', error);
    }
  }

  // Get IP using WebRTC (most reliable for browser)
  async getIPViaWebRTC() {
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
          if (ipMatch && !ipMatch[1].startsWith('127.')) {
            pc.close();
            resolve(ipMatch[1]);
          }
        }
      };
      
      // Timeout after 3 seconds
      setTimeout(() => {
        pc.close();
        resolve(null);
      }, 3000);
    });
  }

  // Get IP using fetch to external service
  async getIPViaExternalService() {
    try {
      const response = await fetch('https://api.ipify.org?format=json', {
        timeout: 5000
      });
      const data = await response.json();
      return data.ip;
    } catch {
      return null;
    }
  }

  // Get IP using current hostname
  getIPViaHostname() {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return hostname;
    }
    return null;
  }

  // Detect all possible IPs
  async detectAllIPs() {
    if (this.detectionPromise) {
      return this.detectionPromise;
    }

    this.detectionPromise = this._performDetection();
    return this.detectionPromise;
  }

  async _performDetection() {
    console.log('🔍 Detecting network IPs...');
    
    const ips = new Set();
    
    // Add cached IPs first
    this.cachedIPs.forEach(ip => ips.add(ip));
    
    // Try different detection methods
    const methods = [
      () => this.getIPViaWebRTC(),
      () => this.getIPViaHostname(),
      () => this.getIPViaExternalService()
    ];
    
    // Run all methods in parallel
    const results = await Promise.allSettled(
      methods.map(method => method())
    );
    
    // Collect successful results
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        ips.add(result.value);
      }
    });
    
    // Add common local network IPs
    const commonIPs = this.getCommonLocalIPs();
    commonIPs.forEach(ip => ips.add(ip));
    
    const detectedIPs = Array.from(ips);
    
    // Cache the results
    this.saveCachedIPs(detectedIPs);
    
    console.log('✅ Detected IPs:', detectedIPs);
    return detectedIPs;
  }

  // Get common local network IP ranges
  getCommonLocalIPs() {
    const currentHost = window.location.hostname;
    const ips = [];
    
    // If we're already on a network IP, use it
    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      ips.push(currentHost);
    }
    
    // Common local network ranges
    const ranges = [
      '192.168.1.1', '192.168.1.100', '192.168.1.200',
      '192.168.0.1', '192.168.0.100', '192.168.0.200',
      '10.0.0.1', '10.0.0.100', '10.0.0.200',
      '172.16.0.1', '172.16.0.100', '172.16.0.200'
    ];
    
    ips.push(...ranges);
    return ips;
  }

  // Get the best IP for backend connection
  async getBestBackendIP() {
    const ips = await this.detectAllIPs();
    
    // Priority order:
    // 1. Current hostname (if not localhost) - BEST for cross-device access
    // 2. Cached working IP
    // 3. Detected IPs
    // 4. Common local IPs
    
    const currentHost = window.location.hostname;
    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      console.log('🎯 Using current hostname for cross-device access:', currentHost);
      return currentHost;
    }
    
    // Check for cached working IP
    const cachedWorking = localStorage.getItem('last_working_backend');
    if (cachedWorking) {
      const url = new URL(cachedWorking);
      console.log('🎯 Using cached working IP:', url.hostname);
      return url.hostname;
    }
    
    // Return first detected IP
    const bestIP = ips[0] || 'localhost';
    console.log('🎯 Using detected IP:', bestIP);
    return bestIP;
  }

  // Test if an IP is reachable
  async testIP(ip, port = 8001) {
    try {
      const response = await fetch(`http://${ip}:${port}/health`, {
        method: 'GET',
        timeout: 3000
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Find working backend IP
  async findWorkingBackendIP() {
    const ips = await this.detectAllIPs();
    
    console.log('🔍 Testing backend IPs...');
    
    // Test all IPs in parallel
    const tests = ips.map(async (ip) => {
      const isWorking = await this.testIP(ip);
      return { ip, isWorking };
    });
    
    const results = await Promise.all(tests);
    const workingIP = results.find(result => result.isWorking);
    
    if (workingIP) {
      console.log(`✅ Found working backend IP: ${workingIP.ip}`);
      return workingIP.ip;
    }
    
    console.log('❌ No working backend IP found');
    return 'localhost';
  }

  // Get backend URL
  async getBackendURL() {
    const ip = await this.findWorkingBackendIP();
    return `http://${ip}:8001`;
  }

  // Clear cache
  clearCache() {
    localStorage.removeItem('detected_ips');
    localStorage.removeItem('last_working_backend');
    this.cachedIPs = [];
    this.detectionPromise = null;
  }

  // Get detection info
  async getDetectionInfo() {
    const ips = await this.detectAllIPs();
    const bestIP = await this.getBestBackendIP();
    const workingIP = await this.findWorkingBackendIP();
    
    return {
      detectedIPs: ips,
      bestIP: bestIP,
      workingIP: workingIP,
      backendURL: `http://${workingIP}:8001`,
      hostname: window.location.hostname,
      isLocalhost: window.location.hostname === 'localhost'
    };
  }
}

// Create singleton instance
const ipDetector = new IPDetector();

export default ipDetector;
