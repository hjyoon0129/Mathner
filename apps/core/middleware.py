from django.utils import timezone
from .models import VisitorLog, PageViewLog


class VisitorTrackingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip

    def __call__(self, request):
        response = self.get_response(request)

        try:
            path = request.path

            # 정적파일, 관리자, favicon 등 제외
            if (
                path.startswith("/static/")
                or path.startswith("/media/")
                or path.startswith("/admin/")
                or path.startswith("/favicon")
            ):
                return response

            ip = self.get_client_ip(request)
            today = timezone.localdate()
            user_agent = request.META.get("HTTP_USER_AGENT", "")[:1000]

            if ip:
                # 하루 동일 IP는 1번만 카운트
                VisitorLog.objects.get_or_create(
                    ip_address=ip,
                    visit_date=today,
                    defaults={
                        "user_agent": user_agent,
                        "path": path,
                    },
                )

                # 페이지 조회수는 접속할 때마다 기록
                PageViewLog.objects.create(
                    ip_address=ip,
                    user_agent=user_agent,
                    path=path,
                    visit_date=today,
                )

        except Exception:
            pass

        return response