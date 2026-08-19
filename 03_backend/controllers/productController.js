const pool = require('../config/database');
const { scoreListing } = require('../services/antiFraudService');
const { sendServerError } = require('../utils/errorHandler');
const { normalizePage, normalizeLimit, computeOffset, computeTotalPages } = require('../services/paginationService');
const { assembleSpecs, assembleSpecsBatch, upsertSpecs, CATEGORY_SPEC_CONFIG } = require('../services/specTables');

const LISTING_CATEGORY_SLUGS = [
  'cpu',
  'gpu',
  'motherboard',
  'ram',
  'psu',
  'storage',
  'monitor',
];

// Spec-table columns exposed as advanced marketplace filters on products.html, mirroring
// builder.html's CATEGORY_FILTERS (04_frontend/js/builder.js) minus 'brand' (already
// covered by products.html's own Brand filter). Column/table names used to build SQL
// below are ALWAYS taken from this whitelist or from CATEGORY_SPEC_CONFIG — never from a
// raw request query key — so a `spec_<col>` param can only ever match a known-safe column.
const FILTERABLE_SPEC_COLUMNS = {
  cpu: ['socket', 'generation', 'series'],
  motherboard: ['socket', 'chipset', 'generation', 'form_factor', 'ram_type'],
  ram: ['type', 'speed', 'capacity_gb'],
  gpu: ['chip', 'series'],
  psu: ['modularity', 'efficiency'],
  storage: ['interface', 'capacity_gb'],
};

const CONDITIONS = ['new', 'used_90', 'used_80', 'used_70'];
const STATUSES = ['active', 'sold', 'paused'];
const WARRANTY_TYPES = ['no_warranty', 'seller_warranty', 'manufacturer_warranty', 'lifetime'];
// 'lifetime' has no real end date, but total_warranty_days/remaining_warranty_months
// must stay numeric so range queries ("warranty remaining >= X days") keep working
// without special-casing 'lifetime' everywhere — 99 years is a documented sentinel
// for "effectively forever", not a real editable value.
const LIFETIME_WARRANTY_YEARS = 99;

function computeRemainingWarrantyMonths(years, months, days) {
  const totalDays = (Number(years) || 0) * 365 + (Number(months) || 0) * 30 + (Number(days) || 0);
  return Math.round(totalDays / 30);
}

