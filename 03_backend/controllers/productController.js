const pool = require('../config/database');
const { scoreListing } = require('../services/antiFraudService');
const { sendServerError } = require('../utils/errorHandler');
const { normalizePage, normalizeLimit, computeOffset, computeTotalPages } = require('../services/paginationService');

const LISTING_CATEGORY_SLUGS = [
  'cpu',
  'gpu',
  'motherboard',
  'ram',
  'psu',
  'case',
  'storage',
  'monitor',
  'full-pc',
  'accessories',
];

const CONDITIONS = ['new', 'used_90', 'used_80', 'used_70'];
const STATUSES = ['active', 'sold', 'paused'];

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
    LEFT JOIN parts ON p.part_id = parts.id
`;

function productSelect(whereClause = '') {
  return `
    SELECT
      p.*,
      c.name as category_name,
      c.slug as category_slug,
      parts.name as part_name,
      parts.brand,
      parts.model,
      parts.price as reference_price,
      u.username as seller_name,
      u.shop_name,
      u.seller_phone,
      u.seller_bank_name,
      u.seller_bank_account,
      u.seller_bank_account_name,
      u.seller_avatar_url,
      u.is_seller_verified,
      u.has_seller_badge,
      u.seller_rating,
      u.sales_count,
      u.created_at as seller_created_at
    ${PRODUCT_JOINS}
    ${whereClause}
  `;
}

function productCountQuery(whereClause = '') {
  return `SELECT COUNT(*) as total ${PRODUCT_JOINS} ${whereClause}`;
}

async function attachPhotos(product) {
  const photos = await pool.query(
    'SELECT image_url FROM product_photos WHERE product_id = ? ORDER BY display_order ASC, id ASC',
    [product.id]
  );
  return {
    ...product,
    photos: (photos.rows || []).map((row) => row.image_url),
    suspicious_reasons: parseJson(product.suspicious_reasons, []),
    prebuilt_specs: parseJson(product.prebuilt_specs, null),
    prebuilt_components: parseJson(product.prebuilt_components, [])
  };
}

async function getCategoryBySlug(slug) {
  const result = await pool.query('SELECT * FROM categories WHERE slug = ?', [slug]);
  return result.rows?.[0];
}

async function getPart(partId, categoryId) {
  const result = await pool.query(
    'SELECT * FROM parts WHERE id = ? AND category_id = ? AND is_active = 1',
    [partId, categoryId]
  );
  return result.rows?.[0];
}

async function evaluateSuspicion({ part, condition, price, serialNumber }) {
  const duplicate = await pool.query(
    `SELECT id FROM products
     WHERE serial_number = ? AND status != 'sold'
     LIMIT 1`,
    [serialNumber]
  );
  const hasDuplicateSerial = !!duplicate.rows?.length;

  return scoreListing({ catalogPrice: part?.price, condition, price, hasDuplicateSerial });
}

exports.getListingMetadata = async (req, res) => {
  try {
    const categories = await pool.query(
      `SELECT * FROM categories
       WHERE slug IN (${LISTING_CATEGORY_SLUGS.map(() => '?').join(',')})
       ORDER BY display_order ASC`,
      LISTING_CATEGORY_SLUGS
    );
    const parts = await pool.query(
      `SELECT p.id, p.name, p.brand, p.model, p.price, p.category_id, c.slug as category_slug, c.name as category_name
       FROM parts p JOIN categories c ON p.category_id = c.id
       WHERE c.slug IN (${LISTING_CATEGORY_SLUGS.map(() => '?').join(',')})
       AND p.is_active = 1
       ORDER BY c.display_order ASC, p.brand ASC, p.model ASC`,
      LISTING_CATEGORY_SLUGS
    );
    const brandsResult = await pool.query(
      `SELECT DISTINCT brand FROM parts WHERE brand IS NOT NULL AND brand != '' ORDER BY brand ASC`
    );

    res.json({
      categories: categories.rows || [],
      parts: parts.rows || [],
      brands: (brandsResult.rows || []).map((b) => b.brand),
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
      where.push('(parts.name LIKE ? OR parts.brand LIKE ? OR parts.model LIKE ? OR p.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
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
      where.push('parts.brand = ?');
      params.push(brand);
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

    res.json({
      data: products,
      total,
      page,
      totalPages: computeTotalPages(total, limit)
    });
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

    res.json(await attachPhotos(product));
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.createProduct = async (req, res) => {
  try {
    const {
      category,
      part_id,
      condition = 'used_90',
      remaining_warranty_months = 0,
      price,
      stock_quantity = 1,
      photos,
      serial_number,
      description = '',
      status = 'active',
      allow_hand_pickup = 1,
      allow_express = 1,
      pickup_location = '',
      proof_image_url = '',
      sn_image_url = '',
      is_prebuilt_set = 0,
      prebuilt_specs = null,
      prebuilt_components = []
    } = req.body;

    const isPrebuilt = is_prebuilt_set === 1 || is_prebuilt_set === '1' || category === 'full-pc';
    const targetCategory = isPrebuilt ? 'full-pc' : category;

    if (!targetCategory || (!isPrebuilt && !part_id) || price === undefined || !serial_number) {
      return res.status(400).json({ error: 'กรุณากรอกหมวดหมู่, รุ่นอุปกรณ์/คอมเซ็ต, ราคา และ Serial Number ให้ครบถ้วน' });
    }
    if (!LISTING_CATEGORY_SLUGS.includes(targetCategory)) {
      return res.status(400).json({ error: 'หมวดหมู่สินค้าไม่ถูกต้อง' });
    }
    if (!CONDITIONS.includes(condition)) {
      return res.status(400).json({ error: 'สภาพสินค้าไม่ถูกต้อง' });
    }

    const priceNumber = Number(price);
    const stockNumber = Number(stock_quantity);
    const warrantyNumber = Number(remaining_warranty_months);
    const photoUrls = normalizePhotos(photos);

    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      return res.status(400).json({ error: 'ราคาต้องมากกว่า 0 บาท' });
    }
    if (!Number.isInteger(stockNumber) || stockNumber < 1) {
      return res.status(400).json({ error: 'จำนวนสต็อกต้องอย่างน้อย 1 ชิ้น' });
    }

    // Check duplicate active serial number in database
    const serialNumber = String(serial_number).trim();
    const dupCheck = await pool.query(
      `SELECT id FROM products WHERE serial_number = ? AND status = 'active' LIMIT 1`,
      [serialNumber]
    );
    if (dupCheck.rows && dupCheck.rows.length > 0) {
      return res.status(400).json({ error: `Serial Number "${serialNumber}" นี้มีประกาศวางขายอยู่ในระบบแล้ว ไม่สามารถลงซ้ำได้` });
    }

    const categoryRow = await getCategoryBySlug(targetCategory);
    if (!categoryRow) return res.status(400).json({ error: 'ไม่พบหมวดหมู่สินค้านี้ในระบบ' });

    let part = null;
    if (!isPrebuilt && part_id) {
      part = await getPart(part_id, categoryRow.id);
      if (!part) {
        return res.status(400).json({ error: 'อุปกรณ์ที่เลือกไม่มีอยู่ในแคตตาล็อกของหมวดหมู่นี้' });
      }
    }

    const suspicion = await evaluateSuspicion({ part, condition, price: priceNumber, serialNumber });
    const reviewStatus = suspicion.score >= 80 ? 'pending_review' : 'approved';

    const result = await pool.query(
      `INSERT INTO products (
        seller_id, category_id, part_id, \`condition\`, remaining_warranty_months, price,
        stock_quantity, serial_number, description, status, review_status,
        suspicious_score, suspicious_reasons,
        proof_image_url, sn_image_url, is_prebuilt_set, prebuilt_specs, prebuilt_components,
        allow_hand_pickup, allow_cod, allow_express, pickup_location
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        categoryRow.id,
        part ? part.id : null,
        condition,
        warrantyNumber,
        priceNumber,
        stockNumber,
        serialNumber,
        description || null,
        status,
        reviewStatus,
        suspicion.score,
        JSON.stringify(suspicion.reasons),
        proof_image_url || null,
        sn_image_url || null,
        isPrebuilt ? 1 : 0,
        prebuilt_specs ? JSON.stringify(prebuilt_specs) : null,
        prebuilt_components ? JSON.stringify(prebuilt_components) : null,
        allow_hand_pickup ? 1 : 0,
        0, // allow_cod = 0 (Direct transfer / pickup only)
        allow_express ? 1 : 0,
        pickup_location || null
      ]
    );

    const productId = result.insertId;
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
    const current = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (!current.rows?.length) return res.status(404).json({ error: 'Product not found' });
    if (current.rows[0].seller_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to update this product' });
    }

    const {
      remaining_warranty_months,
      price,
      stock_quantity,
      photos,
      description,
      status,
    } = req.body;

    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid product status' });
    }

    // Partial-update endpoint (COALESCE below), so only validate fields that
    // were actually provided — mirrors productValidator's rules for creation
    // (price >= 0, stock_quantity >= 1) without requiring every field.
    if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
      return res.status(400).json({ error: 'ราคาสินค้าต้องเป็นตัวเลขและห้ามติดลบ' });
    }
    if (stock_quantity !== undefined && (!Number.isInteger(Number(stock_quantity)) || Number(stock_quantity) < 1)) {
      return res.status(400).json({ error: 'จำนวนสินค้าต้องเป็นจำนวนเต็มตั้งแต่ 1 ชิ้นขึ้นไป' });
    }

    await pool.query(
      `UPDATE products SET
        remaining_warranty_months = COALESCE(?, remaining_warranty_months),
        price = COALESCE(?, price),
        stock_quantity = COALESCE(?, stock_quantity),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [remaining_warranty_months, price, stock_quantity, description, status, id]
    );

    if (photos) {
      const photoUrls = normalizePhotos(photos);
      const condition = current.rows[0].condition;
      if (condition !== 'new' && photoUrls.length < 3) {
        return res.status(400).json({ error: 'Used listings require at least 3 photos' });
      }
      await pool.query('DELETE FROM product_photos WHERE product_id = ?', [id]);
      for (let i = 0; i < photoUrls.length; i++) {
        await pool.query(
          'INSERT INTO product_photos (product_id, image_url, display_order) VALUES (?, ?, ?)',
          [id, photoUrls[i], i]
        );
      }
    }

    res.json({ message: 'Product updated' });
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productCheck = await pool.query('SELECT seller_id FROM products WHERE id = ?', [id]);
    if (!productCheck.rows?.length) return res.status(404).json({ error: 'Product not found' });
    if (productCheck.rows[0].seller_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this product' });
    }

    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.getProductAvailability = async (req, res) => {
  try {
    const { partIds } = req.body;
    if (!partIds || !Array.isArray(partIds) || partIds.length === 0) {
      return res.status(400).json({ error: 'partIds array is required' });
    }

    const placeholders = partIds.map(() => '?').join(',');
    const query = `
      SELECT p.id as product_id, p.part_id, p.price, p.condition, u.username as seller_name
      FROM products p
      JOIN users u ON p.seller_id = u.id
      WHERE p.part_id IN (${placeholders})
        AND p.status = 'active'
        AND p.review_status = 'approved'
        AND p.stock_quantity > 0
    `;

    const result = await pool.query(query, partIds);
    const rows = result.rows || [];

    const availability = {};
    partIds.forEach(id => {
      availability[id] = { available: false };
    });

    rows.forEach(row => {
      const pid = row.part_id;
      const price = parseFloat(row.price);
      if (!availability[pid].available || price < availability[pid].price) {
        availability[pid] = {
          available: true,
          product_id: row.product_id,
          price: price,
          condition: row.condition,
          seller_name: row.seller_name
        };
      }
    });

    res.json(availability);
  } catch (error) {
    sendServerError(res, error);
  }
};

// Public: list a seller's reviews (paginated)
exports.getSellerReviews = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.username as reviewer_name
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.seller_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [sellerId, limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) as total FROM reviews WHERE seller_id = ?', [sellerId]);

    res.json({
      reviews: result.rows,
      total: Number(countResult.rows[0].total),
      page
    });
  } catch (error) {
    sendServerError(res, error);
  }
};
