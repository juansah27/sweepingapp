import React from 'react';
import { Layout } from 'antd';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from './Sidebar';

const { Content } = Layout;

const LayoutWrapper = ({ children }) => {
  const { theme, collapsed, toggleTheme, toggleSidebar } = useTheme();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar
        collapsed={collapsed}
        onCollapse={toggleSidebar}
        theme={theme}
        onThemeChange={toggleTheme}
      />
      
      <Layout style={{ 
        marginLeft: collapsed ? 80 : 250,
        transition: 'margin-left 0.2s',
        background: theme === 'dark' ? '#141414' : '#f0f2f5'
      }}>
        <Content style={{ 
          padding: '24px',
          background: theme === 'dark' ? '#141414' : '#f0f2f5',
          minHeight: '100vh'
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default LayoutWrapper;
