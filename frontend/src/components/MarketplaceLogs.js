import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Select,
  Input,
  Spin,
  Alert,
  Modal,
  Badge,
  Tooltip,
  Tabs,
  message,
  Empty,
  App
} from 'antd';
import {
  ReloadOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ShopOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import ErrorBoundary from './ErrorBoundary';
import api from '../utils/axios';
import './MarketplaceLogs.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

// Custom hooks for better state management
const useMarketplaceLogs = (notification) => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [filters, setFilters] = useState({
    marketplace: null,
    level: null,
    user: null,
    search: ''
  });
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [lastRequestTime, setLastRequestTime] = useState(0);

  const fetchLogs = useCallback(async (page = 1, pageSize = 20, forceRefresh = false) => {
    // Create request key for deduplication
    const requestKey = `${page}-${pageSize}-${filters.marketplace}-${filters.level}-${filters.user}`;
    const now = Date.now();
    
    // Check if there's already a pending request for the same parameters
    if (pendingRequest === requestKey && !forceRefresh) {
      console.log('🚫 Skipping duplicate request:', requestKey);
      return;
    }
    
    // Prevent requests that are too close together (within 500ms)
    if (!forceRefresh && now - lastRequestTime < 500) {
      console.log('🚫 Skipping request too close to previous:', requestKey, 'time diff:', now - lastRequestTime);
      return;
    }
    
    console.log('🔄 Making request:', requestKey, 'forceRefresh:', forceRefresh);
    setPendingRequest(requestKey);
    setLastRequestTime(now);
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        limit: pageSize,
        offset: (page - 1) * pageSize
      });

      if (filters.marketplace) params.append('marketplace', filters.marketplace);
      if (filters.level) params.append('level', filters.level);
      if (filters.user) params.append('user', filters.user);

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await api.get(`/marketplace-app-logs?${params}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);

      // Axios automatically parses JSON and throws on HTTP error status
      const data = response.data;
      
      // Handle marketplace-app-logs response structure
      if (data.logs) {
        setLogs(data.logs || []);
        setSummary(data.summary || {});
        setPagination(prev => ({
          ...prev,
          current: page,
          pageSize: pageSize,
          total: data.pagination?.total || data.total || 0
        }));
        setLastFetch(new Date());
        
        if (data.cached) {
          notification.success({
            message: 'Data Loaded from Cache',
            description: 'Using cached data for faster loading. Click "Refresh Cache" to get latest data.',
            duration: 3,
            placement: 'topRight'
          });
        }
      } else {
        throw new Error(data.message || 'Failed to fetch logs');
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      
      let errorMessage = 'Failed to load logs';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. The server may be slow or unresponsive.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      notification.error({
        message: 'Error Loading Data',
        description: errorMessage,
        duration: 5,
        placement: 'topRight'
      });
    } finally {
      setLoading(false);
      setPendingRequest(null);
    }
  }, [filters.marketplace, filters.level, filters.user, notification, lastRequestTime]);

  const refreshCache = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for cache refresh

      const response = await api.post('/marketplace-logs/refresh', {}, { 
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);

      // Axios automatically handles success/error status
      notification.success({
        message: 'Cache Refreshed',
        description: 'Cache has been successfully refreshed. Loading latest data...',
        duration: 3,
        placement: 'topRight'
      });
      await fetchLogs(pagination.current, pagination.pageSize, true);
    } catch (error) {
      let errorMessage = 'Failed to refresh cache';
      if (error.name === 'AbortError') {
        errorMessage = 'Cache refresh timed out. Please try again.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error while refreshing cache.';
      } else {
        errorMessage = error.message;
      }
      
      notification.error({
        message: 'Cache Refresh Failed',
        description: errorMessage,
        duration: 5,
        placement: 'topRight'
      });
    }
  }, [fetchLogs, pagination, notification]);

  return {
    loading,
    logs,
    summary,
    pagination,
    filters,
    error,
    lastFetch,
    fetchLogs,
    refreshCache,
    setFilters,
    setPagination
  };
};

const useLogDetails = (notification) => {
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [logDetails, setLogDetails] = useState(null);
  const [streamingTerminalLogs, setStreamingTerminalLogs] = useState(false);
  const [streamingLogs, setStreamingLogs] = useState([]);
  const [appLogs, setAppLogs] = useState([]);
  const [appLogsLoading, setAppLogsLoading] = useState(false);
  const [appLogsAutoRefresh, setAppLogsAutoRefresh] = useState(false);
  const [lastAppLogsCount, setLastAppLogsCount] = useState(0);
  const [lastAppLogsRequestTime, setLastAppLogsRequestTime] = useState(0);
  const eventSourceRef = useRef(null);
  const appLogsIntervalRef = useRef(null);

  const fetchLogDetails = useCallback(async (logId) => {
    setDetailLoading(true);
    try {
      const response = await api.get(`/api/marketplace-logs/${logId}`);
      setLogDetails(response.data.log_details);
    } catch (error) {
      console.error('Error fetching log details:', error);
      notification.error({
        message: 'Failed to Load Log Details',
        description: error.message,
        duration: 3,
        placement: 'topRight'
      });
    } finally {
      setDetailLoading(false);
    }
  }, [notification]);


  const fetchAppLogs = useCallback(async (marketplace, user, forceRefresh = false) => {
    const now = Date.now();
    
    // Prevent requests that are too close together (within 2 seconds for app logs)
    if (!forceRefresh && now - lastAppLogsRequestTime < 2000) {
      console.log('🚫 Skipping app logs request too close to previous:', 'time diff:', now - lastAppLogsRequestTime);
      return;
    }
    
    setAppLogsLoading(true);
    setLastAppLogsRequestTime(now);
    
    try {
      const params = new URLSearchParams({ limit: 200 });
      if (marketplace) params.append('marketplace', marketplace);
      if (user) params.append('user', user);
      if (forceRefresh) params.append('_t', Date.now().toString()); // Cache busting

      const response = await api.get(`/marketplace-app-logs?${params}`);
      const newLogs = response.data.logs || [];
        
      // Check if there are new logs
      if (newLogs.length > lastAppLogsCount && lastAppLogsCount > 0) {
        const newCount = newLogs.length - lastAppLogsCount;
        notification.info({
          message: 'New Log Entries',
          description: `${newCount} new log entries have been added`,
          duration: 3,
          placement: 'topRight'
        });
      }
      
      setAppLogs(newLogs);
      setLastAppLogsCount(newLogs.length);
      
      if (forceRefresh) {
        notification.success({
          message: 'App Logs Refreshed',
          description: 'Latest app logs have been loaded',
          duration: 2,
          placement: 'topRight'
        });
      }
    } catch (error) {
      console.error('Error fetching app logs:', error);
      notification.error({
        message: 'Failed to Load App Logs',
        description: error.message,
        duration: 3,
        placement: 'topRight'
      });
    } finally {
      setAppLogsLoading(false);
    }
  }, [notification, lastAppLogsCount, lastAppLogsRequestTime]);

  const startStreamingAppLogs = useCallback((marketplace, user) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const params = new URLSearchParams();
    if (marketplace) params.append('marketplace', marketplace);
    if (user) params.append('user', user);

    try {
      const eventSource = new EventSource(`/api/marketplace-app-logs/stream?${params}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('App logs EventSource connection opened');
        setStreamingTerminalLogs(true);
        notification.success({
          message: 'Live App Logs Started',
          description: `Connected to live app logs for ${marketplace} - ${user}`,
          duration: 3,
          placement: 'topRight'
        });
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            console.error('App logs streaming error:', data.error);
            notification.error({
              message: 'App Logs Streaming Error',
              description: data.error,
              duration: 5,
              placement: 'topRight'
            });
            return;
          }
          
          if (data.logs && data.logs.length > 0) {
            setAppLogs(prev => {
              // Merge new logs with existing ones, avoiding duplicates
              const existingIds = new Set(prev.map(log => log.id));
              const newLogs = data.logs.filter(log => !existingIds.has(log.id));
              
              if (newLogs.length > 0) {
                notification.info({
                  message: 'New App Logs',
                  description: `${newLogs.length} new app log entries received`,
                  duration: 2,
                  placement: 'topRight'
                });
              }
              
              // Add new logs to the beginning and keep only last 100
              const combined = [...newLogs, ...prev];
              return combined.slice(0, 100);
            });
          }
        } catch (error) {
          console.error('Error parsing app logs streaming data:', error);
          notification.warning({
            message: 'App Logs Parse Error',
            description: 'Failed to parse streaming app logs data',
            duration: 3,
            placement: 'topRight'
          });
        }
      };

      eventSource.onerror = (error) => {
        console.error('App logs EventSource failed:', error);
        setStreamingTerminalLogs(false);
        
        if (eventSource.readyState === EventSource.CLOSED) {
          notification.error({
            message: 'Live App Logs Disconnected',
            description: 'Connection to live app logs has been closed. Click to reconnect.',
            duration: 0,
            placement: 'topRight',
            action: (
              <Button 
                size="small" 
                type="primary" 
                onClick={() => startStreamingAppLogs(marketplace, user)}
              >
                Reconnect
              </Button>
            )
          });
        } else {
          notification.error({
            message: 'Live App Logs Error',
            description: 'Failed to connect to live app logs. Please check your connection.',
            duration: 5,
            placement: 'topRight'
          });
        }
      };

      // Set a timeout to close connection if no data received
      const timeoutId = setTimeout(() => {
        if (eventSource.readyState === EventSource.CONNECTING) {
          eventSource.close();
          notification.warning({
            message: 'App Logs Connection Timeout',
            description: 'Live app logs streaming connection timed out. Please try again.',
            duration: 5,
            placement: 'topRight'
          });
        }
      }, 10000);

      eventSource.addEventListener('open', () => {
        clearTimeout(timeoutId);
      });

    } catch (error) {
      console.error('Error creating app logs EventSource:', error);
      notification.error({
        message: 'App Logs Streaming Setup Failed',
        description: 'Failed to initialize live app logs streaming. Please try again.',
        duration: 5,
        placement: 'topRight'
      });
    }
  }, [notification]);

  const startStreamingTerminalLogs = useCallback((marketplace, user) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const params = new URLSearchParams();
    if (marketplace) params.append('marketplace', marketplace);
    if (user) params.append('user', user);

    try {
    const eventSource = new EventSource(`/api/marketplace-terminal-logs/stream?${params}`);
    eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('EventSource connection opened');
        setStreamingTerminalLogs(true);
        notification.success({
          message: 'Live Streaming Started',
          description: `Connected to live logs for ${marketplace} - ${user}`,
          duration: 3,
          placement: 'topRight'
        });
      };

    eventSource.onmessage = (event) => {
      try {
        const logEntry = JSON.parse(event.data);
        if (logEntry.error) {
          console.error('Streaming error:', logEntry.error);
            notification.error({
              message: 'Streaming Error',
              description: logEntry.error,
              duration: 5,
              placement: 'topRight'
            });
          return;
        }
        
        setStreamingLogs(prev => {
          const newLogs = [...prev, logEntry];
            return newLogs.slice(-100); // Keep only last 100 logs
        });
      } catch (error) {
        console.error('Error parsing streaming log:', error);
          notification.warning({
            message: 'Data Parse Error',
            description: 'Failed to parse streaming log data',
            duration: 3,
            placement: 'topRight'
          });
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource failed:', error);
      setStreamingTerminalLogs(false);
        
        // Check if it's a connection error or server error
        if (eventSource.readyState === EventSource.CLOSED) {
          notification.error({
            message: 'Live Streaming Disconnected',
            description: 'Connection to live logs has been closed. Click to reconnect.',
            duration: 0, // Don't auto-close
            placement: 'topRight',
            action: (
              <Button 
                size="small" 
                type="primary" 
                onClick={() => startStreamingTerminalLogs(marketplace, user)}
              >
                Reconnect
              </Button>
            )
          });
        } else {
          notification.error({
            message: 'Live Streaming Error',
            description: 'Failed to connect to live logs. Please check your connection.',
            duration: 5,
            placement: 'topRight'
          });
        }
      };

      // Set a timeout to close connection if no data received
      const timeoutId = setTimeout(() => {
        if (eventSource.readyState === EventSource.CONNECTING) {
          eventSource.close();
          notification.warning({
            message: 'Connection Timeout',
            description: 'Live streaming connection timed out. Please try again.',
            duration: 5,
            placement: 'topRight'
          });
        }
      }, 10000); // 10 second timeout

      // Clear timeout when connection is established
      eventSource.addEventListener('open', () => {
        clearTimeout(timeoutId);
      });

    } catch (error) {
      console.error('Error creating EventSource:', error);
      notification.error({
        message: 'Streaming Setup Failed',
        description: 'Failed to initialize live streaming. Please try again.',
        duration: 5,
        placement: 'topRight'
      });
    }
  }, []);

  const stopStreamingTerminalLogs = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStreamingTerminalLogs(false);
    notification.info({
      message: 'Live Streaming Stopped',
      description: 'Live log streaming has been stopped.',
      duration: 3,
      placement: 'topRight'
    });
  }, [notification]);

  const showLogDetails = useCallback(async (log) => {
    setSelectedLog(log);
    setDetailModalVisible(true);
    setLastAppLogsCount(0); // Reset counter for new log session
    await Promise.all([
      fetchLogDetails(log.id),
      fetchAppLogs(log.marketplace, log.user)
    ]);
    
    // Start both terminal and app logs streaming
    startStreamingTerminalLogs(log.marketplace, log.user);
    startStreamingAppLogs(log.marketplace, log.user);
    
    // Start auto-refresh for app logs
    setAppLogsAutoRefresh(true);
  }, [fetchLogDetails, fetchAppLogs, startStreamingTerminalLogs, startStreamingAppLogs, setLastAppLogsCount, setAppLogsAutoRefresh, notification]);

  const closeModal = useCallback(() => {
    setDetailModalVisible(false);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (appLogsIntervalRef.current) {
      clearInterval(appLogsIntervalRef.current);
      appLogsIntervalRef.current = null;
    }
    setStreamingTerminalLogs(false);
    setAppLogsAutoRefresh(false);
    setLastAppLogsCount(0);
    setSelectedLog(null);
    setLogDetails(null);
    setStreamingLogs([]);
  }, [setLastAppLogsCount, setAppLogsAutoRefresh]);

  // Auto-refresh app logs when enabled
  useEffect(() => {
    if (appLogsAutoRefresh && selectedLog) {
      appLogsIntervalRef.current = setInterval(() => {
        fetchAppLogs(selectedLog.marketplace, selectedLog.user, true);
      }, 10000); // Refresh every 10 seconds
    } else {
      if (appLogsIntervalRef.current) {
        clearInterval(appLogsIntervalRef.current);
        appLogsIntervalRef.current = null;
      }
    }

    return () => {
      if (appLogsIntervalRef.current) {
        clearInterval(appLogsIntervalRef.current);
        appLogsIntervalRef.current = null;
      }
    };
  }, [appLogsAutoRefresh, selectedLog, fetchAppLogs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (appLogsIntervalRef.current) {
        clearInterval(appLogsIntervalRef.current);
      }
    };
  }, []);

  return {
    selectedLog,
    detailModalVisible,
    detailLoading,
    logDetails,
    streamingTerminalLogs,
    streamingLogs,
    appLogs,
    appLogsLoading,
    appLogsAutoRefresh,
    setAppLogsAutoRefresh,
    lastAppLogsCount,
    showLogDetails,
    closeModal,
    fetchAppLogs
  };
};

