const pool = require('../config/database');
const { checkCompatibility, getBuildPartsMap, crossMatchMarketplace } = require('../services/compatibilityService');
const { assembleSpecsBatch } = require('../services/specTables');
const { attachPhotos } = require('./productController');
const { sendServerError } = require('../utils/errorHandler');

// Get all public builds
exports.getBuilds = async (req, res) => {
  try {
    const { page = 1, limit = 12, sort = 'newest', search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE b.is_public = 1';
    const params = [];

    if (search) {
      whereClause += ' AND (b.name LIKE ? OR b.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    let orderBy = 'b.created_at DESC';
    switch (sort) {
      case 'popular': orderBy = 'likes_count DESC, b.created_at DESC'; break;
      case 'price_low': orderBy = 'b.total_price ASC'; break;
      case 'price_high': orderBy = 'b.total_price DESC'; break;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as cnt FROM builds b ${whereClause}`, params
    );
    const total = countResult.rows[0].cnt;

    const result = await pool.query(
      `SELECT b.*, u.username as author_name, u.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM build_likes bl WHERE bl.build_id = b.id) as likes_count,
        (SELECT COUNT(*) FROM build_comments bc WHERE bc.build_id = b.id) as comments_count
       FROM builds b JOIN users u ON b.user_id = u.id
       ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      builds: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// Get single build
exports.getBuildById = async (req, res) => {
  try {
    const { id } = req.params;

    const buildResult = await pool.query(
      `SELECT b.*, u.username as author_name, u.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM build_likes bl WHERE bl.build_id = b.id) as likes_count,
        (SELECT COUNT(*) FROM build_comments bc WHERE bc.build_id = b.id) as comments_count
       FROM builds b JOIN users u ON b.user_id = u.id WHERE b.id = ?`,
      [id]
    );

    if (!buildResult.rows || buildResult.rows.length === 0) {
      return res.status(404).json({ error: 'Build not found' });
    }

    const build = buildResult.rows[0];

    if (!build.is_public && (!req.userId || req.userId !== build.user_id)) {
      return res.status(403).json({ error: 'This build is private' });
    }

    const partsResult = await pool.query(
      `SELECT bp.id AS build_part_id, bp.quantity, bp.product_id,
        pr.price, pr.original_price, pr.brand, pr.model, pr.serial_number,
        CONCAT(pr.brand, ' ', pr.model) AS name,
        (SELECT image_url FROM product_photos WHERE product_id = pr.id ORDER BY display_order ASC LIMIT 1) AS image_url,
        pr.status AS listing_status, pr.review_status AS listing_review_status,
        c.name as category_name,
        c.slug as category_slug
       FROM build_parts bp
       JOIN products pr ON bp.product_id = pr.id
       JOIN categories c ON pr.category_id = c.id
       WHERE bp.build_id = ?
       ORDER BY c.display_order ASC`,
      [id]
    );

    const rows = partsResult.rows || [];
    const specsByCategory = {};
    for (const row of rows) {
      if (!row.category_slug) continue;
      if (!specsByCategory[row.category_slug]) specsByCategory[row.category_slug] = [];
      specsByCategory[row.category_slug].push(row.product_id);
    }
    const specsMap = {};
    for (const [categorySlug, productIds] of Object.entries(specsByCategory)) {
      Object.assign(specsMap, await assembleSpecsBatch(pool, categorySlug, productIds));
    }

    const parsedParts = rows.map(row => {
      const isAvailable = !!row.product_id && row.listing_status === 'active' && row.listing_review_status === 'approved';
      return {
        ...row,
        specs: row.product_id ? (specsMap[row.product_id] || {}) : {},
        available: isAvailable,
      };
    });

    let userLiked = false;
    if (req.userId) {
      const likeResult = await pool.query(
        'SELECT id FROM build_likes WHERE build_id = ? AND user_id = ?',
        [id, req.userId]
      );
      userLiked = likeResult.rows && likeResult.rows.length > 0;
    }

    const commentsResult = await pool.query(
      `SELECT bc.*, u.username, u.avatar_url
       FROM build_comments bc JOIN users u ON bc.user_id = u.id
       WHERE bc.build_id = ? ORDER BY bc.created_at DESC`,
      [id]
    );

    res.json({
      ...build,
      parts: parsedParts,
      user_liked: userLiked,
      comments: commentsResult.rows || [],
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// Create build — build_parts now bind to real listings (products), not the neutral catalog
exports.createBuild = async (req, res) => {
  try {
    const { name, description, is_public = true, parts: buildParts } = req.body;
    const userId = req.userId;

    if (!name) return res.status(400).json({ error: 'Build name is required' });
    if (!buildParts || !Array.isArray(buildParts) || buildParts.length === 0) {
      return res.status(400).json({ error: 'At least one part is required' });
    }

    let totalPrice = 0;
    const buildPartPrices = {};
    for (const bp of buildParts) {
      const productResult = await pool.query('SELECT price FROM products WHERE id = ?', [bp.product_id]);
      const unitPrice = productResult.rows && productResult.rows.length > 0 ? parseFloat(productResult.rows[0].price) : 0;
      buildPartPrices[bp.product_id] = unitPrice;
      totalPrice += unitPrice * (bp.quantity || 1);
    }

    const result = await pool.query(
      'INSERT INTO builds (user_id, name, description, is_public, total_price) VALUES (?, ?, ?, ?, ?)',
      [userId, name, description || null, is_public ? 1 : 0, totalPrice]
    );

    const buildId = result.insertId;

    for (const bp of buildParts) {
      await pool.query(
        'INSERT INTO build_parts (build_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [buildId, bp.product_id, bp.quantity || 1, buildPartPrices[bp.product_id]]
      );
    }

    res.status(201).json({ message: 'Build created successfully', build: { id: buildId, name, total_price: totalPrice } });
  } catch (error) {
    sendServerError(res, error);
  }
};

// Update build
exports.updateBuild = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_public, parts: buildParts } = req.body;
    const userId = req.userId;

    const buildCheck = await pool.query('SELECT user_id FROM builds WHERE id = ?', [id]);
    if (!buildCheck.rows || buildCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Build not found' });
    }
    if (buildCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (buildParts && Array.isArray(buildParts)) {
      let totalPrice = 0;
      const buildPartPrices = {};
      for (const bp of buildParts) {
        const productResult = await pool.query('SELECT price FROM products WHERE id = ?', [bp.product_id]);
        const unitPrice = productResult.rows && productResult.rows.length > 0 ? parseFloat(productResult.rows[0].price) : 0;
        buildPartPrices[bp.product_id] = unitPrice;
        totalPrice += unitPrice * (bp.quantity || 1);
      }

      await pool.query('DELETE FROM build_parts WHERE build_id = ?', [id]);
      for (const bp of buildParts) {
        await pool.query('INSERT INTO build_parts (build_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [id, bp.product_id, bp.quantity || 1, buildPartPrices[bp.product_id]]);
      }

      await pool.query(
        'UPDATE builds SET name = COALESCE(?, name), description = COALESCE(?, description), is_public = COALESCE(?, is_public), total_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, description, is_public !== undefined ? (is_public ? 1 : 0) : null, totalPrice, id]
      );
    } else {
      await pool.query(
        'UPDATE builds SET name = COALESCE(?, name), description = COALESCE(?, description), is_public = COALESCE(?, is_public), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, description, is_public !== undefined ? (is_public ? 1 : 0) : null, id]
      );
    }

    res.json({ message: 'Build updated successfully' });
  } catch (error) {
    sendServerError(res, error);
  }
};

// Delete build
exports.deleteBuild = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const buildCheck = await pool.query('SELECT user_id FROM builds WHERE id = ?', [id]);
    if (!buildCheck.rows || buildCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Build not found' });
    }
    if (buildCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM builds WHERE id = ?', [id]);
    res.json({ message: 'Build deleted successfully' });
  } catch (error) {
    sendServerError(res, error);
  }
};

// Like build
exports.likeBuild = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    try {
      await pool.query('INSERT INTO build_likes (build_id, user_id) VALUES (?, ?)', [id, userId]);
    } catch (e) {
      if (!e.message.includes('UNIQUE constraint')) throw e;
    }

    const countResult = await pool.query('SELECT COUNT(*) as cnt FROM build_likes WHERE build_id = ?', [id]);
    res.json({ message: 'Build liked', likes_count: countResult.rows[0].cnt });
  } catch (error) {
    sendServerError(res, error);
  }
};

// Unlike build
exports.unlikeBuild = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    await pool.query('DELETE FROM build_likes WHERE build_id = ? AND user_id = ?', [id, userId]);
    const countResult = await pool.query('SELECT COUNT(*) as cnt FROM build_likes WHERE build_id = ?', [id]);
    res.json({ message: 'Build unliked', likes_count: countResult.rows[0].cnt });
  } catch (error) {
    sendServerError(res, error);
  }
};

// Add comment
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const result = await pool.query(
      'INSERT INTO build_comments (build_id, user_id, content) VALUES (?, ?, ?)',
      [id, userId, content.trim()]
    );

    const username = await pool.query('SELECT username FROM users WHERE id = ?', [userId]);

    res.status(201).json({
      id: result.insertId,
      build_id: parseInt(id),
      user_id: userId,
      content: content.trim(),
      username: username.rows[0].username,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// Check compatibility
exports.checkBuildCompatibility = async (req, res) => {
  try {
    const { parts: buildParts } = req.body;
    if (!buildParts || !Array.isArray(buildParts) || buildParts.length === 0) {
      return res.status(400).json({ error: 'Parts array is required' });
    }
    const result = await checkCompatibility(pool, buildParts);
    res.json(result);
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.crossMatchBuildParts = async (req, res) => {
  try {
    const { parts: buildParts } = req.body;
    if (!buildParts || !Array.isArray(buildParts) || buildParts.length === 0) {
      return res.status(400).json({ error: 'Parts array is required' });
    }
    const matchResults = await crossMatchMarketplace(pool, buildParts);
    res.json(matchResults);
  } catch (error) {
    sendServerError(res, error);
  }
};

// Get user builds
exports.getUserBuilds = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    let query = `
      SELECT b.*, u.username as author_name,
        (SELECT COUNT(*) FROM build_likes bl WHERE bl.build_id = b.id) as likes_count,
        (SELECT COUNT(*) FROM build_comments bc WHERE bc.build_id = b.id) as comments_count
      FROM builds b JOIN users u ON b.user_id = u.id
      WHERE b.user_id = ?
    `;
    const params = [userId];

    if (currentUserId !== parseInt(userId)) {
      query += ' AND b.is_public = 1';
    }

    query += ' ORDER BY b.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (error) {
    sendServerError(res, error);
  }
};

// Builder's live part picker — active+approved listings only (things you can actually buy),
// joined directly to products, categories and product_photos.
exports.getAvailableParts = async (req, res) => {
  try {
    const { category } = req.query;

    const where = [`pr.status = 'active'`, `pr.review_status = 'approved'`, `pr.stock_quantity > 0`];
    const params = [];
    if (category) {
      where.push('c.slug = ?');
      params.push(category);
    }

    const result = await pool.query(
      `SELECT pr.id, pr.price, pr.original_price, pr.condition, pr.remaining_warranty_months,
              pr.brand, pr.model, CONCAT(pr.brand, ' ', pr.model) AS name, pr.sku,
              c.slug AS category_slug, c.name AS category_name,
              u.username AS seller_name
       FROM products pr
       JOIN categories c ON pr.category_id = c.id
       JOIN users u ON pr.seller_id = u.id
       WHERE ${where.join(' AND ')}
       ORDER BY pr.price ASC`,
      params
    );

    const rows = result.rows || [];
    const byCategory = {};
    rows.forEach(row => {
      if (!byCategory[row.category_slug]) byCategory[row.category_slug] = [];
      byCategory[row.category_slug].push(row.id);
    });
    const specsMap = {};
    for (const [categorySlug, productIds] of Object.entries(byCategory)) {
      Object.assign(specsMap, await assembleSpecsBatch(pool, categorySlug, productIds));
    }

    const withPhotos = await Promise.all(rows.map(async row => {
      const { photos } = await attachPhotos({ id: row.id });
      return { ...row, specs: specsMap[row.id] || {}, photos };
    }));

    res.json(withPhotos);
  } catch (error) {
    sendServerError(res, error);
  }
};
