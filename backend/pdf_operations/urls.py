from django.urls import path
from . import views

urlpatterns = [
    # Template views
    path('merge/', views.merge_pdf_view, name='merge_pdf'),
    path('split/', views.split_pdf_view, name='split_pdf'),
    path('compare/', views.compare_pdf_view, name='compare_pdf'),
    
    # API endpoints
    path('merge-pdf/', views.merge_pdf_api, name='merge_pdf_api'),
    path('split-pdf/', views.split_pdf_api, name='split_pdf_api'),
    path('compare-pdf/', views.compare_pdf_api, name='compare_pdf_api'),
    path('pdf-info/', views.pdf_info_api, name='pdf_info_api'),
]
