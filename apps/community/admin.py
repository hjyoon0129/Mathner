from django.contrib import admin

from .models import (
    CommunityComment,
    CommunityCommentLike,
    CommunityPost,
    CommunityPostImage,
    CommunityPostLike,
)


class CommunityPostImageInline(admin.TabularInline):
    model = CommunityPostImage
    extra = 1


@admin.register(CommunityPost)
class CommunityPostAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "author_nickname_snapshot",
        "is_notice",
        "notice_order",
        "views",
        "like_count",
        "created_at",
    )
    list_filter = ("is_notice", "created_at")
    search_fields = ("title", "content", "author_nickname_snapshot", "author__username")
    ordering = ("-is_notice", "notice_order", "-created_at")
    readonly_fields = (
        "views",
        "like_count",
        "created_at",
        "updated_at",
        "author_nickname_snapshot",
        "author_font_key_snapshot",
        "author_effect_key_snapshot",
        "author_nickname_scale_snapshot",
        "author_nickname_letter_spacing_snapshot",
    )
    inlines = [CommunityPostImageInline]


@admin.register(CommunityPostImage)
class CommunityPostImageAdmin(admin.ModelAdmin):
    list_display = ("id", "post", "sort_order")


@admin.register(CommunityPostLike)
class CommunityPostLikeAdmin(admin.ModelAdmin):
    list_display = ("id", "post", "user", "created_at")


@admin.register(CommunityComment)
class CommunityCommentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "post",
        "author_nickname_snapshot",
        "parent",
        "like_count",
        "created_at",
    )
    search_fields = ("content", "author_nickname_snapshot", "author__username")


@admin.register(CommunityCommentLike)
class CommunityCommentLikeAdmin(admin.ModelAdmin):
    list_display = ("id", "comment", "user", "created_at")