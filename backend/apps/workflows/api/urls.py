"""Workflows API URLs"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.workflows.api.views import WorkflowViewSet, TaskViewSet

router = DefaultRouter()
router.register(r'workflows', WorkflowViewSet, basename='workflows')
router.register(r'tasks', TaskViewSet, basename='tasks')

urlpatterns = [
    path('', include(router.urls)),
]
