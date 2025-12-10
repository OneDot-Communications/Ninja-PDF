from django.urls import path, include
from to_pdf.views import clean_pdf_metadata_api

urlpatterns = [
    path('edit/clean-metadata/', clean_pdf_metadata_api, name='clean_metadata_api'),
    path('recovery/', include('recovery.urls')),
]
