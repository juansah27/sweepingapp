import { useEffect, useRef, useState } from 'react';

// Performance monitoring hook
export const usePerformance = (componentName) => {
  const startTime = useRef(Date.now());
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    memoryUsage: 0,
    isSlow: false
  });

  useEffect(() => {
    const endTime = Date.now();
    const renderTime = endTime - startTime.current;
    
    // Check if render is slow (>100ms)
    const isSlow = renderTime > 100;
    
    // Get memory usage if available
    const memoryUsage = performance.memory ? 
      Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0;

    setMetrics({
      renderTime,
      memoryUsage,
      isSlow
    });

    // Log performance in development
    if (process.env.NODE_ENV === 'development' && isSlow) {
      console.warn(`🐌 Slow render detected in ${componentName}: ${renderTime}ms`);
    }
  }, [componentName]);

  return metrics;
};

// API performance monitoring hook
export const useAPIPerformance = () => {
  const [apiMetrics, setApiMetrics] = useState({
    totalRequests: 0,
    averageResponseTime: 0,
    slowRequests: 0,
    errorRate: 0
  });

  const trackRequest = (url, startTime, success = true, responseTime = 0) => {
    setApiMetrics(prev => {
      const newTotal = prev.totalRequests + 1;
      const newAverage = ((prev.averageResponseTime * prev.totalRequests) + responseTime) / newTotal;
      const newSlowRequests = responseTime > 1000 ? prev.slowRequests + 1 : prev.slowRequests;
      const newErrorRate = success ? prev.errorRate : prev.errorRate + 1;

      return {
        totalRequests: newTotal,
        averageResponseTime: Math.round(newAverage),
        slowRequests: newSlowRequests,
        errorRate: Math.round((newErrorRate / newTotal) * 100)
      };
    });
  };

  return { apiMetrics, trackRequest };
};

// Memory usage monitoring hook
export const useMemoryMonitor = () => {
  const [memoryInfo, setMemoryInfo] = useState({
    used: 0,
    total: 0,
    limit: 0
  });

  useEffect(() => {
    const updateMemoryInfo = () => {
      if (performance.memory) {
        setMemoryInfo({
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        });
      }
    };

    // Update memory info every 5 seconds
    const interval = setInterval(updateMemoryInfo, 5000);
    updateMemoryInfo(); // Initial update

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
};

// Component visibility hook for lazy loading optimization
export const useIntersectionObserver = (ref, options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        ...options
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref, hasIntersected, options]);

  return { isIntersecting, hasIntersected };
};

// Debounced value hook for search optimization
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Virtual scrolling hook for large lists
export const useVirtualScroll = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = items.slice(visibleStart, visibleEnd);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStart * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop
  };
};
