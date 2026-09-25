import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

class FileService {
  final _uuid = const Uuid();

  /// Save a picked image file to app documents and return the saved path.
  Future<String> savePickedImage(File file) async {
    final docs = await getApplicationDocumentsDirectory();
    final ext = file.path.split('.').last;
    final fileName = '${_uuid.v4()}.$ext';
    final saved = File('${docs.path}/$fileName');
    final bytes = await file.readAsBytes();
    await saved.writeAsBytes(bytes, flush: true);
    return saved.path;
  }
}
