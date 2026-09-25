import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../config/app_colors.dart';
import '../providers/cart_provider.dart';
import '../providers/location_provider.dart';
import '../providers/order_provider.dart';
import '../providers/shop_provider.dart';
import '../services/order_service.dart';
import '../services/api_service.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _customerNameController = TextEditingController();
  final _deliveryAddressController = TextEditingController();
  final _notesController = TextEditingController();
  final _couponController = TextEditingController();
  final List<TextEditingController> _phoneControllers = [TextEditingController()];

  bool _isLoading = false;
  bool _isValidatingCoupon = false;
  double _discountAmount = 0.0;
  String? _appliedCouponCode;

  String _currentAddressLabel(LocationProvider locationProvider) {
    if (locationProvider.currentPosition == null) {
      return 'Lokatsiya aniqlanmadi';
    }
    return 'Koordinatalar: ${locationProvider.currentPosition!.latitude.toStringAsFixed(5)}, ${locationProvider.currentPosition!.longitude.toStringAsFixed(5)}';
  }

  @override
  void initState() {
    super.initState();
    if (_phoneControllers.isEmpty) {
      _phoneControllers.add(TextEditingController());
    }
  }

  @override
  void dispose() {
    _customerNameController.dispose();
    _deliveryAddressController.dispose();
    _notesController.dispose();
    _couponController.dispose();
    for (var controller in _phoneControllers) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _applyCoupon(double totalAmount) async {
    final code = _couponController.text.trim();
    if (code.isEmpty) return;

    setState(() => _isValidatingCoupon = true);
    try {
      final res = await ApiService().validateCoupon(code, totalAmount);
      setState(() => _isValidatingCoupon = false);
      if (res['valid'] == true) {
        setState(() {
          _appliedCouponCode = code.toUpperCase();
          _discountAmount = res['discount_amount'] ?? 0.0;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(res['message'] ?? 'Kupon muvaffaqiyatli qo\'llandi!'),
              backgroundColor: AppColors.primaryGreen,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(res['error'] ?? 'Kupon yaroqsiz'),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    } catch (e) {
      setState(() => _isValidatingCoupon = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Kupon tekshirishda xatolik: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  void _addPhoneField() {
    if (_phoneControllers.length < 3) {
      setState(() {
        _phoneControllers.add(TextEditingController());
      });
    }
  }

  void _removePhoneField(int index) {
    if (_phoneControllers.length > 1) {
      _phoneControllers[index].dispose();
      setState(() {
        _phoneControllers.removeAt(index);
      });
    }
  }

  bool _hasDeliveryAddress(LocationProvider locationProvider) {
    return _deliveryAddressController.text.trim().isNotEmpty || locationProvider.currentPosition != null;
  }

  Future<void> _placeOrder() async {
    if (!_formKey.currentState!.validate()) return;

    final locationProvider = Provider.of<LocationProvider>(context, listen: false);
    if (!_hasDeliveryAddress(locationProvider)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Yetkazib berish manzili yoki hozirgi lokatsiyani tanlang'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    final cartProvider = Provider.of<CartProvider>(context, listen: false);
    final orderProvider = Provider.of<OrderProvider>(context, listen: false);
    final shopProvider = Provider.of<ShopProvider>(context, listen: false);

    final phones = _phoneControllers
        .map((c) => c.text.trim())
        .where((phone) => phone.isNotEmpty)
        .toList();

    if (phones.isEmpty) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Kamida bitta telefon raqam kiriting'),
            backgroundColor: AppColors.error,
          ),
        );
      }
      return;
    }

    final shops = cartProvider.getItemsByShop();
    if (shops.isEmpty) {
      setState(() => _isLoading = false);
      return;
    }

    if (shops.length > 1) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Iltimos, faqat bitta do\'kondan mahsulotlar tanlang'),
            backgroundColor: AppColors.error,
          ),
        );
      }
      return;
    }

    if (cartProvider.totalAmount < OrderService.minOrderAmount) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Minimal buyurtma summasi ${OrderService.minOrderAmount.toInt().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]} ')} so\'m'),
            backgroundColor: AppColors.error,
          ),
        );
      }
      return;
    }

    final shopId = shops.keys.first;
    String? shopName;
    try {
      shopName = shopProvider.shops.firstWhere((shop) => shop.id == shopId).name;
    } catch (_) {
      shopName = null;
    }

    try {
      final deliveryAddress = _deliveryAddressController.text.trim().isNotEmpty
          ? _deliveryAddressController.text.trim()
          : await locationProvider.getAddressFromCurrentLocation();
      final order = await orderProvider.createOrderFromForm(
        customerName: _customerNameController.text.trim(),
        customerPhones: phones,
        deliveryAddress: deliveryAddress,
        items: cartProvider.toOrderItems(),
        totalAmount: cartProvider.totalAmount,
        shopId: shopId,
        shopName: shopName,
        notes: _notesController.text.trim(),
        deliveryLat: locationProvider.currentPosition?.latitude,
        deliveryLng: locationProvider.currentPosition?.longitude,
        couponCode: _appliedCouponCode,
      );

      if (order != null && mounted) {
        cartProvider.clearCart();
        GoRouter.of(context).go('/order-success', extra: order);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Buyurtma berishda xatolik yuz berdi'),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Xatolik: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartProvider = Provider.of<CartProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Buyurtma berish'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: cartProvider.isEmpty
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.shopping_cart_outlined, size: 64, color: AppColors.textLight),
                  SizedBox(height: 16),
                  Text(
                    'Savat bo\'sh',
                    style: TextStyle(fontSize: 18, color: AppColors.textGray),
                  ),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Order Summary Card
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.shadow,
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Jami mahsulot:',
                                style: TextStyle(
                                  fontSize: 16,
                                  color: AppColors.textGray,
                                ),
                              ),
                              Text(
                                '${cartProvider.totalQuantity} ta',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textBlack,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Umumiy summa:',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textBlack,
                                ),
                              ),
                              Text(
                                '${cartProvider.totalAmount.toStringAsFixed(0)} so\'m',
                                style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primaryGreen,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),
                    // Kupon kiritish
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 10, offset: const Offset(0, 2))],
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _couponController,
                              decoration: InputDecoration(
                                labelText: 'Kupon kodi',
                                hintText: 'Masalan: TEST10',
                                prefixIcon: const Icon(Icons.local_offer, color: AppColors.primaryGreen),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              ),
                              textCapitalization: TextCapitalization.characters,
                              onChanged: (v) {
                                if (v.isEmpty) {
                                  setState(() {
                                    _appliedCouponCode = null;
                                    _discountAmount = 0.0;
                                  });
                                }
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          _isValidatingCoupon
                              ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
                              : ElevatedButton(
                                  onPressed: () => _applyCoupon(cartProvider.totalAmount),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primaryGreen,
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  child: const Text('Tekshirish', style: TextStyle(color: Colors.white)),
                                ),
                        ],
                      ),
                    ),
                    if (_appliedCouponCode != null) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.success.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.success),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.check_circle, color: AppColors.success, size: 16),
                            const SizedBox(width: 6),
                            Expanded(child: Text('Kupon $_appliedCouponCode qo\'llandi: -${_discountAmount.toStringAsFixed(0)} so\'m', style: const TextStyle(color: AppColors.success, fontSize: 13, fontWeight: FontWeight.w600))),
                            IconButton(
                              icon: const Icon(Icons.close, size: 16, color: AppColors.success),
                              onPressed: () => setState(() {
                                _appliedCouponCode = null;
                                _discountAmount = 0.0;
                                _couponController.clear();
                              }),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                            ),
                          ],
                        ),
                      ),
                    ] else if (_couponController.text.isNotEmpty && !_isValidatingCoupon) ...[
                      const SizedBox(height: 8),
                      Text('Kupon kiritib "Tekshirish" bosing', style: TextStyle(color: AppColors.textLight, fontSize: 12)),
                    ],
                    const SizedBox(height: 24),

                    const Text(
                      'Mijoz ma\'lumotlari',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textBlack,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Name field
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.shadow,
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: TextFormField(
                        controller: _customerNameController,
                        decoration: const InputDecoration(
                          labelText: 'Ism va familiya',
                          prefixIcon: Icon(Icons.person, color: AppColors.primaryGreen),
                          border: InputBorder.none,
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Ism va familiyani kiriting';
                          }
                          return null;
                        },
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Delivery location section
                    Consumer<LocationProvider>(
                      builder: (context, locationProvider, child) {
                        final position = locationProvider.currentPosition;
                        final address = position != null ? _currentAddressLabel(locationProvider) : 'Lokatsiya aniqlanmadi';

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Yetkazib berish manzili',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textBlack,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.shadow,
                                    blurRadius: 10,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  TextFormField(
                                    controller: _deliveryAddressController,
                                    decoration: const InputDecoration(
                                      labelText: 'Yetkazib berish manzili (qo\'lda)',
                                      prefixIcon: Icon(Icons.home_outlined, color: AppColors.primaryGreen),
                                      border: InputBorder.none,
                                    ),
                                    minLines: 1,
                                    maxLines: 3,
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    address,
                                    style: const TextStyle(fontSize: 14, color: AppColors.textGray),
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: ElevatedButton.icon(
                                          onPressed: () async {
                                            await locationProvider.getCurrentLocation();
                                            setState(() {});
                                          },
                                          icon: const Icon(Icons.my_location),
                                          label: const Text('Lokatsiyani yangilash'),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      ElevatedButton.icon(
                                        onPressed: () {
                                          GoRouter.of(context).push('/location');
                                        },
                                        icon: const Icon(Icons.map),
                                        label: const Text('Xarita'),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.accentOrange,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 20),
                          ],
                        );
                      },
                    ),

                    // Phone numbers section
                    const Text(
                      'Telefon raqamlar',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textBlack,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Kamida bitta, ko\'pi bilan 3 ta raqam qo\'shishingiz mumkin',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textLight,
                      ),
                    ),
                    const SizedBox(height: 12),

                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _phoneControllers.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        return Row(
                          children: [
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: AppColors.divider),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.shadow,
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: TextFormField(
                                  controller: _phoneControllers[index],
                                  keyboardType: TextInputType.phone,
                                  decoration: InputDecoration(
                                    labelText: 'Telefon raqam ${index + 1}',
                                    hintText: '+998901234567',
                                    prefixIcon: const Icon(Icons.phone, color: AppColors.primaryGreen),
                                    border: InputBorder.none,
                                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                                  ),
                                  validator: (value) {
                                    if (index == 0 && (value == null || value.trim().isEmpty)) {
                                      return 'Telefon raqamni kiriting';
                                    }
                                    if (value != null && value.isNotEmpty && !RegExp(r'^\+998\d{9}$').hasMatch(value)) {
                                      return 'To\'g\'ri raqam kiriting (+998xxxxxxxxx)';
                                    }
                                    return null;
                                  },
                                ),
                              ),
                            ),
                            if (_phoneControllers.length > 1)
                              IconButton(
                                icon: const Icon(Icons.remove_circle, color: AppColors.error),
                                onPressed: () => _removePhoneField(index),
                              ),
                          ],
                        );
                      },
                    ),

                    if (_phoneControllers.length < 3) ...[
                      const SizedBox(height: 12),
                      TextButton.icon(
                        onPressed: _addPhoneField,
                        icon: const Icon(Icons.add, color: AppColors.primaryGreen),
                        label: const Text(
                          'Yana raqam qo\'shish',
                          style: TextStyle(color: AppColors.primaryGreen),
                        ),
                      ),
                    ],

                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.shadow,
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: TextFormField(
                        controller: _notesController,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          labelText: 'Qo\'shimcha izoh (ixtiyoriy)',
                          prefixIcon: Icon(Icons.note, color: AppColors.primaryGreen),
                          border: InputBorder.none,
                        ),
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Payment info
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.shadow,
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.success.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.money,
                              color: AppColors.success,
                              size: 28,
                            ),
                          ),
                          const SizedBox(width: 16),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Naqd pul',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textBlack,
                                  ),
                                ),
                                Text(
                                  'Yetkazib berish vaqtida to\'lov',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: AppColors.textGray,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.check_circle, color: AppColors.success),
                        ],
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Place Order Button
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _placeOrder,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryGreen,
                          foregroundColor: Colors.white,
                          elevation: 4,
                          shadowColor: AppColors.primaryGreen.withValues(alpha: 0.3),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 24,
                                width: 24,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text(
                                'Buyurtma berish',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Bepul yetkazish motivatsiyasi
                    Consumer<CartProvider>(
                      builder: (context, cart, _) {
                        if (cart.totalAmount >= OrderService.freeDeliveryThreshold) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.success.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.success),
                              ),
                              child: const Row(
                                children: [
                                  Icon(Icons.check_circle, color: AppColors.success, size: 20),
                                  SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      'Bepul yetkazib berish!',
                                      style: TextStyle(
                                        color: AppColors.success,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }
                        final remaining = OrderService.freeDeliveryThreshold - cart.totalAmount;
                        if (remaining > 0 && remaining <= OrderService.freeDeliveryThreshold) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.accentOrange.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.accentOrange),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.local_shipping, color: AppColors.accentOrange, size: 20),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      'Yana ${remaining.toInt().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]} ')} so\'m qo\'shsangiz, BEPUL yetkazib berish!',
                                      style: const TextStyle(
                                        color: AppColors.accentOrange,
                                        fontWeight: FontWeight.w500,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }
                        return const SizedBox.shrink();
                      },
                    ),

                    // Terms text
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        'Buyurtma berish orqali siz yetkazib berish shartlariga rozilik bildirasiz.',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textLight,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}