import React from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Tabs,
  Table,
  Tag,
  Space,
  Badge,
  Alert,
  Typography
} from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';

const { Text } = Typography;

const InterfaceStatusSummary = ({ 
  interfaceSummary, 
  brand, 
  batch, 
  showTitle = true,
  compact = false 
}) => {
  const { theme } = useTheme();

  if (!interfaceSummary) {
    return (
      <Alert
        message="No Interface Summary Available"
        description="Interface status information is not available for this upload."
        type="warning"
        showIcon
      />
    );
  }

  const interfaceColumns = [
    {
      title: 'Order Number',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text) => <Text code>{text}</Text>
    },
    {
      title: 'AWB/Tracking',
      dataIndex: 'awb',
      key: 'awb',
      render: (text) => <Tag color="green">{text}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (text) => (
        <Tag color="green" icon={<CheckCircleOutlined />}>
          {text}
        </Tag>
      )
    },
    {
      title: 'Transporter',
      dataIndex: 'transporter',
      key: 'transporter',
      render: (text) => text || 'N/A'
    },
    {
      title: 'System ID',
      dataIndex: 'system_id',
      key: 'system_id',
      render: (text) => text ? <Text code>{text}</Text> : 'N/A'
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (text) => <Text type="secondary" style={{ fontSize: '12px' }}>{text}</Text>
    }
  ];

  const notInterfaceColumns = [
    {
      title: 'Order Number',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text) => <Text code>{text}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (text) => (
        <Tag color="orange" icon={<WarningOutlined />}>
          {text}
        </Tag>
      )
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (text) => <Text type="secondary">{text}</Text>
    }
  ];

  return (
    <Card 
      style={{ background: theme === 'dark' ? '#1f1f1f' : '#fff' }}
      title={
        showTitle ? (
          <Space>
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
            Interface Status Summary
            {brand && batch && (
              <Tag color="blue">{brand} - Batch {batch}</Tag>
            )}
          </Space>
        ) : null
      }
    >
      {/* Summary Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: compact ? 16 : 24 }}>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ textAlign: 'center', background: theme === 'dark' ? '#262626' : '#f6f6f6' }}>
            <Statistic
              title="Total Orders"
              value={interfaceSummary.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ textAlign: 'center', background: theme === 'dark' ? '#262626' : '#f6f6f6' }}>
            <Statistic
              title="Interface"
              value={interfaceSummary.interface.count}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ textAlign: 'center', background: theme === 'dark' ? '#262626' : '#f6f6f6' }}>
            <Statistic
              title="Not Yet Interface"
              value={interfaceSummary.not_interface.count}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Interface Percentage */}
      {!compact && (
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <Progress
            type="circle"
            percent={interfaceSummary.interface_percentage}
            strokeColor={{
              '0%': '#ff4d4f',
              '100%': '#52c41a',
            }}
            size={120}
            format={(percent) => (
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{percent}%</div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Interface</div>
              </div>
            )}
          />
        </div>
      )}

      {/* Performance Note */}
      {interfaceSummary.performance_note && (
        <Alert
          message="Performance Optimization"
          description={interfaceSummary.performance_note}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Detailed Breakdown */}
      <Tabs 
        defaultActiveKey="interface"
        type="card"
        items={[
          {
            key: 'interface',
            label: (
              <Space>
                <Badge count={interfaceSummary.interface.count} style={{ backgroundColor: '#52c41a' }} />
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>Interface Orders ({interfaceSummary.interface.count})</span>
              </Space>
            ),
            children: interfaceSummary.interface.count > 0 ? (
              <Table
                dataSource={interfaceSummary.interface.orders}
                columns={interfaceColumns}
                pagination={false}
                size="small"
                rowKey={(record, index) => `interface-${record.order_number}-${index}`}
                scroll={{ x: 400 }}
              />
            ) : (
              <Alert
                message="No Interface Orders"
                description="All orders in this batch are not yet interfaced."
                type="info"
                showIcon
              />
            )
          },
          {
            key: 'not_interface',
            label: (
              <Space>
                <Badge count={interfaceSummary.not_interface.count} style={{ backgroundColor: '#ff4d4f' }} />
                <WarningOutlined style={{ color: '#ff4d4f' }} />
                <span>Not Yet Interface Orders ({interfaceSummary.not_interface.count})</span>
              </Space>
            ),
            children: interfaceSummary.not_interface.count > 0 ? (
              <Table
                dataSource={interfaceSummary.not_interface.orders}
                columns={notInterfaceColumns}
                pagination={false}
                size="small"
                rowKey={(record, index) => `not-interface-${record.order_number}-${index}`}
                scroll={{ x: 400 }}
              />
            ) : (
              <Alert
                message="All Orders Interface"
                description="All orders in this batch have been successfully interfaced."
                type="success"
                showIcon
              />
            )
          }
        ]}
      />
    </Card>
  );
};

export default InterfaceStatusSummary;