const useAutoRefresh = (fetchLogs, pagination) => {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLogs(pagination.current, pagination.pageSize);
      }, refreshInterval * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, fetchLogs, pagination.current, pagination.pageSize]);

  return { autoRefresh, setAutoRefresh, refreshInterval, setRefreshInterval };
};

const MarketplaceLogs = () => {
  const { notification } = App.useApp();
  
  const {
    loading,
    logs,
    summary,
    pagination,
    filters,
    error,
    lastFetch,
    fetchLogs,
    refreshCache,
    setFilters,
    setPagination
  } = useMarketplaceLogs(notification);

  const {
    selectedLog,
    detailModalVisible,
    detailLoading,
    logDetails,
    streamingTerminalLogs,
    streamingLogs,
    appLogs,
    appLogsLoading,
    appLogsAutoRefresh,
    setAppLogsAutoRefresh,
    lastAppLogsCount,
    showLogDetails,
    closeModal,
    fetchAppLogs
  } = useLogDetails(notification);

  const { autoRefresh, setAutoRefresh, refreshInterval, setRefreshInterval } = useAutoRefresh(fetchLogs, pagination);

  // Debounced filter changes to prevent excessive re-renders
  const debouncedFilterChange = useRef(null);
  
  const handleFilterChange = useCallback((key, value) => {
    if (debouncedFilterChange.current) {
      clearTimeout(debouncedFilterChange.current);
    }
    
    debouncedFilterChange.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, [key]: value }));
      setPagination(prev => ({ ...prev, current: 1 }));
    }, 300); // 300ms debounce
  }, [setFilters, setPagination]);

  // Handle search with debouncing
  const handleSearch = useCallback((value) => {
    if (debouncedFilterChange.current) {
      clearTimeout(debouncedFilterChange.current);
    }
    
    debouncedFilterChange.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value }));
      setPagination(prev => ({ ...prev, current: 1 }));
    }, 500); // 500ms debounce for search
  }, [setFilters, setPagination]);

  // Get status color
  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'empty': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  }, []);

  // Get marketplace color
  const getMarketplaceColor = useCallback((marketplace) => {
    const colors = {
      'SHOPEE': 'blue',
      'LAZADA': 'red',
      'TOKOPEDIA': 'green',
      'BUKALAPAK': 'orange',
      'BLIBLI': 'purple',
      'TIKTOK': 'cyan',
      'GINEE': 'magenta',
      'JUBELIO': 'lime',
      'DESTY': 'gold',
      'ZALORA': 'volcano'
    };
    return colors[marketplace?.toUpperCase()] || 'default';
  }, []);

  // Format date
  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  // Memoized table columns with stable references
  const columns = useMemo(() => [
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
      width: 100,
      render: (user) => (
        <Tag icon={<UserOutlined />} color="blue">
          {user}
        </Tag>
      ),
      filters: summary?.users?.map(user => ({ text: user, value: user })) || [],
      onFilter: (value, record) => record.user === value,
    },
    {
      title: 'Marketplace',
      dataIndex: 'marketplace',
      key: 'marketplace',
      width: 120,
      render: (marketplace) => (
        <Tag icon={<ShopOutlined />} color={getMarketplaceColor(marketplace)}>
          {marketplace}
        </Tag>
      ),
      filters: summary?.marketplaces?.map(mp => ({ text: mp, value: mp })) || [],
      onFilter: (value, record) => record.marketplace === value,
    },
    {
      title: 'Log File',
      dataIndex: 'log_file',
      key: 'log_file',
      width: 200,
      render: (filename) => (
        <Text code style={{ fontSize: '12px' }}>
          <FileTextOutlined /> {filename}
        </Text>
      ),
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level) => (
        <Tag color={
          level === 'ERROR' ? 'red' : 
          level === 'WARNING' ? 'orange' : 
          level === 'INFO' ? 'blue' : 'default'
        }>
          {level}
        </Tag>
      ),
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      width: 300,
      render: (message) => (
        <Text style={{ fontSize: '12px' }} ellipsis={{ tooltip: message }}>
          {message}
        </Text>
      ),
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      render: (time) => (
        <Text type="secondary" style={{ fontSize: '11px' }}>
          <ClockCircleOutlined /> {time}
        </Text>
      ),
      sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => showLogDetails(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ], [summary?.users, summary?.marketplaces, getMarketplaceColor, formatDate, showLogDetails]);

  // Initial load - only run once on mount
  useEffect(() => {
    fetchLogs();
  }, []); // Empty dependency array to run only once

  // Filter effect with debouncing to prevent rapid requests
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchLogs(pagination.current, pagination.pageSize);
    }, 300); // Increased delay to prevent rapid requests

    return () => clearTimeout(timeoutId);
  }, [filters.marketplace, filters.level, filters.user, fetchLogs, pagination.current, pagination.pageSize]);

  // Cleanup debounced timeout on unmount
  useEffect(() => {
    return () => {
      if (debouncedFilterChange.current) {
        clearTimeout(debouncedFilterChange.current);
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="marketplace-logs-container">
      {/* Header */}
      <div className="logs-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <FileTextOutlined style={{ marginRight: 8 }} />
              Marketplace Execution Logs
            </Title>
            <Text type="secondary">
              Monitor order processing and execution logs across all marketplaces
              {autoRefresh && (
                <Tag color="green" style={{ marginLeft: 8 }}>
                  <ClockCircleOutlined /> Auto-refresh every {refreshInterval}s
                </Tag>
              )}
              {lastFetch && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  <DatabaseOutlined /> Last updated: {formatDate(lastFetch.toISOString())}
                </Tag>
              )}
            </Text>
          </Col>
          <Col>
            <Space>
              <Select
                value={refreshInterval}
                onChange={setRefreshInterval}
                style={{ width: 120 }}
                disabled={!autoRefresh}
              >
                <Option value={10}>10s</Option>
                <Option value={30}>30s</Option>
                <Option value={60}>1m</Option>
                <Option value={300}>5m</Option>
              </Select>
              <Button 
                type={autoRefresh ? "primary" : "default"}
                icon={<ReloadOutlined />} 
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="logs-refresh-btn"
              >
                {autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}
              </Button>
              <Button 
                type="default"
                icon={<ThunderboltOutlined />} 
                onClick={() => {
                  if (selectedLog) {
                    if (streamingTerminalLogs) {
                      closeModal();
                    } else {
                      showLogDetails(selectedLog);
                    }
                  } else {
                    notification.warning({
                      message: 'No Log Selected',
                      description: 'Please select a log entry to view real-time streaming',
                      duration: 3,
                      placement: 'topRight'
                    });
                  }
                }}
                className="logs-refresh-btn"
                title="View real-time logs"
              >
                {streamingTerminalLogs ? 'Stop Live View' : 'Live View'}
              </Button>
              <Button 
                icon={<ThunderboltOutlined />} 
                onClick={refreshCache}
                className="logs-refresh-btn"
                title="Force refresh cache"
              >
                Refresh Cache
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => fetchLogs(pagination.current, pagination.pageSize)}
                className="logs-refresh-btn"
                loading={loading}
              >
                Refresh Now
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          message="Error Loading Data"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Summary Statistics */}
      {summary && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="logs-summary-card">
              <Statistic
                title="Total Logs"
                value={summary.total_logs || pagination.total}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="logs-summary-card">
              <Statistic
                title="Active Marketplaces"
                value={summary.marketplaces?.length || 0}
                prefix={<ShopOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="logs-summary-card">
              <Statistic
                title="Active Users"
                value={summary.users?.length || 0}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="logs-summary-card">
              <Statistic
                title="Recent Logs (24h)"
                value={summary.recent_executions || 0}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card className="logs-filters-card">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} lg={6}>
            <Select
              placeholder="Filter by Marketplace"
              allowClear
              style={{ width: '100%' }}
              value={filters.marketplace}
              onChange={(value) => handleFilterChange('marketplace', value)}
            >
              {summary?.marketplaces?.map(mp => (
                <Option key={mp} value={mp}>{mp}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select
              placeholder="Filter by Log Level"
              allowClear
              style={{ width: '100%' }}
              value={filters.level}
              onChange={(value) => handleFilterChange('level', value)}
            >
              <Option value="INFO">INFO</Option>
              <Option value="WARNING">WARNING</Option>
              <Option value="ERROR">ERROR</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select
              placeholder="Filter by User"
              allowClear
              style={{ width: '100%' }}
              value={filters.user}
              onChange={(value) => handleFilterChange('user', value)}
            >
              {summary?.users?.map(user => (
                <Option key={user} value={user}>{user}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Search
              placeholder="Search order numbers..."
              allowClear
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Logs Table */}
      <Card className="logs-table-card">
        {loading && logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Loading marketplace logs...</div>
          </div>
        ) : logs.length === 0 ? (
          <Empty
            description="No marketplace logs found"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} logs`,
            onChange: (page, pageSize) => fetchLogs(page, pageSize),
            onShowSizeChange: (current, size) => fetchLogs(1, size),
          }}
          scroll={{ x: 1200 }}
          size="small"
            virtual={logs.length > 50} // Enable virtual scrolling for large datasets
            components={{
              body: {
                wrapper: (props) => {
                  // Optimize rendering for large datasets
                  if (logs.length > 100) {
                    return <tbody {...props} style={{ ...props.style, contain: 'layout' }} />;
                  }
                  return <tbody {...props} />;
                }
              }
            }}
          />
        )}
      </Card>

      {/* Log Details Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            Log Details
            {selectedLog && (
              <Tag color={getMarketplaceColor(selectedLog.marketplace)}>
                {selectedLog.marketplace} - {selectedLog.brand}
              </Tag>
            )}
          </Space>
        }
        open={detailModalVisible}
        onCancel={closeModal}
        width={1200}
        className="logs-detail-modal"
        footer={[
          <Button key="close" onClick={closeModal}>
            Close
          </Button>
        ]}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Loading log details...</div>
          </div>
        ) : logDetails ? (
          <Tabs
            defaultActiveKey="app-logs"
            items={[
              {
                key: 'app-logs',
                label: (
                  <span>
                    <FileTextOutlined />
                    App Logs
                  </span>
                ),
                children: (
                  <div>
                    <Card title="Marketplace Application Logs" size="small" className="logs-detail-card">
                      <div style={{ marginBottom: '12px' }}>
                        <Space wrap>
                          <Tag color={streamingTerminalLogs ? 'green' : 'default'}>
                            {streamingTerminalLogs ? '🔴 Live Terminal Streaming' : '⏸️ Terminal Streaming Stopped'}
                          </Tag>
                          <Tag color={streamingTerminalLogs ? 'green' : 'default'}>
                            {streamingTerminalLogs ? '🔴 Live App Logs Streaming' : '⏸️ App Logs Streaming Stopped'}
                          </Tag>
                          <Tag color={appLogsAutoRefresh ? 'green' : 'default'}>
                            {appLogsAutoRefresh ? '🔄 Auto Refresh ON' : '⏸️ Auto Refresh OFF'}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {streamingLogs.length} live terminal entries
                          </Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {appLogs.length} app log entries
                          </Text>
                          <Button 
                            size="small" 
                            type={appLogsAutoRefresh ? "primary" : "default"}
                            icon={<ReloadOutlined />} 
                            onClick={() => setAppLogsAutoRefresh(!appLogsAutoRefresh)}
                          >
                            {appLogsAutoRefresh ? 'Stop Auto Refresh' : 'Start Auto Refresh'}
                          </Button>
                          <Button 
                            size="small" 
                            icon={<ReloadOutlined />} 
                            onClick={() => {
                              if (selectedLog) {
                                fetchAppLogs(selectedLog.marketplace, selectedLog.user, true);
                              }
                            }}
                            loading={appLogsLoading}
                          >
                            Refresh Now
                          </Button>
                        </Space>
                      </div>
                      
                      {appLogsLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                          <Spin />
                        </div>
                      ) : (appLogs.length > 0 || streamingLogs.length > 0) ? (
                        <div 
                          style={{ 
                            height: '400px', 
                            overflowY: 'auto', 
                            backgroundColor: '#f5f5f5',
                            padding: '12px',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                            fontSize: '12px'
                          }}
                        >
                          {/* Show streaming terminal logs first (live) */}
                          {streamingLogs.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                              <Text strong style={{ color: '#52c41a', fontSize: '12px' }}>
                                🔴 LIVE TERMINAL STREAMING
                              </Text>
                            </div>
                          )}
                          {streamingLogs.map((log, index) => (
                            <div key={`stream-${index}`} style={{ marginBottom: '6px', lineHeight: '1.4', backgroundColor: '#e6f7ff', padding: '4px', borderRadius: '3px', borderLeft: '3px solid #52c41a' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ color: '#666', minWidth: '140px', fontSize: '11px' }}>
                                  {log.timestamp}
                                </span>
                                <span style={{ 
                                  color: log.level === 'ERROR' ? '#ff4d4f' : 
                                        log.level === 'WARNING' ? '#faad14' : '#1890ff',
                                  fontWeight: 'bold',
                                  minWidth: '60px',
                                  fontSize: '11px'
                                }}>
                                  [{log.level}]
                                </span>
                                <span style={{ color: '#333', flex: 1, wordBreak: 'break-all' }}>
                                  {log.message}
                                </span>
                                <span style={{ color: '#52c41a', fontSize: '10px', fontWeight: 'bold' }}>
                                  LIVE TERMINAL
                                </span>
                              </div>
                            </div>
                          ))}
                          
                          {/* Show app logs (real-time) */}
                          {appLogs.length > 0 && (
                            <div style={{ marginBottom: '12px', marginTop: streamingLogs.length > 0 ? '20px' : '0' }}>
                              <Text strong style={{ color: '#722ed1', fontSize: '12px' }}>
                                🔴 LIVE APP LOGS
                              </Text>
                            </div>
                          )}
                          {appLogs.map((log, index) => {
                            const isNewLog = index < 10; // First 10 logs are considered new
                            return (
                              <div 
                                key={`app-${log.id || index}`} 
                                style={{ 
                                  marginBottom: '6px', 
                                  lineHeight: '1.4', 
                                  backgroundColor: isNewLog ? '#f6ffed' : '#f0f8ff', 
                                  padding: '4px', 
                                  borderRadius: '3px', 
                                  borderLeft: `3px solid ${isNewLog ? '#52c41a' : '#722ed1'}`,
                                  animation: isNewLog ? 'slideInFromTop 0.8s ease-out' : 'none'
                                }}
                              >
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ color: '#666', minWidth: '140px', fontSize: '11px' }}>
                                  {log.timestamp}
                                </span>
                                <span style={{ 
                                  color: log.level === 'ERROR' ? '#ff4d4f' : 
                                        log.level === 'WARNING' ? '#faad14' : '#722ed1',
                                  fontWeight: 'bold',
                                  minWidth: '60px',
                                  fontSize: '11px'
                                }}>
                                  [{log.level}]
                                </span>
                                <span style={{ color: '#333', flex: 1, wordBreak: 'break-all' }}>
                                  {log.message}
                                </span>
                                <span style={{ 
                                  color: isNewLog ? '#52c41a' : '#722ed1', 
                                  fontSize: '10px', 
                                  fontWeight: 'bold' 
                                }}>
                                  {isNewLog ? 'NEW APP LOG' : 'APP LOG'}
                                </span>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      ) : (
                        <Empty
                          description="No app logs found for this marketplace/user"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      )}
                    </Card>
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <Alert
            message="No Details Available"
            description="Could not load log details."
            type="warning"
          />
        )}
      </Modal>
    </div>
    </ErrorBoundary>
  );
};

export default MarketplaceLogs;