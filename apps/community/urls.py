from django.urls import path

from . import views

app_name = "community"

urlpatterns = [
    path("", views.community_home, name="home"),
    path("create/", views.community_create, name="create"),
    path("<int:pk>/", views.community_detail, name="detail"),
    path("<int:pk>/edit/", views.community_edit, name="edit"),
    path("<int:pk>/delete/", views.community_delete, name="delete"),
    path("<int:pk>/like/", views.community_like_toggle, name="like_toggle"),
    path("<int:pk>/comment/", views.community_comment_create, name="comment_create"),
    path("comment/<int:pk>/edit/", views.community_comment_edit, name="comment_edit"),
    path("comment/<int:pk>/delete/", views.community_comment_delete, name="comment_delete"),
    path("comment/<int:pk>/like/", views.community_comment_like_toggle, name="comment_like_toggle"),
]