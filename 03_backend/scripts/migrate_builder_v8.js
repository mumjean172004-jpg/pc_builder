// Round 10 — expand GPU lookup data (vga_series/gpu_chips) to cover the full
// NVIDIA/AMD/Intel model lists supplied by the user, add missing GPU AIB/storage
// brands, and widen products.warranty_type to add a 'lifetime' option.
//
// Deliberately does NOT use services/specTables.js's `resolveLookupId` — that
// helper is referenced by migrate_builder_v4/v5/v6.js but does not actually exist
// in specTables.js's exports (confirmed during Round 10 planning: a pre-existing
// gap in those scripts, out of scope to fix here). This script uses plain
// INSERT IGNORE / SELECT SQL directly instead, matching migrate_remove_parts.js.
require('dotenv').config();
const pool = require('../config/database');

async function columnExists(table, column) {
  const res = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return !!res.rows?.length;
}

async function getSeriesId(name) {
  const res = await pool.query('SELECT id FROM vga_series WHERE name = ?', [name]);
  return res.rows?.[0]?.id || null;
}

async function ensureSeries(name) {
  const existing = await getSeriesId(name);
  if (existing) return existing;
  await pool.query('INSERT IGNORE INTO vga_series (name) VALUES (?)', [name]);
  return getSeriesId(name);
}

async function ensureChips(seriesName, chipNames) {
  const seriesId = await ensureSeries(seriesName);
  let added = 0;
  for (const chip of chipNames) {
    const existing = await pool.query('SELECT id FROM gpu_chips WHERE name = ?', [chip]);
    if (existing.rows?.length) continue;
    await pool.query('INSERT INTO gpu_chips (name, series_id) VALUES (?, ?)', [chip, seriesId]);
    added++;
  }
  console.log(`  ${seriesName}: +${added} chip(s) (${chipNames.length - added} already present)`);
}

async function step1_gpuChips() {
  console.log('\n== Step 1: expand GPU series/chips ==');

  // Fill gaps in already-seeded series
  await ensureChips('GeForce RTX 40 Series', ['RTX 4080', 'RTX 4070 Ti', 'RTX 4070']);
  await ensureChips('GeForce RTX 30 Series', ['RTX 3090', 'RTX 3050']);
  await ensureChips('Radeon RX 7000 Series', ['RX 7900 GRE']);
  await ensureChips('Radeon RX 6000 Series', [
    'RX 6900 XT', 'RX 6800', 'RX 6750 XT', 'RX 6700', 'RX 6650 XT', 'RX 6500 XT', 'RX 6400',
  ]);

  // Fully seed series that existed with zero chips
  await ensureChips('GeForce RTX 20 Series', [
    'RTX 2080 Ti', 'RTX 2080 SUPER', 'RTX 2080', 'RTX 2070 SUPER', 'RTX 2070', 'RTX 2060 SUPER', 'RTX 2060',
  ]);
  await ensureChips('GeForce GTX 16 Series', [
    'GTX 1660 Ti', 'GTX 1660 SUPER', 'GTX 1660', 'GTX 1650 SUPER', 'GTX 1650', 'GTX 1630',
  ]);

  // Brand-new series
  await ensureChips('GeForce GTX 10 Series', [
    'GTX 1080 Ti', 'GTX 1080', 'GTX 1070 Ti', 'GTX 1070', 'GTX 1060', 'GTX 1050 Ti', 'GTX 1050', 'GT 1030',
  ]);
  await ensureChips('Radeon RX 5000 Series', ['RX 5700 XT', 'RX 5700', 'RX 5600 XT', 'RX 5500 XT']);
  await ensureChips('Radeon RX Vega Series', ['Radeon VII', 'RX Vega 64', 'RX Vega 56']);
  await ensureChips('Radeon RX 500/400 Series', [
    'RX 590', 'RX 580', 'RX 570', 'RX 560', 'RX 550', 'RX 480', 'RX 470', 'RX 460',
  ]);
  await ensureChips('Arc A-Series', ['Arc A770', 'Arc A750', 'Arc A580', 'Arc A380', 'Arc A310']);

  console.log('✅ GPU series/chips expanded');
}

async function step2_brands() {
  console.log('\n== Step 2: add missing GPU AIB / storage brands ==');
  const brands = ['ZOTAC', 'GALAX', 'Sapphire', 'PowerColor', 'INNO3D', 'Palit', 'XFX', 'Seagate', 'SK hynix'];
  let added = 0;
  for (const name of brands) {
    const existing = await pool.query('SELECT id FROM brands WHERE name = ?', [name]);
    if (existing.rows?.length) continue;
    await pool.query('INSERT IGNORE INTO brands (name) VALUES (?)', [name]);
    added++;
  }
  console.log(`✅ ${added} new brand(s) added (${brands.length - added} already present)`);
}

async function step3_lifetimeWarranty() {
  console.log('\n== Step 3: widen products.warranty_type ENUM to add \'lifetime\' ==');
  const res = await pool.query(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'warranty_type'`
  );
  const currentType = res.rows?.[0]?.COLUMN_TYPE || '';
  if (currentType.includes("'lifetime'")) {
    console.log('ℹ️ warranty_type already includes \'lifetime\'');
    return;
  }
  await pool.query(
    `ALTER TABLE products MODIFY COLUMN warranty_type ENUM('no_warranty','seller_warranty','manufacturer_warranty','lifetime') NOT NULL DEFAULT 'no_warranty'`
  );
  console.log('✅ warranty_type ENUM widened to include \'lifetime\'');
}

async function main() {
  console.log('🚀 Round 10 migration — GPU catalog expansion + brands + lifetime warranty — local run');
  if (!(await columnExists('products', 'warranty_type'))) {
    throw new Error('products.warranty_type column not found — unexpected schema state, aborting');
  }
  await step1_gpuChips();
  await step2_brands();
  await step3_lifetimeWarranty();
  console.log('\nDone.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
