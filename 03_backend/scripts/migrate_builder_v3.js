// Migration script — Builder redesign v3 (master lookup + typed spec tables,
// build_parts bound to real listings instead of the neutral parts catalog).
//
// Safe to re-run: every step is idempotent (CREATE TABLE IF NOT EXISTS, INSERT
// IGNORE for seed data, ON DUPLICATE KEY UPDATE for the spec ETL). Nothing here
// drops `parts.specs` or `build_parts.part_id` — those stay in place until the
// ETL/backfill report below has been reviewed. Run again after fixing any
// reported gaps; it will only touch what's still missing.
require('dotenv').config();
const pool = require('../config/database');
const { CATEGORY_SPEC_CONFIG } = require('../services/specTables');

async function tableExists(name) {
  const res = await pool.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [name]
  );
  return !!res.rows?.length;
}

async function columnExists(table, column) {
  const res = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return !!res.rows?.length;
}

async function createTablesIfMissing() {
  console.log('\n== Step 1: master lookup + spec tables ==');

  const statements = [
    `CREATE TABLE IF NOT EXISTS sockets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      brand VARCHAR(20) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS chipsets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      socket_id INT NOT NULL,
      name VARCHAR(50) NOT NULL,
      UNIQUE KEY uniq_socket_chipset (socket_id, name),
      FOREIGN KEY (socket_id) REFERENCES sockets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS form_factors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(20) UNIQUE NOT NULL,
      size_level INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS ram_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(20) UNIQUE NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS spec_cpu (
      part_id INT PRIMARY KEY,
      socket_id INT NOT NULL,
      tdp INT DEFAULT NULL,
      cores INT DEFAULT NULL,
      threads INT DEFAULT NULL,
      integrated_graphics TINYINT DEFAULT 0,
      FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
      FOREIGN KEY (socket_id) REFERENCES sockets(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS spec_cpu_cooler (
      part_id INT PRIMARY KEY,
      type VARCHAR(20) DEFAULT NULL,
      height_mm INT DEFAULT NULL,
      radiator_mm INT DEFAULT NULL,
      tdp_rating INT DEFAULT NULL,
      FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS spec_motherboard (
      part_id INT PRIMARY KEY,
      socket_id INT NOT NULL,
      chipset_id INT NOT NULL,
      form_factor_id INT NOT NULL,
      ram_type_id INT NOT NULL,
      ram_slots INT DEFAULT NULL,
      max_ram_gb INT DEFAULT NULL,
      FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
      FOREIGN KEY (socket_id) REFERENCES sockets(id),
      FOREIGN KEY (chipset_id) REFERENCES chipsets(id),
      FOREIGN KEY (form_factor_id) REFERENCES form_factors(id),
      FOREIGN KEY (ram_type_id) REFERENCES ram_types(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS spec_ram (
      part_id INT PRIMARY KEY,
      ram_type_id INT NOT NULL,
      capacity_gb INT DEFAULT NULL,
      modules INT DEFAULT NULL,
      speed VARCHAR(50) DEFAULT NULL,
      FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
      FOREIGN KEY (ram_type_id) REFERENCES ram_types(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS spec_gpu (
      part_id INT PRIMARY KEY,
      vram_gb INT DEFAULT NULL,
      vram_type VARCHAR(50) DEFAULT NULL,
      tdp INT DEFAULT NULL,
      length_mm INT DEFAULT NULL,
      FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS spec_case (
      part_id INT PRIMARY KEY,
      form_factor_id INT NOT NULL,
      max_gpu_length_mm INT DEFAULT NULL,
      max_cooler_height_mm INT DEFAULT NULL,
      radiator_support VARCHAR(50) DEFAULT NULL,
      FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
      FOREIGN KEY (form_factor_id) REFERENCES form_factors(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS spec_psu (
      part_id INT PRIMARY KEY,
      wattage INT DEFAULT NULL,
      efficiency VARCHAR(50) DEFAULT NULL,
      modularity VARCHAR(50) DEFAULT NULL,
      FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS spec_storage (
      part_id INT PRIMARY KEY,
      interface VARCHAR(50) DEFAULT NULL,
      capacity_gb INT DEFAULT NULL,
      read_speed VARCHAR(50) DEFAULT NULL,
      FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];

  for (const sql of statements) {
    await pool.query(sql);
  }
  console.log('✅ master lookup + spec tables ready');

  if (!(await columnExists('parts', 'created_by_user_id'))) {
    await pool.query(
      `ALTER TABLE parts ADD COLUMN created_by_user_id INT DEFAULT NULL,
       ADD CONSTRAINT fk_parts_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL`
    );
    console.log('✅ parts.created_by_user_id added (NULL = admin-added)');
  } else {
    console.log('ℹ️ parts.created_by_user_id already exists');
  }

  if (!(await columnExists('build_parts', 'product_id'))) {
    await pool.query(`ALTER TABLE build_parts ADD COLUMN product_id INT DEFAULT NULL`);
    console.log('✅ build_parts.product_id added (nullable — backfilled in step 4, part_id kept until verified)');
  } else {
    console.log('ℹ️ build_parts.product_id already exists');
  }

  // New code (adminController.addCatalogPart, partsController.addModel) writes specs
  // into the typed spec_* tables and no longer populates this column — relax the
  // NOT NULL constraint so those inserts don't fail. The column itself stays until
  // the ETL below is verified (kept as a readable backup, not written to anymore).
  await pool.query(`ALTER TABLE parts MODIFY COLUMN specs TEXT NULL`);
  console.log('✅ parts.specs relaxed to nullable (kept as read-only backup until ETL is verified)');

  // Seller-added models (partsController.addModel) deliberately submit no `price`
  // (see that function's comment — avoids a seller setting their own MSRP reference
  // low to dodge the anti-fraud price-floor check), so `price` must accept NULL too.
  await pool.query(`ALTER TABLE parts MODIFY COLUMN price DECIMAL(10,2) DEFAULT NULL`);
  console.log('✅ parts.price relaxed to nullable (seller-added models start with no MSRP until an admin sets one)');
}

async function seedLookups() {
  console.log('\n== Step 2: seed master lookup values ==');

  const sockets = [
    ['LGA1700', 'Intel'], ['LGA1851', 'Intel'], ['AM4', 'AMD'], ['AM5', 'AMD'],
  ];
  for (const [name, brand] of sockets) {
    await pool.query('INSERT IGNORE INTO sockets (name, brand) VALUES (?, ?)', [name, brand]);
  }

  const chipsetsBySocket = {
    LGA1700: ['H610', 'B660', 'B760', 'Z690', 'Z790'],
    LGA1851: ['B860', 'Z890'],
    AM4: ['A320', 'B350', 'B450', 'B550', 'X370', 'X470', 'X570'],
    AM5: ['A620', 'B650', 'B650E', 'X670', 'X670E'],
  };
  for (const [socketName, chipsetNames] of Object.entries(chipsetsBySocket)) {
    const socketRow = await pool.query('SELECT id FROM sockets WHERE name = ?', [socketName]);
    const socketId = socketRow.rows?.[0]?.id;
    if (!socketId) continue;
    for (const chipsetName of chipsetNames) {
      await pool.query('INSERT IGNORE INTO chipsets (socket_id, name) VALUES (?, ?)', [socketId, chipsetName]);
    }
  }

  const formFactors = [['ITX', 1], ['mATX', 2], ['ATX', 3], ['E-ATX', 4]];
  for (const [name, level] of formFactors) {
    await pool.query('INSERT IGNORE INTO form_factors (name, size_level) VALUES (?, ?)', [name, level]);
  }

  const ramTypes = ['DDR4', 'DDR5'];
  for (const name of ramTypes) {
    await pool.query('INSERT IGNORE INTO ram_types (name) VALUES (?)', [name]);
  }

  console.log('✅ lookup tables seeded (idempotent — existing rows untouched)');
}

function parseSpecsJson(specs) {
  if (typeof specs === 'string') {
    try { return JSON.parse(specs); } catch { return null; }
  }
  return specs || null;
}

async function etlSpecs() {
  console.log('\n== Step 3: ETL parts.specs (JSON) -> typed spec tables ==');

  const partsResult = await pool.query(
    `SELECT p.id, p.specs, c.slug AS category_slug FROM parts p JOIN categories c ON p.category_id = c.id`
  );

  const { upsertSpecs } = require('../services/specTables');
  const missingKeyReport = [];
  const unmigratedCategories = new Set();
  let migrated = 0;

  for (const part of partsResult.rows || []) {
    const config = CATEGORY_SPEC_CONFIG[part.category_slug];
    if (!config) {
      unmigratedCategories.add(part.category_slug); // monitor/full-pc/accessories — no compatibility spec table by design
      continue;
    }

    const specs = parseSpecsJson(part.specs);
    if (!specs) {
      missingKeyReport.push({ part_id: part.id, category: part.category_slug, reason: 'specs field is empty/unparseable JSON' });
      continue;
    }

    const requiredLookupKeys = Object.keys(config.lookups);
    const missingLookups = requiredLookupKeys.filter((k) => !specs[k]);
    if (missingLookups.length) {
      missingKeyReport.push({ part_id: part.id, category: part.category_slug, reason: `missing required field(s): ${missingLookups.join(', ')}` });
      continue;
    }

    try {
      await upsertSpecs(pool, part.category_slug, part.id, specs);
      migrated++;
    } catch (err) {
      missingKeyReport.push({ part_id: part.id, category: part.category_slug, reason: err.message });
    }
  }

  console.log(`✅ migrated ${migrated} parts into typed spec tables`);
  if (unmigratedCategories.size) {
    console.log(`ℹ️ categories with no compatibility spec table (unchanged, expected): ${[...unmigratedCategories].join(', ')}`);
  }
  if (missingKeyReport.length) {
    console.log(`⚠️ ${missingKeyReport.length} part(s) need review before parts.specs can be dropped:`);
    for (const row of missingKeyReport) {
      console.log(`   - part_id=${row.part_id} (${row.category}): ${row.reason}`);
    }
  } else {
    console.log('✅ every part with a compatibility-relevant category migrated cleanly');
  }

  return missingKeyReport;
}

async function backfillBuildParts() {
  console.log('\n== Step 4: best-effort build_parts.part_id -> product_id backfill ==');

  const rows = await pool.query(
    `SELECT id, build_id, part_id FROM build_parts WHERE product_id IS NULL`
  );

  let matched = 0;
  const unmatched = [];

  for (const bp of rows.rows || []) {
    const candidate = await pool.query(
      `SELECT id FROM products
       WHERE part_id = ? AND status = 'active' AND review_status = 'approved' AND stock_quantity > 0
       ORDER BY price ASC LIMIT 1`,
      [bp.part_id]
    );
    const productId = candidate.rows?.[0]?.id;
    if (productId) {
      await pool.query('UPDATE build_parts SET product_id = ? WHERE id = ?', [productId, bp.id]);
      matched++;
    } else {
      unmatched.push(bp);
    }
  }

  console.log(`✅ matched ${matched} build_parts row(s) to a live listing`);
  if (unmatched.length) {
    console.log(`⚠️ ${unmatched.length} build_parts row(s) have no live listing for their catalog part — left with product_id = NULL, will need review (build id : part id):`);
    for (const bp of unmatched) {
      console.log(`   - build_id=${bp.build_id}, part_id=${bp.part_id}`);
    }
  }

  return unmatched;
}

async function main() {
  console.log('🚀 Builder v3 migration — local run');
  await createTablesIfMissing();
  await seedLookups();
  const specGaps = await etlSpecs();
  const buildGaps = await backfillBuildParts();

  console.log('\n== Summary ==');
  console.log(`parts.specs -> typed tables: ${specGaps.length} row(s) need review`);
  console.log(`build_parts.part_id -> product_id: ${buildGaps.length} row(s) unmatched`);
  console.log('\nNothing destructive has run — parts.specs and build_parts.part_id are untouched.');
  console.log('Re-run this script after fixing data; only remaining gaps will be reprocessed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
