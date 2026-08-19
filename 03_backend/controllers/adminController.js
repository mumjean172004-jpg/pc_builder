const pool = require('../config/database');
const { sendServerError } = require('../utils/errorHandler');
const { computeAverageRating } = require('../services/reviewService');

// 1. Get dashboard stats
exports.getStats = async (req, res) => {
  try {
    // Total Revenue
    const revenueRes = await pool.query(`
      SELECT SUM(total_price) as total_revenue 
      FROM orders 
      WHERE status IN ('paid', 'shipped', 'completed')
    `);
    const totalRevenue = revenueRes.rows[0]?.total_revenue || 0;

    // Active Listings
    const activeListingsRes = await pool.query(`
      SELECT COUNT(*) as active_listings 
      FROM products 
      WHERE status = 'active' AND review_status = 'approved'
    `);
    const activeListings = activeListingsRes.rows[0]?.active_listings || 0;

    // New Users (Last 7 days)
    const newUsersRes = await pool.query(`
      SELECT COUNT(*) as new_users 
      FROM users 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    const newUsers = newUsersRes.rows[0]?.new_users || 0;

    // Category Sales Distribution
    const categorySalesRes = await pool.query(`
      SELECT c.name as category_name, COUNT(oi.id) as sales_count, SUM(oi.price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('paid', 'shipped', 'completed')
      GROUP BY c.name
      ORDER BY sales_count DESC
    `);

    res.json({
      totalRevenue: parseFloat(totalRevenue),
      activeListings: parseInt(activeListings),
      newUsers: parseInt(newUsers),
      categorySales: categorySalesRes.rows
    });
  } catch (error) {
    console.error('Admin getStats error:', error);
    sendServerError(res, error);
  }
};

// 2. Get list of users
exports.getUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, email, role, status, created_at 
      FROM users 
      ORDER BY id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Admin getUsers error:', error);
    sendServerError(res, error);
  }
};

// 3. Update user status (Suspend/Activate)
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.userId;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid user status' });
    }

    // Don't allow suspending oneself
    if (parseInt(id) === adminId) {
      return res.status(400).json({ error: 'ท่านไม่สามารถระงับสิทธิ์บัญชีแอดมินของตนเองได้' });
    }

    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);

    // Insert admin audit log
    const actionText = status === 'suspended' ? 'suspend_user' : 'activate_user';
    await pool.query(
      'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
      [adminId, actionText, `Target User ID: ${id}`]
    );

    res.json({ message: `สลับสถานะผู้ใช้งานเป็น ${status} สำเร็จ`, status });
  } catch (error) {
    console.error('Admin updateUserStatus error:', error);
    sendServerError(res, error);
  }
};

// 4. Get flagged/suspicious products
exports.getFlaggedProducts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.price, p.condition, p.serial_number, p.status, p.review_status,
             p.suspicious_score, p.suspicious_reasons, p.created_at,
             u.username as seller_name, p.brand, p.model
      FROM products p
      JOIN users u ON p.seller_id = u.id
      WHERE p.suspicious_score > 0 OR p.review_status = 'pending_review'
      ORDER BY p.suspicious_score DESC, p.id DESC
    `);
    
    // Parse JSON lists
    const products = result.rows.map(row => ({
      ...row,
      suspicious_reasons: typeof row.suspicious_reasons === 'string' 
        ? JSON.parse(row.suspicious_reasons) 
        : row.suspicious_reasons
    }));

    res.json(products);
  } catch (error) {
    console.error('Admin getFlaggedProducts error:', error);
    sendServerError(res, error);
  }
};

// 5. Review and approve/reject marketplace listing
exports.reviewProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { review_status } = req.body;
    const adminId = req.userId;

    if (!['approved', 'rejected'].includes(review_status)) {
      return res.status(400).json({ error: 'Invalid review status' });
    }

    const targetStatus = review_status === 'approved' ? 'active' : 'paused';

    await pool.query(
      'UPDATE products SET review_status = ?, status = ? WHERE id = ?',
      [review_status, targetStatus, id]
    );

    // Audit log
    await pool.query(
      'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
      [adminId, 'review_product', `Product ID: ${id}, Status: ${review_status}`]
    );

    res.json({ message: 'บันทึกการตรวจสอบประกาศสำเร็จ', review_status, status: targetStatus });
  } catch (error) {
    console.error('Admin reviewProduct error:', error);
    sendServerError(res, error);
  }
};

