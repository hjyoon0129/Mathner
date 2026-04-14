from django.urls import path
from . import views

app_name = "avatar"

urlpatterns = [
    path("my-room/", views.my_room_view, name="my_room"),
    path("room/<str:username>/", views.room_view, name="room"),

    path("api/inventory/", views.avatar_inventory, name="avatar_inventory"),
    path("api/save-avatar-state/", views.save_avatar_state, name="save_avatar_state"),
    path("api/save-font-preference/", views.save_font_preference, name="save_font_preference"),
    path("api/reset-avatar-state/", views.reset_avatar_state, name="reset_avatar_state"),

    path("api/save-room-state/", views.save_room_state, name="save_room_state"),
    path("api/reset-room/", views.reset_room, name="reset_room"),
]