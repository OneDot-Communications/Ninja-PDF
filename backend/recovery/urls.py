from django.urls import path
from . import views

urlpatterns = [
    path('repair-pdf/', views.repair_pdf_api, name='repair_pdf_api'),
    path('validate-pdf/', views.validate_pdf_api, name='validate_pdf_api'),
    path('scan-to-pdf/', views.scan_to_pdf_api, name='scan_to_pdf_api'),
    path('batch-scan-to-pdf/', views.batch_scan_to_pdf_api, name='batch_scan_to_pdf_api'),
]
