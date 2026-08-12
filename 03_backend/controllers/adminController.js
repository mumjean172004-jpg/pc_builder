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
             u.username as seller_name, pr.name as part_name
      FROM products p
      JOIN users u ON p.seller_id = u.id
      LEFT JOIN parts pr ON p.part_id = pr.id
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

// 8. Add new part to standard catalog
exports.addCatalogPart = async (req, res) => {
  try {
    const { name, category_id, brand, model, specs, price } = req.body;
    const adminId = req.userId;

    if (!name || !category_id || !brand || !price) {
      return res.status(400).json({ error: 'Name, Category ID, Brand, and Price are required' });
    }

    // Stringify specs if object is passed
    const specsString = typeof specs === 'object' ? JSON.stringify(specs) : (specs || '{}');

    const insertResult = await pool.query(`
      INSERT INTO parts (name, category_id, brand, model, specs, price)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, category_id, brand, model || null, specsString, price]);

    // Audit log
    await pool.query(
      'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
      [adminId, 'add_catalog_part', `Part ID: ${insertResult.insertId}, Name: ${name}`]
    );

    res.status(201).json({
      message: 'เพิ่มชิ้นส่วนมาตรฐานเข้าสู่ระบบแคตตาล็อกสำเร็จ',
      partId: insertResult.insertId
    });
  } catch (error) {
    console.error('Admin addCatalogPart error:', error);
    sendServerError(res, error);
  }
};

// 10. Update a catalog part (partial update — only provided fields change)
exports.updateCatalogPart = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id, brand, model, specs, price, image_url, is_active } = req.body;
    const adminId = req.userId;

    const existing = await pool.query('SELECT id FROM parts WHERE id = ?', [id]);
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบชิ้นส่วนนี้ในระบบแคตตาล็อก' });
    }

    const specsString = specs === undefined ? null : (typeof specs === 'object' ? JSON.stringify(specs) : specs);

    await pool.query(`
      UPDATE parts SET
        name = COALESCE(?, name),
        category_id = COALESCE(?, category_id),
        brand = COALESCE(?, brand),
        model = COALESCE(?, model),
        specs = COALESCE(?, specs),
        price = COALESCE(?, price),
        image_url = COALESCE(?, image_url),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `, [
      name || null,
      category_id || null,
      brand || null,
      model || null,
      specsString,
      price === undefined ? null : price,
      image_url || null,
      is_active === undefined ? null : (is_active ? 1 : 0),
      id
    ]);

    await pool.query(
      'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
      [adminId, 'update_catalog_part', `Part ID: ${id}`]
    );

    res.json({ message: 'แก้ไขข้อมูลชิ้นส่วนมาตรฐานสำเร็จ' });
  } catch (error) {
    console.error('Admin updateCatalogPart error:', error);
    sendServerError(res, error);
  }
};

// 11. Delete a catalog part — blocked at the DB level (FK RESTRICT) if any
// product listing or saved build still references it.
exports.deleteCatalogPart = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const existing = await pool.query('SELECT id, name FROM parts WHERE id = ?', [id]);
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบชิ้นส่วนนี้ในระบบแคตตาล็อก' });
    }

    await pool.query('DELETE FROM parts WHERE id = ?', [id]);

    await pool.query(
      'INSERT INTO admin_logs (admin_id, action, details) VALUES (?, ?, ?)',
      [adminId, 'delete_catalog_part', `Part ID: ${id}, Name: ${existing.rows[0].name}`]
    );

    res.json({ message: 'ลบชิ้นส่วนมาตรฐานออกจากระบบแคตตาล็อกสำเร็จ' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED' || error.errno === 1451) {
      return res.status(409).json({
        error: 'ไม่สามารถลบชิ้นส่วนนี้ได้ เนื่องจากมีประกาศขายสินค้าหรือชุดจัดสเปคที่อ้างอิงชิ้นส่วนนี้อยู่ กรุณาปิดการใช้งาน (ปิดสถานะ) แทนการลบ'
      });
    }
    console.error('Admin deleteCatalogPart error:', error);
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
    await pool.query('UPDATE users SET seller_rating = ? WHERE id = ?', [newAverage, sellerId]);

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
