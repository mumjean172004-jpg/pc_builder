// One-time helper: dumps the current master lookup table data (sockets, chipsets,
// CPU/GPU catalogs, etc.) from the local database as INSERT IGNORE statements,
// so it can be appended into 02_database/seed_data_mysql.sql. This data was never
// part of that seed file — it only ever existed locally via the one-off
// migrate_builder_v3.js..v9.js scripts, which a fresh install never runs. Found
// live on 2026-08-20 when a fresh Railway install had every cascading spec
// picker (Socket/Chipset/Generation/Series/Chip/Efficiency/Modularity) render
// completely empty.
require('dotenv').config();
const fs = require('fs');
const pool = require('../config/database');

function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  const str = String(val).split('\\').join('\\\\').split("'").join("''");
  return "'" + str + "'";
}

const TABLES = [
  { name: 'sockets', label: 'Sockets (CPU socket master list)' },
  { name: 'chipsets', label: 'Chipsets (per socket)' },
  { name: 'form_factors', label: 'Motherboard/case form factors' },
  { name: 'ram_types', label: 'RAM types' },
  { name: 'brands', label: 'Brands (open lookup -- sellers can also register new ones)' },
  { name: 'cpu_series', label: 'CPU series (coarse tier, e.g. Core i5)' },
  { name: 'vga_series', label: 'GPU series' },
  { name: 'gpu_chips', label: 'GPU chips (per series)' },
  { name: 'psu_modular', label: 'PSU modularity types' },
  { name: 'psu_efficiency', label: 'PSU 80+ efficiency tiers' },
  { name: 'cpu_generations', label: 'CPU generations (per socket)' },
  { name: 'cpu_models', label: 'CPU models (per generation) -- cascading picker data only' },
  { name: 'chipset_generations', label: 'Chipset <-> CPU generation compatibility map' },
];

async function main() {
  let out = '';
  for (const t of TABLES) {
    const result = await pool.query(`SELECT * FROM ${t.name} ORDER BY ${t.name === 'chipset_generations' ? 'chipset_id, generation_id' : 'id'}`);
    const rows = result.rows;
    if (!rows.length) continue;
    const columns = Object.keys(rows[0]);
    out += `\n-- ${t.label} (${rows.length} rows)\n`;
    out += `INSERT IGNORE INTO ${t.name} (${columns.map(c => `\`${c}\``).join(', ')}) VALUES\n`;
    const valueLines = rows.map(r => '(' + columns.map(c => sqlEscape(r[c])).join(', ') + ')');
    out += valueLines.join(',\n') + ';\n';
  }
  fs.writeFileSync('lookup_seed_generated.sql', out);
  console.log('Generated lookup_seed_generated.sql,', out.length, 'bytes');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
