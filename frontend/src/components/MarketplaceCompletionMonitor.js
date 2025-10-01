import { useState, useEffect, useRef, useCallback } from 'react';
import { App } from 'antd';
import api from '../utils/axios';

const MarketplaceCompletionMonitor = () => {
  const { notification } = App.useApp();
  const [monitoring, setMonitoring] = useState(false);
  const [lastStatus, setLastStatus] = useState({});
  const intervalRef = useRef(null);

  // Start monitoring marketplace completion status
  const startMonitoring = useCallback(() => {
    if (monitoring) return;
    
    setMonitoring(true);
    console.log('🔍 Starting marketplace completion monitoring...');
    
    // Initial check only - no auto-refresh
    const checkStatus = async () => {
      try {
        const response = await api.get('/marketplace-completion-status');
        if (response.data.success) {
          checkCompletionStatus(response.data.completion_status);
        }
      } catch (error) {
        console.error('Error checking completion status:', error);
        
        // Handle timeout errors gracefully
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.response?.status === 504) {
          console.warn('Marketplace completion status check timed out');
          // Don't show error notifications for timeout errors
        } else {
          console.error('Failed to check marketplace completion status:', error.message);
        }
      }
    };
    
    checkStatus();
  }, [monitoring]);

  // Stop monitoring
  const stopMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setMonitoring(false);
    console.log('⏹️ Stopped marketplace completion monitoring');
  };

  // Check for completion status changes
  const checkCompletionStatus = (currentStatus) => {
    Object.keys(currentStatus).forEach(marketplace => {
      const current = currentStatus[marketplace];
      const previous = lastStatus[marketplace];
      
      // Check if this is a new completion
      if (previous && 
          previous.completion_status === 'running' && 
          current.completion_status === 'completed') {
        
        // Show completion notification
        if (window.showCompletionNotification) {
          window.showCompletionNotification(
            marketplace.charAt(0).toUpperCase() + marketplace.slice(1),
            current.order_count
          );
        }
        
        console.log(`✅ ${marketplace} app completed successfully!`);
      }
      
      // Check if app failed (no output files after reasonable time)
      if (previous && 
          previous.completion_status === 'running' && 
          current.completion_status === 'running' &&
          current.last_modified) {
        
        // Check if it's been running for more than 10 minutes without completion
        const runningTime = Date.now() / 1000 - current.last_modified;
        if (runningTime > 600) { // 10 minutes
          // Show timeout notification
          if (window.showTimeoutNotification) {
            window.showTimeoutNotification(
              marketplace.charAt(0).toUpperCase() + marketplace.slice(1),
              runningTime
            );
          }
          
          console.log(`⏰ ${marketplace} app running for ${Math.round(runningTime / 60)} minutes`);
        }
      }
    });
    
    // Update last status
    setLastStatus(currentStatus);
  };

  // Start monitoring when component mounts
  useEffect(() => {
    startMonitoring();
    
    // Cleanup on unmount
    return () => {
      stopMonitoring();
    };
  }, []);

  // Expose functions globally for manual control
  useEffect(() => {
    window.startMarketplaceMonitoring = startMonitoring;
    window.stopMarketplaceMonitoring = stopMonitoring;
    
    return () => {
      delete window.startMarketplaceMonitoring;
      delete window.stopMarketplaceMonitoring;
    };
  }, []); // Remove monitoring dependency to prevent infinite re-renders

  return null; // This component doesn't render anything visible
};

export default MarketplaceCompletionMonitor;
