from django.urls import path
from . import views

app_name = "core"

urlpatterns = [
    path("", views.landing_view, name="landing"),
    path("app/", views.app_home_view, name="app_home"),
    path("play/", views.play_view, name="play"),

    path("start-game-run/", views.start_game_run, name="start_game_run"),
    path("save-game-result/", views.save_game_result, name="save_game_result"),

    path("privacy/", views.privacy_view, name="privacy"),
    path("terms/", views.terms_view, name="terms"),
    path("refund/", views.refund_view, name="refund"),
]