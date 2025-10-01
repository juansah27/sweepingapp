import React, { useState } from 'react';
import { Card, Form, Input, Button, Tabs, Typography, App } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { userNotifications } from '../utils/notificationUtils';

const { Title } = Typography;

const Login = () => {
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { message, notification } = App.useApp();

  const onLogin = async (values) => {
    setLoading(true);
    const result = await login(values.username, values.password);
    setLoading(false);
    
    if (result.success) {
      userNotifications.login(values.username, notification);
      navigate('/');
    } else {
      message.error(result.error);
    }
  };

  const onRegister = async (values) => {
    setLoading(true);
    const result = await register(values.username, values.email, values.password);
    setLoading(false);
    
    if (result.success) {
      userNotifications.login(values.username, notification);
      navigate('/');
    } else {
      message.error(result.error);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ color: '#1890ff' }}>Sweeping Apps</Title>
          <p style={{ color: '#666' }}>Order Management System</p>
        </div>
        
        <Tabs 
          defaultActiveKey="login" 
          centered
          items={[
            {
              key: 'login',
              label: 'Login',
              children: (
                <Form
                  form={loginForm}
                  onFinish={onLogin}
                  layout="vertical"
                >
                  <Form.Item
                    name="username"
                    rules={[{ required: true, message: 'Please input your username!' }]}
                  >
                    <Input 
                      prefix={<UserOutlined />} 
                      placeholder="Username" 
                      size="large"
                      autoComplete="username"
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: 'Please input your password!' }]}
                  >
                    <Input.Password 
                      prefix={<LockOutlined />} 
                      placeholder="Password" 
                      size="large"
                      autoComplete="current-password"
                    />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      size="large" 
                      block
                      loading={loading}
                    >
                      Log in
                    </Button>
                  </Form.Item>
                </Form>
              )
            },
            {
              key: 'register',
              label: 'Register',
              children: (
                <Form
                  form={registerForm}
                  onFinish={onRegister}
                  layout="vertical"
                >
                  <Form.Item
                    name="username"
                    rules={[{ required: true, message: 'Please input your username!' }]}
                  >
                    <Input 
                      prefix={<UserOutlined />} 
                      placeholder="Username" 
                      size="large"
                      autoComplete="username"
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: 'Please input your email!' },
                      { type: 'email', message: 'Please enter a valid email!' }
                    ]}
                  >
                    <Input 
                      prefix={<MailOutlined />} 
                      placeholder="Email" 
                      size="large"
                      autoComplete="email"
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: 'Please input your password!' }]}
                  >
                    <Input.Password 
                      prefix={<LockOutlined />} 
                      placeholder="Password" 
                      size="large"
                      autoComplete="current-password"
                    />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      size="large" 
                      block
                      loading={loading}
                    >
                      Register
                    </Button>
                  </Form.Item>
                </Form>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default Login;
