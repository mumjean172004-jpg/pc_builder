// Round 3 final step — drop the old duplicate seller/KYC columns from `users`
// now that seller_profiles has been verified end-to-end (register -> switch-role
// -> update -> KYC verify -> order bank display -> product listing -> admin rating
// recalc, see migrate_seller_profiles_v1.js for the data migration that fed it).
require('dotenv').config();
const pool = require('../config/database');

const COLUMNS_TO_DROP = [
  'shop_name',
  'seller_avatar_url',
  'seller_address_province',
  'seller_address_district',
  'seller_phone',
  'is_seller_verified',
  'id_card_number',
  'bank_account_number',
  'seller_rating',
  'sales_count',
  'has_seller_badge',
  'bank_name',
  'bank_account_name',
  'seller_full_name',
  'kyc_status',
  'kyc_document_url',
  'seller_reputation_score',
  'seller_verified_at',
  'seller_bank_name',
  'seller_bank_account',
  'seller_verification_status',
  'seller_verification_proof_url',
  'seller_bank_account_name',
  'seller_id_card',
];

async function columnExists(table, column) {
  const res = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return !!res.rows?.length;
}

async function main() {
  console.log('🚀 Dropping old seller/KYC columns from users — local run');

  const present = [];
  for (const col of COLUMNS_TO_DROP) {
    if (await columnExists('users', col)) present.push(col);
  }

  if (!present.length) {
    console.log('ℹ️ None of the target columns exist on users — already dropped.');
    process.exit(0);
  }

  console.log(`Dropping ${present.length} column(s): ${present.join(', ')}`);
  const dropClauses = present.map((c) => `DROP COLUMN \`${c}\``).join(', ');
  await pool.query(`ALTER TABLE users ${dropClauses}`);
  console.log('✅ Dropped. users now holds only general account fields.');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});
