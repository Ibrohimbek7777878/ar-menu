import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';

// Storage service for handling image uploads
class StorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;

  // Upload image to Firebase Storage
  Future<String> uploadImage(
    String imagePath,
    String fileName,
  ) async {
    try {
      final ref = _storage.ref().child('images/$fileName');
      await ref.putFile(File(imagePath));
      final url = await ref.getDownloadURL();
      return url;
    } catch (e) {
      throw Exception('Failed to upload image: $e');
    }
  }

  // Upload multiple images
  Future<List<String>> uploadImages(
    List<String> imagePaths,
    String folderName,
  ) async {
    final urls = <String>[];
    for (int i = 0; i < imagePaths.length; i++) {
      final imagePath = imagePaths[i];
      final fileName = '${folderName}_${DateTime.now().millisecondsSinceEpoch}_$i.jpg';
      final url = await uploadImage(imagePath, fileName);
      urls.add(url);
    }
    return urls;
  }
}