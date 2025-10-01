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
  notification
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
  EyeInvisibleOutlined
} from '@ant-design/icons';

const ItemIdComparisonCard = () => {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/itemid-comparison');
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
  }, []);

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
            <div style={{ textAlign: 'center' }}>
              <Statistic
                value={summary.match_count}
                valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 'bold' }}
                title="Match"
                suffix={` (${comparison_percentages.Match || 0}%)`}
              />
            </div>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <div style={{ textAlign: 'center' }}>
              <Statistic
                value={summary.mismatch_count}
                valueStyle={{ color: '#f5222d', fontSize: '28px', fontWeight: 'bold' }}
                title="Mismatch"
                suffix={` (${comparison_percentages.Mismatch || 0}%)`}
              />
            </div>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <div style={{ textAlign: 'center' }}>
              <Statistic
                value={summary.excel_missing_count}
                valueStyle={{ color: '#faad14', fontSize: '28px', fontWeight: 'bold' }}
                title="Item Missing"
                suffix={` (${comparison_percentages['Item Missing'] || 0}%)`}
              />
            </div>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <div style={{ textAlign: 'center' }}>
              <Statistic
                value={summary.external_missing_count}
                valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: 'bold' }}
                title="Item Different"
                suffix={` (${comparison_percentages['Item Different'] || 0}%)`}
              />
            </div>
          </Col>
          <Col xs={12} sm={8} md={4} lg={4}>
            <div style={{ textAlign: 'center' }}>
              <Statistic
                value={summary.both_missing_count}
                valueStyle={{ color: '#8c8c8c', fontSize: '28px', fontWeight: 'bold' }}
                title="Both Missing"
                suffix={` (${comparison_percentages['Both Missing'] || 0}%)`}
              />
            </div>
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
    </Card>
  );
};

export default ItemIdComparisonCard;
