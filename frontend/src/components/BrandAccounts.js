import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  App,
  Space, 
  Tag, 
  Popconfirm,
  Row,
  Col,
  Typography,
  Tooltip,
  Upload
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  InfoCircleOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
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
import './BrandAccounts.css';

// Configure dayjs for timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

// Set default timezone to WIB
dayjs.tz.setDefault('Asia/Jakarta');

const { Title, Text } = Typography;
const { Option } = Select;

const BrandAccounts = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const { message } = App.useApp();
  
  // Get user role from auth context or localStorage
  const getUserRole = () => {
    const role = user?.role || localStorage.getItem('userRole') || localStorage.getItem('role');
    console.log('Current user role:', role, 'User object:', user);
    return role;
  };
  
  const [brandAccounts, setBrandAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkUpdateModalVisible, setBulkUpdateModalVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkForm] = Form.useForm();

  // Status options
  const statusOptions = [
    'Sub Account', 'Main Account', 'Test Account', 'Inactive'
  ];

  // Email/SMS options
  const emailSmsOptions = [
    'Email', 'SMS', 'WA', 'No Yet OTP'
  ];

  const fetchBrandAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (currentPage - 1) * pageSize;
      let params = {
        skip: skip,
        limit: pageSize
      };
      
      // Only add search if there's text
      if (searchText.trim()) {
        params.search = searchText.trim();
      }
      
      const response = await api.get('/brand-accounts-simple', { params });
      
      const data = response.data.data || [];
      
      // Add unique key to each record to avoid duplicate key warnings
      const dataWithKeys = data.map((item, index) => ({
        ...item,
        uniqueKey: `${item.brand}-${item.platform}-${item.uid}-${skip + index}`
      }));
      
      setBrandAccounts(dataWithKeys);
      setTotal(response.data.total_count || 0);
    } catch (error) {
      console.error('Error fetching brand accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchText]);

  useEffect(() => {
    fetchBrandAccounts();
  }, [fetchBrandAccounts]);
  
  // Reset to first page when search changes
  useEffect(() => {
    if (searchText !== '') {
      setCurrentPage(1);
    }
  }, [searchText]);


  const updateBrandAccount = async (uid, data) => {
    try {
      const response = await api.put(`/brand-accounts-simple/${uid}`, data);
      return response.data;
    } catch (error) {
      // Error message will be handled in handleSubmit
      throw error;
    }
  };

  const deleteBrandAccount = async (uid) => {
    try {
      await api.delete(`/brand-accounts-simple/${uid}`);
      // Success message will be handled in handleDelete
      fetchBrandAccounts();
    } catch (error) {
      // Error message will be handled in handleDelete
      throw error;
    }
  };

  const handleAdd = () => {
    setEditingAccount(null);
    setModalVisible(true);
    // Use setTimeout to ensure modal is rendered before resetting form
    setTimeout(() => {
      form.resetFields();
    }, 100);
  };

  const handleEdit = (record) => {
    console.log('Editing record:', record);
    console.log('Record UID:', record.uid);
    setEditingAccount(record);
    setModalVisible(true);
    // Use setTimeout to ensure modal is rendered before setting form values
    setTimeout(() => {
      console.log('Setting form values:', record);
      form.setFieldsValue(record);
    }, 100);
  };

  const handleDelete = async (uid) => {
    try {
      await deleteBrandAccount(uid);
      message.success('Brand account deleted successfully');
    } catch (error) {
      message.error('Failed to delete brand account');
      console.error('Delete error:', error);
    }
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      console.log('Form values:', values);
      console.log('Editing account:', editingAccount);
      
      if (editingAccount && editingAccount.uid) {
        console.log('Updating account with UID:', editingAccount.uid);
        await updateBrandAccount(editingAccount.uid, values);
        message.success('Brand account updated successfully');
      } else {
        console.log('Creating new account');
        await api.post('/brand-accounts-simple', values);
        message.success('Brand account created successfully');
      }
      setModalVisible(false);
      setEditingAccount(null);
      form.resetFields();
      fetchBrandAccounts();
    } catch (error) {
      console.error('Error saving brand account:', error);
      if (editingAccount) {
        message.error(`Failed to update brand account: ${error.response?.data?.error || error.message}`);
      } else {
        message.error(`Failed to create brand account: ${error.response?.data?.error || error.message}`);
      }
      // Don't close modal on error, let user try again
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
      
      const response = await api.post('/brand-accounts/bulk-create', formData, {
        timeout: 120000, // 2 minutes timeout for bulk operations
      });
      message.success(`Bulk create completed: ${response.data.created_count} accounts created, ${response.data.error_count} errors`);
      if (response.data.errors.length > 0) {
        console.warn('Bulk create errors:', response.data.errors);
      }
      setBulkModalVisible(false);
      bulkForm.resetFields();
      fetchBrandAccounts();
    } catch (error) {
      console.error('Error in bulk create:', error);
      message.error(error.response?.data?.detail || 'Failed to bulk create accounts');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkUpdate = async (values) => {
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', values.file.file);
      
      const response = await api.post('/brand-accounts/bulk-update', formData, {
        timeout: 120000, // 2 minutes timeout for bulk operations
      });
      message.success(`Bulk update completed: ${response.data.updated_count} accounts updated, ${response.data.error_count} errors`);
      if (response.data.errors.length > 0) {
        console.warn('Bulk update errors:', response.data.errors);
      }
      setBulkUpdateModalVisible(false);
      bulkForm.resetFields();
      fetchBrandAccounts();
    } catch (error) {
      console.error('Error in bulk update:', error);
      message.error(error.response?.data?.detail || 'Failed to bulk update accounts');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select accounts to delete');
      return;
    }
    
    Modal.confirm({
      title: 'Confirm Bulk Delete',
      content: `Are you sure you want to delete ${selectedRowKeys.length} account(s)?`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setLoading(true);
          const response = await api.post('/brand-accounts/bulk-delete', selectedRowKeys);
          message.success(`Bulk delete completed: ${response.data.deleted_count} accounts deleted, ${response.data.error_count} errors`);
          if (response.data.errors.length > 0) {
            console.warn('Bulk delete errors:', response.data.errors);
          }
          setSelectedRowKeys([]);
          fetchBrandAccounts();
        } catch (error) {
          console.error('Error in bulk delete:', error);
          message.error(error.response?.data?.detail || 'Failed to bulk delete accounts');
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
      name: record.uid,
    }),
  };

  // Download template handler
  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/brand-accounts/template', {
        responseType: 'blob',
        timeout: 30000, // 30 seconds timeout for template download
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'brandaccounts_template.xlsx');
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
      width: 100,
      sorter: (a, b) => a.brand.localeCompare(b.brand),
      render: (text) => (
        <Tag color="blue" size="small">
          {text}
        </Tag>
      )
    },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      width: 80,
      sorter: (a, b) => a.platform.localeCompare(b.platform),
      render: (text) => (
        <Tag color="green" size="small">
          {text}
        </Tag>
      )
    },
    {
      title: 'UID',
      dataIndex: 'uid',
      key: 'uid',
      width: 180,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Text code style={{ fontSize: '12px' }}>{text}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Password',
      dataIndex: 'password',
      key: 'password',
      width: 120,
      render: (text) => (
        <Text code style={{ fontSize: '12px' }}>
          {text}
        </Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status_account',
      key: 'status_account',
      width: 80,
      render: (text) => {
        const color = text === 'Sub Account' ? 'blue' : 
                     text === 'Main Account' ? 'green' : 
                     text === 'Test Account' ? 'orange' : 'red';
        return <Tag color={color} size="small">{text}</Tag>;
      }
    },
    {
      title: 'OTP Method',
      dataIndex: 'email_sms',
      key: 'email_sms',
      width: 80,
      render: (text) => {
        const icon = text === 'Email' ? <MailOutlined /> : 
                    text === 'SMS' ? <PhoneOutlined /> : 
                    text === 'WA' ? <PhoneOutlined /> : <InfoCircleOutlined />;
        return (
          <Space size="small">
            {icon}
            <span style={{ fontSize: '12px' }}>{text}</span>
          </Space>
        );
      }
    },
    {
      title: 'PIC OTP',
      dataIndex: 'pic_otp',
      key: 'pic_otp',
      width: 140,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Text style={{ fontSize: '12px' }}>{text}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 80,
      render: (text) => (
        <Text type="secondary" style={{ fontSize: '11px' }}>
          {dayjs(text).format('DD/MM/YY')}
        </Text>
      )
    }
  ];

  // Actions column - only show for admin and superuser roles
  const actionsColumn = {
    title: 'Actions',
    key: 'actions',
    width: 80,
    fixed: 'right',
    render: (_, record) => (
      <Space size="small">
        <Tooltip title="Edit">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ 
              padding: '4px 8px',
              minWidth: '32px',
              height: '24px'
            }}
          />
        </Tooltip>
        <Popconfirm
          title="Delete this brand account?"
          description="This action cannot be undone."
          onConfirm={() => handleDelete(record.uid)}
          okText="Yes"
          cancelText="No"
          okType="danger"
        >
          <Tooltip title="Delete">
            <Button
              type="primary"
              size="small"
              danger
              icon={<DeleteOutlined />}
              style={{ 
                padding: '4px 8px',
                minWidth: '32px',
                height: '24px'
              }}
            />
          </Tooltip>
        </Popconfirm>
      </Space>
    )
  };

  // Conditionally include actions column based on user role
  const userRole = getUserRole();
  const columns = userRole === 'user' ? baseColumns : [...baseColumns, actionsColumn];

  return (
    <div className={`brand-accounts-container ${isDarkMode ? 'dark-mode' : ''}`}>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <UserOutlined style={{ marginRight: 8 }} />
              Brand Accounts Management
            </Title>
            <Text type="secondary">
              Manage brand accounts for different platforms
            </Text>
          </Col>
          <Col>
          {(() => {
            // Show add button for all roles (user, admin, superuser)
            return (
              <Space>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  Add Brand Account
                </Button>
                {userRole !== 'user' && (
                  <>
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
                  </>
                )}
              </Space>
            );
          })()}
          </Col>
        </Row>


        {/* Global Search Filter */}
        <div className="search-container" style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={18}>
              <Input
                placeholder="Search brand, platform, UID, email, or any field..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                size="large"
              />
            </Col>
            <Col span={6}>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchBrandAccounts}
                loading={loading}
                size="large"
                style={{ width: '100%' }}
              >
                Refresh
              </Button>
            </Col>
          </Row>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={brandAccounts}
          loading={loading}
          rowKey="uniqueKey"
          scroll={{ x: 1300 }}
          size="small"
          rowSelection={userRole !== 'user' ? rowSelection : null}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: false,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total}`,
            pageSizeOptions: ['20', '50', '100'],
            size: 'small',
            onChange: (page, newPageSize) => {
              setCurrentPage(page);
              if (newPageSize) {
                setPageSize(newPageSize);
              }
            }
          }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingAccount ? 'Edit Brand Account' : 'Add Brand Account'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingAccount(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="brand"
                label="Brand"
                rules={[{ required: true, message: 'Please enter brand name' }]}
              >
                <Input placeholder="Enter brand name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="platform"
                label="Platform"
                rules={[{ required: true, message: 'Please select platform' }]}
              >
                <Select placeholder="Select platform">
                  {['SHOPEE', 'TOKOPEDIA', 'LAZADA', 'BLIBLI', 'TIKTOK', 'ZALORA'].map(platform => (
                    <Option key={platform} value={platform}>
                      {platform}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="uid"
                label="UID"
                rules={[
                  { required: true, message: 'Please enter UID' },
                  { min: 3, message: 'UID must be at least 3 characters' }
                ]}
              >
                <Input 
                  placeholder="Enter UID" 
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: 'Please enter password' }]}
              >
                <Input placeholder="Enter password" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status_account"
                label="Status Account"
              >
                <Select placeholder="Select status">
                  {statusOptions.map(status => (
                    <Option key={status} value={status}>
                      {status}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email_sms"
                label="Email/SMS"
              >
                <Select placeholder="Select email/SMS option">
                  {emailSmsOptions.map(option => (
                    <Option key={option} value={option}>
                      {option}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="pic_otp"
            label="PIC OTP"
          >
            <Input placeholder="Enter PIC OTP" />
          </Form.Item>


          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                setEditingAccount(null);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingAccount ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Bulk Create Modal */}
      <Modal
        title="Bulk Create Brand Accounts"
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
            <Text code>platform</Text> - Platform name (required)
            <br />
            <Text code>uid</Text> - User ID (optional)
            <br />
            <Text code>password</Text> - Password (optional)
            <br />
            <Text code>status_account</Text> - Account status (optional, defaults to "active")
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
        title="Bulk Update Brand Accounts"
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
            <Text code>uid</Text> - User ID (required for updates)
            <br />
            <Text code>brand</Text> - Brand name (optional)
            <br />
            <Text code>platform</Text> - Platform name (optional)
            <br />
            <Text code>password</Text> - Password (optional)
            <br />
            <Text code>status_account</Text> - Account status (optional)
            <br />
            <br />
            <Text type="secondary">
              💡 Tip: Export current data to get the correct UIDs, then modify and upload
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

export default BrandAccounts;
