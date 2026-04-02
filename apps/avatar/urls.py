from django.urls import path
from . import views

app_name = "avatar"

urlpatterns = [
    path("my-room/", views.my_room_view, name="my_room"),
    path("room/<str:username>/", views.room_view, name="room"),

    # 새 저장 방식
    path("api/save-room-state/", views.save_room_state, name="save_room_state"),
    path("api/reset-room/", views.reset_room, name="reset_room"),
]