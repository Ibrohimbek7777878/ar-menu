import dotenv from 'dotenv';
dotenv.config();

import { query, connectDatabase } from './connection.js';
import { logger } from '../utils/logger.js';
import bcrypt from 'bcrypt';

async function seed() {
  try {
    await connectDatabase();

    logger.info('🌱 Seeding database...');

    // 1. Create super admin
    const passwordHash = await bcrypt.hash('admin123', 12);
    await query(
      `INSERT INTO admins (email, password_hash, full_name, role) 
       VALUES ('admin@guliston.uz', $1, 'Super Admin', 'super_admin')
       ON CONFLICT (email) DO NOTHING`,
      [passwordHash]
    );

    // 2. Create sample shops
    const shops = [
      { name: 'Guliston Bozor', slug: 'guliston-bozor', address: 'Mustaqillik ko\'chasi, 15', city: 'guliston', lat: 40.5966, lng: 68.7786, phone: '+998901234567', category: 'oziq-ovqat' },
      { name: 'Yangi Yer Do\'kon', slug: 'yangi-yer-dokon', address: 'Navoiy ko\'chasi, 25', city: 'yangi_yer', lat: 40.5988, lng: 68.7800, phone: '+998901234568', category: 'ichimliklar' },
      { name: 'Sut va Sut Mahsulotlari', slug: 'sut-mahsulotlari', address: 'Beruniy ko\'chasi, 10', city: 'guliston', lat: 40.5970, lng: 68.7790, phone: '+998901234569', category: 'sut-mahsulotlari' },
      { name: 'Nonvoy', slug: 'nonvoy', address: 'Istiqlol ko\'chasi, 5', city: 'yangi_yer', lat: 40.5990, lng: 68.7810, phone: '+998901234570', category: 'non-mahsulotlari' },
      { name: 'Meva-Sabzavot', slug: 'meva-sabzavot', address: 'Bog\' ko\'chasi, 8', city: 'guliston', lat: 40.5960, lng: 68.7770, phone: '+998901234571', category: 'mevalar' },
    ];

    for (const shop of shops) {
      const categoryResult = await query('SELECT id FROM categories WHERE slug = $1', [shop.category]);
      if (categoryResult.rows.length > 0) {
        await query(
          `INSERT INTO shops (name, slug, address, city, latitude, longitude, phone, category_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (slug) DO NOTHING`,
          [shop.name, shop.slug, shop.address, shop.city, shop.lat, shop.lng, shop.phone, categoryResult.rows[0].id]
        );
      }
    }

    // 3. Create sample products
    const products = [
      { name: 'Tuxum (10 dona)', price: 15000, unit: 'dona', shop: 'guliston-bozor', category: 'oziq-ovqat' },
      { name: 'Choy (1 kg)', price: 35000, unit: 'kg', shop: 'guliston-bozor', category: 'oziq-ovqat' },
      { name: 'Shakar (1 kg)', price: 12000, unit: 'kg', shop: 'guliston-bozor', category: 'oziq-ovqat' },
      { name: 'Un (1 kg)', price: 8000, unit: 'kg', shop: 'guliston-bozor', category: 'oziq-ovqat' },
      { name: 'Guruch (1 kg)', price: 14000, unit: 'kg', shop: 'guliston-bozor', category: 'oziq-ovqat' },
      { name: 'Kola (1L)', price: 10000, unit: 'litr', shop: 'yangi-yer-dokon', category: 'ichimliklar' },
      { name: 'Suv (0.5L)', price: 3000, unit: 'dona', shop: 'yangi-yer-dokon', category: 'ichimliklar' },
      { name: 'Sharbat (1L)', price: 18000, unit: 'litr', shop: 'yangi-yer-dokon', category: 'ichimliklar' },
      { name: 'Sut (1L)', price: 12000, unit: 'litr', shop: 'sut-mahsulotlari', category: 'sut-mahsulotlari' },
      { name: 'Qatiq (0.5L)', price: 8000, unit: 'dona', shop: 'sut-mahsulotlari', category: 'sut-mahsulotlari' },
      { name: 'Pishloq (200g)', price: 25000, unit: 'dona', shop: 'sut-mahsulotlari', category: 'sut-mahsulotlari' },
      { name: 'Non (1 dona)', price: 4000, unit: 'dona', shop: 'nonvoy', category: 'non-mahsulotlari' },
      { name: 'Buxanka (1 dona)', price: 7000, unit: 'dona', shop: 'nonvoy', category: 'non-mahsulotlari' },
      { name: 'Patir (1 dona)', price: 10000, unit: 'dona', shop: 'nonvoy', category: 'non-mahsulotlari' },
      { name: 'Olma (1 kg)', price: 15000, unit: 'kg', shop: 'meva-sabzavot', category: 'mevalar' },
      { name: 'Banan (1 kg)', price: 20000, unit: 'kg', shop: 'meva-sabzavot', category: 'mevalar' },
      { name: 'Apelsin (1 kg)', price: 25000, unit: 'kg', shop: 'meva-sabzavot', category: 'mevalar' },
    ];

    for (const product of products) {
      const shopResult = await query('SELECT id FROM shops WHERE slug = $1', [product.shop]);
      const catResult = await query('SELECT id FROM categories WHERE slug = $1', [product.category]);
      if (shopResult.rows.length > 0 && catResult.rows.length > 0) {
        const slug = product.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
        await query(
          `INSERT INTO products (name, slug, description, price, unit, shop_id, category_id, stock_quantity, is_available)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 100, true)
           ON CONFLICT DO NOTHING`,
          [product.name, slug, `${product.name} - sifatli mahsulot`, product.price, product.unit, shopResult.rows[0].id, catResult.rows[0].id]
        );
      }
    }

    logger.info('✅ Database seeded successfully!');
    logger.info('📧 Admin login: admin@guliston.uz / admin123');
    logger.info(`🏪 Shops: ${shops.length} ta do\'kon`);
    logger.info(`📦 Products: ${products.length} ta mahsulot`);
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();