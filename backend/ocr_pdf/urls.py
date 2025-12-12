from django.urls import path
from . import views

urlpatterns = [
    # Template view
    path('', views.ocr_pdf_view, name='ocr_pdf'),
    
    # API endpoints
    path('process/', views.ocr_pdf_api, name='ocr_pdf_api'),
    path('extract-text/', views.extract_text_api, name='extract_text_api'),
]
