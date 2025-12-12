from django.urls import path
from . import views

urlpatterns = [
    path('protect-pdf/', views.protect_pdf_api, name='protect_pdf_api'),
    path('unlock-pdf/', views.unlock_pdf_api, name='unlock_pdf_api'),
]
