from django.urls import path
from . import views

urlpatterns = [
    path('compress-pdf/', views.compress_pdf_view, name='compress_pdf'),
    path('compress-image/', views.compress_image_view, name='compress_image'),
    path('compress-pdf-ui/', views.compress_pdf_index, name='compress_pdf_index'),
    path('compress-image-ui/', views.compress_image_index, name='compress_image_index'),
    path('merge/', views.merge_pdf_view, name='merge_pdf'),
    path('split/', views.split_pdf_view, name='split_pdf'),
    path('organize/', views.organize_pdf_view, name='organize_pdf'),
    path('flatten/', views.flatten_pdf_view, name='flatten_pdf'),
]
