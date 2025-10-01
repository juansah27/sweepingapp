import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Button, 
  Row, 
  Col, 
  Typography, 
  Space, 
  Tag, 
  Modal, 
  App, 
  Spin,
  Badge,
  Tooltip,
  Divider,
  Alert,
  Switch
} from 'antd';
import { 
  PlayCircleOutlined, 
  ReloadOutlined,
  FileTextOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/axios';
import { marketplaceNotifications, autoRunNotifications } from '../utils/notificationUtils';
import './MarketplaceRunner.css';

const { Title, Text } = Typography;

const MarketplaceRunner = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [marketplaceStatus, setMarketplaceStatus] = useState({});
  const [selectedMarketplace, setSelectedMarketplace] = useState(null);
  const [orderlistContent, setOrderlistContent] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [autoRunEnabled, setAutoRunEnabled] = useState(true);

  const marketplaces = [
    {
      key: 'shopee',
      name: 'Shopee',
      icon: '🛍️',
      exeFile: 'ShopeeOrderLogistic.exe',
      folder: 'Shopee',
      format: 'order_id only'
    },
    {
      key: 'lazada',
      name: 'Lazada',
      icon: '🛒',
      exeFile: 'LazadaOrderLogistic.exe',
      folder: 'Lazada',
      format: 'order_id only'
    },
    {
      key: 'blibli',
      name: 'Blibli',
      icon: '📦',
      exeFile: 'BlibliOrderLogistic.exe',
      folder: 'Blibli',
      format: 'order_id,shop_key_1'
    },
    {
      key: 'desty',
      name: 'Desty',
      icon: '🏪',
      exeFile: 'Desty.Console.exe',
      folder: 'Desty',
      format: 'order_id only'
    },
    {
      key: 'ginee',
      name: 'Ginee',
      icon: '🔄',
      exeFile: 'Ginee.sync.exe',
      folder: 'Ginee',
      format: 'order_id only'
    },
    {
      key: 'tiktok',
      name: 'TikTok',
      icon: '🎵',
      exeFile: 'TiktokOrderLogistic.exe',
      folder: 'Tiktok',
      format: 'order_id only'
    },
    {
      key: 'zalora',
      name: 'Zalora',
      icon: '👗',
      exeFile: 'Zalora.Flexo.Integration.exe',
      folder: 'Zalora',
      format: 'order_id,shop_key_1'
    }
  ];

  // Check marketplace status
  const checkMarketplaceStatus = useCallback(async () => {
    setLoading(true);
    try {
      // Check if marketplace apps are enabled first
      const configResponse = await api.get('/api/config');
      const isMarketplaceEnabled = configResponse.data?.marketplace_apps_enabled;
      
      if (!isMarketplaceEnabled) {
        console.log('🚫 Marketplace apps are disabled, skipping status check');
        setMarketplaceStatus({});
        setLoading(false);
        return;
      }
      
      const response = await api.get('/api/marketplace-status');
      if (response.data && response.data.status) {
        setMarketplaceStatus(response.data.status);
        console.log('✅ Marketplace status loaded:', response.data.status);
      } else {
        console.warn('⚠️ No status data received from API');
        setMarketplaceStatus({});
      }
    } catch (error) {
      console.error('❌ Error checking marketplace status:', error);
      if (error.response?.status === 401) {
        message.error('Session expired, please login again');
      } else if (error.response?.status === 500) {
        message.error('Server error, please try again later');
      } else {
        message.error('Gagal mengecek status marketplace - Check your connection');
      }
      setMarketplaceStatus({});
    } finally {
      setLoading(false);
    }
  }, []);

  // Run marketplace app
  const runMarketplaceApp = async (marketplace) => {
    setLoading(true);
    try {
      const response = await api.post('/api/run-marketplace-app', {
        marketplace: marketplace.key
      });
      
      if (response.data.success) {
        message.success(`${marketplace.name} app berhasil dijalankan!`);

        // Show notification if available (only once)
        if (response.data.marketplace_notification && window.showMarketplaceNotification) {
          window.showMarketplaceNotification(response.data.marketplace_notification);
        }

        // Refresh status after running
        setTimeout(() => {
          checkMarketplaceStatus();
        }, 2000);
      } else {
        marketplaceNotifications.failed(marketplace.name, response.data.message || 'Gagal menjalankan app');
      }
    } catch (error) {
      console.error('Error running marketplace app:', error);
      marketplaceNotifications.failed(marketplace.name, 'Gagal menjalankan marketplace app');
    } finally {
      setLoading(false);
    }
  };

  // View orderlist content
  const viewOrderlist = async (marketplace) => {
    setSelectedMarketplace(marketplace);
    setLoading(true);
    try {
      const response = await api.get(`/marketplace-orderlist/${marketplace.key}`);
      setOrderlistContent(response.data.content);
      setModalVisible(true);
    } catch (error) {
      console.error('Error getting orderlist:', error);
      message.error('Gagal mengambil isi Orderlist.txt');
    } finally {
      setLoading(false);
    }
  };

  // Run all marketplace apps
  const runAllApps = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/run-all-marketplace-apps');
      
      if (response.data.success) {
        const summary = response.data.summary;
        const totalOrders = summary.total_orders_processed;
        
        // Show detailed success message
        message.success(
          `Berhasil menjalankan ${summary.successful}/${summary.total_marketplaces} marketplace apps dengan ${totalOrders} total orders`
        );
        
        // Show detailed results for failed marketplaces
        if (summary.failed > 0) {
          const failedResults = response.data.results.filter(r => !r.success);
          failedResults.forEach(result => {
            message.warning(`${result.marketplace}: ${result.message}`);
          });
        }
        
        // Refresh status after running
        setTimeout(() => {
          checkMarketplaceStatus();
        }, 3000);
      } else {
        message.error(response.data.message || 'Gagal menjalankan beberapa apps');
        
        // Show detailed error information
        if (response.data.results) {
          response.data.results.forEach(result => {
            if (!result.success) {
              message.error(`${result.marketplace}: ${result.message}`);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error running all apps:', error);
      message.error('Gagal menjalankan semua apps');
    } finally {
      setLoading(false);
    }
  };

  // Load auto-run configuration
  const loadAutoRunConfig = async () => {
    try {
      const response = await api.get('/auto-run-config');
      setAutoRunEnabled(response.data.auto_run_enabled);
    } catch (error) {
      console.error('Error loading auto-run config:', error);
    }
  };

  // Update auto-run configuration
  const updateAutoRunConfig = async (enabled) => {
    try {
      const response = await api.post('/auto-run-config', { enabled });
      if (response.data.success) {
        setAutoRunEnabled(enabled);
        if (enabled) {
          autoRunNotifications.enabled();
        } else {
          autoRunNotifications.disabled();
        }
      }
    } catch (error) {
      console.error('Error updating auto-run config:', error);
      message.error('Gagal mengupdate konfigurasi auto-run');
    }
  };

  // Check completion status for a specific marketplace
  const checkCompletionStatus = async (marketplace) => {
    setLoading(true);
    try {
      const response = await api.post('/check-marketplace-completion', {
        marketplace: marketplace.key
      });
      
      if (response.data.success) {
        const { status, output_files } = response.data;
        
        if (status === 'completed') {
          message.success(`${marketplace.name} app completed successfully!`);
          // Show completion notification
          if (window.showCompletionNotification) {
            window.showCompletionNotification(marketplace.name, output_files.length);
          }
        } else if (status === 'running') {
          message.info(`${marketplace.name} app is still running...`);
        } else {
          marketplaceNotifications.noOrderlist(marketplace.name);
        }
      } else {
        message.error('Gagal mengecek status completion');
      }
    } catch (error) {
      console.error('Error checking completion status:', error);
      message.error('Gagal mengecek status completion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkMarketplaceStatus();
    loadAutoRunConfig();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return 'success';
      case 'running': return 'processing';
      case 'error': return 'error';
      case 'unknown': return 'warning';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'ready': return 'Siap';
      case 'running': return 'Berjalan';
      case 'error': return 'Error';
      case 'unknown': return 'Tidak Diketahui';
      case 'completed': return 'Selesai';
      default: return 'Tidak Diketahui';
    }
  };

  return (
    <div className={`marketplace-runner ${isDarkMode ? 'dark' : 'light'}`}>
      <Card 
        title={
          <Space>
            <PlayCircleOutlined />
            <Title level={4} style={{ margin: 0 }}>Marketplace Runner</Title>
          </Space>
        }
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={checkMarketplaceStatus}
              loading={loading}
            >
              Refresh Status
            </Button>
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />}
              onClick={runAllApps}
              loading={loading}
            >
              Jalankan Semua
            </Button>
          </Space>
        }
      >
        <Alert
          message="Marketplace Runner"
          description="Jalankan aplikasi .NET untuk memproses order dari Orderlist.txt yang sudah ter-generate otomatis dari sistem upload."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Card size="small" style={{ marginBottom: 24 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Typography.Text strong>Auto-run setelah Upload:</Typography.Text>
                <Switch 
                  checked={autoRunEnabled}
                  onChange={updateAutoRunConfig}
                  checkedChildren="ON"
                  unCheckedChildren="OFF"
                />
              </Space>
            </Col>
            <Col>
              <Typography.Text type="secondary">
                {autoRunEnabled ? 
                  "✅ Apps akan otomatis dijalankan setelah upload selesai" : 
                  "❌ Apps harus dijalankan manual dari UI ini"
                }
              </Typography.Text>
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          {marketplaces.map((marketplace) => {
            const status = marketplaceStatus[marketplace.key] || 'unknown';
            const hasOrderlist = marketplaceStatus[marketplace.key]?.hasOrderlist || false;
            const orderCount = marketplaceStatus[marketplace.key]?.orderCount || 0;
            
            // Debug info
            console.log(`🔍 ${marketplace.name} status:`, {
              status,
              hasOrderlist,
              orderCount,
              fullStatus: marketplaceStatus[marketplace.key]
            });

            return (
              <Col xs={24} sm={12} lg={8} xl={6} key={marketplace.key}>
                <Card
                  size="small"
                  className={`marketplace-card ${isDarkMode ? 'dark' : 'light'}`}
                  actions={[
                    <Tooltip title="Lihat Orderlist.txt">
                      <Button 
                        type="text" 
                        icon={<FileTextOutlined />}
                        onClick={() => viewOrderlist(marketplace)}
                        disabled={!hasOrderlist}
                      />
                    </Tooltip>,
                    <Tooltip title="Cek Status Completion">
                      <Button 
                        type="text" 
                        icon={<ClockCircleOutlined />}
                        onClick={() => checkCompletionStatus(marketplace)}
                        loading={loading}
                        disabled={!hasOrderlist}
                      />
                    </Tooltip>,
                    <Tooltip title="Jalankan App">
                      <Button 
                        type="text" 
                        icon={<PlayCircleOutlined />}
                        onClick={() => runMarketplaceApp(marketplace)}
                        loading={loading}
                        disabled={!hasOrderlist}
                      />
                    </Tooltip>
                  ]}
                >
                  <div className="marketplace-info">
                    <div className="marketplace-header">
                      <span className="marketplace-icon">{marketplace.icon}</span>
                      <div className="marketplace-details">
                        <Title level={5} style={{ margin: 0 }}>
                          {marketplace.name}
                        </Title>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {marketplace.format}
                        </Text>
                      </div>
                    </div>
                    
                    <div className="marketplace-status">
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div className="status-row">
                          <Text strong>Status:</Text>
                          <Badge 
                            status={getStatusColor(status)} 
                            text={getStatusText(status)}
                          />
                        </div>
                        
                        <div className="status-row">
                          <Text strong>Orderlist:</Text>
                          <Badge 
                            status={hasOrderlist ? 'success' : 'default'} 
                            text={hasOrderlist ? `${orderCount} orders` : 'Tidak ada'}
                          />
                        </div>
                        
                        <div className="status-row">
                          <Text strong>App:</Text>
                          <Text code style={{ fontSize: '11px' }}>
                            {marketplace.exeFile}
                          </Text>
                        </div>
                      </Space>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>

        <Divider />

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card size="small" title="Informasi Format Orderlist.txt">
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <div className="format-info">
                    <Title level={5}>
                      <Tag color="blue">ZALORA & BLIBLI</Tag>
                    </Title>
                    <Text code>order_id,shop_key_1</Text>
                    <br />
                    <Text type="secondary">
                      Contoh: 232632131,5568
                    </Text>
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <div className="format-info">
                    <Title level={5}>
                      <Tag color="green">LAINNYA</Tag>
                    </Title>
                    <Text code>order_id</Text>
                    <br />
                    <Text type="secondary">
                      Contoh: 1951976515581849602
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Orderlist Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>Orderlist.txt - {selectedMarketplace?.name}</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            Tutup
          </Button>,
          <Button 
            key="run" 
            type="primary" 
            icon={<PlayCircleOutlined />}
            onClick={() => {
              if (selectedMarketplace) {
                runMarketplaceApp(selectedMarketplace);
                setModalVisible(false);
              }
            }}
            loading={loading}
          >
            Jalankan App
          </Button>
        ]}
        width={600}
      >
        <div className="orderlist-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin />
            </div>
          ) : (
            <pre style={{ 
              background: isDarkMode ? '#1f1f1f' : '#f5f5f5',
              padding: '16px',
              borderRadius: '6px',
              maxHeight: '400px',
              overflow: 'auto',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              {orderlistContent || 'Tidak ada data'}
            </pre>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MarketplaceRunner;
