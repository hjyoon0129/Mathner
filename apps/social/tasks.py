from celery import shared_task
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from .cache_keys import room_stats_key
from .models import Room, RoomVisit

User = get_user_model()


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 5},
)
def record_room_visit_task(self, room_owner_username: str, viewer_user_id=None, guest_token=None):
    """
    방문수 증가는 요청 응답과 분리해서 비동기로 처리.
    guest_token 또는 viewer_user_id 기준으로 하루 1회만 기록.
    """

    room = (
        Room.objects
        .select_related("owner")
        .filter(owner__username=room_owner_username)
        .first()
    )
    if not room:
      return {"ok": False, "error": "room_not_found"}

    visited_on = timezone.localdate()

    with transaction.atomic():
        visit_qs = RoomVisit.objects.select_for_update().filter(
            room=room,
            visited_on=visited_on,
        )

        if viewer_user_id:
            user = User.objects.filter(id=viewer_user_id).first()
            if not user:
                return {"ok": False, "error": "viewer_not_found"}

            exists = visit_qs.filter(viewer=user).exists()
            if exists:
                return {"ok": True, "created": False}

            RoomVisit.objects.create(
                room=room,
                viewer=user,
                guest_token="",
                visited_on=visited_on,
            )
        else:
            guest_token = (guest_token or "").strip()
            if not guest_token:
                return {"ok": False, "error": "guest_token_required"}

            exists = visit_qs.filter(guest_token=guest_token).exists()
            if exists:
                return {"ok": True, "created": False}

            RoomVisit.objects.create(
                room=room,
                viewer=None,
                guest_token=guest_token,
                visited_on=visited_on,
            )

        room.today_visits = RoomVisit.objects.filter(room=room, visited_on=visited_on).count()
        room.total_visits = RoomVisit.objects.filter(room=room).count()
        room.save(update_fields=["today_visits", "total_visits"])

    cache.delete(room_stats_key(room_owner_username))
    return {"ok": True, "created": True}