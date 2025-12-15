"""
Observability & Monitoring
Enterprise metrics, dashboards, and alerting.
"""
from django.db.models import Count, Sum, Avg
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class MetricsCollector:
    """Collects and aggregates system metrics."""
    
    @classmethod
    def get_job_metrics(cls, hours: int = 24) -> dict:
        """Get job lifecycle metrics for last N hours."""
        from core.job_orchestration import Job
        
        cutoff = timezone.now() - timedelta(hours=hours)
        jobs = Job.objects.filter(created_at__gte=cutoff)
        
        by_status = dict(jobs.values('status').annotate(count=Count('id')).values_list('status', 'count'))
        
        completed = jobs.filter(status='COMPLETED')
        avg_duration = completed.aggregate(avg=Avg('duration_seconds'))['avg'] or 0
        
        return {
            'period_hours': hours,
            'total': jobs.count(),
            'by_status': by_status,
            'pending': by_status.get('PENDING', 0),
            'queued': by_status.get('QUEUED', 0),
            'processing': by_status.get('PROCESSING', 0),
            'completed': by_status.get('COMPLETED', 0),
            'failed': by_status.get('FAILED', 0),
            'dead_letter': by_status.get('DEAD_LETTER', 0),
            'avg_duration_seconds': round(avg_duration, 2),
            'success_rate': cls._calculate_success_rate(by_status),
        }
    
    @staticmethod
    def _calculate_success_rate(by_status: dict) -> float:
        completed = by_status.get('COMPLETED', 0)
        failed = by_status.get('FAILED', 0) + by_status.get('DEAD_LETTER', 0)
        total = completed + failed
        return round((completed / total * 100) if total > 0 else 100, 2)
    
    @classmethod
    def get_file_metrics(cls) -> dict:
        """Get file storage metrics."""
        from apps.files.models.user_file import UserFile
        
        files = UserFile.objects.all()
        active = files.exclude(status__in=['DELETED', 'EXPIRED'])
        
        by_status = dict(files.values('status').annotate(count=Count('id')).values_list('status', 'count'))
        
        storage = active.aggregate(
            total_bytes=Sum('size_bytes'),
            avg_size=Avg('size_bytes'),
            count=Count('id')
        )
        
        return {
            'total_files': files.count(),
            'active_files': storage['count'] or 0,
            'by_status': by_status,
            'total_storage_bytes': storage['total_bytes'] or 0,
            'total_storage_gb': round((storage['total_bytes'] or 0) / (1024**3), 2),
            'avg_file_size_mb': round((storage['avg_size'] or 0) / (1024**2), 2),
        }
    
    @classmethod
    def get_user_metrics(cls) -> dict:
        """Get user activity metrics."""
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        total = User.objects.count()
        active_24h = User.objects.filter(last_login__gte=now - timedelta(hours=24)).count()
        active_7d = User.objects.filter(last_login__gte=week_ago).count()
        new_30d = User.objects.filter(date_joined__gte=month_ago).count()
        
        return {
            'total_users': total,
            'active_last_24h': active_24h,
            'active_last_7d': active_7d,
            'new_last_30d': new_30d,
        }
    
    @classmethod
    def get_queue_depth(cls) -> dict:
        """Get current queue depths."""
        from core.job_orchestration import Job
        
        queued = Job.objects.filter(status__in=['PENDING', 'QUEUED'])
        
        by_queue = dict(
            queued.values('queue_name').annotate(count=Count('id')).values_list('queue_name', 'count')
        )
        
        return {
            'high_priority': by_queue.get('high_priority', 0),
            'default': by_queue.get('default', 0),
            'total': sum(by_queue.values()),
        }
    
    @classmethod
    def get_error_rate(cls, hours: int = 24) -> dict:
        """Get error rate for last N hours."""
        from core.job_orchestration import Job
        
        cutoff = timezone.now() - timedelta(hours=hours)
        jobs = Job.objects.filter(created_at__gte=cutoff)
        
        total = jobs.count()
        failed = jobs.filter(status__in=['FAILED', 'DEAD_LETTER']).count()
        
        return {
            'period_hours': hours,
            'total_jobs': total,
            'failed_jobs': failed,
            'error_rate_percent': round((failed / total * 100) if total > 0 else 0, 2),
        }


class DashboardService:
    """Dashboard data aggregation service."""
    
    @classmethod
    def get_admin_dashboard(cls) -> dict:
        """Get complete admin dashboard data."""
        return {
            'jobs': MetricsCollector.get_job_metrics(24),
            'files': MetricsCollector.get_file_metrics(),
            'users': MetricsCollector.get_user_metrics(),
            'queue': MetricsCollector.get_queue_depth(),
            'errors': MetricsCollector.get_error_rate(24),
            'system': cls._get_system_health(),
            'generated_at': timezone.now().isoformat(),
        }
    
    @classmethod
    def _get_system_health(cls) -> dict:
        """Get system health indicators."""
        health = {
            'database': cls._check_database(),
            'cache': cls._check_cache(),
            'storage': cls._check_storage(),
            'celery': cls._check_celery(),
        }
        
        health['status'] = 'healthy' if all(v['status'] == 'up' for v in health.values()) else 'degraded'
        
        return health
    
    @staticmethod
    def _check_database() -> dict:
        from django.db import connection
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            return {'status': 'up', 'latency_ms': 0}
        except Exception as e:
            return {'status': 'down', 'error': str(e)}
    
    @staticmethod
    def _check_cache() -> dict:
        try:
            cache.set('health_check', 'ok', 10)
            if cache.get('health_check') == 'ok':
                return {'status': 'up'}
            return {'status': 'degraded'}
        except Exception as e:
            return {'status': 'down', 'error': str(e)}
    
    @staticmethod
    def _check_storage() -> dict:
        from core.storage import StorageService
        try:
            backend = StorageService.get_backend_name()
            return {'status': 'up', 'backend': backend}
        except Exception as e:
            return {'status': 'down', 'error': str(e)}
    
    @staticmethod
    def _check_celery() -> dict:
        try:
            from core.celery import app
            inspect = app.control.inspect()
            stats = inspect.stats()
            if stats:
                return {'status': 'up', 'workers': len(stats)}
            return {'status': 'down', 'workers': 0}
        except Exception:
            return {'status': 'unknown', 'workers': 0}


class AlertService:
    """System alerting service."""
    
    THRESHOLDS = {
        'queue_depth': 100,
        'error_rate': 10,
        'storage_percent': 90,
    }
    
    @classmethod
    def check_alerts(cls) -> list:
        """Check all alert conditions and return active alerts."""
        alerts = []
        
        queue = MetricsCollector.get_queue_depth()
        if queue['total'] > cls.THRESHOLDS['queue_depth']:
            alerts.append({
                'type': 'QUEUE_DEPTH',
                'severity': 'warning',
                'message': f"Queue depth is {queue['total']} (threshold: {cls.THRESHOLDS['queue_depth']})",
            })
        
        errors = MetricsCollector.get_error_rate(1)
        if errors['error_rate_percent'] > cls.THRESHOLDS['error_rate']:
            alerts.append({
                'type': 'ERROR_RATE',
                'severity': 'critical',
                'message': f"Error rate is {errors['error_rate_percent']}% in last hour",
            })
        
        return alerts


def get_job_lifecycle_metrics() -> dict:
    """Convenience function."""
    return MetricsCollector.get_job_metrics()


def get_file_state_metrics() -> dict:
    """Convenience function."""
    return MetricsCollector.get_file_metrics()


def get_dashboard_data() -> dict:
    """Convenience function."""
    return DashboardService.get_admin_dashboard()
