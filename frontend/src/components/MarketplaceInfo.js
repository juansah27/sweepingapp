import React, { useState, useEffect } from 'react';
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
import './MarketplaceInfo.css';

// Configure dayjs for timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

// Set default timezone to WIB
dayjs.tz.setDefault('Asia/Jakarta');

const { Title, Text } = Typography;
const { Option } = Select;

const MarketplaceInfo = () => {
  const { theme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    totalBrands: 0,
    totalMarketplaces: 0,
    totalCombinations: 0
  });
  const [searchText, setSearchText] = useState('');
  const [filteredBrands, setFilteredBrands] = useState([]);
  const [selectedMarketplace, setSelectedMarketplace] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkUpdateModalVisible, setBulkUpdateModalVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkForm] = Form.useForm();

  // Get user role from auth context or localStorage
  const getUserRole = () => {
    const role = user?.role || localStorage.getItem('userRole') || localStorage.getItem('role');
    return role;
  };
  
  const userRole = getUserRole();

  useEffect(() => {
    if (isAuthenticated) {
      fetchBrands();
      fetchStats();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setFilteredBrands(brands);
  }, [brands]);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/listbrand');
      setBrands(response.data.brands || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      message.error('Failed to fetch brand data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [brandsResponse, marketplacesResponse] = await Promise.all([
        api.get('/api/listbrand/brands'),
        api.get('/api/listbrand/marketplaces')
      ]);
      
      const uniqueBrands = brandsResponse.data.brands || [];
      const uniqueMarketplaces = marketplacesResponse.data.marketplaces || [];
      
      setStats({
        totalBrands: uniqueBrands.length,
        totalMarketplaces: uniqueMarketplaces.length,
        totalCombinations: brands.length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Search and filter functions
  const handleSearch = (value) => {
    setSearchText(value);
    applyFilters(value, selectedMarketplace, selectedBatch);
  };

  const handleMarketplaceFilter = (value) => {
    setSelectedMarketplace(value);
    applyFilters(searchText, value, selectedBatch);
  };

  const handleBatchFilter = (value) => {
    setSelectedBatch(value);
    applyFilters(searchText, selectedMarketplace, value);
  };

  const applyFilters = (search, marketplace, batch) => {
    let filtered = [...brands];
    
    // Search filter
    if (search) {
      filtered = filtered.filter(item => 
        item.brand.toLowerCase().includes(search.toLowerCase()) ||
        item.marketplace.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Marketplace filter
    if (marketplace && marketplace !== 'all') {
      filtered = filtered.filter(item => item.marketplace === marketplace);
    }
    
    // Batch filter
    if (batch && batch !== 'all') {
      filtered = filtered.filter(item => item.batch === batch);
    }
    
    setFilteredBrands(filtered);
  };

  const clearFilters = () => {
    setSearchText('');
    setSelectedMarketplace('all');
    setSelectedBatch('all');
    setFilteredBrands([]);
  };

  const handleAdd = () => {
    setEditingBrand(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingBrand(record);
    form.setFieldsValue({
      brand: record.brand,
      marketplace: record.marketplace,
      batch: record.batch
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/listbrand/${id}`);
      message.success('Brand deleted successfully');
      fetchBrands();
      fetchStats();
    } catch (error) {
      console.error('Error deleting brand:', error);
      message.error('Failed to delete brand');
    }
  };

  const handleSubmit = async (values) => {
    if (submitting) {
      console.log('Already submitting, ignoring duplicate submission');
      return;
    }
    
    try {
      setSubmitting(true);
      console.log('Submitting values:', values);
      console.log('Editing brand:', editingBrand);
      
      if (editingBrand) {
        // Update existing brand
        console.log('Updating brand with ID:', editingBrand.id);
        await api.put(`/api/listbrand/${editingBrand.id}`, values);
        message.success('Brand updated successfully');
      } else {
        // Add new brand
        console.log('Adding new brand');
        const response = await api.post('/api/listbrand', values);
        console.log('Add brand response:', response.data);
        message.success('Brand added successfully');
      }
      
      setModalVisible(false);
      form.resetFields();
      setEditingBrand(null); // Reset editing state
      fetchBrands();
      fetchStats();
    } catch (error) {
      console.error('Error saving brand:', error);
      console.error('Error response:', error.response);
      message.error(error.response?.data?.detail || 'Failed to save brand');
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk operation handlers
  const handleBulkCreate = async (values) => {
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', values.file.file);
      
      const response = await api.post('/api/listbrand/bulk-create', formData, {
        timeout: 120000, // 2 minutes timeout for bulk operations
      });
      message.success(`Bulk create completed: ${response.data.created_count} created, ${response.data.error_count} errors`);
      if (response.data.errors.length > 0) {
        console.warn('Bulk create errors:', response.data.errors);
      }
      setBulkModalVisible(false);
      bulkForm.resetFields();
      fetchBrands();
      fetchStats();
    } catch (error) {
      console.error('Error in bulk create:', error);
      message.error(error.response?.data?.detail || 'Failed to bulk create brands');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkUpdate = async (values) => {
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', values.file.file);
      
      const response = await api.post('/api/listbrand/bulk-update', formData, {
        timeout: 120000, // 2 minutes timeout for bulk operations
      });
      message.success(`Bulk update completed: ${response.data.updated_count} updated, ${response.data.error_count} errors`);
      if (response.data.errors.length > 0) {
        console.warn('Bulk update errors:', response.data.errors);
      }
      setBulkUpdateModalVisible(false);
      bulkForm.resetFields();
      fetchBrands();
      fetchStats();
    } catch (error) {
      console.error('Error in bulk update:', error);
      message.error(error.response?.data?.detail || 'Failed to bulk update brands');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select brands to delete');
      return;
    }
    
    Modal.confirm({
      title: 'Confirm Bulk Delete',
      content: `Are you sure you want to delete ${selectedRowKeys.length} brand(s)?`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setLoading(true);
          const response = await api.post('/api/listbrand/bulk-delete', selectedRowKeys);
          message.success(`Bulk delete completed: ${response.data.deleted_count} deleted, ${response.data.error_count} errors`);
          if (response.data.errors.length > 0) {
            console.warn('Bulk delete errors:', response.data.errors);
          }
          setSelectedRowKeys([]);
          fetchBrands();
          fetchStats();
        } catch (error) {
          console.error('Error in bulk delete:', error);
          message.error(error.response?.data?.detail || 'Failed to bulk delete brands');
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
      name: record.brand,
    }),
  };

  // Download template handler
  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/api/listbrand/template', {
        responseType: 'blob',
        timeout: 30000, // 30 seconds timeout for template download
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'marketplace_template.xlsx');
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

  // Define base columns
  const baseColumns = [
    {
      title: 'Brand',
      dataIndex: 'brand',
      key: 'brand',
      width: 200,
      render: (text) => (
        <Tag color="blue" style={{ fontWeight: 500, fontSize: '12px' }}>
          {text}
        </Tag>
      ),
      sorter: (a, b) => a.brand.localeCompare(b.brand),
    },
    {
      title: 'Marketplace',
      dataIndex: 'marketplace',
      key: 'marketplace',
      width: 150,
      render: (text) => {
        const colors = {
          'SHOPEE': 'purple',
          'TIKTOK': 'red',
          'TOKOPEDIA': 'green',
          'LAZADA': 'orange',
          'BLIBLI': 'blue',
          'ZALORA': 'cyan',
          'JUBELIO': 'geekblue',
          'DESTY': 'magenta',
          'SHOPIFY': 'volcano',
          'GINEE': 'lime'
        };
        return (
          <Tag color={colors[text] || 'default'} style={{ fontWeight: 500 }}>
            {text}
          </Tag>
        );
      },
      sorter: (a, b) => a.marketplace.localeCompare(b.marketplace),
      filters: [
        { text: 'SHOPEE', value: 'SHOPEE' },
        { text: 'TIKTOK', value: 'TIKTOK' },
        { text: 'TOKOPEDIA', value: 'TOKOPEDIA' },
        { text: 'LAZADA', value: 'LAZADA' },
        { text: 'BLIBLI', value: 'BLIBLI' },
        { text: 'ZALORA', value: 'ZALORA' },
        { text: 'JUBELIO', value: 'JUBELIO' },
        { text: 'DESTY', value: 'DESTY' },
        { text: 'SHOPIFY', value: 'SHOPIFY' },
        { text: 'GINEE', value: 'GINEE' }
      ],
      onFilter: (value, record) => record.marketplace === value,
    },
    {
      title: 'Batch',
      dataIndex: 'batch',
      key: 'batch',
      width: 100,
      render: (text) => {
        return (
          <Tag className={`batch-tag batch-${text}`} style={{ fontWeight: 600, minWidth: '40px', textAlign: 'center' }}>
            {text}
          </Tag>
        );
      },
      sorter: (a, b) => a.batch.localeCompare(b.batch),
      filters: [
        { text: 'Batch 1', value: '1' },
        { text: 'Batch 2', value: '2' },
        { text: 'Batch 3', value: '3' },
        { text: 'Batch 4', value: '4' }
      ],
      onFilter: (value, record) => record.batch === value,
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text) => (
        <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
          {dayjs(text).format('YYYY-MM-DD HH:mm:ss')}
        </Text>
      ),
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
  ];

  // Actions column - only show for admin and superuser roles
  const actionsColumn = {
    title: 'Actions',
    key: 'actions',
    width: 120,
    render: (_, record) => (
      <Space size="small">
        <Button
          type="text"
          icon={<EditOutlined />}
          size="small"
          onClick={() => handleEdit(record)}
          style={{ color: '#1890ff' }}
        />
        <Popconfirm
          title="Are you sure you want to delete this brand?"
          onConfirm={() => handleDelete(record.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            type="text"
            icon={<DeleteOutlined />}
            size="small"
            style={{ color: '#ff4d4f' }}
          />
        </Popconfirm>
      </Space>
    ),
  };

  // Conditionally include actions column based on user role
  const columns = userRole === 'user' ? baseColumns : [...baseColumns, actionsColumn];

  return (
    <div className="marketplace-info-container">
      <Title level={2} style={{ marginBottom: 24, color: theme === 'dark' ? '#d9d9d9' : '#262626' }}>
        <GlobalOutlined style={{ marginRight: 8 }} />
        List Batch Marketplace
      </Title>

      {/* Statistics Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ background: theme === 'dark' ? '#262626' : '#fff' }} className={theme === 'dark' ? 'dark' : 'light'}>
            <Statistic
              title="Total Brands"
              value={stats.totalBrands}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div className="stat-description">
              Unique brand names in system
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: theme === 'dark' ? '#262626' : '#fff' }} className={theme === 'dark' ? 'dark' : 'light'}>
            <Statistic
              title="Total Marketplaces"
              value={stats.totalMarketplaces}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div className="stat-description">
              Available marketplace platforms
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: theme === 'dark' ? '#262626' : '#fff' }} className={theme === 'dark' ? 'dark' : 'light'}>
            <Statistic
              title="Total Combinations"
              value={stats.totalCombinations}
              prefix={<InfoCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div className="stat-description">
              Brand-marketplace combinations
            </div>
          </Card>
        </Col>
      </Row>

      {/* Brand Management Table */}
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Brand-Marketplace List</span>
            {/* Show Add Brand button for all authenticated users */}
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                Add Brand
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
          </div>
        }
        style={{ background: theme === 'dark' ? '#262626' : '#fff' }}
        className={theme === 'dark' ? 'dark' : 'light'}
      >
        {/* Search and Filter Controls */}
        <div className={`search-filter-container ${theme === 'dark' ? 'dark' : ''}`}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={8}>
              <Input
                placeholder="Search brands or marketplaces..."
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
                placeholder="Marketplace"
                value={selectedMarketplace}
                onChange={handleMarketplaceFilter}
                className="filter-select"
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="all">All Marketplaces</Option>
                <Option value="SHOPEE">SHOPEE</Option>
                <Option value="TIKTOK">TIKTOK</Option>
                <Option value="TOKOPEDIA">TOKOPEDIA</Option>
                <Option value="LAZADA">LAZADA</Option>
                <Option value="BLIBLI">BLIBLI</Option>
                <Option value="ZALORA">ZALORA</Option>
                <Option value="JUBELIO">JUBELIO</Option>
                <Option value="DESTY">DESTY</Option>
                <Option value="SHOPIFY">SHOPIFY</Option>
                <Option value="GINEE">GINEE</Option>
              </Select>
            </Col>
            <Col xs={24} sm={4}>
              <Select
                placeholder="Batch"
                value={selectedBatch}
                onChange={handleBatchFilter}
                className="filter-select"
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="all">All Batches</Option>
                <Option value="1">Batch 1</Option>
                <Option value="2">Batch 2</Option>
                <Option value="3">Batch 3</Option>
                <Option value="4">Batch 4</Option>
              </Select>
            </Col>
            <Col xs={24} sm={4}>
              <Button
                icon={<ReloadOutlined />}
                onClick={clearFilters}
                className="clear-filters-btn"
                style={{ width: '100%' }}
              >
                Clear Filters
              </Button>
            </Col>
            <Col xs={24} sm={4}>
              <div className="record-counter">
                <Text type="secondary">
                  Showing {filteredBrands.length} of {brands.length} records
                </Text>
              </div>
            </Col>
          </Row>
        </div>
        <Table
          columns={columns}
          dataSource={filteredBrands}
          loading={loading}
          rowKey="id"
          rowSelection={rowSelection}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} items`,
          }}
          scroll={{ x: 800 }}
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
          className="marketplace-table"
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingBrand ? 'Edit Brand' : 'Add New Brand'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingBrand(null);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            brand: '',
            marketplace: '',
            batch: ''
          }}
        >
          <Form.Item
            name="brand"
            label="Brand Name"
            rules={[
              { required: true, message: 'Please enter brand name' },
              { min: 2, message: 'Brand name must be at least 2 characters' }
            ]}
          >
            <Input 
              placeholder="Enter brand name (e.g., FACETOLOGY)"
              style={{ textTransform: 'uppercase' }}
            />
          </Form.Item>

          <Form.Item
            name="marketplace"
            label="Marketplace"
            rules={[
              { required: true, message: 'Please select marketplace' }
            ]}
          >
            <Select placeholder="Select marketplace">
              <Option value="SHOPEE">SHOPEE</Option>
              <Option value="TIKTOK">TIKTOK</Option>
              <Option value="TOKOPEDIA">TOKOPEDIA</Option>
              <Option value="LAZADA">LAZADA</Option>
              <Option value="BLIBLI">BLIBLI</Option>
              <Option value="ZALORA">ZALORA</Option>
              <Option value="JUBELIO">JUBELIO</Option>
              <Option value="DESTY">DESTY</Option>
              <Option value="SHOPIFY">SHOPIFY</Option>
              <Option value="GINEE">GINEE</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="batch"
            label="Batch"
            rules={[
              { required: true, message: 'Please select batch' }
            ]}
          >
            <Select placeholder="Select batch">
              <Option value="1">Batch 1</Option>
              <Option value="2">Batch 2</Option>
              <Option value="3">Batch 3</Option>
              <Option value="4">Batch 4</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingBrand ? 'Update' : 'Add'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Bulk Create Modal */}
      <Modal
        title="Bulk Create Brands"
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
            <Text code>marketplace</Text> - Marketplace name (required)
            <br />
            <Text code>batch</Text> - Batch number (optional, defaults to "1")
            <br />
            <Text code>remark</Text> - Remark text (optional)
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
        title="Bulk Update Brands"
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
            <Text code>marketplace</Text> - Marketplace name (optional)
            <br />
            <Text code>batch</Text> - Batch number (optional)
            <br />
            <Text code>remark</Text> - Remark text (optional)
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

export default MarketplaceInfo;
