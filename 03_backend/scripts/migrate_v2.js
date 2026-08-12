// Migration script for Production-Ready Marketplace V2
require('dotenv').config();
const pool = require('../config/database');

async function runMigration() {
  console.log('🚀 Running Database Migration V2...');
  
  const alterQueries = [
    // Users table additions
    "ALTER TABLE users ADD COLUMN seller_bank_name VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN seller_bank_account_name VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN seller_full_name VARCHAR(255) DEFAULT NULL",

    // Products table additions
    "ALTER TABLE products ADD COLUMN proof_image_url TEXT DEFAULT NULL",
    "ALTER TABLE products ADD COLUMN sn_image_url TEXT DEFAULT NULL",
    "ALTER TABLE products ADD COLUMN is_prebuilt_set TINYINT DEFAULT 0",
    "ALTER TABLE products ADD COLUMN prebuilt_specs TEXT DEFAULT NULL",
    "ALTER TABLE products ADD COLUMN prebuilt_components TEXT DEFAULT NULL",

    // Orders table additions
    "ALTER TABLE orders ADD COLUMN shipping_type VARCHAR(50) DEFAULT 'parcel'",
    "ALTER TABLE orders ADD COLUMN proof_of_packing_url TEXT DEFAULT NULL",
    "ALTER TABLE orders ADD COLUMN slip_verified_at DATETIME DEFAULT NULL",
    "ALTER TABLE orders ADD COLUMN slip_trans_ref VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE orders ADD COLUMN slip_amount DECIMAL(10,2) DEFAULT NULL",
    "ALTER TABLE orders ADD COLUMN dispute_status VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE orders ADD COLUMN dispute_reason TEXT DEFAULT NULL",
    "ALTER TABLE orders ADD COLUMN dispute_created_at DATETIME DEFAULT NULL"
  ];

  for (const q of alterQueries) {
    try {
      await pool.query(q);
      console.log(`✅ Executed: ${q}`);
    } catch (err) {
      if (err.message && (err.message.includes('Duplicate column name') || err.message.includes('already exists'))) {
        console.log(`ℹ️ Column already exists: ${q.split('ADD COLUMN ')[1]?.split(' ')[0]}`);
      } else {
        console.warn(`⚠️ Warning executing ${q}:`, err.message);
      }
    }
  }

  console.log('🎉 Migration V2 Completed Successfully!');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('❌ Migration Error:', err);
  process.exit(1);
});
