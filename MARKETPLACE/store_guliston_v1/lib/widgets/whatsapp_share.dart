import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class WhatsAppShare {
  static Future<void> shareShop(BuildContext context, {required String shopName, required String shopSlug}) async {
    final text = Uri.encodeComponent('Do\'kon: $shopName\nhttps://armenu.uz/shop/$shopSlug/\nOnline Store Guliston orqali ko\'ring!');
    final url = Uri.parse('https://wa.me/?text=$text');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('WhatsApp ochilmadi')));
    }
  }

  static Future<void> shareProduct(BuildContext context, {required String productName, required String shopName, required double price}) async {
    final text = Uri.encodeComponent('Mahsulot: $productName ($shopName) - ${price.toStringAsFixed(0)} so\'m\nhttps://armenu.uz/\nAR da ko\'rib buyurtma bering!');
    final url = Uri.parse('https://wa.me/?text=$text');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  static Widget buttonShop(BuildContext context, {required String shopName, required String shopSlug}) {
    return IconButton(
      icon: const Icon(Icons.share, size: 18, color: Color(0xFF25D366)),
      tooltip: 'WhatsApp ulashish',
      onPressed: () => shareShop(context, shopName: shopName, shopSlug: shopSlug),
    );
  }
}
