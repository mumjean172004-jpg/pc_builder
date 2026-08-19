// Round 5 — real CPU generation/model master data (cascading picker only, never
// read by compatibility logic — see plan doc), expanded chipset coverage, expanded
// GPU chip catalog, new brands, and a new spec_case.case_type column.
// Idempotent like every prior migrate_builder_v*.js script.
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

async function tableExists(name) {
  const res = await pool.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [name]
  );
  return !!res.rows?.length;
}

async function ensureSocket(name, brand) {
  let id = await resolveLookupId(pool, 'sockets', name);
  if (id) return id;
  await pool.query('INSERT INTO sockets (name, brand) VALUES (?, ?)', [name, brand]);
  return resolveLookupId(pool, 'sockets', name);
}

async function ensureChipset(socketId, name) {
  const existing = await pool.query('SELECT id FROM chipsets WHERE socket_id = ? AND name = ?', [socketId, name]);
  if (existing.rows?.length) return;
  await pool.query('INSERT INTO chipsets (socket_id, name) VALUES (?, ?)', [socketId, name]);
}

async function step1_socketsAndChipsets() {
  console.log('\n== Step 1: LGA1200 socket + missing chipsets ==');

  const lga1200 = await ensureSocket('LGA1200', 'Intel');
  for (const name of ['Z590', 'B560', 'H510', 'Z490', 'B460']) await ensureChipset(lga1200, name);

  const lga1851 = await resolveLookupId(pool, 'sockets', 'LGA1851');
  await ensureChipset(lga1851, 'H810');

  const am5 = await resolveLookupId(pool, 'sockets', 'AM5');
  for (const name of ['X870E', 'X870', 'B850']) await ensureChipset(am5, name);

  console.log('✅ sockets/chipsets ready');
}

const CPU_GENERATIONS = [
  { name: 'Core Ultra Series 2 (Arrow Lake)', brand: 'Intel', socket: 'LGA1851', models: [
    'Core Ultra 9 285K', 'Core Ultra 7 265K', 'Core Ultra 7 265KF', 'Core Ultra 5 245K', 'Core Ultra 5 245KF',
  ] },
  { name: '14th Gen (Raptor Lake Refresh)', brand: 'Intel', socket: 'LGA1700', models: [
    'Core i9-14900KS', 'Core i9-14900K', 'Core i9-14900KF', 'Core i9-14900', 'Core i9-14900F',
    'Core i7-14700K', 'Core i7-14700KF', 'Core i7-14700', 'Core i7-14700F',
    'Core i5-14600K', 'Core i5-14600KF', 'Core i5-14500', 'Core i5-14400', 'Core i5-14400F',
    'Core i3-14100', 'Core i3-14100F',
  ] },
  { name: '13th Gen (Raptor Lake)', brand: 'Intel', socket: 'LGA1700', models: [
    'Core i9-13900KS', 'Core i9-13900K', 'Core i9-13900KF', 'Core i9-13900', 'Core i9-13900F',
    'Core i7-13700K', 'Core i7-13700KF', 'Core i7-13700', 'Core i7-13700F',
    'Core i5-13600K', 'Core i5-13600KF', 'Core i5-13500', 'Core i5-13400', 'Core i5-13400F',
    'Core i3-13100', 'Core i3-13100F',
  ] },
  { name: '12th Gen (Alder Lake)', brand: 'Intel', socket: 'LGA1700', models: [
    'Core i9-12900KS', 'Core i9-12900K', 'Core i9-12900KF', 'Core i9-12900',
    'Core i7-12700K', 'Core i7-12700KF', 'Core i7-12700', 'Core i7-12700F',
    'Core i5-12600K', 'Core i5-12600KF', 'Core i5-12400', 'Core i5-12400F',
    'Core i3-12100', 'Core i3-12100F',
  ] },
  { name: '10th-11th Gen', brand: 'Intel', socket: 'LGA1200', models: [
    'Core i9-11900K', 'Core i7-11700K', 'Core i5-11400F', 'Core i5-11400',
    'Core i9-10900K', 'Core i7-10700K', 'Core i5-10400F', 'Core i3-10100F',
  ] },
  { name: 'Ryzen 9000 Series (Zen 5)', brand: 'AMD', socket: 'AM5', models: [
    'Ryzen 9 9950X', 'Ryzen 9 9900X', 'Ryzen 7 9800X3D', 'Ryzen 7 9700X', 'Ryzen 5 9600X',
  ] },
  { name: 'Ryzen 7000/8000 Series (Zen 4)', brand: 'AMD', socket: 'AM5', models: [
    'Ryzen 9 7950X3D', 'Ryzen 9 7950X', 'Ryzen 9 7900X3D', 'Ryzen 9 7900X', 'Ryzen 9 7900',
    'Ryzen 7 7800X3D', 'Ryzen 7 7700X', 'Ryzen 7 7700', 'Ryzen 7 8700G',
    'Ryzen 5 7600X', 'Ryzen 5 7600', 'Ryzen 5 7500F', 'Ryzen 5 8600G', 'Ryzen 5 8500G',
  ] },
  { name: 'Ryzen 5000/3000 Series (Zen 3/Zen 2)', brand: 'AMD', socket: 'AM4', models: [
    'Ryzen 9 5950X', 'Ryzen 9 5900X',
    'Ryzen 7 5800X3D', 'Ryzen 7 5700X3D', 'Ryzen 7 5800X', 'Ryzen 7 5700X', 'Ryzen 7 5700G', 'Ryzen 7 3700X',
    'Ryzen 5 5600X', 'Ryzen 5 5600', 'Ryzen 5 5600GT', 'Ryzen 5 5500', 'Ryzen 5 4500', 'Ryzen 5 3600', 'Ryzen 5 3500X',
    'Ryzen 3 4100', 'Ryzen 3 3300X', 'Ryzen 3 3200G', 'Ryzen 3 3100',
  ] },
];

