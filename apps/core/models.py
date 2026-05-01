from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

class PageViewLog(models.Model):
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    path = models.CharField(max_length=500)
    visit_date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["path"]),
            models.Index(fields=["visit_date"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.path} - {self.visit_date}"

class VisitorLog(models.Model):
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True, null=True)
    path = models.CharField(max_length=500, blank=True, null=True)
    visit_date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("ip_address", "visit_date")
        indexes = [
            models.Index(fields=["visit_date"]),
            models.Index(fields=["ip_address"]),
        ]

    def __str__(self):
        return f"{self.ip_address} - {self.visit_date}"



class GameEventLog(models.Model):
    EVENT_GAME_START = "game_start"
    EVENT_GAME_FINISH = "game_finish"
    EVENT_LOGIN_CLICK = "login_click"
    EVENT_SIGNUP = "signup"

    EVENT_CHOICES = [
        (EVENT_GAME_START, "Game Start"),
        (EVENT_GAME_FINISH, "Game Finish"),
        (EVENT_LOGIN_CLICK, "Login Click"),
        (EVENT_SIGNUP, "Signup"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="game_event_logs",
    )
    event_type = models.CharField(max_length=50, choices=EVENT_CHOICES)
    game_name = models.CharField(max_length=50, blank=True, default="")

    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    path = models.CharField(max_length=500, blank=True, default="")
    session_key = models.CharField(max_length=80, blank=True, default="")

    score = models.PositiveIntegerField(default=0)
    correct = models.PositiveIntegerField(default=0)
    gained_stars = models.PositiveIntegerField(default=0)
    reason = models.CharField(max_length=100, blank=True, default="")
    meta = models.JSONField(default=dict, blank=True)

    event_date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["event_type"]),
            models.Index(fields=["game_name"]),
            models.Index(fields=["event_date"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.event_type} / {self.game_name or '-'} / {self.event_date}"


DEFAULT_DAILY_KEYS = 3
NICKNAME_CHANGE_COOLDOWN_DAYS = 30


class UserGameProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="game_profile",
    )
    nickname = models.CharField(max_length=50, blank=True)

    total_stars = models.PositiveIntegerField(default=0)
    total_correct = models.PositiveIntegerField(default=0)
    best_score = models.PositiveIntegerField(default=0)

    remaining_keys = models.PositiveIntegerField(default=DEFAULT_DAILY_KEYS)
    keys_updated_at = models.DateField(default=timezone.localdate)

    nickname_changed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("id",)

    def __str__(self):
        return self.nickname or self.user.username or getattr(self.user, "email", "") or f"User {self.user_id}"

    def get_display_name(self):
        return self.nickname or self.user.username or getattr(self.user, "email", "") or "User"

    def refresh_daily_keys_if_needed(self):
        """
        날짜가 바뀌면:
        - 키가 0,1,2면 최소 기본키 3개로 보충
        - admin이 100개처럼 더 많이 넣어준 경우는 유지
        """
        today = timezone.localdate()

        if self.keys_updated_at != today:
            current_keys = max(0, int(self.remaining_keys or 0))
            self.remaining_keys = max(current_keys, DEFAULT_DAILY_KEYS)
            self.keys_updated_at = today
            self.save(update_fields=["remaining_keys", "keys_updated_at", "updated_at"])

    def get_remaining_keys(self):
        self.refresh_daily_keys_if_needed()
        return max(0, int(self.remaining_keys or 0))

    def consume_key(self):
        self.refresh_daily_keys_if_needed()

        if self.remaining_keys <= 0:
            return False

        self.remaining_keys = max(0, int(self.remaining_keys or 0) - 1)
        self.keys_updated_at = timezone.localdate()
        self.save(update_fields=["remaining_keys", "keys_updated_at", "updated_at"])
        return True

    def add_keys(self, amount):
        amount = max(0, int(amount or 0))
        if amount <= 0:
            return

        self.remaining_keys = max(0, int(self.remaining_keys or 0)) + amount
        self.save(update_fields=["remaining_keys", "updated_at"])

    def reset_keys_to_default(self):
        self.remaining_keys = DEFAULT_DAILY_KEYS
        self.keys_updated_at = timezone.localdate()
        self.save(update_fields=["remaining_keys", "keys_updated_at", "updated_at"])

    def apply_run_result(self, gained_stars=0, correct=0, score=0):
        self.total_stars = int(self.total_stars or 0) + max(0, int(gained_stars or 0))
        self.total_correct = int(self.total_correct or 0) + max(0, int(correct or 0))
        self.best_score = max(int(self.best_score or 0), max(0, int(score or 0)))
        self.save(update_fields=["total_stars", "total_correct", "best_score", "updated_at"])

    def can_change_nickname(self):
        if not self.nickname:
            return True
        if not self.nickname_changed_at:
            return True
        return timezone.now() >= self.nickname_changed_at + timedelta(days=NICKNAME_CHANGE_COOLDOWN_DAYS)

    def get_nickname_change_available_at(self):
        if not self.nickname_changed_at:
            return timezone.now()
        return self.nickname_changed_at + timedelta(days=NICKNAME_CHANGE_COOLDOWN_DAYS)

    def get_nickname_change_remaining_days(self):
        available_at = self.get_nickname_change_available_at()
        delta = available_at - timezone.now()
        if delta.total_seconds() <= 0:
            return 0
        return max(1, delta.days + (1 if delta.seconds > 0 else 0))