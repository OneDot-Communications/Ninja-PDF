from django.urls import path
from . import views

urlpatterns = [
    path('', views.index_view, name='to_pdf_index'),
    path('word-to-pdf/', views.word_to_pdf_view, name='word_to_pdf'),
    path('powerpoint-to-pdf/', views.powerpoint_to_pdf_view, name='powerpoint_to_pdf'),
    path('excel-to-pdf/', views.excel_to_pdf_view, name='excel_to_pdf'),
    path('jpg-to-pdf/', views.jpg_to_pdf_view, name='jpg_to_pdf'),
    path('html-to-pdf/', views.html_to_pdf_view, name='html_to_pdf'),
    path('markdown-to-pdf/', views.markdown_to_pdf_view, name='markdown_to_pdf'),
    path('protect-pdf/', views.protect_pdf_view, name='protect_pdf'),
    path('unlock-pdf/', views.unlock_pdf_view, name='unlock_pdf'),
]