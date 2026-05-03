import re

from django import forms
from django.contrib.auth import get_user_model

from allauth.account.forms import LoginForm, SignupForm

from .models import Profile


USERNAME_RE = re.compile(r"^[a-z0-9_]{4,20}$")
PIN_RE = re.compile(r"^\d{6}$")


class MathnerLoginForm(LoginForm):
    """
    매스너 아이디 + 6자리 PIN 로그인 폼.
    인증 자체는 django-allauth 기존 로그인 흐름을 그대로 사용합니다.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if "login" in self.fields:
            self.fields["login"].label = "매스너 아이디"
            self.fields["login"].widget.attrs.update(
                {
                    "placeholder": "예: tom123",
                    "autocomplete": "username",
                    "autocapitalize": "none",
                    "spellcheck": "false",
                }
            )

        if "password" in self.fields:
            self.fields["password"].label = "6자리 PIN"
            self.fields["password"].widget.attrs.update(
                {
                    "placeholder": "숫자 6자리",
                    "autocomplete": "current-password",
                    "inputmode": "numeric",
                    "maxlength": "6",
                    "pattern": "[0-9]*",
                }
            )


class MathnerSignupForm(SignupForm):
    """
    구글 계정이 없는 아이도 가입할 수 있도록
    username = 매스너 아이디
    password = 6자리 PIN
    email = 보호자 복구 이메일
    구조로 사용합니다.
    """

    field_order = ["username", "password1", "password2", "email"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if "username" in self.fields:
            self.fields["username"].label = "매스너 아이디"
            self.fields["username"].help_text = "영문 소문자, 숫자, _ 조합 4~20자"
            self.fields["username"].widget.attrs.update(
                {
                    "placeholder": "예: tom123",
                    "autocomplete": "username",
                    "autocapitalize": "none",
                    "spellcheck": "false",
                    "maxlength": "20",
                }
            )

        if "email" in self.fields:
            self.fields["email"].label = "보호자 복구 이메일"
            self.fields["email"].help_text = "PIN을 잊어버렸을 때 복구용으로 사용할 이메일"
            self.fields["email"].widget.attrs.update(
                {
                    "placeholder": "parent@example.com",
                    "autocomplete": "email",
                }
            )

        for field_name in ("password1", "password2"):
            if field_name in self.fields:
                self.fields[field_name].label = "6자리 PIN" if field_name == "password1" else "PIN 한 번 더"
                self.fields[field_name].help_text = "숫자 6자리만 입력"
                self.fields[field_name].widget.attrs.update(
                    {
                        "placeholder": "숫자 6자리",
                        "autocomplete": "new-password",
                        "inputmode": "numeric",
                        "maxlength": "6",
                        "pattern": "[0-9]*",
                    }
                )

    def clean_username(self):
        username = (self.cleaned_data.get("username") or "").strip().lower()

        if not USERNAME_RE.fullmatch(username):
            raise forms.ValidationError("아이디는 영문 소문자, 숫자, _ 조합 4~20자로 입력해 주세요.")

        User = get_user_model()
        if User.objects.filter(username__iexact=username).exists():
            raise forms.ValidationError("이미 사용 중인 아이디예요. 다른 아이디를 입력해 주세요.")

        return username

    def clean_email(self):
        email = (self.cleaned_data.get("email") or "").strip().lower()

        if not email:
            raise forms.ValidationError("보호자 복구 이메일을 입력해 주세요.")

        return email

    def clean_password1(self):
        pin = self.cleaned_data.get("password1") or ""

        if not PIN_RE.fullmatch(pin):
            raise forms.ValidationError("PIN은 숫자 6자리로 입력해 주세요.")

        return pin

    def clean_password2(self):
        pin = self.cleaned_data.get("password2") or ""

        if not PIN_RE.fullmatch(pin):
            raise forms.ValidationError("PIN 확인도 숫자 6자리로 입력해 주세요.")

        return pin

    def clean(self):
        cleaned_data = super().clean()

        pin1 = cleaned_data.get("password1")
        pin2 = cleaned_data.get("password2")

        if pin1 and pin2 and pin1 != pin2:
            self.add_error("password2", "PIN이 서로 달라요. 같은 숫자 6자리를 입력해 주세요.")

        return cleaned_data

    def save(self, request):
        user = super().save(request)

        recovery_email = (self.cleaned_data.get("email") or "").strip().lower()
        if recovery_email:
            profile, _ = Profile.objects.get_or_create(user=user)
            profile.recovery_email = recovery_email
            profile.save(update_fields=["recovery_email"])

        return user