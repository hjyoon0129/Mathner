from django.urls import path
from . import views

app_name = "support"

urlpatterns = [
    path("inquiry/", views.inquiry_create, name="inquiry_create"),
    path("inquiry/success/", views.inquiry_success, name="inquiry_success"),
]