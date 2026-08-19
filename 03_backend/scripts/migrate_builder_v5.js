// Round 4 — add gpu_chips.series_id so the sell-product add-model modal can
// cascade GPU Series -> Chip the same way Motherboard already cascades
// Socket -> Chipset. Backfills the 16 chip names seeded by migrate_builder_v4.js
// to their real series (well-established public specs); does not touch any
// existing spec_gpu row (no live listing has ever had series_id/chip_id set,
// same as before this script runs — only the lookup table itself gains the
// relationship so future selections can filter).
require('dotenv').config();
const pool = require('../config/database');
const { resolveLookupId } = require('../services/specTables');

async function columnExists(table, column) {
  const res = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return !!res.rows?.length;
}

async function addSeriesIdColumn() {
  console.log('\n== Step 1: gpu_chips.series_id ==');
  if (await columnExists('gpu_chips', 'series_id')) {
    console.log('ℹ️ gpu_chips.series_id already exists');
    return;
  }
  await pool.query(
    `ALTER TABLE gpu_chips ADD COLUMN series_id INT DEFAULT NULL, ADD CONSTRAINT fk_gpu_chips_series FOREIGN KEY (series_id) REFERENCES vga_series(id)`
  );
  console.log('✅ gpu_chips.series_id added');
}

async function backfillChipSeries() {
  console.log('\n== Step 2: backfill known chip -> series mapping ==');

  const CHIP_TO_SERIES = {
    'RTX 4060': 'GeForce RTX 40',
    'RTX 4060 Ti': 'GeForce RTX 40',
    'RTX 4070': 'GeForce RTX 40',
    'RTX 4070 Super': 'GeForce RTX 40',
    'RTX 4070 Ti': 'GeForce RTX 40',
    'RTX 4080': 'GeForce RTX 40',
    'RTX 4090': 'GeForce RTX 40',
    'RTX 5070': 'GeForce RTX 50',
    'RTX 5080': 'GeForce RTX 50',
    'RTX 5090': 'GeForce RTX 50',
    'RX 7600': 'Radeon RX 7000',
    'RX 7700 XT': 'Radeon RX 7000',
    'RX 7800 XT': 'Radeon RX 7000',
    'RX 7900 XTX': 'Radeon RX 7000',
    'Arc A750': 'Arc',
    'Arc A770': 'Arc',
  };

  let updated = 0;
  for (const [chipName, seriesName] of Object.entries(CHIP_TO_SERIES)) {
    const seriesId = await resolveLookupId(pool, 'vga_series', seriesName);
    if (!seriesId) {
      console.log(`⚠️ series "${seriesName}" not found for chip "${chipName}" — skipped`);
      continue;
    }
    const result = await pool.query(
      'UPDATE gpu_chips SET series_id = ? WHERE name = ? AND series_id IS NULL',
      [seriesId, chipName]
    );
    if (result.rowCount) updated++;
  }
  console.log(`✅ backfilled series_id for ${updated} chip(s) (already-set rows left untouched)`);
}

async function main() {
  console.log('🚀 Builder v5 migration — gpu_chips.series_id — local run');
  await addSeriesIdColumn();
  await backfillChipSeries();
  console.log('\nDone. No existing spec_gpu rows modified.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
