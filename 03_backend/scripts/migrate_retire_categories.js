// Round 12 — retire the 'cpu-cooler', 'case', and 'accessories' categories entirely.
// Reports the real product listings living in these categories before deleting them
// (products.category_id is RESTRICT, not cascade, so products must go first), then
// deletes the 3 category rows. Idempotent: safe to re-run (reports/deletes 0 rows
// once already applied).
require('dotenv').config();
const pool = require('../config/database');

const RETIRING_SLUGS = ['cpu-cooler', 'case', 'accessories'];

async function main() {
  const categories = await pool.query(
    `SELECT id, slug FROM categories WHERE slug IN (?, ?, ?)`,
    RETIRING_SLUGS
  );

  if (!categories.rows.length) {
    console.log('No retiring categories found — already migrated. Nothing to do.');
    process.exit(0);
  }

  console.log('Categories to retire:', categories.rows);
  const categoryIds = categories.rows.map(c => c.id);

  const products = await pool.query(
    `SELECT p.id, p.brand, p.model, c.slug AS category_slug
     FROM products p
     JOIN categories c ON p.category_id = c.id
     WHERE p.category_id IN (${categoryIds.map(() => '?').join(',')})`,
    categoryIds
  );

  console.log(`\nProducts to delete (${products.rows.length}):`);
  console.log(products.rows);

  if (products.rows.length) {
    const productIds = products.rows.map(p => p.id);
    const result = await pool.query(
      `DELETE FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`,
      productIds
    );
    console.log(`Deleted ${result.rowCount} product(s).`);
  }

  const catResult = await pool.query(
    `DELETE FROM categories WHERE id IN (${categoryIds.map(() => '?').join(',')})`,
    categoryIds
  );
  console.log(`Deleted ${catResult.rowCount} categor(y/ies).`);

  console.log('\nDone.');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
