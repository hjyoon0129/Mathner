from django.conf import settings
from django.db import models
from django.utils import timezone


class RankingProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ranking_profile",
    )
    friends = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="rank_friends",
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"RankingProfile({self.user_id})"


class GameScore(models.Model):
    MODE_CHOICES = (
        ("practice", "Practice"),
        ("classic", "Classic"),
        ("challenge", "Challenge"),
        ("avatar_aura", "Avatar Aura"),
        ("math_rain", "Math Rain"),
        ("tug_of_war", "Tug of War"),
    )

    OPERATION_CHOICES = (
        ("add", "Add"),
        ("sub", "Subtract"),
        ("mul", "Multiply"),
        ("div", "Divide"),
        ("mixed", "Mixed"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ranking_scores",
    )
    game_mode = models.CharField(max_length=20, choices=MODE_CHOICES, default="practice")
    operation = models.CharField(max_length=20, choices=OPERATION_CHOICES, default="mixed")
    score = models.PositiveIntegerField(default=0)
    correct_count = models.PositiveIntegerField(default=0)
    wrong_count = models.PositiveIntegerField(default=0)
    earned_stars = models.PositiveIntegerField(default=0)
    best_combo = models.PositiveIntegerField(default=0)
    played_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-played_at", "-correct_count", "-best_combo", "-earned_stars"]

    def __str__(self):
        return f"{self.user_id} | {self.game_mode} | correct={self.correct_count}"