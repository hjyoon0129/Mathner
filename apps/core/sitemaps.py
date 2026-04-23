from django.contrib.sitemaps import Sitemap


class StaticViewSitemap(Sitemap):
    protocol = "https"
    priority = 0.8
    changefreq = "daily"

    def items(self):
        return [
            "/",
            "/avatar/room/",
            "/game/Math_rain/",
            "/game/aura_play/",
            "/ranking/",
            "/social/",
        ]

    def location(self, item):
        return item