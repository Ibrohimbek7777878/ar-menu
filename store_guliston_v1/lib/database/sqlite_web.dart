import 'dart:async';

typedef OnDatabaseCreateFn = Future<void> Function(Database db, int version);

typedef OnDatabaseOpenFn = Future<void> Function(Database db);

class ConflictAlgorithm {
  static const int replace = 0;
  static const int ignore = 1;
}

class Sqflite {
  static int? firstIntValue(List<Map<String, Object?>>? values) {
    if (values == null || values.isEmpty) return null;
    final first = values.first.values.first;
    if (first is int) return first;
    if (first is num) return first.toInt();
    return null;
  }
}

Future<String> getDatabasesPath() async => '/';

Future<void> deleteDatabase(String path) async {}

Future<Database> openDatabase(
  String path, {
  required int version,
  OnDatabaseCreateFn? onCreate,
  OnDatabaseOpenFn? onOpen,
  Future<void> Function(Database db, int oldVersion, int newVersion)? onUpgrade,
}) async {
  final db = Database._();
  if (onCreate != null) {
    await onCreate(db, version);
  }
  if (onOpen != null) {
    await onOpen(db);
  }
  if (onUpgrade != null) {
    await onUpgrade(db, version - 1, version);
  }
  return db;
}

class Database {
  final Map<String, List<Map<String, Object?>>> _tables = {};

  Database._();

  Future<void> execute(String sql) async {
    final normalized = sql.trim().toLowerCase();
    if (normalized.startsWith('create table')) {
      final match = RegExp(r'create table\s+if not exists\s+([a-zA-Z0-9_]+)|create table\s+([a-zA-Z0-9_]+)', caseSensitive: false).firstMatch(sql);
      final name = match?.group(1) ?? match?.group(2);
      if (name != null) {
        _tables.putIfAbsent(name, () => <Map<String, Object?>>[]);
      }
    } else if (normalized.startsWith('create index') || normalized.startsWith('create unique index')) {
      // no-op for indexes
    } else if (normalized == 'vacuum') {
      // no-op for web
    }
  }

  Future<List<Map<String, Object?>>> query(
    String table, {
    String? where,
    List<Object?>? whereArgs,
    String? orderBy,
    int? limit,
  }) async {
    final rows = _tables[table] ?? <Map<String, Object?>>[];
    final filtered = rows.where((row) => _matchesWhere(row, where, whereArgs)).toList();
    if (orderBy != null && orderBy.isNotEmpty) {
      final orderParts = orderBy.split(' ');
      final orderKey = orderParts[0].trim();
      final descending = orderParts.length > 1 && orderParts[1].toLowerCase() == 'desc';
      filtered.sort((a, b) {
        final valueA = a[orderKey];
        final valueB = b[orderKey];
        if (valueA is Comparable && valueB is Comparable) {
          return descending ? valueB.compareTo(valueA) : valueA.compareTo(valueB);
        }
        return 0;
      });
    }
    if (limit != null && filtered.length > limit) {
      return filtered.sublist(0, limit);
    }
    return List<Map<String, Object?>>.from(filtered);
  }

  Future<int> insert(
    String table,
    Map<String, Object?> values, {
    int? conflictAlgorithm,
  }) async {
    final rows = _tables.putIfAbsent(table, () => <Map<String, Object?>>[]);
    final id = values['id'];
    if (id != null) {
      final existingIndex = rows.indexWhere((row) => row['id'] == id);
      if (existingIndex != -1) {
        if (conflictAlgorithm == ConflictAlgorithm.ignore) {
          return 0;
        }
        if (conflictAlgorithm == ConflictAlgorithm.replace) {
          rows.removeAt(existingIndex);
        }
      }
    }
    rows.add(Map<String, Object?>.from(values));
    return 1;
  }

  Future<int> update(
    String table,
    Map<String, Object?> values, {
    String? where,
    List<Object?>? whereArgs,
  }) async {
    final rows = _tables[table] ?? <Map<String, Object?>>[];
    var count = 0;
    for (var i = 0; i < rows.length; i++) {
      if (_matchesWhere(rows[i], where, whereArgs)) {
        rows[i] = {...rows[i], ...values};
        count++;
      }
    }
    return count;
  }

  Future<int> delete(
    String table, {
    String? where,
    List<Object?>? whereArgs,
  }) async {
    final rows = _tables[table] ?? <Map<String, Object?>>[];
    final toRemove = rows.where((row) => _matchesWhere(row, where, whereArgs)).toList();
    for (final row in toRemove) {
      rows.remove(row);
    }
    return toRemove.length;
  }

