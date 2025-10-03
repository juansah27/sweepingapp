import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Tag, 
  Spin, 
  Alert, 
  Button, 
  Space, 
  Typography, 
  Badge,
  notification,
  Modal,
  Table,
  Tabs,
  Input,
  Tooltip,
  Descriptions
} from 'antd';
import api from '../utils/axios';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  DownloadOutlined,
  SearchOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { TabPane } = Tabs;

const ItemIdComparisonCard = ({ dateRange }) => {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Breakdown modal states
  const [breakdownModalVisible, setBreakdownModalVisible] = useState(false);
  const [breakdownData, setBreakdownData] = useState([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0
  });

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      
      // Build params with date range if available
      const params = {};
      if (dateRange && dateRange.length === 2) {
        const startDate = encodeURIComponent(dateRange[0].format('YYYY-MM-DDTHH:mm:ss') + '+07:00');
        const endDate = encodeURIComponent(dateRange[1].format('YYYY-MM-DDTHH:mm:ss') + '+07:00');
        params.start_date = startDate;
        params.end_date = endDate;
      }
      
      const response = await api.get('/api/itemid-comparison', { params });
      setComparisonData(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching SKU comparison:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparisonData();
  }, [dateRange]); // Re-fetch when dateRange changes

  // Fetch breakdown data
  const fetchBreakdownData = async (page = 1, status = selectedStatus, search = searchText) => {
    try {
      setBreakdownLoading(true);
      const params = {
        page: page,
        page_size: pagination.pageSize
      };
      
      if (status !== 'All') {
        params.status_filter = status;
      }
      
      if (search) {
        params.order_number = search;
      }
      
      const response = await api.get('/api/itemid-comparison/breakdown', { params });
      
      if (response.data.success) {
        setBreakdownData(response.data.data);
        setPagination({
          current: response.data.pagination.page,
          pageSize: response.data.pagination.page_size,
          total: response.data.pagination.total
        });
      }
    } catch (err) {
      notification.error({
        message: 'Error',
        description: 'Failed to fetch breakdown data'
      });
      console.error('Error fetching breakdown:', err);
    } finally {
      setBreakdownLoading(false);
    }
  };

  // Open modal with optional status filter
  const openBreakdownModal = (status = 'All') => {
    setSelectedStatus(status);
    setSearchText('');
    setBreakdownModalVisible(true);
    fetchBreakdownData(1, status, '');
  };

  // Handle table change (pagination)
  const handleTableChange = (newPagination) => {
    fetchBreakdownData(newPagination.current, selectedStatus, searchText);
  };

  // Handle tab change
  const handleTabChange = (key) => {
    setSelectedStatus(key);
    setPagination({ ...pagination, current: 1 });
    fetchBreakdownData(1, key, searchText);
  };

  // Handle search
  const handleSearch = (value) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
    fetchBreakdownData(1, selectedStatus, value);
  };

  // Export to Excel - Fetch ALL data for selected status
  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      
      notification.info({
        message: 'Exporting...',
        description: 'Fetching all data for export. Please wait...',
        duration: 2
      });

      // Fetch ALL data (no pagination limit)
      const params = {
        page: 1,
        page_size: 999999 // Get all data
      };
      
      if (selectedStatus !== 'All') {
        params.status_filter = selectedStatus;
      }
      
      if (searchText) {
        params.order_number = searchText;
      }
      
      const response = await api.get('/api/itemid-comparison/breakdown', { params });
      
      if (!response.data.success) {
        throw new Error('Failed to fetch export data');
      }

      const allData = response.data.data;
      
      const exportData = allData.map(item => ({
        'Order Number': item.order_number,
        'Marketplace': item.marketplace,
        'Brand': item.brand,
        'Status': item.comparison_status,
        'Excel ItemId': item.excel_itemid || 'N/A',
        'External ItemId': item.external_itemid || 'N/A',
        'Excel Normalized': item.excel_itemid_normalized || 'N/A',
        'External Normalized': item.external_itemid_normalized || 'N/A',
        'Upload Date': item.upload_date,
        'Interface Status': item.interface_status
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'SKU Comparison');
      
      const filename = `SKU_Comparison_${selectedStatus}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      
      notification.success({
        message: 'Export Successful',
        description: `${exportData.length} rows exported to ${filename}`
      });
    } catch (err) {
      notification.error({
        message: 'Export Failed',
        description: 'Failed to export data to Excel'
      });
      console.error('Export error:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Match':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'Mismatch':
        return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
      case 'Item Missing':
        return <FileTextOutlined style={{ color: '#faad14' }} />;
      case 'Item Different':
        return <DatabaseOutlined style={{ color: '#1890ff' }} />;
      case 'Both Missing':
        return <ExclamationCircleOutlined style={{ color: '#8c8c8c' }} />;
      default:
        return <ExclamationCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Match':
        return 'green';
      case 'Mismatch':
        return 'red';
      case 'Item Missing':
        return 'orange';
      case 'Item Different':
        return 'blue';
      case 'Both Missing':
        return 'default';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Card 
        title={
          <Space>
            <ReloadOutlined spin />
            SKU Comparison
          </Space>
        }
        className="dashboard-card"
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px', color: '#666' }}>
            Loading comparison data...
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card 
        title={
          <Space>
            <CloseCircleOutlined style={{ color: '#f5222d' }} />
            SKU Comparison
          </Space>
        }
        className="dashboard-card"
      >
        <Alert
          message="Error"
          description={`Error loading comparison data: ${error}`}
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <Button 
          onClick={fetchComparisonData} 
          icon={<ReloadOutlined />}
          size="small"
        >
          Retry
        </Button>
      </Card>
    );
  }

  if (!comparisonData || !comparisonData.success) {
    return (
      <Card 
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            SKU Comparison
          </Space>
        }
        className="dashboard-card"
      >
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#666' }}>
          No comparison data available
        </div>
      </Card>
    );
  }

  const { summary, comparison_percentages, recent_mismatches } = comparisonData;

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Space>
            <DatabaseOutlined />
            SKU Comparison
          </Space>
          <Space>
            <Button
              icon={showDetails ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => setShowDetails(!showDetails)}
              size="small"
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchComparisonData}
              size="small"
            />
          </Space>
        </div>
      }
      className="dashboard-card"
    >
        {/* Summary Stats */}
        <Row gutter={[24, 16]} justify="center" style={{ marginBottom: '16px' }}>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Tooltip title="Click to view details">
              <div 
                style={{ textAlign: 'center', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'all 0.3s' }}
                onClick={() => openBreakdownModal('Match')}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(82, 196, 26, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Statistic
                  value={summary.match_count}
                  valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 'bold' }}
                  title="Match"
                  suffix={` (${comparison_percentages.Match || 0}%)`}
                />
              </div>
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Tooltip title="Click to view details">
              <div 
                style={{ textAlign: 'center', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'all 0.3s' }}
                onClick={() => openBreakdownModal('Mismatch')}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245, 34, 45, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Statistic
                  value={summary.mismatch_count}
                  valueStyle={{ color: '#f5222d', fontSize: '28px', fontWeight: 'bold' }}
                  title="Mismatch"
                  suffix={` (${comparison_percentages.Mismatch || 0}%)`}
                />
              </div>
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Tooltip title="Click to view details">
              <div 
                style={{ textAlign: 'center', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'all 0.3s' }}
                onClick={() => openBreakdownModal('Item Missing')}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(250, 173, 20, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Statistic
                  value={summary.excel_missing_count}
                  valueStyle={{ color: '#faad14', fontSize: '28px', fontWeight: 'bold' }}
                  title="Item Missing"
                  suffix={` (${comparison_percentages['Item Missing'] || 0}%)`}
                />
              </div>
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Tooltip title="Click to view details">
              <div 
                style={{ textAlign: 'center', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'all 0.3s' }}
                onClick={() => openBreakdownModal('Item Different')}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(24, 144, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Statistic
                  value={summary.external_missing_count}
                  valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: 'bold' }}
                  title="Item Different"
                  suffix={` (${comparison_percentages['Item Different'] || 0}%)`}
                />
              </div>
            </Tooltip>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <Tooltip title="Click to view details">
              <div 
                style={{ textAlign: 'center', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'all 0.3s' }}
                onClick={() => openBreakdownModal('Both Missing')}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(140, 140, 140, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Statistic
                  value={summary.both_missing_count}
                  valueStyle={{ color: '#8c8c8c', fontSize: '28px', fontWeight: 'bold' }}
                  title="Both Missing"
                  suffix={` (${comparison_percentages['Both Missing'] || 0}%)`}
                />
              </div>
            </Tooltip>
          </Col>
        </Row>


        {/* Recent Mismatches */}
        {showDetails && recent_mismatches.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <Typography.Title level={5} style={{ marginBottom: '8px' }}>
              Recent Mismatches
            </Typography.Title>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {recent_mismatches.map((mismatch, index) => (
                <div key={index} style={{ 
                  padding: '8px', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '4px', 
                  marginBottom: '8px',
                  fontSize: '12px'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {mismatch.order_number}
                  </div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>
                    {mismatch.marketplace} - {mismatch.brand}
                  </div>
                  <div style={{ marginBottom: '2px' }}>
                    <span style={{ color: '#faad14', fontWeight: 'bold' }}>Excel:</span> {mismatch.excel_itemid || 'N/A'}
                  </div>
                  <div>
                    <span style={{ color: '#1890ff', fontWeight: 'bold' }}>External:</span> {mismatch.external_itemid || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alert for mismatches */}
        {summary.mismatch_count > 0 && (
          <Alert
            message="Data Mismatch Detected"
            description={
              <span>
                <strong>{summary.mismatch_count} orders</strong> have mismatched ItemId between Sweeping and SOL. 
                Please review the details above.
              </span>
            }
            type="warning"
            showIcon
            style={{ marginTop: '16px' }}
          />
        )}

        {/* Breakdown Modal */}
        <Modal
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Space>
                <DatabaseOutlined />
                SKU Comparison Breakdown - {selectedStatus}
                {pagination.total > 0 && (
                  <Badge count={pagination.total} showZero color="#1890ff" overflowCount={999999} />
                )}
              </Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportExcel}
                size="small"
                type="primary"
                loading={exportLoading}
                disabled={breakdownData.length === 0 || exportLoading}
              >
                {exportLoading ? 'Exporting...' : 'Export to Excel'}
              </Button>
            </div>
          }
          open={breakdownModalVisible}
          onCancel={() => setBreakdownModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setBreakdownModalVisible(false)}>
              Close
            </Button>
          ]}
          width="90%"
          style={{ top: 20 }}
        >
          {/* Tabs for status filter */}
          <Tabs activeKey={selectedStatus} onChange={handleTabChange} style={{ marginBottom: '16px' }}>
            <TabPane 
              tab="All" 
              key="All"
            />
            <TabPane 
              tab={
                <Badge count={comparisonData?.summary.mismatch_count || 0} offset={[10, 0]}>
                  <span style={{ color: '#f5222d', fontWeight: 'bold' }}>Mismatch</span>
                </Badge>
              } 
              key="Mismatch"
            />
            <TabPane 
              tab={
                <Badge count={comparisonData?.summary.match_count || 0} offset={[10, 0]}>
                  <span style={{ color: '#52c41a', fontWeight: 'bold' }}>Match</span>
                </Badge>
              } 
              key="Match"
            />
            <TabPane 
              tab={
                <Badge count={comparisonData?.summary.excel_missing_count || 0} offset={[10, 0]}>
                  <span style={{ color: '#faad14', fontWeight: 'bold' }}>Item Missing</span>
                </Badge>
              } 
              key="Item Missing"
            />
            <TabPane 
              tab={
                <Badge count={comparisonData?.summary.external_missing_count || 0} offset={[10, 0]}>
                  <span style={{ color: '#1890ff', fontWeight: 'bold' }}>Item Different</span>
                </Badge>
              } 
              key="Item Different"
            />
            <TabPane 
              tab={
                <Badge count={comparisonData?.summary.both_missing_count || 0} offset={[10, 0]}>
                  <span style={{ color: '#8c8c8c' }}>Both Missing</span>
                </Badge>
              } 
              key="Both Missing"
            />
          </Tabs>

          {/* Search box */}
          <Input.Search
            placeholder="Search by Order Number..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={handleSearch}
            style={{ marginBottom: '16px' }}
          />

          {/* Table */}
          <Table
            dataSource={breakdownData}
            loading={breakdownLoading}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} orders`,
              pageSizeOptions: ['20', '50', '100', '200']
            }}
            onChange={handleTableChange}
            scroll={{ x: 1200, y: 'calc(100vh - 450px)' }}
            size="small"
            bordered
            rowKey="id"
            expandable={{
              expandedRowRender: (record) => (
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="Original Excel ItemId" span={1}>
                    <Typography.Text copyable>{record.excel_itemid || 'N/A'}</Typography.Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Normalized Excel ItemId" span={1}>
                    <Typography.Text code>{record.excel_itemid_normalized || 'N/A'}</Typography.Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Original External ItemId" span={1}>
                    <Typography.Text copyable>{record.external_itemid || 'N/A'}</Typography.Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Normalized External ItemId" span={1}>
                    <Typography.Text code>{record.external_itemid_normalized || 'N/A'}</Typography.Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Interface Status" span={2}>
                    <Tag color={record.interface_status === 'Uploaded' ? 'green' : 'orange'}>
                      {record.interface_status || 'Pending'}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              ),
              rowExpandable: (record) => record.excel_itemid || record.external_itemid
            }}
            columns={[
              {
                title: 'Order Number',
                dataIndex: 'order_number',
                key: 'order_number',
                width: 180,
                fixed: 'left',
                render: (text) => (
                  <Typography.Text style={{ fontFamily: 'monospace', fontSize: '13px' }} copyable>
                    {text}
                  </Typography.Text>
                )
              },
              {
                title: 'Status',
                dataIndex: 'comparison_status',
                key: 'comparison_status',
                width: 120,
                render: (text) => (
                  <Tag color={getStatusColor(text)} icon={getStatusIcon(text)}>
                    {text}
                  </Tag>
                )
              },
              {
                title: 'Marketplace',
                dataIndex: 'marketplace',
                key: 'marketplace',
                width: 120,
                render: (text) => <Tag color="blue">{text}</Tag>
              },
              {
                title: 'Brand',
                dataIndex: 'brand',
                key: 'brand',
                width: 120,
                render: (text) => <Tag color="green">{text}</Tag>
              },
              {
                title: 'Excel ItemId',
                dataIndex: 'excel_itemid',
                key: 'excel_itemid',
                width: 200,
                ellipsis: {
                  showTitle: false,
                },
                render: (text) => (
                  <Tooltip placement="topLeft" title={text}>
                    <Typography.Text style={{ fontSize: '12px' }}>
                      {text || <span style={{ color: '#999' }}>N/A</span>}
                    </Typography.Text>
                  </Tooltip>
                )
              },
              {
                title: 'External ItemId',
                dataIndex: 'external_itemid',
                key: 'external_itemid',
                width: 200,
                ellipsis: {
                  showTitle: false,
                },
                render: (text) => (
                  <Tooltip placement="topLeft" title={text}>
                    <Typography.Text style={{ fontSize: '12px' }}>
                      {text || <span style={{ color: '#999' }}>N/A</span>}
                    </Typography.Text>
                  </Tooltip>
                )
              },
              {
                title: 'Upload Date',
                dataIndex: 'upload_date',
                key: 'upload_date',
                width: 180,
                render: (text) => text ? new Date(text).toLocaleString('id-ID') : '-'
              }
            ]}
          />
        </Modal>
    </Card>
  );
};

export default ItemIdComparisonCard;
