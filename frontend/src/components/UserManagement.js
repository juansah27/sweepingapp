import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  Space,
  Card,
  Typography,
  Tag,
  Row,
  Col,
  Divider,
  App
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined
} from '@ant-design/icons';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const { Title } = Typography;
const { Option } = Select;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkForm] = Form.useForm();
  const [hasError, setHasError] = useState(false);
  const { message } = App.useApp();
  const { user } = useAuth();

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Add retry functionality
  const retryLoadUsers = () => {
    loadUsers();
  };

  const loadUsers = async () => {
    setLoading(true);
    setHasError(false);
    try {
      const response = await api.get('/api/admin/users');
      let usersList = response.data;
      
      // Filter out superuser accounts for admin and user roles
      if (user?.role === 'admin' || user?.role === 'user') {
        usersList = usersList.filter(u => u.role !== 'superuser');
      }
      
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      setHasError(true);
      
      // Handle different error types
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        message.error('Request timed out. Please check your connection and try again.');
      } else if (error.response?.status === 504) {
        message.error('Server timeout. Please try again later.');
      } else if (error.response?.status === 401) {
        message.error('Authentication required. Please login again.');
      } else if (error.response?.status === 403) {
        message.error('Access denied. You do not have permission to view users.');
      } else {
        message.error('Failed to load users. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (values) => {
    try {
      console.log('Creating user with values:', values);
      
      // Validate required fields before sending
      if (!values.username || !values.password) {
        message.error('Username and password are required');
        return;
      }
      
      // Ensure role is set
      if (!values.role) {
        values.role = 'user';
      }
      
      const response = await api.post('/api/admin/users', values);
      message.success('User created successfully');
      setModalVisible(false);
      form.resetFields();
      loadUsers();
    } catch (error) {
      console.error('Create user error:', error);
      
      // Handle network/timeout errors
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        message.error('Request timed out. Please check your connection and try again.');
        return;
      }
      
      // Handle validation errors (422)
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        let errorMessage = 'Validation failed';
        
        if (Array.isArray(errorData)) {
          errorMessage = errorData.map(err => err.msg || err.detail || 'Validation error').join(', ');
        } else if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(err => err.msg || err.detail || 'Validation error').join(', ');
          } else {
            errorMessage = errorData.detail;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        message.error(errorMessage);
      } else if (error.response?.status === 400) {
        // Handle bad request (username/email already exists)
        const errorMessage = error.response.data?.detail || 'Bad request';
        message.error(errorMessage);
      } else if (error.response?.status === 403) {
        // Handle forbidden (admin trying to create superuser)
        const errorMessage = error.response.data?.detail || 'Permission denied';
        message.error(errorMessage);
      } else if (error.response?.status === 504) {
        message.error('Server timeout. Please try again later.');
      } else {
        // Handle other errors
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to create user';
        message.error(typeof errorMessage === 'string' ? errorMessage : 'Failed to create user');
      }
    }
  };

  const handleUpdateUser = async (values) => {
    try {
      // Ensure is_active is properly converted to boolean
      const updateData = { ...values };
      if (updateData.is_active !== undefined) {
        // Handle all possible boolean formats
        updateData.is_active = updateData.is_active === true || 
                               updateData.is_active === 'true' || 
                               updateData.is_active === 1;
      }
      
      await api.put(`/api/admin/users/${editingUser.id}`, updateData);
      message.success('User updated successfully');
      setModalVisible(false);
      setEditingUser(null);
      form.resetFields();
      loadUsers();
    } catch (error) {
      console.error('Update user error:', error);
      
      // Handle validation errors (422)
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        let errorMessage = 'Validation failed';
        
        if (Array.isArray(errorData)) {
          // Handle array of validation errors
          errorMessage = errorData.map(err => err.msg || err.detail || 'Validation error').join(', ');
        } else if (errorData.detail) {
          // Handle single error detail
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(err => err.msg || 'Validation error').join(', ');
          } else {
            errorMessage = errorData.detail;
          }
        }
        
        message.error(errorMessage);
      } else {
        // Handle other errors
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to update user';
        message.error(typeof errorMessage === 'string' ? errorMessage : 'Failed to update user');
      }
    }
  };

  const handleDeleteUser = async (userId, userRecord) => {
    try {
      await api.delete(`/api/admin/users/${userId}`);
      message.success('User deleted successfully');
      loadUsers();
    } catch (error) {
      console.error('Delete user error:', error);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        const errorMessage = error.response?.data?.detail || 'Permission denied';
        message.error(errorMessage);
      } else if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.detail || 'Bad request';
        message.error(errorMessage);
      } else {
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete user';
        message.error(typeof errorMessage === 'string' ? errorMessage : 'Failed to delete user');
      }
    }
  };

  const handleBulkCreate = async (values) => {
    try {
      const response = await api.post('/api/admin/users/bulk-create', values.users);
      const { created_users, errors } = response.data;
      
      if (created_users > 0) {
        message.success(`Successfully created ${created_users} users`);
      }
      
      if (errors && errors.length > 0) {
        message.warning(`Some users could not be created: ${errors.join(', ')}`);
      }
      
      setBulkModalVisible(false);
      bulkForm.resetFields();
      loadUsers();
    } catch (error) {
      console.error('Bulk create error:', error);
      
      // Handle validation errors (422)
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        let errorMessage = 'Validation failed';
        
        if (Array.isArray(errorData)) {
          // Handle array of validation errors
          errorMessage = errorData.map(err => err.msg || err.detail || 'Validation error').join(', ');
        } else if (errorData.detail) {
          // Handle single error detail
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(err => err.msg || 'Validation error').join(', ');
          } else {
            errorMessage = errorData.detail;
          }
        }
        
        message.error(errorMessage);
      } else {
        // Handle other errors
        const errorMessage = error.response?.data?.detail || error.message || 'Failed to create users';
        message.error(typeof errorMessage === 'string' ? errorMessage : 'Failed to create users');
      }
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    // Ensure is_active is properly handled for form
    const isActiveValue = user.is_active === true || user.is_active === 'true';
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: isActiveValue
    });
    setModalVisible(true);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      render: (text) => (
        <Space>
          <UserOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        let color = 'blue';
        if (role === 'admin') color = 'red';
        if (role === 'superuser') color = 'purple';
        
        return (
          <Tag color={color}>
            {role.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (status) => {
        // Handle both boolean and string values for backward compatibility
        const isActive = status === true || status === 'true';
        return (
          <Tag color={isActive ? 'green' : 'red'}>
            {isActive ? 'Active' : 'Inactive'}
          </Tag>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const currentUserRole = user?.role;
        const currentUserId = user?.id;
        const recordRole = record.role;
        const recordId = record.id;
        
        // Hide all actions for superuser accounts if current user is not superuser
        const canShowActions = currentUserRole === 'superuser' || recordRole !== 'superuser';
        
        // Admin can only delete users, not other admins or superusers
        const canDelete = currentUserRole === 'superuser' || 
          (currentUserRole === 'admin' && recordRole === 'user');
        
        return (
          <Space>
            {canShowActions && (
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEditModal(record)}
              >
                Edit
              </Button>
            )}
            {canDelete && canShowActions && (
              <Popconfirm
                title="Are you sure you want to delete this user?"
                onConfirm={() => handleDeleteUser(record.id, record)}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="primary"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                >
                  Delete
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <App>
      <div style={{ padding: '24px' }}>
        <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <TeamOutlined /> User Management
            </Title>
          </Col>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateModal}
              >
                Add User
              </Button>
              <Button
                type="default"
                onClick={() => setBulkModalVisible(true)}
              >
                Bulk Create
              </Button>
            </Space>
          </Col>
        </Row>

        {hasError ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Failed to load users. Please check your connection and try again.</p>
            <Button type="primary" onClick={retryLoadUsers} loading={loading}>
              Retry
            </Button>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} users`,
            }}
          />
        )}
      </Card>

      {/* Create/Edit User Modal */}
      <Modal
        title={editingUser ? 'Edit User' : 'Create New User'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingUser(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingUser ? handleUpdateUser : handleCreateUser}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[
              { required: true, message: 'Please input username!' },
              { min: 2, max: 50, message: 'Username must be 2-50 characters' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: 'Username can only contain letters, numbers, underscores, and hyphens' }
            ]}
          >
            <Input placeholder="Enter username" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email (Optional)"
            rules={[
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input placeholder="Enter email (optional)" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Please input password!' },
                { min: 8, message: 'Password must be at least 8 characters' },
                { pattern: /[A-Z]/, message: 'Password must contain at least one uppercase letter' },
                { pattern: /[a-z]/, message: 'Password must contain at least one lowercase letter' },
                { pattern: /\d/, message: 'Password must contain at least one number' }
              ]}
            >
              <Input.Password placeholder="Enter password" />
            </Form.Item>
          )}

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Please select role!' }]}
          >
            <Select placeholder="Select role">
              <Option value="user">User</Option>
              <Option value="admin">Admin</Option>
              {user?.role === 'superuser' && <Option value="superuser">Superuser</Option>}
            </Select>
          </Form.Item>

          {editingUser && (
            <Form.Item
              name="is_active"
              label="Status"
              rules={[{ required: true, message: 'Please select status!' }]}
            >
              <Select placeholder="Select status">
                <Option value={true}>Active</Option>
                <Option value={false}>Inactive</Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                setEditingUser(null);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Bulk Create Modal */}
      <Modal
        title="Bulk Create Users"
        open={bulkModalVisible}
        onCancel={() => {
          setBulkModalVisible(false);
          bulkForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={bulkForm}
          layout="vertical"
          onFinish={handleBulkCreate}
        >
          <Form.List name="users">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card
                    key={key}
                    size="small"
                    title={`User ${name + 1}`}
                    extra={
                      <Button
                        type="text"
                        danger
                        onClick={() => remove(name)}
                      >
                        Remove
                      </Button>
                    }
                    style={{ marginBottom: 16 }}
                  >
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'username']}
                          label="Username"
                          rules={[
                            { required: true, message: 'Please input username!' },
                            { min: 2, max: 50, message: 'Username must be 2-50 characters' }
                          ]}
                        >
                          <Input placeholder="Username" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'email']}
                          label="Email (Optional)"
                          rules={[
                            { type: 'email', message: 'Please enter a valid email!' }
                          ]}
                        >
                          <Input placeholder="Email (optional)" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'password']}
                          label="Password"
                          rules={[
                            { required: true, message: 'Please input password!' },
                            { min: 8, message: 'Password must be at least 8 characters' },
                            { pattern: /[A-Z]/, message: 'Password must contain at least one uppercase letter' },
                            { pattern: /[a-z]/, message: 'Password must contain at least one lowercase letter' },
                            { pattern: /\d/, message: 'Password must contain at least one number' }
                          ]}
                        >
                          <Input.Password placeholder="Password" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item
                      {...restField}
                      name={[name, 'role']}
                      label="Role"
                      rules={[{ required: true, message: 'Please select role!' }]}
                    >
                      <Select placeholder="Select role">
                        <Option value="user">User</Option>
                        <Option value="admin">Admin</Option>
                        {user?.role === 'superuser' && <Option value="superuser">Superuser</Option>}
                      </Select>
                    </Form.Item>
                  </Card>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    Add User
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Divider />

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setBulkModalVisible(false);
                bulkForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Create Users
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      </div>
    </App>
  );
};

export default UserManagement;
