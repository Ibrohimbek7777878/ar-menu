from django.urls import path
from orders.interfaces.api.views import (
    RestaurantOrderCreateView,
    RestaurantOrderListView,
    KitchenItemToggleView,
    TableSettleBillView,
    TableAddItemView,
    RestaurantTablesStateView,
    ServiceCallActionView,
    RestaurantFinanceSyncView,
    RestaurantReservationListView,
    RestaurantReservationStatusView,
    RestaurantReservationFindView,
    RestaurantProduct3DScanView,
    RestaurantMenuView,
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
    path('tables/<str:table_number>/add-item/', TableAddItemView.as_view(), name='restaurant_table_add_item'),

    # Reservations & Hostess Desk
    path('reservations/', RestaurantReservationListView.as_view(), name='restaurant_reservations'),
    path('reservations/find/', RestaurantReservationFindView.as_view(), name='restaurant_reservations_find'),
    path('reservations/<int:reservation_id>/status/', RestaurantReservationStatusView.as_view(), name='restaurant_reservation_status'),

    # 3D Photogrammetry & 360 Spin Upload
    path('products/3d-scan/', RestaurantProduct3DScanView.as_view(), name='restaurant_product_3d_scan_create'),
    path('products/<int:product_id>/3d-scan/', RestaurantProduct3DScanView.as_view(), name='restaurant_product_3d_scan_update'),

    # Dynamic Menu (Pure SPA fallback)
    path('menu/', RestaurantMenuView.as_view(), name='restaurant_menu'),

    # Service Calls (Guest / Waiter / Kitchen)
    path('calls/', ServiceCallActionView.as_view(), name='restaurant_calls'),
    path('calls/<int:call_id>/', ServiceCallActionView.as_view(), name='restaurant_call_detail'),

    # Finance (Sobir Tog'a Moliya)
    path('finance/', RestaurantFinanceSyncView.as_view(), name='restaurant_finance_sync'),
]
