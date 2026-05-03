from django.conf import settings
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile"
    )
    nickname = models.CharField(max_length=20, unique=True, null=True, blank=True)
    stars = models.PositiveIntegerField(default=0)

    # 아이디/PIN 가입 시 PIN 복구용 보호자 이메일
    recovery_email = models.EmailField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nickname or self.user.username or f"user-{self.user_id}"