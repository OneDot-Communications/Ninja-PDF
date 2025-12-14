from rest_framework.routers import DefaultRouter
from .views import TeamViewSet, MembershipViewSet

router = DefaultRouter()
router.register(r'teams', TeamViewSet, basename='team')
router.register(r'memberships', MembershipViewSet, basename='membership')

urlpatterns = router.urls
