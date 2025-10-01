import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Divider,
  App
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

const { Title } = Typography;

const Profile = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { user, refreshUserInfo } = useAuth();
  const { message: messageApi } = App.useApp();

  useEffect(() => {
    if (user) {
      const initialData = {};
      if (user.role !== 'user') {
        initialData.username = user.username;
        initialData.email = user.email;
        initialData.role = user.role;
      }
      form.setFieldsValue(initialData);
    }
  }, [user, form]);

  const handleUpdateProfile = async (values) => {
    setLoading(true);
    try {
      const updateData = {};
      
      // Only allow email changes for non-user roles
      if (user?.role !== 'user' && values.email !== user.email) {
        updateData.email = values.email;
      }
      
      if (values.new_password) {
        updateData.current_password = values.current_password;
        updateData.new_password = values.new_password;
      }
      
      if (Object.keys(updateData).length === 0) {
        messageApi.warning('No changes to update');
        return;
      }
      
      await api.put('/me', updateData);
      messageApi.success('Profile updated successfully');
      
      // Refresh user info
      await refreshUserInfo();
      
      // Clear password fields
      form.setFieldsValue({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      
    } catch (error) {
      messageApi.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <App>
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ marginBottom: 24 }}>
            <Title level={2} style={{ margin: 0 }}>
              <UserOutlined /> Profile Settings
            </Title>
            <p style={{ color: '#666', marginTop: 8 }}>
              {user?.role === 'user' 
                ? 'Manage your password settings'
                : 'Manage your account information and security settings'
              }
            </p>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleUpdateProfile}
            style={{ maxWidth: 600 }}
          >
            {user?.role !== 'user' && (
              <>
                <Form.Item
                  name="username"
                  label="Username"
                >
                  <Input 
                    prefix={<UserOutlined />} 
                    disabled 
                    placeholder="Username"
                  />
                </Form.Item>

                <Form.Item
                  name="role"
                  label="Role"
                >
                  <Input 
                    disabled 
                    placeholder="Role"
                  />
                </Form.Item>

                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Please input your email!' },
                    { type: 'email', message: 'Please enter a valid email!' }
                  ]}
                >
                  <Input 
                    prefix={<MailOutlined />} 
                    placeholder="Email"
                  />
                </Form.Item>

                <Divider>Change Password (Optional)</Divider>
              </>
            )}

            {user?.role === 'user' && (
              <Divider>Change Password (Optional)</Divider>
            )}

            <Form.Item
              name="current_password"
              label="Current Password"
              rules={[
                {
                  validator: (_, value) => {
                    const newPassword = form.getFieldValue('new_password');
                    if (newPassword && !value) {
                      return Promise.reject(new Error('Current password is required to change password'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="Current password"
              />
            </Form.Item>

            <Form.Item
              name="new_password"
              label="New Password"
              rules={[
                {
                  validator: (_, value) => {
                    if (value && value.length < 6) {
                      return Promise.reject(new Error('Password must be at least 6 characters'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="New password"
              />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              label="Confirm New Password"
              dependencies={['new_password']}
              rules={[
                {
                  validator: (_, value) => {
                    const newPassword = form.getFieldValue('new_password');
                    if (newPassword && value !== newPassword) {
                      return Promise.reject(new Error('Passwords do not match'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="Confirm new password"
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  icon={<SaveOutlined />}
                >
                  Update Profile
                </Button>
                <Button 
                  onClick={() => {
                    form.resetFields();
                    if (user) {
                      const resetData = {};
                      if (user.role !== 'user') {
                        resetData.username = user.username;
                        resetData.email = user.email;
                        resetData.role = user.role;
                      }
                      form.setFieldsValue(resetData);
                    }
                  }}
                >
                  Reset
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </App>
  );
};

export default Profile;
