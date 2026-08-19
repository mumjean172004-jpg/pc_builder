// Migration — extract seller/KYC fields off `users` into a dedicated
// `seller_profiles` table (1:1 via user_id as PK+FK, not a separate auto-increment
// id — enforces "one seller profile per account" by construction).
//
// `users` accumulated two parallel column sets for the same data over several
// ad-hoc migrations (bank_name/seller_bank_name, bank_account_number/
// seller_bank_account, bank_account_name/seller_bank_account_name,
// id_card_number/seller_id_card) — confirmed via grep that authController's
// registerSeller/verifySellerIdentity write BOTH columns in each pair, but
// updateSellerProfile only writes the seller_-prefixed one, so they can drift
// apart. This migration COALESCEs each pair (preferring the seller_-prefixed
// value) and reports any row where both are non-null AND different, rather than
// silently picking one.
//
// Old `users` columns are NOT dropped here — that happens as a separate, later
// step only after the new seller_profiles-backed code path has been verified
// end-to-end (register -> become seller -> KYC verify -> order bank display).
require('dotenv').config();
const pool = require('../config/database');

async function tableExists(name) {
  const res = await pool.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [name]
  );
  return !!res.rows?.length;
}

async function createTable() {
  console.log('\n== Step 1: create seller_profiles ==');
  if (await tableExists('seller_profiles')) {
    console.log('ℹ️ seller_profiles already exists');
    return;
  }
  await pool.query(`
    CREATE TABLE seller_profiles (
      user_id INT PRIMARY KEY,
      shop_name VARCHAR(255) DEFAULT NULL,
      shop_avatar_url TEXT DEFAULT NULL,
      address_province VARCHAR(255) DEFAULT NULL,
      address_district VARCHAR(255) DEFAULT NULL,
      contact_phone VARCHAR(50) DEFAULT NULL,
      full_name VARCHAR(255) DEFAULT NULL,
      id_card_number VARCHAR(50) DEFAULT NULL,
      bank_name VARCHAR(100) DEFAULT NULL,
      bank_account_number VARCHAR(100) DEFAULT NULL,
      bank_account_name VARCHAR(255) DEFAULT NULL,
      kyc_status VARCHAR(50) DEFAULT 'none',
      kyc_document_url TEXT DEFAULT NULL,
      is_verified TINYINT DEFAULT 0,
      has_badge TINYINT DEFAULT 0,
      rating DECIMAL(3,2) DEFAULT 0.00,
      sales_count INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ seller_profiles created');
}

function conflict(a, b) {
  return a !== null && b !== null && a !== undefined && b !== undefined && String(a).trim() !== '' && String(b).trim() !== '' && String(a) !== String(b);
}

async function migrateData() {
  console.log('\n== Step 2: migrate + dedupe seller/KYC fields from users ==');

  // Only users who have ever touched seller fields (avoid creating empty profiles
  // for pure buyers who never registered as a seller).
  const result = await pool.query(`
    SELECT id, shop_name, seller_avatar_url, seller_address_province, seller_address_district,
           seller_phone, seller_full_name,
           id_card_number, seller_id_card,
           bank_name, seller_bank_name,
           bank_account_number, seller_bank_account,
           bank_account_name, seller_bank_account_name,
           kyc_status, kyc_document_url,
           is_seller_verified, has_seller_badge, seller_rating, sales_count
    FROM users
    WHERE shop_name IS NOT NULL OR seller_bank_account IS NOT NULL OR bank_account_number IS NOT NULL
       OR is_seller_verified = 1 OR kyc_status IS NOT NULL AND kyc_status != 'none'
  `);

  const rows = result.rows || [];
  const conflicts = [];
  let migrated = 0;

  for (const u of rows) {
    const pairs = [
      { label: 'id_card_number/seller_id_card', a: u.id_card_number, b: u.seller_id_card },
      { label: 'bank_name/seller_bank_name', a: u.bank_name, b: u.seller_bank_name },
      { label: 'bank_account_number/seller_bank_account', a: u.bank_account_number, b: u.seller_bank_account },
      { label: 'bank_account_name/seller_bank_account_name', a: u.bank_account_name, b: u.seller_bank_account_name },
    ];
    for (const p of pairs) {
      if (conflict(p.a, p.b)) {
        conflicts.push({ user_id: u.id, field: p.label, unprefixed: p.a, seller_prefixed: p.b });
      }
    }

    const idCard = u.seller_id_card || u.id_card_number || null;
    const bankName = u.seller_bank_name || u.bank_name || null;
    const bankAccountNumber = u.seller_bank_account || u.bank_account_number || null;
    const bankAccountName = u.seller_bank_account_name || u.bank_account_name || null;

    await pool.query(
      `INSERT INTO seller_profiles
        (user_id, shop_name, shop_avatar_url, address_province, address_district, contact_phone,
         full_name, id_card_number, bank_name, bank_account_number, bank_account_name,
         kyc_status, kyc_document_url, is_verified, has_badge, rating, sales_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         shop_name = VALUES(shop_name), shop_avatar_url = VALUES(shop_avatar_url),
         address_province = VALUES(address_province), address_district = VALUES(address_district),
         contact_phone = VALUES(contact_phone), full_name = VALUES(full_name),
         id_card_number = VALUES(id_card_number), bank_name = VALUES(bank_name),
         bank_account_number = VALUES(bank_account_number), bank_account_name = VALUES(bank_account_name),
         kyc_status = VALUES(kyc_status), kyc_document_url = VALUES(kyc_document_url),
         is_verified = VALUES(is_verified), has_badge = VALUES(has_badge),
         rating = VALUES(rating), sales_count = VALUES(sales_count)`,
      [
        u.id, u.shop_name, u.seller_avatar_url, u.seller_address_province, u.seller_address_district,
        u.seller_phone, u.seller_full_name, idCard, bankName, bankAccountNumber, bankAccountName,
        u.kyc_status || 'none', u.kyc_document_url, u.is_seller_verified ? 1 : 0, u.has_seller_badge ? 1 : 0,
        u.seller_rating || 0, u.sales_count || 0,
      ]
    );
    migrated++;
  }

  console.log(`✅ migrated ${migrated} seller profile(s) out of ${rows.length} candidate user(s)`);
  if (conflicts.length) {
    console.log(`⚠️ ${conflicts.length} field-value conflict(s) found (both columns populated but DIFFERENT — took the seller_-prefixed value, review manually if that's wrong):`);
    conflicts.forEach((c) => console.log(`   - user_id=${c.user_id} ${c.field}: unprefixed="${c.unprefixed}" vs seller_prefixed="${c.seller_prefixed}"`));
  } else {
    console.log('✅ no field-value conflicts between duplicate column pairs');
  }
}

async function main() {
  console.log('🚀 seller_profiles migration — local run');
  await createTable();
  await migrateData();
  console.log('\nDone. `users` columns are untouched — old seller/KYC columns stay in place');
  console.log('until the new seller_profiles-backed code path is verified end-to-end, then dropped separately.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
