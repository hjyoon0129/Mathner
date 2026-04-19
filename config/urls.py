from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("apps.core.urls")),
    path("accounts/", include("allauth.urls")),
    path("accounts-api/", include("apps.accounts.urls")),
    path("avatar/", include("apps.avatar.urls")),
    path("shop/", include("apps.shop.urls")),
    path("social/", include("apps.social.urls")),
    path("ranking/", include("apps.ranking.urls")),
    path("support/", include("apps.support.urls")),
    path("game/", include("apps.game.urls")),
    path("community/", include("apps.community.urls")),
]