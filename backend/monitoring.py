"""
Monitoring and observability module for SweepingApps
"""
import time
import logging
import psutil
import threading
from datetime import datetime
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

@dataclass
class SystemMetrics:
    """System performance metrics"""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_total_mb: float
    disk_usage_percent: float
    disk_free_gb: float
    active_connections: int
    requests_per_minute: int
    error_rate: float

@dataclass
class APIMetrics:
    """API performance metrics"""
    endpoint: str
    method: str
    response_time: float
    status_code: int
    timestamp: datetime
    user_agent: str
    ip_address: str

class MetricsCollector:
    """Collects and stores application metrics"""
    
    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        self.api_metrics = deque(maxlen=max_history)
        self.system_metrics = deque(maxlen=max_history)
        self.error_counts = defaultdict(int)
        self.endpoint_stats = defaultdict(lambda: {
            'count': 0,
            'total_time': 0,
            'errors': 0,
            'avg_time': 0
        })
        self.start_time = time.time()
        
    def record_api_call(self, metrics: APIMetrics):
        """Record API call metrics"""
        self.api_metrics.append(metrics)
        
        # Update endpoint statistics
        endpoint_key = f"{metrics.method} {metrics.endpoint}"
        stats = self.endpoint_stats[endpoint_key]
        stats['count'] += 1
        stats['total_time'] += metrics.response_time
        stats['avg_time'] = stats['total_time'] / stats['count']
        
        if metrics.status_code >= 400:
            stats['errors'] += 1
            self.error_counts[metrics.status_code] += 1
    
    def record_system_metrics(self, metrics: SystemMetrics):
        """Record system metrics"""
        self.system_metrics.append(metrics)
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get overall health status"""
        uptime = time.time() - self.start_time
        
        # Calculate error rate
        total_requests = sum(stats['count'] for stats in self.endpoint_stats.values())
        total_errors = sum(stats['errors'] for stats in self.endpoint_stats.values())
        error_rate = (total_errors / total_requests * 100) if total_requests > 0 else 0
        
        # Get latest system metrics
        latest_system = self.system_metrics[-1] if self.system_metrics else None
        
        return {
            'status': 'healthy' if error_rate < 5 and (not latest_system or latest_system.cpu_percent < 80) else 'degraded',
            'uptime_seconds': uptime,
            'uptime_human': self._format_uptime(uptime),
            'total_requests': total_requests,
            'error_rate': round(error_rate, 2),
            'system_metrics': asdict(latest_system) if latest_system else None,
            'endpoint_stats': dict(self.endpoint_stats),
            'error_counts': dict(self.error_counts)
        }
    
    def _format_uptime(self, seconds: float) -> str:
        """Format uptime in human readable format"""
        days = int(seconds // 86400)
        hours = int((seconds % 86400) // 3600)
        minutes = int((seconds % 3600) // 60)
        return f"{days}d {hours}h {minutes}m"

class SystemMonitor:
    """Monitors system resources"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics_collector = metrics_collector
        self.monitoring = False
        self.monitor_thread = None
        
    def start_monitoring(self, interval: int = 60):
        """Start system monitoring"""
        if self.monitoring:
            return
            
        self.monitoring = True
        self.monitor_thread = threading.Thread(
            target=self._monitor_loop,
            args=(interval,),
            daemon=True
        )
        self.monitor_thread.start()
        logger.info("System monitoring started")
    
    def stop_monitoring(self):
        """Stop system monitoring"""
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join()
        logger.info("System monitoring stopped")
    
    def _monitor_loop(self, interval: int):
        """Main monitoring loop"""
        loop_count = 0
        max_loops = 100000  # Reasonable limit to prevent infinite loops
        
        while self.monitoring and loop_count < max_loops:
            try:
                metrics = self._collect_system_metrics()
                self.metrics_collector.record_system_metrics(metrics)
                time.sleep(interval)
                loop_count += 1
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(interval)
                loop_count += 1
    
    def _collect_system_metrics(self) -> SystemMetrics:
        """Collect current system metrics"""
        # CPU and Memory
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        
        # Disk usage
        disk = psutil.disk_usage('/')
        
        # Network connections (approximate)
        connections = len(psutil.net_connections())
        
        # Calculate requests per minute (from API metrics)
        now = time.time()
        recent_requests = sum(
            1 for metric in self.metrics_collector.api_metrics
            if now - metric.timestamp.timestamp() < 60
        )
        
        # Calculate error rate
        recent_errors = sum(
            1 for metric in self.metrics_collector.api_metrics
            if now - metric.timestamp.timestamp() < 60 and metric.status_code >= 400
        )
        error_rate = (recent_errors / recent_requests * 100) if recent_requests > 0 else 0
        
        return SystemMetrics(
            timestamp=datetime.now(),
            cpu_percent=cpu_percent,
            memory_percent=memory.percent,
            memory_used_mb=memory.used / 1024 / 1024,
            memory_total_mb=memory.total / 1024 / 1024,
            disk_usage_percent=disk.percent,
            disk_free_gb=disk.free / 1024 / 1024 / 1024,
            active_connections=connections,
            requests_per_minute=recent_requests,
            error_rate=error_rate
        )

class PerformanceTracker:
    """Tracks performance metrics for requests"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics_collector = metrics_collector
    
    def track_request(self, endpoint: str, method: str, response_time: float, 
                     status_code: int, user_agent: str, ip_address: str):
        """Track a single request"""
        metrics = APIMetrics(
            endpoint=endpoint,
            method=method,
            response_time=response_time,
            status_code=status_code,
            timestamp=datetime.now(),
            user_agent=user_agent,
            ip_address=ip_address
        )
        self.metrics_collector.record_api_call(metrics)

# Global instances
metrics_collector = MetricsCollector()
system_monitor = SystemMonitor(metrics_collector)
performance_tracker = PerformanceTracker(metrics_collector)

def get_metrics_summary() -> Dict[str, Any]:
    """Get a summary of all metrics"""
    return {
        'health': metrics_collector.get_health_status(),
        'api_metrics_count': len(metrics_collector.api_metrics),
        'system_metrics_count': len(metrics_collector.system_metrics),
        'monitoring_active': system_monitor.monitoring
    }

def start_monitoring():
    """Start all monitoring services"""
    system_monitor.start_monitoring()
    logger.info("All monitoring services started")

def stop_monitoring():
    """Stop all monitoring services"""
    system_monitor.stop_monitoring()
    logger.info("All monitoring services stopped")
