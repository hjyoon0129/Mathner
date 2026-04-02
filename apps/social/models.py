from django.conf import settings
from django.db import models
from django.utils import timezone


class Friendship(models.Model):
    STATUS_PENDING = "pending"
    STATUS_ACCEPTED = "accepted"
    STATUS_BLOCKED = "blocked"
    STATUS_REJECTED = "rejected"

    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_BLOCKED, "Blocked"),
        (STATUS_REJECTED, "Rejected"),
    )

    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_friendships",
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_friendships",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("from_user", "to_user")
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.from_user_id}->{self.to_user_id} ({self.status})"


class RoomGuestbookEntry(models.Model):
    room_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="room_guestbook_entries",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="written_guestbook_entries",
    )
    content = models.TextField(max_length=300)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"Guestbook<{self.author_id}->{self.room_owner_id}>"


class RoomDiaryEntry(models.Model):
    VISIBILITY_PRIVATE = "private"
    VISIBILITY_FRIENDS = "friends"
    VISIBILITY_PUBLIC = "public"

    VISIBILITY_CHOICES = (
        (VISIBILITY_PRIVATE, "Private"),
        (VISIBILITY_FRIENDS, "Friends"),
        (VISIBILITY_PUBLIC, "Public"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="room_diaries",
    )
    title = models.CharField(max_length=120)
    content = models.TextField(max_length=2000)
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default=VISIBILITY_FRIENDS)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"Diary<{self.user_id}:{self.title}>"


class RoomLike(models.Model):
    room_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_room_likes",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="given_room_likes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("room_owner", "user")
        ordering = ("-created_at",)

    def __str__(self):
        return f"Like<{self.user_id}->{self.room_owner_id}>"


class RoomVisitLog(models.Model):
    room_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="room_visit_logs",
    )
    visitor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="visited_room_logs",
    )
    visit_date = models.DateField(default=timezone.localdate)
    visit_count = models.PositiveIntegerField(default=0)
    last_visited_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("room_owner", "visitor", "visit_date")
        ordering = ("-last_visited_at",)

    def __str__(self):
        return f"Visit<{self.visitor_id}->{self.room_owner_id}:{self.visit_date}:{self.visit_count}>"