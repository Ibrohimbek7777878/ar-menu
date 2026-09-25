import 'package:flutter_test/flutter_test.dart';
import 'package:store_guliston/models/shop.dart';
import 'package:store_guliston/models/product.dart';

void main() {
  test('Shop model creates correctly', () {
    final shop = Shop(
      id: 'test_1',
      name: 'Test Shop',
      address: 'Test Address',
      phone: '+998901234567',
      latitude: 40.5966,
      longitude: 68.7786,
      category: 'oziq-ovqat',
      imageUrl: '',
      workingHours: '08:00 - 22:00',
      isOpen: true,
      rating: 4.5,
    );
    expect(shop.id, 'test_1');
    expect(shop.name, 'Test Shop');
    expect(shop.isOpen, true);
  });

  test('Product model creates correctly', () {
    final product = Product(
      id: 'prod_test',
      name: 'Test Product',
      price: 12000,
      imageUrl: '',
      unit: 'kg',
      description: 'Test description',
      shopId: 'test_1',
      category: 'Mevalar',
      isAvailable: true,
      stock: 100,
    );
    expect(product.id, 'prod_test');
    expect(product.price, 12000);
    expect(product.isAvailable, true);
  });
}
