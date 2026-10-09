import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../models/category.dart';
import '../../database/database_helper.dart';
import '../../services/admin_auth.dart';
import '../../widgets/admin_scaffold.dart';
import '../../widgets/hover_action_button.dart';
import '../../widgets/shimmer_placeholder.dart';

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  final DatabaseHelper _dbHelper = DatabaseHelper();
  List<Category> _categories = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await AdminAuth().redirectToLoginIfNeeded(context);
      _loadCategories();
    });
  }

  Future<void> _loadCategories() async {
    setState(() => _isLoading = true);
    final db = await _dbHelper.database;
    final maps = await db.query('categories', orderBy: 'sort_order ASC');
    setState(() {
      _categories = maps.map((map) => Category.fromMap(map)).toList();
      _isLoading = false;
    });
  }

  Future<void> _addOrEditCategory({Category? existing}) async {
    final nameController = TextEditingController(text: existing?.name ?? '');
    final colorController = TextEditingController(text: existing?.color ?? '#4CAF50');
    final sortController = TextEditingController(text: existing != null ? existing.sortOrder.toString() : '0');
    final formKey = GlobalKey<FormState>();

    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Container(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
            left: 24,
            right: 24,
            top: 24,
          ),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.divider, borderRadius: BorderRadius.circular(2)))),
                const SizedBox(height: 20),
                Text(
                  existing == null ? 'Yangi kategoriya' : 'Kategoriyani tahrirlash',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.textBlack),
                ),
                const SizedBox(height: 20),
                _buildField('Kategoriya nomi', nameController, Icons.category, validator: (v) => v!.isEmpty ? 'Nom kiriting' : null),
                const SizedBox(height: 12),
                _buildField('Rang (hex)', colorController, Icons.color_lens, hintText: '#4CAF50', validator: (v) => v!.isEmpty ? 'Rang kiriting' : null),
                const SizedBox(height: 12),
                _buildField('Tartib raqami', sortController, Icons.sort, keyboardType: TextInputType.number),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () {
                      if (!formKey.currentState!.validate()) return;
                      Navigator.pop(ctx, {
                        'name': nameController.text,
                        'color': colorController.text,
                        'sort_order': int.tryParse(sortController.text) ?? 0,
                      });
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
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );

    if (result == null) return;

    final db = await _dbHelper.database;
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;

    if (existing == null) {
      await db.insert('categories', {
        'id': 'cat_$now',
        'name': result['name'],
        'color': result['color'],
        'icon_url': '',
        'sort_order': result['sort_order'],
      });
    } else {
      await db.update('categories', {
        'name': result['name'],
        'color': result['color'],
        'sort_order': result['sort_order'],
      }, where: 'id = ?', whereArgs: [existing.id]);
    }
    _loadCategories();
  }

  Future<void> _deleteCategory(Category category) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Kategoriyani o\'chirish'),
        content: Text('"${category.name}" kategoriyasini o\'chirmoqchimisiz?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Bekor qilish')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('O\'chirish', style: TextStyle(color: AppColors.error))),
        ],
      ),
    );
    if (confirmed == true) {
      final db = await _dbHelper.database;
      await db.delete('categories', where: 'id = ?', whereArgs: [category.id]);
      _loadCategories();
    }
  }

  @override
  Widget build(BuildContext context) {
    return AdminScaffold(
      title: 'Kategoriyalar',
      floatingActionButton: FloatingActionButton(
        onPressed: () => _addOrEditCategory(),
        backgroundColor: AppColors.primaryGreen,
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          _buildSummaryHeader(),
          const SizedBox(height: 12),
          Expanded(
            child: _isLoading
                ? const ShimmerPlaceholder(itemCount: 6)
                : RefreshIndicator(
                    onRefresh: _loadCategories,
                    child: _categories.isEmpty
                        ? ListView(
                            children: const [
                              SizedBox(height: 100),
                              Center(
                                child: Column(
                                  children: [
                                    Icon(Icons.category_outlined, size: 64, color: AppColors.textLight),
                                    SizedBox(height: 16),
                                    Text('Kategoriyalar topilmadi', style: TextStyle(color: AppColors.textGray)),
                                  ],
                                ),
                              ),
                            ],
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            itemCount: _categories.length,
                            itemBuilder: (context, index) {
                              final category = _categories[index];
                              Color color;
                              try {
                                color = Color(int.parse(category.color.replaceFirst('#', '0xFF')));
                              } catch (_) {
                                color = AppColors.primaryGreen;
                              }
                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(20),
                                  boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 8, offset: const Offset(0, 2))],
                                ),
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(20),
                                  onTap: () => _addOrEditCategory(existing: category),
                                  child: Padding(
                                    padding: const EdgeInsets.all(14),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 52,
                                          height: 52,
                                          decoration: BoxDecoration(
                                            gradient: LinearGradient(
                                              colors: [color.withValues(alpha: 0.18), color.withValues(alpha: 0.08)],
                                              begin: Alignment.topLeft,
                                              end: Alignment.bottomRight,
                                            ),
                                            borderRadius: BorderRadius.circular(16),
                                          ),
                                          child: Icon(Icons.category, color: color, size: 26),
                                        ),
                                        const SizedBox(width: 14),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Expanded(
                                                    child: Text(category.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.textBlack)),
                                                  ),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                    decoration: BoxDecoration(
                                                      color: color.withValues(alpha: 0.12),
                                                      borderRadius: BorderRadius.circular(999),
                                                    ),
                                                    child: Text(
                                                      '№${category.sortOrder}',
                                                      style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 4),
                                              Text('Rang: ${category.color}', style: const TextStyle(fontSize: 12, color: AppColors.textGray)),
                                            ],
                                          ),
                                        ),
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            HoverActionButton(
                                              icon: Icons.edit,
                                              color: AppColors.accentOrange,
                                              onPressed: () => _addOrEditCategory(existing: category),
                                            ),
                                            const SizedBox(width: 4),
                                            HoverActionButton(
                                              icon: Icons.delete,
                                              color: AppColors.error,
                                              onPressed: () => _deleteCategory(category),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryHeader() {
    return Container(
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
            child: const Icon(Icons.category, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_categories.length} kategoriya',
                  style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  'Tartib va ranglarni boshqaring',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 13),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Text(
              'CMS',
              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildField(String label, TextEditingController controller, IconData icon,
      {TextInputType? keyboardType, String? hintText, String? Function(String?)? validator}) {
    return Container(
      decoration: BoxDecoration(color: AppColors.backgroundGray, borderRadius: BorderRadius.circular(12)),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        validator: validator,
        decoration: InputDecoration(
          hintText: hintText ?? label,
          prefixIcon: Icon(icon, color: AppColors.textGray, size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
    );
  }
}
