from django import forms

from .models import CommunityComment, CommunityPost


class CommunityPostForm(forms.ModelForm):
    class Meta:
        model = CommunityPost
        fields = ["title", "content"]
        widgets = {
            "title": forms.TextInput(
                attrs={
                    "class": "community-input",
                    "placeholder": "Enter title",
                }
            ),
            "content": forms.Textarea(
                attrs={
                    "class": "community-textarea",
                    "placeholder": "Write your post...",
                    "rows": 12,
                }
            ),
        }


class CommunityCommentForm(forms.ModelForm):
    class Meta:
        model = CommunityComment
        fields = ["content"]
        widgets = {
            "content": forms.Textarea(
                attrs={
                    "class": "comment-textarea",
                    "placeholder": "Write a comment...",
                    "rows": 3,
                }
            ),
        }


class CommunitySearchForm(forms.Form):
    q = forms.CharField(required=False)