async function step2_cpuGenerationsAndModels() {
  console.log('\n== Step 2: cpu_generations + cpu_models tables ==');

  if (!(await tableExists('cpu_generations'))) {
    await pool.query(`
      CREATE TABLE cpu_generations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        brand VARCHAR(10) NOT NULL,
        socket_id INT NOT NULL,
        FOREIGN KEY (socket_id) REFERENCES sockets(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ cpu_generations created');
  } else {
    console.log('ℹ️ cpu_generations already exists');
  }

  if (!(await tableExists('cpu_models'))) {
    await pool.query(`
      CREATE TABLE cpu_models (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        generation_id INT NOT NULL,
        FOREIGN KEY (generation_id) REFERENCES cpu_generations(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ cpu_models created');
  } else {
    console.log('ℹ️ cpu_models already exists');
  }

  let genCount = 0, modelCount = 0;
  for (const gen of CPU_GENERATIONS) {
    const socketId = await resolveLookupId(pool, 'sockets', gen.socket);
    if (!socketId) {
      console.log(`⚠️ socket "${gen.socket}" not found for generation "${gen.name}" — skipped`);
      continue;
    }
    await pool.query('INSERT IGNORE INTO cpu_generations (name, brand, socket_id) VALUES (?, ?, ?)', [gen.name, gen.brand, socketId]);
    genCount++;
    const genId = await resolveLookupId(pool, 'cpu_generations', gen.name);
    for (const model of gen.models) {
      const result = await pool.query('INSERT IGNORE INTO cpu_models (name, generation_id) VALUES (?, ?)', [model, genId]);
      if (result.rowCount) modelCount++;
    }
  }
  console.log(`✅ ${genCount} generation(s) processed, ${modelCount} new model(s) inserted`);
}

const GPU_CHIPS_BY_SERIES = {
  'GeForce RTX 40': ['RTX 4090', 'RTX 4080 Super', 'RTX 4080', 'RTX 4070 Ti Super', 'RTX 4070 Ti', 'RTX 4070 Super', 'RTX 4070', 'RTX 4060 Ti', 'RTX 4060'],
  'GeForce RTX 30': ['RTX 3090 Ti', 'RTX 3090', 'RTX 3080 Ti', 'RTX 3080', 'RTX 3070 Ti', 'RTX 3070', 'RTX 3060 Ti', 'RTX 3060', 'RTX 3050'],
  'GeForce GTX 16': ['GTX 1660 Super', 'GTX 1660 Ti', 'GTX 1650'],
  'Radeon RX 7000': ['RX 7900 XTX', 'RX 7900 XT', 'RX 7900 GRE', 'RX 7800 XT', 'RX 7700 XT', 'RX 7600 XT', 'RX 7600'],
  'Radeon RX 6000': ['RX 6950 XT', 'RX 6800 XT', 'RX 6700 XT', 'RX 6600 XT', 'RX 6600'],
};

async function step3_gpuChips() {
  console.log('\n== Step 3: expand vga_series / gpu_chips ==');

  await pool.query('INSERT IGNORE INTO vga_series (name) VALUES (?)', ['GeForce GTX 16']);

  let inserted = 0;
  for (const [seriesName, chips] of Object.entries(GPU_CHIPS_BY_SERIES)) {
    const seriesId = await resolveLookupId(pool, 'vga_series', seriesName);
    if (!seriesId) {
      console.log(`⚠️ series "${seriesName}" not found — skipped its chips`);
      continue;
    }
    for (const chip of chips) {
      const result = await pool.query('INSERT IGNORE INTO gpu_chips (name, series_id) VALUES (?, ?)', [chip, seriesId]);
      if (result.rowCount) inserted++;
    }
  }
  console.log(`✅ ${inserted} new gpu_chip(s) inserted`);
}

async function step4_brands() {
  console.log('\n== Step 4: new brands ==');
  const newBrands = [
    'ZOTAC', 'GALAX', 'Palit', 'INNO3D', 'Sapphire', 'PowerColor', 'XFX',
    'Super Flower', 'SilverStone', 'Thermaltake', 'FSP', 'KLEVV',
  ];
  let inserted = 0;
  for (const name of newBrands) {
    const result = await pool.query('INSERT IGNORE INTO brands (name) VALUES (?)', [name]);
    if (result.rowCount) inserted++;
  }
  console.log(`✅ ${inserted} new brand(s) inserted`);
}

async function step5_caseType() {
  console.log('\n== Step 5: spec_case.case_type ==');
  if (await columnExists('spec_case', 'case_type')) {
    console.log('ℹ️ spec_case.case_type already exists');
    return;
  }
  await pool.query('ALTER TABLE spec_case ADD COLUMN case_type VARCHAR(50) DEFAULT NULL');
  console.log('✅ spec_case.case_type added');
}

async function main() {
  console.log('🚀 Builder v6 migration — CPU generations/models, chipset/GPU/brand expansion — local run');
  await step1_socketsAndChipsets();
  await step2_cpuGenerationsAndModels();
  await step3_gpuChips();
  await step4_brands();
  await step5_caseType();
  console.log('\nDone. All additive — nothing dropped or renamed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
