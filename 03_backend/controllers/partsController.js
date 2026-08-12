const pool = require('../config/database');
const { sendServerError } = require('../utils/errorHandler');

function parseSpecs(part) {
  if (!part) return part;
  if (typeof part.specs === 'string') {
    try {
      part.specs = JSON.parse(part.specs);
    } catch (e) {
      part.specs = {};
    }
  }
  return part;
}

exports.getParts = async (req, res) => {
  try {
    const { category, brand, search, min_price, max_price, sort = 'name', order = 'ASC' } = req.query;

    let query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM parts p
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;
    const params = [];

    if (category) {
      query += ' AND c.slug = ?';
      params.push(category);
    }

    if (brand) {
      query += ' AND p.brand LIKE ?';
      params.push(`%${brand}%`);
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.brand LIKE ? OR p.model LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (min_price) {
      query += ' AND p.price >= ?';
      params.push(parseFloat(min_price));
    }

    if (max_price) {
      query += ' AND p.price <= ?';
      params.push(parseFloat(max_price));
    }

    const allowedSorts = ['name', 'price', 'brand', 'created_at'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'name';
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    query += ` ORDER BY p.${sortCol} ${sortOrder}`;

    const result = await pool.query(query, params);
    const parts = (result.rows || []).map(parseSpecs);
    res.json(parts);
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.getPartById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM parts p JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
      [id]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found' });
    }

    res.json(parseSpecs(result.rows[0]));
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.getCategories = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY display_order ASC');
    res.json(result.rows || []);
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.getPartsByCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM parts p JOIN categories c ON p.category_id = c.id
       WHERE c.slug = ? AND p.is_active = 1 ORDER BY p.price ASC`,
      [slug]
    );
    const parts = (result.rows || []).map(parseSpecs);
    res.json(parts);
  } catch (error) {
    sendServerError(res, error);
  }
};

exports.getBrands = async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT brand FROM parts WHERE is_active = 1 ORDER BY brand ASC');
    res.json((result.rows || []).map(r => r.brand));
  } catch (error) {
    sendServerError(res, error);
  }
};
