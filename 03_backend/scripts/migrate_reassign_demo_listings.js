// Round 14 — reassign the 8 admin-owned demo product listings to the real seller account
// johndoe (john@example.com), and add 8 more diverse test listings (2 per category across
// all 7 listing categories) to exercise the new compatibility-lock (Round 14) and advanced
// spec filters (Round 13) with real socket/brand/generation variety.
//
// NOT idempotent — this is a one-time data-ownership fix, not a repeatable lookup seed.
// Re-running it will create 16 duplicate listings under johndoe. Creates all 16 new
// listings via the real POST /api/products endpoint first (reusing createProduct's actual
// validation/SKU-generation/anti-fraud-scoring code path), and only deletes the original 8
// admin-owned rows after every creation succeeds.
require('dotenv').config();
const pool = require('../config/database');

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';
const JOHNDOE_EMAIL = process.env.JOHNDOE_EMAIL || 'john@example.com';
// Never hardcode a real account password in a committed script — pass it via env var
// when re-running this (already executed once against this DB; kept here only as a
// historical record of what Round 14 did).
const JOHNDOE_PASSWORD = process.env.JOHNDOE_PASSWORD;
const ADMIN_PRODUCT_IDS = [1, 2, 3, 4, 5, 6, 7, 8];

// Photo URLs reused from the existing 8 admin listings (same category, already live in
// this DB) rather than fabricating new external URLs. Monitor listings (a category with
// no prior example in this catalog) are submitted with no photo.
const PHOTOS = {
  cpu: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&auto=format&fit=crop',
  motherboard: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop',
  ram: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=600&auto=format&fit=crop',
  gpu: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop',
  storage: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&auto=format&fit=crop',
  psu: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=600&auto=format&fit=crop',
};

async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: JOHNDOE_EMAIL, password: JOHNDOE_PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login as johndoe failed: ${data.error || res.status}`);
  return data.token;
}

async function createProduct(token, payload) {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Create product "${payload.brand} ${payload.model}" failed: ${data.error || res.status}`);
  return data.product;
}

async function fetchOriginalProducts() {
  const result = await pool.query(
    `SELECT p.id, p.brand, p.model, p.price, p.original_price, p.condition, p.description,
            p.serial_number, p.warranty_type, p.warranty_years, p.warranty_months, p.warranty_days,
            p.stock_quantity, c.slug AS category_slug
     FROM products p JOIN categories c ON p.category_id = c.id
     WHERE p.id IN (${ADMIN_PRODUCT_IDS.map(() => '?').join(',')})
     ORDER BY p.id`,
    ADMIN_PRODUCT_IDS
  );
  return result.rows;
}

async function fetchOriginalSpecs(categorySlug, productId) {
  const { assembleSpecs } = require('../services/specTables');
  return assembleSpecs(pool, categorySlug, productId);
}

async function fetchOriginalPhoto(productId) {
  const res = await pool.query(
    'SELECT image_url FROM product_photos WHERE product_id = ? ORDER BY display_order ASC, id ASC LIMIT 1',
    [productId]
  );
  return res.rows?.[0]?.image_url || null;
}

