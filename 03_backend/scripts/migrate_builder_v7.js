// Round 7 — spec_cpu.generation_id becomes real (was cascade-picker-only per Round
// 5's explicit scope). Needed now because the main sell-product flow filters
// EXISTING catalog CPUs by generation, not just suggests one when adding a new
// model. Additive/nullable column; backfills the small number of pre-existing CPU
// parts via a name-matching heuristic, printed for manual review rather than
// trusted blindly (same discipline as every prior migration this session).
require('dotenv').config();
const pool = require('../config/database');

async function columnExists(table, column) {
  const res = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return !!res.rows?.length;
}

async function addColumn() {
  console.log('\n== Step 1: spec_cpu.generation_id ==');
  if (await columnExists('spec_cpu', 'generation_id')) {
    console.log('ℹ️ spec_cpu.generation_id already exists');
    return;
  }
  await pool.query(
    `ALTER TABLE spec_cpu ADD COLUMN generation_id INT DEFAULT NULL, ADD CONSTRAINT fk_spec_cpu_generation FOREIGN KEY (generation_id) REFERENCES cpu_generations(id)`
  );
  console.log('✅ spec_cpu.generation_id added');
}

async function backfill() {
  console.log('\n== Step 2: backfill generation_id for existing CPU parts ==');
  console.log('Heuristic: strip the leading "<brand> " prefix off parts.name, exact-match');
  console.log('what remains against cpu_models.name (verify every row below by eye).');

  const parts = await pool.query(
    `SELECT p.id, p.brand, p.name, sc.generation_id
     FROM parts p
     JOIN categories c ON p.category_id = c.id
     JOIN spec_cpu sc ON sc.part_id = p.id
     WHERE c.slug = 'cpu'`
  );
  const models = await pool.query(`SELECT cm.id, cm.name, cm.generation_id, cg.name AS generation_name FROM cpu_models cm JOIN cpu_generations cg ON cg.id = cm.generation_id`);
  const modelByName = new Map(models.rows.map(m => [m.name.toLowerCase(), m]));

  let matched = 0;
  let alreadySet = 0;
  let unmatched = 0;
  for (const part of parts.rows || []) {
    if (part.generation_id) {
      alreadySet++;
      console.log(`⏭️  part_id=${part.id} "${part.name}" — generation_id already set, skipped`);
      continue;
    }
    const prefix = new RegExp(`^${part.brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i');
    const stripped = part.name.replace(prefix, '').trim().toLowerCase();
    const model = modelByName.get(stripped);
    if (!model) {
      unmatched++;
      console.log(`❌ part_id=${part.id} "${part.name}" (stripped: "${stripped}") — no exact match in cpu_models, left NULL`);
      continue;
    }
    await pool.query(`UPDATE spec_cpu SET generation_id = ? WHERE part_id = ?`, [model.generation_id, part.id]);
    matched++;
    console.log(`✅ part_id=${part.id} "${part.name}" -> generation "${model.generation_name}" (matched model "${model.name}")`);
  }
  console.log(`\n${matched} matched, ${alreadySet} already set, ${unmatched} unmatched (left NULL — review manually if that's wrong).`);
}

async function main() {
  console.log('🚀 Builder v7 migration — spec_cpu.generation_id — local run');
  await addColumn();
  await backfill();
  console.log('\nDone. Additive column only, nothing dropped or renamed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
