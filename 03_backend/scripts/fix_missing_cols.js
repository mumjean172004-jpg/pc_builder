require('dotenv').config();
const pool = require('../config/database');

const fixes = [
  { table: 'users', column: 'seller_id_card', type: 'VARCHAR(50) DEFAULT NULL' },
  { table: 'products', column: 'allow_hand_pickup', type: 'TINYINT DEFAULT 1' },
  { table: 'products', column: 'allow_cod', type: 'TINYINT DEFAULT 0' },
  { table: 'products', column: 'allow_express', type: 'TINYINT DEFAULT 1' },
  { table: 'products', column: 'pickup_location', type: 'VARCHAR(255) DEFAULT NULL' },
  { table: 'builds', column: 'is_public', type: 'TINYINT DEFAULT 1' },
];

(async () => {
  for (const f of fixes) {
    const check = await pool.query(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [f.table, f.column]
    );
    if (check.rows.length === 0) {
      await pool.query(`ALTER TABLE \`${f.table}\` ADD COLUMN \`${f.column}\` ${f.type}`);
      console.log('Added:', f.table + '.' + f.column);
    } else {
      console.log('Already exists:', f.table + '.' + f.column);
    }
  }

  const idx = await pool.query("SHOW INDEX FROM builds WHERE Key_name = 'idx_builds_public'");
  if (idx.rows.length === 0) {
    await pool.query('CREATE INDEX idx_builds_public ON builds(is_public)');
    console.log('Created index idx_builds_public');
  } else {
    console.log('Index idx_builds_public already exists');
  }
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
