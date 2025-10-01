import React from 'react';
import { Result, Button } from 'antd';
import { ReloadOutlined, HomeOutlined } from '@ant-design/icons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh',
          padding: '20px'
        }}>
          <Result
            status="error"
            title="Something went wrong"
            subTitle="An unexpected error occurred while loading the marketplace logs. Please try refreshing the page or contact support if the problem persists."
            extra={[
              <Button 
                type="primary" 
                key="reload" 
                icon={<ReloadOutlined />}
                onClick={this.handleReload}
                style={{ marginRight: 8 }}
              >
                Reload Page
              </Button>,
              <Button 
                key="home" 
                icon={<HomeOutlined />}
                onClick={this.handleGoHome}
              >
                Go Home
              </Button>
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
