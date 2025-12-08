from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='pdf_conversion_index'),
    path('api/analyze-pdf/', views.analyze_pdf, name='analyze_pdf'),
    path('api/pdf-to-jpg/', views.pdf_to_jpg_view, name='pdf_to_jpg_api'),
    path('api/pdf-to-excel/', views.pdf_to_excel_view, name='pdf_to_excel_api'),
    path('api/pdf-to-powerpoint/', views.pdf_to_powerpoint_view, name='pdf_to_powerpoint_api'),
    path('api/pdf-to-word/', views.pdf_to_word_view, name='pdf_to_word_api'),
    path('api/pdf-to-pdfa/', views.pdf_to_pdfa_view, name='pdf_to_pdfa_api'),
    path('api/pdf-to-html/', views.pdf_to_html_view, name='pdf_to_html_api'),
]
