/// Storage datasource - data layer

import 'package:firebase_storage/firebase_storage.dart';
import 'package:online_store_guliston/domain/failures/failure.dart';
import 'package:dartz/dartz.dart';

// Storage datasource implementation
class StorageDatasource {
  final FirebaseStorage _storage = FirebaseStorage.instance;

  // Upload image to Firebase Storage
  Future<Either<Failure, String>> uploadImage(
    String imagePath,
    String fileName,
  ) async {
    try {
      final ref = _storage.ref().child('images/$fileName');
      await ref.putFile(File(imagePath));
      final url = await ref.getDownloadURL();
      return Right(url);
    } catch (e) {
      return Left(Failure('Rasmni yuklashda xatolik: ${e.toString()}'));
    }
  }

  // Upload multiple images
  Future<Either<Failure, List<String>>> uploadImages(
    List<String> imagePaths,
    String folderName,
  ) async {
    try {
      final urls = <String>[];
      for (int i = 0; i < imagePaths.length; i++) {
        final imagePath = imagePaths[i];
        final fileName = '${folderName}_${DateTime.now().millisecondsSinceEpoch}_$i.jpg';
        final url = await uploadImage(imagePath, fileName);
        if (url.isRight()) {
          urls.add(url.getOrElse(() => ''));
        } else {
          return Left(url.swap()!);
        }
      }
      return Right(urls);
    } catch (e) {
      return Left(Failure('Rasmlarni yuklashda xatolik: ${e.toString()}'));
    }
  }
}