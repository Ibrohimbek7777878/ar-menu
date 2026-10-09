import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class InstagramBlock extends StatelessWidget {
  final String? instagramUrl;
  final String shopName;
  const InstagramBlock({super.key, this.instagramUrl, required this.shopName});

  @override
  Widget build(BuildContext context) {
    if (instagramUrl == null || instagramUrl!.isEmpty) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFFF58529), Color(0xFFDD2A7B), Color(0xFF515BD4)]),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(children: [
        Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)), child: const Icon(Icons.camera_alt, size: 20, color: Color(0xFFDD2A7B))),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Instagram', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
            Text(shopName, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
          ]),
        ),
        ElevatedButton(
          onPressed: () async {
            final url = Uri.parse(instagramUrl!);
            if (await canLaunchUrl(url)) await launchUrl(url, mode: LaunchMode.externalApplication);
          },
          style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: const Color(0xFFDD2A7B), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
          child: const Text('Ochish', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
        ),
      ]),
    );
  }
}
