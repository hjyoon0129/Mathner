from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.social.models import Room


class Command(BaseCommand):
    help = "Create missing social Room objects for existing users."

    def handle(self, *args, **options):
        User = get_user_model()

        created_count = 0
        existing_count = 0

        for user in User.objects.all():
            room, created = Room.objects.get_or_create(owner=user)

            if created:
                created_count += 1
            else:
                existing_count += 1

        self.stdout.write(self.style.SUCCESS("Social room backfill completed."))
        self.stdout.write(f"created rooms: {created_count}")
        self.stdout.write(f"existing rooms: {existing_count}")
        self.stdout.write(f"total users: {User.objects.count()}")
        self.stdout.write(f"total rooms: {Room.objects.count()}")