from django.urls import path, include
from to_pdf.views import clean_pdf_metadata_api
from pdf_editing.organize_pdf import organize_pdf_api
from pdf_editing.redact_pdf import redact_pdf_api

urlpatterns = [
    path('edit/clean-metadata/', clean_pdf_metadata_api, name='clean_metadata_api'),
    path('edit/organize/', organize_pdf_api, name='organize_pdf_api'),
    path('edit/redact/', redact_pdf_api, name='redact_pdf_api'),
    path('recovery/', include('recovery.urls')),
    path('pdf-operations/', include('pdf_operations.urls')),
    path('ocr/', include('ocr_pdf.urls')),
    path('security/', include('security.urls')),
]
