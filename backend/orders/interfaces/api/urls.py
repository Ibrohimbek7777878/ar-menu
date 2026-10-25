from django.urls import include, path
from finance.api_views import (
    FinanceDebtCreateView, FinanceDebtPayView, FinanceTxCancelView, FinanceTxCreateView,
)
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
    StopListView,
    ProductAvailabilityView,
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

    # Stop-list: taom tugadi / qaytdi
    path('products/stoplist/', StopListView.as_view(), name='restaurant_stoplist'),
    path('products/<int:product_id>/availability/', ProductAvailabilityView.as_view(), name='restaurant_product_availability'),

    # Dynamic Menu (Pure SPA fallback)
    path('menu/', RestaurantMenuView.as_view(), name='restaurant_menu'),

    # Service Calls (Guest / Waiter / Kitchen)
    path('calls/', ServiceCallActionView.as_view(), name='restaurant_calls'),
    path('calls/<int:call_id>/', ServiceCallActionView.as_view(), name='restaurant_call_detail'),

    # Finance (Sobir Tog'a Moliya)
    path('finance/', RestaurantFinanceSyncView.as_view(), name='restaurant_finance_sync'),
    path('finance/tx/', FinanceTxCreateView.as_view(), name='restaurant_finance_tx_create'),
    path('finance/tx/<int:tx_id>/cancel/', FinanceTxCancelView.as_view(), name='restaurant_finance_tx_cancel'),
    path('finance/debts/', FinanceDebtCreateView.as_view(), name='restaurant_finance_debt_create'),
    path('finance/debts/<int:debt_id>/pay/', FinanceDebtPayView.as_view(), name='restaurant_finance_debt_pay'),

    # Admin Menu Management
    path('admin/menu/', include('orders.interfaces.api.menu_admin_urls')),
]

