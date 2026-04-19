from django.contrib import admin
from .models import RankingProfile, GameScore


@admin.register(RankingProfile)
class RankingProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "updated_at")
    search_fields = ("user__username", "user__email")
    filter_horizontal = ("friends",)


@admin.register(GameScore)
class GameScoreAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "game_mode",
        "operation",
        "score",
        "correct_count",
        "earned_stars",
        "best_combo",
        "played_at",
    )
    search_fields = ("user__username", "user__email")
    list_filter = ("game_mode", "operation", "played_at")
    ordering = ("-played_at", "-correct_count", "-earned_stars")