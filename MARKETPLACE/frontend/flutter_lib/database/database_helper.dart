import 'sqlite.dart';
import 'package:path/path.dart';

class DatabaseHelper {
  static const String dbName = 'store_guliston.db';
  static const int dbVersion = 2;

  static final DatabaseHelper _instance = DatabaseHelper._internal();

  factory DatabaseHelper() {
    return _instance;
  }

  DatabaseHelper._internal();

  static Database? _database;

  Future<Database> get database async {
    _database ??= await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, dbName);

    return openDatabase(
      path,
      version: dbVersion,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < newVersion) {
      await _seedDatabase(db);
    }
  }

  Future<void> _onCreate(Database db, int version) async {
    // Create categories table
    await db.execute('''
      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon_url TEXT,
        color TEXT,
        sort_order INTEGER DEFAULT 0
      )
    ''');

    // Create shops table
    await db.execute('''
      CREATE TABLE shops (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL CHECK(city IN ('yangi_yer', 'guliston')),
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        phone TEXT,
        opening_time TEXT,
        closing_time TEXT,
        is_open INTEGER DEFAULT 1,
        rating REAL DEFAULT 0,
        image_url TEXT,
        category_id TEXT,
        created_at INTEGER DEFAULT 0,
        updated_at INTEGER DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    ''');

    // Create products table
    await db.execute('''
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        category_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        unit TEXT,
        image_url TEXT,
        is_available INTEGER DEFAULT 1,
        stock_quantity INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT 0,
        FOREIGN KEY (shop_id) REFERENCES shops(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    ''');

    // Create orders table
    await db.execute('''
      CREATE TABLE orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        shop_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone_1 TEXT NOT NULL,
        customer_phone_2 TEXT,
        customer_phone_3 TEXT,
        delivery_address TEXT,
        delivery_lat REAL,
        delivery_lng REAL,
        is_pickup INTEGER DEFAULT 0,
        total_amount REAL NOT NULL,
        delivery_fee REAL DEFAULT 0,
        final_amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        courier_name TEXT,
        courier_phone TEXT,
        customer_notes TEXT,
        created_at INTEGER DEFAULT 0,
        updated_at INTEGER DEFAULT 0,
        FOREIGN KEY (shop_id) REFERENCES shops(id)
      )
    ''');

    // Create order_items table
    await db.execute('''
      CREATE TABLE order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL CHECK(quantity > 0),
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    ''');

    // Create reviews table
    await db.execute('''
      CREATE TABLE reviews (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        order_id TEXT,
        customer_phone TEXT NOT NULL,
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at INTEGER DEFAULT 0,
        FOREIGN KEY (shop_id) REFERENCES shops(id),
        FOREIGN KEY (order_id) REFERENCES orders(id)
      )
    ''');

    // Create admins table for email+password login
    await db.execute('''
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT DEFAULT 'Super Admin',
        role TEXT DEFAULT 'super_admin',
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // Create couriers table
    await db.execute('''
      CREATE TABLE IF NOT EXISTS couriers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'busy', 'offline')),
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // Create app_settings table
    await db.execute('''
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // Create app_texts table
    await db.execute('''
      CREATE TABLE IF NOT EXISTS app_texts (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    ''');

    // Create order_status_history table
    await db.execute('''
      CREATE TABLE IF NOT EXISTS order_status_history (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_at INTEGER DEFAULT (strftime('%s', 'now')),
        notes TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    ''');

    // Create indexes
    await db.execute('CREATE INDEX idx_shops_city ON shops(city)');
    await db.execute('CREATE INDEX idx_products_shop ON products(shop_id)');
    await db.execute('CREATE INDEX idx_orders_phone ON orders(customer_phone_1)');
    await db.execute('CREATE INDEX idx_orders_created ON orders(created_at DESC)');

    // Populate with seed data
    await _seedDatabase(db);
  }

  Future<void> _seedDatabase(Database db) async {
    // Admin foydalanuvchi — faqat /admin/register orqali yaratiladi

    // Insert categories
    final categories = [
      {'id': 'cat_food', 'name': 'Oziq-ovqat', 'color': 'FF4CAF50', 'sort_order': 1},
      {'id': 'cat_drinks', 'name': 'Ichimliklar', 'color': 'FF2196F3', 'sort_order': 2},
      {'id': 'cat_dairy', 'name': 'Sut mahsulotlari', 'color': 'FFFF9800', 'sort_order': 3},
      {'id': 'cat_meat', 'name': 'Go\'sht', 'color': 'FFF44336', 'sort_order': 4},
      {'id': 'cat_vegetables', 'name': 'Sabzavotlar', 'color': 'FF8BC34A', 'sort_order': 5},
      {'id': 'cat_fruits', 'name': 'Mevalar', 'color': 'FFFFC107', 'sort_order': 6},
      {'id': 'cat_bakery', 'name': 'Non va pishiriq', 'color': 'FF795548', 'sort_order': 7},
      {'id': 'cat_hygiene', 'name': 'Gigiena', 'color': 'FF9C27B0', 'sort_order': 8},
      {'id': 'cat_home', 'name': 'Uy-ro\'zg\'or', 'color': 'FF607D8B', 'sort_order': 9},
      {'id': 'cat_local', 'name': 'Mahalliy mahsulotlar', 'color': 'FF3F51B5', 'sort_order': 10},
    ];

    for (var cat in categories) {
      await db.insert('categories', cat, conflictAlgorithm: ConflictAlgorithm.replace);
    }

    // Insert shops
    final shops = [
      {
        'id': 'shop_1',
        'name': 'Yangi Yer Market',
        'address': 'Markaziy ko\'cha 45, Yangi Yer',
        'city': 'yangi_yer',
        'latitude': 40.5966,
        'longitude': 68.7786,
        'phone': '+998901234567',
        'opening_time': '08:00',
        'closing_time': '22:00',
        'is_open': 1,
        'rating': 4.5,
        'category_id': 'cat_food',
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
        'updated_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'shop_2',
        'name': 'Choy va Kofe Do\'koni',
        'address': 'Guliston ko\'cha 12, Yangi Yer',
        'city': 'yangi_yer',
        'latitude': 40.5980,
        'longitude': 68.7800,
        'phone': '+998901234568',
        'opening_time': '07:00',
        'closing_time': '23:00',
        'is_open': 1,
        'rating': 4.2,
        'category_id': 'cat_drinks',
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
        'updated_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'shop_3',
        'name': 'Guliston Sut Bozori',
        'address': 'Dehqon bozori, Yangi Yer',
        'city': 'guliston',
        'latitude': 40.5950,
        'longitude': 68.7770,
        'phone': '+998905556667',
        'opening_time': '06:00',
        'closing_time': '20:00',
        'is_open': 1,
        'rating': 4.7,
        'category_id': 'cat_dairy',
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
        'updated_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'shop_4',
        'name': 'Nonxon Guliston',
        'address': 'Navro\'z ko\'cha 20, Guliston',
        'city': 'guliston',
        'latitude': 40.6040,
        'longitude': 68.7880,
        'phone': '+998909998877',
        'opening_time': '07:00',
        'closing_time': '21:00',
        'is_open': 1,
        'rating': 4.6,
        'category_id': 'cat_bakery',
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
        'updated_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'shop_5',
        'name': 'Mahalliy Navbahor',
        'address': 'Bozor yo\'li, Guliston',
        'city': 'guliston',
        'latitude': 40.6070,
        'longitude': 68.7850,
        'phone': '+998909112233',
        'opening_time': '08:00',
        'closing_time': '22:00',
        'is_open': 1,
        'rating': 4.8,
        'category_id': 'cat_local',
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
        'updated_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'shop_6',
        'name': 'Guliston Maxsus Do\'koni',
        'address': 'Pochtaxon ko\'cha 8, Guliston',
        'city': 'guliston',
        'latitude': 40.6085,
        'longitude': 68.7875,
        'phone': '+998901112244',
        'opening_time': '08:00',
        'closing_time': '22:00',
        'is_open': 1,
        'rating': 4.4,
        'category_id': 'cat_local',
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
        'updated_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'shop_7',
        'name': 'Frutti Land',
        'address': 'Istiqlol ko\'cha 3, Guliston',
        'city': 'guliston',
        'latitude': 40.6012,
        'longitude': 68.7878,
        'phone': '+998903223344',
        'opening_time': '07:00',
        'closing_time': '21:00',
        'is_open': 1,
        'rating': 4.6,
        'category_id': 'cat_fruits',
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
        'updated_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'shop_8',
        'name': 'Gazli Ichimliklar',
        'address': 'Yangi yor ko\'cha 5, Yangi Yer',
        'city': 'yangi_yer',
        'latitude': 40.5975,
        'longitude': 68.7790,
        'phone': '+998904334455',
        'opening_time': '09:00',
        'closing_time': '23:00',
        'is_open': 1,
        'rating': 4.3,
        'category_id': 'cat_drinks',
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
        'updated_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'shop_9',
        'name': 'Tibbiyot va Gigiena',
        'address': 'Sog\'lom yo\'l 10, Yangi Yer',
        'city': 'yangi_yer',
        'latitude': 40.5988,
        'longitude': 68.7812,
        'phone': '+998907776655',
        'opening_time': '08:00',
        'closing_time': '22:00',
        'is_open': 1,
        'rating': 4.5,
        'category_id': 'cat_hygiene',
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
        'updated_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
    ];

    for (var shop in shops) {
      await db.insert('shops', shop, conflictAlgorithm: ConflictAlgorithm.replace);
    }

    // Insert products
    final products = [
      {
        'id': 'prod_1',
        'shop_id': 'shop_1',
        'category_id': 'cat_food',
        'name': 'Non (1 dona)',
        'description': 'Yangi pishirilgan non',
        'price': 2200.0,
        'unit': 'dona',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 120,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_2',
        'shop_id': 'shop_1',
        'category_id': 'cat_food',
        'name': 'Tuxum (10 dona)',
        'description': 'Taza va sifatli tuxumlar',
        'price': 25000.0,
        'unit': 'dona',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 100,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_3',
        'shop_id': 'shop_1',
        'category_id': 'cat_vegetables',
        'name': 'Pomidor (1kg)',
        'description': 'Qizil va shirin pomidor',
        'price': 6500.0,
        'unit': 'kg',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 140,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_4',
        'shop_id': 'shop_1',
        'category_id': 'cat_fruits',
        'name': 'Olma (1kg)',
        'description': 'Mahalliy qizil olma',
        'price': 8500.0,
        'unit': 'kg',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 90,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_5',
        'shop_id': 'shop_1',
        'category_id': 'cat_home',
        'name': 'Moyka suvi',
        'description': 'Uy-ro\'zg\'or uchun suyuqlik',
        'price': 12000.0,
        'unit': 'botal',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 50,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_6',
        'shop_id': 'shop_1',
        'category_id': 'cat_hygiene',
        'name': 'Sovun',
        'description': 'Gigiena uchun toza sovun',
        'price': 5000.0,
        'unit': 'dona',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 75,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_7',
        'shop_id': 'shop_6',
        'category_id': 'cat_local',
        'name': 'Asal (500g)',
        'description': 'Mahalliy asal',
        'price': 42000.0,
        'unit': 'dona',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 40,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_8',
        'shop_id': 'shop_8',
        'category_id': 'cat_drinks',
        'name': 'Coca-Cola (1.5L)',
        'description': 'Sovutib ichiladigan gazlangan ichimlik',
        'price': 22000.0,
        'unit': 'botal',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 55,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_9',
        'shop_id': 'shop_8',
        'category_id': 'cat_drinks',
        'name': 'Pepsi (1.5L)',
        'description': 'Mashhur gazlangan ichimlik',
        'price': 22000.0,
        'unit': 'botal',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 55,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_10',
        'shop_id': 'shop_2',
        'category_id': 'cat_drinks',
        'name': 'Apelsin sharbati',
        'description': 'Tabiiy apelsin sharbati',
        'price': 12000.0,
        'unit': 'stakan',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 70,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_11',
        'shop_id': 'shop_9',
        'category_id': 'cat_hygiene',
        'name': 'Tish pastasi',
        'description': 'Og\'iz gigienasi uchun',
        'price': 14000.0,
        'unit': 'dona',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 80,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_12',
        'shop_id': 'shop_2',
        'category_id': 'cat_home',
        'name': 'Moyka yuvish suyuqligi',
        'description': 'Idish yuvish uchun',
        'price': 18000.0,
        'unit': 'botal',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 65,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_13',
        'shop_id': 'shop_2',
        'category_id': 'cat_food',
        'name': 'Shakar (1kg)',
        'description': 'Sifati yuqori shakar',
        'price': 12000.0,
        'unit': 'kg',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 90,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_14',
        'shop_id': 'shop_3',
        'category_id': 'cat_dairy',
        'name': 'Sut (1L)',
        'description': 'Mahalliy xom sut',
        'price': 8500.0,
        'unit': 'litr',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 100,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_15',
        'shop_id': 'shop_3',
        'category_id': 'cat_dairy',
        'name': 'Qaymoq (200g)',
        'description': 'Qalin qaymoq',
        'price': 18000.0,
        'unit': 'paket',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 45,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_16',
        'shop_id': 'shop_3',
        'category_id': 'cat_meat',
        'name': 'Mol go\'shti (1kg)',
        'description': 'Yangi mol go\'shti',
        'price': 125000.0,
        'unit': 'kg',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 20,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_17',
        'shop_id': 'shop_3',
        'category_id': 'cat_meat',
        'name': 'Qo\'y go\'shti (1kg)',
        'description': 'Zo\'r sifatli qo\'y go\'shti',
        'price': 135000.0,
        'unit': 'kg',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 30,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_18',
        'shop_id': 'shop_3',
        'category_id': 'cat_dairy',
        'name': 'Pishloq (200g)',
        'description': 'Mahalliy pishloq',
        'price': 22000.0,
        'unit': 'dona',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 40,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_19',
        'shop_id': 'shop_4',
        'category_id': 'cat_bakery',
        'name': 'Non (1 dona)',
        'description': 'Qo\'l bilan pishirilgan non',
        'price': 2500.0,
        'unit': 'dona',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 150,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_20',
        'shop_id': 'shop_4',
        'category_id': 'cat_bakery',
        'name': 'Shirin bulochka',
        'description': 'Mahalliy bulochka',
        'price': 9000.0,
        'unit': 'dona',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 70,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_21',
        'shop_id': 'shop_4',
        'category_id': 'cat_bakery',
        'name': 'Baget',
        'description': 'Xushbo\'y baget',
        'price': 5000.0,
        'unit': 'dona',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 80,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_22',
        'shop_id': 'shop_4',
        'category_id': 'cat_bakery',
        'name': 'Shirin pirog',
        'description': 'Anor va mevali pirog',
        'price': 18000.0,
        'unit': 'dona',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 35,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_23',
        'shop_id': 'shop_4',
        'category_id': 'cat_home',
        'name': 'Choynak',
        'description': 'Issiq choy uchun choynak',
        'price': 55000.0,
        'unit': 'dona',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 25,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_24',
        'shop_id': 'shop_5',
        'category_id': 'cat_local',
        'name': 'Quritilgan sabzi',
        'description': 'Gulistonlik mahalliy quritma',
        'price': 12000.0,
        'unit': 'paket',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 60,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_25',
        'shop_id': 'shop_5',
        'category_id': 'cat_local',
        'name': 'Mahalliy asal',
        'description': 'Otining uzida toza asal',
        'price': 45000.0,
        'unit': 'dona',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 35,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_26',
        'shop_id': 'shop_5',
        'category_id': 'cat_food',
        'name': 'Guliston guruch',
        'description': 'Mahalliy bozor guruchi',
        'price': 26000.0,
        'unit': 'kg',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 70,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_27',
        'shop_id': 'shop_7',
        'category_id': 'cat_fruits',
        'name': 'Nok (1kg)',
        'description': 'Yumshoq va shirali nok',
        'price': 12000.0,
        'unit': 'kg',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 50,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_28',
        'shop_id': 'shop_5',
        'category_id': 'cat_home',
        'name': 'Plastik idish',
        'description': 'Uy uchun amaliy plastik idish',
        'price': 10000.0,
        'unit': 'dona',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 90,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_29',
        'shop_id': 'shop_9',
        'category_id': 'cat_hygiene',
        'name': 'Disinfeksiya spreyi',
        'description': 'Zararkunandalarga qarshi spreyi',
        'price': 26000.0,
        'unit': 'botal',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 55,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
      {
        'id': 'prod_30',
        'shop_id': 'shop_5',
        'category_id': 'cat_bakery',
        'name': 'Mahalliy nonushta',
        'description': 'Odatdagi mahalliy non',
        'price': 15000.0,
        'unit': 'paket',
        'image_url': '',
        'is_available': 1,
        'stock_quantity': 40,
        'created_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      },
    ];

    for (var product in products) {
      await db.insert('products', product, conflictAlgorithm: ConflictAlgorithm.replace);
    }

    // Insert default app_settings
    await db.insert('app_settings', {'key': 'primary_color', 'value': '#327F60'}, conflictAlgorithm: ConflictAlgorithm.ignore);
    await db.insert('app_settings', {'key': 'weather_api_key', 'value': ''}, conflictAlgorithm: ConflictAlgorithm.ignore);
    await db.insert('app_settings', {'key': 'yandex_maps_key', 'value': ''}, conflictAlgorithm: ConflictAlgorithm.ignore);
    await db.insert('app_settings', {'key': 'app_name', 'value': 'Online Store Guliston'}, conflictAlgorithm: ConflictAlgorithm.ignore);

    // Insert default app_texts
    final appTexts = [
      {'key': 'app_name', 'value': 'Online Store Guliston'},
      {'key': 'home_title', 'value': 'Do\'konlar'},
      {'key': 'categories_title', 'value': 'Kategoriyalar'},
      {'key': 'order_button', 'value': 'Buyurtma berish'},
      {'key': 'success_message', 'value': 'Buyurtmangiz qabul qilindi!'},
      {'key': 'cart_title', 'value': 'Savat'},
      {'key': 'checkout_title', 'value': 'Buyurtma berish'},
      {'key': 'profile_title', 'value': 'Profil'},
    ];

    for (var text in appTexts) {
      await db.insert('app_texts', text, conflictAlgorithm: ConflictAlgorithm.ignore);
    }
  }

  Future<void> cleanupOldData() async {
    final db = await database;
    final tenDaysAgo = DateTime.now().subtract(Duration(days: 10)).millisecondsSinceEpoch ~/ 1000;

    await db.delete(
      'orders',
      where: 'created_at < ? AND status IN (?, ?)',
      whereArgs: [tenDaysAgo, 'delivered', 'cancelled'],
    );

    await db.delete(
      'order_items',
      where: 'order_id NOT IN (SELECT id FROM orders)',
    );

    await db.execute('VACUUM');
  }

  Future<void> resetDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, dbName);
    await deleteDatabase(path);
    _database = null;
  }
}