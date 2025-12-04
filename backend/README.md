
# Django – How to Create a New App & Run the Server

✅ Run the Server
```sh
python manage.py runserver
````

Open in browser:
[http://127.0.0.1:8000/](http://127.0.0.1:8000/)

---

## ✅ Create a New App

```sh
python manage.py startapp appname
```

---

## ✅ Add App to Settings

In `myproject/settings.py`, add your app:

```python
INSTALLED_APPS = [
    ...,
    'appname',
]
```

---

## ✅ Create a Simple View

In `appname/views.py`:

```python
from django.http import HttpResponse

def index(request):
    return HttpResponse("Hello Django!")
```

---

## ✅ Add URL

In `myproject/urls.py`:

```python
from django.contrib import admin
from django.urls import path
from appname.views import index

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', index),
]
```