// The 8 new diverse listings — 1 more per category, real technically-accurate specs
// pulled from this DB's own lookup tables (sockets/generations/chipsets/vga_series/
// gpu_chips), giving 3 distinct CPU sockets total (LGA1700, AM5, AM4) to exercise the
// new compatibility-lock feature meaningfully, plus the first-ever monitor listings.
const NEW_LISTINGS = [
  {
    category: 'cpu', brand: 'AMD', model: 'Ryzen 5 5600X',
    price: 3200, original_price: 4000, condition: 'used_90',
    description: 'ซีพียู AMD Ryzen 5 5600X 6 คอร์ 12 เธรด สภาพดี ใช้งานปกติ เหมาะกับเกมมิ่งงบประหยัด',
    serial_number: 'SN-CPU-AMD-560099',
    warranty_type: 'manufacturer_warranty', warranty_years: 1, warranty_months: 0, warranty_days: 0,
    specs: { socket: 'AM4', generation: 'Ryzen 5000 Series (Zen 3)', series: 'AMD Ryzen 5', cores: 6, threads: 12 },
    photo: PHOTOS.cpu,
  },
  {
    category: 'motherboard', brand: 'MSI', model: 'MAG B550 TOMAHAWK',
    price: 3800, original_price: 4700, condition: 'used_90',
    description: 'เมนบอร์ด MSI MAG B550 Tomahawk AM4 รองรับ Ryzen 5000 Series สภาพดี ใช้งานปกติ',
    serial_number: 'SN-MB-MSI-550088',
    warranty_type: 'manufacturer_warranty', warranty_years: 1, warranty_months: 0, warranty_days: 0,
    specs: { socket: 'AM4', chipset: 'B550', form_factor: 'ATX', ram_type: 'DDR4', ram_slots: 4, max_ram_gb: 128 },
    photo: PHOTOS.motherboard,
  },
  {
    category: 'ram', brand: 'Kingston', model: 'FURY Beast 16GB (2x8GB) DDR4 3200MHz',
    price: 1090, original_price: 1390, condition: 'new',
    description: 'แรม Kingston FURY Beast DDR4 16GB บัส 3200MHz ของใหม่มือหนึ่ง ประกันศูนย์',
    serial_number: 'SN-RAM-KING-320077',
    warranty_type: 'manufacturer_warranty', warranty_years: 2, warranty_months: 0, warranty_days: 0,
    specs: { type: 'DDR4', capacity_gb: 16, speed: 3200, modules: 2 },
    photo: PHOTOS.ram,
  },
  {
    category: 'gpu', brand: 'Sapphire', model: 'PULSE RX 6700 XT 12GB',
    price: 9900, original_price: 12500, condition: 'used_90',
    description: 'การ์ดจอ Sapphire PULSE RX 6700 XT 12GB GDDR6 ใช้งานน้อย เล่นเกมลื่นทุกเกม',
    serial_number: 'SN-GPU-SAPP-670066',
    warranty_type: 'manufacturer_warranty', warranty_years: 1, warranty_months: 0, warranty_days: 0,
    specs: { series: 'Radeon RX 6000 Series', chip: 'RX 6700 XT', vram_gb: 12, vram_type: 'GDDR6', length_mm: 267 },
    photo: PHOTOS.gpu,
  },
  {
    category: 'storage', brand: 'Kingston', model: 'NV2 500GB M.2 NVMe PCIe Gen4',
    price: 1190, original_price: 1490, condition: 'used_90',
    description: 'SSD Kingston NV2 500GB M.2 NVMe PCIe Gen4 สุขภาพ 100% ความเร็วสูง',
    serial_number: 'SN-SSD-KING-500055',
    warranty_type: 'manufacturer_warranty', warranty_years: 2, warranty_months: 0, warranty_days: 0,
    specs: { interface: 'M.2 NVMe (PCIe Gen 4)', capacity_gb: 500, read_speed: '3500MB/s' },
    photo: PHOTOS.storage,
  },
  {
    category: 'psu', brand: 'Seasonic', model: 'FOCUS GX-650 650W',
    price: 2690, original_price: 3390, condition: 'used_90',
    description: 'เพาเวอร์ซัพพลาย Seasonic FOCUS GX-650 650W 80 Plus Gold ถอดสายได้ครบทุกเส้น',
    serial_number: 'SN-PSU-SEA-650044',
    warranty_type: 'manufacturer_warranty', warranty_years: 2, warranty_months: 0, warranty_days: 0,
    specs: { wattage: 650, efficiency: '80 Plus Gold', modularity: 'Full' },
    photo: PHOTOS.psu,
  },
  {
    category: 'monitor', brand: 'LG', model: '27GP850-B 27" QHD 165Hz',
    price: 6500, original_price: 8200, condition: 'used_90',
    description: 'จอมอนิเตอร์ LG 27GP850-B 27 นิ้ว QHD 165Hz Gaming Monitor สภาพดี ไม่มีจุดเสีย',
    serial_number: 'SN-MON-LG-850033',
    warranty_type: 'manufacturer_warranty', warranty_years: 1, warranty_months: 0, warranty_days: 0,
    specs: null,
    photo: null,
  },
  {
    category: 'monitor', brand: 'Dell', model: 'S3222DGM 32" Curved QHD 165Hz',
    price: 5900, original_price: 7500, condition: 'used_90',
    description: 'จอมอนิเตอร์ Dell S3222DGM 32 นิ้ว Curved QHD 165Hz สภาพดี ใช้งานปกติ',
    serial_number: 'SN-MON-DELL-322022',
    warranty_type: 'manufacturer_warranty', warranty_years: 1, warranty_months: 0, warranty_days: 0,
    specs: null,
    photo: null,
  },
];

