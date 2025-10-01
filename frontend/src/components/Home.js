import React from 'react';
import { Typography, Card, Row, Col } from 'antd';
import { 
  DashboardOutlined, 
  UploadOutlined, 
  SearchOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const { Title, Paragraph } = Typography;

const Home = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Title level={2} style={{ 
        textAlign: 'center', 
        marginBottom: 32,
        color: theme === 'dark' ? 'white' : '#001529'
      }}>
        Welcome to Sweeping Apps
      </Title>
      
      <Paragraph style={{ 
        textAlign: 'center', 
        fontSize: 16, 
        marginBottom: 48,
        color: theme === 'dark' ? '#d9d9d9' : '#595959'
      }}>
        Order Management System for efficient file processing and order tracking
      </Paragraph>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={8}>
          <Card 
            hoverable 
            style={{ 
              textAlign: 'center', 
              cursor: 'pointer',
              background: theme === 'dark' ? '#1f1f1f' : '#fff',
              border: theme === 'dark' ? '1px solid #303030' : '1px solid #f0f0f0'
            }}
            onClick={() => navigate('/upload')}
          >
            <UploadOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
            <Title level={4} style={{ color: theme === 'dark' ? 'white' : '#001529' }}>
              Upload & Process
            </Title>
            <Paragraph style={{ color: theme === 'dark' ? '#d9d9d9' : '#595959' }}>
              Upload Excel/CSV files with specific naming convention and process orders
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card 
            hoverable 
            style={{ 
              textAlign: 'center', 
              cursor: 'pointer',
              background: theme === 'dark' ? '#1f1f1f' : '#fff',
              border: theme === 'dark' ? '1px solid #303030' : '1px solid #f0f0f0'
            }}
            onClick={() => navigate('/dashboard')}
          >
            <DashboardOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
            <Title level={4} style={{ color: theme === 'dark' ? 'white' : '#001529' }}>
              Dashboard
            </Title>
            <Paragraph style={{ color: theme === 'dark' ? '#d9d9d9' : '#595959' }}>
              View analytics and overview of uploaded orders and processing status
            </Paragraph>
          </Card>
        </Col>


        <Col xs={24} sm={12} lg={8}>
          <Card 
            hoverable 
            style={{ 
              textAlign: 'center', 
              cursor: 'pointer',
              background: theme === 'dark' ? '#1f1f1f' : '#fff',
              border: theme === 'dark' ? '1px solid #303030' : '1px solid #f0f0f0'
            }}
            onClick={() => navigate('/get-order')}
          >
            <SearchOutlined style={{ fontSize: 48, color: '#fa8c16', marginBottom: 16 }} />
            <Title level={4} style={{ color: theme === 'dark' ? 'white' : '#001529' }}>
              Get Order
            </Title>
            <Paragraph style={{ color: theme === 'dark' ? '#d9d9d9' : '#595959' }}>
              Search and retrieve specific order information from the system
            </Paragraph>
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 48, textAlign: 'center' }}>
        <Title level={3} style={{ color: theme === 'dark' ? 'white' : '#001529' }}>
          File Upload Requirements
        </Title>
        <Card style={{ 
          maxWidth: 600, 
          margin: '0 auto',
          background: theme === 'dark' ? '#1f1f1f' : '#fff',
          border: theme === 'dark' ? '1px solid #303030' : '1px solid #f0f0f0'
        }}>
          <Paragraph style={{ color: theme === 'dark' ? '#d9d9d9' : '#595959' }}>
            <strong>File Format:</strong> [BRAND]-[SALESCHANNEL]-[TANGGAL]-[BATCH].xlsx|csv
          </Paragraph>
          <Paragraph style={{ color: theme === 'dark' ? '#d9d9d9' : '#595959' }}>
            <strong>Example:</strong> SAFNCO-JUBELIO-28-4.xlsx
          </Paragraph>
          <Paragraph style={{ color: theme === 'dark' ? '#d9d9d9' : '#595959' }}>
            <strong>Supported Formats:</strong> Excel (.xlsx) and CSV (.csv)
          </Paragraph>
        </Card>
      </div>
    </div>
  );
};

export default Home;
