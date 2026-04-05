from django.urls import path
from . import views

app_name = "ranking"

urlpatterns = [
    path("", views.ranking_home, name="home"),
    path("api/leaderboard/", views.api_leaderboard, name="api_leaderboard"),
    path("api/friend-nearby/", views.api_friend_nearby_rank, name="api_friend_nearby_rank"),
    path("api/record-score/", views.api_record_score, name="api_record_score"),
]