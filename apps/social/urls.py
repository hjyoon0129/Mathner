from django.urls import path

from apps.social import views

app_name = "social"

urlpatterns = [
    path("api/guestbook/<str:username>/create/", views.create_guestbook_entry_api, name="guestbook_create"),
    path("api/diary/create/", views.create_diary_entry_api, name="diary_create"),

    path("api/users/search/", views.search_users_api, name="user_search"),
    path("api/friends/request/<str:username>/", views.send_friend_request_api, name="friend_request"),
    path("api/friends/requests/", views.my_friend_requests_api, name="friend_requests"),
    path("api/friends/respond/<int:friendship_id>/", views.respond_friend_request_api, name="friend_respond"),
    path("api/friends/list/", views.my_friends_api, name="friend_list"),

    path("api/rooms/list/", views.room_directory_api, name="room_directory"),
    path("api/rooms/<str:username>/visit/", views.record_room_visit_api, name="room_visit"),
    path("api/rooms/<str:username>/stats/", views.room_stats_api, name="room_stats"),
    path("api/rooms/<str:username>/like-toggle/", views.toggle_room_like_api, name="room_like_toggle"),
]