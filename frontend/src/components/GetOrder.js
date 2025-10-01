import React, { useState } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  DatePicker, 
  Table, 
  Tag, 
  Typography, 
  Space, 
  Row, 
  Col,
  Alert
} from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/axios';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import './GetOrder.css';

// Configure dayjs for timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

// Set default timezone to WIB
dayjs.tz.setDefault('Asia/Jakarta');

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const GetOrder = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [form] = Form.useForm();
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const onSearch = async (values) => {
    setLoading(true);
    setHasSearched(true);
    
    try {
      // Convert date values to ISO strings if they exist
      const searchParams = { ...values };
      if (values.orderDateRange && values.orderDateRange.length === 2) {
        searchParams.orderDateStart = values.orderDateRange[0].toISOString();
        searchParams.orderDateEnd = values.orderDateRange[1].toISOString();
        delete searchParams.orderDateRange;
      }
      if (values.uploadDateRange && values.uploadDateRange.length === 2) {
        searchParams.uploadDateStart = values.uploadDateRange[0].toISOString();
        searchParams.uploadDateEnd = values.uploadDateRange[1].toISOString();
        delete searchParams.uploadDateRange;
      }

      const response = await api.get('/api/orders', { params: searchParams });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching orders:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onReset = () => {
    form.resetFields();
    setSearchResults([]);
    setHasSearched(false);
  };

  const columns = [
    {
      title: 'Order Number',
      dataIndex: 'OrderNumber',
      key: 'OrderNumber',
      width: 150,
      ellipsis: true,
      render: (text) => (
        <span className="order-number-column" style={{ 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          display: 'block',
          maxWidth: '130px'
        }}>
          {text}
        </span>
      ),
      sorter: (a, b) => a.OrderNumber?.localeCompare(b.OrderNumber),
    },
    {
      title: 'Brand',
      dataIndex: 'brand',
      key: 'brand',
      width: 100,
      ellipsis: true,
      render: (text) => (
        <Tag color="blue" className="brand-column" style={{ maxWidth: '100%' }}>
          <span style={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            display: 'block',
            maxWidth: '80px'
          }}>
            {text}
          </span>
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'OrderStatus',
      key: 'OrderStatus',
      width: 150,
      ellipsis: true,
      render: (status) => {
        let color = 'default';
        let icon = null;
        
        if (status === 'Completed') {
          color = 'success';
          icon = <CheckCircleOutlined />;
        } else if (status === 'Pending') {
          color = 'processing';
          icon = <ClockCircleOutlined />;
        } else {
          color = 'error';
          icon = <ExclamationCircleOutlined />;
        }
        
        return (
          <Tag color={color} icon={icon} className="status-column" style={{ maxWidth: '100%' }}>
            <span style={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              display: 'block',
              maxWidth: '120px'
            }}>
              {status}
            </span>
          </Tag>
        );
      },
    },
    {
      title: 'Marketplace',
      dataIndex: 'marketplace',
      key: 'marketplace',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'AWB',
      dataIndex: 'AWB',
      key: 'AWB',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Transporter',
      dataIndex: 'Transporter',
      key: 'Transporter',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Order Date',
      dataIndex: 'OrderDate',
      key: 'OrderDate',
      width: 120,
      render: (date) => dayjs.tz(date, 'Asia/Jakarta').format('YYYY-MM-DD'),
      sorter: (a, b) => dayjs.tz(a.OrderDate, 'Asia/Jakarta').unix() - dayjs.tz(b.OrderDate, 'Asia/Jakarta').unix(),
    },
    {
      title: 'SLA',
      dataIndex: 'SLA',
      key: 'SLA',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Warehouse',
      dataIndex: 'WareHouse',
      key: 'WareHouse',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Batch',
      dataIndex: 'Batch',
      key: 'Batch',
      width: 80,
      ellipsis: true,
    },
    {
      title: 'PIC',
      dataIndex: 'PIC',
      key: 'PIC',
      width: 100,
      ellipsis: true,
    },
    {
      title: 'Upload Date',
      dataIndex: 'UploadDate',
      key: 'UploadDate',
      width: 120,
      render: (date) => dayjs.tz(date, 'Asia/Jakarta').format('YYYY-MM-DD'),
    },
    {
      title: 'Remark',
      dataIndex: 'Remark',
      key: 'Remark',
      width: 150,
      ellipsis: true,
    },
  ];

  return (
         <div style={{ minHeight: '100vh', background: theme === 'dark' ? '#141414' : '#f0f2f5' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        background: '#001529',
        padding: '0 24px'
      }}>
        <Title level={3} style={{ color: 'white', margin: 0 }}>
          Get Order
        </Title>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/')}
          style={{ color: 'white', marginLeft: 'auto' }}
        >
          Back to Home
        </Button>
      </div>

      <div style={{ padding: '24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Card title="Search Orders">
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={onSearch}
                  initialValues={{
                    orderStatus: 'all',
                    brand: 'all',
                  }}
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="orderNumber" label="Order Number">
                        <Input placeholder="Enter order number" allowClear />
                      </Form.Item>
                    </Col>
                    
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="brand" label="Brand">
                        <Select placeholder="Select brand">
                          <Option value="all">All Brands</Option>
                          <Option value="SAFNCO">SAFNCO</Option>
                          <Option value="OTHER">OTHER</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="orderStatus" label="Order Status">
                        <Select placeholder="Select status">
                          <Option value="all">All Status</Option>
                          <Option value="Completed">Completed</Option>
                          <Option value="Pending">Pending</Option>
                          <Option value="Failed">Failed</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="marketplace" label="Marketplace">
                        <Input placeholder="Enter marketplace" allowClear />
                      </Form.Item>
                    </Col>
                    
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="awb" label="AWB Number">
                        <Input placeholder="Enter AWB number" allowClear />
                      </Form.Item>
                    </Col>
                    
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="transporter" label="Transporter">
                        <Input placeholder="Enter transporter" allowClear />
                      </Form.Item>
                    </Col>
                    
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="orderDateRange" label="Order Date Range">
                        <RangePicker 
                          style={{ width: '100%' }}
                          format="YYYY-MM-DD"
                        />
                      </Form.Item>
                    </Col>
                    
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="batch" label="Batch Number">
                        <Input placeholder="Enter batch number" allowClear />
                      </Form.Item>
                    </Col>
                    
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item name="uploadDateRange" label="Upload Date Range">
                        <RangePicker 
                          style={{ width: '100%' }}
                          format="YYYY-MM-DD"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Form.Item>
                    <Space>
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        icon={<SearchOutlined />}
                        loading={loading}
                        size="large"
                      >
                        Search Orders
                      </Button>
                      <Button 
                        onClick={onReset} 
                        icon={<ReloadOutlined />}
                        size="large"
                      >
                        Reset
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            </Col>

            {hasSearched && (
              <Col span={24}>
                <Card title="Search Results">
                  {searchResults.length === 0 ? (
                    <Alert
                      message="No orders found"
                      description="Try adjusting your search criteria or check if the data exists."
                      type="info"
                      showIcon
                    />
                  ) : (
                    <>
                      <Alert
                        message={`Found ${searchResults.length} order(s)`}
                        type="success"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                      <Table
                        columns={columns}
                        dataSource={searchResults}
                        loading={loading}
                        rowKey="Id"
                        pagination={{
                          pageSize: 20,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) => 
                            `${range[0]}-${range[1]} of ${total} items`,
                        }}
                        scroll={{ x: 1400 }}
                      />
                    </>
                  )}
                </Card>
              </Col>
            )}
          </Row>
        </div>
      </div>
    </div>
  );
};

export default GetOrder;
