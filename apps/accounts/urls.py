from django.urls import path
from .views import save_nickname

app_name = "accounts"

urlpatterns = [
    path("save-nickname/", save_nickname, name="save_nickname"),
]