  Future<List<Map<String, Object?>>> rawQuery(String sql, [List<Object?>? arguments]) async {
    final lower = sql.toLowerCase();
    if (lower.contains('select count(*)')) {
      final list = _tables['orders'] ?? <Map<String, Object?>>[];
      return <Map<String, Object?>>[{'count': list.length}];
    }
    if (lower.contains('select sum(final_amount)')) {
      final orders = _tables['orders'] ?? <Map<String, Object?>>[];
      final statuses = arguments?.map((arg) => arg?.toString()).whereType<String>().toList() ?? <String>[];
      final total = orders.where((order) {
        final status = order['status']?.toString() ?? '';
        return statuses.contains(status);
      }).fold<double>(0.0, (sum, order) {
        final value = order['final_amount'];
        if (value is num) {
          return sum + value.toDouble();
        }
        if (value is String) {
          return sum + (double.tryParse(value) ?? 0.0);
        }
        return sum;
      });
      return <Map<String, Object?>>[{'total': total}];
    }
    return <Map<String, Object?>>[];
  }

  Future<T> transaction<T>(Future<T> Function(Transaction txn) action) async {
    return action(Transaction(this));
  }

  bool _matchesWhere(
    Map<String, Object?> row,
    String? where,
    List<Object?>? whereArgs,
  ) {
    if (where == null || where.isEmpty) return true;
    var argIndex = 0;
    final clauses = where.split(RegExp(r'\s+and\s+', caseSensitive: false));
    for (final clause in clauses) {
      final normalized = clause.trim();
      final orParts = normalized.split(RegExp(r'\s+or\s+', caseSensitive: false));
      if (orParts.length > 1) {
        var hasOne = false;
        for (final orClause in orParts) {
          if (_evaluateSimpleClause(row, orClause.trim(), whereArgs, () => argIndex++)) {
            hasOne = true;
            break;
          }
        }
        if (!hasOne) return false;
      } else if (!_evaluateSimpleClause(row, normalized, whereArgs, () => argIndex++)) {
        return false;
      }
    }
    return true;
  }

  bool _evaluateSimpleClause(
    Map<String, Object?> row,
    String clause,
    List<Object?>? whereArgs,
    int Function() getNextArgIndex,
  ) {
    if (clause.contains(' like ')) {
      final parts = clause.split(RegExp(r'\s+like\s+', caseSensitive: false));
      final column = parts[0].trim();
      final argValue = _getArgValue(whereArgs, getNextArgIndex());
      final pattern = argValue?.toString() ?? '';
      final value = row[column]?.toString() ?? '';
      final patternText = pattern.replaceAll('%', '');
      return value.toLowerCase().contains(patternText.toLowerCase());
    }

    if (clause.contains('=')) {
      final parts = clause.split('=');
      final column = parts[0].trim();
      final right = parts[1].trim();
      if (right == '?') {
        final argValue = _getArgValue(whereArgs, getNextArgIndex());
        return _compareValue(row[column], argValue);
      }
      final literal = right.replaceAll('?', '').trim();
      final numeric = num.tryParse(literal);
      if (numeric != null) {
        return _compareValue(row[column], numeric);
      }
      final text = literal.replaceAll("'", '').replaceAll('"', '');
      return _compareValue(row[column], text);
    }

    return false;
  }

  Object? _getArgValue(List<Object?>? args, int index) {
    if (args == null || index >= args.length) return null;
    return args[index];
  }

  bool _compareValue(Object? left, Object? right) {
    if (left == null || right == null) return false;
    if (left is num && right is num) return left == right;
    return left.toString() == right.toString();
  }
}

class Transaction {
  final Database _db;

  Transaction(this._db);

  Future<int> insert(
    String table,
    Map<String, Object?> values, {
    int? conflictAlgorithm,
  }) async {
    return _db.insert(table, values, conflictAlgorithm: conflictAlgorithm);
  }

  Future<int> update(
    String table,
    Map<String, Object?> values, {
    String? where,
    List<Object?>? whereArgs,
  }) async {
    return _db.update(table, values, where: where, whereArgs: whereArgs);
  }

  Future<int> delete(
    String table, {
    String? where,
    List<Object?>? whereArgs,
  }) async {
    return _db.delete(table, where: where, whereArgs: whereArgs);
  }
}
