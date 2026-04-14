from django.urls import path
from . import views

app_name = "game"

urlpatterns = [
    path("aura/", views.aura_play_view, name="aura_play"),
    path("math-rain/", views.math_rain_view, name="math_rain"),
]