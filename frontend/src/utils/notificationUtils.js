import { App } from 'antd';

// Hook to get notification instance
export const useNotification = () => {
  const { notification: appNotification } = App.useApp();
  return appNotification;
};

// Standard notification configuration
const NOTIFICATION_CONFIG = {
  placement: 'topRight',
  duration: {
    success: 4,
    info: 5,
    warning: 6,
    error: 8
  },
  icons: {
    success: '✅',
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    upload: '📤',
    processing: '🔄',
    completed: '✅',
    marketplace: '🏪',
    queue: '📋',
    user: '👤',
    file: '📁',
    time: '⏰'
  }
};

// Standard notification functions
export const showNotification = {
  // Success notifications
  success: (title, description, duration = NOTIFICATION_CONFIG.duration.success, notificationInstance = null) => {
    if (!notificationInstance) {
      console.warn('Notification instance not provided. Please use App.useApp() to get notification instance.');
      return;
    }
    notificationInstance.success({
      message: `${NOTIFICATION_CONFIG.icons.success} ${title}`,
      description,
      duration,
      placement: NOTIFICATION_CONFIG.placement
    });
  },

  // Info notifications
  info: (title, description, duration = NOTIFICATION_CONFIG.duration.info, notificationInstance = null) => {
    if (!notificationInstance) {
      console.warn('Notification instance not provided. Please use App.useApp() to get notification instance.');
      return;
    }
    notificationInstance.info({
      message: `${NOTIFICATION_CONFIG.icons.info} ${title}`,
      description,
      duration,
      placement: NOTIFICATION_CONFIG.placement
    });
  },

  // Warning notifications
  warning: (title, description, duration = NOTIFICATION_CONFIG.duration.warning, notificationInstance = null) => {
    if (!notificationInstance) {
      console.warn('Notification instance not provided. Please use App.useApp() to get notification instance.');
      return;
    }
    notificationInstance.warning({
      message: `${NOTIFICATION_CONFIG.icons.warning} ${title}`,
      description,
      duration,
      placement: NOTIFICATION_CONFIG.placement
    });
  },

  // Error notifications
  error: (title, description, duration = NOTIFICATION_CONFIG.duration.error, notificationInstance = null) => {
    if (!notificationInstance) {
      console.warn('Notification instance not provided. Please use App.useApp() to get notification instance.');
      return;
    }
    notificationInstance.error({
      message: `${NOTIFICATION_CONFIG.icons.error} ${title}`,
      description,
      duration,
      placement: NOTIFICATION_CONFIG.placement
    });
  }
};

