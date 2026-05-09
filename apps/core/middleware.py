from django.utils import timezone

from .models import VisitorLog, PageViewLog
from .traffic_utils import should_ignore_tracking_path, traffic_type


class VisitorTrackingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")

        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()

        return request.META.get("REMOTE_ADDR", "")

    def __call__(self, request):
        response = self.get_response(request)

        try:
            self.track_request(request, response)
        except Exception:
            # 트래킹 실패가 실제 서비스 응답을 막으면 안 됨
            pass

        return response

    def track_request(self, request, response):
        path = request.path or "/"

        # GET/HEAD만 페이지뷰로 취급
        if request.method not in ("GET", "HEAD"):
            return

        # 로그인/회원가입/소셜로그인/관리자/static/media/api 등은 DB 저장 제외
        if should_ignore_tracking_path(path):
            return

        # 400/404/500 같은 실패 응답은 저장하지 않음
        if response.status_code >= 400:
            return

        # HTML 페이지 중심으로만 저장. JSON/API/이미지 응답은 제외
        content_type = response.get("Content-Type", "")
        if content_type and "text/html" not in content_type.lower():
            return

        ip = self.get_client_ip(request)
        if not ip:
            return

        today = timezone.localdate()
        user_agent = request.META.get("HTTP_USER_AGENT", "")[:1000]
        t_type = traffic_type(path, user_agent)

        # 취약점 스캐너는 아예 저장하지 않음
        if t_type == "Suspicious":
            return

        # VisitorLog는 하루 동일 IP 1번만 저장
        VisitorLog.objects.get_or_create(
            ip_address=ip,
            visit_date=today,
            defaults={
                "user_agent": user_agent,
                "path": path,
            },
        )

        # PageViewLog 폭증 방지:
        # 같은 IP가 같은 path를 하루에 여러 번 찍어도 1번만 저장
        # 봇이 같은 URL을 수천 번 때려도 DB가 터지지 않게 함
        already_exists = PageViewLog.objects.filter(
            ip_address=ip,
            path=path,
            visit_date=today,
        ).exists()

        if already_exists:
            return

        PageViewLog.objects.create(
            ip_address=ip,
            user_agent=user_agent,
            path=path,
            visit_date=today,
        )