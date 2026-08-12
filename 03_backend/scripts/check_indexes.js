require('dotenv').config();
const fs = require('fs');
const pool = require('../config/database');

const sql = fs.readFileSync('../02_database/schema_mysql.sql', 'utf8');
const idxRe = /CREATE INDEX\s+(\w+)\s+ON\s+(\w+)\((\w+)\)/g;
let m;
const expected = [];
while ((m = idxRe.exec(sql))) {
  expected.push({ name: m[1], table: m[2], col: m[3] });
}

(async () => {
  for (const idx of expected) {
    const res = await pool.query('SHOW INDEX FROM ?? WHERE Key_name = ?', [idx.table, idx.name]);
    if (res.rows.length === 0) {
      await pool.query(`CREATE INDEX \`${idx.name}\` ON \`${idx.table}\`(\`${idx.col}\`)`);
      console.log('Created missing index:', idx.name, 'on', idx.table);
    }
  }
  console.log('Index check complete. Total expected:', expected.length);
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
