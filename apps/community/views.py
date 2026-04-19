from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Count, Exists, ExpressionWrapper, F, IntegerField, OuterRef, Prefetch, Q
from django.http import HttpResponseForbidden
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import CommunityCommentForm, CommunityPostForm, CommunitySearchForm
from .models import (
    CommunityComment,
    CommunityCommentLike,
    CommunityPost,
    CommunityPostImage,
    CommunityPostLike,
)

POSTS_PER_PAGE = 10
MAX_UPLOAD_IMAGES = 8

SORT_CHOICES = {
    "latest": ("-created_at", "-id"),
    "likes": ("-like_count", "-created_at", "-id"),
    "views": ("-views", "-created_at", "-id"),
    "popular": ("-score_value", "-like_count", "-views", "-created_at", "-id"),
}


def _can_manage_post(user, post):
    return user.is_superuser or post.author_id == user.id


def _can_manage_comment(user, comment):
    return user.is_superuser or comment.author_id == user.id


def _apply_search(queryset, q):
    q = (q or "").strip()
    if not q:
        return queryset

    return queryset.filter(
        Q(title__icontains=q)
        | Q(content__icontains=q)
        | Q(author_nickname_snapshot__icontains=q)
    )


def _save_uploaded_images(post, files):
    if not files:
        return

    for idx, image in enumerate(files[:MAX_UPLOAD_IMAGES]):
        CommunityPostImage.objects.create(
            post=post,
            image=image,
            sort_order=idx,
        )


def _get_sort_key(request):
    sort = (request.GET.get("sort") or "latest").strip().lower()
    if sort not in SORT_CHOICES:
        sort = "latest"
    return sort


def _base_post_queryset():
    return (
        CommunityPost.objects
        .select_related("author")
        .prefetch_related("images")
        .annotate(comment_count=Count("comments", distinct=True))
        .annotate(like_relation_count=Count("likes", distinct=True))
        .annotate(
            score_value=ExpressionWrapper(
                F("comment_count") + F("like_relation_count"),
                output_field=IntegerField(),
            )
        )
    )


def _ordered_post_queryset(request):
    queryset = _base_post_queryset()

    if request.user.is_authenticated:
        liked_subquery = CommunityPostLike.objects.filter(
            post=OuterRef("pk"),
            user=request.user,
        )
        queryset = queryset.annotate(user_liked=Exists(liked_subquery))

    sort = _get_sort_key(request)
    return queryset.order_by(*SORT_CHOICES[sort])


def community_home(request):
    search_form = CommunitySearchForm(request.GET or None)
    q = ""
    if search_form.is_valid():
        q = search_form.cleaned_data.get("q", "") or ""

    base_posts = _ordered_post_queryset(request)

    notice_posts = _apply_search(
        base_posts.filter(is_notice=True).order_by("notice_order", "-created_at", "-id"),
        q,
    )

    normal_posts = _apply_search(
        base_posts.filter(is_notice=False),
        q,
    )

    paginator = Paginator(normal_posts, POSTS_PER_PAGE)
    page_obj = paginator.get_page(request.GET.get("page"))

    context = {
        "notice_posts": notice_posts,
        "posts": page_obj.object_list,
        "page_obj": page_obj,
        "search_form": search_form,
        "search_query": q,
        "sort_key": _get_sort_key(request),
    }
    return render(request, "community/home.html", context)


def community_detail(request, pk):
    post = get_object_or_404(
        CommunityPost.objects.select_related("author").prefetch_related("images"),
        pk=pk,
    )

    CommunityPost.objects.filter(pk=post.pk).update(views=F("views") + 1)
    post.refresh_from_db()

    replies_qs = (
        CommunityComment.objects
        .select_related("author")
        .order_by("created_at", "id")
    )

    top_level_comments = (
        CommunityComment.objects
        .filter(post=post, parent__isnull=True)
        .select_related("author")
        .prefetch_related(Prefetch("replies", queryset=replies_qs, to_attr="prefetched_replies"))
        .order_by("created_at", "id")
    )

    for comment in top_level_comments:
        comment.styled_replies = list(getattr(comment, "prefetched_replies", []))

    user_liked_post = False
    liked_comment_ids = set()

    if request.user.is_authenticated:
        user_liked_post = CommunityPostLike.objects.filter(
            post=post,
            user=request.user,
        ).exists()

        liked_comment_ids = set(
            CommunityCommentLike.objects.filter(
                comment__post=post,
                user=request.user,
            ).values_list("comment_id", flat=True)
        )

    context = {
        "post": post,
        "user_liked_post": user_liked_post,
        "top_level_comments": top_level_comments,
        "comment_form": CommunityCommentForm(),
        "liked_comment_ids": liked_comment_ids,
        "can_edit_post": request.user.is_authenticated and _can_manage_post(request.user, post),
    }
    return render(request, "community/detail.html", context)


