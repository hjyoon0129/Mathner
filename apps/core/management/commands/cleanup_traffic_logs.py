from datetime import timedelta

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import connection
from django.utils import timezone

from apps.core.models import VisitorLog, PageViewLog, GameEventLog
from apps.core.traffic_utils import (
    build_bot_suspicious_q,
    build_ignored_path_q,
)


class Command(BaseCommand):
    help = "Mathner traffic logs cleanup: ignored path delete, bot/suspicious next-day delete, old logs cleanup, sessions cleanup."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="삭제하지 않고 삭제 예정 개수만 출력합니다.",
        )
        parser.add_argument(
            "--keep-human-pageviews-days",
            type=int,
            default=30,
            help="일반 PageViewLog 보관 일수. 기본 30일.",
        )
        parser.add_argument(
            "--keep-visitors-days",
            type=int,
            default=90,
            help="일반 VisitorLog 보관 일수. 기본 90일.",
        )
        parser.add_argument(
            "--keep-game-events-days",
            type=int,
            default=180,
            help="GameEventLog 보관 일수. 기본 180일.",
        )
        parser.add_argument(
            "--skip-vacuum",
            action="store_true",
            help="VACUUM ANALYZE 실행을 건너뜁니다.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        today = timezone.localdate()

        bot_cutoff_date = today
        human_pageview_cutoff_date = today - timedelta(days=options["keep_human_pageviews_days"])
        visitor_cutoff_date = today - timedelta(days=options["keep_visitors_days"])
        game_event_cutoff_date = today - timedelta(days=options["keep_game_events_days"])

        bot_q = build_bot_suspicious_q()
        ignored_path_q = build_ignored_path_q()

        # /accounts/, /admin/, /static/, /media/ 등 저장 제외 대상은 날짜 상관없이 삭제
        ignored_pageviews = PageViewLog.objects.filter(ignored_path_q)
        ignored_visitors = VisitorLog.objects.filter(ignored_path_q)

        # Bot/Suspicious는 다음날 삭제
        old_bot_pageviews = (
            PageViewLog.objects
            .filter(visit_date__lt=bot_cutoff_date)
            .filter(bot_q)
            .exclude(ignored_path_q)
        )

        old_bot_visitors = (
            VisitorLog.objects
            .filter(visit_date__lt=bot_cutoff_date)
            .filter(bot_q)
            .exclude(ignored_path_q)
        )

        # 일반 PageViewLog는 30일 보관
        old_human_pageviews = (
            PageViewLog.objects
            .filter(visit_date__lt=human_pageview_cutoff_date)
            .exclude(bot_q)
            .exclude(ignored_path_q)
        )

        # VisitorLog는 90일 보관
        old_visitors = (
            VisitorLog.objects
            .filter(visit_date__lt=visitor_cutoff_date)
            .exclude(bot_q)
            .exclude(ignored_path_q)
        )

        # GameEventLog는 180일 보관
        old_game_events = GameEventLog.objects.filter(
            event_date__lt=game_event_cutoff_date
        )

        counts = {
            "ignored_pageviews": ignored_pageviews.count(),
            "ignored_visitors": ignored_visitors.count(),
            "old_bot_pageviews": old_bot_pageviews.count(),
            "old_bot_visitors": old_bot_visitors.count(),
            "old_human_pageviews": old_human_pageviews.count(),
            "old_visitors": old_visitors.count(),
            "old_game_events": old_game_events.count(),
        }

        self.stdout.write("")
        self.stdout.write("====== Mathner traffic cleanup plan ======")
        self.stdout.write(f"today: {today}")
        self.stdout.write("ignored paths: /accounts/, /admin/, /static/, /media/, /api/, /favicon, robots, sitemap ...")
        self.stdout.write(f"bot/suspicious delete target: visit_date < {bot_cutoff_date}")
        self.stdout.write(f"human pageview delete target: visit_date < {human_pageview_cutoff_date}")
        self.stdout.write(f"visitor delete target: visit_date < {visitor_cutoff_date}")
        self.stdout.write(f"game event delete target: event_date < {game_event_cutoff_date}")
        self.stdout.write("------------------------------------------")

        for key, value in counts.items():
            self.stdout.write(f"{key}: {value}")

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN: 실제 삭제는 하지 않았습니다."))
            return

        deleted = {}

        deleted["ignored_pageviews"] = ignored_pageviews.delete()[0]
        deleted["ignored_visitors"] = ignored_visitors.delete()[0]
        deleted["old_bot_pageviews"] = old_bot_pageviews.delete()[0]
        deleted["old_bot_visitors"] = old_bot_visitors.delete()[0]
        deleted["old_human_pageviews"] = old_human_pageviews.delete()[0]
        deleted["old_visitors"] = old_visitors.delete()[0]
        deleted["old_game_events"] = old_game_events.delete()[0]

        self.stdout.write("------------------------------------------")
        for key, value in deleted.items():
            self.stdout.write(self.style.SUCCESS(f"deleted {key}: {value}"))

        self.stdout.write("------------------------------------------")
        self.stdout.write("clearsessions 실행 중...")
        call_command("clearsessions")
        self.stdout.write(self.style.SUCCESS("django_session 오래된 세션 정리 완료"))

        if not options["skip_vacuum"]:
            self._vacuum_tables()

        self.stdout.write(self.style.SUCCESS("Mathner traffic cleanup 완료"))

    def _vacuum_tables(self):
        table_names = [
            "core_pageviewlog",
            "core_visitorlog",
            "core_gameeventlog",
            "django_session",
        ]

        self.stdout.write("------------------------------------------")
        self.stdout.write("VACUUM ANALYZE 실행 중...")

        with connection.cursor() as cursor:
            for table_name in table_names:
                try:
                    cursor.execute(f"VACUUM ANALYZE {table_name};")
                    self.stdout.write(self.style.SUCCESS(f"VACUUM ANALYZE 완료: {table_name}"))
                except Exception as exc:
                    self.stdout.write(
                        self.style.WARNING(f"VACUUM ANALYZE 건너뜀: {table_name} / {exc}")
                    )