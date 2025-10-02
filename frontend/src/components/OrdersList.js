import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  DatePicker,
  Input,
  Select,
  Space,
  Typography,
  Row,
  Col,
  message,
  Tag,
  Tooltip,
  Input as AntInput,
  Spin,
  Checkbox,
  Badge,
  Divider,
  Collapse,
  Alert,
  Empty
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  EditOutlined,
  CloseOutlined,
  CheckOutlined,
  ThunderboltOutlined,
  DownloadOutlined,
  ExportOutlined,
  BarChartOutlined,
  SettingOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  DownOutlined,
  UpOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import api, { ordersAPI, apiService } from '../utils/api';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

// Checkbox Filter Component
const CheckboxFilter = ({ 
  field, 
  selectedKeys, 
  setSelectedKeys, 
  confirm, 
  clearFilters, 
  getUniqueValues,
  isLoading = false
}) => {
  const uniqueValues = getUniqueValues(field);
  const allSelected = selectedKeys.length === uniqueValues.length && uniqueValues.length > 0;
  const someSelected = selectedKeys.length > 0 && selectedKeys.length < uniqueValues.length;

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedKeys(uniqueValues);
    } else {
      setSelectedKeys([]);
    }
  };

  const handleItemChange = (value, checked) => {
    if (checked) {
      setSelectedKeys([...selectedKeys, value]);
    } else {
      setSelectedKeys(selectedKeys.filter(key => key !== value));
    }
  };

  return (
    <div style={{ padding: 8, maxHeight: 300, overflowY: 'auto', minWidth: 200 }}>
      <div style={{ marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
        <Checkbox
          indeterminate={someSelected}
          checked={allSelected}
          onChange={(e) => handleSelectAll(e.target.checked)}
          disabled={isLoading}
        >
          <strong>Select All ({uniqueValues.length})</strong>
          {isLoading && <Spin size="small" style={{ marginLeft: 8 }} />}
        </Checkbox>
      </div>
      
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="small" />
            <div style={{ marginTop: 8, fontSize: '12px', color: '#999' }}>
              Updating options...
            </div>
          </div>
        ) : uniqueValues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>
            No options available
          </div>
        ) : (
          uniqueValues.map(value => (
          <div key={value} style={{ marginBottom: 4 }}>
            <Checkbox
              checked={selectedKeys.includes(value)}
              onChange={(e) => handleItemChange(value, e.target.checked)}
            >
              {value}
            </Checkbox>
          </div>
          ))
        )}
      </div>
      
      <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
            disabled={isLoading}
          >
            Filter
          </Button>
          <Button
            onClick={() => clearFilters()}
            size="small"
            style={{ width: 90 }}
            disabled={isLoading}
          >
            Reset
          </Button>
        </Space>
      </div>
    </div>
  );
};

console.log('📁 OrdersList.js - Importing api from utils/api');
console.log('📁 OrdersList.js - api instance:', api);
console.log('📁 OrdersList.js - api.defaults.baseURL:', api.defaults?.baseURL);

// Configure dayjs for timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