// 6. Get disputed orders
exports.getDisputes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, o.status, o.total_price, o.payment_slip_url, o.created_at,
             bu.username as buyer_name, su.username as seller_name, cr.id as room_id
      FROM orders o
      JOIN users bu ON o.buyer_id = bu.id
      JOIN users su ON o.seller_id = su.id
      LEFT JOIN chat_rooms cr ON o.id = cr.order_id
      WHERE o.status = 'disputed'
      ORDER BY o.id DESC
    `);
    res.json(result.rows.map(r => ({ ...r, total_price: Number(r.total_price) })));
  } catch (error) {
    console.error('Admin getDisputes error:', error);
    sendServerError(res, error);
  }
};

// 7. Override order status (Dispute resolution)
exports.overrideOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.userId;

    const validStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status override' });
    }

    // Fetch the order
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!orderResult.rows?.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Update status
    if (status === 'pending') {
      await pool.query('UPDATE orders SET status = ?, payment_slip_url = NULL WHERE id = ?', [status, id]);
    } else {
      await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    }

    // Restore stock if cancelled
    if (status === 'cancelled') {
      await pool.query(`
        UPDATE products 
        SET status = 'active' 
        WHERE id IN (SELECT product_id FROM order_items WHERE order_id = ?)
      `, [id]);
    }

    // Create system message in chat
    const roomResult = await pool.query('SELECT id FROM chat_rooms WHERE order_id = ?', [id]);
    if (roomResult.rows?.length) {
      const roomId = roomResult.rows[0].id;
      const systemMsg = `[ระบบแอดมินชี้ขาด] แอดมินได้ทำการแทรกแซงและยุติข้อพิพาท โดยสั่งเปลี่ยนสถานะของคำสั่งซื้อเป็น: "${status.toUpperCase()}"`;
      
      const insertMsgResult = await pool.query(`
        INSERT INTO chat_messages (room_id, sender_id, message_type, message)
        VALUES (?, NULL, 'system', ?)
      `, [roomId, systemMsg]);

      // Broadcast via Websockets
      try {
        const socketModule = require('../config/socket');
        const io = socketModule.getIO();

        io.to(`room_${roomId}`).emit('new_message', {
          id: insertMsgResult.insertId,
          room_id: roomId,
          sender_id: null,
          sender_name: 'Admin Intervention',
          message_type: 'system',
          message: systemMsg,
          created_at: new Date().toISOString()
        });

        io.to(`room_${roomId}`).emit('status_updated', {
          orderId: parseInt(id),
          status,
          payment_slip_url: status === 'pending' ? null : order.payment_slip_url
        });
      } catch (err) {
        console.error('Socket override status broadcast error:', err.message);
      }
    }

    // Audit log
    await pool.query(
      'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
      [adminId, 'dispute_resolution_override', `Order ID: ${id}, Target Status: ${status}`]
    );

    res.json({ message: 'แอดมินชี้ขาดสถานะออเดอร์เรียบร้อย', status });
  } catch (error) {
    console.error('Admin overrideOrderStatus error:', error);
    sendServerError(res, error);
  }
};

// 8. All marketplace products, for the admin "จัดการสินค้าในตลาด" tab — repurposed
// 2026-08-17 from what used to be CRUD for a standalone `parts` reference catalog
// (removed along with the `parts` table itself, see scripts/migrate_remove_parts.js).
// Read-only listing; moderation actions reuse the existing reviewProduct endpoint
// and the seller-facing PUT /api/products/:id status toggle rather than duplicating
// new mutation endpoints here.
exports.getAllProductsAdmin = async (req, res) => {
  try {
    const { category, status, review_status, search } = req.query;
    const where = [];
    const params = [];
    if (category) {
      where.push('c.slug = ?');
      params.push(category);
    }
    if (status) {
      where.push('p.status = ?');
      params.push(status);
    }
    if (review_status) {
      where.push('p.review_status = ?');
      params.push(review_status);
    }
    if (search) {
      where.push('(p.brand LIKE ? OR p.model LIKE ? OR p.serial_number LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT p.id, p.brand, p.model, p.price, p.original_price, p.condition, p.serial_number,
             p.status, p.review_status, p.suspicious_score, p.stock_quantity, p.created_at,
             u.username as seller_name, c.name as category_name, c.slug as category_slug
      FROM products p
      JOIN users u ON p.seller_id = u.id
      JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT 200
    `, params);

    res.json(result.rows || []);
  } catch (error) {
    console.error('Admin getAllProductsAdmin error:', error);
    sendServerError(res, error);
  }
};

// 9. Hard-delete a product listing (moderation) — distinct from the seller-facing
// DELETE /api/products/:id (which also allows admin via a role check) so admin deletions
// get an admin_logs audit entry, matching reviewProduct/overrideOrderStatus/deleteReview.
exports.deleteProductAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const existing = await pool.query('SELECT id, brand, model FROM products WHERE id = ?', [id]);
    if (!existing.rows?.length) {
      return res.status(404).json({ error: 'ไม่พบสินค้านี้ในระบบ' });
    }

    const orderRef = await pool.query('SELECT id FROM order_items WHERE product_id = ? LIMIT 1', [id]);
    if (orderRef.rows?.length) {
      return res.status(400).json({ error: 'ไม่สามารถลบสินค้านี้ได้ เนื่องจากมีคำสั่งซื้อที่อ้างอิงสินค้านี้อยู่แล้ว' });
    }

    await pool.query('DELETE FROM products WHERE id = ?', [id]);

    await pool.query(
      'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
      [adminId, 'delete_product', `Product ID: ${id}, ${existing.rows[0].brand || ''} ${existing.rows[0].model || ''}`.trim()]
    );

    res.json({ message: 'ลบประกาศสินค้าเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Admin deleteProductAdmin error:', error);
    sendServerError(res, error);
  }
};

// 12. Delete a seller review (moderation — e.g. abusive/off-topic content)
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const existing = await pool.query('SELECT id, seller_id FROM reviews WHERE id = ?', [id]);
    if (!existing.rows?.length) {
      return res.status(404).json({ error: 'ไม่พบรีวิวนี้ในระบบ' });
    }
    const sellerId = existing.rows[0].seller_id;

    await pool.query('DELETE FROM reviews WHERE id = ?', [id]);

    const remaining = await pool.query('SELECT rating FROM reviews WHERE seller_id = ?', [sellerId]);
    const newAverage = computeAverageRating(remaining.rows.map(r => r.rating));
    await pool.query('UPDATE seller_profiles SET rating = ? WHERE user_id = ?', [newAverage, sellerId]);

    await pool.query(
      'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
      [adminId, 'delete_review', `Review ID: ${id}, Seller ID: ${sellerId}`]
    );

    res.json({ message: 'ลบรีวิวเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Admin deleteReview error:', error);
    sendServerError(res, error);
  }
};
