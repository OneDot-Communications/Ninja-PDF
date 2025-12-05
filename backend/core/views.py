from django.shortcuts import render
from django.http import FileResponse, HttpResponse
import os
from django.conf import settings

def home(request):
    return FileResponse(open(os.path.join(settings.BASE_DIR, 'static/index.html'), 'rb'))
