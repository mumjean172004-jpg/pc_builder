// Reset the password for the two seeded demo accounts (john@example.com,
// admin@example.com) — needed after a fresh install from seed_data_mysql.sql,
// since its bcrypt hash does NOT actually match 'password123' despite the
// comment in that file (see KnowledgeBase/07_document/Deployment_Guide.md).
//
// Never hardcode real passwords in a committed script — pass them via env vars:
//   JOHNDOE_PASSWORD=... ADMIN_PASSWORD=... node scripts/reset_demo_passwords.js
//
// Connects using whatever DB_HOST/etc. is set in the environment (.env or
// inline) — point it at Railway's MySQL (e.g. during its temporary public
// access window) to reset the passwords there, or at local for testing.
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../config/database');

const ACCOUNTS = [
  { email: 'john@example.com', passwordEnvVar: 'JOHNDOE_PASSWORD' },
  { email: 'admin@example.com', passwordEnvVar: 'ADMIN_PASSWORD' },
];

async function main() {
  const missing = ACCOUNTS.filter(a => !process.env[a.passwordEnvVar]);
  if (missing.length) {
    console.error('Missing required env var(s):', missing.map(a => a.passwordEnvVar).join(', '));
    console.error('Usage: JOHNDOE_PASSWORD=... ADMIN_PASSWORD=... node scripts/reset_demo_passwords.js');
    process.exit(1);
  }

  for (const account of ACCOUNTS) {
    const existing = await pool.query('SELECT id, username FROM users WHERE email = ?', [account.email]);
    if (!existing.rows?.length) {
      console.log(`Skipped ${account.email} — no matching user found.`);
      continue;
    }

    const hashed = await bcrypt.hash(process.env[account.passwordEnvVar], 10);
    await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashed, account.email]);
    console.log(`Password reset for ${account.email} (id=${existing.rows[0].id}, username=${existing.rows[0].username}).`);
  }

  console.log('\nDone.');
  process.exit(0);
}

main().catch(e => {
  console.error('Failed:', e);
  process.exit(1);
});
