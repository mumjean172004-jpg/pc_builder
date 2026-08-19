// Round 11 — full CPU generation/model catalog (Intel Core/Core Ultra + AMD Ryzen/FX,
// including HEDT/Threadripper) and full motherboard chipset catalog (Intel + AMD,
// including legacy and Workstation/HEDT chipsets), transcribed directly from the user's
// reference documents. Also adds the chipset_generations join table (which CPU
// generations a given chipset-era supports — drives the new "Gen ที่ใช้ได้" motherboard
// cascade step) and spec_motherboard.generation (mirrors spec_cpu.generation).
//
// Idempotent: INSERT IGNORE + UNIQUE(name) constraints throughout. Does not use
// services/specTables.js's `resolveLookupId` (confirmed not to exist — see
// migrate_builder_v8.js's header comment for the same note); plain SQL only.
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

async function getSocketId(name) {
  const res = await pool.query('SELECT id FROM sockets WHERE name = ?', [name]);
  return res.rows?.[0]?.id || null;
}

async function ensureSocket(name, brand) {
  const existing = await getSocketId(name);
  if (existing) return existing;
  await pool.query('INSERT IGNORE INTO sockets (name, brand) VALUES (?, ?)', [name, brand]);
  return getSocketId(name);
}

async function ensureChipset(socketId, name) {
  const existing = await pool.query('SELECT id FROM chipsets WHERE socket_id = ? AND name = ?', [socketId, name]);
  if (existing.rows?.length) return existing.rows[0].id;
  const result = await pool.query('INSERT INTO chipsets (socket_id, name) VALUES (?, ?)', [socketId, name]);
  return result.insertId;
}

async function getGenerationId(name) {
  const res = await pool.query('SELECT id FROM cpu_generations WHERE name = ?', [name]);
  return res.rows?.[0]?.id || null;
}

async function ensureGeneration(name, brand, socketId) {
  const existing = await getGenerationId(name);
  if (existing) return existing;
  const result = await pool.query('INSERT INTO cpu_generations (name, brand, socket_id) VALUES (?, ?, ?)', [name, brand, socketId]);
  return result.insertId;
}

async function ensureModels(generationId, modelNames) {
  let added = 0;
  for (const name of modelNames) {
    const existing = await pool.query('SELECT id FROM cpu_models WHERE name = ?', [name]);
    if (existing.rows?.length) continue;
    await pool.query('INSERT INTO cpu_models (name, generation_id) VALUES (?, ?)', [name, generationId]);
    added++;
  }
  return added;
}

async function ensureChipsetGeneration(chipsetId, generationId) {
  await pool.query('INSERT IGNORE INTO chipset_generations (chipset_id, generation_id) VALUES (?, ?)', [chipsetId, generationId]);
}