function normalizeWarrantyFields({ warranty_type, warranty_years, warranty_months, warranty_days }) {
  const type = WARRANTY_TYPES.includes(warranty_type) ? warranty_type : 'no_warranty';
  if (type === 'no_warranty') {
    return { warrantyType: type, years: 0, months: 0, days: 0 };
  }
  if (type === 'lifetime') {
    return { warrantyType: type, years: LIFETIME_WARRANTY_YEARS, months: 0, days: 0 };
  }
  const years = Math.max(0, Number.isFinite(Number(warranty_years)) ? Math.trunc(Number(warranty_years)) : 0);
  const months = Math.max(0, Number.isFinite(Number(warranty_months)) ? Math.trunc(Number(warranty_months)) : 0);
  const days = Math.max(0, Number.isFinite(Number(warranty_days)) ? Math.trunc(Number(warranty_days)) : 0);
  return { warrantyType: type, years, months, days };
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizePhotos(photos) {
  if (!Array.isArray(photos)) return [];
  return photos
    .map((photo) => String(photo || '').trim())
    .filter(Boolean)
    .slice(0, 10);
}

const PRODUCT_JOINS = `
    FROM products p
    JOIN categories c ON p.category_id = c.id
    JOIN users u ON p.seller_id = u.id
    LEFT JOIN seller_profiles sp ON sp.user_id = u.id
`;

function productSelect(whereClause = '') {
  return `
    SELECT
      p.*,
      c.name as category_name,
      c.slug as category_slug,
      p.brand,
      p.model,
      CONCAT(p.brand, ' ', p.model) as part_name,
      p.original_price as reference_price,
      u.username as seller_name,
      sp.shop_name,
      sp.contact_phone as seller_phone,
      sp.bank_name as seller_bank_name,
      sp.bank_account_number as seller_bank_account,
      sp.bank_account_name as seller_bank_account_name,
      sp.shop_avatar_url as seller_avatar_url,
      sp.is_verified as is_seller_verified,
      sp.has_badge as has_seller_badge,
      sp.rating as seller_rating,
      sp.sales_count,
      u.created_at as seller_created_at
    ${PRODUCT_JOINS}
    ${whereClause}
  `;
}

function productCountQuery(whereClause = '') {
  return `SELECT COUNT(*) as total ${PRODUCT_JOINS} ${whereClause}`;
}

exports.attachPhotos = attachPhotos;

async function attachPhotos(product) {
  const photos = await pool.query(
    'SELECT image_url FROM product_photos WHERE product_id = ? ORDER BY display_order ASC, id ASC',
    [product.id]
  );
  return {
    ...product,
    photos: (photos.rows || []).map((row) => row.image_url),
    suspicious_reasons: parseJson(product.suspicious_reasons, [])
  };
}

async function getCategoryBySlug(slug) {
  const result = await pool.query('SELECT * FROM categories WHERE slug = ?', [slug]);
  return result.rows?.[0];
}

// Anti-fraud reference price comes from OTHER already-listed, active, approved
// products of the exact same brand+model — never the seller's own self-reported
// `original_price` (that field is fully seller-controlled; using it as the fraud
// reference made the price-floor check trivially bypassable by simply choosing a
// self-consistent pair of numbers, confirmed by a live exploit test). Skips the
// floor check entirely when this is the first-ever listing of that brand+model
// (no independent ground truth to compare against), same as before.
async function getCrossListingReferencePrice(brand, model, excludeProductId) {
  if (!brand || !model) return null;
  const params = [brand, model];
  let excludeClause = '';
  if (excludeProductId) {
    excludeClause = 'AND id != ?';
    params.push(excludeProductId);
  }
  const result = await pool.query(
    `SELECT AVG(price) AS avg_price FROM products
     WHERE brand = ? AND model = ? AND status = 'active' AND review_status = 'approved' ${excludeClause}`,
    params
  );
  const avgPrice = result.rows?.[0]?.avg_price;
  return avgPrice !== null && avgPrice !== undefined ? Number(avgPrice) : null;
}

async function evaluateSuspicion({ condition, price, serialNumber, brand, model, excludeProductId }) {
  let hasDuplicateSerial = false;
  if (serialNumber) {
    const duplicate = await pool.query(
      `SELECT id FROM products
       WHERE serial_number = ? AND status != 'sold'
       LIMIT 1`,
      [serialNumber]
    );
    hasDuplicateSerial = !!duplicate.rows?.length;
  }
  const catalogPrice = await getCrossListingReferencePrice(brand, model, excludeProductId);

  return scoreListing({ catalogPrice, condition, price, hasDuplicateSerial });
}

exports.getListingMetadata = async (req, res) => {
  try {
    const categories = await pool.query(
      `SELECT * FROM categories
       WHERE slug IN (${LISTING_CATEGORY_SLUGS.map(() => '?').join(',')})
       ORDER BY display_order ASC`,
      LISTING_CATEGORY_SLUGS
    );
    
    // Master lookups
    const sockets = await pool.query('SELECT id, name, brand FROM sockets ORDER BY brand, name');
    const chipsets = await pool.query('SELECT id, socket_id, name FROM chipsets ORDER BY name');
    const cpuGenerations = await pool.query('SELECT id, name, brand, socket_id FROM cpu_generations ORDER BY brand, id');
    const cpuModels = await pool.query('SELECT id, generation_id, name FROM cpu_models ORDER BY name');
    const cpuSeries = await pool.query('SELECT id, name FROM cpu_series ORDER BY name');
    const vgaSeries = await pool.query('SELECT id, name FROM vga_series ORDER BY id');
    const gpuChips = await pool.query('SELECT id, series_id, name FROM gpu_chips ORDER BY name');
    const formFactors = await pool.query('SELECT id, name, size_level FROM form_factors ORDER BY size_level DESC');
    const ramTypes = await pool.query('SELECT id, name FROM ram_types ORDER BY name');
    const brands = await pool.query('SELECT id, name FROM brands ORDER BY name');
    const psuModular = await pool.query('SELECT id, name FROM psu_modular ORDER BY id');
    const psuEfficiency = await pool.query('SELECT id, name FROM psu_efficiency ORDER BY id');
    const chipsetGenerations = await pool.query('SELECT chipset_id, generation_id FROM chipset_generations');

    // Existing products for model suggestions / reference
    const productsRes = await pool.query(
      `SELECT p.id, p.brand, p.model, p.category_id, c.slug as category_slug, c.name as category_name
       FROM products p JOIN categories c ON p.category_id = c.id
       WHERE p.status = 'active'
       ORDER BY p.brand ASC, p.model ASC`
    );

    res.json({
      categories: categories.rows || [],
      sockets: sockets.rows || [],
      chipsets: chipsets.rows || [],
      cpu_generations: cpuGenerations.rows || [],
      cpu_models: cpuModels.rows || [],
      cpu_series: cpuSeries.rows || [],
      vga_series: vgaSeries.rows || [],
      gpu_chips: gpuChips.rows || [],
      form_factors: formFactors.rows || [],
      ram_types: ramTypes.rows || [],
      psu_modular: psuModular.rows || [],
      psu_efficiency: psuEfficiency.rows || [],
      chipset_generations: chipsetGenerations.rows || [],
      brands: (brands.rows || []).map(b => b.name),
      parts: productsRes.rows || [],
      conditions: CONDITIONS,
      statuses: STATUSES,
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const { category, search, min_price, max_price, condition, has_warranty, brand, sort, status = 'active', include_review } = req.query;
    const where = ['p.status = ?'];
    const params = [STATUSES.includes(status) ? status : 'active'];

    if (include_review !== 'true') {
      where.push("p.review_status = 'approved'");
    }

    if (category) {
      where.push('c.slug = ?');
      params.push(category);
    }

    if (search) {
      where.push('(p.brand LIKE ? OR p.model LIKE ? OR p.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (min_price && !isNaN(parseFloat(min_price))) {
      where.push('p.price >= ?');
      params.push(parseFloat(min_price));
    }

    if (max_price && !isNaN(parseFloat(max_price))) {
      where.push('p.price <= ?');
      params.push(parseFloat(max_price));
    }

    if (condition && CONDITIONS.includes(condition)) {
      where.push('p.condition = ?');
      params.push(condition);
    }

    if (has_warranty === 'true') {
      where.push('p.remaining_warranty_months > 0');
    }

    if (brand) {
      where.push('p.brand = ?');
      params.push(brand);
    }

    // Advanced spec-based filters (Socket, RAM Type, Chipset, VRAM, ...). Only active
    // when `category` narrows to a single known spec table; only whitelisted column
    // names from FILTERABLE_SPEC_COLUMNS are ever used to build SQL, never the raw
    // `spec_<key>` request key itself — an unrecognized key is silently ignored.
    if (category && FILTERABLE_SPEC_COLUMNS[category]) {
      const specConfig = CATEGORY_SPEC_CONFIG[category];
      const specConditions = [];
      const specParams = [];
      for (const col of FILTERABLE_SPEC_COLUMNS[category]) {
        const value = req.query[`spec_${col}`];
        if (value !== undefined && value !== '') {
          specConditions.push(`\`${col}\` = ?`);
          specParams.push(value);
        }
      }
      if (specConditions.length && specConfig) {
        where.push(`p.id IN (SELECT product_id FROM ${specConfig.table} WHERE ${specConditions.join(' AND ')})`);
        params.push(...specParams);
      }
    }

    let orderBy = 'ORDER BY p.created_at DESC';
    if (sort === 'price_asc') {
      orderBy = 'ORDER BY p.price ASC, p.created_at DESC';
    } else if (sort === 'price_desc') {
      orderBy = 'ORDER BY p.price DESC, p.created_at DESC';
    } else if (sort === 'warranty_desc') {
      orderBy = 'ORDER BY p.remaining_warranty_months DESC, p.created_at DESC';
    } else if (sort === 'created_desc') {
      orderBy = 'ORDER BY p.created_at DESC';
    }

    const page = normalizePage(req.query.page);
    const limit = normalizeLimit(req.query.limit);
    const offset = computeOffset(page, limit);
    const whereClause = `WHERE ${where.join(' AND ')}`;

    const countResult = await pool.query(productCountQuery(whereClause), params);
    const total = Number(countResult.rows[0].total);

    const result = await pool.query(
      `${productSelect(whereClause)} ${orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const products = await Promise.all((result.rows || []).map(attachPhotos));

    // Batch enrich with specs, grouped by each product's OWN category — a single
    // `?category=` filter narrows every row to one category already, but the
    // unfiltered "browse everything" case (the default, most common request) mixes
    // categories in one result set, so specs must be assembled per category group
    // rather than assumed to be one category for the whole page (same pattern
    // getListingMetadata/getAvailableParts already use correctly).
    const productIdsByCategory = {};
    for (const p of products) {
      (productIdsByCategory[p.category_slug] ||= []).push(p.id);
    }
    const specsMap = {};
    for (const [categorySlug, ids] of Object.entries(productIdsByCategory)) {
      Object.assign(specsMap, await assembleSpecsBatch(pool, categorySlug, ids));
    }

    const enriched = products.map(p => ({
      ...p,
      specs: specsMap[p.id] || null
    }));

    res.json({
      data: enriched,
      total,
      page,
      totalPages: computeTotalPages(total, limit)
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// Distinct, real values for each advanced spec filter (FILTERABLE_SPEC_COLUMNS), sourced
// only from currently active+approved listings — mirrors builder.html's CATEGORY_FILTERS
// behavior of only ever showing options that actually have live listings, rather than the
// full master lookup tables (which would include dead-end options with zero results).
exports.getSpecFilterOptions = async (req, res) => {
  try {
    const result = {};
    for (const [slug, columns] of Object.entries(FILTERABLE_SPEC_COLUMNS)) {
      const specConfig = CATEGORY_SPEC_CONFIG[slug];
      if (!specConfig) continue;

      const selectCols = columns.map(c => `s.\`${c}\` AS \`${c}\``).join(', ');
      const rows = await pool.query(
        `SELECT ${selectCols}
         FROM ${specConfig.table} s
         JOIN products p ON p.id = s.product_id
         JOIN categories c ON c.id = p.category_id
         WHERE c.slug = ? AND p.status = 'active' AND p.review_status = 'approved'`,
        [slug]
      );

      const valuesByColumn = {};
      for (const col of columns) valuesByColumn[col] = new Set();
      for (const row of rows.rows || []) {
        for (const col of columns) {
          const v = row[col];
          if (v !== null && v !== undefined && v !== '') valuesByColumn[col].add(v);
        }
      }

      result[slug] = {};
      for (const col of columns) {
        result[slug][col] = Array.from(valuesByColumn[col]).sort((a, b) =>
          String(a).localeCompare(String(b), 'th', { numeric: true })
        );
      }
    }
    res.json(result);
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(productSelect('WHERE p.id = ?'), [id]);
    if (!result.rows?.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = result.rows[0];
    const isOwner = req.userId && req.userId === product.seller_id;
    if (product.review_status !== 'approved' && !isOwner) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const withPhotos = await attachPhotos(product);
    const specs = await assembleSpecs(pool, product.category_slug, product.id);

    res.json({
      ...withPhotos,
      specs
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.createProduct = async (req, res) => {
  try {
    const {
      category,
      brand,
      model,
      specs = {},
      condition = 'used_90',
      warranty_type = 'no_warranty',
      warranty_years = 0,
      warranty_months = 0,
      warranty_days = 0,
      original_price,
      price,
      stock_quantity = 1,
      sku: customSku,
      photos,
      serial_number,
      description = '',
      status = 'active',
      allow_hand_pickup = 1,
      allow_express = 1,
      pickup_location = '',
      proof_image_url = '',
      sn_image_url = ''
    } = req.body;

    if (!category || !brand || !model || price === undefined) {
      return res.status(400).json({ error: 'กรุณากรอกหมวดหมู่, ยี่ห้อ, รุ่นอุปกรณ์ และราคาให้ครบถ้วน' });
    }
    if (!LISTING_CATEGORY_SLUGS.includes(category)) {
      return res.status(400).json({ error: 'หมวดหมู่สินค้าไม่ถูกต้อง' });
    }
    if (!CONDITIONS.includes(condition)) {
      return res.status(400).json({ error: 'สภาพสินค้าไม่ถูกต้อง' });
    }

    const priceNumber = Number(price);
    const stockNumber = Number(stock_quantity);
    const photoUrls = normalizePhotos(photos);

    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      return res.status(400).json({ error: 'ราคาต้องมากกว่า 0 บาท' });
    }
    if (!Number.isInteger(stockNumber) || stockNumber < 1) {
      return res.status(400).json({ error: 'จำนวนสต็อกต้องอย่างน้อย 1 ชิ้น' });
    }

    let originalPriceNumber = null;
    if (original_price !== undefined && original_price !== null && original_price !== '') {
      originalPriceNumber = Number(original_price);
      if (!Number.isFinite(originalPriceNumber) || originalPriceNumber <= 0) {
        return res.status(400).json({ error: 'ราคาป้ายเดิมต้องเป็นตัวเลขมากกว่า 0 บาท' });
      }
    }

    const warranty = normalizeWarrantyFields({ warranty_type, warranty_years, warranty_months, warranty_days });
    const warrantyNumber = computeRemainingWarrantyMonths(warranty.years, warranty.months, warranty.days);

    const serialNumber = serial_number ? String(serial_number).trim() : null;
    if (serialNumber) {
      const dupCheck = await pool.query(
        `SELECT id FROM products WHERE serial_number = ? AND status = 'active' LIMIT 1`,
        [serialNumber]
      );
      if (dupCheck.rows && dupCheck.rows.length > 0) {
        return res.status(400).json({ error: `Serial Number "${serialNumber}" นี้มีประกาศวางขายอยู่ในระบบแล้ว ไม่สามารถลงซ้ำได้` });
      }
    }

    const categoryRow = await getCategoryBySlug(category);
    if (!categoryRow) return res.status(400).json({ error: 'ไม่พบหมวดหมู่สินค้านี้ในระบบ' });

    const suspicion = await evaluateSuspicion({
      condition,
      price: priceNumber,
      serialNumber,
      brand: String(brand).trim(),
      model: String(model).trim(),
    });
    const reviewStatus = suspicion.score >= 80 ? 'pending_review' : 'approved';

    const result = await pool.query(
      `INSERT INTO products (
        seller_id, category_id, brand, model, \`condition\`, remaining_warranty_months, price,
        warranty_type, warranty_years, warranty_months, warranty_days, original_price,
        sku, stock_quantity, serial_number, description, status, review_status,
        suspicious_score, suspicious_reasons,
        proof_image_url, sn_image_url,
        allow_hand_pickup, allow_cod, allow_express, pickup_location
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        categoryRow.id,
        String(brand).trim(),
        String(model).trim(),
        condition,
        warrantyNumber,
        priceNumber,
        warranty.warrantyType,
        warranty.years,
        warranty.months,
        warranty.days,
        originalPriceNumber,
        customSku ? String(customSku).trim() : null,
        stockNumber,
        serialNumber,
        description || null,
        status,
        reviewStatus,
        suspicion.score,
        JSON.stringify(suspicion.reasons),
        proof_image_url || null,
        sn_image_url || null,
        allow_hand_pickup ? 1 : 0,
        0,
        allow_express ? 1 : 0,
        pickup_location || null
      ]
    );

    const productId = result.insertId;

    if (!customSku) {
      const generatedSku = `SKU-${category.toUpperCase()}-${String(productId).padStart(6, '0')}`;
      await pool.query('UPDATE products SET sku = ? WHERE id = ?', [generatedSku, productId]);
    }

    // Save spec to spec_* table
    if (specs && typeof specs === 'object') {
      try {
        await upsertSpecs(pool, category, productId, specs);
      } catch (specErr) {
        console.warn(`Warning: Could not upsert spec for product ${productId}:`, specErr.message);
      }
    }

    for (let i = 0; i < photoUrls.length; i++) {
      await pool.query(
        'INSERT INTO product_photos (product_id, image_url, display_order) VALUES (?, ?, ?)',
        [productId, photoUrls[i], i]
      );
    }

    for (const reason of suspicion.reasons) {
      await pool.query(
        'INSERT INTO product_review_flags (product_id, reason, severity) VALUES (?, ?, ?)',
        [productId, reason, suspicion.score >= 90 ? 'high' : 'medium']
      );
    }

    res.status(201).json({
      message: reviewStatus === 'pending_review'
        ? 'ประกาศถูกส่งให้ผู้ดูแลระบบตรวจสอบความปลอดภัยเรียบร้อยแล้ว'
        : 'ลงประกาศขายสินค้าสำเร็จ!',
      product: {
        id: productId,
        brand,
        model,
        review_status: reviewStatus,
        suspicious_score: suspicion.score,
        suspicious_reasons: suspicion.reasons,
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing.rows?.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const current = existing.rows[0];
    if (req.userRole !== 'admin' && current.seller_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized to update this product' });
    }

    const {
      brand = current.brand,
      model = current.model,
      condition = current.condition,
      price = current.price,
      original_price = current.original_price,
      stock_quantity = current.stock_quantity,
      serial_number = current.serial_number,
      description = current.description,
      status = current.status,
      allow_hand_pickup = current.allow_hand_pickup,
      allow_express = current.allow_express,
      pickup_location = current.pickup_location,
      specs,
      photos
    } = req.body;

    await pool.query(
      `UPDATE products SET
        brand = ?, model = ?, \`condition\` = ?, price = ?, original_price = ?,
        stock_quantity = ?, serial_number = ?, description = ?, status = ?,
        allow_hand_pickup = ?, allow_express = ?, pickup_location = ?
       WHERE id = ?`,
      [
        brand, model, condition, price, original_price,
        stock_quantity, serial_number, description, status,
        allow_hand_pickup, allow_express, pickup_location, id
      ]
    );

    if (specs && typeof specs === 'object') {
      const cat = await pool.query('SELECT slug FROM categories WHERE id = ?', [current.category_id]);
      if (cat.rows?.length) {
        await upsertSpecs(pool, cat.rows[0].slug, id, specs);
      }
    }

    if (Array.isArray(photos)) {
      const photoUrls = normalizePhotos(photos);
      await pool.query('DELETE FROM product_photos WHERE product_id = ?', [id]);
      for (let i = 0; i < photoUrls.length; i++) {
        await pool.query(
          'INSERT INTO product_photos (product_id, image_url, display_order) VALUES (?, ?, ?)',
          [id, photoUrls[i], i]
        );
      }
    }

    res.json({ message: 'แก้ไขข้อมูลสินค้าสำเร็จ' });
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing.rows?.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const current = existing.rows[0];
    if (req.userRole !== 'admin' && current.seller_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this product' });
    }

    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    res.json({ message: 'ลบประกาศสินค้าเรียบร้อยแล้ว' });
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.getMyProducts = async (req, res) => {
  try {
    const result = await pool.query(
      `${productSelect('WHERE p.seller_id = ?')} ORDER BY p.created_at DESC`,
      [req.userId]
    );
    const products = await Promise.all((result.rows || []).map(attachPhotos));
    res.json(products);
  } catch (error) {
    sendServerError(res, error);
  }
};
