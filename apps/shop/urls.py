from django.urls import path
from . import views

urlpatterns = [
    path("", views.shop_view, name="shop"),
    path("buy/", views.buy_items_view, name="shop_buy"),
    path("buy-effects/", views.buy_effects_view, name="shop_buy_effects"),
]