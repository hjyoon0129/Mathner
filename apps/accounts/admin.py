from django.contrib import admin, messages
from django.db.models import F
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User

# 기존 accounts 앱의 Profile
from .models import Profile

# 랭킹/아바타룸에서 사용하는 core 앱의 UserGameProfile 가져오기
from apps.core.models import UserGameProfile


# ==========================================
# 기존 ProfileAdmin 및 Action 함수들
# ==========================================
@admin.action(description="선택한 유저 별 0으로 리셋")
def reset_stars(modeladmin, request, queryset):
	updated = queryset.update(stars=0)
	messages.success(request, f"{updated}명의 별을 0으로 리셋했습니다.")


@admin.action(description="선택한 유저 별 +10")
def add_10_stars(modeladmin, request, queryset):
	updated = queryset.update(stars=F("stars") + 10)
	messages.success(request, f"{updated}명에게 별 10개를 추가했습니다.")


@admin.action(description="선택한 유저 별 -10")
def subtract_10_stars(modeladmin, request, queryset):
	updated = 0
	for profile in queryset:
		profile.stars = max(0, profile.stars - 10)
		profile.save(update_fields=["stars"])
		updated += 1
	messages.success(request, f"{updated}명의 별 10개를 차감했습니다.")


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
	# 'nickname'을 'get_actual_nickname'으로 변경하여 랭킹 닉네임을 불러오게 합니다.
	list_display = ("id", "user", "get_actual_nickname", "stars", "created_at")
	list_editable = ("stars",)
	search_fields = ("user__username", "user__email", "nickname")
	list_filter = ("created_at",)
	ordering = ("id",)
	readonly_fields = ("created_at",)
	actions = (reset_stars, add_10_stars, subtract_10_stars)

	# Profile 화면에서도 랭킹용 닉네임을 똑같이 찾아서 보여줍니다.
	def get_actual_nickname(self, obj):
		# 1. 랭킹에서 사용하는 UserGameProfile에서 먼저 찾아봅니다.
		try:
			game_profile = UserGameProfile.objects.filter(user=obj.user).first()
			if game_profile:
				if hasattr(game_profile, "get_display_name"):
					try:
						nickname = game_profile.get_display_name()
						if nickname: return nickname
					except Exception:
						pass
				if getattr(game_profile, "nickname", None):
					return game_profile.nickname
		except Exception:
			pass

		# 2. 거기에 없다면 현재 Profile 모델 자체의 닉네임을 보여줍니다.
		if obj.nickname:
			return obj.nickname

		return "-"

	get_actual_nickname.short_description = "닉네임 (랭킹연동)"


# ==========================================
# 새로 추가된 User 어드민 커스터마이징
# ==========================================

# 1. 기본 제공되는 User 어드민의 등록을 해제합니다.
admin.site.unregister(User)


# 2. 닉네임이 추가된 새로운 User 어드민을 등록합니다.
@admin.register(User)
class CustomUserAdmin(UserAdmin):
	# 어드민 리스트에 보여줄 컬럼 목록
	list_display = ("username", "email", "get_nickname", "first_name", "last_name", "is_staff")

	list_select_related = ("profile",)

	# 랭킹 화면과 똑같은 방식으로 닉네임을 가져옵니다.
	def get_nickname(self, obj):
		try:
			game_profile = UserGameProfile.objects.filter(user=obj).first()
			if game_profile:
				if hasattr(game_profile, "get_display_name"):
					try:
						nickname = game_profile.get_display_name()
						if nickname: return nickname
					except Exception:
						pass
				if getattr(game_profile, "nickname", None):
					return game_profile.nickname
		except Exception:
			pass

		if hasattr(obj, 'profile') and obj.profile.nickname:
			return obj.profile.nickname

		return "-"

	get_nickname.short_description = "닉네임 (랭킹연동)"