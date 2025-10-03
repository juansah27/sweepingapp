import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Spin,
  Alert,
  Button,
  Space,
  Typography,
  Badge,
  Input,
  App,
  DatePicker,
  Progress,
  Select,
  Tooltip,
  Modal,
  Skeleton,
  Divider,
  Empty,
  Result,
  Timeline,
  Rate,
  Avatar,
  List,
  Tabs,
  Switch,
  notification
} from 'antd';
import {
  ReloadOutlined,
  ShoppingCartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  BarChartOutlined,
  UploadOutlined,
  DownloadOutlined,
  CameraOutlined,
  CopyOutlined,
  EyeOutlined,
  TrendingUpOutlined,
  TrendingDownOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  FireOutlined,
  StarOutlined,
  TrophyOutlined,
  TeamOutlined,
  GlobalOutlined,
  CalendarOutlined,
  ClockCircleOutlined as ClockIcon,
  DatabaseOutlined,
  CloudSyncOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
// import html2canvas from 'html2canvas'; // Temporarily commented out
import './Dashboard.css';
import api from '../utils/axios';
import ItemIdComparisonCard from './ItemIdComparisonCard';

// Configure dayjs for timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

// Register Chart.js plugins
ChartJS.register(ChartDataLabels);

// Set default timezone to WIB (Indonesia Western Time)
dayjs.tz.setDefault('Asia/Jakarta');

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
  ChartDataLabels
);

const { Title: AntTitle, Text } = Typography;

// EditableRemark component for inline editing
const EditableRemark = ({ value, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const { message } = App.useApp();

  const handleSave = async () => {
    try {
      await onSave(editValue);
      setEditing(false);
      message.success('Remark updated successfully');
    } catch (error) {
      message.error('Failed to update remark');
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onPressEnter={handleSave}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            handleCancel();
          }
        }}
        autoFocus
        size="small"
        placeholder="Enter remark..."
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        cursor: 'pointer',
        minHeight: '22px',
        padding: '4px 8px',
        border: '1px dashed #d9d9d9',
        borderRadius: '4px',
        backgroundColor: value ? '#f6ffed' : '#fafafa',
        color: value ? '#52c41a' : '#999',
        fontSize: '13px',
        wordBreak: 'break-word'
      }}
      title="Click to edit remark"
    >
      {value || 'Click to add remark...'}
    </div>
  );
};

