"""Teams API URLs"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.teams.api.views import TeamViewSet, TeamMembershipViewSet

router = DefaultRouter()
router.register(r'', TeamViewSet, basename='teams')
router.register(r'memberships', TeamMembershipViewSet, basename='team-memberships')

urlpatterns = [
    path('', include(router.urls)),
]
