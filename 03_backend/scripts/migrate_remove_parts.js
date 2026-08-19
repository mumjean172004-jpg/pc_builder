// Round 9 — finish the product-centric migration: remove the standalone `parts`
// reference-catalog table entirely. `products` is now the single source of truth
// for everything (own brand/model columns, spec_* tables keyed by product_id,
// anti-fraud cross-listing price comparison instead of a parts.price MSRP).
//
// Verifies live schema state directly via INFORMATION_SCHEMA rather than trusting
// the checked-in schema files (confirmed stale relative to reality during the
// Round 8/9 audits), reports orphaned spec_* rows before deleting anything, and
// only drops parts/part_id as the final step once everything else is clean.
require('dotenv').config();
const pool = require('../config/database');

async function columnExists(table, column) {
  const res = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return !!res.rows?.length;
}

async function tableExists(name) {
  const res = await pool.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [name]
  );
  return !!res.rows?.length;
}

async function getFkName(table, column) {
  const res = await pool.query(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [table, column]
  );
  return res.rows?.[0]?.CONSTRAINT_NAME || null;
}

const SPEC_TABLES = ['spec_cpu', 'spec_motherboard', 'spec_ram', 'spec_gpu', 'spec_case', 'spec_psu', 'spec_storage', 'spec_cpu_cooler'];

async function cleanOrphanedSpecRows() {
  console.log('\n== Step 1: check for orphaned spec_* rows (product_id with no matching products.id) ==');
  let totalOrphaned = 0;
  for (const t of SPEC_TABLES) {
    if (!(await tableExists(t))) continue;
    const orphaned = await pool.query(
      `SELECT s.product_id FROM ${t} s LEFT JOIN products p ON s.product_id = p.id WHERE p.id IS NULL`
    );
    const rows = orphaned.rows || [];
    if (!rows.length) {
      console.log(`ℹ️ ${t}: no orphaned rows`);
      continue;
    }
    console.log(`⚠️ ${t}: ${rows.length} orphaned row(s) -> product_id ${rows.map(r => r.product_id).join(', ')} — deleting`);
    await pool.query(`DELETE FROM ${t} WHERE product_id IN (${rows.map(() => '?').join(',')})`, rows.map(r => r.product_id));
    totalOrphaned += rows.length;
  }
  console.log(`✅ ${totalOrphaned} total orphaned spec row(s) removed`);
}

async function dropProductsPartId() {
  console.log('\n== Step 2: drop products.part_id ==');
  if (!(await columnExists('products', 'part_id'))) {
    console.log('ℹ️ products.part_id already gone');
    return;
  }
  const fkName = await getFkName('products', 'part_id');
  if (fkName) {
    await pool.query(`ALTER TABLE products DROP FOREIGN KEY \`${fkName}\``);
    console.log(`✅ dropped FK ${fkName}`);
  }
  await pool.query('ALTER TABLE products DROP COLUMN part_id');
  console.log('✅ products.part_id dropped');
}

async function dropBuildPartsPartId() {
  console.log('\n== Step 3: drop build_parts.part_id (if still present) ==');
  if (!(await columnExists('build_parts', 'part_id'))) {
    console.log('ℹ️ build_parts.part_id already gone');
    return;
  }
  const fkName = await getFkName('build_parts', 'part_id');
  if (fkName) {
    await pool.query(`ALTER TABLE build_parts DROP FOREIGN KEY \`${fkName}\``);
    console.log(`✅ dropped FK ${fkName}`);
  }
  await pool.query('ALTER TABLE build_parts DROP COLUMN part_id');
  console.log('✅ build_parts.part_id dropped');
}

async function dropPartsTable() {
  console.log('\n== Step 4: drop parts table ==');
  if (!(await tableExists('parts'))) {
    console.log('ℹ️ parts table already gone');
    return;
  }
  const countRes = await pool.query('SELECT COUNT(*) as n FROM parts');
  console.log(`parts currently has ${countRes.rows[0].n} row(s) — dropping table`);

  // Any remaining FK still pointing at parts would block the DROP — report before
  // attempting, rather than letting a cryptic FK error be the first sign of it.
  const remainingFks = await pool.query(
    `SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = 'parts'`
  );
  if (remainingFks.rows?.length) {
    console.log('❌ Cannot drop parts — still referenced by:', JSON.stringify(remainingFks.rows));
    throw new Error('parts table still has live FK references, aborting DROP');
  }

  await pool.query('DROP TABLE parts');
  console.log('✅ parts table dropped');
}

async function main() {
  console.log('🚀 Round 9 migration — remove parts table entirely — local run');
  await cleanOrphanedSpecRows();
  await dropProductsPartId();
  await dropBuildPartsPartId();
  await dropPartsTable();
  console.log('\nDone. products is now the single source of truth for everything.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