// Specific notification types
export const uploadNotifications = {
  started: (filename, notificationInstance = null) => {
    showNotification.info(
      'Upload Started',
      `📁 Processing ${filename} in background...`,
      5,
      notificationInstance
    );
  },

  completed: (filename, orderCount, processingTime, notificationInstance = null) => {
    showNotification.success(
      'Upload Completed Successfully!',
      `📊 ${orderCount} orders processed in ${processingTime}`,
      4,
      notificationInstance
    );
  },

  failed: (filename, error, notificationInstance = null) => {
    // Clean up error message - remove redundant prefixes
    let cleanError = error;
    if (cleanError.includes('Background upload failed:')) {
      cleanError = cleanError.replace('Background upload failed:', '').trim();
    }
    if (cleanError.includes('Upload failed:')) {
      cleanError = cleanError.replace('Upload failed:', '').trim();
    }
    
    // Make error more informative with specific error types
    let errorTitle = 'Upload Failed';
    let errorDescription = `Failed to process ${filename}`;
    
    // Add specific guidance based on error type
    if (cleanError.toLowerCase().includes('database') || cleanError.toLowerCase().includes('connection')) {
      errorDescription += '\n\n🔧 Database Connection Issue';
      errorDescription += '\n• Check your internet connection';
      errorDescription += '\n• Try again in a few moments';
    } else if (cleanError.toLowerCase().includes('format') || cleanError.toLowerCase().includes('invalid')) {
      errorDescription += '\n\n📄 File Format Issue';
      errorDescription += '\n• Ensure file follows naming convention: BRAND-MARKETPLACE-DATE-BATCH.xlsx';
      errorDescription += '\n• Check if file is not corrupted';
    } else if (cleanError.toLowerCase().includes('permission') || cleanError.toLowerCase().includes('access')) {
      errorDescription += '\n\n🔒 Permission Issue';
      errorDescription += '\n• Check file permissions';
      errorDescription += '\n• Ensure file is not open in another application';
    } else if (cleanError.toLowerCase().includes('size') || cleanError.toLowerCase().includes('large')) {
      errorDescription += '\n\n📦 File Size Issue';
      errorDescription += '\n• File may be too large';
      errorDescription += '\n• Try splitting into smaller files';
    } else {
      errorDescription += '\n\n🔧 Technical Issue';
      errorDescription += '\n• Please try again';
      errorDescription += '\n• Contact Juan if problem persists';
    }
    
    if (cleanError) {
      errorDescription += `\n\n📋 Technical Details:\n${cleanError}`;
    }
    
    showNotification.error(
      errorTitle,
      errorDescription,
      10, // Longer duration for error messages
      notificationInstance
    );
  },

  noOrders: () => {
    showNotification.info(
      'No Orders to Process',
      'ℹ️ All orders are already interfaced - No action needed',
      5
    );
  },

  databaseError: () => {
    showNotification.warning(
      'Database Connection Issue',
      '⚠️ Using local data - Some features may be limited',
      6
    );
  },

  shopIdNotFound: (brand, marketplace, notificationInstance = null) => {
    showNotification.warning(
      'Shop ID Not Found',
      `⚠️ No shop_id found for ${brand} in ${marketplace}\n\n🔧 Marketplace app may not run correctly without valid shop_id\n\n📋 Action Required: Please add shop_id for ${brand} in ${marketplace} to brand_shops table`,
      8,
      notificationInstance
    );
  },

  shopIdValidationFailed: (brand, marketplace, notificationInstance = null) => {
    showNotification.error(
      'Upload Blocked - Shop ID Required',
      `❌ Upload blocked: No shop_id found for ${brand} in ${marketplace}\n\n🚫 Process stopped to prevent data corruption\n\n📋 Action Required:\n• Add shop_id for ${brand} in ${marketplace} to brand_shops table\n• Or contact administrator to configure shop_id\n\n✅ Upload will be allowed once shop_id is configured`,
      10,
      notificationInstance
    );
  }
};

export const marketplaceNotifications = {
  started: (marketplace, brand, orderCount) => {
    showNotification.success(
      `${marketplace} App Started`,
      `📊 Processing ${orderCount} orders for ${brand} - Running in background`,
      6
    );
  },

  completed: (marketplace, orderCount) => {
    showNotification.success(
      `${marketplace} App Completed!`,
      `📊 Successfully processed ${orderCount} orders - Check output files for results`,
      6
    );
  },

  timeout: (marketplace, runningTime) => {
    showNotification.warning(
      `${marketplace} App Running Long`,
      `🕐 App has been running for ${Math.round(runningTime / 60)} minutes - Check if it's stuck`,
      8
    );
  },

  failed: (marketplace, error) => {
    showNotification.error(
      `${marketplace} App Failed`,
      `❌ Failed to run ${marketplace} app: ${error}`,
      8
    );
  },

  notFound: (marketplace) => {
    showNotification.warning(
      `${marketplace} App Not Found`,
      `⚠️ ${marketplace} executable not found in workspace`,
      6
    );
  },

  noOrderlist: (marketplace) => {
    showNotification.info(
      `${marketplace} No Orderlist`,
      `ℹ️ No Orderlist.txt found for ${marketplace} - Upload a file first`,
      5
    );
  }
};

