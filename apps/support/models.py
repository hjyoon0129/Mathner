from django.conf import settings
from django.db import models

from apps.core.models import UserGameProfile


class Inquiry(models.Model):
    STATUS_NEW = "new"
    STATUS_PROGRESS = "progress"
    STATUS_DONE = "done"

    STATUS_CHOICES = [
        (STATUS_NEW, "New"),
        (STATUS_PROGRESS, "In Progress"),
        (STATUS_DONE, "Done"),
    ]

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="inquiries",
    )
    author_display = models.CharField(max_length=150, blank=True)
    email_snapshot = models.EmailField(blank=True)
    title = models.CharField(max_length=200)
    content = models.TextField()
    is_private = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_NEW)
    admin_memo = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "1:1 Inquiry"
        verbose_name_plural = "1:1 Inquiries"

    def __str__(self):
        return f"[{self.get_status_display()}] {self.title}"

    def _get_latest_display_name(self):
        if not self.author:
            return "User"

        try:
            profile, _ = UserGameProfile.objects.get_or_create(user=self.author)
            return (
                profile.nickname
                or getattr(self.author, "username", "")
                or getattr(self.author, "email", "").split("@")[0]
                or "User"
            )
        except Exception:
            return (
                getattr(self.author, "username", "")
                or getattr(self.author, "email", "").split("@")[0]
                or "User"
            )

    def save(self, *args, **kwargs):
        if self.author:
            self.author_display = self._get_latest_display_name()
            self.email_snapshot = getattr(self.author, "email", "") or ""

        self.is_private = True
        super().save(*args, **kwargs)