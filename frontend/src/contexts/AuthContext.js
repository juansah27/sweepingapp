import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      setIsAuthenticated(true);
      // Set default auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Fetch user info when token is available
      const fetchUserInfo = async () => {
        try {
          const userResponse = await api.get('/me');
          setUser(userResponse.data);
        } catch (error) {
          console.error('Failed to fetch user info:', error);
          
          // Handle timeout and network errors gracefully
          if (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.response?.status === 504) {
            console.warn('User info fetch timed out, but keeping authentication state');
            // Don't clear auth state for timeout errors
          } else if (error.response?.status === 401) {
            // Token is invalid, clear auth state
            localStorage.removeItem('token');
            setToken(null);
            setIsAuthenticated(false);
            setUser(null);
            delete api.defaults.headers.common['Authorization'];
          }
        }
      };
      fetchUserInfo();
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await api.post('/login', { username, password });
      const { access_token } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setIsAuthenticated(true);
      
      // Set auth header before fetching user info
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Fetch user information including role
      const userResponse = await api.get('/me');
      setUser(userResponse.data);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await api.post('/register', { username, email, password });
      const { access_token } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setIsAuthenticated(true);
      
      // Set auth header before fetching user info
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Fetch user information including role
      const userResponse = await api.get('/me');
      setUser(userResponse.data);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  };

  const refreshUserInfo = async () => {
    if (token) {
      try {
        const userResponse = await api.get('/me');
        setUser(userResponse.data);
      } catch (error) {
        console.error('Failed to refresh user info:', error);
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsAuthenticated(false);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
  };

  const value = {
    isAuthenticated,
    user,
    login,
    register,
    logout,
    refreshUserInfo
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
