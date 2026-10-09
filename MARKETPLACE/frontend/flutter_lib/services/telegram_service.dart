import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class TelegramService {
  // TODO: Firebase setup dan keyin bu tokenlarni kiriting
  static const String _botToken = 'YOUR_BOT_TOKEN';
  static const String _chatId = 'YOUR_CHAT_ID';

  Future<void> sendOrderNotification({
    required String orderNumber,
    required String customerName,
    required String customerPhone,
    required String shopName,
    required double totalAmount,
    required List<Map<String, dynamic>> items,
  }) async {
    if (_botToken == 'YOUR_BOT_TOKEN') {
      debugPrint('Telegram bot token hali sozlanmagan');
      return;
    }

    final itemsText = items.map((item) =>
      '  • ${item['name']} x${item['quantity']} — ${item['price']} so\'m'
    ).join('\n');

    final message = '''
🆕 YANGI BUYURTMA!

📋 Buyurtma: $orderNumber
🏪 Do'kon: $shopName
👤 Mijoz: $customerName
📞 Telefon: $customerPhone
💰 Jami: ${totalAmount.toStringAsFixed(0)} so'm

📦 Mahsulotlar:
$itemsText

✅ Tasdiqlash uchun admin panelga kiring
''';

    try {
      final url = Uri.parse('https://api.telegram.org/bot$_botToken/sendMessage');
      await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'chat_id': _chatId,
          'text': message,
        }),
      );
    } catch (e) {
      debugPrint('Telegram xabar yuborishda xato: $e');
    }
  }

  Future<void> sendStatusUpdate({
    required String orderNumber,
    required String newStatus,
    required String customerPhone,
  }) async {
    if (_botToken == 'YOUR_BOT_TOKEN') return;

    final statusText = {
      'confirmed': '✅ Tasdiqlandi',
      'preparing': '🍳 Tayyorlanmoqda',
      'courier_assigned': '🛵 Kuryer biriktirildi',
      'out_for_delivery': '🚚 Yo\'lda',
      'delivered': '🎉 Yetkazildi',
      'cancelled': '❌ Bekor qilindi',
    }[newStatus] ?? newStatus;

    final message = '''
📊 BUYURTMA STATUSI O'ZGARDI!

📋 Buyurtma: $orderNumber
📊 Yangi status: $statusText
📞 Mijoz: $customerPhone
''';

    try {
      final url = Uri.parse('https://api.telegram.org/bot$_botToken/sendMessage');
      await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'chat_id': _chatId,
          'text': message,
        }),
      );
    } catch (e) {
      debugPrint('Telegram status xabarida xato: $e');
    }
  }
}
