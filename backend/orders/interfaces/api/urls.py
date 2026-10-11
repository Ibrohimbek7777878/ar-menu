from django.urls import path
from orders.interfaces.api.views import (
    RestaurantOrderCreateView,
    RestaurantOrderListView,
    KitchenItemToggleView,
    TableSettleBillView,
    RestaurantTablesStateView,
    ServiceCallActionView,
    RestaurantFinanceSyncView,
)

urlpatterns = [
    # Orders
    path('orders/', RestaurantOrderListView.as_view(), name='restaurant_orders_list'),
    path('orders/create/', RestaurantOrderCreateView.as_view(), name='restaurant_order_create'),

    # Kitchen KDS
    path('kitchen/items/<int:item_id>/toggle/', KitchenItemToggleView.as_view(), name='restaurant_kitchen_toggle'),

    # Tables & Billing
    path('tables/', RestaurantTablesStateView.as_view(), name='restaurant_tables_list'),
    path('tables/<str:table_number>/settle/', TableSettleBillView.as_view(), name='restaurant_table_settle'),

    # Service Calls (Guest / Waiter / Kitchen)
    path('calls/', ServiceCallActionView.as_view(), name='restaurant_calls'),
    path('calls/<int:call_id>/', ServiceCallActionView.as_view(), name='restaurant_call_detail'),

    # Finance (Sobir Tog'a Moliya)
    path('finance/', RestaurantFinanceSyncView.as_view(), name='restaurant_finance_sync'),
]