const { RangePicker } = DatePicker;
const { Option } = Select;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [ordersStats, setOrdersStats] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [advancedStats, setAdvancedStats] = useState(null);
  const { message } = App.useApp();
  const [notUploadedData, setNotUploadedData] = useState([]);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs.tz().startOf('day'), // Start of today in WIB
    dayjs.tz().endOf('day') // End of today in WIB
  ]); // Start with today's data by default
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [orderStatusFilter, setOrderStatusFilter] = useState([]);
  const [uniqueOrderStatuses, setUniqueOrderStatuses] = useState([]);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [notInterfacedModalVisible, setNotInterfacedModalVisible] = useState(false);
  
  // Modern dashboard state
  const [dataFreshness, setDataFreshness] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [dataValidation, setDataValidation] = useState({
    isValid: true,
    issues: [],
    lastChecked: null
  });
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    dataSize: 0,
    lastUpdate: null
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [enableDataValidation, setEnableDataValidation] = useState(true);

  // Data validation function
  const validateData = useCallback((data) => {
    const issues = [];
    const now = new Date();
    
    if (!data.ordersStats) {
      issues.push({ type: 'error', message: 'Orders statistics data is missing' });
    }
    
    if (!data.advancedStats) {
      issues.push({ type: 'warning', message: 'Advanced statistics data is missing' });
    }
    
    // Check data freshness (more lenient)
    if (data.ordersStats?.last_updated) {
      const lastUpdate = new Date(data.ordersStats.last_updated);
      const timeDiff = now - lastUpdate;
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));
      
      // Only warn if data is very old (more than 2 hours)
      if (minutesDiff > 120) {
        issues.push({ 
          type: 'warning', 
          message: `Data is ${Math.floor(minutesDiff / 60)} hours old. Consider refreshing.` 
        });
      }
    }
    
    // Check for data inconsistencies (more lenient validation)
    if (data.ordersStats && data.advancedStats) {
      const totalOrders = data.ordersStats.total_orders || 0;
      const interfacedOrders = data.ordersStats.interface_orders || 0;
      const notInterfacedOrders = data.ordersStats.not_interface_orders || 0;
      const filteredOrders = data.ordersStats.filtered_orders || 0;
      
      // Only check consistency if we have meaningful data
      if (totalOrders > 0 && filteredOrders > 0) {
        // Check if filtered orders make sense (should be <= total orders)
        if (filteredOrders > totalOrders) {
          issues.push({ 
            type: 'warning', 
            message: 'Filtered orders exceed total orders - check date filters' 
          });
        }
        
        // Check interface rate makes sense (should be between 0-100%)
        const interfaceRate = data.ordersStats.interface_rate || 0;
        if (interfaceRate < 0 || interfaceRate > 100) {
          issues.push({ 
            type: 'warning', 
            message: 'Interface rate seems unusual - check data processing' 
          });
        }
      }
      
      // Only show error if there's a significant data issue
      if (totalOrders > 0 && interfacedOrders === 0 && notInterfacedOrders === 0) {
        issues.push({ 
          type: 'warning', 
          message: 'No interface data available - check data source' 
        });
      }
    }
    
    return {
      isValid: issues.filter(issue => issue.type === 'error').length === 0,
      issues,
      lastChecked: now
    };
  }, []);


  // Extract unique order statuses from not interfaced orders
  const extractUniqueOrderStatuses = useCallback((orders) => {
    if (!orders || !Array.isArray(orders)) return [];
    const statuses = orders.map(order => order.order_status).filter(Boolean);
    return [...new Set(statuses)].sort();
  }, []);

  // Filter not interfaced orders by order status
  const getFilteredNotInterfacedOrders = useCallback(() => {
    if (!advancedStats?.not_interfaced_orders) return [];
    if (orderStatusFilter.length === 0) return advancedStats.not_interfaced_orders;
    
    return advancedStats.not_interfaced_orders.filter(order => 
      orderStatusFilter.includes(order.order_status)
    );
  }, [advancedStats?.not_interfaced_orders, orderStatusFilter]);

  // Get filtered statistics based on order status filter
  const getFilteredStats = useCallback(() => {
    if (!advancedStats?.not_interfaced_orders || orderStatusFilter.length === 0) {
      return {
        filteredOrders: ordersStats?.filtered_orders || 0,
        notInterfacedOrders: ordersStats?.not_interface_orders || 0,
        interfacedOrders: ordersStats?.interface_orders || 0
      };
    }

    const filteredOrders = advancedStats.not_interfaced_orders.filter(order => 
      orderStatusFilter.includes(order.order_status)
    );

    return {
      filteredOrders: filteredOrders.length,
      notInterfacedOrders: filteredOrders.length,
      interfacedOrders: (ordersStats?.filtered_orders || 0) - filteredOrders.length
    };
  }, [advancedStats?.not_interfaced_orders, orderStatusFilter, ordersStats]);

  // Format date range for display
  const formatDateRange = () => {
    if (!dateRange || dateRange.length !== 2) return 'All Time';
    
    const startDate = dateRange[0];
    const endDate = dateRange[1];
    
    // Check if it's a single day
    const isSameDay = startDate.isSame(endDate, 'day');
    
    if (isSameDay) {
      return startDate.format('YYYY-MM-DD');
    }
    
    // Full range
    return `${startDate.format('YYYY-MM-DD')} - ${endDate.format('YYYY-MM-DD')}`;
  };

  // Reset date filter to show all data - DISABLED to prevent heavy queries on million rows
  // const resetDateFilter = () => {
  //   setDateRange(null); // Clear date filter to show all data
  // };

  // Fetch all dashboard data with optimized loading
  const fetchDashboardData = useCallback(async (showLoading = true, forceRefresh = false) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    
    // Force refresh by clearing existing data first
    if (forceRefresh) {
      setOrdersStats(null);
      setUploadHistory([]);
      setAdvancedStats(null);
      setNotUploadedData([]);
    }
    
    try {
      // Prepare date range parameters - if no date range, don't send date params (show all data)
      let dateParams = '';
      let advancedStatsParams = '?not_interfaced_limit=999999';
      
      console.log('Date range for dashboard fetch:', dateRange);
      
      if (dateRange && dateRange.length === 2) {
        // Use WIB timezone format - add +07:00 timezone offset and URL encode
        const startDate = encodeURIComponent(dateRange[0].format('YYYY-MM-DDTHH:mm:ss') + '+07:00');
        const endDate = encodeURIComponent(dateRange[1].format('YYYY-MM-DDTHH:mm:ss') + '+07:00');
        dateParams = `?start_date=${startDate}&end_date=${endDate}`;
        advancedStatsParams = `${dateParams}&not_interfaced_limit=999999`;
        console.log('Using date filters with WIB timezone:', { 
          startDate: dateRange[0].format('YYYY-MM-DDTHH:mm:ss') + '+07:00',
          endDate: dateRange[1].format('YYYY-MM-DDTHH:mm:ss') + '+07:00'
        });
      } else {
        console.log('No date filters - fetching all data');
      }

      // Fetch real data from API with timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const [
          ordersStatsRes,
          uploadHistoryRes,
          advancedStatsRes,
          notUploadedRes
        ] = await Promise.all([
          api.get(`/api/dashboard/stats${dateParams}`, { signal: controller.signal }),
          api.get(`/api/dashboard/upload-history${dateParams}`, { signal: controller.signal }),
          api.get(`/api/dashboard/advanced-stats${advancedStatsParams}`, { signal: controller.signal }),
          api.get(`/api/not-uploaded-items${dateParams}`, { signal: controller.signal })
        ]);
        
        clearTimeout(timeoutId);

        // Update with real data if available
        console.log('=== DASHBOARD DATA DEBUG ===');
        console.log('Full ordersStats:', JSON.stringify(ordersStatsRes.data, null, 2));
        console.log('Full advancedStats:', JSON.stringify(advancedStatsRes.data, null, 2));
        
        // Debug ordersStats specifically
        console.log('OrdersStats breakdown:', {
          total_orders: ordersStatsRes.data?.total_orders,
          filtered_orders: ordersStatsRes.data?.filtered_orders,
          interface_orders: ordersStatsRes.data?.interface_orders,
          not_interface_orders: ordersStatsRes.data?.not_interface_orders,
          brand_distribution: ordersStatsRes.data?.brand_distribution
        });

        // Debug specific data for each card
        console.log('Card data analysis:', {
          'Interface/Not Interfaced': {
            interface_status_count: advancedStatsRes.data?.interface_status_count
          },
          'Top PIC': {
            pic_count: advancedStatsRes.data?.pic_count
          },
          'Brand Distribution': {
            batch_count: advancedStatsRes.data?.batch_count
          },
          'Hourly Evolution': {
            hourly_orders: advancedStatsRes.data?.hourly_orders
          },
          'Not Interfaced Orders': {
            not_interfaced_orders: advancedStatsRes.data?.not_interfaced_orders
          }
        });
        console.log('=== END DEBUG ===');

        // Update state with fetched data
        if (ordersStatsRes.data) {
          setOrdersStats(ordersStatsRes.data);
        }

        if (uploadHistoryRes.data) {
          setUploadHistory(Array.isArray(uploadHistoryRes.data) ? uploadHistoryRes.data : []);
        }

        if (advancedStatsRes.data) {
          setAdvancedStats(advancedStatsRes.data);
        }

        if (notUploadedRes.data) {
          setNotUploadedData(notUploadedRes.data.not_uploaded_items || []);
        }

        // Validate data and generate insights
        const allData = {
          ordersStats: ordersStatsRes.data,
          advancedStats: advancedStatsRes.data,
          uploadHistory: uploadHistoryRes.data,
          notUploadedData: notUploadedRes.data
        };

        // Only validate if enabled
        const validation = enableDataValidation ? validateData(allData) : {
          isValid: true,
          issues: [],
          lastChecked: new Date()
        };
        setDataValidation(validation);

        // Update data freshness
        setDataFreshness(new Date());

        // Update performance metrics
        setPerformanceMetrics(prev => ({
          ...prev,
          loadTime: Date.now() - performance.now(),
          dataSize: JSON.stringify(allData).length,
          lastUpdate: new Date()
        }));

        // Show validation issues as notifications (only if validation enabled)
        if (enableDataValidation && !validation.isValid) {
          validation.issues.forEach(issue => {
            if (issue.type === 'error') {
              notification.error({
                message: 'Data Validation Error',
                description: issue.message,
                duration: 5
              });
            } else if (issue.type === 'warning') {
              notification.warning({
                message: 'Data Validation Warning',
                description: issue.message,
                duration: 3
              });
            }
          });
        }
      } catch (apiError) {
        setError('Failed to load dashboard data. Please try refreshing the page.');
      }

    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Debounced effect for date range changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchDashboardData();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [dateRange, fetchDashboardData]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchDashboardData(false, false); // Silent refresh
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchDashboardData]);

  // Update unique order statuses when not interfaced orders data changes
  useEffect(() => {
    if (advancedStats?.not_interfaced_orders) {
      const statuses = extractUniqueOrderStatuses(advancedStats.not_interfaced_orders);
      setUniqueOrderStatuses(statuses);
    }
    }, [advancedStats?.not_interfaced_orders, extractUniqueOrderStatuses]);

    // Listen for upload completion events to refresh dashboard data
    useEffect(() => {
      const handleUploadCompleted = (event) => {
        console.log('Upload completed, refreshing dashboard data...', event.detail);
        // Keep current date filter to prevent heavy queries on million rows
        // Date range is NOT cleared after upload
        // Force a complete refresh of all dashboard data
        setTimeout(() => {
          // Force refresh with current date parameters
          fetchDashboardData(false, true); // Don't show loading spinner, but force refresh
        }, 2000); // Increased delay to ensure backend has fully processed the upload
      };

      window.addEventListener('uploadCompleted', handleUploadCompleted);
      
      return () => {
        window.removeEventListener('uploadCompleted', handleUploadCompleted);
      };
    }, [fetchDashboardData]);
  
    // Handle remark update
  const handleRemarkUpdate = async (record, newRemark, isNotInterfacedOrder = false) => {
    try {
      const token = localStorage.getItem('token');
      
      let response;
      
      if (isNotInterfacedOrder) {
        // For not interfaced orders, update by order number
        const params = new URLSearchParams({
          order_number: record.order_number,
          marketplace: record.marketplace,
          remark: newRemark || ''
        });
        
        response = await fetch(`/api/not-interfaced-order/remark?${params}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } else {
        // For not uploaded items, use the listbrand endpoint (brand + marketplace + batch)
        const params = new URLSearchParams({
          brand: record.brand,
          marketplace: record.marketplace,
          batch: record.batch,
          remark: newRemark || ''
        });
        
        response = await fetch(`/api/listbrand/remark?${params}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }

      if (!response.ok) {
        throw new Error('Failed to update remark');
      }

      // Update the local state to reflect the change
      if (isNotInterfacedOrder) {
        // Update Not Interfaced Orders table by order number
        setAdvancedStats(prevStats => ({
          ...prevStats,
          not_interfaced_orders: prevStats?.not_interfaced_orders?.map(item => 
            item.order_number === record.order_number && 
            item.marketplace === record.marketplace
              ? { ...item, remark: newRemark }
              : item
          ) || []
        }));
      } else {
        // Update Not Uploaded Items table by brand + marketplace + batch
        setNotUploadedData(prevData => 
          prevData.map(item => 
            item.brand === record.brand && 
            item.marketplace === record.marketplace && 
            item.batch === record.batch
              ? { ...item, remark: newRemark }
              : item
          )
        );
      }

    } catch (error) {
      throw error;
    }
  };

  // Handle export functionality
  const handleExport = async () => {
    setExporting(true);
    setExportProgress(0);
    
    try {
      const token = localStorage.getItem('token');
      
      // Prepare export parameters - if no date range, don't send date params (export all data)
      let exportParams = '';
      const params = new URLSearchParams();
      
      if (dateRange && dateRange.length === 2) {
        // Use WIB timezone format - add +07:00 timezone offset and URL encode (same as dashboard stats)
        const startDate = dateRange[0].format('YYYY-MM-DDTHH:mm:ss') + '+07:00';
        const endDate = dateRange[1].format('YYYY-MM-DDTHH:mm:ss') + '+07:00';
        params.append('start_date', startDate);
        params.append('end_date', endDate);
      }
      
      // Add order status filter if any is selected
      if (orderStatusFilter && orderStatusFilter.length > 0) {
        params.append('order_status', orderStatusFilter.join(','));
      }
      
      if (params.toString()) {
        exportParams = `?${params.toString()}`;
      }
      
      // Start export immediately
      setExportProgress(10);
      
      const response = await api.get(`/api/dashboard/export${exportParams}`, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          // Real progress based on download
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setExportProgress(10 + (progress * 0.8)); // 10% to 90%
          }
        }
      });

      // Get the filename from the response headers
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `dashboard-export-${dayjs.tz().format('YYYY-MM-DD')}.xlsx`;

      setExportProgress(95);
      
      // Create blob and download
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportProgress(100);
      
      message.success('Dashboard data exported successfully!');
    } catch (error) {
      message.error('Failed to export dashboard data');
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  // Handle screenshot functionality
  const handleScreenshot = async () => {
    setScreenshotLoading(true);
    
    try {
      // Get the dashboard container element
      const dashboardElement = document.querySelector('.dashboard-container');
      
      if (!dashboardElement) {
        message.error('Dashboard container not found');
        return;
      }

      // Dynamic import of html2canvas
      const html2canvas = (await import('html2canvas')).default;

      // Create canvas with high quality settings
      const canvas = await html2canvas(dashboardElement, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: dashboardElement.scrollWidth,
        height: dashboardElement.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      });

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          
          // Generate filename with timestamp
          const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss');
          const dateRangeText = formatDateRange().toLowerCase().replace(/\s+/g, '_');
          link.download = `dashboard_screenshot_${dateRangeText}_${timestamp}.png`;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          message.success('Dashboard screenshot captured successfully!');
        } else {
          message.error('Failed to generate screenshot');
        }
      }, 'image/png', 0.95);

    } catch (error) {
      message.error('Failed to capture screenshot');
    } finally {
      setScreenshotLoading(false);
    }
  };

  // Handle copy data functionality
  const handleCopyNotInterfacedData = async () => {
    try {
      const data = getFilteredNotInterfacedOrders();
      
      // Convert data to tab-separated format for easy pasting
      const textContent = data.map(item => [
        item.marketplace || '',
        item.brand || '',
        item.order_number || '',
        item.order_status || '',
        item.remark || ''
      ].join('\t')).join('\n');

      // Copy to clipboard with fallback
      if (navigator.clipboard && window.isSecureContext) {
        // Modern clipboard API
        await navigator.clipboard.writeText(textContent);
        message.success('Data copied to clipboard! Ready to paste in Notepad or Excel');
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = textContent;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          message.success('Data copied to clipboard! Ready to paste in Notepad or Excel');
        } catch (err) {
          message.error('Failed to copy data. Please select and copy manually.');
        }
        
        document.body.removeChild(textArea);
      }
    } catch (error) {
      message.error('Failed to copy data');
    }
  };


  // Chart data configurations

  const getBrandDistributionData = () => {
    if (!ordersStats?.brand_distribution?.length) {
      return { labels: [], datasets: [] };
    }
    
    const colors = [
      '#1890ff', '#52c41a', '#faad14', '#f5222d', 
      '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16',
      '#2f54eb', '#389e0d', '#d48806', '#cf1322'
    ];

    // Sort by count descending and limit to top 10 brands
    const sortedData = [...ordersStats.brand_distribution]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      labels: sortedData.map(item => item.brand),
      datasets: [
        {
          data: sortedData.map(item => item.count),
          backgroundColor: colors.slice(0, sortedData.length),
          borderWidth: 0,
        },
      ],
    };
  };

  // Get top PIC data
  const getTopPICData = () => {
    if (!advancedStats?.recent_uploads?.length) {
      return [];
    }
    
    // Count unique upload sessions (files) per PIC
    const picUploadCounts = {};
    advancedStats.recent_uploads.forEach(upload => {
      const pic = upload.pic || 'Unknown';
      if (!picUploadCounts[pic]) {
        picUploadCounts[pic] = 0;
      }
      picUploadCounts[pic] += 1; // Count each upload session as 1 file
    });
    
    // Convert to array and sort by upload count descending
    return Object.entries(picUploadCounts)
      .map(([pic, count]) => ({ pic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  // Get batch distribution based on filtered batch_count data (respects date range)
  const getBatchUploadDistributionData = () => {
    if (!advancedStats?.recent_uploads?.length) {
      return { labels: [], datasets: [] };
    }
    
    const colors = [
      '#1890ff', '#52c41a', '#faad14', '#f5222d', 
      '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'
    ];

    // Count unique upload sessions (files) per batch
    const batchUploadCounts = {};
    advancedStats.recent_uploads.forEach(upload => {
      const batch = upload.batch || 'Unknown';
      if (!batchUploadCounts[batch]) {
        batchUploadCounts[batch] = 0;
      }
      batchUploadCounts[batch] += 1; // Count each upload session as 1 file
    });

    // Convert to array and sort by upload count descending
    const sortedData = Object.entries(batchUploadCounts)
      .map(([batch, count]) => ({ batch: `Batch ${batch}`, count }))
      .sort((a, b) => b.count - a.count);

    return {
      labels: sortedData.map(item => item.batch),
      datasets: [
        {
          data: sortedData.map(item => item.count),
          backgroundColor: colors.slice(0, sortedData.length),
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    };
  };

  // Calculate dynamic max for y-axis based on batch upload data
  const getBatchMaxValue = () => {
    if (!advancedStats?.recent_uploads?.length) return 0;
    
    // Count uploads per batch to find max
    const batchUploadCounts = {};
    advancedStats.recent_uploads.forEach(upload => {
      const batch = upload.batch || 'Unknown';
      batchUploadCounts[batch] = (batchUploadCounts[batch] || 0) + 1;
    });
    
    const maxValue = Math.max(...Object.values(batchUploadCounts));
    return maxValue > 0 ? maxValue + 2 : 10; // Add 2 to max value for better visualization
  };

  // Keep the old function for backward compatibility (if needed elsewhere)
  const getBatchDistributionData = () => {
    if (!advancedStats?.batch_count?.length) {
      return { labels: [], datasets: [] };
    }
    
    const colors = [
      '#1890ff', '#52c41a', '#faad14', '#f5222d', 
      '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'
    ];

    // Sort by count descending (highest to lowest)
    const sortedData = [...advancedStats.batch_count].sort((a, b) => b.count - a.count);

    return {
      labels: sortedData.map(item => item.batch),
      datasets: [
        {
          data: sortedData.map(item => item.count),
          backgroundColor: colors.slice(0, sortedData.length),
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    };
  };

  // Get not uploaded data for Interface Status table
  const getNotUploadedData = () => {
    // Return real data from API
    return notUploadedData || [];
  };



  const getHourlyEvolutionData = () => {
    if (!advancedStats?.recent_uploads?.length) {
      return { labels: [], datasets: [] };
    }
    
    // Count unique upload sessions (files) per hour
    const hourlyUploadCounts = {};
    advancedStats.recent_uploads.forEach(upload => {
      if (upload.upload_date) {
        const uploadHour = dayjs.tz(upload.upload_date, 'Asia/Jakarta').format('HH:00');
        if (!hourlyUploadCounts[uploadHour]) {
          hourlyUploadCounts[uploadHour] = 0;
        }
        hourlyUploadCounts[uploadHour] += 1; // Count each upload session as 1 file
      }
    });
    
    // Generate labels and data for all 24 hours
    const labels = [];
    const data = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
      labels.push(hourLabel);
      data.push(hourlyUploadCounts[hourLabel] || 0); // Use 0 if no data for this hour
    }
    
    return {
      labels,
      datasets: [
        {
          label: 'Hourly File Uploads',
          data,
          borderColor: 'rgb(24, 144, 255)',
          backgroundColor: 'rgba(24, 144, 255, 0.3)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: 'rgb(24, 144, 255)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  };



  // Dynamic theme color for labels
  const getLabelColor = () => {
    const isDark = document.body.classList.contains('dark') || 
                   window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark ? '#fff' : '#000';
  };



  // Calculate dynamic max for y-axis based on hourly upload data
  const getHourlyMaxValue = () => {
    if (!advancedStats?.recent_uploads?.length) return 0;
    
    // Count uploads per hour to find max
    const hourlyUploadCounts = {};
    advancedStats.recent_uploads.forEach(upload => {
      if (upload.upload_date) {
        const uploadHour = dayjs.tz(upload.upload_date, 'Asia/Jakarta').format('HH:00');
        hourlyUploadCounts[uploadHour] = (hourlyUploadCounts[uploadHour] || 0) + 1;
      }
    });
    
    const maxValue = Math.max(...Object.values(hourlyUploadCounts));
    return maxValue > 0 ? maxValue : 10; // Ensure minimum scale
  };

  const hourlyMaxValue = getHourlyMaxValue();
  const yAxisMax = hourlyMaxValue === 30 ? 40 : Math.max(hourlyMaxValue + 5, 10);

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#1890ff',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        padding: 12,
        callbacks: {
          title: function(context) {
            return `Hour: ${context[0].label}`;
          },
          label: function(context) {
            return `Orders: ${context.parsed.y}`;
          }
        }
      },
      datalabels: {
        display: true,
        color: '#1890ff',
        font: {
          weight: 'bold',
          size: 11
        },
        formatter: (value) => value > 0 ? value : '',
        anchor: 'end',
        align: 'top',
        offset: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: '#1890ff',
        borderWidth: 1,
        borderRadius: 4,
        padding: 4
      }
    },
    layout: {
      padding: {
        top: 20,
        bottom: 10,
        left: 10,
        right: 10
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: yAxisMax,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: '#666',
          font: {
            size: 11
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#666',
          font: {
            size: 11
          }
        }
      },
    },
    elements: {
      point: {
        radius: 6,
        hoverRadius: 8,
        backgroundColor: '#1890ff',
        borderColor: '#fff',
        borderWidth: 2
      },
      line: {
        tension: 0.4,
        borderWidth: 3
      }
    }
  };




  if (loading) {
    return (
      <div className="dashboard-container" style={{ padding: '24px' }}>
        {/* Header Skeleton */}
        <div style={{ marginBottom: 24 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Skeleton.Input active size="large" style={{ width: 300, marginBottom: 8 }} />
              <Skeleton.Input active size="small" style={{ width: 400 }} />
            </Col>
            <Col>
              <Space>
                <Skeleton.Button active size="small" />
                <Skeleton.Button active size="small" />
                <Skeleton.Button active size="small" />
                <Skeleton.Button active size="small" />
              </Space>
            </Col>
          </Row>
        </div>

        {/* Metrics Cards Skeleton */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {[1, 2, 3, 4].map(i => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <Card>
                <Skeleton active paragraph={{ rows: 2 }} />
              </Card>
            </Col>
          ))}
        </Row>

        {/* Main Content Skeleton */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={10}>
            <Card>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Row gutter={[0, 8]}>
              <Col span={24}>
                <Card>
                  <Skeleton active paragraph={{ rows: 4 }} />
                </Card>
              </Col>
              <Col span={24}>
                <Card>
                  <Skeleton active paragraph={{ rows: 4 }} />
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* Charts Skeleton */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </Col>
        </Row>

        {/* Tables Skeleton */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // Show export overlay when exporting
  if (exporting) {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(255, 255, 255, 0.9)', 
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Spin size="large" />
          <Text style={{ marginTop: 16, fontSize: 16, fontWeight: 'bold' }}>Exporting Dashboard Data...</Text>
          <Text style={{ marginTop: 8, color: '#666', marginBottom: 16 }}>Please wait while we prepare your Excel file</Text>
          <Progress 
            percent={exportProgress} 
            status={exportProgress === 100 ? 'success' : 'active'}
            style={{ width: 300 }}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
          <Text style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
            {exportProgress < 20 && 'Preparing data...'}
            {exportProgress >= 20 && exportProgress < 40 && 'Generating Excel file...'}
            {exportProgress >= 40 && exportProgress < 70 && 'Processing data...'}
            {exportProgress >= 70 && exportProgress < 90 && 'Finalizing export...'}
            {exportProgress >= 90 && exportProgress < 100 && 'Preparing download...'}
            {exportProgress === 100 && 'Export completed!'}
          </Text>
        </div>
        {/* Render the dashboard content behind the overlay */}
        <div style={{ opacity: 0.3 }}>
          {/* Dashboard content will be rendered here */}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ padding: '24px' }}>
      {/* Modern Header with Data Status */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div>
                <AntTitle level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChartOutlined style={{ color: '#1890ff' }} />
                  Dashboard Sweeping
                  {dataValidation.isValid ? (
                    <Badge status="success" text="" />
                  ) : (
                    <Badge status="error" text="" />
                  )}
                </AntTitle>
                <Text type="secondary" style={{ fontSize: '14px' }}>
                  Real-time monitoring sweeping activity
                </Text>
              </div>
              
              {/* Data Freshness Indicator */}
              {dataFreshness && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  background: 'rgba(24, 144, 255, 0.1)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(24, 144, 255, 0.2)'
                }}>
                  <SyncOutlined style={{ color: '#1890ff' }} />
                  <Text style={{ fontSize: '12px', color: '#1890ff' }}>
                    Last updated: {dataFreshness.toLocaleTimeString()}
                  </Text>
                </div>
              )}
            </div>
          </Col>
          
          <Col>
            <Space wrap>
              {/* Auto-refresh Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Switch
                  checked={autoRefresh}
                  onChange={setAutoRefresh}
                  size="small"
                />
                <Text style={{ fontSize: '12px' }}>Auto-refresh</Text>
              </div>
              
              {/* Data Validation Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Switch
                  checked={enableDataValidation}
                  onChange={setEnableDataValidation}
                  size="small"
                />
                <Text style={{ fontSize: '12px' }}>Data Validation</Text>
              </div>
              
              <RangePicker
                format="YYYY-MM-DD"
                value={dateRange ? [dateRange[0], dateRange[1]] : null}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    // Ensure end date is set to end of day for proper date range filtering
                    const startDate = dates[0].startOf('day');
                    const endDate = dates[1].endOf('day');
                    setDateRange([startDate, endDate]);
                  }
                  // Clear filter disabled to prevent heavy queries on million rows
                }}
                onOk={() => fetchDashboardData(false)}
                style={{ width: 350 }}
                placeholder={['Start Date', 'End Date']}
                allowClear={false}
                suffixIcon={<CalendarOutlined />}
              />
              
              <Select
                mode="multiple"
                placeholder="Filter by Order Status"
                value={orderStatusFilter}
                onChange={setOrderStatusFilter}
                style={{ 
                  width: 250,
                  borderColor: orderStatusFilter.length > 0 ? '#1890ff' : undefined
                }}
                allowClear
                maxTagCount={2}
                maxTagTextLength={10}
                maxTagPlaceholder={(omittedValues) => `+${omittedValues.length} more`}
                suffixIcon={orderStatusFilter.length > 0 ? '🔍' : undefined}
              >
                {uniqueOrderStatuses.map(status => (
                  <Option key={status} value={status}>
                    {status}
                  </Option>
                ))}
              </Select>
              
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => {
                  console.log('=== REFRESH ALL CLICKED ===');
                  // Keep current date filter to prevent heavy queries on million rows
                  fetchDashboardData(true, true);
                }}
                className="dashboard-refresh-btn"
                loading={loading}
                type="default"
              >
                Refresh All
              </Button>
              
              <Button 
                icon={<CameraOutlined />} 
                onClick={handleScreenshot}
                className="dashboard-screenshot-btn"
                loading={screenshotLoading}
                disabled={screenshotLoading}
              >
                {screenshotLoading ? 'Capturing...' : 'Screenshot'}
              </Button>
              
              <Button 
                icon={<DownloadOutlined />} 
                onClick={handleExport}
                className="dashboard-export-btn"
                type="primary"
                loading={exporting}
                disabled={exporting}
              >
                {exporting ? 'Exporting...' : 'Export'}
              </Button>
            </Space>
          </Col>
        </Row>
        
        {/* Data Validation Status */}
        {enableDataValidation && dataValidation.issues.length > 0 && (
          <Alert
            message="Data Validation Issues"
            description={
              <div>
                {dataValidation.issues.map((issue, index) => (
                  <div key={index} style={{ marginBottom: '4px' }}>
                    <Text type={issue.type === 'error' ? 'danger' : 'warning'}>
                      {issue.type === 'error' ? '❌' : '⚠️'} {issue.message}
                    </Text>
                  </div>
                ))}
              </div>
            }
            type={dataValidation.isValid ? 'warning' : 'error'}
            showIcon
            closable
            style={{ marginTop: '16px' }}
            action={
              <Button 
                size="small" 
                onClick={() => setEnableDataValidation(false)}
                type="link"
              >
                Disable Validation
              </Button>
            }
          />
        )}
      </div>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 24 }}
        />
      )}


      {/* Modern Key Metrics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            className="dashboard-card metric-card-uploads"
            hoverable
            style={{ 
              background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)',
              border: '1px solid #91d5ff',
              borderRadius: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Statistic
                  title={
                    <Space>
                      <ShoppingCartOutlined style={{ color: '#1890ff' }} />
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        Orders ({formatDateRange()})
                      </span>
                    </Space>
                  }
                  value={getFilteredStats().filteredOrders}
                  valueStyle={{ 
                    color: '#1890ff',
                    fontSize: '28px',
                    fontWeight: 'bold'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {orderStatusFilter.length > 0 ? (
                    `Filtered by: ${orderStatusFilter.join(', ')}`
                  ) : (
                    `Total: ${ordersStats?.total_orders || 0} (all time)`
                  )}
                </div>
              </div>
              <div style={{ 
                background: 'rgba(24, 144, 255, 0.1)', 
                borderRadius: '50%', 
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShoppingCartOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card 
            className="dashboard-card metric-card-orders"
            hoverable
            style={{ 
              background: 'linear-gradient(135deg, #f6ffed 0%, #f0f9ff 100%)',
              border: '1px solid #b7eb8f',
              borderRadius: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Statistic
                  title={
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        Interface ({formatDateRange()})
                      </span>
                    </Space>
                  }
                  value={getFilteredStats().interfacedOrders}
                  valueStyle={{ 
                    color: '#52c41a',
                    fontSize: '28px',
                    fontWeight: 'bold'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {orderStatusFilter.length > 0 ? (
                    'Successfully interfaced (filtered)'
                  ) : (
                    `Rate: ${ordersStats?.interface_rate || 0}%`
                  )}
                </div>
              </div>
              <div style={{ 
                background: 'rgba(82, 196, 26, 0.1)', 
                borderRadius: '50%', 
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircleOutlined style={{ fontSize: '20px', color: '#52c41a' }} />
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card 
            className="dashboard-card metric-card-interface"
            hoverable
            style={{ 
              background: 'linear-gradient(135deg, #fffbe6 0%, #fff7e6 100%)',
              border: '1px solid #ffe58f',
              borderRadius: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Statistic
                  title={
                    <Space>
                      <ClockCircleOutlined style={{ color: '#faad14' }} />
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        Not Interfaced ({formatDateRange()})
                      </span>
                    </Space>
                  }
                  value={getFilteredStats().notInterfacedOrders}
                  valueStyle={{ 
                    color: '#faad14',
                    fontSize: '28px',
                    fontWeight: 'bold'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {orderStatusFilter.length > 0 ? (
                    'Pending interface (filtered)'
                  ) : (
                    'Orders pending interface'
                  )}
                </div>
              </div>
              <div style={{ 
                background: 'rgba(250, 173, 20, 0.1)', 
                borderRadius: '50%', 
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ClockCircleOutlined style={{ fontSize: '20px', color: '#faad14' }} />
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card 
            className="dashboard-card metric-card-users"
            hoverable
            style={{ 
              background: 'linear-gradient(135deg, #f9f0ff 0%, #f4e6ff 100%)',
              border: '1px solid #d3adf7',
              borderRadius: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <TrophyOutlined style={{ color: '#722ed1', marginRight: '6px' }} />
                  <span style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>
                    Top 3 Performers
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {getTopPICData().length > 0 ? (
                    getTopPICData().slice(0, 3).map((pic, index) => (
                      <div key={pic.pic} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: index < 2 ? '2px' : '0'
                      }}>
                        <span style={{ 
                          fontWeight: index === 0 ? 'bold' : 'normal',
                          color: index === 0 ? '#722ed1' : '#666'
                        }}>
                          {index + 1}. {pic.pic}
                        </span>
                        <span style={{ 
                          fontWeight: 'bold',
                          color: index === 0 ? '#722ed1' : '#666'
                        }}>
                          {pic.count} files
                        </span>
                      </div>
                    ))
                  ) : (
                    <div>No data available</div>
                  )}
                </div>
              </div>
              <div style={{ 
                background: 'rgba(114, 46, 209, 0.1)', 
                borderRadius: '50%', 
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrophyOutlined style={{ fontSize: '20px', color: '#722ed1' }} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* SKU Comparison Card */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <ItemIdComparisonCard dateRange={dateRange} />
        </Col>
      </Row>

      {/* Main Content Section - 40:60 Ratio */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Left Column - 40% */}
        <Col xs={24} lg={10}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Space>
                  <ExclamationCircleOutlined />
                  Not Interfaced Orders
                </Space>
                <Space>
                  <Badge count={getFilteredNotInterfacedOrders().length || 0} showZero color="#f5222d" overflowCount={999999} />
                  <Button 
                    type="link" 
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => setNotInterfacedModalVisible(true)}
                    style={{ padding: '4px 8px', height: 'auto' }}
                  >
                    View All
                  </Button>
                </Space>
              </div>
            }
            className="dashboard-card"
            style={{ height: '650px' }}
            styles={{ body: { padding: '16px', height: 'calc(100% - 57px)' } }}
          >
            <Table
              dataSource={getFilteredNotInterfacedOrders()}
              columns={[
                {
                  title: 'Marketplace',
                  dataIndex: 'marketplace',
                  key: 'marketplace',
                  render: (text) => <Tag color="blue">{text}</Tag>
                },
                {
                  title: 'Brand',
                  dataIndex: 'brand',
                  key: 'brand',
                  render: (text) => <Tag color="green">{text}</Tag>
                },
                {
                  title: 'Order Number',
                  dataIndex: 'order_number',
                  key: 'order_number',
                },
                {
                  title: 'Order Status',
                  dataIndex: 'order_status',
                  key: 'order_status',
                  render: (text) => {
                    const status = text || 'Pending';
                    let color = 'default';
                    if (status.toLowerCase().includes('pending')) color = 'orange';
                    else if (status.toLowerCase().includes('processing')) color = 'blue';
                    else if (status.toLowerCase().includes('shipped')) color = 'green';
                    else if (status.toLowerCase().includes('delivered')) color = 'green';
                    else if (status.toLowerCase().includes('cancelled')) color = 'red';
                    return <Tag color={color}>{status}</Tag>;
                  }
                },
                {
                  title: 'Remark',
                  dataIndex: 'remark',
                  key: 'remark',
                  render: (text, record) => (
                    <EditableRemark 
                      value={text || ''} 
                      onSave={(newRemark) => handleRemarkUpdate(record, newRemark, true)}
                    />
                  ),
                }
              ]}
              pagination={{
                pageSize: 8,
                showSizeChanger: false,
                showQuickJumper: false,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} orders`,
                size: 'small'
              }}
              scroll={{ y: 'calc(100vh - 500px)' }}
              className="dashboard-table"
              rowKey={(record) => `not-interfaced-${record.order_number}-${record.marketplace}-${record.brand || 'no-brand'}`}
            />
          </Card>
        </Col>
        
        {/* Right Column - 60% */}
        <Col xs={24} lg={14}>
          <Row gutter={[0, 8]} style={{ height: '100%' }}>
            {/* Batch Distribution */}
            <Col span={24}>
              <Card 
                title={
                  <Space>
                    <BarChartOutlined />
                    Batch File Upload Distribution
                  </Space>
                }
                className="dashboard-card"
                style={{ height: '320px' }}
                styles={{ body: { padding: '16px', height: 'calc(100% - 57px)' } }}
              >
                <Bar 
                  data={getBatchUploadDistributionData()} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                      intersect: false,
                      mode: 'index'
                    },
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#52c41a',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        titleFont: {
                          size: 14,
                          weight: 'bold'
                        },
                        bodyFont: {
                          size: 13
                        },
                        padding: 12,
                        callbacks: {
                          title: function(context) {
                            return `Batch: ${context[0].label}`;
                          },
                          label: function(context) {
                            return `Files: ${context.parsed.y}`;
                          }
                        }
                      },
                      datalabels: {
                        display: true,
                        color: '#52c41a',
                        font: {
                          weight: 'bold',
                          size: 10
                        },
                        formatter: (value) => `${value} files`,
                        anchor: 'end',
                        align: 'top',
                        offset: 6,
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        borderColor: '#52c41a',
                        borderWidth: 1,
                        borderRadius: 4,
                        padding: 4
                      }
                    },
                    layout: {
                      padding: {
                        top: 20,
                        bottom: 10,
                        left: 10,
                        right: 10
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: getBatchMaxValue(),
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)',
                          drawBorder: false
                        },
                        ticks: {
                          color: '#666',
                          font: {
                            size: 11
                          }
                        }
                      },
                      x: {
                        grid: {
                          display: false
                        },
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45,
                          font: {
                            size: 10
                          },
                          color: '#666'
                        }
                      }
                    },
                    elements: {
                      bar: {
                        borderRadius: 4,
                        borderSkipped: false
                      }
                    }
                  }}
                />
              </Card>
            </Col>
            
            {/* Brand Distribution */}
            <Col span={24}>
              <Card 
                title={
                  <Space>
                    <BarChartOutlined />
                    Brand Distribution
                  </Space>
                }
                className="dashboard-card"
                style={{ height: '320px' }}
                styles={{ body: { padding: '16px', height: 'calc(100% - 57px)' } }}
              >
                <Bar 
                  data={getBrandDistributionData()} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    interaction: {
                      intersect: false,
                      mode: 'index'
                    },
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#722ed1',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        titleFont: {
                          size: 14,
                          weight: 'bold'
                        },
                        bodyFont: {
                          size: 13
                        },
                        padding: 12,
                        callbacks: {
                          title: function(context) {
                            return `Brand: ${context[0].label}`;
                          },
                          label: function(context) {
                            return `Orders: ${context.parsed.x.toLocaleString()}`;
                          }
                        }
                      },
                      datalabels: {
                        display: true,
                        color: '#722ed1',
                        font: {
                          weight: 'bold',
                          size: 10
                        },
                        formatter: (value) => value.toLocaleString(),
                        anchor: 'end',
                        align: 'right',
                        offset: 6,
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        borderColor: '#722ed1',
                        borderWidth: 1,
                        borderRadius: 4,
                        padding: 4
                      }
                    },
                    layout: {
                      padding: {
                        top: 10,
                        bottom: 10,
                        left: 20,
                        right: 50
                      }
                    },
                    scales: {
                      x: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)',
                          drawBorder: false
                        },
                        ticks: {
                          color: '#666',
                          font: {
                            size: 11
                          }
                        }
                      },
                      y: {
                        grid: {
                          display: false
                        },
                        ticks: {
                          color: '#666',
                          font: {
                            size: 11
                          }
                        }
                      }
                    },
                    elements: {
                      bar: {
                        borderRadius: 4,
                        borderSkipped: false
                      }
                    }
                  }}
                />
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>



      {/* Hourly Evolution Chart */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card 
            title={
              <Space>
                <BarChartOutlined />
                Hourly Sweeping Evolution
              </Space>
            }
            className="dashboard-card"
          >
            <div className="chart-container" style={{ height: '520px', paddingTop: '10px', paddingBottom: '10px' }}>
              <Line data={getHourlyEvolutionData()} options={lineChartOptions} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Tables Section */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Space>
                  <ExclamationCircleOutlined />
                  Not Uploaded Items
                </Space>
                <Badge count={getNotUploadedData().length || 0} showZero color="#faad14" overflowCount={999999} />
              </div>
            }
            className="dashboard-card"
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : (
              <Table
                dataSource={getNotUploadedData()}
                rowKey={(record) => `not-uploaded-${record.id || `${record.brand}-${record.marketplace}-${record.batch}-${record.remark || 'no-remark'}`}`}
                pagination={false}
                size="small"
                scroll={{ y: 'calc(100vh - 400px)' }}
              columns={[
                {
                  title: 'Brand',
                  dataIndex: 'brand',
                  key: 'brand',
                  width: '20%',
                },
                {
                  title: 'Marketplace',
                  dataIndex: 'marketplace',
                  key: 'marketplace',
                  width: '20%',
                },
                {
                  title: 'Batch',
                  dataIndex: 'batch',
                  key: 'batch',
                  width: '20%',
                },
                {
                  title: 'Remark',
                  dataIndex: 'remark',
                  key: 'remark',
                  width: '40%',
                  render: (text, record) => (
                    <EditableRemark 
                      value={text || ''} 
                      onSave={(newRemark) => handleRemarkUpdate(record, newRemark, false)}
                    />
                  ),
                },
              ]}
            />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title="Recent Uploads"
            className="dashboard-card"
          >
            <Table
              dataSource={advancedStats?.recent_uploads || uploadHistory}
              columns={[
                {
                  title: 'Marketplace',
                  dataIndex: 'marketplace',
                  key: 'marketplace',
                  render: (text) => <Tag color="blue">{text}</Tag>
                },
                {
                  title: 'Brand',
                  dataIndex: 'brand',
                  key: 'brand',
                  render: (text) => <Tag color="green">{text}</Tag>
                },
                {
                  title: 'Batch',
                  dataIndex: 'batch',
                  key: 'batch',
                  render: (text) => <Tag color="orange">{text}</Tag>
                },
                {
                  title: 'Total Order',
                  dataIndex: 'total_orders',
                  key: 'total_orders',
                  render: (text) => <Tag color="cyan">{text || 0}</Tag>
                },
                {
                  title: 'PIC',
                  dataIndex: 'pic',
                  key: 'pic',
                  render: (text) => <Tag color="purple">{text}</Tag>
                },
                {
                  title: 'Upload Date',
                  dataIndex: 'upload_date',
                  key: 'upload_date',
                  render: (text) => text ? dayjs.tz(text, 'Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss') : '-'
                }
              ]}
              pagination={false}
              size="small"
              scroll={{ y: 'calc(100vh - 400px)' }}
              className="dashboard-table"
              rowKey={(record) => `recent-upload-${record.marketplace}-${record.brand}-${record.batch}-${record.upload_date}-${record.pic || 'no-pic'}`}
            />
          </Card>
        </Col>
      </Row>

      {/* Not Interfaced Orders Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Space>
              <ExclamationCircleOutlined />
              All Not Interfaced Orders
            </Space>
            <Button 
              icon={<CopyOutlined />}
              onClick={handleCopyNotInterfacedData}
              size="small"
              type="primary"
            >
              Copy Data
            </Button>
          </div>
        }
        open={notInterfacedModalVisible}
        onCancel={() => setNotInterfacedModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setNotInterfacedModalVisible(false)}>
            Close
          </Button>
        ]}
        width="90%"
        style={{ top: 20 }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Showing {getFilteredNotInterfacedOrders().length} orders
            {orderStatusFilter.length > 0 && (
              <span> (filtered by: {orderStatusFilter.join(', ')})</span>
            )}
          </Text>
        </div>
        <Table
          dataSource={getFilteredNotInterfacedOrders()}
          columns={[
            {
              title: 'Marketplace',
              dataIndex: 'marketplace',
              key: 'marketplace',
              render: (text) => <Tag color="blue">{text}</Tag>,
              sorter: (a, b) => (a.marketplace || '').localeCompare(b.marketplace || ''),
            },
            {
              title: 'Brand',
              dataIndex: 'brand',
              key: 'brand',
              render: (text) => <Tag color="green">{text}</Tag>,
              sorter: (a, b) => (a.brand || '').localeCompare(b.brand || ''),
            },
            {
              title: 'Order Number',
              dataIndex: 'order_number',
              key: 'order_number',
              render: (text) => (
                <Text style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                  {text || 'N/A'}
                </Text>
              ),
              sorter: (a, b) => (a.order_number || '').localeCompare(b.order_number || ''),
            },
            {
              title: 'Order Status',
              dataIndex: 'order_status',
              key: 'order_status',
              render: (text) => {
                const status = text || 'Pending';
                let color = 'default';
                if (status.toLowerCase().includes('pending')) color = 'orange';
                else if (status.toLowerCase().includes('processing')) color = 'blue';
                else if (status.toLowerCase().includes('shipped')) color = 'green';
                else if (status.toLowerCase().includes('delivered')) color = 'green';
                else if (status.toLowerCase().includes('cancelled')) color = 'red';
                return <Tag color={color}>{status}</Tag>;
              },
              sorter: (a, b) => (a.order_status || '').localeCompare(b.order_status || ''),
            },
            {
              title: 'Remark',
              dataIndex: 'remark',
              key: 'remark',
              render: (text, record) => (
                <EditableRemark 
                  value={text || ''} 
                  onSave={(newRemark) => handleRemarkUpdate(record, newRemark, true)}
                />
              ),
            },
          ]}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} orders`,
            size: 'small',
            pageSizeOptions: ['20', '50', '100', '200']
          }}
          scroll={{ x: 800, y: 'calc(100vh - 300px)' }}
          size="small"
          bordered
          rowKey={(record) => `modal-not-interfaced-${record.order_number}-${record.marketplace}-${record.brand || 'no-brand'}`}
        />
      </Modal>

    </div>
  );
};

export default Dashboard;
