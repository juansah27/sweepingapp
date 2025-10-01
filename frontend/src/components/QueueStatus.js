import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, Button, Space, Tag, Typography, Divider } from 'antd';
import { 
  ClockCircleOutlined, 
  UserOutlined, 
  FolderOutlined, 
  ReloadOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/axios';
import { workspaceNotifications } from '../utils/notificationUtils';

const { Title, Text } = Typography;

const QueueStatus = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch queue status
  const fetchQueueStatus = async () => {
    setLoading(true);
    try {
      const response = await api.get('/queue-status');
      if (response.data.success) {
        setQueueStatus(response.data);
      }
    } catch (error) {
      console.error('Error fetching queue status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup user workspace
  const cleanupWorkspace = async () => {
    try {
      const response = await api.post('/cleanup-user-workspace', {
        older_than_hours: 24
      });
      if (response.data.success) {
        workspaceNotifications.cleaned(user?.username || 'User', 0); // We don't have file count from API
        // Refresh queue status after cleanup
        fetchQueueStatus();
      }
    } catch (error) {
      console.error('Error cleaning up workspace:', error);
      workspaceNotifications.error(user?.username || 'User', error.message);
    }
  };

  useEffect(() => {
    fetchQueueStatus();
  }, []);

  if (!queueStatus) {
    return (
      <Card loading={loading} className={`queue-status-card ${isDarkMode ? 'dark' : 'light'}`}>
        <Title level={4}>📊 Upload Queue Status</Title>
        <Text>Loading queue status...</Text>
      </Card>
    );
  }

  const { queue_status } = queueStatus;

  return (
    <div className="queue-status-container">
      <Card 
        className={`queue-status-card ${isDarkMode ? 'dark' : 'light'}`}
        title={
          <Space>
            <ClockCircleOutlined />
            <span>📊 Upload Queue Status</span>
          </Space>
        }
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchQueueStatus}
              loading={loading}
            >
              Refresh
            </Button>
            <Button 
              icon={<DeleteOutlined />} 
              onClick={cleanupWorkspace}
              type="default"
            >
              Cleanup
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Upload Queue"
              value={queue_status.upload_queue_length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: queue_status.upload_queue_length > 0 ? '#faad14' : '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Processing Queue"
              value={queue_status.processing_queue_length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: queue_status.processing_queue_length > 0 ? '#1890ff' : '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Active Users"
              value={queue_status.active_users}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="User Workspaces"
              value={queue_status.user_workspaces.length}
              prefix={<FolderOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Col>
        </Row>

        <Divider />

        <div className="queue-details">
          <Title level={5}>👥 Active Users</Title>
          <Space wrap>
            {queue_status.user_workspaces.map((workspace, index) => (
              <Tag 
                key={index}
                color={workspace === user?.username ? 'blue' : 'default'}
                icon={<UserOutlined />}
              >
                {workspace}
              </Tag>
            ))}
          </Space>
        </div>

        <Divider />

        <div className="queue-info">
          <Text type="secondary">
            <strong>Current User:</strong> {queueStatus.current_user}
          </Text>
          <br />
          <Text type="secondary">
            <strong>Last Updated:</strong> {queueStatus.timestamp}
          </Text>
        </div>
      </Card>

      <style jsx>{`
        .queue-status-container {
          padding: 20px;
        }
        
        .queue-status-card {
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .queue-status-card.dark {
          background: #1f1f1f;
          border-color: #434343;
        }
        
        .queue-status-card.light {
          background: #ffffff;
          border-color: #d9d9d9;
        }
        
        .queue-details {
          margin-top: 16px;
        }
        
        .queue-info {
          margin-top: 16px;
          padding: 12px;
          background: ${isDarkMode ? '#262626' : '#f5f5f5'};
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
};

export default QueueStatus;
