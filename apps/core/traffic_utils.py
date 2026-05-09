from django.db.models import Q
import ipaddress

try:
    from django.contrib.gis.geoip2 import GeoIP2
except Exception:
    GeoIP2 = None


BOT_KEYWORDS = [
    "bot",
    "crawl",
    "crawler",
    "spider",
    "slurp",
    "bingpreview",
    "facebookexternalhit",
    "googlebot",
    "google-inspectiontool",
    "adsbot-google",
    "mediapartners-google",
    "yandex",
    "baidu",
    "duckduck",
    "semrush",
    "ahrefs",
    "mj12bot",
    "dotbot",
    "petalbot",
    "bytespider",
    "claudebot",
    "gptbot",
    "ccbot",
    "perplexitybot",
    "applebot",
    "amazonbot",
    "python-requests",
    "curl",
    "wget",
    "httpclient",
    "go-http-client",
    "java/",
    "okhttp",
    "axios",
    "scrapy",
]

BOT_PATH_KEYWORDS = [
    "robots.txt",
    "sitemap.xml",
    "apple-app-site-association",
    ".well-known/security.txt",
    ".well-known/assetlinks.json",
]

SUSPICIOUS_PATH_KEYWORDS = [
    ".env",
    ".git",
    ".svn",
    ".DS_Store",
    "wp-admin",
    "wp-login",
    "wordpress",
    "xmlrpc.php",
    "phpmyadmin",
    "phpinfo",
    "owa/auth",
    "developmentserver",
    "metadata",
    "server-status",
    "actuator",
    "config",
    "backup",
    "backup.zip",
    "backup.sql",
    "dump.sql",
    "database.sql",
    ".php",
    "/vendor/",
    "/boaform/",
    "/cgi-bin/",
    "/shell",
    "/cmd",
    "/adminer",
]

IGNORE_LOG_PATH_PREFIXES = [
    "/static/",
    "/media/",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/admin/jsi18n/",
]

IGNORE_LOG_EXACT_PATHS = [
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
]


def rate(part, total):
    if not total:
        return 0
    return round((part / total) * 100, 1)


def is_private_or_local_ip(ip):
    try:
        parsed_ip = ipaddress.ip_address(ip)
        return (
            parsed_ip.is_private
            or parsed_ip.is_loopback
            or parsed_ip.is_reserved
            or parsed_ip.is_multicast
        )
    except Exception:
        return False


def get_country_name(ip):
    if not ip:
        return "Unknown"

    if is_private_or_local_ip(ip):
        return "Local/Private"

    if GeoIP2 is None:
        return "Unknown"

    try:
        geo = GeoIP2()
        data = geo.country(ip)
        return data.get("country_name") or "Unknown"
    except Exception:
        return "Unknown"


def is_bot_user_agent(user_agent):
    ua = (user_agent or "").lower()
    return any(keyword in ua for keyword in BOT_KEYWORDS)


def is_bot_path(path):
    path_lower = (path or "").lower()
    return any(keyword in path_lower for keyword in BOT_PATH_KEYWORDS)


def is_suspicious_path(path):
    path_lower = (path or "").lower()
    return any(keyword in path_lower for keyword in SUSPICIOUS_PATH_KEYWORDS)


def should_ignore_tracking_path(path):
    path_lower = (path or "").lower()

    if path_lower in IGNORE_LOG_EXACT_PATHS:
        return True

    return any(path_lower.startswith(prefix.lower()) for prefix in IGNORE_LOG_PATH_PREFIXES)


def traffic_type(path="", user_agent=""):
    if is_suspicious_path(path):
        return "Suspicious"
    if is_bot_path(path):
        return "Bot"
    if is_bot_user_agent(user_agent):
        return "Bot"
    return "Maybe Human"


def traffic_label(value):
    if value == "Maybe Human":
        return "🟢 Maybe Human"
    if value == "Bot":
        return "🟡 Bot"
    if value == "Suspicious":
        return "🔴 Suspicious"
    return value


def build_bot_suspicious_q(path_field="path", user_agent_field="user_agent"):
    query = Q()

    for keyword in BOT_KEYWORDS:
        query |= Q(**{f"{user_agent_field}__icontains": keyword})

    for keyword in BOT_PATH_KEYWORDS:
        query |= Q(**{f"{path_field}__icontains": keyword})

    for keyword in SUSPICIOUS_PATH_KEYWORDS:
        query |= Q(**{f"{path_field}__icontains": keyword})

    return query


def build_type_rows(logs, path_field=True):
    type_dict = {
        "Maybe Human": 0,
        "Bot": 0,
        "Suspicious": 0,
    }

    for log in logs:
        path = getattr(log, "path", "") if path_field else ""
        t_type = traffic_type(path, getattr(log, "user_agent", ""))
        type_dict[t_type] = type_dict.get(t_type, 0) + 1

    total = sum(type_dict.values())

    rows = []
    for key in ["Maybe Human", "Bot", "Suspicious"]:
        value = type_dict.get(key, 0)
        rows.append({
            "type": key,
            "label": traffic_label(key),
            "count": value,
            "percent": rate(value, total),
        })

    return rows


def build_country_rows(logs):
    country_dict = {}

    for log in logs:
        country = get_country_name(getattr(log, "ip_address", ""))
        country_dict[country] = country_dict.get(country, 0) + 1

    return sorted(
        [{"country": key, "count": value} for key, value in country_dict.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:30]


def build_page_type_rows(logs):
    result = {}

    for log in logs:
        path = log.path or "/"
        t_type = traffic_type(log.path, log.user_agent)

        if path not in result:
            result[path] = {
                "path": path,
                "maybe_human": 0,
                "bot": 0,
                "suspicious": 0,
                "total": 0,
            }

        result[path]["total"] += 1

        if t_type == "Maybe Human":
            result[path]["maybe_human"] += 1
        elif t_type == "Bot":
            result[path]["bot"] += 1
        elif t_type == "Suspicious":
            result[path]["suspicious"] += 1

    rows = list(result.values())
    rows.sort(key=lambda x: x["total"], reverse=True)
    return rows[:100]