@login_required
def community_create(request):
    if request.method == "POST":
        form = CommunityPostForm(request.POST)
        if form.is_valid():
            post = form.save(commit=False)
            post.author = request.user
            post.save()
            _save_uploaded_images(post, request.FILES.getlist("images"))
            messages.success(request, "Post created successfully.")
            return redirect("community:detail", pk=post.pk)
    else:
        form = CommunityPostForm()

    return render(
        request,
        "community/create.html",
        {
            "form": form,
            "page_title": "Write Post",
            "submit_label": "Upload Post",
        },
    )


@login_required
def community_edit(request, pk):
    post = get_object_or_404(CommunityPost, pk=pk)
    if not _can_manage_post(request.user, post):
        return HttpResponseForbidden("You do not have permission to edit this post.")

    if request.method == "POST":
        form = CommunityPostForm(request.POST, instance=post)
        if form.is_valid():
            post = form.save(commit=False)
            post.save()

            if request.POST.get("delete_all_images") == "true":
                post.images.all().delete()

            delete_image_ids = request.POST.getlist("delete_image_ids")
            if delete_image_ids:
                post.images.filter(id__in=delete_image_ids).delete()

            _save_uploaded_images(post, request.FILES.getlist("images"))

            messages.success(request, "Post updated successfully.")
            return redirect("community:detail", pk=post.pk)
    else:
        form = CommunityPostForm(instance=post)

    return render(
        request,
        "community/create.html",
        {
            "form": form,
            "page_title": "Edit Post",
            "submit_label": "Save Changes",
            "post": post,
        },
    )


@login_required
@require_POST
def community_delete(request, pk):
    post = get_object_or_404(CommunityPost, pk=pk)
    if not _can_manage_post(request.user, post):
        return HttpResponseForbidden("You do not have permission to delete this post.")

    post.delete()
    messages.success(request, "Post deleted successfully.")
    return redirect("community:home")


@login_required
@require_POST
def community_like_toggle(request, pk):
    post = get_object_or_404(CommunityPost, pk=pk)
    like, created = CommunityPostLike.objects.get_or_create(
        post=post,
        user=request.user,
    )

    if created:
        CommunityPost.objects.filter(pk=post.pk).update(like_count=F("like_count") + 1)
    else:
        like.delete()
        CommunityPost.objects.filter(pk=post.pk).update(
            like_count=CaseWhenNonNegative("like_count")
        )

    return redirect("community:detail", pk=post.pk)


@login_required
@require_POST
def community_comment_create(request, pk):
    post = get_object_or_404(CommunityPost, pk=pk)
    form = CommunityCommentForm(request.POST)

    if not form.is_valid():
        return redirect("community:detail", pk=post.pk)

    parent_id = request.POST.get("parent_id")
    parent_comment = None

    if parent_id:
        parent_comment = get_object_or_404(CommunityComment, pk=parent_id, post=post)

    comment = form.save(commit=False)
    comment.post = post
    comment.author = request.user
    comment.parent = parent_comment
    comment.save()

    return redirect(f"/community/{post.pk}/#comment-{comment.pk}")


@login_required
@require_POST
def community_comment_edit(request, pk):
    comment = get_object_or_404(CommunityComment, pk=pk)
    if not _can_manage_comment(request.user, comment):
        return HttpResponseForbidden("You do not have permission to edit this comment.")

    new_content = (request.POST.get("content") or "").strip()
    if new_content:
        comment.content = new_content
        comment.save()

    return redirect(f"/community/{comment.post_id}/#comment-{comment.pk}")


@login_required
@require_POST
def community_comment_delete(request, pk):
    comment = get_object_or_404(CommunityComment, pk=pk)
    if not _can_manage_comment(request.user, comment):
        return HttpResponseForbidden("You do not have permission to delete this comment.")

    post_id = comment.post_id
    parent_id = comment.parent_id
    comment.delete()

    if parent_id:
        return redirect(f"/community/{post_id}/#comment-{parent_id}")
    return redirect(f"/community/{post_id}/#comments")


@login_required
@require_POST
def community_comment_like_toggle(request, pk):
    comment = get_object_or_404(CommunityComment, pk=pk)
    like, created = CommunityCommentLike.objects.get_or_create(
        comment=comment,
        user=request.user,
    )

    if created:
        CommunityComment.objects.filter(pk=comment.pk).update(
            like_count=F("like_count") + 1
        )
    else:
        like.delete()
        CommunityComment.objects.filter(pk=comment.pk).update(
            like_count=CaseWhenNonNegative("like_count")
        )

    return redirect(f"/community/{comment.post_id}/#comment-{comment.pk}")


def CaseWhenNonNegative(field_name):
    from django.db.models import Case, F, IntegerField, Value, When
    return Case(
        When(**{f"{field_name}__gt": 0}, then=F(field_name) - 1),
        default=Value(0),
        output_field=IntegerField(),
    )