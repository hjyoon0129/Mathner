from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from apps.core.models import UserGameProfile
from .forms import InquiryCreateForm


def get_latest_display_name(user):
    try:
        profile, _ = UserGameProfile.objects.get_or_create(user=user)
        return (
            profile.nickname
            or getattr(user, "username", "")
            or getattr(user, "email", "").split("@")[0]
            or "User"
        )
    except Exception:
        return (
            getattr(user, "username", "")
            or getattr(user, "email", "").split("@")[0]
            or "User"
        )


@login_required
def inquiry_create(request):
    if request.method == "POST":
        form = InquiryCreateForm(request.POST)
        if form.is_valid():
            inquiry = form.save(commit=False)
            inquiry.author = request.user
            inquiry.author_display = get_latest_display_name(request.user)
            inquiry.email_snapshot = request.user.email or ""
            inquiry.is_private = True
            inquiry.save()
            return redirect("support:inquiry_success")
    else:
        form = InquiryCreateForm()

    context = {
        "form": form,
        "author_display": get_latest_display_name(request.user),
        "author_email": request.user.email or "",
    }
    return render(request, "support/inquiry_create.html", context)


@login_required
def inquiry_success(request):
    return render(request, "support/inquiry_success.html")