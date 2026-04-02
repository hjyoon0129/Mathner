from django.urls import path
from . import views

app_name = "shop"

urlpatterns = [
    path("", views.shop_view, name="shop_home"),
    path("buy/", views.buy_items_view, name="buy_items"),
]