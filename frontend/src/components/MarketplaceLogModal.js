import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Modal, 
  Typography, 
  Button, 
  Space, 
  Tag, 
  Spin,
  Card,
  Row,
  Col,
  Tooltip,
  Alert,
  Select,
  InputNumber
} from 'antd';
import { 
  FileTextOutlined, 
  CloseOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/axios';

const { Title, Text } = Typography;
const { Option } = Select;

const MarketplaceLogModal = ({ 
  visible, 
  onClose, 
  marketplace,
  user
}) => {
  const { user: currentUser } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [logLines, setLogLines] = useState(50);
  const logContainerRef = useRef(null);
  const eventSourceRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Fetch logs from API
  const fetchLogs = async () => {
    if (!marketplace || !user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      
      const response = await api.get('/api/marketplace-logs', {
        params: {
          marketplace: marketplace,
          user: user,
          lines: logLines
        }
      });
      
      
      if (response.data.success) {
        setLogs(response.data.logs || []);
      } else {
        const errorMsg = response.data.error || 'Failed to fetch logs';
        setError(`${errorMsg}${response.data.debug_info ? `\n\nDebug: ${JSON.stringify(response.data.debug_info, null, 2)}` : ''}`);
      }
    } catch (err) {
      setError(`Network Error: ${err.message || 'Failed to fetch marketplace logs'}`);
    } finally {
      setLoading(false);
    }
  };

  // Start auto-refresh
  const startAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    setStreaming(true);
    refreshIntervalRef.current = setInterval(() => {
      fetchLogs();
    }, 500); // Refresh every 3 seconds
  };

  // Stop auto-refresh
  const stopAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    setStreaming(false);
  };

  // Fetch logs when modal opens or parameters change
  useEffect(() => {
    if (visible && marketplace && user) {
      fetchLogs();
    } else {
    }
  }, [visible, marketplace, user, logLines]);

  // Get log level color
  const getLogColor = (level) => {
    switch (level?.toUpperCase()) {
      case 'ERROR': return '#ff4d4f';
      case 'WARN': return '#faad14';
      case 'DEBUG': return '#52c41a';
      case 'INFO': return '#1890ff';
      default: return theme === 'dark' ? '#ffffff' : '#000000';
    }
  };

  // Get log level icon
  const getLogIcon = (level) => {
    switch (level?.toUpperCase()) {
      case 'ERROR': return '❌';
      case 'WARN': return '⚠️';
      case 'DEBUG': return '🐛';
      case 'INFO': return 'ℹ️';
      default: return '📝';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp || timestamp === 'Unknown') return 'Unknown';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>Marketplace Logs</span>
          {marketplace && (
            <Tag color="blue">{marketplace.toUpperCase()}</Tag>
          )}
          {user && (
            <Tag color="green">{user}</Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>
      ]}
      style={{ top: 20 }}
    >
      <div style={{ maxHeight: '70vh', overflow: 'hidden' }}>
        <Card 
          size="small"
          style={{ marginBottom: '16px' }}
        >
          <Row gutter={[16, 8]} align="middle">
            <Col flex="auto">
              <Space>
                <Text strong>Lines:</Text>
                <InputNumber
                  min={10}
                  max={200}
                  value={logLines}
                  onChange={setLogLines}
                  size="small"
                  style={{ width: 80 }}
                />
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchLogs}
                  loading={loading}
                  size="small"
                >
                  Refresh
                </Button>
                {streaming ? (
                  <Button
                    icon={<PauseCircleOutlined />}
                    onClick={stopAutoRefresh}
                    type="primary"
                    size="small"
                  >
                    Stop Auto-Refresh
                  </Button>
                ) : (
                  <Button
                    icon={<PlayCircleOutlined />}
                    onClick={startAutoRefresh}
                    size="small"
                  >
                    Auto-Refresh
                  </Button>
                )}
              </Space>
            </Col>
            <Col>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {logs.length} entries
              </Text>
            </Col>
          </Row>
        </Card>

        <Card 
          title={
            <Space>
              <EyeOutlined />
              <span>Log Entries</span>
              {loading && <Spin size="small" />}
            </Space>
          }
          size="small"
        >
          {error ? (
            <Alert
              message="Error Loading Logs"
              description={error}
              type="error"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          ) : logs.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: theme === 'dark' ? '#888888' : '#666666',
              padding: '40px'
            }}>
              <FileTextOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
              <div>No logs found</div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>
                Log file: JobGetOrder/User_{user}/{marketplace?.toUpperCase()}/{marketplace?.toLowerCase()}_app.log
              </div>
            </div>
          ) : (
            <div 
              ref={logContainerRef}
              style={{ 
                maxHeight: '400px', 
                overflowY: 'auto',
                padding: '8px',
                backgroundColor: theme === 'dark' ? '#1f1f1f' : '#fafafa',
                borderRadius: '4px',
                border: '1px solid #d9d9d9'
              }}
            >
              {logs.map((log, index) => (
                <div 
                  key={log.id || index}
                  style={{
                    marginBottom: '8px',
                    padding: '4px',
                    borderLeft: `3px solid ${getLogColor(log.level)}`,
                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    borderRadius: '2px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ 
                      marginRight: '8px', 
                      fontSize: '12px',
                      color: getLogColor(log.level)
                    }}>
                      {getLogIcon(log.level)}
                    </span>
                    <span style={{ 
                      color: getLogColor(log.level),
                      fontSize: '11px',
                      fontWeight: 'bold',
                      marginRight: '8px'
                    }}>
                      {log.level}
                    </span>
                    <span style={{ 
                      color: theme === 'dark' ? '#888888' : '#666666',
                      fontSize: '10px',
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                    }}>
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span style={{ 
                      color: '#1890ff',
                      fontSize: '9px',
                      marginLeft: '8px',
                      fontWeight: 'bold'
                    }}>
                      {log.marketplace} - {log.user}
                    </span>
                  </div>
                  <div style={{ 
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                    marginLeft: '20px',
                    wordBreak: 'break-word'
                  }}>
                    {log.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Modal>
  );
};

export default MarketplaceLogModal;