async function step0_prereqs() {
  console.log('\n== Step 0: prerequisites (ram_types, chipset_generations table, spec_motherboard.generation) ==');
  await pool.query('INSERT IGNORE INTO ram_types (name) VALUES (?), (?)', ['DDR3', 'DDR2']);
  console.log('  ram_types: DDR3/DDR2 ensured');

  if (!(await tableExists('chipset_generations'))) {
    await pool.query(`
      CREATE TABLE chipset_generations (
        chipset_id INT NOT NULL,
        generation_id INT NOT NULL,
        PRIMARY KEY (chipset_id, generation_id),
        FOREIGN KEY (chipset_id) REFERENCES chipsets(id) ON DELETE CASCADE,
        FOREIGN KEY (generation_id) REFERENCES cpu_generations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  chipset_generations table created');
  } else {
    console.log('  chipset_generations table already exists');
  }

  if (!(await columnExists('spec_motherboard', 'generation'))) {
    await pool.query('ALTER TABLE spec_motherboard ADD COLUMN generation VARCHAR(50) DEFAULT NULL');
    console.log('  spec_motherboard.generation added');
  } else {
    console.log('  spec_motherboard.generation already exists');
  }
}

async function step1_renameOrphanSocket() {
  console.log('\n== Step 1: rename orphan "LGA1151" socket -> "LGA1151 (v2)" ==');
  const orphan = await pool.query('SELECT id FROM sockets WHERE name = ?', ['LGA1151']);
  if (!orphan.rows?.length) {
    console.log('  no "LGA1151" row found (already renamed or never existed)');
    return;
  }
  const socketId = orphan.rows[0].id;
  const refCount = await pool.query(
    'SELECT (SELECT COUNT(*) FROM chipsets WHERE socket_id = ?) + (SELECT COUNT(*) FROM cpu_generations WHERE socket_id = ?) AS n',
    [socketId, socketId]
  );
  if (Number(refCount.rows[0].n) > 0) {
    throw new Error(`"LGA1151" socket has ${refCount.rows[0].n} downstream references — expected 0, aborting rename to avoid surprises`);
  }
  await pool.query('UPDATE sockets SET name = ? WHERE id = ?', ['LGA1151 (v2)', socketId]);
  console.log('  renamed to "LGA1151 (v2)"');
}

const NEW_SOCKETS = [
  ['LGA1151 (v1)', 'Intel'], ['LGA1150', 'Intel'], ['LGA1155', 'Intel'], ['LGA775', 'Intel'],
  ['LGA2066', 'Intel'], ['LGA2011-v3', 'Intel'], ['LGA2011', 'Intel'],
  ['AM3+', 'AMD'], ['AM3', 'AMD'], ['FM2+', 'AMD'],
  ['sTR5', 'AMD'], ['sTRX4', 'AMD'], ['TR4', 'AMD'],
];

async function step2_newSockets() {
  console.log('\n== Step 2: add new sockets ==');
  for (const [name, brand] of NEW_SOCKETS) {
    await ensureSocket(name, brand);
  }
  console.log(`  ${NEW_SOCKETS.length} socket(s) ensured`);
}

// Each entry: chipsets for one "era" of a socket, plus the generation(s) that era
// supports (used to seed chipset_generations). generations: [] means the source PDF
// gave chipset data but no matching CPU model list (LGA775 / plain LGA2011 / AM3 /
// FM2+) — an honest gap, not a guess.
const CHIPSET_ERAS = [
  { socket: 'LGA1851', chipsets: ['Z890', 'H870', 'B860', 'H810', 'Q870', 'W880'], generations: ['Core Ultra 200 (Arrow Lake)'] },
  { socket: 'LGA1700', chipsets: ['Z790', 'H770', 'B760'], generations: ['Gen 14 (Raptor Lake Refresh)', 'Gen 13 (Raptor Lake)'] },
  { socket: 'LGA1700', chipsets: ['Z690', 'H670', 'B660', 'H610', 'Q670', 'W680'], generations: ['Gen 12 (Alder Lake)'] },
  { socket: 'LGA1200', chipsets: ['Z590', 'H570', 'B560', 'H510', 'Q570', 'W580'], generations: ['Gen 11 (Rocket Lake)'] },
  { socket: 'LGA1200', chipsets: ['Z490', 'H470', 'B460', 'H410', 'Q470', 'W480'], generations: ['Gen 10 (Comet Lake)'] },
  { socket: 'LGA1151 (v2)', chipsets: ['Z390', 'Z370', 'H370', 'B365', 'B360', 'H310', 'Q370'], generations: ['Gen 9 (Coffee Lake Refresh)', 'Gen 8 (Coffee Lake)'] },
  { socket: 'LGA1151 (v1)', chipsets: ['Z270', 'H270', 'B250', 'Q270', 'Q250'], generations: ['Gen 7 (Kaby Lake)'] },
  { socket: 'LGA1151 (v1)', chipsets: ['Z170', 'H170', 'B150', 'H110', 'Q170', 'Q150'], generations: ['Gen 6 (Skylake)'] },
  { socket: 'LGA1150', chipsets: ['Z97', 'H97', 'Z87', 'H87', 'B85', 'H81', 'Q87', 'Q85'], generations: ['Gen 5 (Broadwell)', 'Gen 4 (Haswell)'] },
  { socket: 'LGA1155', chipsets: ['Z77', 'H77', 'B75', 'Z68', 'P67', 'H67', 'H61', 'Q77', 'Q75', 'Q67', 'Q65'], generations: ['Gen 3 (Ivy Bridge)', 'Gen 2 (Sandy Bridge)'] },
  { socket: 'LGA775', chipsets: ['X48', 'X38', 'P45', 'P43', 'P35', 'P31', 'G45', 'G43', 'G41', 'G31', 'Q45', 'Q43', 'Q35', 'Q33'], generations: [] },
  { socket: 'LGA2066', chipsets: ['X299'], generations: ['Core X-Series (Gen 7-10)'] },
  { socket: 'LGA2011-v3', chipsets: ['X99'], generations: ['Core i7 Extreme (Gen 5)'] },
  { socket: 'LGA2011', chipsets: ['X79'], generations: [] },
  { socket: 'AM5', chipsets: ['X870E', 'X870', 'B850', 'B840'], generations: ['Ryzen 9000 Series (Zen 5)'] },
  { socket: 'AM5', chipsets: ['X670E', 'X670', 'B650E', 'B650', 'A620'], generations: ['Ryzen 7000 Series (Zen 4)', 'Ryzen 8000 Series (Zen 4)'] },
  { socket: 'AM4', chipsets: ['X570S', 'X570', 'B550', 'A520'], generations: ['Ryzen 5000 Series (Zen 3)'] },
  { socket: 'AM4', chipsets: ['X470', 'B450'], generations: ['Ryzen 3000 Series (Zen 2)', 'Ryzen 4000 Series (Renoir)'] },
  { socket: 'AM4', chipsets: ['X370', 'B350', 'A320'], generations: ['Ryzen 1000 Series (Summit Ridge)', 'Ryzen 2000 Series (Pinnacle Ridge/Raven Ridge)'] },
  { socket: 'AM3+', chipsets: ['990FX', '990X', '970'], generations: ['FX-Series (Vishera/Zambezi)'] },
  { socket: 'AM3', chipsets: ['890FX', '890GX', '880G', '870', '790FX', '790GX', '785G', '770'], generations: [] },
  { socket: 'FM2+', chipsets: ['A88X', 'A78', 'A68H', 'A58', 'A55'], generations: [] },
  { socket: 'sTR5', chipsets: ['TRX50', 'WRX90'], generations: ['Threadripper 7000 Series'] },
  { socket: 'sTRX4', chipsets: ['TRX40'], generations: ['Threadripper 3000 Series'] },
  { socket: 'TR4', chipsets: ['X399'], generations: ['Threadripper 1000 & 2000 Series'] },
];

// CPU generations + models, transcribed from the reference document. Existing
// generations (already seeded pre-Round-11) are listed here too so their models can be
// backfilled where empty — ensureGeneration()/ensureModels() are no-ops for anything
// already present.
const CPU_GENERATIONS = [
  { name: 'Core Ultra 200 (Arrow Lake)', brand: 'Intel', socket: 'LGA1851', models: [
    'Core Ultra 9 285K', 'Core Ultra 7 265K', 'Core Ultra 7 265KF', 'Core Ultra 5 245K', 'Core Ultra 5 245KF',
  ] },
  { name: 'Gen 14 (Raptor Lake Refresh)', brand: 'Intel', socket: 'LGA1700', models: [
    'Core i9-14900KS', 'Core i9-14900K', 'Core i9-14900KF', 'Core i9-14900', 'Core i9-14900F', 'Core i9-14900T',
    'Core i7-14700K', 'Core i7-14700KF', 'Core i7-14700', 'Core i7-14700F', 'Core i7-14700T',
    'Core i5-14600K', 'Core i5-14600KF', 'Core i5-14600', 'Core i5-14500', 'Core i5-14500T', 'Core i5-14400', 'Core i5-14400F', 'Core i5-14400T',
    'Core i3-14100', 'Core i3-14100F', 'Core i3-14100T',
  ] },
  { name: 'Gen 13 (Raptor Lake)', brand: 'Intel', socket: 'LGA1700', models: [
    'Core i9-13900KS', 'Core i9-13900K', 'Core i9-13900KF', 'Core i9-13900', 'Core i9-13900F', 'Core i9-13900T',
    'Core i7-13700K', 'Core i7-13700KF', 'Core i7-13700', 'Core i7-13700F', 'Core i7-13700T',
    'Core i5-13600K', 'Core i5-13600KF', 'Core i5-13600', 'Core i5-13500', 'Core i5-13500T', 'Core i5-13400', 'Core i5-13400F', 'Core i5-13400T',
    'Core i3-13100', 'Core i3-13100F', 'Core i3-13100T',
  ] },
  { name: 'Gen 12 (Alder Lake)', brand: 'Intel', socket: 'LGA1700', models: [
    'Core i9-12900KS', 'Core i9-12900K', 'Core i9-12900KF', 'Core i9-12900', 'Core i9-12900F', 'Core i9-12900T',
    'Core i7-12700K', 'Core i7-12700KF', 'Core i7-12700', 'Core i7-12700F', 'Core i7-12700T',
    'Core i5-12600K', 'Core i5-12600KF', 'Core i5-12600', 'Core i5-12500', 'Core i5-12500T', 'Core i5-12400', 'Core i5-12400F', 'Core i5-12400T',
    'Core i3-12300', 'Core i3-12100', 'Core i3-12100F', 'Core i3-12100T',
    'Pentium Gold G7400', 'Pentium Gold G6900',
  ] },
  { name: 'Gen 11 (Rocket Lake)', brand: 'Intel', socket: 'LGA1200', models: [
    'Core i9-11900K', 'Core i9-11900KF', 'Core i9-11900', 'Core i9-11900F', 'Core i9-11900T',
    'Core i7-11700K', 'Core i7-11700KF', 'Core i7-11700', 'Core i7-11700F', 'Core i7-11700T',
    'Core i5-11600K', 'Core i5-11600KF', 'Core i5-11600', 'Core i5-11600T', 'Core i5-11500', 'Core i5-11500T', 'Core i5-11400', 'Core i5-11400F', 'Core i5-11400T',
  ] },
  { name: 'Gen 10 (Comet Lake)', brand: 'Intel', socket: 'LGA1200', models: [
    'Core i9-10900K', 'Core i9-10900KF', 'Core i9-10900', 'Core i9-10900F', 'Core i9-10900T', 'Core i9-10850K',
    'Core i7-10700K', 'Core i7-10700KF', 'Core i7-10700', 'Core i7-10700F', 'Core i7-10700T',
    'Core i5-10600K', 'Core i5-10600KF', 'Core i5-10600', 'Core i5-10500', 'Core i5-10400', 'Core i5-10400F',
    'Core i3-10320', 'Core i3-10300', 'Core i3-10105', 'Core i3-10105F', 'Core i3-10100', 'Core i3-10100F',
    'Pentium Gold G6400', 'Pentium Gold G5900', 'Pentium Gold G5905',
  ] },
  { name: 'Gen 9 (Coffee Lake Refresh)', brand: 'Intel', socket: 'LGA1151 (v2)', models: [
    'Core i9-9900KS', 'Core i9-9900K', 'Core i9-9900KF', 'Core i9-9900', 'Core i9-9900T',
    'Core i7-9700K', 'Core i7-9700KF', 'Core i7-9700', 'Core i7-9700F', 'Core i7-9700T',
    'Core i5-9600K', 'Core i5-9600KF', 'Core i5-9500', 'Core i5-9500F', 'Core i5-9400', 'Core i5-9400F',
    'Core i3-9350K', 'Core i3-9350KF', 'Core i3-9320', 'Core i3-9300', 'Core i3-9100', 'Core i3-9100F',
  ] },
  { name: 'Gen 8 (Coffee Lake)', brand: 'Intel', socket: 'LGA1151 (v2)', models: [
    'Core i7-8700K', 'Core i7-8700', 'Core i7-8700T', 'Core i7-8086K',
    'Core i5-8600K', 'Core i5-8600', 'Core i5-8500', 'Core i5-8400', 'Core i5-8400T',
    'Core i3-8350K', 'Core i3-8300', 'Core i3-8100', 'Core i3-8100F',
    'Pentium Gold G5600', 'Pentium Gold G5500', 'Pentium Gold G5400', 'Pentium Gold G4900',
  ] },
  { name: 'Gen 7 (Kaby Lake)', brand: 'Intel', socket: 'LGA1151 (v1)', models: [
    'Core i7-7700K', 'Core i7-7700', 'Core i7-7700T',
    'Core i5-7600K', 'Core i5-7600', 'Core i5-7500', 'Core i5-7400', 'Core i5-7400T',
    'Core i3-7350K', 'Core i3-7320', 'Core i3-7300', 'Core i3-7100', 'Core i3-7100T',
    'Pentium G4620', 'Pentium G4600', 'Pentium G4560',
  ] },
  { name: 'Gen 6 (Skylake)', brand: 'Intel', socket: 'LGA1151 (v1)', models: [
    'Core i7-6700K', 'Core i7-6700', 'Core i7-6700T',
    'Core i5-6600K', 'Core i5-6600', 'Core i5-6500', 'Core i5-6400', 'Core i5-6400T',
    'Core i3-6320', 'Core i3-6300', 'Core i3-6100', 'Core i3-6100T',
  ] },
  { name: 'Gen 5 (Broadwell)', brand: 'Intel', socket: 'LGA1150', models: [
    'Core i7-5775C', 'Core i5-5675C',
  ] },
  { name: 'Gen 4 (Haswell)', brand: 'Intel', socket: 'LGA1150', models: [
    'Core i7-4790K', 'Core i7-4790', 'Core i7-4770K', 'Core i7-4770',
    'Core i5-4690K', 'Core i5-4690', 'Core i5-4670K', 'Core i5-4590', 'Core i5-4460', 'Core i5-4440',
    'Core i3-4370', 'Core i3-4360', 'Core i3-4170', 'Core i3-4160', 'Core i3-4150', 'Core i3-4130',
  ] },
  { name: 'Gen 3 (Ivy Bridge)', brand: 'Intel', socket: 'LGA1155', models: [
    'Core i7-3770K', 'Core i7-3770',
    'Core i5-3570K', 'Core i5-3570', 'Core i5-3470', 'Core i5-3330',
    'Core i3-3220', 'Core i3-3240',
  ] },
  { name: 'Gen 2 (Sandy Bridge)', brand: 'Intel', socket: 'LGA1155', models: [
    'Core i7-2700K', 'Core i7-2600K', 'Core i7-2600',
    'Core i5-2500K', 'Core i5-2500', 'Core i5-2400', 'Core i5-2320',
    'Core i3-2120', 'Core i3-2100',
  ] },
  { name: 'Core X-Series (Gen 7-10)', brand: 'Intel', socket: 'LGA2066', models: [
    'Core i9-10980XE', 'Core i9-10940X', 'Core i9-10920X', 'Core i9-10900X',
    'Core i9-9980XE', 'Core i9-9960X', 'Core i9-9940X', 'Core i9-9920X', 'Core i9-9900X', 'Core i9-9820X',
    'Core i9-7980XE', 'Core i9-7960X', 'Core i9-7940X', 'Core i9-7920X', 'Core i9-7900X',
    'Core i7-9800X', 'Core i7-7820X', 'Core i7-7800X',
  ] },
  { name: 'Core i7 Extreme (Gen 5)', brand: 'Intel', socket: 'LGA2011-v3', models: [
    'Core i7-6950X', 'Core i7-6900K', 'Core i7-6850K', 'Core i7-6800K', 'Core i7-5960X', 'Core i7-5930K', 'Core i7-5820K',
  ] },
  { name: 'Ryzen 9000 Series (Zen 5)', brand: 'AMD', socket: 'AM5', models: [
    'Ryzen 9 9950X', 'Ryzen 9 9900X', 'Ryzen 7 9700X', 'Ryzen 5 9600X',
  ] },
  { name: 'Ryzen 8000 Series (Zen 4)', brand: 'AMD', socket: 'AM5', models: [
    'Ryzen 7 8700G', 'Ryzen 5 8600G', 'Ryzen 5 8500G', 'Ryzen 3 8300G',
  ] },
  { name: 'Ryzen 7000 Series (Zen 4)', brand: 'AMD', socket: 'AM5', models: [
    'Ryzen 9 7950X3D', 'Ryzen 9 7950X', 'Ryzen 9 7900X3D', 'Ryzen 9 7900X', 'Ryzen 9 7900',
    'Ryzen 7 7800X3D', 'Ryzen 7 7700X', 'Ryzen 7 7700',
    'Ryzen 5 7600X', 'Ryzen 5 7600', 'Ryzen 5 7500F',
  ] },
  { name: 'Ryzen 5000 Series (Zen 3)', brand: 'AMD', socket: 'AM4', models: [
    'Ryzen 9 5950X', 'Ryzen 9 5900X', 'Ryzen 9 5900',
    'Ryzen 7 5800X3D', 'Ryzen 7 5800X', 'Ryzen 7 5800', 'Ryzen 7 5700X3D', 'Ryzen 7 5700X', 'Ryzen 7 5700G', 'Ryzen 7 5700',
    'Ryzen 5 5600X3D', 'Ryzen 5 5600X', 'Ryzen 5 5600GT', 'Ryzen 5 5600G', 'Ryzen 5 5600', 'Ryzen 5 5500GT', 'Ryzen 5 5500',
    'Ryzen 3 5300G',
  ] },
  { name: 'Ryzen 4000 Series (Renoir)', brand: 'AMD', socket: 'AM4', models: [
    'Ryzen 7 4700G', 'Ryzen 7 4700GE',
    'Ryzen 5 4600G', 'Ryzen 5 4600GE', 'Ryzen 5 4500',
    'Ryzen 3 4300G', 'Ryzen 3 4300GE', 'Ryzen 3 4100',
  ] },
  { name: 'Ryzen 3000 Series (Zen 2)', brand: 'AMD', socket: 'AM4', models: [
    'Ryzen 9 3950X', 'Ryzen 9 3900XT', 'Ryzen 9 3900X', 'Ryzen 9 3900',
    'Ryzen 7 3800XT', 'Ryzen 7 3800X', 'Ryzen 7 3700X',
    'Ryzen 5 3600XT', 'Ryzen 5 3600X', 'Ryzen 5 3600', 'Ryzen 5 3500X', 'Ryzen 5 3500', 'Ryzen 5 3400G',
    'Ryzen 3 3300X', 'Ryzen 3 3100', 'Ryzen 3 3200G',
  ] },
  { name: 'Ryzen 2000 Series (Pinnacle Ridge/Raven Ridge)', brand: 'AMD', socket: 'AM4', models: [
    'Ryzen 7 2700X', 'Ryzen 7 2700', 'Ryzen 7 2700E',
    'Ryzen 5 2600X', 'Ryzen 5 2600', 'Ryzen 5 2600E', 'Ryzen 5 2400G',
    'Ryzen 3 2300X', 'Ryzen 3 2200G',
  ] },
  { name: 'Ryzen 1000 Series (Summit Ridge)', brand: 'AMD', socket: 'AM4', models: [
    'Ryzen 7 1800X', 'Ryzen 7 1700X', 'Ryzen 7 1700',
    'Ryzen 5 1600X', 'Ryzen 5 1600', 'Ryzen 5 1500X', 'Ryzen 5 1400',
    'Ryzen 3 1300X', 'Ryzen 3 1200',
    'Athlon 3000G', 'Athlon 240GE', 'Athlon 220GE', 'Athlon 200GE',
  ] },
  { name: 'FX-Series (Vishera/Zambezi)', brand: 'AMD', socket: 'AM3+', models: [
    'FX-9590', 'FX-9370',
    'FX-8370', 'FX-8350', 'FX-8320', 'FX-8320E', 'FX-8300', 'FX-8150', 'FX-8120',
    'FX-6350', 'FX-6300', 'FX-6100',
    'FX-4350', 'FX-4300', 'FX-4130', 'FX-4100',
  ] },
  { name: 'Threadripper 7000 Series', brand: 'AMD', socket: 'sTR5', models: [
    'Threadripper 7980X', 'Threadripper 7970X', 'Threadripper 7960X',
    'Threadripper PRO 7995WX', 'Threadripper PRO 7985WX', 'Threadripper PRO 7975WX', 'Threadripper PRO 7965WX',
  ] },
  { name: 'Threadripper 3000 Series', brand: 'AMD', socket: 'sTRX4', models: [
    'Threadripper 3990X', 'Threadripper 3970X', 'Threadripper 3960X',
  ] },
  { name: 'Threadripper 1000 & 2000 Series', brand: 'AMD', socket: 'TR4', models: [
    'Threadripper 2990WX', 'Threadripper 2970WX', 'Threadripper 2950X', 'Threadripper 2920X',
    'Threadripper 1950X', 'Threadripper 1920X', 'Threadripper 1900X',
  ] },
];

async function step3_chipsetsAndGenerations() {
  console.log('\n== Step 3: chipsets + chipset_generations mapping ==');
  for (const era of CHIPSET_ERAS) {
    const socketId = await getSocketId(era.socket);
    if (!socketId) throw new Error(`Socket "${era.socket}" not found — should have been created in step 2`);
    const chipsetIds = [];
    for (const chipsetName of era.chipsets) {
      chipsetIds.push(await ensureChipset(socketId, chipsetName));
    }
    console.log(`  ${era.socket}: ${era.chipsets.length} chipset(s) (${era.chipsets.join(', ')})`);
  }
}

async function step4_cpuGenerationsAndModels() {
  console.log('\n== Step 4: CPU generations + models ==');
  let totalNewGenerations = 0;
  let totalNewModels = 0;
  for (const gen of CPU_GENERATIONS) {
    const socketId = await getSocketId(gen.socket);
    if (!socketId) throw new Error(`Socket "${gen.socket}" not found for generation "${gen.name}"`);
    const existedBefore = await getGenerationId(gen.name);
    const genId = await ensureGeneration(gen.name, gen.brand, socketId);
    if (!existedBefore) totalNewGenerations++;
    const added = await ensureModels(genId, gen.models);
    totalNewModels += added;
    console.log(`  ${gen.name}: +${added} model(s) (${gen.models.length - added} already present)`);
  }
  console.log(`✅ ${totalNewGenerations} new generation(s), ${totalNewModels} new model(s)`);
}

async function step5_chipsetGenerationMappings() {
  console.log('\n== Step 5: chipset_generations mappings ==');
  let mappings = 0;
  for (const era of CHIPSET_ERAS) {
    if (era.generations.length === 0) continue;
    const socketId = await getSocketId(era.socket);
    for (const chipsetName of era.chipsets) {
      const chipsetRes = await pool.query('SELECT id FROM chipsets WHERE socket_id = ? AND name = ?', [socketId, chipsetName]);
      const chipsetId = chipsetRes.rows?.[0]?.id;
      if (!chipsetId) continue;
      for (const genName of era.generations) {
        const genId = await getGenerationId(genName);
        if (!genId) {
          console.log(`  ⚠️ generation "${genName}" not found for chipset "${chipsetName}" — skipping mapping`);
          continue;
        }
        await ensureChipsetGeneration(chipsetId, genId);
        mappings++;
      }
    }
  }
  console.log(`✅ ${mappings} chipset↔generation mapping(s) ensured`);
}

async function main() {
  console.log('🚀 Round 11 migration — full CPU + motherboard chipset catalog — local run');
  await step0_prereqs();
  await step1_renameOrphanSocket();
  await step2_newSockets();
  await step3_chipsetsAndGenerations();
  await step4_cpuGenerationsAndModels();
  await step5_chipsetGenerationMappings();
  console.log('\nDone.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
