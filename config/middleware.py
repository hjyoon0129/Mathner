import time
from django.db import connection


class SimplePerfMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.perf_counter()
        start_query_count = len(connection.queries)

        response = self.get_response(request)

        elapsed = time.perf_counter() - start
        query_count = len(connection.queries) - start_query_count

        print(
            f"[PERF] {request.method} {request.path} | "
            f"{elapsed:.3f}s | queries={query_count}"
        )
        return response