import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Button, 
  Typography, 
  Card, 
  Row, 
  Col,
  Alert,
  Space,
  Tag,
  Progress,
  App,
  Divider,
  Statistic,
  Timeline,
  Modal,
  Spin,
  Steps,
  Table,
  Checkbox,
  Popover
} from 'antd';

import { 
  FileExcelOutlined, 
  UploadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  CopyOutlined
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axios';
import MarketplaceLogModal from './MarketplaceLogModal';

const { Step } = Steps;
const { Title, Text } = Typography;
const { Dragger } = Upload;

const UploadNew = () => {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const { message, notification } = App.useApp();
  
  // Core states
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [uploadResult, setUploadResult] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [taskId, setTaskId] = useState(null);
  
  // UI states
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  // Modal states
  const [marketplaceLogModalVisible, setMarketplaceLogModalVisible] = useState(false);
  const [selectedMarketplace, setSelectedMarketplace] = useState(null);
  const [interfaceDetailModalVisible, setInterfaceDetailModalVisible] = useState(false);
  const [notInterfaceDetailModalVisible, setNotInterfaceDetailModalVisible] = useState(false);
  
  // Copy states
  const [selectedColumns, setSelectedColumns] = useState({
    interface: ['marketplace', 'brand', 'order_number', 'awb', 'order_status', 'interface_status'],
    notInterface: ['marketplace', 'brand', 'order_number', 'awb', 'order_status', 'interface_status']
  });
  
  // Popover visibility states
  const [interfacePopoverVisible, setInterfacePopoverVisible] = useState(false);
  const [notInterfacePopoverVisible, setNotInterfacePopoverVisible] = useState(false);
  
  // Monitoring
  const [monitoring, setMonitoring] = useState(false);
  const intervalRef = useRef(null);
  
  // Marketplace apps status
  const [marketplaceAppsEnabled, setMarketplaceAppsEnabled] = useState(true);

  // Fallback method for copying to clipboard (works without HTTPS)
  const copyToClipboardFallback = (text, type, columnCount) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        message.success(`Copied ${type} data (${columnCount} columns) to clipboard!`);
      } else {
        message.error('Failed to copy data. Please try again.');
      }
    } catch (err) {
      message.error('Copy not supported in this browser');
    }
    
    document.body.removeChild(textArea);
  };

  // Enhanced copy data function with column selection
  const copyAllData = (data, type, columnsToCopy = null) => {
    if (!data || data.length === 0) {
      message.warning('No data to copy');
      return;
    }

    // Column mapping configuration
    const columnMapping = {
      marketplace: 'Marketplace',
      brand: 'Brand', 
      order_number: 'Order Number',
      awb: 'AWB/Tracking',
      order_status: 'Order Status',
      interface_status: 'Interface Status'
    };

    // Use provided columns or default to all columns for this type
    const modalType = type === 'Interface' ? 'interface' : 'notInterface';
    const activeColumns = columnsToCopy || selectedColumns[modalType];

    // Create headers array based on selected columns
    const headers = activeColumns.map(col => columnMapping[col] || col);
    
    // Create CSV-like format
    const csvContent = [
      headers.join('\t'),
      ...data.map(row => 
        activeColumns.map(col => row[col] || '').join('\t')
      )
    ].join('\n');

    // Try modern clipboard API first, fallback to textarea method
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(csvContent).then(() => {
        const columnCount = activeColumns.length;
        message.success(`Copied ${type} data (${columnCount} columns) to clipboard!`);
      }).catch(() => {
        copyToClipboardFallback(csvContent, type, activeColumns.length);
      });
    } else {
      copyToClipboardFallback(csvContent, type, activeColumns.length);
    }
  };

  // Copy selected columns only
  const copySelectedColumns = (data, type) => {
    const modalType = type === 'Interface' ? 'interface' : 'notInterface';
    const activeColumns = selectedColumns[modalType];
    
    // Debug log to check if columns are selected
    console.log('Copy attempt:', { type, modalType, activeColumns, dataLength: data?.length });
    
    if (!activeColumns || activeColumns.length === 0) {
      message.warning('Please select at least one column to copy');
      return;
    }
    
    // Close the popover after copying
    if (type === 'Interface') {
      setInterfacePopoverVisible(false);
    } else {
      setNotInterfacePopoverVisible(false);
    }
    
    copyAllData(data, type, activeColumns);
  };

  // Handle column selection toggle
  const handleColumnSelection = (column, modalType) => {
    setSelectedColumns(prev => ({
      ...prev,
      [modalType]: prev[modalType].includes(column)
        ? prev[modalType].filter(c => c !== column)
        : [...prev[modalType], column]
    }));
  };

  // All column options for checkboxes
  const columnOptions = [
    { key: 'marketplace', label: 'Marketplace' },
    { key: 'brand', label: 'Brand' },
    { key: 'order_number', label: 'Order Number' },
    { key: 'awb', label: 'AWB/Tracking' },
    { key: 'order_status', label: 'Order Status' },
    { key: 'interface_status', label: 'Interface Status' }
  ];

  // Cleanup on unmount and check marketplace apps status
  useEffect(() => {
    checkMarketplaceAppsStatus();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Parse filename to extract brand, marketplace, batch
  const parseFilename = (filename) => {
    if (!filename) return null;
    
    const parts = filename.replace(/\.(xlsx|csv)$/i, '').split('-');
    
    // Handle format: BRAND-MARKETPLACE-DATE-BATCH 
    if (parts.length >= 4) {
      return {
        brand: parts[0],
        salesChannel: parts[1],
        batch: parts[3], // BATCH is 4th element (index 3)
        date: parts[2]   // DATE is 3rd element (index 2)
      };
    }
    
    // Handle format: BRAND-MARKETPLACE-BATCH
    if (parts.length >= 3) {
      return {
        brand: parts[0],
        salesChannel: parts[1], 
        batch: parts[2], // BATCH is 3rd element (index 2)
        date: '1' // Default date for simplified format
      };
    }
    
    return null;
  };

  // Check task status
  const checkTaskStatus = async (taskId) => {
    try {
      const response = await api.get(`/api/upload-status/${taskId}`);
      const status = response.data;
      
      // Debug logging for failed status
      if (status.status === 'failed') {
        console.log('Failed upload status received:', status);
        console.log('ErrorMessage:', status.error_message);
        console.log('Logs:', status.logs);
      }
      
      setTaskStatus(status);
      
      // Update progress based on status
      if (status.status === 'completed') {
        // Force immediate progress completion on completed status
        setProgress(100);
        setCurrentStep(4);
        setUploading(false); // Stop uploading state when completed
        setMonitoring(false);
        setFileList([]); // Clear file list to prevent duplicate uploads
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        
        // Show notification that file was cleared
        notification.success({
          message: 'Upload Completed',
          description: 'File has been processed and cleared to prevent duplicate uploads.',
          duration: 3,
        });

        // Dispatch upload completed event for dashboard refresh
        const event = new CustomEvent('uploadCompleted', {
          detail: {
            taskId: taskId,
            status: 'completed',
            brand: uploadResult?.brand,
            marketplace: uploadResult?.marketplace,
            batch: uploadResult?.batch
          }
        });
        window.dispatchEvent(event);
      } else if (status.status === 'failed') {
        setProgress(0);
        setCurrentStep(0);
        setMonitoring(false); // Stop monitoring but keep uploading state to show error details
        setFileList([]); // Clear file list to prevent duplicate uploads
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        
        // Show notification that file was cleared
        notification.warning({
          message: 'Upload Failed',
          description: 'File has been cleared. Please check the logs and try again.',
          duration: 4,
        });
        
        // Keep modal open - user must manually close with Close button
      } else if (status.status === 'processing') {
        // Check if we're in the final processing stage by looking for specific logs or stats
        const progressValue = status.progress || 75;
        setProgress(Math.min(progressValue, 95)); // Cap at 95% until actually completed
        setCurrentStep(3);
      }
      
      return status;
    } catch (error) {
      return null;
    }
  };

  // Start monitoring
  const startMonitoring = (taskId) => {
    setMonitoring(true);
    setCurrentStep(2);
    setProgress(50);
    
    intervalRef.current = setInterval(async () => {
      const status = await checkTaskStatus(taskId);
      if (status && status.status === 'completed') {
        // Ensure immediate UI update on completion
        setProgress(100);
        setCurrentStep(4);
        setMonitoring(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      } else if (status && status.status === 'failed') {
        setMonitoring(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      } else if (status && status.status === 'processing') {
        // During processing, enhance progress showing based on task metadata
        const processingProgress = status.progress || 75;
        if (processingProgress >= 75 && processingProgress < 99) {
          setProgress(Math.min(processingProgress, 95)); // Move up but cap at 95% until completion
        }
      }
    }, 1000); // Reduce interval to 1 second for faster response
  };

  // Handle file upload
  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('Please select a file to upload');
      return;
    }

    const file = fileList[0];
    const filenameInfo = parseFilename(file.name);
    
    if (!filenameInfo) {
      message.error('Invalid filename format. Expected: BRAND-MARKETPLACE-BATCH.xlsx');
      return;
    }

    setUploading(true);
    setCurrentStep(1);
    setProgress(25);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/upload-background', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const responseData = response.data;
      setTaskId(responseData.task_id);
      setUploadResult({
        success: true,
        message: responseData.message,
        brand: responseData.brand,
        batch: responseData.batch,
        marketplace: responseData.marketplace || filenameInfo.salesChannel,
        pic: responseData.pic,
        taskId: responseData.task_id
      });

      message.success('Upload started successfully!');
      // Keep uploading state true until task is completed
      startMonitoring(responseData.task_id);

    } catch (error) {
      message.error(error.response?.data?.detail || 'Upload failed');
      setUploading(false);
      setCurrentStep(0);
      setProgress(0);
    }
  };

  // Reset upload
  const resetUpload = () => {
    setUploading(false);
    setFileList([]);
    setUploadResult(null);
    setTaskStatus(null);
    setTaskId(null);
    setCurrentStep(0);
    setProgress(0);
    setMonitoring(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  // Check marketplace apps status
  const checkMarketplaceAppsStatus = async () => {
    try {
      const response = await api.get('/check-auto-run-status');
      setMarketplaceAppsEnabled(response.data.marketplace_apps_enabled || false);
    } catch (error) {
      console.error('Error checking marketplace apps status:', error);
      setMarketplaceAppsEnabled(false);
    }
  };

  // Open marketplace logs
  const openMarketplaceLogs = (marketplace) => {
    if (!marketplaceAppsEnabled) {
      message.warning('Marketplace apps are disabled');
      return;
    }
    setSelectedMarketplace(marketplace);
    setMarketplaceLogModalVisible(true);
  };

  // Upload props
  const uploadProps = {
    name: 'file',
    multiple: false,
    fileList,
    beforeUpload: (file) => {
      const isValidType = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                         file.type === 'text/csv';
      if (!isValidType) {
        message.error('You can only upload Excel (.xlsx) or CSV files!');
        return false;
      }
      
      const isValidSize = file.size / 1024 / 1024 < 10; // 10MB limit
      if (!isValidSize) {
        message.error('File must be smaller than 10MB!');
        return false;
      }
      
      setFileList([file]);
      return false; // Prevent auto upload
    },
    onRemove: () => {
      setFileList([]);
    },
    onDrop: (e) => {
      setDragActive(false);
    },
    onDragEnter: () => {
      setDragActive(true);
    },
    onDragLeave: () => {
      setDragActive(false);
    }
  };

  // Steps configuration
  const steps = [
    { title: 'Select File', icon: <FileExcelOutlined />, status: 'wait' },
    { title: 'Upload', icon: <UploadOutlined />, status: 'wait' },
    { title: 'Processing', icon: <ClockCircleOutlined />, status: 'wait' },
    { title: 'Validating', icon: <CheckCircleOutlined />, status: 'wait' },
    { title: 'Complete', icon: <CheckCircleOutlined />, status: 'wait' }
  ];

  // Update step status
  const getStepStatus = (index) => {
    if (index < currentStep) return 'finish';
    if (index === currentStep) return 'process';
    return 'wait';
  };

  // Show upload progress overlay when uploading
  if (uploading) {
    const isFailed = taskStatus?.status === 'failed';
    
    // Debug logging for upload modal
    if (taskStatus) {
      console.log('Upload modal debugging:', {
        status: taskStatus.status,
        isFailed,
        hasError: !!taskStatus.error_message,
        hasLogs: taskStatus.logs?.length > 0,
        logCount: taskStatus.logs?.length || 0,
        taskStatusObject: taskStatus
      });
    }
    
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(255, 255, 255, 0.9)', 
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {!isFailed ? <Spin size="large" /> : <ExclamationCircleOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />}
          <Text style={{ marginTop: 16, fontSize: 16, fontWeight: 'bold', color: isFailed ? '#ff4d4f' : '#000' }}>
            {isFailed ? 'Upload Failed' : 'Processing Upload...'}
          </Text>
          <Text style={{ marginTop: 8, color: '#666', marginBottom: 16 }}>
            {isFailed ? (taskStatus?.error_message || 'Please check file format and try again.') : 'Please wait while we process your file'}
          </Text>
          
          {/* Show detailed error info if available in failed state */}
          {(() => {
            const shouldShowErrors = isFailed && (taskStatus?.logs?.length > 0 || taskStatus?.error_message);
            console.log('Error display check:', { 
              isFailed, 
              hasLogs: !!taskStatus?.logs?.length, 
              hasErrorMsg: !!taskStatus?.error_message, 
              shouldShow: shouldShowErrors,
              taskStatusForDebug: taskStatus
            });
            return shouldShowErrors;
          })() && (
            <div style={{ 
              marginTop: 16, 
              maxWidth: 600, 
              maxHeight: 300, 
              overflowY: 'auto',
              border: '1px solid #ff4d4f',
              backgroundColor: '#fff2f0',
              padding: '12px',
              borderRadius: 6
            }}>
              <Text style={{ color: '#ff4d4f', fontWeight: 'bold', fontSize: 14 }}>
                📋 Error Details:
              </Text>
              <div style={{ marginTop: 8 }}>
                {taskStatus.logs && taskStatus.logs.length > 0 ? (
                  (() => {
                    console.log('Processing logs:', taskStatus.logs);
                    const errorLogs = taskStatus.logs.filter(log => log.level === 'error');
                    console.log('Filtered error logs:', errorLogs);
                    
                    if (errorLogs.length > 0) {
                      return errorLogs.slice(0, 5).map((log, index) => (
                        <Text key={index} style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                          • {log.message}
                        </Text>
                      ));
                    } else {
                      // Show first few logs if no error level logs found
                      console.log('No error level logs found, showing first few logs');
                      return taskStatus.logs.slice(0, 3).map((log, index) => (
                        <Text key={index} style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                          • {log.message}
                        </Text>
                      ));
                    }
                  })()
                ) : taskStatus.error_message ? (
                  <Text style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                    • {taskStatus.error_message}
                  </Text>
                ) : (
                  <Text style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                    • No specific error details available
                  </Text>
                )}
              </div>
            </div>
          )}
          {taskId && (
            <Text style={{ marginBottom: 16, color: '#1890ff', fontSize: 12 }}>
              Task ID: {taskId}
            </Text>
          )}
          <Progress 
            percent={progress} 
            status={isFailed ? 'exception' : (progress === 100 ? 'success' : 'active')}
            style={{ width: 300 }}
            strokeColor={isFailed ? 'red' : {
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
          <Text style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
            {progress < 20 && !isFailed && 'Initializing upload...'}
            {progress >= 20 && progress < 40 && !isFailed && 'Uploading file...'}
            {progress >= 40 && progress < 70 && !isFailed && 'Processing data...'}
            {progress >= 70 && progress < 90 && !isFailed && 'Validating orders...'}
            {progress >= 90 && progress < 100 && !isFailed && 'Finalizing...'}
            {progress === 100 && !isFailed && 'Upload completed!'}
            {isFailed && 'Upload processing failed - please try again'}
          </Text>
          
          {/* Steps Timeline in overlay */}
          {!isFailed && (
            <div style={{ marginTop: 24, width: 'max(600px, 80vw)', maxWidth: 800 }}>
              <Steps 
                current={currentStep} 
                size="small"
                direction="horizontal"
                style={{ minWidth: '100%' }}
              >
                {steps.map((step, index) => (
                  <Step
                    key={index}
                    title={<span style={{ whiteSpace: 'nowrap', minWidth: 'fit-content' }}>{step.title}</span>}
                    icon={step.icon}
                    status={getStepStatus(index)}
                    description={step.status === 'process' ? 'In Progress...' : ''}
                  />
                ))}
              </Steps>
            </div>
          )}
          
          {/* Show close button if failed */}
          {isFailed && (
            <Button 
              type="primary" 
              danger 
              style={{ marginTop: 16 }}
              onClick={() => {
                resetUpload();
              }}
            >
              Close
            </Button>
          )}
        </div>
        {/* Render the upload content behind the overlay */}
        <div style={{ opacity: 0.3 }}>
          {/* Upload content will be rendered here but dimmed */}
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: theme === 'dark' ? '#141414' : '#f5f5f5',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {!marketplaceAppsEnabled && (
          <Alert
            message="Marketplace Apps Disabled"
            description="Marketplace apps are currently disabled. You can still upload and process orders, but marketplace logs and auto-run functionality are not available."
            type="info"
            showIcon
            style={{ marginBottom: '24px' }}
          />
        )}

        {/* Upload Guidelines Section */}
        <Row style={{ marginBottom: '24px' }}>
          <Col span={24}>
            <Card 
              title={
                <Space>
                  <InfoCircleOutlined />
                  <span>Upload Guidelines</span>
                </Space>
              }
              style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <div style={{ textAlign: 'center' }}>
                    <FileExcelOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '8px' }} />
                    <Title level={5}>File Format</Title>
                    <Text type="secondary">
                      Upload Excel (.xlsx) or CSV files with proper naming convention
                    </Text>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div style={{ textAlign: 'center' }}>
                    <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a', marginBottom: '8px' }} />
                    <Title level={5}>Naming Convention</Title>
                    <Text type="secondary">
                      Use format: BRAND-MARKETPLACE-DATE-BATCH.xlsx (e.g., CETAPHIL-SHOPEE-28-3.xlsx)
                    </Text>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div style={{ textAlign: 'center' }}>
                    <EyeOutlined style={{ fontSize: '32px', color: '#722ed1', marginBottom: '8px' }} />
                    <Title level={5}>Real-time Monitoring</Title>
                    <Text type="secondary">
                      Monitor upload progress{marketplaceAppsEnabled ? ' and view marketplace logs' : ''} in real-time
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]}>
          
          {/* Upload Section */}
          <Col xs={24} lg={16}>
            <Card 
              title={
                <Space>
                  <UploadOutlined />
                  <span>File Upload</span>
                </Space>
              }
              style={{ 
                height: '100%',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              
              {/* File Drop Zone */}
              <Dragger 
                {...uploadProps}
                style={{
                  background: dragActive 
                    ? (theme === 'dark' ? '#1f1f1f' : '#f0f9ff')
                    : (theme === 'dark' ? '#262626' : '#fafafa'),
                  border: `2px dashed ${dragActive ? '#1890ff' : '#d9d9d9'}`,
                  borderRadius: '8px',
                  padding: '40px 20px',
                  marginBottom: '24px'
                }}
              >
                <p className="ant-upload-drag-icon">
                  <FileExcelOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                </p>
                <p className="ant-upload-text" style={{ 
                  fontSize: '16px',
                  color: theme === 'dark' ? '#fff' : '#000'
                }}>
                  Click or drag file to this area to upload
                </p>
                <p className="ant-upload-hint" style={{ 
                  color: theme === 'dark' ? '#ccc' : '#666'
                }}>
                  Support for Excel (.xlsx) and CSV files. Max size: 10MB
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    File will be automatically cleared after upload to prevent duplicates
                  </Text>
                </p>
              </Dragger>

              {/* File Info */}
              {fileList.length > 0 && (
                <Card size="small" style={{ marginBottom: '24px' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <FileExcelOutlined style={{ color: '#52c41a' }} />
                        <Text strong>{fileList[0].name}</Text>
                      </Space>
                      <Text type="secondary">
                        {(fileList[0].size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </div>
                    
                    {(() => {
                      const info = parseFilename(fileList[0].name);
                      return info ? (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <Tag color="blue">Brand: {info.brand}</Tag>
                          <Tag color="green">Marketplace: {info.salesChannel}</Tag>
                          {info.date && info.date !== '1' && (
                            <Tag color="purple">Date: {info.date}</Tag>
                          )}
                          <Tag color="orange">Batch: {info.batch}</Tag>
                        </div>
                      ) : (
                        <Alert 
                          message="Invalid filename format" 
                          description="Expected: BRAND-MARKETPLACE-DATE-BATCH.xlsx or BRAND-MARKETPLACE-BATCH.xlsx"
                          type="warning" 
                          showIcon 
                        />
                      );
                    })()}
                  </Space>
                </Card>
              )}

              {/* Upload Button */}
              <div style={{ textAlign: 'center' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<UploadOutlined />}
                  onClick={() => {
                    handleUpload();
                  }}
                  loading={uploading}
                  disabled={fileList.length === 0}
                  style={{
                    height: '48px',
                    padding: '0 32px',
                    fontSize: '16px',
                    borderRadius: '8px'
                  }}
                >
                  {uploading ? (monitoring ? 'Processing...' : 'Uploading...') : 'Start Upload'}
                </Button>
              </div>
            </Card>
          </Col>

          {/* Progress Section */}
          <Col xs={24} lg={8}>
            <Card 
              title={
                <Space>
                  <ClockCircleOutlined />
                  <span>Progress</span>
                </Space>
              }
              style={{ 
                height: '100%',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              
              {/* Progress Bar */}
              <div style={{ marginBottom: '24px' }}>
                <Progress 
                  percent={progress} 
                  status={taskStatus?.status === 'failed' ? 'exception' : 'active'}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </div>

              {/* Steps Timeline */}
              <Timeline
                items={steps.map((step, index) => ({
                  dot: step.icon,
                  children: (
                    <div>
                      <Text strong={index <= currentStep} style={{
                        color: index <= currentStep ? '#1890ff' : '#999'
                      }}>
                        {step.title}
                      </Text>
                    </div>
                  )
                }))}
              />

              {/* Status Info */}
              {taskStatus && (
                <div style={{ marginTop: '24px' }}>
                  <Divider />
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>Status:</Text>
                      <Tag color={
                        taskStatus.status === 'completed' ? 'green' :
                        taskStatus.status === 'failed' ? 'red' :
                        taskStatus.status === 'processing' ? 'blue' : 'default'
                      }>
                        {taskStatus.status?.toUpperCase()}
                      </Tag>
                    </div>
                    
                    {taskStatus.total_orders && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Orders:</Text>
                        <Text strong>{taskStatus.total_orders}</Text>
                      </div>
                    )}
                    
                    {taskStatus.interface_count !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Interface:</Text>
                        <Text strong style={{ color: '#52c41a' }}>{taskStatus.interface_count}</Text>
                      </div>
                    )}
                    
                    {taskStatus.not_interface_count !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Not Interface:</Text>
                        <Text strong style={{ color: '#ff4d4f' }}>{taskStatus.not_interface_count}</Text>
                      </div>
                    )}
                    
                    {taskStatus.processing_time && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Time:</Text>
                        <Text>{taskStatus.processing_time}</Text>
                      </div>
                    )}
                  </Space>
                </div>
              )}

              {/* Action Buttons */}
              {uploadResult && (
                <div style={{ marginTop: '24px' }}>
                  <Divider />
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {marketplaceAppsEnabled && (
                      <Button
                        type="primary"
                        icon={<FileTextOutlined />}
                        onClick={() => openMarketplaceLogs(uploadResult.marketplace)}
                        block
                        style={{ marginBottom: '8px' }}
                      >
                        View {uploadResult.marketplace} Logs
                      </Button>
                    )}
                    
                    <Button
                      onClick={resetUpload}
                      block
                    >
                      Upload New File
                    </Button>
                  </Space>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Results Section */}
        {uploadResult && (
          <Row style={{ marginTop: '24px' }}>
            <Col span={24}>
              <Card 
                title={
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>Upload Results</span>
                  </Space>
                }
                style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={6}>
                    <Statistic
                      title="Brand"
                      value={uploadResult.brand}
                      prefix={<Tag color="blue" />}
                    />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Statistic
                      title="Marketplace"
                      value={uploadResult.marketplace}
                      prefix={<Tag color="green" />}
                    />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Statistic
                      title="Batch"
                      value={uploadResult.batch}
                      prefix={<Tag color="orange" />}
                    />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Statistic
                      title="Total Orders"
                      value={taskStatus?.total_orders || 0}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                </Row>
                
                {/* Interface Status Row */}
                {taskStatus?.interface_count !== undefined && (
                  <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                    <Col xs={24} sm={12}>
                      <Card 
                        size="small" 
                        hoverable
                        onClick={() => setInterfaceDetailModalVisible(true)}
                        style={{ 
                          textAlign: 'center', 
                          background: theme === 'dark' ? '#1f1f1f' : '#f6ffed',
                          border: '1px solid #52c41a',
                          cursor: 'pointer'
                        }}
                      >
                        <Statistic
                          title="Interface"
                          value={taskStatus.interface_count}
                          valueStyle={{ color: '#52c41a', fontSize: '24px' }}
                          prefix={<CheckCircleOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Card 
                        size="small" 
                        hoverable
                        onClick={() => setNotInterfaceDetailModalVisible(true)}
                        style={{ 
                          textAlign: 'center', 
                          background: theme === 'dark' ? '#1f1f1f' : '#fff2f0',
                          border: '1px solid #ff4d4f',
                          cursor: 'pointer'
                        }}
                      >
                        <Statistic
                          title="Not Interface"
                          value={taskStatus.not_interface_count}
                          valueStyle={{ color: '#ff4d4f', fontSize: '24px' }}
                          prefix={<ExclamationCircleOutlined />}
                        />
                      </Card>
                    </Col>
                  </Row>
                )}
              </Card>
            </Col>
          </Row>
        )}

      </div>

      {/* Marketplace Log Modal */}
      <MarketplaceLogModal
        visible={marketplaceLogModalVisible}
        onClose={() => setMarketplaceLogModalVisible(false)}
        marketplace={selectedMarketplace}
        user={uploadResult?.pic || currentUser?.username || 'admin'}
      />

      {/* Interface Detail Modal */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>Interface Orders Details</span>
          </Space>
        }
        open={interfaceDetailModalVisible}
        onCancel={() => setInterfaceDetailModalVisible(false)}
        footer={[
          <Popover
            key="copy-select-interface"
            content={
              <div style={{ padding: '8px' }}>
                <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Select Columns to Copy:</div>
                <Checkbox.Group
                  value={selectedColumns.interface}
                  onChange={(checkedValues) => {
                    setSelectedColumns(prev => ({ ...prev, interface: checkedValues }));
                  }}
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  {columnOptions.map(option => (
                    <Checkbox key={option.key} value={option.key}>
                      {option.label}
                    </Checkbox>
                  ))}
                </Checkbox.Group>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <Button 
                    size="small" 
                    onClick={() => 
                      setSelectedColumns(prev => ({ 
                        ...prev, 
                        interface: columnOptions.map(o => o.key) 
                      }))
                    }
                  >
                    Select All
                  </Button>
                  <Button 
                    size="small"
                    onClick={() => 
                      setSelectedColumns(prev => ({ ...prev, interface: [] }))
                    }
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            }
            open={interfacePopoverVisible}
            onOpenChange={setInterfacePopoverVisible}
            trigger="click"
            placement="topRight"
          >
            <Button 
              icon={<CopyOutlined />}
              onClick={() => copySelectedColumns(taskStatus?.interface_orders, 'Interface')}
              type="primary"
            >
              Copy Data
            </Button>
          </Popover>,
          <Button key="close" onClick={() => setInterfaceDetailModalVisible(false)}>
            Close
          </Button>
        ]}
        width={1200}
        style={{ top: 20 }}
      >
        <Table
          dataSource={taskStatus?.interface_orders || []}
          columns={[
            {
              title: 'Marketplace',
              dataIndex: 'marketplace',
              key: 'marketplace',
              width: 120,
              render: (text) => (
                <div 
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigator.clipboard.writeText(text)}
                  title="Click to copy"
                >
                  {text}
                </div>
              ),
            },
            {
              title: 'Brand',
              dataIndex: 'brand',
              key: 'brand',
              width: 120,
              render: (text) => (
                <div 
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigator.clipboard.writeText(text)}
                  title="Click to copy"
                >
                  {text}
                </div>
              ),
            },
            {
              title: 'Order Number',
              dataIndex: 'order_number',
              key: 'order_number',
              width: 150,
              render: (text) => (
                <div 
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigator.clipboard.writeText(text)}
                  title="Click to copy"
                >
                  {text}
                </div>
              ),
            },
            {
              title: 'AWB/Tracking',
              dataIndex: 'awb',
              key: 'awb',
              width: 150,
              render: (awb) => (
                <div 
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigator.clipboard.writeText(awb || '')}
                  title="Click to copy"
                >
                  {awb ? (
                    <Tag color="blue">{awb}</Tag>
                  ) : (
                    <Tag color="default">-</Tag>
                  )}
                </div>
              ),
            },
            {
              title: 'Order Status',
              dataIndex: 'order_status',
              key: 'order_status',
              width: 120,
              render: (status) => (
                <div 
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigator.clipboard.writeText(status)}
                  title="Click to copy"
                >
                  <Tag color="green">{status}</Tag>
                </div>
              ),
            },
            {
              title: 'Interface Status',
              dataIndex: 'interface_status',
              key: 'interface_status',
              width: 130,
              render: (status) => (
                <div 
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigator.clipboard.writeText(status)}
                  title="Click to copy"
                >
                  <Tag color="green">{status}</Tag>
                </div>
              ),
            },
          ]}
          pagination={{ pageSize: 10 }}
          scroll={{ y: 400 }}
          size="small"
        />
      </Modal>

      {/* Not Interface Detail Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            <span>Not Interface Orders Details</span>
          </Space>
        }
        open={notInterfaceDetailModalVisible}
        onCancel={() => setNotInterfaceDetailModalVisible(false)}
        footer={[
          <Popover
            key="copy-select-not-interface"
            content={
              <div style={{ padding: '8px' }}>
                <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Select Columns to Copy:</div>
                <Checkbox.Group
                  value={selectedColumns.notInterface}
                  onChange={(checkedValues) => {
                    setSelectedColumns(prev => ({ ...prev, notInterface: checkedValues }));
                  }}
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  {columnOptions.map(option => (
                    <Checkbox key={option.key} value={option.key}>
                      {option.label}
                    </Checkbox>
                  ))}
                </Checkbox.Group>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <Button 
                    size="small" 
                    onClick={() => 
                      setSelectedColumns(prev => ({ 
                        ...prev, 
                        notInterface: columnOptions.map(o => o.key) 
                      }))
                    }
                  >
                    Select All
                  </Button>
                  <Button 
                    size="small"
                    onClick={() => 
                      setSelectedColumns(prev => ({ ...prev, notInterface: [] }))
                    }
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            }
            open={notInterfacePopoverVisible}
            onOpenChange={setNotInterfacePopoverVisible}
            trigger="click"
            placement="topRight"
          >
            <Button 
              icon={<CopyOutlined />}
              onClick={() => copySelectedColumns(taskStatus?.not_interface_orders, 'Not Interface')}
              type="primary"
            >
              Copy Data
            </Button>
          </Popover>,
          <Button key="close" onClick={() => setNotInterfaceDetailModalVisible(false)}>
            Close
          </Button>
        ]}
        width={1200}
        style={{ top: 20 }}
      >
        <Table
          dataSource={taskStatus?.not_interface_orders || []}
          columns={[
            {
              title: 'Marketplace',
              dataIndex: 'marketplace',
              key: 'marketplace',
              width: 120,
              render: (text) => (
                <div 
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigator.clipboard.writeText(text)}
                  title="Click to copy"
                >
                  {text}
                </div>
              ),
            },
            {
              title: 'Brand',
              dataIndex: 'brand',
              key: 'brand',
              width: 120,
              render: (text) => (
                <div 
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigator.clipboard.writeText(text)}
                  title="Click to copy"
                >
                  {text}
                </div>
              ),
            },
            {
              title: 'Order Number',
              dataIndex: 'order_number',
              key: 'order_number',
              width: 150,
              render: (text) => (
                <div 
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigator.clipboard.writeText(text)}
                  title="Click to copy"
                >
                  {text}
                </div>
              ),
            },
            {
              title: 'AWB/Tracking',
              dataIndex: 'awb',
              key: 'awb',
              width: 150,
              render: (awb) => (
                <div 
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigator.clipboard.writeText(awb || '')}
                  title="Click to copy"
                >
                  {awb ? (
                    <Tag color="blue">{awb}</Tag>
                  ) : (
                    <Tag color="default">-</Tag>
                  )}
                </div>
              ),
            },
            {
              title: 'Order Status',
              dataIndex: 'order_status',
              key: 'order_status',
              width: 120,
              render: (status) => (
                <div 
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigator.clipboard.writeText(status)}
                  title="Click to copy"
                >
                  <Tag color="orange">{status}</Tag>
                </div>
              ),
            },
            {
              title: 'Interface Status',
              dataIndex: 'interface_status',
              key: 'interface_status',
              width: 130,
              render: (status) => (
                <div 
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigator.clipboard.writeText(status)}
                  title="Click to copy"
                >
                  <Tag color="red">{status}</Tag>
                </div>
              ),
            },
          ]}
          pagination={{ pageSize: 10 }}
          scroll={{ y: 400 }}
          size="small"
        />
      </Modal>
    </div>
  );
};

export default UploadNew;
