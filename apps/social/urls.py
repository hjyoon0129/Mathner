from django.urls import path
from . import views

app_name = "social"

urlpatterns = [
    path("", views.social_hub, name="hub"),

    path("api/friends/requests/", views.friend_requests, name="friend_requests"),
    path("api/friends/list/", views.friend_list, name="friend_list"),
    path("api/rooms/list/", views.room_directory, name="room_directory"),

    path("api/friends/request/<str:username>/", views.friend_request_toggle, name="friend_request_toggle"),
    path("api/friends/respond/<int:friendship_id>/", views.friend_request_respond, name="friend_request_respond"),

    path("api/rooms/<str:username>/stats/", views.room_stats_api, name="room_stats"),
    path("api/rooms/<str:username>/visit/", views.room_visit_api, name="room_visit"),
    path("api/rooms/<str:username>/like/", views.room_like_toggle_api, name="room_like_toggle"),

    path("api/guestbook/<str:username>/list/", views.guestbook_list_api, name="guestbook_list"),
    path("api/guestbook/<str:username>/create/", views.guestbook_create_api, name="guestbook_create"),
    path("api/guestbook/<int:entry_id>/delete/", views.guestbook_delete_api, name="guestbook_delete"),
    path("api/guestbook/<int:entry_id>/reply/create/", views.guestbook_reply_create_api, name="guestbook_reply_create"),
    path("api/guestbook/reply/<int:reply_id>/delete/", views.guestbook_reply_delete_api, name="guestbook_reply_delete"),

    path("api/diary/create/", views.diary_create_api, name="diary_create"),
    path("api/diary/<str:username>/calendar/", views.diary_calendar_api, name="diary_calendar"),
    path("api/diary/<str:username>/date/<str:date_str>/", views.diary_entry_by_date_api, name="diary_entry_by_date"),
    path("api/diary/<int:entry_id>/update/", views.diary_update_api, name="diary_update"),
    path("api/diary/<int:entry_id>/delete/", views.diary_delete_api, name="diary_delete"),
]