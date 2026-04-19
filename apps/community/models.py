from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import UserGameProfile
from apps.shop.models import UserFontPreference


def community_upload_to(instance, filename):
    now = timezone.now()
    return f"community/{now.strftime('%Y/%m')}/{filename}"


def community_gallery_upload_to(instance, filename):
    now = timezone.now()
    return f"community/gallery/{now.strftime('%Y/%m')}/{filename}"


def _clean_text(value):
    if value is None:
        return ""
    return str(value).strip()


def _email_prefix(user):
    email = _clean_text(getattr(user, "email", ""))
    if email and "@" in email:
        return email.split("@", 1)[0]
    return email


def _font_key_from_item(item):
    if not item:
        return ""
    return _clean_text(getattr(item, "font_family_key", ""))


def resolve_user_display_snapshot(user):
    profile, _ = UserGameProfile.objects.get_or_create(user=user)

    nickname = _clean_text(getattr(profile, "nickname", ""))
    username = _clean_text(getattr(user, "username", ""))
    email_prefix = _email_prefix(user)

    display_name = nickname or email_prefix or username or "User"

    pref = (
        UserFontPreference.objects
        .select_related("nickname_font_item")
        .filter(user=user)
        .first()
    )

    font_key = ""
    effect_key = "none"
    nickname_scale = 1.0
    nickname_letter_spacing = 0.0

    if pref:
        font_key = _font_key_from_item(getattr(pref, "nickname_font_item", None))
        effect_key = _clean_text(getattr(pref, "nickname_effect_key", "")) or "none"
        nickname_scale = float(getattr(pref, "nickname_scale", 1.0) or 1.0)
        nickname_letter_spacing = float(getattr(pref, "nickname_letter_spacing", 0.0) or 0.0)

    return {
        "nickname": display_name,
        "font_key": font_key,
        "effect_key": effect_key,
        "nickname_scale": nickname_scale,
        "nickname_letter_spacing": nickname_letter_spacing,
    }


class CommunityPost(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="community_posts",
    )

    author_nickname_snapshot = models.CharField(max_length=100, blank=True, default="")
    author_font_key_snapshot = models.CharField(max_length=100, blank=True, default="")
    author_effect_key_snapshot = models.CharField(max_length=100, blank=True, default="none")
    author_nickname_scale_snapshot = models.FloatField(default=1.0)
    author_nickname_letter_spacing_snapshot = models.FloatField(default=0.0)

    views = models.PositiveIntegerField(default=0)
    like_count = models.PositiveIntegerField(default=0)

    is_notice = models.BooleanField(default=False)
    notice_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_notice", "notice_order", "-created_at"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        is_create = self.pk is None
        if is_create:
            snapshot = resolve_user_display_snapshot(self.author)
            self.author_nickname_snapshot = snapshot["nickname"]
            self.author_font_key_snapshot = snapshot["font_key"]
            self.author_effect_key_snapshot = snapshot["effect_key"]
            self.author_nickname_scale_snapshot = snapshot["nickname_scale"]
            self.author_nickname_letter_spacing_snapshot = snapshot["nickname_letter_spacing"]
        super().save(*args, **kwargs)


class CommunityPostImage(models.Model):
    post = models.ForeignKey(
        CommunityPost,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(upload_to=community_gallery_upload_to)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"PostImage {self.pk} / Post {self.post_id}"


class CommunityPostLike(models.Model):
    post = models.ForeignKey(
        CommunityPost,
        on_delete=models.CASCADE,
        related_name="likes",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="community_post_likes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("post", "user")

    def __str__(self):
        return f"{self.user} likes post {self.post_id}"


class CommunityComment(models.Model):
    post = models.ForeignKey(
        CommunityPost,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="community_comments",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
    )

    content = models.TextField()

    author_nickname_snapshot = models.CharField(max_length=100, blank=True, default="")
    author_font_key_snapshot = models.CharField(max_length=100, blank=True, default="")
    author_effect_key_snapshot = models.CharField(max_length=100, blank=True, default="none")
    author_nickname_scale_snapshot = models.FloatField(default=1.0)
    author_nickname_letter_spacing_snapshot = models.FloatField(default=0.0)

    like_count = models.PositiveIntegerField(default=0)
    is_collapsed_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"Comment {self.pk} on Post {self.post_id}"

    def save(self, *args, **kwargs):
        is_create = self.pk is None
        if is_create:
            snapshot = resolve_user_display_snapshot(self.author)
            self.author_nickname_snapshot = snapshot["nickname"]
            self.author_font_key_snapshot = snapshot["font_key"]
            self.author_effect_key_snapshot = snapshot["effect_key"]
            self.author_nickname_scale_snapshot = snapshot["nickname_scale"]
            self.author_nickname_letter_spacing_snapshot = snapshot["nickname_letter_spacing"]
        super().save(*args, **kwargs)


class CommunityCommentLike(models.Model):
    comment = models.ForeignKey(
        CommunityComment,
        on_delete=models.CASCADE,
        related_name="likes",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="community_comment_likes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("comment", "user")

    def __str__(self):
        return f"{self.user} likes comment {self.comment_id}"