// Set default timezone to WIB (Indonesia Western Time)
dayjs.tz.setDefault('Asia/Jakarta');

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const OrdersList = () => {
  const { theme } = useTheme();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 100,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: false,
    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
    pageSizeOptions: ['50', '100', '200', '500'],
    size: 'default',
    simple: false,
    hideOnSinglePage: false
  });


  // UI state
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [cascadingLoading, setCascadingLoading] = useState({});
  
  // Filter states
  const [filters, setFilters] = useState({
    dateRange: [dayjs.tz().startOf('day'), dayjs.tz().endOf('day')], // Default to today in WIB
    orderNumbers: [], // Multiple order numbers
    interface_status: 'Not Yet Interface', // Default to Not Yet Interface
    order_status: [], // Multiple order statuses
    pic: '',
    remarks: ''
  });
  

  // Column filter states
  const [columnFilters, setColumnFilters] = useState({
    marketplace: [],
    brand: [],
    order_status: [],
    transporter: [],
    batch: [],
    pic: [],
    remarks: []
  });

  // Editable remarks state
  const [editingRemarks, setEditingRemarks] = useState({});
  const [editingValue, setEditingValue] = useState('');


  // Marketplace integration states
  const [marketplaceStatus, setMarketplaceStatus] = useState({});
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceAppsEnabled, setMarketplaceAppsEnabled] = useState(true);


  // Helper function to fetch orders with specific filters
  const fetchOrdersWithFilters = useCallback(async (page = 1, pageSize = 100, customFilters = null, customColumnFilters = null) => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize
      };

      // Use custom filters if provided, otherwise use current filters
      const filtersToUse = customFilters || filters;
      const columnFiltersToUse = customColumnFilters || columnFilters;

      // Add interface_status filter only if specified
      if (filtersToUse.interface_status) {
        params.interface_status = filtersToUse.interface_status;
      }
      
      // Add order_status filter if specified
      if (filtersToUse.order_status && filtersToUse.order_status.length > 0) {
        params.order_status = filtersToUse.order_status.join(',');
      }
      
      // Handle date range filter
      if (filtersToUse.dateRange && filtersToUse.dateRange.length === 2) {
        params.start_date = filtersToUse.dateRange[0].format('YYYY-MM-DD');
        params.end_date = filtersToUse.dateRange[1].format('YYYY-MM-DD');
      } else if (filtersToUse.dateRange === null) {
        // No date filter - don't send start_date and end_date to show all data
        // Backend will return all data when no date parameters are provided
      } else {
        // Default to today if date range is empty array or invalid
        params.start_date = dayjs().format('YYYY-MM-DD');
        params.end_date = dayjs().format('YYYY-MM-DD');
      }
      
      if (filtersToUse.brand) {
        params.brand = filtersToUse.brand;
      }
      if (filtersToUse.marketplace) {
        params.marketplace = filtersToUse.marketplace;
      }
      if (filtersToUse.pic) {
        params.pic = filtersToUse.pic;
      }
      if (filtersToUse.remarks) {
        params.remarks = filtersToUse.remarks;
      }
      if (filtersToUse.orderNumbers && filtersToUse.orderNumbers.length > 0) {
        params.order_numbers = filtersToUse.orderNumbers.join(',');
      }

      // Add column filter parameters
      if (columnFiltersToUse.marketplace && columnFiltersToUse.marketplace.length > 0) {
        params.marketplace_filters = columnFiltersToUse.marketplace.join(',');
      }
      if (columnFiltersToUse.brand && columnFiltersToUse.brand.length > 0) {
        params.brand_filters = columnFiltersToUse.brand.join(',');
      }
      if (columnFiltersToUse.order_status && columnFiltersToUse.order_status.length > 0) {
        params.order_status_filters = columnFiltersToUse.order_status.join(',');
      }
      if (columnFiltersToUse.transporter && columnFiltersToUse.transporter.length > 0) {
        params.transporter_filters = columnFiltersToUse.transporter.join(',');
      }
      if (columnFiltersToUse.batch && columnFiltersToUse.batch.length > 0) {
        params.batch_filters = columnFiltersToUse.batch.join(',');
      }
      if (columnFiltersToUse.pic && columnFiltersToUse.pic.length > 0) {
        params.pic_filters = columnFiltersToUse.pic.join(',');
      }
      if (columnFiltersToUse.remarks && columnFiltersToUse.remarks.length > 0) {
        params.remarks_filters = columnFiltersToUse.remarks.join(',');
      }

      console.log('🔍 OrdersList.js - About to make API call');
      console.log('🔍 OrdersList.js - api instance:', api);
      console.log('🔍 OrdersList.js - api.defaults.baseURL:', api.defaults?.baseURL);
      console.log('🔍 OrdersList.js - params:', params);
      
      const response = await api.get('/api/orders/list', { params });
      
      setOrders(response.data.orders);
      setPagination(prev => ({
        ...prev,
        current: response.data.pagination.current_page,
        pageSize: response.data.pagination.page_size,
        total: response.data.pagination.total_count
      }));

    } catch (error) {
      console.error('Error fetching orders:', error);
      message.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [filters, columnFilters]);

  // Fetch orders data
  const fetchOrders = useCallback(async (page = 1, pageSize = 100) => {
    fetchOrdersWithFilters(page, pageSize);
  }, [fetchOrdersWithFilters]);

  // Handle filter changes with cascading updates
  const handleFilterChange = async (key, value) => {
    const newFilters = {
      ...filters,
      [key]: value
    };
    
    setFilters(newFilters);
    
    // Update cascading filters when main filters change
    if (key === 'dateRange' || key === 'interface_status') {
      await updateCascadingFiltersFromMainFilters(newFilters);
    }
  };

  // Update cascading filters when main filters change
  const updateCascadingFiltersFromMainFilters = async (newFilters) => {
    const fieldsToUpdate = ['marketplace', 'brand', 'order_status', 'transporter', 'batch', 'pic', 'remarks'];
    
    // Create current filters object for cascading
    const currentFilters = {
      ...newFilters,
      ...columnFilters
    };
    
    // Update each field with cascading values
    for (const field of fieldsToUpdate) {
      try {
        await fetchCascadingFilterValues(field, currentFilters);
      } catch (error) {
        console.error(`Error updating cascading filter for ${field}:`, error);
      }
    }
  };

  // Handle column filter changes with cascading updates
  const handleColumnFilterChange = async (key, value) => {
    const newColumnFilters = {
      ...columnFilters,
      [key]: value
    };
    
    setColumnFilters(newColumnFilters);
    
    // Automatically apply the filter when column filter changes
    setPagination(prev => ({ ...prev, current: 1 }));
    
    // Update cascading filters for other fields
    await updateCascadingFilters(key, newColumnFilters);
    
    // Use the new filter state directly to avoid race condition
    fetchOrdersWithFilters(1, pagination.pageSize, filters, newColumnFilters);
  };

  // Update cascading filters when one filter changes
  const updateCascadingFilters = async (changedField, newColumnFilters) => {
    const fieldsToUpdate = ['marketplace', 'brand', 'order_status', 'transporter', 'batch', 'pic', 'remarks'];
    
    // Remove the changed field from the list to avoid updating itself
    const fieldsToUpdateFiltered = fieldsToUpdate.filter(field => field !== changedField);
    
    // Create current filters object for cascading
    const currentFilters = {
      ...filters,
      ...newColumnFilters
    };
    
    // Update each field with cascading values
    for (const field of fieldsToUpdateFiltered) {
      try {
        await fetchCascadingFilterValues(field, currentFilters);
      } catch (error) {
        console.error(`Error updating cascading filter for ${field}:`, error);
      }
    }
  };

  // State for unique values from backend
  const [uniqueValues, setUniqueValues] = useState({
    marketplace: [],
    brand: [],
    order_status: [],
    transporter: [],
    batch: [],
    pic: [],
    remarks: [],
    interface_status: []
  });

  // Fetch cascading filter values from backend
  const fetchCascadingFilterValues = useCallback(async (field, currentFilters = {}) => {
    // Set loading state for this field
    setCascadingLoading(prev => ({ ...prev, [field]: true }));
    
    try {
      console.log(`🔍 Fetching cascading filter values for field: ${field}`, currentFilters);
      
      const params = {
        field: field
      };

      // Add current filter values to params
      if (currentFilters.dateRange && currentFilters.dateRange.length === 2) {
        params.start_date = currentFilters.dateRange[0].format('YYYY-MM-DD');
        params.end_date = currentFilters.dateRange[1].format('YYYY-MM-DD');
      }
      
      if (currentFilters.interface_status) {
        params.interface_status = currentFilters.interface_status;
      }

      // Add column filters
      if (currentFilters.marketplace && currentFilters.marketplace.length > 0) {
        params.marketplace_filters = currentFilters.marketplace.join(',');
      }
      if (currentFilters.brand && currentFilters.brand.length > 0) {
        params.brand_filters = currentFilters.brand.join(',');
      }
      if (currentFilters.order_status && currentFilters.order_status.length > 0) {
        params.order_status_filters = currentFilters.order_status.join(',');
      }
      if (currentFilters.transporter && currentFilters.transporter.length > 0) {
        params.transporter_filters = currentFilters.transporter.join(',');
      }
      if (currentFilters.batch && currentFilters.batch.length > 0) {
        params.batch_filters = currentFilters.batch.join(',');
      }
      if (currentFilters.pic && currentFilters.pic.length > 0) {
        params.pic_filters = currentFilters.pic.join(',');
      }
      if (currentFilters.remarks && currentFilters.remarks.length > 0) {
        params.remarks_filters = currentFilters.remarks.join(',');
      }

      const response = await api.get('/api/orders/cascading-filters', { params });
      
      if (response.data && response.data.values && response.data.values.length > 0) {
        setUniqueValues(prev => ({
          ...prev,
          [field]: response.data.values
        }));
        console.log(`✅ Successfully loaded ${response.data.values.length} cascading filter values for ${field}`);
        return response.data.values;
      } else {
        console.log(`⚠️ No cascading values returned for ${field}`);
        setUniqueValues(prev => ({
          ...prev,
          [field]: []
        }));
        return [];
      }
    } catch (error) {
      console.error(`Error fetching cascading filter values for ${field}:`, error);
      // Fallback to regular unique values fetch
      return await fetchUniqueValues(field);
    } finally {
      // Clear loading state for this field
      setCascadingLoading(prev => ({ ...prev, [field]: false }));
    }
  }, []);

  // Fetch unique values from backend
  const fetchUniqueValues = useCallback(async (field) => {
    try {
      console.log(`🔍 Fetching unique values for field: ${field}`);
      const response = await apiService.get(`/api/orders/unique-values?field=${field}`);
      console.log(`📊 Response for ${field}:`, response);
      console.log(`📊 Response type:`, typeof response);
      console.log(`📊 Response.values:`, response?.values);
      console.log(`📊 Response.values length:`, response?.values?.length);
      
      if (response && response.values) {
        setUniqueValues(prev => ({
          ...prev,
          [field]: response.values
        }));
        if (response.values.length > 0) {
          console.log(`✅ Successfully loaded ${response.values.length} unique values for ${field}`);
        } else {
          console.log(`ℹ️ No data available for ${field} filter (empty dataset)`);
        }
      } else {
        console.log(`⚠️ No values returned for ${field}, trying fallback...`);
        throw new Error(`No values returned for ${field}`);
      }
    } catch (error) {
      console.error(`Error fetching unique values for ${field}:`, error);
      // Fallback: fetch all data to get complete unique values
      try {
        // Try to get ALL data by using a very large page size or multiple requests
        const allDataResponse = await api.get('/api/orders/list', { 
          params: { 
            page: 1, 
            page_size: 100000 // Much larger number to capture all data
          } 
        });
        if (allDataResponse.data && allDataResponse.data.orders) {
          const allOrders = allDataResponse.data.orders;
          const localValues = [...new Set(allOrders.map(order => order[field]).filter(Boolean))];
          setUniqueValues(prev => ({
            ...prev,
            [field]: localValues.sort()
          }));
          console.log(`✅ Fallback: Got ${localValues.length} unique values for ${field} from ${allOrders.length} orders`);
        }
      } catch (fallbackError) {
        console.error(`Error fetching all data for unique values fallback:`, fallbackError);
        // Try alternative approach: fetch data in chunks
        try {
          console.log(`🔄 Trying chunked approach for ${field}...`);
          let allOrders = [];
          let page = 1;
          let hasMore = true;
          
          while (hasMore && page <= 10) { // Limit to 10 pages to avoid infinite loop
            const chunkResponse = await api.get('/api/orders/list', { 
              params: { 
                page: page, 
                page_size: 5000 
              } 
            });
            
            if (chunkResponse.data && chunkResponse.data.orders && chunkResponse.data.orders.length > 0) {
              allOrders = [...allOrders, ...chunkResponse.data.orders];
              page++;
            } else {
              hasMore = false;
            }
          }
          
          if (allOrders.length > 0) {
            const localValues = [...new Set(allOrders.map(order => order[field]).filter(Boolean))];
            setUniqueValues(prev => ({
              ...prev,
              [field]: localValues.sort()
            }));
            console.log(`✅ Chunked fallback: Got ${localValues.length} unique values for ${field} from ${allOrders.length} orders`);
          } else {
            throw new Error('No data found in chunked approach');
          }
        } catch (chunkError) {
          console.error(`Chunked approach also failed:`, chunkError);
          // Final fallback to current page data
          const localValues = [...new Set(orders.map(order => order[field]).filter(Boolean))];
          setUniqueValues(prev => ({
            ...prev,
            [field]: localValues.sort()
          }));
          console.log(`⚠️ Final fallback: Using ${localValues.length} values from current page for ${field}`);
        }
      }
    }
  }, []); // Remove orders dependency to prevent infinite loop

  // Get unique values for column filters (with backend fallback)
  const getUniqueValues = (dataIndex) => {
    // Use backend data if available, otherwise fallback to local data
    if (uniqueValues[dataIndex] && uniqueValues[dataIndex].length > 0) {
      return uniqueValues[dataIndex];
    }
    
    // Fallback to local data from current page (this is the final fallback)
    // The fetchUniqueValues function will try to get all data first
    const localValues = [...new Set(orders.map(order => order[dataIndex]).filter(Boolean))];
    return localValues.sort();
  };

  // Apply filters
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchOrdersWithFilters(1, pagination.pageSize);
  };

  // Reset filters
  const handleReset = () => {
    const resetFilters = {
      dateRange: null, // Remove date filter to show all data
      orderNumbers: [], // Clear order numbers
      interface_status: '', // Remove interface status filter to show all statuses
      order_status: [], // Clear order status filter
      pic: '',
      remarks: ''
    };
    
    const resetColumnFilters = {
      marketplace: [],
      brand: [],
      order_status: [],
      transporter: [],
      batch: [],
      pic: [],
      remarks: []
    };
    
    setFilters(resetFilters);
    setColumnFilters(resetColumnFilters);
    setPagination(prev => ({ ...prev, current: 1 }));
    
    // Fetch orders immediately with reset filters
    fetchOrdersWithFilters(1, pagination.pageSize, resetFilters, resetColumnFilters);
  };


  // Handle remarks editing
  const handleEditRemarks = (orderId, currentRemarks) => {
    setEditingRemarks({ [orderId]: true });
    setEditingValue(currentRemarks || '');
  };

  const handleSaveRemarks = async (orderId) => {
    try {
      await ordersAPI.updateOrderRemarks(orderId, editingValue);
      message.success('Remarks updated successfully');
      
      // Update the local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, remarks: editingValue }
          : order
      ));
      
      setEditingRemarks({});
      setEditingValue('');
    } catch (error) {
      console.error('Error updating remarks:', error);
      message.error('Failed to update remarks');
    }
  };

  const handleCancelEdit = () => {
    setEditingRemarks({});
    setEditingValue('');
  };

  // Handle Enter key press in input fields
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle pagination change
  const handleTableChange = (pagination) => {
    fetchOrdersWithFilters(pagination.current, pagination.pageSize, filters);
  };


  // Marketplace functions
  const checkMarketplaceStatus = async () => {
    setMarketplaceLoading(true);
    try {
      // Check if marketplace apps are enabled first
      const configResponse = await api.get('/api/config');
      const isMarketplaceEnabled = configResponse.data?.marketplace_apps_enabled;
      
      if (!isMarketplaceEnabled) {
        console.log('🚫 Marketplace apps are disabled, skipping status check');
        setMarketplaceStatus({});
        setMarketplaceLoading(false);
        return;
      }
      
      const response = await api.get('/api/marketplace-status');
      
      if (response.data) {
        // Backend returns status directly as an object
        setMarketplaceStatus(response.data);
      } else {
        console.warn('⚠️ No status data received from API');
        setMarketplaceStatus({});
      }
    } catch (error) {
      console.error('❌ Error checking marketplace status:', error);
      if (error.code === 'ECONNABORTED') {
        message.warning('Request timeout - marketplace status check is taking longer than expected');
      } else if (error.response?.status === 500) {
        message.error('Server error while checking marketplace status');
      } else {
        message.error('Gagal mengecek status marketplace - Check your connection');
      }
      setMarketplaceStatus({});
    } finally {
      setMarketplaceLoading(false);
    }
  };



  const runAllMarketplaceApps = async () => {
    setMarketplaceLoading(true);
    try {
      // Filter orders to only include "Not Yet Interface" orders
      const notYetInterfaceOrders = orders.filter(order => order.interface_status === 'Not Yet Interface');
      
      if (notYetInterfaceOrders.length === 0) {
        message.info('Tidak ada orders dengan status "Not Yet Interface" untuk dijalankan');
        setMarketplaceLoading(false);
        return;
      }
      
      // Get unique marketplaces from "Not Yet Interface" orders
      const marketplaces = [...new Set(notYetInterfaceOrders.map(order => order.marketplace.toLowerCase()))];
      
      // Filter marketplaces that have status data
      const availableMarketplaces = marketplaces.filter(mp => marketplaceStatus[mp]);
      
      message.info(`Menjalankan marketplace apps untuk ${availableMarketplaces.length} marketplace dengan ${notYetInterfaceOrders.length} orders "Not Yet Interface"`);
      
      const response = await api.post('/api/run-all-marketplace-apps');
      
      if (response.data.success) {
        message.success(`Marketplace apps berhasil dijalankan untuk ${marketplaces.length} marketplace!`);
        setTimeout(() => {
          checkMarketplaceStatus();
        }, 3000);
      } else {
        message.error(response.data.message || 'Gagal menjalankan beberapa apps');
      }
    } catch (error) {
      console.error('Error running all apps:', error);
      if (error.code === 'ECONNABORTED') {
        message.warning('Request timeout - running all apps is taking longer than expected');
      } else {
        message.error('Gagal menjalankan semua apps');
      }
    } finally {
      setMarketplaceLoading(false);
    }
  };

  const checkMarketplaceAppsStatus = async () => {
    try {
      const response = await api.get('/check-auto-run-status');
      setMarketplaceAppsEnabled(response.data.marketplace_apps_enabled || false);
    } catch (error) {
      console.error('Error checking marketplace apps status:', error);
      setMarketplaceAppsEnabled(false);
    }
  };



  // Add state to prevent multiple simultaneous refresh calls
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  // Retry marketplace status check with debounce
  const retryMarketplaceStatus = async () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime;
    
    // Prevent refresh if already in progress or if called too frequently (within 30 seconds)
    if (isRefreshing || timeSinceLastRefresh < 30000) {
      if (timeSinceLastRefresh < 30000) {
        message.warning('Please wait before refreshing again. Minimum 30 seconds between refreshes.');
      }
      return;
    }
    
    setIsRefreshing(true);
    setLastRefreshTime(now);
    
    const hideLoading = message.loading('Refreshing interface status from external database... This may take a while.', 0);
    
    try {
      // First, refresh interface status from external database
      // Use longer timeout for this operation as it queries external database
      const refreshResponse = await api.post('/api/refresh-interface-status', {}, {
        timeout: 120000 // 2 minutes timeout for external database query
      });
      
      if (refreshResponse.data.success) {
        const { updated_count, total_external_orders } = refreshResponse.data;
        
        if (updated_count > 0) {
          message.success(`Interface status refreshed! ${updated_count} orders updated from ${total_external_orders} external orders`);
        } else {
          message.info('No orders needed interface status update');
        }
        
        // Then refresh marketplace status and orders data
        await Promise.all([
          checkMarketplaceStatus(),
          fetchOrders(pagination.current, pagination.pageSize)
        ]);
        
        message.success('All data refreshed successfully!');
      } else {
        message.error('Failed to refresh interface status from external database');
      }
    } catch (error) {
      console.error('Error refreshing interface status:', error);
      if (error.code === 'ECONNABORTED') {
        message.warning('Refresh status timeout - External database query is taking longer than expected. Please try again.');
      } else if (error.response?.status === 500) {
        message.error('Server error while refreshing interface status');
      } else {
        message.error('Failed to refresh interface status - Check your connection');
      }
      
      // Still try to refresh marketplace status and orders data as fallback
      await Promise.all([
        checkMarketplaceStatus(),
        fetchOrders(pagination.current, pagination.pageSize)
      ]);
    } finally {
      hideLoading();
      setIsRefreshing(false);
    }
  };

  // Retry fetching unique values if they failed initially
  const retryUniqueValues = useCallback(async () => {
    const fields = ['marketplace', 'brand', 'order_status', 'transporter', 'batch', 'pic', 'remarks', 'interface_status'];
    for (const field of fields) {
      // Only retry if we don't have data for this field
      if (!uniqueValues[field] || uniqueValues[field].length === 0) {
        await fetchUniqueValues(field);
      }
    }
  }, [fetchUniqueValues]); // Remove uniqueValues dependency to prevent infinite loop

  // Export functionality
  const handleExport = async (format = 'csv') => {
    setExportLoading(true);
    try {
      // Get all data for export (not just current page)
      const exportParams = {
        page: 1,
        page_size: 100000, // Large number to get all data
        ...filters,
        ...columnFilters
      };

      // Add date range if specified
      if (filters.dateRange && filters.dateRange.length === 2) {
        exportParams.start_date = filters.dateRange[0].format('YYYY-MM-DD');
        exportParams.end_date = filters.dateRange[1].format('YYYY-MM-DD');
      }

      // Add other filters
      if (filters.orderNumbers && filters.orderNumbers.length > 0) {
        exportParams.order_numbers = filters.orderNumbers.join(',');
      }
      if (filters.interface_status) {
        exportParams.interface_status = filters.interface_status;
      }
      if (filters.order_status && filters.order_status.length > 0) {
        exportParams.order_status = filters.order_status.join(',');
      }
      if (filters.pic) {
        exportParams.pic = filters.pic;
      }
      if (filters.remarks) {
        exportParams.remarks = filters.remarks;
      }

      // Add column filters
      if (columnFilters.marketplace && columnFilters.marketplace.length > 0) {
        exportParams.marketplace_filters = columnFilters.marketplace.join(',');
      }
      if (columnFilters.brand && columnFilters.brand.length > 0) {
        exportParams.brand_filters = columnFilters.brand.join(',');
      }
      if (columnFilters.order_status && columnFilters.order_status.length > 0) {
        exportParams.order_status_filters = columnFilters.order_status.join(',');
      }
      if (columnFilters.transporter && columnFilters.transporter.length > 0) {
        exportParams.transporter_filters = columnFilters.transporter.join(',');
      }
      if (columnFilters.batch && columnFilters.batch.length > 0) {
        exportParams.batch_filters = columnFilters.batch.join(',');
      }
      if (columnFilters.pic && columnFilters.pic.length > 0) {
        exportParams.pic_filters = columnFilters.pic.join(',');
      }
      if (columnFilters.remarks && columnFilters.remarks.length > 0) {
        exportParams.remarks_filters = columnFilters.remarks.join(',');
      }

      const response = await api.get('/api/orders/list', { params: exportParams });
      const exportData = response.data.orders;

      if (format === 'csv') {
        // Convert to CSV
        const headers = [
          'ID', 'Marketplace', 'Brand', 'Order Number', 'Order Status', 'AWB', 
          'Transporter', 'Order Date', 'SLA', 'Batch', 'PIC', 'Upload Date', 
          'Interface Status', 'Remarks'
        ];
        
        const csvContent = [
          headers.join(','),
          ...exportData.map(order => [
            order.id || '',
            order.marketplace || '',
            order.brand || '',
            order.order_number || '',
            order.order_status || '',
            order.awb || '',
            order.transporter || '',
            order.order_date || '',
            order.sla || '',
            order.batch || '',
            order.pic || '',
            order.upload_date || '',
            order.interface_status || '',
            (order.remarks || '').replace(/,/g, ';') // Replace commas to avoid CSV issues
          ].join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `orders_export_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        message.success(`Exported ${exportData.length} orders to CSV`);
      }
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchOrders();
    checkMarketplaceStatus();
    checkMarketplaceAppsStatus();
    
    // Fetch unique values for all filter fields
    const fields = ['marketplace', 'brand', 'order_status', 'transporter', 'batch', 'pic', 'remarks', 'interface_status'];
    console.log('🔄 Loading unique values for fields:', fields);
    fields.forEach(field => {
      fetchUniqueValues(field);
    });
  }, []); // Remove dependencies to prevent infinite loop

  // Table columns
  const columns = [
    {
      title: 'Marketplace',
      dataIndex: 'marketplace',
      key: 'marketplace',
      width: 150,
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => {
        // Initialize selectedKeys with current filter value when dropdown opens
        const currentFilterValue = columnFilters.marketplace;
        const effectiveSelectedKeys = selectedKeys.length > 0 ? selectedKeys : currentFilterValue;
        
        return (
        <CheckboxFilter
          field="marketplace"
          selectedKeys={effectiveSelectedKeys}
          setSelectedKeys={setSelectedKeys}
          confirm={() => {
            // Use the current selectedKeys from the filter dropdown
            handleColumnFilterChange('marketplace', effectiveSelectedKeys);
            confirm();
          }}
          clearFilters={() => {
            setSelectedKeys([]);
            handleColumnFilterChange('marketplace', []);
            clearFilters();
          }}
          getUniqueValues={getUniqueValues}
          isLoading={cascadingLoading.marketplace}
        />
        );
      },
      filterIcon: (filtered) => (
        <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      filteredValue: columnFilters.marketplace,
      onFilter: (value, record) => {
        // Since filtering is handled server-side, always return true for client-side display
        // The actual filtering is done via API parameters in fetchOrdersWithFilters
        return true;
      },
      render: (text, record) => {
        return <span>{text}</span>;
      },
    },
    {
      title: 'Brand',
      dataIndex: 'brand',
      key: 'brand',
      width: 120,
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => {
        // Initialize selectedKeys with current filter value when dropdown opens
        const currentFilterValue = columnFilters.brand;
        const effectiveSelectedKeys = selectedKeys.length > 0 ? selectedKeys : currentFilterValue;
        
        return (
        <CheckboxFilter
          field="brand"
          selectedKeys={effectiveSelectedKeys}
          setSelectedKeys={setSelectedKeys}
          confirm={() => {
            // Use the current selectedKeys from the filter dropdown
            handleColumnFilterChange('brand', effectiveSelectedKeys);
            confirm();
          }}
          clearFilters={() => {
            setSelectedKeys([]);
            handleColumnFilterChange('brand', []);
            clearFilters();
          }}
          getUniqueValues={getUniqueValues}
          isLoading={cascadingLoading.brand}
        />
        );
      },
      filterIcon: (filtered) => (
        <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      filteredValue: columnFilters.brand,
      onFilter: (value, record) => {
        // Since filtering is handled server-side, always return true for client-side display
        // The actual filtering is done via API parameters in fetchOrdersWithFilters
        return true;
      },
    },
    {
      title: 'Order Number',
      dataIndex: 'order_number',
      key: 'order_number',
      width: 150,
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <Tooltip placement="topLeft" title={text}>
          {text}
        </Tooltip>
      ),
    },
    {
      title: 'Order Status',
      dataIndex: 'order_status',
      key: 'order_status',
      width: 150,
      ellipsis: {
        showTitle: false,
      },
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => {
        // Initialize selectedKeys with current filter value when dropdown opens
        const currentFilterValue = columnFilters.order_status;
        const effectiveSelectedKeys = selectedKeys.length > 0 ? selectedKeys : currentFilterValue;
        
        return (
        <CheckboxFilter
          field="order_status"
          selectedKeys={effectiveSelectedKeys}
          setSelectedKeys={setSelectedKeys}
          confirm={() => {
            // Use the current selectedKeys from the filter dropdown
            handleColumnFilterChange('order_status', effectiveSelectedKeys);
            confirm();
          }}
          clearFilters={() => {
            setSelectedKeys([]);
            handleColumnFilterChange('order_status', []);
            clearFilters();
          }}
          getUniqueValues={getUniqueValues}
          isLoading={cascadingLoading.order_status}
        />
        );
      },
      filterIcon: (filtered) => (
        <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      filteredValue: columnFilters.order_status,
      onFilter: (value, record) => {
        // Since filtering is handled server-side, always return true for client-side display
        // The actual filtering is done via API parameters in fetchOrdersWithFilters
        return true;
      },
      render: (status) => {
        let color = 'default';
        
        // Green statuses - Completed/Delivered states
        const greenStatuses = [
          'completed', 'delivered', 'returned', 'confirmed', 'shipped', 'shipping', 
          'in_transit', 'to_confirm_receive', 'info_st_domestic_del', 'info_st_domestic_ret'
        ];
        
        // Yellow statuses - Pending/Processing states
        const yellowStatuses = [
          'pending', 'pending_payment', 'processed', 'paid', 'processing', 'order accepted', 
          'seller accept order', 'matched', 'packed', 'ready_to_ship', 'ready pickup', 
          'pu', 'awaiting_shipment', 'awaiting_collection', 'to_return', 'retry_ship', 
          'fp', 'd', 'in_cancel', 'unpaid'
        ];
        
        // Red statuses - Cancelled/Error states
        const redStatuses = [
          'cancelled', 'canceled', 'cancellations', 'cancel', 'cx', 'x', 
          'request_cancel', 'failed', 'expired'
        ];
        
        // Normalize status for comparison (trim whitespace and convert to lowercase)
        const normalizedStatus = status ? status.trim().toLowerCase() : '';
        
        // Check for exact matches first, then partial matches
        if (redStatuses.some(s => normalizedStatus === s.toLowerCase() || normalizedStatus.includes(s.toLowerCase()))) {
          color = 'red';
        } else if (greenStatuses.some(s => normalizedStatus === s.toLowerCase() || normalizedStatus.includes(s.toLowerCase()))) {
          color = 'green';
        } else if (yellowStatuses.some(s => normalizedStatus === s.toLowerCase() || normalizedStatus.includes(s.toLowerCase()))) {
          color = 'gold';
        }
        
        return (
          <Tooltip placement="topLeft" title={status}>
            <Tag color={color}>{status}</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'AWB',
      dataIndex: 'awb',
      key: 'awb',
      width: 120,
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <Tooltip placement="topLeft" title={text}>
          {text || '-'}
        </Tooltip>
      ),
    },
    {
      title: 'Transporter',
      dataIndex: 'transporter',
      key: 'transporter',
      width: 120,
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => {
        // Initialize selectedKeys with current filter value when dropdown opens
        const currentFilterValue = columnFilters.transporter;
        const effectiveSelectedKeys = selectedKeys.length > 0 ? selectedKeys : currentFilterValue;
        
        return (
        <CheckboxFilter
          field="transporter"
          selectedKeys={effectiveSelectedKeys}
          setSelectedKeys={setSelectedKeys}
          confirm={() => {
            // Use the current selectedKeys from the filter dropdown
            handleColumnFilterChange('transporter', effectiveSelectedKeys);
            confirm();
          }}
          clearFilters={() => {
            setSelectedKeys([]);
            handleColumnFilterChange('transporter', []);
            clearFilters();
          }}
          getUniqueValues={getUniqueValues}
          isLoading={cascadingLoading.transporter}
        />
        );
      },
      filterIcon: (filtered) => (
        <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      filteredValue: columnFilters.transporter,
      onFilter: (value, record) => {
        // Since filtering is handled server-side, always return true for client-side display
        // The actual filtering is done via API parameters in fetchOrdersWithFilters
        return true;
      },
    },
    {
      title: 'Order Date',
      dataIndex: 'order_date',
      key: 'order_date',
      width: 150,
      sorter: (a, b) => dayjs.tz(a.order_date, 'Asia/Jakarta').unix() - dayjs.tz(b.order_date, 'Asia/Jakarta').unix(),
      render: (date) => date ? dayjs.tz(date, 'Asia/Jakarta').format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: 'SLA',
      dataIndex: 'sla',
      key: 'sla',
      width: 80,
    },
    {
      title: 'Batch',
      dataIndex: 'batch',
      key: 'batch',
      width: 100,
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => {
        // Initialize selectedKeys with current filter value when dropdown opens
        const currentFilterValue = columnFilters.batch;
        const effectiveSelectedKeys = selectedKeys.length > 0 ? selectedKeys : currentFilterValue;
        
        return (
        <CheckboxFilter
          field="batch"
          selectedKeys={effectiveSelectedKeys}
          setSelectedKeys={setSelectedKeys}
          confirm={() => {
            // Use the current selectedKeys from the filter dropdown
            handleColumnFilterChange('batch', effectiveSelectedKeys);
            confirm();
          }}
          clearFilters={() => {
            setSelectedKeys([]);
            handleColumnFilterChange('batch', []);
            clearFilters();
          }}
          getUniqueValues={getUniqueValues}
          isLoading={cascadingLoading.batch}
        />
        );
      },
      filterIcon: (filtered) => (
        <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      filteredValue: columnFilters.batch,
      onFilter: (value, record) => {
        // Since filtering is handled server-side, always return true for client-side display
        // The actual filtering is done via API parameters in fetchOrdersWithFilters
        return true;
      },
    },
    {
      title: 'PIC',
      dataIndex: 'pic',
      key: 'pic',
      width: 100,
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => {
        // Initialize selectedKeys with current filter value when dropdown opens
        const currentFilterValue = columnFilters.pic;
        const effectiveSelectedKeys = selectedKeys.length > 0 ? selectedKeys : currentFilterValue;
        
        return (
        <CheckboxFilter
          field="pic"
          selectedKeys={effectiveSelectedKeys}
          setSelectedKeys={setSelectedKeys}
          confirm={() => {
            // Use the current selectedKeys from the filter dropdown
            handleColumnFilterChange('pic', effectiveSelectedKeys);
            confirm();
          }}
          clearFilters={() => {
            setSelectedKeys([]);
            handleColumnFilterChange('pic', []);
            clearFilters();
          }}
          getUniqueValues={getUniqueValues}
          isLoading={cascadingLoading.pic}
        />
        );
      },
      filterIcon: (filtered) => (
        <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      filteredValue: columnFilters.pic,
      onFilter: (value, record) => {
        // Since filtering is handled server-side, always return true for client-side display
        // The actual filtering is done via API parameters in fetchOrdersWithFilters
        return true;
      },
    },
    {
      title: 'Upload Date',
      dataIndex: 'upload_date',
      key: 'upload_date',
      width: 150,
      sorter: (a, b) => dayjs.tz(a.upload_date, 'Asia/Jakarta').unix() - dayjs.tz(b.upload_date, 'Asia/Jakarta').unix(),
      render: (date) => date ? dayjs.tz(date, 'Asia/Jakarta').format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: 'Interface Status',
      dataIndex: 'interface_status',
      key: 'interface_status',
      width: 130,
      fixed: 'right',
      render: (status) => {
        let color = 'default';
        if (status === 'Interface') color = 'green';
        else if (status === 'Not Yet Interface') color = 'gold';
        
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      width: 200,
      fixed: 'right',
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => {
        // Initialize selectedKeys with current filter value when dropdown opens
        const currentFilterValue = columnFilters.remarks;
        const effectiveSelectedKeys = selectedKeys.length > 0 ? selectedKeys : currentFilterValue;
        
        return (
        <CheckboxFilter
          field="remarks"
          selectedKeys={effectiveSelectedKeys}
          setSelectedKeys={setSelectedKeys}
          confirm={() => {
            // Use the current selectedKeys from the filter dropdown
            handleColumnFilterChange('remarks', effectiveSelectedKeys);
            confirm();
          }}
          clearFilters={() => {
            setSelectedKeys([]);
            handleColumnFilterChange('remarks', []);
            clearFilters();
          }}
          getUniqueValues={getUniqueValues}
          isLoading={cascadingLoading.remarks}
        />
        );
      },
      filterIcon: (filtered) => (
        <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      filteredValue: columnFilters.remarks,
      onFilter: (value, record) => {
        // Since filtering is handled server-side, always return true for client-side display
        // The actual filtering is done via API parameters in fetchOrdersWithFilters
        return true;
      },
      render: (text, record) => {
        const isEditing = editingRemarks[record.id];
        
        if (isEditing) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AntInput
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveRemarks(record.id);
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
                autoFocus
                style={{ flex: 1 }}
              />
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleSaveRemarks(record.id)}
                style={{ color: '#52c41a' }}
              />
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={handleCancelEdit}
                style={{ color: '#ff4d4f' }}
              />
            </div>
          );
        }
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {text || '-'}
            </span>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditRemarks(record.id, text)}
              style={{ color: '#1890ff' }}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: theme === 'dark' ? '#0f0f0f' : '#f5f5f5' }}>
      {/* Header Section */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div>
            <Title level={2} style={{ 
              margin: 0, 
              color: theme === 'dark' ? '#fff' : '#262626',
              fontWeight: 600
            }}>
              📋 List Order Uploaded
            </Title>
            <Typography.Text type="secondary" style={{ fontSize: '16px' }}>
              Monitor and manage order processing across Job Get
            </Typography.Text>
          </div>
          <Space size="middle">
            <Button 
              icon={<ReloadOutlined />} 
              onClick={retryMarketplaceStatus}
              loading={isRefreshing || marketplaceLoading}
              disabled={isRefreshing}
              size="large"
            >
              Refresh Status
            </Button>
            {marketplaceAppsEnabled && (
              <Button 
                type="primary" 
                icon={<ThunderboltOutlined />}
                onClick={runAllMarketplaceApps}
                loading={marketplaceLoading}
                size="large"
                disabled={Object.keys(marketplaceStatus).length === 0}
              >
                Run All Apps ({orders.filter(order => 
                  order.interface_status === 'Not Yet Interface' && 
                  marketplaceStatus[order.marketplace?.toLowerCase()]
                ).length})
              </Button>
            )}
          </Space>
        </div>

      </div>

      {/* Main Content Card */}
      <Card
        style={{
          background: theme === 'dark' ? '#141414' : '#fff',
          border: `1px solid ${theme === 'dark' ? '#303030' : '#d9d9d9'}`,
          borderRadius: '12px',
          boxShadow: theme === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        {/* Alerts and Warnings */}
        {!loading && orders.length === 0 && (
          <Alert
            message="No Data Found"
            description={
              <div>
                <p>No orders found for the selected criteria. Try:</p>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>Expanding the date range</li>
                  <li>Removing some filters</li>
                  <li>Checking if data exists for the selected period</li>
                </ul>
                {filters.dateRange && filters.dateRange.length === 2 && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: theme === 'dark' ? '#d9d9d9' : '#595959' }}>
                    Selected range: {filters.dateRange[0].format('YYYY-MM-DD')} to {filters.dateRange[1].format('YYYY-MM-DD')}
                  </p>
                )}
            </div>
            }
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        {Object.values(uniqueValues).some(values => !values || values.length === 0) && (
          <Alert
            message="Filter Options Incomplete"
            description="Some column filters may only show current page data. Click 'Refresh Filters' to load all available options."
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
            action={
              <Button size="small" onClick={retryUniqueValues}>
                Refresh Filters
              </Button>
            }
          />
        )}

        {/* Advanced Filters Section */}
        <Collapse
          ghost
          activeKey={filtersCollapsed ? [] : ['filters']}
          onChange={(keys) => setFiltersCollapsed(keys.length === 0)}
          style={{ marginBottom: '16px' }}
        >
          <Collapse.Panel
            key="filters"
            header={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FilterOutlined />
                <span style={{ fontWeight: 500 }}>Advanced Filters</span>
                <Badge count={Object.values(filters).filter(v => v && (Array.isArray(v) ? v.length > 0 : true)).length} />
              </div>
            }
            extra={
              <Button
                type="text"
          size="small"
                icon={filtersCollapsed ? <DownOutlined /> : <UpOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  setFiltersCollapsed(!filtersCollapsed);
                }}
              />
            }
          >

            <div style={{ 
              background: theme === 'dark' ? '#1f1f1f' : '#fafafa',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${theme === 'dark' ? '#303030' : '#d9d9d9'}`
            }}>
              {/* Cascading Filter Indicator */}
              {Object.values(columnFilters).some(filters => filters && filters.length > 0) && (
                <Alert
                  message="Cascading Filters Active"
                  description="Filter options are automatically updated based on your selections. This ensures you only see relevant options for your current filter combination."
                  type="info"
                  showIcon
                  style={{ marginBottom: '16px' }}
                  action={
                    <Button 
                      size="small" 
                      onClick={() => {
                        const resetColumnFilters = {
                          marketplace: [],
                          brand: [],
                          order_status: [],
                          transporter: [],
                          batch: [],
                          pic: [],
                          remarks: []
                        };
                        setColumnFilters(resetColumnFilters);
                        setPagination(prev => ({ ...prev, current: 1 }));
                        fetchOrdersWithFilters(1, pagination.pageSize, filters, resetColumnFilters);
                      }}
                    >
                      Clear All
                    </Button>
                  }
                />
              )}
              <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div>
                <label style={{ 
                  display: 'block', 
                      marginBottom: '6px',
                  color: theme === 'dark' ? '#d9d9d9' : '#595959',
                      fontSize: '13px',
                  fontWeight: 500
                }}>
                      📅 Date Range
                </label>
                <RangePicker
                  value={filters.dateRange}
                  onChange={(dates) => handleFilterChange('dateRange', dates)}
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  placeholder={['Start Date', 'End Date']}
                      size="large"
                />
              </div>
            </Col>
            
            <Col xs={24} sm={12} md={8} lg={6}>
              <div>
                <label style={{ 
                  display: 'block', 
                      marginBottom: '6px',
                  color: theme === 'dark' ? '#d9d9d9' : '#595959',
                      fontSize: '13px',
                  fontWeight: 500
                }}>
                      🔢 Order Numbers
                </label>
                <Select
                  mode="tags"
                  placeholder="Enter order numbers"
                  value={filters.orderNumbers}
                  onChange={(values) => handleFilterChange('orderNumbers', values)}
                  style={{ width: '100%' }}
                  tokenSeparators={[',', ' ', '\n']}
                  allowClear
                  maxTagCount={2}
                  maxTagTextLength={15}
                  maxTagPlaceholder={(omittedValues) => `+${omittedValues.length} more`}
                      size="large"
                />
              </div>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4}>
              <div>
                <label style={{ 
                  display: 'block', 
                      marginBottom: '6px',
                  color: theme === 'dark' ? '#d9d9d9' : '#595959',
                      fontSize: '13px',
                  fontWeight: 500
                }}>
                      ⚡ Interface Status
                </label>
                <Select
                  placeholder="Filter by status"
                  value={filters.interface_status}
                  onChange={(value) => handleFilterChange('interface_status', value)}
                  style={{ width: '100%' }}
                  allowClear
                      size="large"
                >
                  <Option value="Interface">Interface</Option>
                  <Option value="Not Yet Interface">Not Yet Interface</Option>
                </Select>
              </div>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4}>
              <div>
                <label style={{ 
                  display: 'block', 
                      marginBottom: '6px',
                  color: theme === 'dark' ? '#d9d9d9' : '#595959',
                      fontSize: '13px',
                  fontWeight: 500
                }}>
                      📊 Order Status
                </label>
                <Select
                  mode="multiple"
                  placeholder="Filter by order status"
                  value={filters.order_status}
                  onChange={(value) => handleFilterChange('order_status', value)}
                  style={{ width: '100%' }}
                  allowClear
                  maxTagCount={2}
                  maxTagTextLength={10}
                  maxTagPlaceholder={(omittedValues) => `+${omittedValues.length} more`}
                      size="large"
                >
                  {getUniqueValues('order_status').map(status => (
                    <Option key={status} value={status}>
                      {status}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4}>
              <div>
                <label style={{ 
                  display: 'block', 
                      marginBottom: '6px',
                  color: theme === 'dark' ? '#d9d9d9' : '#595959',
                      fontSize: '13px',
                  fontWeight: 500
                }}>
                      👤 PIC
                </label>
                <Input
                  placeholder="Filter by PIC"
                  value={filters.pic}
                  onChange={(e) => handleFilterChange('pic', e.target.value)}
                  onKeyPress={handleKeyPress}
                  prefix={<SearchOutlined />}
                  allowClear
                      size="large"
                  onClear={() => {
                    const newFilters = { ...filters, pic: '' };
                    setFilters(newFilters);
                    setPagination(prev => ({ ...prev, current: 1 }));
                    fetchOrdersWithFilters(1, pagination.pageSize, newFilters);
                  }}
                />
              </div>
            </Col>

            <Col xs={24} sm={12} md={8} lg={4}>
              <div>
                <label style={{ 
                  display: 'block', 
                      marginBottom: '6px',
                  color: theme === 'dark' ? '#d9d9d9' : '#595959',
                      fontSize: '13px',
                  fontWeight: 500
                }}>
                      💬 Remarks
                </label>
                <Input
                  placeholder="Filter by remarks"
                  value={filters.remarks}
                  onChange={(e) => handleFilterChange('remarks', e.target.value)}
                  onKeyPress={handleKeyPress}
                  prefix={<SearchOutlined />}
                  allowClear
                      size="large"
                  onClear={() => {
                    const newFilters = { ...filters, remarks: '' };
                    setFilters(newFilters);
                    setPagination(prev => ({ ...prev, current: 1 }));
                    fetchOrdersWithFilters(1, pagination.pageSize, newFilters);
                  }}
                />
              </div>
            </Col>
              </Row>
              
              <Divider style={{ margin: '20px 0 16px 0' }} />
              
              <Row justify="space-between" align="middle">
                <Col>
                  <Space size="middle">
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                  loading={loading}
                      size="large"
                >
                      Search Orders
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                      size="large"
                >
                      Reset Filters
                </Button>
                  </Space>
                </Col>
                <Col>
                  <Space>
                <Button
                      icon={<DownloadOutlined />}
                      size="large"
                      title="Export filtered data"
                      onClick={() => handleExport('csv')}
                      loading={exportLoading}
                    >
                      Export CSV
                    </Button>
                    <Button
                      icon={<SettingOutlined />}
                      size="large"
                      title="Column settings"
                    >
                      Columns
                </Button>
              </Space>
            </Col>
          </Row>
            </div>
          </Collapse.Panel>
        </Collapse>


        {/* Orders Table */}
        <div style={{ 
          background: theme === 'dark' ? '#1f1f1f' : '#fff',
          borderRadius: '8px',
          border: `1px solid ${theme === 'dark' ? '#303030' : '#d9d9d9'}`,
          overflow: 'hidden'
        }}>
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            style: {
              marginTop: '16px',
              textAlign: 'right',
              background: theme === 'dark' ? '#1f1f1f' : '#fafafa',
                padding: '16px 20px',
                borderRadius: '0',
                border: 'none',
                borderTop: `1px solid ${theme === 'dark' ? '#303030' : '#d9d9d9'}`
            }
          }}
          onChange={handleTableChange}
            scroll={{ x: 2200, y: 'calc(100vh - 500px)' }}
            size="middle"
          style={{
              background: 'transparent',
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (record) => ({
              name: record.order_number,
            }),
          }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <div>
                      <Typography.Title level={4} style={{ color: theme === 'dark' ? '#d9d9d9' : '#595959' }}>
                        No Orders Found
                      </Typography.Title>
                      <Typography.Text type="secondary">
                        Try adjusting your filters or date range to find orders
                      </Typography.Text>
                    </div>
                  }
                />
              )
            }}
          />
        </div>
      </Card>

    </div>
  );
};

export default OrdersList;