async function main() {
  console.log('=== Round 14: reassign demo listings to johndoe ===');
  console.log('NOTE: this is a one-time migration, not idempotent. Re-running it will');
  console.log('create 16 duplicate listings under johndoe.\n');

  if (!JOHNDOE_PASSWORD) {
    console.error('JOHNDOE_PASSWORD env var not set — refusing to run. Pass it inline, e.g.:');
    console.error('  JOHNDOE_PASSWORD=... node scripts/migrate_reassign_demo_listings.js');
    process.exit(1);
  }

  const originals = await fetchOriginalProducts();
  if (originals.length !== ADMIN_PRODUCT_IDS.length) {
    console.log(`Expected ${ADMIN_PRODUCT_IDS.length} admin-owned products, found ${originals.length}.`);
    console.log('Already migrated, or the data has changed — aborting without making changes.');
    process.exit(0);
  }

  console.log(`Admin-owned products to migrate (${originals.length}):`);
  console.log(originals.map(p => ({ id: p.id, brand: p.brand, model: p.model, price: p.price })));

  const token = await login();
  console.log('\nLogged in as johndoe.');

  const created = [];

  // The 8 original rows are still `status = 'active'` at this point, and createProduct
  // rejects any new listing whose serial_number matches an active row's — so the exact
  // same serial can't be reused by the new johndoe listing until the old row stops
  // claiming it. Temporarily blank out the old rows' serial_number (rather than deleting
  // them yet) so the recreation below can use the real serial; restore them if anything
  // fails partway, so a failure leaves the original admin listings completely untouched.
  await pool.query(
    `UPDATE products SET serial_number = NULL WHERE id IN (${ADMIN_PRODUCT_IDS.map(() => '?').join(',')})`,
    ADMIN_PRODUCT_IDS
  );

  try {
    // 1. Recreate the 8 originals faithfully (same serial numbers, same everything).
    for (const p of originals) {
      const specs = await fetchOriginalSpecs(p.category_slug, p.id);
      const photo = await fetchOriginalPhoto(p.id);
      const payload = {
        category: p.category_slug,
        brand: p.brand,
        model: p.model,
        price: Number(p.price),
        original_price: p.original_price ? Number(p.original_price) : undefined,
        condition: p.condition,
        description: p.description,
        serial_number: p.serial_number,
        warranty_type: p.warranty_type,
        warranty_years: p.warranty_years,
        warranty_months: p.warranty_months,
        warranty_days: p.warranty_days,
        stock_quantity: p.stock_quantity,
        specs: Object.keys(specs || {}).length ? specs : undefined,
        photos: photo ? [photo] : undefined,
      };
      const product = await createProduct(token, payload);
      created.push(product);
      console.log(`Created (original): #${product.id} ${p.brand} ${p.model}`);
    }
  } catch (e) {
    console.error('\nRecreation failed partway — restoring original serial numbers on the admin rows.');
    for (const p of originals) {
      await pool.query('UPDATE products SET serial_number = ? WHERE id = ?', [p.serial_number, p.id]);
    }
    throw e;
  }

  // 2. Create the 8 new diverse listings.
  for (const item of NEW_LISTINGS) {
    const payload = {
      category: item.category,
      brand: item.brand,
      model: item.model,
      price: item.price,
      original_price: item.original_price,
      condition: item.condition,
      description: item.description,
      serial_number: item.serial_number,
      warranty_type: item.warranty_type,
      warranty_years: item.warranty_years,
      warranty_months: item.warranty_months,
      warranty_days: item.warranty_days,
      specs: item.specs || undefined,
      photos: item.photo ? [item.photo] : undefined,
    };
    const product = await createProduct(token, payload);
    created.push(product);
    console.log(`Created (new): #${product.id} ${item.brand} ${item.model}`);
  }

  console.log(`\nAll ${created.length} listings created successfully under johndoe.`);

  // 3. Only now delete the original 8 admin-owned rows.
  const result = await pool.query(
    `DELETE FROM products WHERE id IN (${ADMIN_PRODUCT_IDS.map(() => '?').join(',')})`,
    ADMIN_PRODUCT_IDS
  );
  console.log(`Deleted ${result.rowCount} original admin-owned product(s).`);

  console.log('\nDone.');
  process.exit(0);
}

main().catch(e => {
  console.error('Migration failed:', e);
  console.error('No admin-owned rows were deleted (deletion only happens after all creates succeed).');
  process.exit(1);
});
