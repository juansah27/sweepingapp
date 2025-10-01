import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { message } from 'antd';
import api from '../utils/axios';

// Custom hook for optimized upload state management
export const useOptimizedUpload = () => {
  // Core state
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [monitoring, setMonitoring] = useState(false);
  
  // Data state
  const [interfaceOrders, setInterfaceOrders] = useState([]);
  const [notInterfaceOrders, setNotInterfaceOrders] = useState([]);
  const [uploadStats, setUploadStats] = useState({
    totalOrders: 0,
    processedOrders: 0,
    interfaceOrders: 0,
    notInterfaceOrders: 0,
    errors: 0
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('interface');
  
  // Refs for cleanup
  const progressIntervalRef = useRef(null);
  const autoResetTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (autoResetTimeoutRef.current) {
      clearTimeout(autoResetTimeoutRef.current);
      autoResetTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Reset all states
  const resetStates = useCallback(() => {
    cleanup();
    setUploading(false);
    setUploadResult(null);
    setTaskId(null);
    setMonitoring(false);
    setInterfaceOrders([]);
    setNotInterfaceOrders([]);
    setUploadStats({
      totalOrders: 0,
      processedOrders: 0,
      interfaceOrders: 0,
      notInterfaceOrders: 0,
      errors: 0
    });
    setSelectedTab('interface');
    setLoading(false);
  }, [cleanup]);

  // Memoized upload stats
  const memoizedStats = useMemo(() => ({
    ...uploadStats,
    completionRate: uploadStats.totalOrders > 0 
      ? Math.round((uploadStats.processedOrders / uploadStats.totalOrders) * 100) 
      : 0,
    interfaceRate: uploadStats.totalOrders > 0 
      ? Math.round((uploadStats.interfaceOrders / uploadStats.totalOrders) * 100) 
      : 0
  }), [uploadStats]);

  // Handle upload progress
  const handleUploadProgress = useCallback((progressData) => {
    setUploadStats(prev => ({
      ...prev,
      ...progressData
    }));
  }, []);

  // Handle upload completion
  const handleUploadComplete = useCallback((result) => {
    setUploadResult(result);
    setUploading(false);
    setMonitoring(false);
    
    // Process result data
    if (result.interface_orders) {
      setInterfaceOrders(result.interface_orders);
    }
    if (result.not_interface_orders) {
      setNotInterfaceOrders(result.not_interface_orders);
    }
    
    // Auto reset after 30 seconds
    autoResetTimeoutRef.current = setTimeout(() => {
      resetStates();
    }, 30000);
  }, [resetStates]);

  // Handle upload error
  const handleUploadError = useCallback((error) => {
    setUploading(false);
    setMonitoring(false);
    setLoading(false);
    
    message.error(error.message || 'Upload failed');
  }, []);

  // Start upload
  const startUpload = useCallback(async (file) => {
    try {
      setUploading(true);
      setLoading(true);
      
      // Create abort controller
      abortControllerRef.current = new AbortController();
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Start background upload
      const response = await api.post('/upload-background', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: abortControllerRef.current.signal
      });
      
      if (response.data.success) {
        const { task_id } = response.data;
        setTaskId(task_id);
        setMonitoring(true);
        
        message.success('Upload started successfully');
        return task_id;
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        handleUploadError(error);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleUploadError]);

  // Cancel upload
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    resetStates();
    message.info('Upload cancelled');
  }, [resetStates]);

  // Export data
  const exportData = useCallback((data, type) => {
    try {
      if (!data || data.length === 0) {
        message.warning('No data to export');
        return;
      }
      
      const csvContent = [
        // Headers
        Object.keys(data[0] || {}).join(','),
        // Data rows
        ...data.map(row => Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        ).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_orders_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      message.success(`${type} orders exported successfully`);
    } catch (error) {
      message.error('Export failed');
    }
  }, []);

  // Get table data for specific type
  const getTableData = useCallback((type) => {
    switch (type) {
      case 'interface':
        return interfaceOrders;
      case 'not-interface':
        return notInterfaceOrders;
      default:
        return [];
    }
  }, [interfaceOrders, notInterfaceOrders]);

  // Check if upload is active
  const isUploadActive = useMemo(() => {
    return uploading || monitoring || loading;
  }, [uploading, monitoring, loading]);

  // Get upload status
  const getUploadStatus = useCallback(() => {
    if (uploading) return 'uploading';
    if (monitoring) return 'monitoring';
    if (loading) return 'loading';
    if (uploadResult) return 'completed';
    return 'idle';
  }, [uploading, monitoring, loading, uploadResult]);

  return {
    // State
    uploading,
    uploadResult,
    taskId,
    monitoring,
    interfaceOrders,
    notInterfaceOrders,
    uploadStats: memoizedStats,
    loading,
    selectedTab,
    
    // Computed
    isUploadActive,
    uploadStatus: getUploadStatus(),
    
    // Actions
    startUpload,
    cancelUpload,
    resetStates,
    handleUploadProgress,
    handleUploadComplete,
    handleUploadError,
    exportData,
    getTableData,
    setSelectedTab,
    
    // Cleanup
    cleanup
  };
};

// Hook for optimized table data
export const useOptimizedTableData = (data, options = {}) => {
  const {
    searchText = '',
    statusFilter = 'all',
    marketplaceFilter = 'all',
    sortField = null,
    sortOrder = null,
    pageSize = 50,
    currentPage = 1
  } = options;

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = data || [];

    // Apply search filter
    if (searchText) {
      filtered = filtered.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchText.toLowerCase())
        )
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.order_status === statusFilter);
    }

    // Apply marketplace filter
    if (marketplaceFilter !== 'all') {
      filtered = filtered.filter(item => item.marketplace === marketplaceFilter);
    }

    // Apply sorting
    if (sortField && sortOrder) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    return filtered;
  }, [data, searchText, statusFilter, marketplaceFilter, sortField, sortOrder]);

  // Memoized paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return processedData.slice(startIndex, endIndex);
  }, [processedData, currentPage, pageSize]);

  // Memoized unique values for filters
  const uniqueValues = useMemo(() => {
    const statuses = [...new Set((data || []).map(item => item.order_status))];
    const marketplaces = [...new Set((data || []).map(item => item.marketplace))];
    
    return {
      statuses: statuses.filter(Boolean),
      marketplaces: marketplaces.filter(Boolean)
    };
  }, [data]);

  return {
    processedData,
    paginatedData,
    uniqueValues,
    totalItems: processedData.length,
    totalPages: Math.ceil(processedData.length / pageSize)
  };
};

// Hook for performance monitoring
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    memoryUsage: 0,
    componentCount: 0
  });

  const measurePerformance = useCallback((componentName, renderTime) => {
    setMetrics(prev => ({
      ...prev,
      renderTime,
      componentCount: prev.componentCount + 1
    }));
  }, []);

  const getMemoryUsage = useCallback(() => {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }, []);

  return {
    metrics,
    measurePerformance,
    getMemoryUsage
  };
};
