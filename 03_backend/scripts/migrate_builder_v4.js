// Migration script — Builder redesign v4 (Brand/CPU-series/VGA-series/GPU-chip/
// PSU-modular/PSU-efficiency lookup tables + Builder's category-specific filter UI).
//
// Same idempotent conventions as migrate_builder_v3.js: safe to re-run, nothing
// destructive, old columns kept as backup until verified.
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

async function createTables() {
  console.log('\n== Step 1: brand / series / chip / PSU-standard lookup tables ==');

  const statements = [
    `CREATE TABLE IF NOT EXISTS brands (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS cpu_series (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS vga_series (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS gpu_chips (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS psu_modular (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS psu_efficiency (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];
  for (const sql of statements) await pool.query(sql);
  console.log('✅ lookup tables ready');

  if (!(await columnExists('spec_cpu', 'series_id'))) {
    await pool.query(`ALTER TABLE spec_cpu ADD COLUMN series_id INT DEFAULT NULL, ADD CONSTRAINT fk_spec_cpu_series FOREIGN KEY (series_id) REFERENCES cpu_series(id)`);
    console.log('✅ spec_cpu.series_id added');
  } else {
    console.log('ℹ️ spec_cpu.series_id already exists');
  }

  if (!(await columnExists('spec_gpu', 'series_id'))) {
    await pool.query(`ALTER TABLE spec_gpu ADD COLUMN series_id INT DEFAULT NULL, ADD CONSTRAINT fk_spec_gpu_series FOREIGN KEY (series_id) REFERENCES vga_series(id)`);
    console.log('✅ spec_gpu.series_id added');
  } else {
    console.log('ℹ️ spec_gpu.series_id already exists');
  }
  if (!(await columnExists('spec_gpu', 'chip_id'))) {
    await pool.query(`ALTER TABLE spec_gpu ADD COLUMN chip_id INT DEFAULT NULL, ADD CONSTRAINT fk_spec_gpu_chip FOREIGN KEY (chip_id) REFERENCES gpu_chips(id)`);
    console.log('✅ spec_gpu.chip_id added');
  } else {
    console.log('ℹ️ spec_gpu.chip_id already exists');
  }

  // spec_psu.modularity/efficiency (free VARCHAR) stay in place as read-only backup;
  // modular_id/efficiency_id are the new typed columns going forward.
  if (!(await columnExists('spec_psu', 'modular_id'))) {
    await pool.query(`ALTER TABLE spec_psu ADD COLUMN modular_id INT DEFAULT NULL, ADD CONSTRAINT fk_spec_psu_modular FOREIGN KEY (modular_id) REFERENCES psu_modular(id)`);
    console.log('✅ spec_psu.modular_id added');
  } else {
    console.log('ℹ️ spec_psu.modular_id already exists');
  }
  if (!(await columnExists('spec_psu', 'efficiency_id'))) {
    await pool.query(`ALTER TABLE spec_psu ADD COLUMN efficiency_id INT DEFAULT NULL, ADD CONSTRAINT fk_spec_psu_efficiency FOREIGN KEY (efficiency_id) REFERENCES psu_efficiency(id)`);
    console.log('✅ spec_psu.efficiency_id added');
  } else {
    console.log('ℹ️ spec_psu.efficiency_id already exists');
  }
}

async function seedLookups() {
  console.log('\n== Step 2: seed lookup values ==');

  // Closed standards (PSU) — fixed, real electrical standards
  const modularTypes = ['Full-Modular', 'Semi-Modular', 'Non-Modular'];
  for (const name of modularTypes) await pool.query('INSERT IGNORE INTO psu_modular (name) VALUES (?)', [name]);

  const efficiencyTiers = ['80+ White', '80+ Bronze', '80+ Silver', '80+ Gold', '80+ Platinum', '80+ Titanium'];
  for (const name of efficiencyTiers) await pool.query('INSERT IGNORE INTO psu_efficiency (name) VALUES (?)', [name]);

  // Open lookups — seed from real existing data (parts.brand) plus a starter list
  // so the dropdowns aren't empty on first use; sellers/admins grow these further
  // just by using a new value (see specTables.js's `open: true` auto-register).
  const existingBrands = await pool.query('SELECT DISTINCT brand FROM parts WHERE brand IS NOT NULL');
  const brandSeed = new Set([...(existingBrands.rows || []).map(r => r.brand), 'COLORFUL', 'GIGABYTE', 'ASRock']);
  for (const name of brandSeed) await pool.query('INSERT IGNORE INTO brands (name) VALUES (?)', [name]);

  const cpuSeries = [
    'Core i3', 'Core i5', 'Core i7', 'Core i9', 'Core Ultra 5', 'Core Ultra 7', 'Core Ultra 9',
    'Ryzen 3', 'Ryzen 5', 'Ryzen 7', 'Ryzen 9',
  ];
  for (const name of cpuSeries) await pool.query('INSERT IGNORE INTO cpu_series (name) VALUES (?)', [name]);

  const vgaSeries = ['GeForce RTX 30', 'GeForce RTX 40', 'GeForce RTX 50', 'Radeon RX 6000', 'Radeon RX 7000', 'Radeon RX 9000', 'Arc'];
  for (const name of vgaSeries) await pool.query('INSERT IGNORE INTO vga_series (name) VALUES (?)', [name]);

  const gpuChips = [
    'RTX 4060', 'RTX 4060 Ti', 'RTX 4070', 'RTX 4070 Super', 'RTX 4070 Ti', 'RTX 4080', 'RTX 4090',
    'RTX 5070', 'RTX 5080', 'RTX 5090',
    'RX 7600', 'RX 7700 XT', 'RX 7800 XT', 'RX 7900 XTX',
    'Arc A750', 'Arc A770',
  ];
  for (const name of gpuChips) await pool.query('INSERT IGNORE INTO gpu_chips (name) VALUES (?)', [name]);

  console.log(`✅ seeded ${brandSeed.size} brands, ${cpuSeries.length} CPU series, ${vgaSeries.length} VGA series, ${gpuChips.length} GPU chips, ${modularTypes.length} PSU modular types, ${efficiencyTiers.length} PSU efficiency tiers`);
}

async function etlPsuStandards() {
  console.log('\n== Step 3: re-point existing spec_psu rows at the new modular_id/efficiency_id ==');

  // Old free-text convention was terse ('full'/'semi'/'none'); map to the fuller
  // standard names now seeded in psu_modular.
  const modularityMap = { full: 'Full-Modular', semi: 'Semi-Modular', none: 'Non-Modular' };

  // Deliberately a targeted 2-column UPDATE (not upsertSpecs, which writes every
  // configured column — including `wattage` — and would null it out here since
  // this ETL only has modularity/efficiency in hand).
  const rows = await pool.query('SELECT part_id, modularity, efficiency FROM spec_psu WHERE modular_id IS NULL OR efficiency_id IS NULL');
  let migrated = 0;
  for (const row of rows.rows || []) {
    const mappedModularity = modularityMap[row.modularity] || row.modularity;
    const modularId = await resolveLookupId(pool, 'psu_modular', mappedModularity);
    const efficiencyId = await resolveLookupId(pool, 'psu_efficiency', row.efficiency);
    if (!modularId || !efficiencyId) {
      console.log(`⚠️ part_id=${row.part_id}: couldn't resolve modularity="${row.modularity}" or efficiency="${row.efficiency}" against the seeded standards — left NULL for manual review`);
      continue;
    }
    await pool.query('UPDATE spec_psu SET modular_id = ?, efficiency_id = ? WHERE part_id = ?', [modularId, efficiencyId, row.part_id]);
    migrated++;
  }
  console.log(`✅ re-pointed ${migrated} spec_psu row(s) to typed modular_id/efficiency_id`);
}

async function main() {
  console.log('🚀 Builder v4 migration — local run');
  await createTables();
  await seedLookups();
  await etlPsuStandards();
  console.log('\nDone. Nothing destructive has run — spec_psu.modularity/efficiency (old VARCHAR) are untouched.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
