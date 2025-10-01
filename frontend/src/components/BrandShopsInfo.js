import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Space, 
  Tag, 
  Popconfirm,
  Row,
  Col,
  Statistic,
  Typography,
  Tooltip,
  Badge,
  Upload
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  InfoCircleOutlined,
  ShoppingOutlined,
  ShopOutlined,
  GlobalOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  LinkOutlined,
  TeamOutlined,
  InboxOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/axios';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import './BrandShopsInfo.css';

// Configure dayjs for timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

// Set default timezone to WIB
dayjs.tz.setDefault('Asia/Jakarta');

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const BrandShopsInfo = () => {
  const { theme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const [brandShops, setBrandShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    totalShops: 0,
    totalBrands: 0,
    totalMarketplaces: 0,
    activeShops: 0
  });
  const [searchText, setSearchText] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedMarketplace, setSelectedMarketplace] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkUpdateModalVisible, setBulkUpdateModalVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkForm] = Form.useForm();

  // Check if user is superuser (admin or superuser)
  const isSuperUser = user?.role === 'admin' || user?.role === 'superuser';

  useEffect(() => {
    if (isAuthenticated) {
      fetchBrandShops();
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, pagination.current, pagination.pageSize]);

  // Debounced search effect
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const timeoutId = setTimeout(() => {
      fetchBrandShops();
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, isAuthenticated]);

  // Handle marketplace filter changes
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchBrandShops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarketplace, isAuthenticated]);

  // Handle brand filter changes
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchBrandShops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrand, isAuthenticated]);

  // No longer needed since we're using server-side filtering
  // useEffect(() => {
  //   setFilteredShops(brandShops);
  // }, [brandShops]);

  const fetchBrandShops = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        skip: (pagination.current - 1) * pagination.pageSize,
        limit: pagination.pageSize
      };

      // Add search parameter for global search
      if (searchText && searchText.trim()) {
        params.search = searchText.trim();
      }

      if (selectedBrand && selectedBrand !== 'all') {
        params.brand = selectedBrand;
      }
      if (selectedMarketplace && selectedMarketplace !== 'all') {
        params.marketplace_id = selectedMarketplace;
      }

      const response = await api.get('/api/brandshops', { params });
      setBrandShops(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.total || 0
      }));
    } catch (error) {
      console.error('Error fetching brand shops:', error);
      message.error('Failed to fetch brand shops data');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchText, selectedBrand, selectedMarketplace]);

  const fetchStats = useCallback(async () => {
    try {
      const [brandsResponse, marketplacesResponse, shopsResponse] = await Promise.all([
        api.get('/api/brandshops/brands'),
        api.get('/api/brandshops/marketplaces'),
        api.get('/api/brandshops', { params: { limit: 1 } })
      ]);
      
      const uniqueBrands = brandsResponse.data.brands || [];
      const uniqueMarketplaces = marketplacesResponse.data.marketplace_ids || [];
      const totalShops = shopsResponse.data.total || 0;
      
      setStats({
        totalShops: totalShops,
        totalBrands: uniqueBrands.length,
        totalMarketplaces: uniqueMarketplaces.length,
        activeShops: totalShops // Assuming all are active for now
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Search and filter functions
  const handleSearch = (value) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page when searching
    // Don't call applyFilters here, let fetchBrandShops handle the search
  };

  const handleBrandFilter = (value) => {
    setSelectedBrand(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleMarketplaceFilter = (value) => {
    setSelectedMarketplace(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    // Don't call fetchBrandShops here, let the useEffect handle it
  };

  const handleStatusFilter = (value) => {
    setSelectedStatus(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const clearFilters = () => {
    setSearchText('');
    setSelectedBrand('all');
    setSelectedMarketplace('all');
    setSelectedStatus('all');
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleViewDetails = (record) => {
    setSelectedShop(record);
    setDetailModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingShop(record);
    form.setFieldsValue({
      shop_name: record.shop_name,
      brand: record.brand,
      shop_url: record.shop_url,
      notes: record.notes,
      address: record.address,
      order_type: record.order_type,
      marketplace_id: record.marketplace_id?.toString(),
      client_id: record.client_id,
      client_shop_id: record.client_shop_id,
      shop_name_seller: record.shop_name_seller,
      shop_key_1: record.shop_key_1,
      shop_key_2: record.shop_key_2,
      shop_key_3: record.shop_key_3,
      shop_key_4: record.shop_key_4,
      shop_key_5: record.shop_key_5
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/brandshops/${id}`);
      message.success('Shop deleted successfully');
      fetchBrandShops(); // Refresh the list
    } catch (error) {
      console.error('Error deleting shop:', error);
      
      // Provide more specific error messages
      if (error.response?.status === 403) {
        message.error('You do not have permission to delete this shop');
      } else if (error.response?.status === 404) {
        message.error('Shop not found');
      } else if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('Failed to delete shop. Please try again.');
      }
    }
  };

  const handleSubmit = async (values) => {
    if (submitting) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Prepare data with proper type conversion
      const submitData = {
        ...values,
        marketplace_id: values.marketplace_id ? parseInt(values.marketplace_id) : null,
        client_id: values.client_id ? parseInt(values.client_id) : null,
        client_shop_id: values.client_shop_id ? parseInt(values.client_shop_id) : null
      };
      
      if (editingShop) {
        // Update existing shop
        await api.put(`/api/brandshops/${editingShop.id}`, submitData);
        message.success('Shop updated successfully');
      } else {
        // Add new shop
        await api.post('/api/brandshops', submitData);
        message.success('Shop added successfully');
      }
      
      setModalVisible(false);
      form.resetFields();
      setEditingShop(null);
      fetchBrandShops(); // Refresh the list
    } catch (error) {
      console.error('Error saving shop:', error);
      
      // Provide more specific error messages
      if (error.response?.status === 403) {
        message.error('You do not have permission to perform this action');
      } else if (error.response?.status === 400) {
        message.error('Invalid data provided. Please check your input.');
      } else if (error.response?.status === 404) {
        message.error('Shop not found');
      } else if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('Failed to save shop. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleTableChange = useCallback((pagination) => {
    setPagination(pagination);
  }, []);

  // Bulk operation handlers
  const handleBulkCreate = async (values) => {
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', values.file.file);
      
      const response = await api.post('/api/brandshops/bulk-create', formData, {
        timeout: 120000, // 2 minutes timeout for bulk operations
      });
      message.success(`Bulk create completed: ${response.data.created_count} shops created, ${response.data.error_count} errors`);
      if (response.data.errors.length > 0) {
        console.warn('Bulk create errors:', response.data.errors);
      }
      setBulkModalVisible(false);
      bulkForm.resetFields();
      fetchBrandShops();
      fetchStats();
    } catch (error) {
      console.error('Error in bulk create:', error);
      message.error(error.response?.data?.detail || 'Failed to bulk create shops');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkUpdate = async (values) => {
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', values.file.file);
      
      const response = await api.post('/api/brandshops/bulk-update', formData, {
        timeout: 120000, // 2 minutes timeout for bulk operations
      });
      message.success(`Bulk update completed: ${response.data.updated_count} shops updated, ${response.data.error_count} errors`);
      if (response.data.errors.length > 0) {
        console.warn('Bulk update errors:', response.data.errors);
      }
      setBulkUpdateModalVisible(false);
      bulkForm.resetFields();
      fetchBrandShops();
      fetchStats();
    } catch (error) {
      console.error('Error in bulk update:', error);
      message.error(error.response?.data?.detail || 'Failed to bulk update shops');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select shops to delete');
      return;
    }
    
    Modal.confirm({
      title: 'Confirm Bulk Delete',
      content: `Are you sure you want to delete ${selectedRowKeys.length} shop(s)?`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setLoading(true);
          const response = await api.post('/api/brandshops/bulk-delete', selectedRowKeys);
          message.success(`Bulk delete completed: ${response.data.deleted_count} shops deleted, ${response.data.error_count} errors`);
          if (response.data.errors.length > 0) {
            console.warn('Bulk delete errors:', response.data.errors);
          }
          setSelectedRowKeys([]);
          fetchBrandShops();
          fetchStats();
        } catch (error) {
          console.error('Error in bulk delete:', error);
          message.error(error.response?.data?.detail || 'Failed to bulk delete shops');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record) => ({
      name: record.shop_name,
    }),
  };

  // Download template handler
  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/api/brandshops/template', {
        responseType: 'blob',
        timeout: 30000, // 30 seconds timeout for template download
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'brandshops_template.xlsx');
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      message.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading template:', error);
      if (error.response?.status === 401) {
        message.error('Please login to download template');
      } else if (error.code === 'ECONNABORTED') {
        message.error('Download timeout. Please try again.');
      } else {
        message.error('Failed to download template');
      }
    }
  };

  const getMarketplaceName = (marketplaceId) => {
    const marketplaceMap = {
      1: 'TOKOPEDIA',
      2: 'SHOPEE',
      3: 'LAZADA',
      6: 'ZALORA',
      7: 'BLIBLI',
      8: 'JDID',
      9: 'JUBELIO',
      10: 'SHOPIFY',
      11: 'TIKTOK',
      12: 'B2B',
      23: 'DESTY'
    };
    return marketplaceMap[marketplaceId] || `Marketplace ${marketplaceId}`;
  };

  const getMarketplaceColor = (marketplaceId) => {
    const colorMap = {
        1: '#03AC0E',   // TOKOPEDIA → hijau khas Tokopedia
        2: '#EE4D2D',   // SHOPEE → oranye Shopee
        3: '#F57224',   // LAZADA → oranye Lazada
        6: '#002A5C',   // ZALORA → biru tua / navy elegan Zalora
        7: '#1E4CA1',   // BLIBLI → biru Blibli
        8: '#D71921',   // JDID → merah JD.ID
        9: '#29B16E',   // JUBELIO → hijau toska Jubelio
         10: '#96BF48',  // SHOPIFY → hijau Shopify
         11: '#000000',  // TIKTOK → hitam dominan TikTok (dipadukan dengan cyan/pink)
         12: '#8B5CF6',  // B2B → ungu untuk B2B
         23: '#FF006E'   // DESTY → magenta/pink khas Desty
    };
    return colorMap[marketplaceId] || 'default';
  };

  const columns = [
    {
      title: 'Client Shop ID',
      dataIndex: 'client_shop_id',
      key: 'client_shop_id',
      width: 120,
      render: (text) => (
        <Text style={{ fontWeight: 500, fontSize: '12px' }}>
          {text || 'N/A'}
        </Text>
      ),
      sorter: (a, b) => (a.client_shop_id || 0) - (b.client_shop_id || 0),
    },
    {
      title: 'Client ID',
      dataIndex: 'client_id',
      key: 'client_id',
      width: 100,
      render: (text) => (
        <Text style={{ fontWeight: 500, fontSize: '12px' }}>
          {text || 'N/A'}
        </Text>
      ),
      sorter: (a, b) => (a.client_id || 0) - (b.client_id || 0),
    },
    {
      title: 'Marketplace',
      dataIndex: 'marketplace_id',
      key: 'marketplace_id',
      width: 120,
      render: (marketplaceId) => {
        const name = getMarketplaceName(marketplaceId);
        const color = getMarketplaceColor(marketplaceId);
        return (
          <Tag color={color} style={{ fontWeight: 500, fontSize: '12px' }}>
            {name}
          </Tag>
        );
      },
      sorter: (a, b) => (a.marketplace_id || 0) - (b.marketplace_id || 0),
    },
    {
      title: 'Shop Name',
      dataIndex: 'shop_name',
      key: 'shop_name',
      width: 200,
      render: (text) => (
        <Text style={{ fontWeight: 500, fontSize: '12px' }}>
          {text || 'N/A'}
        </Text>
      ),
      sorter: (a, b) => (a.shop_name || '').localeCompare(b.shop_name || ''),
    },
    {
      title: 'Shop Key 1',
      dataIndex: 'shop_key_1',
      key: 'shop_key_1',
      width: 120,
      render: (text) => (
        <Text style={{ fontSize: '12px' }}>
          {text || 'N/A'}
        </Text>
      ),
      sorter: (a, b) => (a.shop_key_1 || '').localeCompare(b.shop_key_1 || ''),
    },
    {
      title: 'Created By',
      dataIndex: 'created_by',
      key: 'created_by',
      width: 120,
      render: (text) => (
        <Tag color="geekblue" style={{ fontWeight: 500, fontSize: '11px' }}>
          {text || 'N/A'}
        </Tag>
      ),
      sorter: (a, b) => (a.created_by || '').localeCompare(b.created_by || ''),
    },
    {
      title: 'Brand',
      dataIndex: 'brand',
      key: 'brand',
      width: 150,
      render: (text) => (
        <Tag color="blue" style={{ fontWeight: 500, fontSize: '12px' }}>
          {text || 'N/A'}
        </Tag>
      ),
      sorter: (a, b) => (a.brand || '').localeCompare(b.brand || ''),
    },
    {
      title: 'Order Type',
      dataIndex: 'order_type',
      key: 'order_type',
      width: 100,
      render: (text) => {
        if (!text) return <Text type="secondary">N/A</Text>;
        const color = text === 'B2C' ? 'green' : 'orange';
        return (
          <Tag color={color} style={{ fontWeight: 500 }}>
            {text}
          </Tag>
        );
      },
      sorter: (a, b) => (a.order_type || '').localeCompare(b.order_type || ''),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewDetails(record)}
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          {isSuperUser && (
            <>
              <Tooltip title="Edit">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => handleEdit(record)}
                  style={{ color: '#52c41a' }}
                />
              </Tooltip>
              <Popconfirm
                title="Are you sure you want to delete this shop?"
                onConfirm={() => handleDelete(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Tooltip title="Delete">
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    size="small"
                    style={{ color: '#ff4d4f' }}
                  />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="brandshops-info-container">
      <Title level={2} style={{ marginBottom: 24, color: theme === 'dark' ? '#d9d9d9' : '#262626' }}>
        <ShopOutlined style={{ marginRight: 8 }} />
        Brand Shops Information
      </Title>

      {/* Statistics Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card style={{ background: theme === 'dark' ? '#262626' : '#fff' }} className={theme === 'dark' ? 'dark' : 'light'}>
            <Statistic
              title="Total Shops"
              value={stats.totalShops}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div className="stat-description">
              All registered shops
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card style={{ background: theme === 'dark' ? '#262626' : '#fff' }} className={theme === 'dark' ? 'dark' : 'light'}>
            <Statistic
              title="Unique Brands"
              value={stats.totalBrands}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div className="stat-description">
              Different brand names
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card style={{ background: theme === 'dark' ? '#262626' : '#fff' }} className={theme === 'dark' ? 'dark' : 'light'}>
            <Statistic
              title="Marketplaces"
              value={stats.totalMarketplaces}
              prefix={<GlobalOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div className="stat-description">
              Platform integrations
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card style={{ background: theme === 'dark' ? '#262626' : '#fff' }} className={theme === 'dark' ? 'dark' : 'light'}>
            <Statistic
              title="Active Shops"
              value={stats.activeShops}
              prefix={<InfoCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
            <div className="stat-description">
              Currently operational
            </div>
          </Card>
        </Col>
      </Row>

      {/* Brand Shops Management Table */}
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Brand Shops List</span>
            {isSuperUser && (
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setModalVisible(true)}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                  Add Shop
                </Button>
                <Button
                  type="default"
                  onClick={() => setBulkModalVisible(true)}
                  icon={<TeamOutlined />}
                >
                  Bulk Create
                </Button>
                <Button
                  type="default"
                  onClick={handleDownloadTemplate}
                  icon={<DownloadOutlined />}
                >
                  Download Template
                </Button>
                <Button
                  type="default"
                  onClick={() => setBulkUpdateModalVisible(true)}
                  icon={<EditOutlined />}
                >
                  Bulk Update
                </Button>
                <Button
                  type="default"
                  danger
                  onClick={handleBulkDelete}
                  icon={<DeleteOutlined />}
                  disabled={!selectedRowKeys.length}
                >
                  Bulk Delete
                </Button>
              </Space>
            )}
          </div>
        }
        style={{ background: theme === 'dark' ? '#262626' : '#fff' }}
        className={theme === 'dark' ? 'dark' : 'light'}
      >
        {/* Search and Filter Controls */}
        <div className={`search-filter-container ${theme === 'dark' ? 'dark' : ''}`}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={6}>
              <Input
                placeholder="Search by shop name (exact match), brand, ID, or creator..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                allowClear
                className="search-input"
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} sm={4}>
              <Select
                placeholder="Brand"
                value={selectedBrand}
                onChange={handleBrandFilter}
                className="filter-select"
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="all">All Brands</Option>
                {/* Dynamic options would be loaded from API */}
              </Select>
            </Col>
            <Col xs={24} sm={4}>
              <Select
                placeholder="Marketplace"
                value={selectedMarketplace}
                onChange={handleMarketplaceFilter}
                className="filter-select"
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="all">All Marketplaces</Option>
                <Option value="1">TOKOPEDIA</Option>
                <Option value="2">SHOPEE</Option>
                <Option value="3">LAZADA</Option>
                <Option value="6">ZALORA</Option>
                <Option value="7">BLIBLI</Option>
                <Option value="8">JDID</Option>
                <Option value="9">JUBELIO</Option>
                <Option value="10">SHOPIFY</Option>
                <Option value="11">TIKTOK</Option>
                <Option value="12">B2B</Option>
                <Option value="23">DESTY</Option>
              </Select>
            </Col>
            <Col xs={24} sm={4}>
              <Select
                placeholder="Status"
                value={selectedStatus}
                onChange={handleStatusFilter}
                className="filter-select"
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="all">All Status</Option>
                <Option value="active">Active</Option>
                <Option value="inactive">Inactive</Option>
              </Select>
            </Col>
            <Col xs={24} sm={3}>
              <Button
                icon={<ReloadOutlined />}
                onClick={clearFilters}
                className="clear-filters-btn"
                style={{ width: '100%' }}
              >
                Clear
              </Button>
            </Col>
            <Col xs={24} sm={3}>
              <div className="record-counter">
                <Text type="secondary">
                  Showing {brandShops.length} of {pagination.total} records
                </Text>
              </div>
            </Col>
          </Row>
        </div>
        <Table
          columns={columns}
          dataSource={brandShops}
          loading={loading}
          rowKey="id"
          rowSelection={isSuperUser ? rowSelection : null}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} items`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          size="small"
          bordered
          style={{
            background: theme === 'dark' ? '#1f1f1f' : '#fff',
          }}
          rowClassName={(record, index) => 
            index % 2 === 0 
              ? theme === 'dark' ? 'dark-row-even' : 'light-row-even'
              : theme === 'dark' ? 'dark-row-odd' : 'light-row-odd'
          }
          className="brandshops-table"
        />
      </Card>

      {/* Shop Details Modal */}
      <Modal
        title="Shop Details"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        {selectedShop && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card size="small" title="Basic Information">
                  <p><strong>Shop Name:</strong> {selectedShop.shop_name || 'N/A'}</p>
                  <p><strong>Brand:</strong> {selectedShop.brand || 'N/A'}</p>
                  <p><strong>Seller Name:</strong> {selectedShop.shop_name_seller || 'N/A'}</p>
                  <p><strong>Order Type:</strong> {selectedShop.order_type || 'N/A'}</p>
                  <p><strong>Status:</strong> 
                    <Badge 
                      status={selectedShop.is_open === 1 ? 'success' : 'error'} 
                      text={selectedShop.is_open === 1 ? 'Active' : 'Inactive'}
                      style={{ marginLeft: 8 }}
                    />
                  </p>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="List Batch Marketplace">
                  <p><strong>Marketplace:</strong> {getMarketplaceName(selectedShop.marketplace_id)} (ID: {selectedShop.marketplace_id})</p>
                  <p><strong>Shop URL:</strong> 
                    {selectedShop.shop_url ? (
                      <a href={selectedShop.shop_url} target="_blank" rel="noopener noreferrer">
                        <LinkOutlined style={{ marginLeft: 4 }} />
                      </a>
                    ) : 'N/A'}
                  </p>
                  <p><strong>Established:</strong> {selectedShop.established_date ? dayjs.tz(selectedShop.established_date, 'Asia/Jakarta').format('YYYY-MM-DD') : 'N/A'}</p>
                  <p><strong>Client ID:</strong> {selectedShop.client_id || 'N/A'}</p>
                  <p><strong>Shop ID:</strong> {selectedShop.client_shop_id || 'N/A'}</p>
                </Card>
              </Col>
            </Row>
            {selectedShop.address && (
              <Card size="small" title="Address Information" style={{ marginTop: 16 }}>
                <p><strong>Address:</strong> {selectedShop.address}</p>
                {selectedShop.kelurahan && <p><strong>Kelurahan:</strong> {selectedShop.kelurahan}</p>}
                {selectedShop.kecamatan && <p><strong>Kecamatan:</strong> {selectedShop.kecamatan}</p>}
                {selectedShop.kota && <p><strong>Kota:</strong> {selectedShop.kota}</p>}
                {selectedShop.provinsi && <p><strong>Provinsi:</strong> {selectedShop.provinsi}</p>}
                {selectedShop.zipcode && <p><strong>ZIP Code:</strong> {selectedShop.zipcode}</p>}
              </Card>
            )}
            {selectedShop.notes && (
              <Card size="small" title="Notes" style={{ marginTop: 16 }}>
                <p>{selectedShop.notes}</p>
              </Card>
            )}
            <Card size="small" title="System Information" style={{ marginTop: 16 }}>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <p><strong>Created:</strong> {selectedShop.created_at ? dayjs.tz(selectedShop.created_at, 'Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss') : 'N/A'}</p>
                  <p><strong>Created By:</strong> {selectedShop.created_by || 'N/A'}</p>
                </Col>
                <Col span={12}>
                  <p><strong>Updated:</strong> {selectedShop.updated_at ? dayjs.tz(selectedShop.updated_at, 'Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss') : 'N/A'}</p>
                  <p><strong>Updated By:</strong> {selectedShop.updated_by || 'N/A'}</p>
                </Col>
              </Row>
            </Card>
          </div>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        title={editingShop ? 'Edit Shop' : 'Add New Shop'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingShop(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            shop_name: '',
            brand: '',
            shop_url: '',
            notes: '',
            address: '',
            order_type: '',
            marketplace_id: '',
            client_id: '',
            client_shop_id: '',
            shop_name_seller: '',
            shop_key_1: '',
            shop_key_2: '',
            shop_key_3: '',
            shop_key_4: '',
            shop_key_5: ''
          }}
        >
          <Form.Item
            name="shop_name"
            label="Shop Name"
            rules={[
              { required: true, message: 'Please enter shop name' },
              { min: 2, message: 'Shop name must be at least 2 characters' },
              { max: 255, message: 'Shop name must be less than 255 characters' }
            ]}
          >
            <Input placeholder="Enter shop name" />
          </Form.Item>

          <Form.Item
            name="brand"
            label="Brand"
            rules={[
              { required: true, message: 'Please enter brand name' },
              { min: 2, message: 'Brand name must be at least 2 characters' },
              { max: 100, message: 'Brand name must be less than 100 characters' }
            ]}
          >
            <Input placeholder="Enter brand name" />
          </Form.Item>

          <Form.Item
            name="shop_url"
            label="Shop URL"
            rules={[
              { type: 'url', message: 'Please enter a valid URL' }
            ]}
          >
            <Input placeholder="Enter shop URL (e.g., https://shop.tokopedia.com/example)" />
          </Form.Item>

          <Form.Item
            name="order_type"
            label="Order Type"
            rules={[
              { required: true, message: 'Please select order type' }
            ]}
          >
            <Select placeholder="Select order type">
              <Option value="B2C">B2C</Option>
              <Option value="B2B">B2B</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="marketplace_id"
            label="Marketplace"
            rules={[
              { required: true, message: 'Please select marketplace' }
            ]}
          >
            <Select placeholder="Select marketplace">
              <Option value="1">TOKOPEDIA</Option>
              <Option value="2">SHOPEE</Option>
              <Option value="3">LAZADA</Option>
              <Option value="6">ZALORA</Option>
              <Option value="7">BLIBLI</Option>
              <Option value="8">JDID</Option>
              <Option value="9">JUBELIO</Option>
              <Option value="10">SHOPIFY</Option>
              <Option value="11">TIKTOK</Option>
              <Option value="12">B2B</Option>
              <Option value="23">DESTY</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="client_id"
            label="Client ID"
            rules={[
              { required: true, message: 'Please enter client ID' },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.reject(new Error('Please enter client ID'));
                  }
                  const numValue = parseInt(value);
                  if (isNaN(numValue) || numValue <= 0) {
                    return Promise.reject(new Error('Client ID must be a positive number'));
                  }
                  if (numValue > 2147483647) {
                    return Promise.reject(new Error('Client ID must be less than 2,147,483,648'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Input type="number" min="1" max="2147483647" placeholder="Enter client ID" />
          </Form.Item>

          <Form.Item
            name="client_shop_id"
            label="Client Shop ID"
            rules={[
              {
                validator: (_, value) => {
                  if (value && value !== '') {
                    const numValue = parseInt(value);
                    if (isNaN(numValue) || numValue < 0) {
                      return Promise.reject(new Error('Client Shop ID must be a non-negative number'));
                    }
                    if (numValue > 2147483647) {
                      return Promise.reject(new Error('Client Shop ID must be less than 2,147,483,648'));
                    }
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Input type="number" min="0" max="2147483647" placeholder="Enter client shop ID (optional)" />
          </Form.Item>

          <Form.Item
            name="shop_name_seller"
            label="Seller Name"
          >
            <Input placeholder="Enter seller name" />
          </Form.Item>

          <Form.Item
            name="shop_key_1"
            label="Shop Key 1"
          >
            <Input placeholder="Enter shop key 1" />
          </Form.Item>

          <Form.Item
            name="shop_key_2"
            label="Shop Key 2"
          >
            <Input placeholder="Enter shop key 2" />
          </Form.Item>

          <Form.Item
            name="shop_key_3"
            label="Shop Key 3"
          >
            <Input placeholder="Enter shop key 3" />
          </Form.Item>

          <Form.Item
            name="shop_key_4"
            label="Shop Key 4"
          >
            <Input placeholder="Enter shop key 4" />
          </Form.Item>

          <Form.Item
            name="shop_key_5"
            label="Shop Key 5"
          >
            <Input placeholder="Enter shop key 5" />
          </Form.Item>

          <Form.Item
            name="address"
            label="Address"
          >
            <TextArea rows={3} placeholder="Enter shop address" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <TextArea rows={2} placeholder="Enter any additional notes" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingShop ? 'Update' : 'Add'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Bulk Create Modal */}
      <Modal
        title="Bulk Create Brand Shops"
        open={bulkModalVisible}
        onCancel={() => setBulkModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={bulkForm}
          onFinish={handleBulkCreate}
          layout="vertical"
        >
          <Form.Item
            name="file"
            label="Upload Excel/CSV File"
            rules={[{ required: true, message: 'Please upload a file' }]}
          >
            <Upload.Dragger
              name="file"
              accept=".xlsx,.csv"
              beforeUpload={() => false}
              showUploadList={true}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag file to this area to upload</p>
              <p className="ant-upload-hint">
                Support for Excel (.xlsx) and CSV (.csv) files only
              </p>
            </Upload.Dragger>
          </Form.Item>
          
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <Text strong>Required columns:</Text>
            <br />
            <Text code>brand</Text> - Brand name (required)
            <br />
            <Text code>marketplace_id</Text> - Marketplace ID (required)
            <br />
            <Text code>shop_name</Text> - Shop name (optional)
            <br />
            <Text code>shop_key_1</Text> - Shop key 1 (optional)
            <br />
            <Text code>client_shop_id</Text> - Client shop ID (optional)
            <br />
            <Text code>client_id</Text> - Client ID (optional)
            <br />
            <Text code>order_type</Text> - Order type (optional, defaults to "ONLINE")
            <br />
            <br />
            <Text type="secondary">
              💡 Tip: Download template above to see the correct format with sample data
            </Text>
          </div>
          
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setBulkModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Bulk Create
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Bulk Update Modal */}
      <Modal
        title="Bulk Update Brand Shops"
        open={bulkUpdateModalVisible}
        onCancel={() => setBulkUpdateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={bulkForm}
          onFinish={handleBulkUpdate}
          layout="vertical"
        >
          <Form.Item
            name="file"
            label="Upload Excel/CSV File"
            rules={[{ required: true, message: 'Please upload a file' }]}
          >
            <Upload.Dragger
              name="file"
              accept=".xlsx,.csv"
              beforeUpload={() => false}
              showUploadList={true}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag file to this area to upload</p>
              <p className="ant-upload-hint">
                Support for Excel (.xlsx) and CSV (.csv) files only
              </p>
            </Upload.Dragger>
          </Form.Item>
          
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <Text strong>Required columns:</Text>
            <br />
            <Text code>id</Text> - Record ID (required)
            <br />
            <Text code>brand</Text> - Brand name (optional)
            <br />
            <Text code>marketplace_id</Text> - Marketplace ID (optional)
            <br />
            <Text code>shop_name</Text> - Shop name (optional)
            <br />
            <Text code>shop_key_1</Text> - Shop key 1 (optional)
            <br />
            <Text code>client_shop_id</Text> - Client shop ID (optional)
            <br />
            <Text code>client_id</Text> - Client ID (optional)
            <br />
            <Text code>order_type</Text> - Order type (optional)
            <br />
            <br />
            <Text type="secondary">
              💡 Tip: Export current data to get the correct IDs, then modify and upload
            </Text>
          </div>
          
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setBulkUpdateModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Bulk Update
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BrandShopsInfo;
