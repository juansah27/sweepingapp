import { useEffect } from 'react';
import { App } from 'antd';
import { 
  marketplaceNotifications, 
  systemNotifications
} from '../utils/notificationUtils';

const NotificationSystem = () => {
  const { notification } = App.useApp();

  // Show notification when .NET app starts
  const showMarketplaceNotification = (data) => {
    const { marketplace, brand, order_count } = data;
    marketplaceNotifications.started(marketplace, brand, order_count);
  };

  // Show error notification
  const showErrorNotification = (error) => {
    systemNotifications.connectionError();
  };

  // Show info notification
  const showInfoNotification = (message) => {
    systemNotifications.serverError();
  };

  // Show completion notification
  const showCompletionNotification = (marketplace, orderCount) => {
    marketplaceNotifications.completed(marketplace, orderCount);
  };

  // Show timeout notification
  const showTimeoutNotification = (marketplace, runningTime) => {
    marketplaceNotifications.timeout(marketplace, runningTime);
  };

  // Listen for upload completion and marketplace notifications
  useEffect(() => {
    const handleUploadComplete = (event) => {
      const { marketplace_notification } = event.detail;
      if (marketplace_notification && window.showMarketplaceNotification) {
        window.showMarketplaceNotification(marketplace_notification);
      }
    };

    window.addEventListener('marketplace-notification', handleUploadComplete);
    return () => {
      window.removeEventListener('marketplace-notification', handleUploadComplete);
    };
  }, []);

  // Expose functions globally for use by other components
  useEffect(() => {
    window.showMarketplaceNotification = showMarketplaceNotification;
    window.showErrorNotification = showErrorNotification;
    window.showInfoNotification = showInfoNotification;
    window.showCompletionNotification = showCompletionNotification;
    window.showTimeoutNotification = showTimeoutNotification;
    
    return () => {
      delete window.showMarketplaceNotification;
      delete window.showErrorNotification;
      delete window.showInfoNotification;
      delete window.showCompletionNotification;
      delete window.showTimeoutNotification;
    };
  }, []);

  return null; // This component doesn't render anything visible
};

export default NotificationSystem;