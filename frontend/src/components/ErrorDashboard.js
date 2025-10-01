import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Tag, 
  Typography, 
  Space, 
  Button, 
  Spin,
  Timeline,
  Badge,
  Tooltip,
  Alert,
  Progress,
  Select,
  DatePicker,
  Tabs,
  Descriptions,
  Modal,
  Collapse
} from 'antd';
import { 
  ExclamationCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  NetworkOutlined,
  FileTextOutlined,
  BugOutlined,
  BellOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/axios';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Panel } = Collapse;

// Error monitoring dashboard component
const ErrorDashboard = () => {
  const { theme } = useTheme();
  const [errorStats, setErrorStats] = useState(null);
  const [errorTrends, setErrorTrends] = useState([]);
  const [recentErrors, setRecentErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(3600); // 1 hour
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [errorDetailModal, setErrorDetailModal] = useState({ visible: false, error: null });

  // Fetch error statistics
  const fetchErrorStats = useCallback(async () => {
    try {
      const response = await api.get('/api/error-stats', {
        params: {
          time_window: selectedTimeWindow,
          category: selectedCategory !== 'all' ? selectedCategory : undefined
        }
      });
      if (response.data.success) {
        setErrorStats(response.data.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching error stats:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTimeWindow, selectedCategory]);

  // Fetch error trends
  const fetchErrorTrends = useCallback(async () => {
    try {
      const response = await api.get('/api/error-trends', {
        params: {
          category: selectedCategory !== 'all' ? selectedCategory : undefined
        }
      });
      if (response.data.success) {
        setErrorTrends(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching error trends:', error);
    }
  }, [selectedCategory]);

  // Fetch recent errors
  const fetchRecentErrors = useCallback(async () => {
    try {
      const response = await api.get('/api/recent-errors', {
        params: { limit: 50 }
      });
      if (response.data.success) {
        setRecentErrors(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching recent errors:', error);
    }
  }, []);

  // Auto refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchErrorStats();
        fetchErrorTrends();
        fetchRecentErrors();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchErrorStats, fetchErrorTrends, fetchRecentErrors]);

  // Initial load
  useEffect(() => {
    fetchErrorStats();
    fetchErrorTrends();
    fetchRecentErrors();
  }, [fetchErrorStats, fetchErrorTrends, fetchRecentErrors]);

  // Get severity color
  const getSeverityColor = useCallback((severity) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'default';
    }
  }, []);

  // Get category icon
  const getCategoryIcon = useCallback((category) => {
    switch (category) {
      case 'database': return <DatabaseOutlined />;
      case 'network': return <NetworkOutlined />;
      case 'file_processing': return <FileTextOutlined />;
      case 'validation': return <CheckCircleOutlined />;
      case 'external_service': return <NetworkOutlined />;
      case 'system': return <BugOutlined />;
      default: return <ExclamationCircleOutlined />;
    }
  }, []);

  // Error statistics component
  const ErrorStatistics = useMemo(() => {
    if (!errorStats) return null;

    const { total_errors, by_category, by_severity, error_rate } = errorStats;

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Errors"
              value={total_errors}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: total_errors > 100 ? '#cf1322' : '#3f8600' }}
            />
            <Text type="secondary">Last {selectedTimeWindow / 3600}h</Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Error Rate"
              value={error_rate}
              suffix="errors/hour"
              precision={1}
              valueStyle={{ color: error_rate > 10 ? '#cf1322' : '#3f8600' }}
            />
            <Progress 
              percent={Math.min(error_rate * 10, 100)} 
              size="small"
              strokeColor={error_rate > 10 ? '#ff4d4f' : '#52c41a'}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Critical Errors"
              value={by_severity?.critical || 0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
            <Text type="secondary">Requires immediate attention</Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="High Severity"
              value={by_severity?.high || 0}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<WarningOutlined />}
            />
            <Text type="secondary">Needs investigation</Text>
          </Card>
        </Col>
      </Row>
    );
  }, [errorStats, selectedTimeWindow]);

  // Error trends component
  const ErrorTrends = useMemo(() => {
    if (!errorTrends || errorTrends.length === 0) return null;

    return (
      <Card title="Error Trends">
        <Timeline>
          {errorTrends.slice(-10).map((trend, index) => (
            <Timeline.Item
              key={index}
              color={trend.count > 5 ? 'red' : trend.count > 2 ? 'orange' : 'green'}
              dot={trend.count > 5 ? <CloseCircleOutlined /> : trend.count > 2 ? <WarningOutlined /> : <CheckCircleOutlined />}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Text strong>{new Date(trend.timestamp).toLocaleString()}</Text>
                  <Badge count={trend.count} style={{ backgroundColor: trend.count > 5 ? '#ff4d4f' : '#52c41a' }} />
                </Space>
                <Text type="secondary">Error count: {trend.count}</Text>
              </Space>
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>
    );
  }, [errorTrends]);

  // Recent errors table
  const RecentErrorsTable = useMemo(() => {
    const columns = [
      {
        title: 'Time',
        dataIndex: 'timestamp',
        key: 'timestamp',
        width: 150,
        render: (timestamp) => new Date(timestamp).toLocaleString()
      },
      {
        title: 'Error ID',
        dataIndex: 'error_id',
        key: 'error_id',
        width: 120,
        render: (errorId) => (
          <Text code style={{ fontSize: '12px' }}>
            {errorId.substring(0, 12)}...
          </Text>
        )
      },
      {
        title: 'Type',
        dataIndex: 'error_type',
        key: 'error_type',
        width: 120,
        render: (type) => (
          <Tag color="blue" style={{ fontSize: '11px' }}>
            {type}
          </Tag>
        )
      },
      {
        title: 'Severity',
        dataIndex: 'severity',
        key: 'severity',
        width: 100,
        render: (severity) => (
          <Tag color={getSeverityColor(severity)}>
            {severity.toUpperCase()}
          </Tag>
        )
      },
      {
        title: 'Category',
        dataIndex: 'category',
        key: 'category',
        width: 120,
        render: (category) => (
          <Space>
            {getCategoryIcon(category)}
            <Text>{category}</Text>
          </Space>
        )
      },
      {
        title: 'Message',
        dataIndex: 'error_message',
        key: 'error_message',
        ellipsis: true,
        render: (message) => (
          <Tooltip title={message}>
            <Text>{message.substring(0, 50)}...</Text>
          </Tooltip>
        )
      },
      {
        title: 'Recovery',
        dataIndex: 'recovery_action',
        key: 'recovery_action',
        width: 100,
        render: (action) => (
          <Tag color={action === 'retry' ? 'blue' : action === 'fallback' ? 'orange' : 'red'}>
            {action}
          </Tag>
        )
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 100,
        render: (_, record) => (
          <Button
            size="small"
            onClick={() => setErrorDetailModal({ visible: true, error: record })}
          >
            Details
          </Button>
        )
      }
    ];

    return (
      <Card title="Recent Errors">
        <Table
          columns={columns}
          dataSource={recentErrors}
          pagination={{ pageSize: 10 }}
          size="small"
          scroll={{ x: 800 }}
          rowKey="error_id"
        />
      </Card>
    );
  }, [recentErrors, getSeverityColor, getCategoryIcon]);

  // Error categories breakdown
  const ErrorCategories = useMemo(() => {
    if (!errorStats?.by_category) return null;

    const categories = Object.entries(errorStats.by_category);
    const total = categories.reduce((sum, [, count]) => sum + count, 0);

    return (
      <Card title="Error Categories">
        <Row gutter={[16, 16]}>
          {categories.map(([category, count]) => (
            <Col xs={24} sm={12} md={8} key={category}>
              <Card size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    {getCategoryIcon(category)}
                    <Text strong>{category.replace('_', ' ').toUpperCase()}</Text>
                  </Space>
                  <Statistic
                    value={count}
                    suffix={`(${((count / total) * 100).toFixed(1)}%)`}
                  />
                  <Progress 
                    percent={(count / total) * 100} 
                    size="small"
                    strokeColor="#1890ff"
                  />
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    );
  }, [errorStats, getCategoryIcon]);

  // Error detail modal
  const ErrorDetailModal = useMemo(() => {
    if (!errorDetailModal.error) return null;

    const error = errorDetailModal.error;

    return (
      <Modal
        title={`Error Details - ${error.error_id}`}
        visible={errorDetailModal.visible}
        onCancel={() => setErrorDetailModal({ visible: false, error: null })}
        footer={[
          <Button key="close" onClick={() => setErrorDetailModal({ visible: false, error: null })}>
            Close
          </Button>
        ]}
        width={800}
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Error ID" span={2}>
            <Text code>{error.error_id}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Error Type">
            <Tag color="blue">{error.error_type}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Error Code">
            <Text code>{error.error_code}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Severity">
            <Tag color={getSeverityColor(error.severity)}>
              {error.severity.toUpperCase()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Category">
            <Space>
              {getCategoryIcon(error.category)}
              <Text>{error.category}</Text>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Recovery Action">
            <Tag color={error.recovery_action === 'retry' ? 'blue' : 'orange'}>
              {error.recovery_action}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Retry Count">
            {error.retry_count} / {error.max_retries}
          </Descriptions.Item>
          <Descriptions.Item label="Timestamp" span={2}>
            {new Date(error.timestamp).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Message" span={2}>
            <Paragraph>{error.error_message}</Paragraph>
          </Descriptions.Item>
        </Descriptions>

        {error.context && (
          <Card title="Context Information" style={{ marginTop: 16 }}>
            <Descriptions bordered column={2}>
              {Object.entries(error.context).map(([key, value]) => (
                <Descriptions.Item key={key} label={key.replace('_', ' ').toUpperCase()}>
                  {value || 'N/A'}
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        )}

        {error.stack_trace && (
          <Card title="Stack Trace" style={{ marginTop: 16 }}>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '300px'
            }}>
              {error.stack_trace}
            </pre>
          </Card>
        )}
      </Modal>
    );
  }, [errorDetailModal, getSeverityColor, getCategoryIcon]);

  if (loading && !errorStats) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>Loading error dashboard...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>
            <BugOutlined /> Error Monitoring Dashboard
          </Title>
          {lastUpdated && (
            <Text type="secondary">
              Last updated: {lastUpdated.toLocaleString()}
            </Text>
          )}
        </Col>
        <Col>
          <Space>
            <Select
              value={selectedTimeWindow}
              onChange={setSelectedTimeWindow}
              style={{ width: 120 }}
            >
              <Option value={3600}>1 Hour</Option>
              <Option value={21600}>6 Hours</Option>
              <Option value={86400}>24 Hours</Option>
              <Option value={604800}>7 Days</Option>
            </Select>
            <Select
              value={selectedCategory}
              onChange={setSelectedCategory}
              style={{ width: 150 }}
            >
              <Option value="all">All Categories</Option>
              <Option value="database">Database</Option>
              <Option value="network">Network</Option>
              <Option value="file_processing">File Processing</Option>
              <Option value="validation">Validation</Option>
              <Option value="external_service">External Service</Option>
              <Option value="system">System</Option>
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchErrorStats();
                fetchErrorTrends();
                fetchRecentErrors();
              }}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              type={autoRefresh ? 'primary' : 'default'}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Error Statistics */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4}>Error Statistics</Title>
        {ErrorStatistics}
      </div>

      {/* Error Categories */}
      <div style={{ marginBottom: 24 }}>
        {ErrorCategories}
      </div>

      {/* Error Trends */}
      <div style={{ marginBottom: 24 }}>
        {ErrorTrends}
      </div>

      {/* Recent Errors */}
      <div style={{ marginBottom: 24 }}>
        {RecentErrorsTable}
      </div>

      {/* Error Detail Modal */}
      {ErrorDetailModal}

      {/* Footer */}
      <Card size="small">
        <Row justify="space-between" align="middle">
          <Col>
            <Text type="secondary">
              Error monitoring status: 
              <Badge 
                status={autoRefresh ? 'processing' : 'default'} 
                text={autoRefresh ? 'Active' : 'Paused'} 
                style={{ marginLeft: 8 }}
              />
            </Text>
          </Col>
          <Col>
            <Text type="secondary">
              Refresh interval: {refreshInterval / 1000}s
            </Text>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ErrorDashboard;