export const queueNotifications = {
  added: (user, filename) => {
    showNotification.info(
      'Upload Added to Queue',
      `📋 ${filename} added to queue for user ${user}`,
      4
    );
  },

  processing: (user, filename) => {
    showNotification.info(
      'Processing Upload',
      `🔄 Processing ${filename} for user ${user}`,
      5
    );
  },

  completed: (user, filename) => {
    showNotification.success(
      'Queue Processing Completed',
      `✅ ${filename} processed successfully for user ${user}`,
      4
    );
  },

  failed: (user, filename, error) => {
    showNotification.error(
      'Queue Processing Failed',
      `❌ Failed to process ${filename} for user ${user}: ${error}`,
      8
    );
  },

  statusUpdate: (queueLength, processingLength, activeUsers) => {
    showNotification.info(
      'Queue Status Update',
      `📊 Queue: ${queueLength}, Processing: ${processingLength}, Active Users: ${activeUsers}`,
      4
    );
  }
};

export const userNotifications = {
  login: (username) => {
    showNotification.success(
      'Login Successful',
      `👤 Welcome back, ${username}!`,
      4
    );
  },

  logout: () => {
    showNotification.info(
      'Logged Out',
      '👋 You have been logged out successfully',
      4
    );
  },

  sessionExpired: () => {
    showNotification.warning(
      'Session Expired',
      '⏰ Your session has expired, please login again',
      6
    );
  },

  unauthorized: () => {
    showNotification.error(
      'Access Denied',
      '❌ You do not have permission to access this resource',
      8
    );
  }
};

export const systemNotifications = {
  connectionError: () => {
    showNotification.error(
      'Connection Error',
      '❌ Unable to connect to server - Check your internet connection',
      8
    );
  },

  serverError: () => {
    showNotification.error(
      'Server Error',
      '❌ Server encountered an error - Please try again later',
      8
    );
  },

  maintenance: () => {
    showNotification.warning(
      'System Maintenance',
      '⚠️ System is under maintenance - Some features may be unavailable',
      8
    );
  },

  updateAvailable: () => {
    showNotification.info(
      'Update Available',
      'ℹ️ A new version is available - Please refresh your browser',
      6
    );
  }
};

export const fileNotifications = {
  uploaded: (filename, size) => {
    showNotification.success(
      'File Uploaded',
      `📁 ${filename} (${size}) uploaded successfully`,
      4
    );
  },

  processed: (filename, orderCount) => {
    showNotification.success(
      'File Processed',
      `📊 ${filename} processed - ${orderCount} orders found`,
      4
    );
  },

  error: (filename, error) => {
    showNotification.error(
      'File Processing Error',
      `❌ Error processing ${filename}: ${error}`,
      8
    );
  },

  invalid: (filename) => {
    showNotification.warning(
      'Invalid File Format',
      `⚠️ ${filename} has invalid format - Please check file structure`,
      6
    );
  }
};

// Auto-run notifications
export const autoRunNotifications = {
  enabled: () => {
    showNotification.success(
      'Auto-Run Enabled',
      '✅ Marketplace apps will run automatically after upload',
      4
    );
  },

  disabled: () => {
    showNotification.info(
      'Auto-Run Disabled',
      'ℹ️ Marketplace apps will not run automatically',
      4
    );
  },

  running: (marketplace) => {
    showNotification.info(
      'Auto-Run Active',
      `🔄 ${marketplace} app started automatically`,
      5
    );
  }
};

// Workspace notifications
export const workspaceNotifications = {
  created: (user) => {
    showNotification.success(
      'Workspace Created',
      `👤 Workspace created for user ${user}`,
      4
    );
  },

  cleaned: (user, fileCount) => {
    showNotification.info(
      'Workspace Cleaned',
      `🗑️ Cleaned ${fileCount} old files from ${user} workspace`,
      4
    );
  },

  error: (user, error) => {
    showNotification.error(
      'Workspace Error',
      `❌ Error accessing workspace for ${user}: ${error}`,
      8
    );
  }
};

// Export all notification types
const notificationUtils = {
  showNotification,
  uploadNotifications,
  marketplaceNotifications,
  queueNotifications,
  userNotifications,
  systemNotifications,
  fileNotifications,
  autoRunNotifications,
  workspaceNotifications
};

export default notificationUtils;
