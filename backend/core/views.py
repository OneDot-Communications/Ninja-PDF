from django.http import FileResponse, HttpResponse
import os
from django.conf import settings

def home(request):
    index_path = os.path.join(settings.BASE_DIR, 'static', 'index.html')
    return FileResponse(open(index_path, 'rb'))
