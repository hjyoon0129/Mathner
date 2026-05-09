from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Room


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_social_room_for_user(sender, instance, created, **kwargs):
    """
    새 유저가 생성되면 소셜 방(Room)을 자동 생성한다.
    소셜 로그인/일반 가입 모두 User가 생성되면 실행된다.
    """
    if not created:
        return

    Room.objects.get_or_create(owner=instance)