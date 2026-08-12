const { verifyToken } = require('../utils/jwt');
const pool = require('../config/database');

async function authMiddleware(req, res, next) {
  try {
    // Read JWT token from cookies or Authorization header
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check user suspension status
    const userResult = await pool.query('SELECT status FROM users WHERE id = ?', [decoded.userId]);
    if (userResult.rows?.length && userResult.rows[0].status === 'suspended') {
      return res.status(403).json({ error: 'บัญชีนี้ถูกระงับการใช้งานชั่วคราว' });
    }

    req.userId = decoded.userId;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ error: 'Token verification failed' });
  }
}

async function adminMiddleware(req, res, next) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    const userResult = await pool.query('SELECT role, status FROM users WHERE id = ?', [userId]);
    if (!userResult.rows?.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'บัญชีนี้ถูกระงับการใช้งานชั่วคราว' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง: เฉพาะแอดมินเท่านั้น' });
    }

    next();
  } catch (err) {
    console.error('Admin middleware error:', err);
    return res.status(500).json({ error: 'Internal server verification error' });
  }
}

module.exports = {
  authMiddleware,
  adminMiddleware
};
