from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='pdf_conversion_index'),
    path('api/analyze-pdf/', views.analyze_pdf, name='analyze_pdf'),
    path('api/pdf-to-jpg/', views.pdf_to_jpg_view, name='pdf_to_jpg_api'),
]
