from django.conf import settings
from django.contrib import admin
from django.contrib.sitemaps.views import sitemap
from django.urls import include, path

from apps.core.sitemaps import StaticViewSitemap
from apps.core.views import robots_txt

sitemaps = {
    "static": StaticViewSitemap,
}

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),

    path("robots.txt", robots_txt),
    path("sitemap.xml", sitemap, {"sitemaps": sitemaps}, name="django.contrib.sitemaps.views.sitemap"),

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