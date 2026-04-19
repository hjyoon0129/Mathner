from django.conf import settings
from django.db import models
from django.db.models import F, Q
from django.utils import timezone


EFFECT_NONE = "none"
EFFECT_NEON_BLUE = "neon_blue"
EFFECT_RAINBOW_FLOW = "rainbow_flow"
EFFECT_GOLD_GLOW = "gold_glow"
EFFECT_SPARKLE = "sparkle"
EFFECT_GLITCH = "glitch"
EFFECT_FLOAT_WAVE = "float_wave"
EFFECT_FIRE_GLOW = "fire_glow"
EFFECT_ICE_GLOW = "ice_glow"

EFFECT_CHOICES = [
    (EFFECT_NONE, "None"),
    (EFFECT_NEON_BLUE, "Neon Blue"),
    (EFFECT_RAINBOW_FLOW, "Rainbow Flow"),
    (EFFECT_GOLD_GLOW, "Gold Glow"),
    (EFFECT_SPARKLE, "Sparkle"),
    (EFFECT_GLITCH, "Glitch"),
    (EFFECT_FLOAT_WAVE, "Float Wave"),
    (EFFECT_FIRE_GLOW, "Fire Glow"),
    (EFFECT_ICE_GLOW, "Ice Glow"),
]


class Friendship(models.Model):
    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_REJECTED = "rejected"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_REJECTED, "Rejected"),
    ]

    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_friendships",
        db_index=True,
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_friendships",
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["from_user", "to_user"],
                name="uniq_friendship_from_to",
            ),
            models.CheckConstraint(
                condition=~Q(from_user=F("to_user")),
                name="friendship_no_self_link",
            ),
        ]
        indexes = [
            models.Index(fields=["from_user", "status"]),
            models.Index(fields=["to_user", "status"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.from_user_id}->{self.to_user_id} ({self.status})"


class Room(models.Model):
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="room",
    )
    today_visits = models.PositiveIntegerField(default=0)
    total_visits = models.PositiveIntegerField(default=0)
    like_count = models.PositiveIntegerField(default=0)
    last_visit_date = models.DateField(null=True, blank=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["owner"]),
            models.Index(fields=["last_visit_date"]),
        ]

    def __str__(self):
        return f"Room<{self.owner_id}>"


class RoomVisit(models.Model):
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="visits",
        db_index=True,
    )
    viewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="room_visits",
        db_index=True,
    )
    guest_token = models.CharField(max_length=120, blank=True, default="", db_index=True)
    visited_on = models.DateField(default=timezone.localdate, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["room", "visited_on"]),
            models.Index(fields=["room", "viewer", "visited_on"]),
            models.Index(fields=["room", "guest_token", "visited_on"]),
        ]

    def __str__(self):
        return f"Visit(room={self.room_id}, viewer={self.viewer_id}, date={self.visited_on})"


class RoomLike(models.Model):
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="likes",
        db_index=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="room_likes",
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["room", "user"],
                name="uniq_room_like_room_user",
            )
        ]
        indexes = [
            models.Index(fields=["room", "-created_at"]),
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self):
        return f"RoomLike(room={self.room_id}, user={self.user_id})"


class GuestbookEntry(models.Model):
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="guestbook_entries",
        db_index=True,
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_index=True,
        related_name="guestbook_entries",
    )
    content = models.TextField()

    nickname_font_key = models.CharField(max_length=50, blank=True, default="")
    nickname_effect_key = models.CharField(max_length=30, choices=EFFECT_CHOICES, default=EFFECT_NONE)
    nickname_scale = models.FloatField(default=1.0)
    nickname_letter_spacing = models.FloatField(default=0.0)

    content_font_key = models.CharField(max_length=50, blank=True, default="")
    content_effect_key = models.CharField(max_length=30, choices=EFFECT_CHOICES, default=EFFECT_NONE)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["room", "-created_at"]),
            models.Index(fields=["author", "-created_at"]),
        ]

    def __str__(self):
        return f"GuestbookEntry<{self.id}>"


class GuestbookReply(models.Model):
    entry = models.ForeignKey(
        GuestbookEntry,
        on_delete=models.CASCADE,
        related_name="replies",
        db_index=True,
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_index=True,
        related_name="guestbook_replies",
    )
    content = models.TextField()

    nickname_font_key = models.CharField(max_length=50, blank=True, default="")
    nickname_effect_key = models.CharField(max_length=30, choices=EFFECT_CHOICES, default=EFFECT_NONE)
    nickname_scale = models.FloatField(default=1.0)
    nickname_letter_spacing = models.FloatField(default=0.0)

    content_font_key = models.CharField(max_length=50, blank=True, default="")
    content_effect_key = models.CharField(max_length=30, choices=EFFECT_CHOICES, default=EFFECT_NONE)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["entry", "created_at"]),
        ]

    def __str__(self):
        return f"GuestbookReply<{self.id}>"


class DiaryEntry(models.Model):
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="diary_entries",
        db_index=True,
    )
    title = models.CharField(max_length=200)
    content = models.TextField()

    title_font_key = models.CharField(max_length=50, blank=True, default="")
    title_effect_key = models.CharField(max_length=30, choices=EFFECT_CHOICES, default=EFFECT_NONE)
    content_font_key = models.CharField(max_length=50, blank=True, default="")
    content_effect_key = models.CharField(max_length=30, choices=EFFECT_CHOICES, default=EFFECT_NONE)

    entry_date = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["room", "entry_date"],
                name="uniq_room_entry_date",
            ),
        ]
        indexes = [
            models.Index(fields=["room", "entry_date"]),
            models.Index(fields=["room", "-created_at"]),
        ]

    def __str__(self):
        return f"DiaryEntry(room={self.room_id}, date={self.entry_date})"