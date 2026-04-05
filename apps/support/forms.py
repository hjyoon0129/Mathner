from django import forms
from .models import Inquiry


class InquiryCreateForm(forms.ModelForm):
    class Meta:
        model = Inquiry
        fields = ["title", "content"]
        widgets = {
            "title": forms.TextInput(
                attrs={
                    "class": "inquiry-input",
                    "placeholder": "Enter a title",
                    "maxlength": "200",
                }
            ),
            "content": forms.Textarea(
                attrs={
                    "class": "inquiry-textarea",
                    "placeholder": "Describe your issue or request in detail",
                    "rows": 10,
                }
            ),
        }