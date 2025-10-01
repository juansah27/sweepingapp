import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Progress, Steps, Typography, Space, Tag, Button, Alert } from 'antd';
import { 
  UploadOutlined, 
  CheckCircleOutlined, 
  LoadingOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  SyncOutlined,
  FileTextOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Step } = Steps;

// WebSocket connection hook
const useWebSocket = (url, onMessage, onError) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!url) return;

    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) onError(error);
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [url, onMessage, onError]);

  const sendMessage = useCallback((message) => {
    if (socket && connected) {
      socket.send(JSON.stringify(message));
    }
  }, [socket, connected]);

  return { socket, connected, sendMessage };
};

// Real-time progress component
const RealtimeProgress = ({ 
  taskId, 
  onComplete, 
  onError,
  showDetails = true,
  compact = false 
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState('processing');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    processedOrders: 0,
    interfaceOrders: 0,
    notInterfaceOrders: 0,
    errors: 0
  });
  const [startTime, setStartTime] = useState(Date.now());
  const [estimatedTime, setEstimatedTime] = useState(null);

  // WebSocket URL
  const wsUrl = useMemo(() => {
    if (!taskId) return null;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/upload-progress/${taskId}`;
  }, [taskId]);

  // Handle WebSocket messages
  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'progress':
        setProgress(data.progress);
        setCurrentStep(data.step);
        setStats(prev => ({ ...prev, ...data.stats }));
        break;
      
      case 'log':
        setLogs(prev => [...prev, {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          level: data.level,
          message: data.message
        }]);
        break;
      
      case 'complete':
        setStatus('completed');
        setProgress(100);
        setCurrentStep(5);
        if (onComplete) onComplete(data.result);
        break;
      
      case 'error':
        setStatus('error');
        if (onError) onError(data.error);
        break;
      
      case 'stats':
        setStats(prev => ({ ...prev, ...data.stats }));
        break;
    }
  }, [onComplete, onError]);

  // Handle WebSocket errors
  const handleError = useCallback((error) => {
    console.error('WebSocket error:', error);
    setStatus('error');
  }, []);

  // WebSocket connection
  const { connected, sendMessage } = useWebSocket(wsUrl, handleMessage, handleError);

  // Calculate estimated time
  useEffect(() => {
    if (progress > 0 && progress < 100) {
      const elapsed = Date.now() - startTime;
      const estimated = (elapsed / progress) * (100 - progress);
      setEstimatedTime(Math.round(estimated / 1000));
    }
  }, [progress, startTime]);

  // Step configuration
  const steps = useMemo(() => [
    {
      title: 'Upload',
      icon: <UploadOutlined />,
      description: 'Uploading file to server'
    },
    {
      title: 'Validation',
      icon: <FileTextOutlined />,
      description: 'Validating file format and data'
    },
    {
      title: 'Processing',
      icon: <SyncOutlined />,
      description: 'Processing orders and checking duplicates'
    },
    {
      title: 'Database',
      icon: <DatabaseOutlined />,
      description: 'Saving to database and interface check'
    },
    {
      title: 'Get Order',
      icon: <CheckCircleOutlined />,
      description: 'Generating order files'
    },
    {
      title: 'Complete',
      icon: <CheckCircleOutlined />,
      description: 'Upload completed successfully'
    }
  ], []);

  // Get step status
  const getStepStatus = useCallback((stepIndex) => {
    if (stepIndex < currentStep) return 'finish';
    if (stepIndex === currentStep) return 'process';
    return 'wait';
  }, [currentStep]);

  // Get status color
  const getStatusColor = useCallback(() => {
    switch (status) {
      case 'completed': return 'success';
      case 'error': return 'error';
      case 'processing': return 'processing';
      default: return 'default';
    }
  }, [status]);

  // Get status icon
  const getStatusIcon = useCallback(() => {
    switch (status) {
      case 'completed': return <CheckCircleOutlined />;
      case 'error': return <ExclamationCircleOutlined />;
      case 'processing': return <LoadingOutlined />;
      default: return <ClockCircleOutlined />;
    }
  }, [status]);

  if (compact) {
    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Progress 
              percent={progress} 
              status={getStatusColor()}
              size="small"
              showInfo={false}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {progress}% - {steps[currentStep]?.title || 'Processing...'}
            </Text>
          </div>
          <Tag color={getStatusColor()} icon={getStatusIcon()}>
            {status}
          </Tag>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LoadingOutlined spin={status === 'processing'} />
          <span>Upload Progress</span>
          <Tag color={getStatusColor()} icon={getStatusIcon()}>
            {status}
          </Tag>
          {connected && <Tag color="green">Connected</Tag>}
        </div>
      }
      style={{ marginBottom: 16 }}
    >
      {/* Progress Bar */}
      <div style={{ marginBottom: 24 }}>
        <Progress 
          percent={progress} 
          status={getStatusColor()}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <Text type="secondary">
            {stats.processedOrders} of {stats.totalOrders} orders processed
          </Text>
          {estimatedTime && (
            <Text type="secondary">
              Estimated time remaining: {estimatedTime}s
            </Text>
          )}
        </div>
      </div>

      {/* Steps */}
      <Steps 
        current={currentStep} 
        size="small"
        style={{ marginBottom: 24 }}
      >
        {steps.map((step, index) => (
          <Step
            key={index}
            title={step.title}
            icon={step.icon}
            status={getStepStatus(index)}
            description={step.description}
          />
        ))}
      </Steps>

      {/* Statistics */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>Statistics</Title>
        <Space wrap>
          <Tag color="blue">Total: {stats.totalOrders}</Tag>
          <Tag color="green">Processed: {stats.processedOrders}</Tag>
          <Tag color="green">Interface: {stats.interfaceOrders}</Tag>
          <Tag color="orange">Not Interface: {stats.notInterfaceOrders}</Tag>
          {stats.errors > 0 && <Tag color="red">Errors: {stats.errors}</Tag>}
        </Space>
      </div>

      {/* Real-time Logs */}
      {showDetails && logs.length > 0 && (
        <div>
          <Title level={5}>Real-time Logs</Title>
          <div style={{ 
            maxHeight: 200, 
            overflowY: 'auto', 
            backgroundColor: '#f5f5f5', 
            padding: 12, 
            borderRadius: 6,
            fontFamily: 'monospace',
            fontSize: 12
          }}>
            {logs.slice(-20).map((log) => (
              <div key={log.id} style={{ marginBottom: 4 }}>
                <span style={{ color: '#999' }}>[{log.timestamp}]</span>
                <span style={{ 
                  color: log.level === 'error' ? '#ff4d4f' : 
                        log.level === 'warning' ? '#faad14' : '#52c41a',
                  marginLeft: 8
                }}>
                  [{log.level.toUpperCase()}]
                </span>
                <span style={{ marginLeft: 8 }}>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Status */}
      {!connected && (
        <Alert
          message="Connection Lost"
          description="Real-time updates are not available. The upload is still processing in the background."
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};

export default RealtimeProgress;
