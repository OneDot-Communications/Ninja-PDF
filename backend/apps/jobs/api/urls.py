from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.jobs.api.views import JobViewSet
from apps.jobs.api.batch_views import (
    CreateBatchJobView,
    BatchJobStatusView,
    BatchJobListView,
    CancelBatchJobView,
    BatchJobDownloadView,
)

router = DefaultRouter()
router.register(r'jobs', JobViewSet, basename='jobs')

urlpatterns = [
    path('', include(router.urls)),
    
    # Batch Processing (Premium)
    path('batch/', CreateBatchJobView.as_view(), name='create-batch'),
    path('batch/list/', BatchJobListView.as_view(), name='batch-list'),
    path('batch/<uuid:batch_id>/', BatchJobStatusView.as_view(), name='batch-status'),
    path('batch/<uuid:batch_id>/cancel/', CancelBatchJobView.as_view(), name='batch-cancel'),
    path('batch/<uuid:batch_id>/download/', BatchJobDownloadView.as_view(), name='batch-download'),
]

