import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin, App as AntdApp } from 'antd';
import Login from './components/Login';
import LayoutWrapper from './components/LayoutWrapper';
import NotificationSystem from './components/NotificationSystem';
import MarketplaceCompletionMonitor from './components/MarketplaceCompletionMonitor';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './App.css';

// Lazy load components for better performance
const Home = lazy(() => import('./components/Home'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Upload = lazy(() => import('./components/UploadNew'));
const GetOrder = lazy(() => import('./components/GetOrder'));
const MarketplaceInfo = lazy(() => import('./components/MarketplaceInfo'));
const BrandShopsInfo = lazy(() => import('./components/BrandShopsInfo'));
const OrdersList = lazy(() => import('./components/OrdersList'));
const MarketplaceRunner = lazy(() => import('./components/MarketplaceRunner'));
const QueueStatus = lazy(() => import('./components/QueueStatus'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const Profile = lazy(() => import('./components/Profile'));
const MarketplaceLogs = lazy(() => import('./components/MarketplaceLogs'));
const BrandAccounts = lazy(() => import('./components/BrandAccounts'));
// const SummaryOrder = lazy(() => import('./components/SummaryOrder'));

// Loading component
const LoadingSpinner = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '50vh' 
  }}>
    <Spin size="large" />
  </div>
);

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? (
    <LayoutWrapper>
      <Suspense fallback={<LoadingSpinner />}>
        {children}
      </Suspense>
    </LayoutWrapper>
  ) : <Navigate to="/login" />;
};

const RoleBasedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" />;
  }
  
  return (
    <LayoutWrapper>
      <Suspense fallback={<LoadingSpinner />}>
        {children}
      </Suspense>
    </LayoutWrapper>
  );
};

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <AntdApp>
        <ThemeProvider>
          <AuthProvider>
            <NotificationSystem />
            <MarketplaceCompletionMonitor />
            <Router
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              <div className="App">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
                  <Route path="/dashboard" element={<RoleBasedRoute allowedRoles={['user', 'admin', 'superuser']}><Dashboard /></RoleBasedRoute>} />
                  <Route path="/upload" element={<PrivateRoute><Upload /></PrivateRoute>} />
                  <Route path="/get-order" element={<RoleBasedRoute allowedRoles={['admin', 'superuser']}><GetOrder /></RoleBasedRoute>} />
                  <Route path="/marketplace-info" element={<RoleBasedRoute allowedRoles={['user', 'admin', 'superuser']}><MarketplaceInfo /></RoleBasedRoute>} />
                  <Route path="/brandshops-info" element={<RoleBasedRoute allowedRoles={['admin', 'superuser']}><BrandShopsInfo /></RoleBasedRoute>} />
                  <Route path="/orders-list" element={<RoleBasedRoute allowedRoles={['user', 'superuser']}><OrdersList /></RoleBasedRoute>} />
                  <Route path="/marketplace-runner" element={<RoleBasedRoute allowedRoles={['superuser']}><MarketplaceRunner /></RoleBasedRoute>} />
                  <Route path="/queue-status" element={<RoleBasedRoute allowedRoles={['admin', 'superuser']}><QueueStatus /></RoleBasedRoute>} />
                  <Route path="/user-management" element={<RoleBasedRoute allowedRoles={['admin', 'superuser']}><UserManagement /></RoleBasedRoute>} />
                  <Route path="/marketplace-logs" element={<RoleBasedRoute allowedRoles={['admin', 'superuser']}><MarketplaceLogs /></RoleBasedRoute>} />
                  <Route path="/brand-accounts" element={<RoleBasedRoute allowedRoles={['user', 'admin', 'superuser']}><BrandAccounts /></RoleBasedRoute>} />
                  {/* <Route path="/summary-order" element={<RoleBasedRoute allowedRoles={['user', 'admin', 'superuser']}><SummaryOrder /></RoleBasedRoute>} /> */}
                  <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                </Routes>
              </div>
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
