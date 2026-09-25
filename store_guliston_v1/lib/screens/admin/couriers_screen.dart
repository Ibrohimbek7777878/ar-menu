import 'package:flutter/material.dart';

import '../../config/app_colors.dart';
import '../../database/database_helper.dart';
import '../../models/courier.dart';
import '../../services/admin_auth.dart';
import '../../widgets/admin_scaffold.dart';
import '../../widgets/hover_action_button.dart';
import '../../widgets/shimmer_placeholder.dart';

class CouriersScreen extends StatefulWidget {
  const CouriersScreen({super.key});

  @override
  State<CouriersScreen> createState() => _CouriersScreenState();
}

class _CouriersScreenState extends State<CouriersScreen> {
  final DatabaseHelper _dbHelper = DatabaseHelper();
  List<Courier> _couriers = [];
  bool _isLoading = true;
  Courier? _selectedCourier;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await AdminAuth().redirectToLoginIfNeeded(context);
      await _loadCouriers();
    });
  }

  Future<void> _loadCouriers() async {
    setState(() => _isLoading = true);
    final db = await _dbHelper.database;
    final maps = await db.query('couriers', orderBy: 'created_at DESC');
    if (!mounted) return;
    setState(() {
      _couriers = maps.map((map) => Courier.fromMap(map)).toList();
      _isLoading = false;
    });
  }

  Future<void> _addOrEditCourier({Courier? existing}) async {
    final nameController = TextEditingController(text: existing?.name ?? '');
    final phoneController = TextEditingController(text: existing?.phone ?? '');
    final formKey = GlobalKey<FormState>();

    final result = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
          left: 24,
          right: 24,
          top: 24,
        ),
        child: Material(
          color: AppColors.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          child: Form(
            key: formKey,
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.divider, borderRadius: BorderRadius.circular(2)))),
                  const SizedBox(height: 20),
                  Text(existing == null ? 'Yangi kuryer' : 'Kuryerni tahrirlash', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.textBlack)),
                  const SizedBox(height: 20),
                  _buildField('Kuryer ismi', nameController, Icons.person, validator: (v) => v == null || v.isEmpty ? 'Ism kiriting' : null),
                  const SizedBox(height: 12),
                  _buildField('Telefon', phoneController, Icons.phone, keyboardType: TextInputType.phone, validator: (v) => v == null || v.isEmpty ? 'Telefon kiriting' : null),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: () {
                        if (!formKey.currentState!.validate()) return;
                        Navigator.pop(ctx, {'name': nameController.text, 'phone': phoneController.text});
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryGreen,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: Text(existing == null ? 'Qo\'shish' : 'Saqlash', style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    if (result == null) return;

    final db = await _dbHelper.database;
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;

    if (existing == null) {
      await db.insert('couriers', {
        'id': 'cour_$now',
        'name': result['name'],
        'phone': result['phone'],
        'status': 'active',
        'created_at': now,
      });
    } else {
      await db.update('couriers', {'name': result['name'], 'phone': result['phone']}, where: 'id = ?', whereArgs: [existing.id]);
    }

    await _loadCouriers();
  }

  Future<void> _deleteCourier(Courier courier) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Kuryerni o\'chirish'),
        content: Text('"${courier.name}" kuryerini o\'chirmoqchimisiz?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Bekor qilish')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('O\'chirish', style: TextStyle(color: AppColors.error))),
        ],
      ),
    );

    if (confirmed == true) {
      final db = await _dbHelper.database;
      await db.delete('couriers', where: 'id = ?', whereArgs: [courier.id]);
      await _loadCouriers();
    }
  }

  Future<void> _toggleStatus(Courier courier) async {
    final newStatus = courier.status == 'active' ? 'busy' : courier.status == 'busy' ? 'offline' : 'active';
    final db = await _dbHelper.database;
    await db.update('couriers', {'status': newStatus}, where: 'id = ?', whereArgs: [courier.id]);
    await _loadCouriers();
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'active':
        return AppColors.statusDelivered;
      case 'busy':
        return AppColors.statusPreparing;
      case 'offline':
        return AppColors.statusCancelled;
      default:
        return AppColors.textGray;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'active':
        return 'Faol';
      case 'busy':
        return 'Band';
      case 'offline':
        return 'Dam olishda';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    return AdminScaffold(
      title: 'Kuryerlar',
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (_isLoading) {
            return ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: 6,
              itemBuilder: (_, __) => const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: ShimmerPlaceholder(width: double.infinity, height: 80),
              ),
            );
          }

          if (constraints.maxWidth >= 800) {
            return Row(
              children: [
                Expanded(child: _courierList()),
                const VerticalDivider(width: 1),
                Expanded(
                  child: _selectedCourier != null ? _courierDetail(_selectedCourier!) : const Center(child: Text('Kuryerni tanlang')),
                ),
              ],
            );
          }
          return _courierList();
        },
      ),
    );
  }

  Widget _courierList() {
    if (_couriers.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadCouriers,
        child: ListView(
          children: const [
            SizedBox(height: 100),
            Center(
              child: Column(
                children: [
                  Icon(Icons.delivery_dining_outlined, size: 64, color: AppColors.textLight),
                  SizedBox(height: 16),
                  Text('Kuryerlar topilmadi', style: TextStyle(color: AppColors.textGray)),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadCouriers,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: _couriers.length,
        itemBuilder: (context, index) {
          final courier = _couriers[index];
          final color = _statusColor(courier.status);
          return InkWell(
            onTap: () => setState(() => _selectedCourier = courier),
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 8, offset: const Offset(0, 2))],
              ),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [color.withValues(alpha: 0.18), color.withValues(alpha: 0.08)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(Icons.delivery_dining, color: color, size: 26),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(courier.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.textBlack)),
                          const SizedBox(height: 4),
                          Text(courier.phone, style: const TextStyle(fontSize: 13, color: AppColors.textGray)),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: color.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  _statusLabel(courier.status),
                                  style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    GestureDetector(
                      onTap: () => _toggleStatus(courier),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(8)),
                        child: Text(_statusLabel(courier.status), style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Column(
                      children: [
                        HoverActionButton(icon: Icons.edit, onPressed: () => _addOrEditCourier(existing: courier)),
                        const SizedBox(height: 8),
                        HoverActionButton(icon: Icons.delete, onPressed: () => _deleteCourier(courier)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _courierDetail(Courier courier) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(color: AppColors.primaryGreen.withValues(alpha: 0.14), blurRadius: 16, offset: const Offset(0, 6)),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 54,
                  height: 54,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Icon(Icons.delivery_dining, color: Colors.white, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(courier.name, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 4),
                      Text(courier.phone, style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 13)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(courier.name, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: AppColors.textBlack)),
          const SizedBox(height: 16),
          Text('Telefon: ${courier.phone}', style: const TextStyle(fontSize: 16, color: AppColors.textGray)),
          const SizedBox(height: 16),
          Text('Holat: ${_statusLabel(courier.status)}', style: const TextStyle(fontSize: 16, color: AppColors.textGray)),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () => _addOrEditCourier(existing: courier),
            icon: const Icon(Icons.edit, size: 18),
            label: const Text('Tahrirlash'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => _deleteCourier(courier),
            icon: const Icon(Icons.delete, size: 18),
            label: const Text('Oʻchirish'),
            style: OutlinedButton.styleFrom(foregroundColor: AppColors.error, side: const BorderSide(color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  Widget _buildField(String hint, TextEditingController controller, IconData icon, {TextInputType? keyboardType, String? Function(String?)? validator}) {
    return Container(
      decoration: BoxDecoration(color: AppColors.backgroundGray, borderRadius: BorderRadius.circular(12)),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        validator: validator,
        decoration: InputDecoration(
          hintText: hint,
          prefixIcon: Icon(icon, color: AppColors.textGray, size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
    );
  }
}
