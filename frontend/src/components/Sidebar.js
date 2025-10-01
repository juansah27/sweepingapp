import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Typography, Space, Drawer } from 'antd';
import { 
  DashboardOutlined, 
  UploadOutlined, 
  FileTextOutlined, 
  SearchOutlined,
  LogoutOutlined,
  HomeOutlined,
  MenuOutlined,
  SunOutlined,
  MoonOutlined,
  UnorderedListOutlined,
  ShopOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  UserOutlined,
  HistoryOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Sider } = Layout;
const { Title } = Typography;

const Sidebar = ({ collapsed, onCollapse, theme, onThemeChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMenuClick = ({ key }) => {
    navigate(key);
    if (window.innerWidth <= 768) {
      setMobileOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define menu items based on user role
  const getMenuItems = () => {
    const userRole = user?.role;
    
    if (userRole === 'superuser') {
      // Superuser can see everything
      return [
        {
          key: '/',
          icon: <HomeOutlined />,
          label: 'Home',
        },
        {
          key: '/dashboard',
          icon: <DashboardOutlined />,
          label: 'Dashboard',
        },
        {
          key: '/upload',
          icon: <UploadOutlined />,
          label: 'Upload & Process',
        },
        {
          key: '/get-order',
          icon: <SearchOutlined />,
          label: 'Get Order',
        },
        {
          key: '/orders-list',
          icon: <UnorderedListOutlined />,
          label: 'Orders List',
        },
        // {
        //   key: '/summary-order',
        //   icon: <DatabaseOutlined />,
        //   label: 'Summary Order',
        // },
        {
          key: '/marketplace-info',
          icon: <FileTextOutlined />,
          label: 'Marketplace Info',
        },
        {
          key: '/brandshops-info',
          icon: <ShopOutlined />,
          label: 'Brand Shops Info',
        },
        {
          key: '/brand-accounts',
          icon: <SafetyCertificateOutlined />,
          label: 'Brand Accounts',
        },
        {
          key: '/marketplace-runner',
          icon: <PlayCircleOutlined />,
          label: 'Marketplace Runner',
        },
        {
          key: '/queue-status',
          icon: <ClockCircleOutlined />,
          label: 'Queue Status',
        },
        {
          key: '/marketplace-logs',
          icon: <HistoryOutlined />,
          label: 'Marketplace Logs',
        },
        {
          key: '/user-management',
          icon: <TeamOutlined />,
          label: 'User Management',
        },
        {
          key: '/profile',
          icon: <UserOutlined />,
          label: 'Profile',
        },
      ];
    } else if (userRole === 'admin') {
      // Admin can see: Home, Dashboard, Upload, Brand Shops Info, Marketplace Logs, User Management, Profile
      return [
        {
          key: '/',
          icon: <HomeOutlined />,
          label: 'Home',
        },
        {
          key: '/dashboard',
          icon: <DashboardOutlined />,
          label: 'Dashboard',
        },
        {
          key: '/upload',
          icon: <UploadOutlined />,
          label: 'Upload & Process',
        },
        // {
        //   key: '/summary-order',
        //   icon: <DatabaseOutlined />,
        //   label: 'Summary Order',
        // },
        {
          key: '/brandshops-info',
          icon: <ShopOutlined />,
          label: 'Brand Shops Info',
        },
        {
          key: '/brand-accounts',
          icon: <SafetyCertificateOutlined />,
          label: 'Brand Accounts',
        },
        {
          key: '/user-management',
          icon: <TeamOutlined />,
          label: 'User Management',
        },
        {
          key: '/profile',
          icon: <UserOutlined />,
          label: 'Profile',
        },
      ];
    } else if (userRole === 'user') {
      // User can see: Dashboard, Upload, Orders List, Marketplace Info, Brand Accounts, Profile
      return [
        {
          key: '/dashboard',
          icon: <DashboardOutlined />,
          label: 'Dashboard',
        },
        {
          key: '/upload',
          icon: <UploadOutlined />,
          label: 'Upload & Process',
        },
        {
          key: '/orders-list',
          icon: <UnorderedListOutlined />,
          label: 'Orders List',
        },
        // {
        //   key: '/summary-order',
        //   icon: <DatabaseOutlined />,
        //   label: 'Summary Order',
        // },
        {
          key: '/marketplace-info',
          icon: <FileTextOutlined />,
          label: 'Marketplace Info',
        },
        {
          key: '/brand-accounts',
          icon: <SafetyCertificateOutlined />,
          label: 'Brand Accounts',
        },
        {
          key: '/profile',
          icon: <UserOutlined />,
          label: 'Profile',
        },
      ];
    } else {
      // Default fallback - show all menus (for backward compatibility)
      return [
        {
          key: '/',
          icon: <HomeOutlined />,
          label: 'Home',
        },
        {
          key: '/dashboard',
          icon: <DashboardOutlined />,
          label: 'Dashboard',
        },
        {
          key: '/upload',
          icon: <UploadOutlined />,
          label: 'Upload & Process',
        },
        {
          key: '/get-order',
          icon: <SearchOutlined />,
          label: 'Get Order',
        },
        {
          key: '/orders-list',
          icon: <UnorderedListOutlined />,
          label: 'Orders List',
        },
        {
          key: '/marketplace-info',
          icon: <FileTextOutlined />,
          label: 'Marketplace Info',
        },
        {
          key: '/brandshops-info',
          icon: <ShopOutlined />,
          label: 'Brand Shops Info',
        },
        // Marketplace Runner hidden when marketplace apps are disabled
        // {
        //   key: '/marketplace-runner',
        //   icon: <PlayCircleOutlined />,
        //   label: 'Marketplace Runner',
        // },
        {
          key: '/queue-status',
          icon: <ClockCircleOutlined />,
          label: 'Queue Status',
        },
        {
          key: '/marketplace-logs',
          icon: <HistoryOutlined />,
          label: 'Marketplace Logs',
        },
        {
          key: '/user-management',
          icon: <TeamOutlined />,
          label: 'User Management',
        },
        {
          key: '/profile',
          icon: <UserOutlined />,
          label: 'Profile',
        },
      ];
    }
  };

  const menuItems = getMenuItems();

  const isMobile = window.innerWidth <= 768;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarContent = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '16px', 
        borderBottom: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
        textAlign: 'center'
      }}>
        <Title level={4} style={{ 
          color: theme === 'dark' ? 'white' : '#001529', 
          margin: 0,
          fontSize: collapsed ? '16px' : '18px'
        }}>
          {collapsed ? 'SA' : 'Sweeping Apps'}
        </Title>
      </div>

      <Menu
        theme={theme}
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ 
          flex: 1, 
          borderRight: 'none',
          background: theme === 'dark' ? '#141414' : '#fff'
        }}
      />

      <div style={{ 
        padding: '16px', 
        borderTop: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
        background: theme === 'dark' ? '#141414' : '#fff'
      }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: collapsed ? 'center' : 'space-between',
            marginBottom: 8
          }}>
            {!collapsed && (
              <span style={{ 
                color: theme === 'dark' ? '#d9d9d9' : '#595959',
                fontSize: '12px'
              }}>
                {user?.username}
              </span>
            )}
            <Button
              type="text"
              icon={theme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
              onClick={onThemeChange}
              style={{ 
                color: theme === 'dark' ? '#d9d9d9' : '#595959',
                minWidth: collapsed ? '32px' : 'auto'
              }}
            />
          </div>
          
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ 
              color: theme === 'dark' ? '#d9d9d9' : '#595959',
              width: '100%',
              textAlign: collapsed ? 'center' : 'left'
            }}
          >
            {!collapsed && 'Logout'}
          </Button>
        </Space>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={() => setMobileOpen(true)}
          style={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 1000,
            background: theme === 'dark' ? '#141414' : '#fff',
            border: `1px solid ${theme === 'dark' ? '#303030' : '#d9d9d9'}`,
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        />
        
        <Drawer
          title="Navigation"
          placement="left"
          onClose={() => setMobileOpen(false)}
          open={mobileOpen}
          width={250}
          styles={{
            body: {
              padding: 0,
              background: theme === 'dark' ? '#141414' : '#fff'
            },
            header: {
              background: theme === 'dark' ? '#141414' : '#fff',
              borderBottom: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
              color: theme === 'dark' ? 'white' : '#001529'
            }
          }}
        >
          {sidebarContent}
        </Drawer>
      </>
    );
  }

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      theme={theme}
      width={250}
      collapsedWidth={80}
      style={{
        background: theme === 'dark' ? '#141414' : '#fff',
        borderRight: `1px solid ${theme === 'dark' ? '#303030' : '#f0f0f0'}`,
        position: 'fixed',
        height: '100vh',
        left: 0,
        top: 0,
        zIndex: 1000
      }}
    >
      {sidebarContent}
    </Sider>
  );
};

export default Sidebar;
