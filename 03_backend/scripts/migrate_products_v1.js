// Round 4 — add compound warranty fields, SKU, and an optional seller-facing
// "original/was" price to `products`. Purely additive: no column is dropped or
// renamed, and `remaining_warranty_months` keeps its current type/constraints so
// every existing reader (productController, builder.js, buildsController,
// compatibilityService, index/products/product-detail.html) keeps working
// unmodified — it becomes a server-computed derived value going forward instead
// of client-supplied, but the column itself is untouched here.
require('dotenv').config();
const pool = require('../config/database');

async function columnExists(table, column) {
  const res = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return !!res.rows?.length;
}

async function addColumnIfMissing(table, column, ddl) {
  if (await columnExists(table, column)) {
    console.log(`ℹ️ ${table}.${column} already exists`);
    return;
  }
  await pool.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  console.log(`✅ ${table}.${column} added`);
}

async function main() {
  console.log('🚀 products v1 migration — compound warranty + sku + original_price — local run');

  await addColumnIfMissing('products', 'warranty_type',
    `warranty_type ENUM('no_warranty','seller_warranty','manufacturer_warranty') NOT NULL DEFAULT 'no_warranty'`);
  await addColumnIfMissing('products', 'warranty_years', `warranty_years INT NOT NULL DEFAULT 0`);
  await addColumnIfMissing('products', 'warranty_months', `warranty_months INT NOT NULL DEFAULT 0`);
  await addColumnIfMissing('products', 'warranty_days', `warranty_days INT NOT NULL DEFAULT 0`);
  await addColumnIfMissing('products', 'total_warranty_days',
    `total_warranty_days INT GENERATED ALWAYS AS (warranty_years*365 + warranty_months*30 + warranty_days) STORED`);
  await addColumnIfMissing('products', 'sku', `sku VARCHAR(64) DEFAULT NULL`);
  await addColumnIfMissing('products', 'original_price', `original_price DECIMAL(10,2) DEFAULT NULL`);

  console.log('\nDone. remaining_warranty_months untouched; existing rows default to no_warranty/0/0/0/NULL sku/NULL original_price.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
