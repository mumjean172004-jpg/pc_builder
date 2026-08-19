// PC Backend — Booking & Chat Controller
const pool = require('../config/database');
const { sendServerError } = require('../utils/errorHandler');
const { isValidRating, computeAverageRating } = require('../services/reviewService');

async function refreshSellerRating(sellerId) {
  const result = await pool.query('SELECT rating FROM reviews WHERE seller_id = ?', [sellerId]);
  const avg = computeAverageRating((result.rows || []).map(r => r.rating));
  await pool.query('UPDATE seller_profiles SET rating = ? WHERE user_id = ?', [avg, sellerId]);
  return avg;
}

// 1. Create a C2C Booking order split by Seller
exports.createBooking = async (req, res) => {
  try {
    const {
      items,
      shipping_address,
      contact_phone,
      shipping_method = 'express',
      courier_name,
      pickup_location,
      is_risk_accepted
    } = req.body;
    const buyerId = req.userId;

    if (!items || !items.length || !shipping_address || !contact_phone) {
      return res.status(400).json({ error: 'Items, shipping address, and contact phone are required' });
    }

    const productIds = items.map(item => item.product_id);
    const placeholders = productIds.map(() => '?').join(',');

    // Fetch product and seller information
    const queryResult = await pool.query(`
      SELECT p.id as product_id, p.seller_id, p.price, p.stock_quantity, p.status, p.brand, p.model
      FROM products p
      WHERE p.id IN (${placeholders})
    `, productIds);

    const products = queryResult.rows;

    if (!products.length) {
      return res.status(400).json({ error: 'No matching products found' });
    }

    // Verify all products are active
    const inactiveProduct = products.find(p => p.status !== 'active');
    if (inactiveProduct) {
      return res.status(400).json({ error: `สินค้า ${inactiveProduct.brand || ''} ${inactiveProduct.model || ''} ถูกขายหรือระงับการขายแล้ว` });
    }

    // Block buying own products to prevent review/rating pumping
    const selfPurchase = products.find(p => p.seller_id === buyerId);
    if (selfPurchase) {
      return res.status(400).json({ error: 'คุณไม่สามารถสั่งซื้อหรือจองสินค้าของตัวเองได้ เพื่อป้องกันการปั๊มรีวิวและคะแนนความน่าเชื่อถือร้านค้า' });
    }

    // Group products by seller_id
    const groupsBySeller = {};
    for (const prod of products) {
      if (!groupsBySeller[prod.seller_id]) {
        groupsBySeller[prod.seller_id] = [];
      }
      groupsBySeller[prod.seller_id].push(prod);
    }

    const createdOrders = [];

    // Process each seller group as a separate order
    for (const sellerIdStr in groupsBySeller) {
      const sellerId = parseInt(sellerIdStr);
      const sellerProducts = groupsBySeller[sellerIdStr];
      const totalPrice = sellerProducts.reduce((sum, p) => sum + Number(p.price), 0);
      const isRiskAcceptedVal = is_risk_accepted ? 1 : 0;
      const riskAcceptedAtVal = is_risk_accepted ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

      // Create Order
      const insertOrderResult = await pool.query(`
        INSERT INTO orders (
          buyer_id, seller_id, status, shipping_address, contact_phone, total_price,
          shipping_method, courier_name, pickup_location, is_risk_accepted, risk_accepted_at
        ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        buyerId,
        sellerId,
        shipping_address,
        contact_phone,
        totalPrice,
        shipping_method,
        courier_name || null,
        pickup_location || null,
        isRiskAcceptedVal,
        riskAcceptedAtVal
      ]);

      const orderId = insertOrderResult.insertId;

      // Insert Order Items and Update Product Status to 'sold'
      for (const prod of sellerProducts) {
        await pool.query(`
          INSERT INTO order_items (order_id, product_id, price)
          VALUES (?, ?, ?)
        `, [orderId, prod.product_id, prod.price]);

        await pool.query(`
          UPDATE products SET status = 'sold' WHERE id = ?
        `, [prod.product_id]);
      }

      // Create Chat Room for this order
      const insertRoomResult = await pool.query(`
        INSERT INTO chat_rooms (order_id, buyer_id, seller_id)
        VALUES (?, ?, ?)
      `, [orderId, buyerId, sellerId]);

      const roomId = insertRoomResult.insertId;

      // Generate System Message description of ordered items
      let shippingText = '';
      if (shipping_method === 'hand_pickup') {
        shippingText = `🤝 รูปแบบการจัดส่ง: นัดรับสินค้าด้วยตัวเอง (รับมือ)\n📍 สถานที่นัดพบ: ${pickup_location || 'ตกลงในช่องแชท'}`;
      } else if (shipping_method === 'cod') {
        shippingText = `📦 รูปแบบการจัดส่ง: เก็บเงินปลายทาง (COD)`;
      } else {
        shippingText = `🚚 รูปแบบการจัดส่ง: จัดส่งพัสดุทั่วไป (โอนเงินก่อน)`;
        if (is_risk_accepted) {
          shippingText += `\n(⚠️ ผู้ซื้อได้รับการแจ้งเตือนและกดยอมรับความเสี่ยงสินค้ามูลค่าสูงเรียบร้อยแล้ว)`;
        }
      }

      const itemsListText = sellerProducts.map(p => `- ${p.brand} ${p.model} (฿${p.price.toLocaleString()})`).join('\n');
      const systemMessage = `[ระบบ] ใบสั่งจอง #BO-${orderId} ถูกเปิดขึ้นแล้ว!\n\n${shippingText}\n\nรายการสินค้า:\n${itemsListText}\n\nราคารวมทั้งหมด: ฿${totalPrice.toLocaleString()}\n\nกรุณาแจ้งช่องทางการโอนเงินและการจัดส่ง/นัดรับเพิ่มเติมในช่องแชทนี้`;

      await pool.query(`
        INSERT INTO chat_messages (room_id, sender_id, message_type, message)
        VALUES (?, NULL, 'system', ?)
      `, [roomId, systemMessage]);

      createdOrders.push({
        order_id: orderId,
        room_id: roomId,
        total_price: totalPrice,
        shipping_method
      });
    }

    res.status(201).json({
      message: 'สร้างใบสั่งจองและเปิดห้องแชทคุยซื้อขายสำเร็จ',
      orders: createdOrders
    });

  } catch (error) {
    console.error('Create booking error:', error);
    sendServerError(res, error);
  }
};

// 2. Update order/booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, courier_name, tracking_number, proof_of_packing_url } = req.body;
    const userId = req.userId;

    const validStatuses = ['pending', 'waiting_verification', 'paid', 'shipped', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    // Fetch the order
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!orderResult.rows?.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Authorization checks
    const isBuyer = order.buyer_id === userId;
    const isSeller = order.seller_id === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: 'You are not authorized to update this order' });
    }

    // Business rules for status transition based on target status
    if (status === 'waiting_verification') {
      if (!isBuyer) {
        return res.status(400).json({ error: 'มีเพียงผู้ซื้อเท่านั้นที่จะส่งหลักฐานการโอนเงินได้' });
      }
    }

    if (status === 'paid' || status === 'shipped') {
      if (!isSeller) {
        return res.status(400).json({ error: 'มีเพียงผู้ขายเท่านั้นที่จะกดยืนยันยอดโอนหรือระบุการจัดส่งได้' });
      }
    }

    if (status === 'shipped' && order.status !== 'paid') {
      return res.status(400).json({ error: 'ต้องยืนยันการชำระเงินก่อนจึงจะสามารถระบุการจัดส่งได้' });
    }

    if (status === 'completed') {
      if (!isBuyer) {
        return res.status(400).json({ error: 'มีเพียงผู้ซื้อเท่านั้นที่จะกดยืนยันสำเร็จการรับสินค้าได้' });
      }
      if (order.status !== 'shipped' && order.status !== 'paid') {
        return res.status(400).json({ error: 'ไม่สามารถกดรับสินค้าได้หากผู้ขายยังไม่ได้ระบุส่งของ' });
      }
    }

    // Update status and shipping info
    if (courier_name || tracking_number || proof_of_packing_url) {
      await pool.query(
        `UPDATE orders SET status = ?, courier_name = COALESCE(?, courier_name),
         tracking_number = COALESCE(?, tracking_number),
         proof_of_packing_url = COALESCE(?, proof_of_packing_url) WHERE id = ?`,
        [status, courier_name || null, tracking_number || null, proof_of_packing_url || null, id]
      );
    } else if (status === 'pending' && order.status === 'waiting_verification') {
      await pool.query('UPDATE orders SET status = ?, payment_slip_url = NULL WHERE id = ?', [status, id]);
    } else {
      await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    }

    // Handle cancellation: Restore products back to 'active' status
    if (status === 'cancelled') {
      await pool.query(`
        UPDATE products 
        SET status = 'active' 
        WHERE id IN (SELECT product_id FROM order_items WHERE order_id = ?)
      `, [id]);
    }

    // Find matching Chat Room
    const roomResult = await pool.query('SELECT id FROM chat_rooms WHERE order_id = ?', [id]);
    if (roomResult.rows?.length) {
      const roomId = roomResult.rows[0].id;
      
      // Translate status name to Thai
      let statusThai = '';
      switch (status) {
        case 'pending':
          statusThai = order.status === 'waiting_verification'
            ? 'ผู้ขายปฏิเสธสลิปการโอนเงิน (กรุณาโอนเงินใหม่)'
            : 'รอชำระเงิน/เจรจาโอนเงิน';
          break;
        case 'waiting_verification': statusThai = 'อัปโหลดสลิปแล้ว รอผู้ขายตรวจสอบ'; break;
        case 'paid': statusThai = 'ยืนยันได้รับยอดโอนเงินเรียบร้อย'; break;
        case 'shipped':
          statusThai = tracking_number || order.tracking_number
            ? `ผู้ขายทำการจัดส่งเรียบร้อย (${courier_name || order.courier_name || 'ขนส่ง'}: ${tracking_number || order.tracking_number})`
            : 'ผู้ขายทำการจัดส่ง/ส่งมอบสิ่งของเรียบร้อย';
          break;
        case 'completed': statusThai = 'ผู้ซื้อรับของและยืนยันการทำรายการเสร็จสมบูรณ์'; break;
        case 'cancelled': statusThai = 'ยกเลิกรายการคำสั่งจองนี้แล้ว'; break;
      }

      const senderName = isBuyer ? 'ผู้ซื้อ' : 'ผู้ขาย';
      const systemMsg = `[ระบบ] ${senderName} ได้ปรับสถานะรายการเป็น: "${statusThai}"`;

      const insertMsgResult = await pool.query(`
        INSERT INTO chat_messages (room_id, sender_id, message_type, message)
        VALUES (?, NULL, 'system', ?)
      `, [roomId, systemMsg]);

      // Broadcast changes via Socket.io
      try {
        const socketModule = require('../config/socket');
        const io = socketModule.getIO();

        // 1. Send system message
        io.to(`room_${roomId}`).emit('new_message', {
          id: insertMsgResult.insertId,
          room_id: roomId,
          sender_id: null,
          sender_name: 'System',
          message_type: 'system',
          message: systemMsg,
          created_at: new Date().toISOString()
        });

        // 2. Notify order status updated
        io.to(`room_${roomId}`).emit('status_updated', {
          orderId: parseInt(id),
          status,
          payment_slip_url: status === 'pending' ? null : order.payment_slip_url,
          courier_name: courier_name || order.courier_name,
          tracking_number: tracking_number || order.tracking_number,
          proof_of_packing_url: proof_of_packing_url || order.proof_of_packing_url
        });
      } catch (err) {
        console.error('Socket update status broadcast error:', err.message);
      }
    }

    res.json({ message: 'ปรับปรุงสถานะสั่งจองเรียบร้อย', status });

  } catch (error) {
    console.error('Update status error:', error);
    sendServerError(res, error);
  }
};

// 3. Get list of Chat Rooms for current user
exports.getChatRooms = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(`
      SELECT 
        cr.id, 
        cr.order_id, 
        cr.buyer_id, 
        cr.seller_id, 
        cr.created_at,
        o.status as order_status,
        o.total_price as order_price,
        bu.username as buyer_name,
        su.username as seller_name,
        (SELECT message FROM chat_messages WHERE room_id = cr.id ORDER BY id DESC LIMIT 1) as last_message,
        (SELECT created_at FROM chat_messages WHERE room_id = cr.id ORDER BY id DESC LIMIT 1) as last_message_time
      FROM chat_rooms cr
      LEFT JOIN orders o ON cr.order_id = o.id
      INNER JOIN users bu ON cr.buyer_id = bu.id
      INNER JOIN users su ON cr.seller_id = su.id
      WHERE cr.buyer_id = ? OR cr.seller_id = ?
      ORDER BY last_message_time DESC, cr.created_at DESC
    `, [userId, userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get chat rooms error:', error);
    sendServerError(res, error);
  }
};

// 4. Get Message logs inside a Room
exports.getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;

    // Verify room exists and user is member
    const roomResult = await pool.query(`
      SELECT
        cr.buyer_id,
        cr.seller_id,
        cr.order_id,
        o.payment_slip_url,
        o.status as order_status,
        o.total_price as order_price,
        o.courier_name,
        o.tracking_number,
        o.proof_of_packing_url,
        sp.shop_name as seller_shop_name,
        su.username as seller_username,
        sp.bank_account_number as seller_bank_account,
        sp.is_verified as is_seller_verified,
        COALESCE(sp.contact_phone, su.phone) as seller_phone
      FROM chat_rooms cr
      LEFT JOIN orders o ON cr.order_id = o.id
      INNER JOIN users su ON cr.seller_id = su.id
      LEFT JOIN seller_profiles sp ON sp.user_id = su.id
      WHERE cr.id = ?
    `, [roomId]);

    if (!roomResult.rows?.length) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    const room = roomResult.rows[0];
    if (room.buyer_id !== userId && room.seller_id !== userId) {
      const roleResult = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
      const isAdmin = roleResult.rows?.[0]?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).json({ error: 'You are not a member of this chat' });
      }
    }

    const messagesResult = await pool.query(`
      SELECT cm.id, cm.room_id, cm.sender_id, cm.message_type, cm.message, cm.created_at, u.username as sender_name
      FROM chat_messages cm
      LEFT JOIN users u ON cm.sender_id = u.id
      WHERE cm.room_id = ?
      ORDER BY cm.id ASC
    `, [roomId]);

    res.json({
      order_id: room.order_id,
      buyer_id: room.buyer_id,
      seller_id: room.seller_id,
      payment_slip_url: room.payment_slip_url,
      order_status: room.order_status,
      order_price: room.order_price,
      courier_name: room.courier_name,
      tracking_number: room.tracking_number,
      proof_of_packing_url: room.proof_of_packing_url,
      seller_shop_name: room.seller_shop_name || room.seller_username,
      seller_bank_account: room.seller_bank_account,
      seller_phone: room.seller_phone,
      is_seller_verified: room.is_seller_verified || 0,
      messages: messagesResult.rows
    });

  } catch (error) {
    console.error('Get room messages error:', error);
    sendServerError(res, error);
  }
};

// 5. Send message inside a room
exports.postMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { message } = req.body;
    const userId = req.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify membership
    const roomResult = await pool.query('SELECT buyer_id, seller_id FROM chat_rooms WHERE id = ?', [roomId]);
    if (!roomResult.rows?.length) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    const room = roomResult.rows[0];
    if (room.buyer_id !== userId && room.seller_id !== userId) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }

    const insertResult = await pool.query(`
      INSERT INTO chat_messages (room_id, sender_id, message_type, message)
      VALUES (?, ?, 'text', ?)
    `, [roomId, userId, message]);

    // Fetch the sender's username
    const userResult = await pool.query('SELECT username FROM users WHERE id = ?', [userId]);
    const username = userResult.rows[0]?.username || 'User';

    const msgData = {
      id: insertResult.insertId,
      room_id: parseInt(roomId),
      sender_id: userId,
      sender_name: username,
      message_type: 'text',
      message,
      created_at: new Date().toISOString()
    };

    // Broadcast message via Socket.io
    try {
      const socketModule = require('../config/socket');
      socketModule.getIO().to(`room_${roomId}`).emit('new_message', msgData);
    } catch (err) {
      console.error('Socket message broadcast error:', err.message);
    }

    res.status(201).json(msgData);

  } catch (error) {
    console.error('Post message error:', error);
    sendServerError(res, error);
  }
};

// 6. Upload payment slip with Auto-Verification (SlipOK / Dual-Mode Simulator)
const slipService = require('../services/slipService');
const trackingService = require('../services/trackingService');

exports.uploadPaymentSlip = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'กรุณาอัปโหลดรูปภาพสลิปหลักฐานการโอนเงิน' });
    }

    const orderResult = await pool.query(`
      SELECT o.*, sp.bank_account_number as seller_bank_account, sp.bank_name as seller_bank_name,
             sp.bank_account_name as seller_bank_account_name, sp.shop_name, u.username as seller_username
      FROM orders o
      JOIN users u ON o.seller_id = u.id
      LEFT JOIN seller_profiles sp ON sp.user_id = u.id
      WHERE o.id = ?
    `, [id]);

    if (!orderResult.rows?.length) {
      return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อนี้ในระบบ' });
    }

    const order = orderResult.rows[0];
    if (order.buyer_id !== userId) {
      return res.status(403).json({ error: 'มีเพียงผู้ซื้อของออเดอร์นี้เท่านั้นที่จะอัปโหลดหลักฐานการโอนเงินได้' });
    }

    if (order.status !== 'pending' && order.status !== 'waiting_verification') {
      return res.status(400).json({ error: 'สามารถอัปโหลดสลิปได้เฉพาะออเดอร์ที่อยู่ในสถานะ "รอชำระเงิน" เท่านั้น' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    // Verify slip with auto verification service
    const verification = await slipService.verifySlip({
      slipUrl: fileUrl,
      orderId: parseInt(id),
      expectedAmount: Number(order.total_price),
      sellerBankAccount: order.seller_bank_account,
      sellerBankName: order.seller_bank_name || order.seller_bank_account_name || order.shop_name
    });

    if (!verification.success) {
      return res.status(400).json({
        error: `ตรวจสอบสลิปไม่ผ่าน: ${verification.error}`,
        slip_url: fileUrl
      });
    }

    const verifyData = verification.data;

    // Record slip + automated verification metadata, but leave the actual payment
    // confirmation to the seller — status goes to 'waiting_verification', not 'paid'.
    // The automated check above (real SlipOK API, or the always-succeeds simulator when
    // no API key is configured) is a helpful pre-check for the seller's manual review,
    // not a substitute for it.
    await pool.query(`
      UPDATE orders SET
        status = 'waiting_verification',
        payment_slip_url = ?,
        slip_verified_at = CURRENT_TIMESTAMP,
        slip_trans_ref = ?,
        slip_amount = ?
      WHERE id = ?
    `, [fileUrl, verifyData.transRef, verifyData.amount, id]);

    // Create system message in chat
    const roomResult = await pool.query('SELECT id FROM chat_rooms WHERE order_id = ?', [id]);
    if (roomResult.rows?.length) {
      const roomId = roomResult.rows[0].id;
      const systemMsg = `📨 [ระบบ] ผู้ซื้อได้แนบสลิปการโอนเงินแล้ว รอผู้ขายตรวจสอบและยืนยัน\n` +
        `• รหัสอ้างอิงธนาคาร (Ref) จากการตรวจสอบอัตโนมัติ: ${verifyData.transRef}\n` +
        `• ยอดเงินที่ตรวจพบ: ฿${verifyData.amount.toLocaleString()}\n` +
        `• บัญชีปลายทาง: ${verifyData.receiverAccount} (${order.seller_bank_name || 'ธนาคารผู้ขาย'})\n` +
        `• สถานะอัปเดต: รอผู้ขายตรวจสอบสลิปและกดยืนยันรับเงิน`;

      const insertMsgResult = await pool.query(`
        INSERT INTO chat_messages (room_id, sender_id, message_type, message)
        VALUES (?, NULL, 'system', ?)
      `, [roomId, systemMsg]);

      // Broadcast changes via Socket.io
      try {
        const socketModule = require('../config/socket');
        const io = socketModule.getIO();

        io.to(`room_${roomId}`).emit('new_message', {
          id: insertMsgResult.insertId,
          room_id: roomId,
          sender_id: null,
          sender_name: 'System',
          message_type: 'system',
          message: systemMsg,
          created_at: new Date().toISOString()
        });

        io.to(`room_${roomId}`).emit('status_updated', {
          orderId: parseInt(id),
          status: 'waiting_verification',
          payment_slip_url: fileUrl,
          slip_verified_at: new Date().toISOString(),
          slip_trans_ref: verifyData.transRef,
          slip_amount: verifyData.amount
        });
      } catch (err) {
        console.error('Socket upload slip broadcast error:', err.message);
      }
    }

    res.json({
      message: 'ส่งสลิปเรียบร้อยแล้ว กำลังรอผู้ขายตรวจสอบและยืนยันการรับเงิน',
      status: 'waiting_verification',
      payment_slip_url: fileUrl,
      verification: verifyData
    });
  } catch (error) {
    console.error('Upload payment slip error:', error);
    sendServerError(res, error);
  }
};

// 7. Seller Ship Order with Proof of Packing & Tracking Number
exports.shipOrderWithProof = async (req, res) => {
  try {
    const { id } = req.params;
    const { courier_name, tracking_number, proof_of_packing_url } = req.body;
    const userId = req.userId;

    if (!tracking_number || !courier_name) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อบริษัทขนส่งและหมายเลขพัสดุ (Tracking Number)' });
    }

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!orderResult.rows?.length) return res.status(404).json({ error: 'Order not found' });

    const order = orderResult.rows[0];
    if (order.seller_id !== userId) {
      return res.status(403).json({ error: 'มีเพียงผู้ขายเท่านั้นที่จะอัปเดตการจัดส่งได้' });
    }
    if (order.status !== 'paid') {
      return res.status(400).json({ error: 'ต้องยืนยันการชำระเงินก่อนจึงจะสามารถระบุการจัดส่งได้' });
    }

    await pool.query(`
      UPDATE orders SET 
        status = 'shipped',
        courier_name = ?,
        tracking_number = ?,
        proof_of_packing_url = COALESCE(?, proof_of_packing_url)
      WHERE id = ?
    `, [courier_name, tracking_number.trim(), proof_of_packing_url || null, id]);

    // Send chat update
    const roomResult = await pool.query('SELECT id FROM chat_rooms WHERE order_id = ?', [id]);
    if (roomResult.rows?.length) {
      const roomId = roomResult.rows[0].id;
      const systemMsg = `🚚 [ระบบ] ผู้ขายได้จัดส่งพัสดุเรียบร้อยแล้ว!\n` +
        `• บริษัทขนส่ง: ${courier_name}\n` +
        `• หมายเลขพัสดุ: ${tracking_number.trim()}\n` +
        `${proof_of_packing_url ? `• แนบรูปถ่ายสินค้าลงกล่องพร้อมใบปะหน้าเรียบร้อย\n` : ''}` +
        `สามารถติดตามสถานะการจัดส่งแบบเรียลไทม์ได้จากปุ่มติดตามพัสดุ`;

      const insertMsg = await pool.query(`
        INSERT INTO chat_messages (room_id, sender_id, message_type, message)
        VALUES (?, NULL, 'system', ?)
      `, [roomId, systemMsg]);

      try {
        const socketModule = require('../config/socket');
        const io = socketModule.getIO();
        io.to(`room_${roomId}`).emit('new_message', {
          id: insertMsg.insertId,
          room_id: roomId,
          sender_id: null,
          sender_name: 'System',
          message_type: 'system',
          message: systemMsg,
          created_at: new Date().toISOString()
        });
        io.to(`room_${roomId}`).emit('status_updated', {
          orderId: parseInt(id),
          status: 'shipped',
          courier_name,
          tracking_number: tracking_number.trim(),
          proof_of_packing_url
        });
      } catch (err) {}
    }

    res.json({
      message: 'อัปเดตสถานะการจัดส่งพัสดุเรียบร้อย',
      status: 'shipped',
      courier_name,
      tracking_number: tracking_number.trim()
    });
  } catch (error) {
    console.error('Ship order error:', error);
    sendServerError(res, error);
  }
};

// 8. Get Real-time Tracking Status
exports.getTrackingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!orderResult.rows?.length) return res.status(404).json({ error: 'Order not found' });

    const order = orderResult.rows[0];
    if (!order.tracking_number) {
      return res.status(400).json({ error: 'ออเดอร์นี้ยังไม่มีหมายเลขพัสดุ' });
    }

    const tracking = await trackingService.getTrackingStatus(
      order.tracking_number,
      order.courier_name,
      order.updated_at
    );

    res.json(tracking);
  } catch (error) {
    console.error('Get tracking details error:', error);
    sendServerError(res, error);
  }
};

// 9. File a Dispute / Fraud Report
exports.fileDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.userId;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'กรุณาระบุเหตุผลในการแจ้งข้อพิพาทหรือรายงานปัญหา' });
    }

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!orderResult.rows?.length) return res.status(404).json({ error: 'Order not found' });

    const order = orderResult.rows[0];
    if (order.buyer_id !== userId && order.seller_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await pool.query(`
      UPDATE orders SET 
        status = 'disputed',
        dispute_status = 'reported',
        dispute_reason = ?,
        dispute_created_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [reason.trim(), id]);

    // Send system alert in chat
    const roomResult = await pool.query('SELECT id FROM chat_rooms WHERE order_id = ?', [id]);
    if (roomResult.rows?.length) {
      const roomId = roomResult.rows[0].id;
      const systemMsg = `🚨 [ระบบเตือนภัย] มีการรายงานข้อพิพาท/แจ้งเหตุฉ้อโกงสำหรับรายการนี้!\n` +
        `• เหตุผล: ${reason.trim()}\n` +
        `• ข้อมูลธุรกรรมทั้งหมดถูกล็อคเป็นหลักฐานดิจิทัลเพื่อใช้ในการดำเนินคดี`;

      await pool.query(`
        INSERT INTO chat_messages (room_id, sender_id, message_type, message)
        VALUES (?, NULL, 'system', ?)
      `, [roomId, systemMsg]);
    }

    res.json({ message: 'บันทึกรายงานข้อพิพาทเรียบร้อยแล้ว', status: 'disputed' });
  } catch (error) {
    console.error('File dispute error:', error);
    sendServerError(res, error);
  }
};

// 10. Export Legal Evidence Audit Summary
exports.exportLegalEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const orderResult = await pool.query(`
      SELECT
        o.*,
        bu.username as buyer_username, bu.email as buyer_email, bu.phone as buyer_phone,
        su.username as seller_username, su.email as seller_email, su.phone as seller_phone,
        ssp.shop_name, ssp.full_name as seller_full_name, ssp.id_card_number as seller_id_card,
        ssp.bank_name as seller_bank_name, ssp.bank_account_number as seller_bank_account,
        ssp.bank_account_name as seller_bank_account_name, ssp.is_verified as is_seller_verified
      FROM orders o
      JOIN users bu ON o.buyer_id = bu.id
      JOIN users su ON o.seller_id = su.id
      LEFT JOIN seller_profiles ssp ON ssp.user_id = su.id
      WHERE o.id = ?
    `, [id]);

    if (!orderResult.rows?.length) return res.status(404).json({ error: 'Order not found' });

    const order = orderResult.rows[0];
    if (order.buyer_id !== userId && order.seller_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Fetch items with serial numbers
    const itemsResult = await pool.query(`
      SELECT oi.*, p.serial_number, p.condition, p.proof_image_url, p.sn_image_url, p.is_prebuilt_set,
             p.brand, p.model
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [id]);

    // Fetch room chat history
    const roomResult = await pool.query('SELECT id FROM chat_rooms WHERE order_id = ?', [id]);
    let chatLogs = [];
    if (roomResult.rows?.length) {
      const msgs = await pool.query(`
        SELECT cm.id, cm.sender_id, cm.message_type, cm.message, cm.created_at, u.username as sender_name
        FROM chat_messages cm
        LEFT JOIN users u ON cm.sender_id = u.id
        WHERE cm.room_id = ?
        ORDER BY cm.id ASC
      `, [roomResult.rows[0].id]);
      chatLogs = msgs.rows || [];
    }

    res.json({
      document_title: 'ใบรายงานสรุปหลักฐานธุรกรรมอิเล็กทรอนิกส์ (Electronic Evidence Audit Dossier)',
      generated_at: new Date().toISOString(),
      order_id: order.id,
      order_status: order.status,
      created_at: order.created_at,
      total_price: Number(order.total_price),
      shipping: {
        address: order.shipping_address,
        contact_phone: order.contact_phone,
        courier: order.courier_name,
        tracking_number: order.tracking_number,
        proof_of_packing_url: order.proof_of_packing_url
      },
      payment: {
        slip_url: order.payment_slip_url,
        slip_verified_at: order.slip_verified_at,
        slip_trans_ref: order.slip_trans_ref,
        slip_amount: order.slip_amount
      },
      buyer: {
        id: order.buyer_id,
        username: order.buyer_username,
        email: order.buyer_email,
        phone: order.buyer_phone || order.contact_phone
      },
      seller_kyc: {
        id: order.seller_id,
        username: order.seller_username,
        shop_name: order.shop_name,
        full_name: order.seller_full_name,
        id_card: order.seller_id_card,
        bank_name: order.seller_bank_name,
        bank_account: order.seller_bank_account,
        bank_account_name: order.seller_bank_account_name,
        is_verified: order.is_seller_verified
      },
      items: itemsResult.rows,
      dispute: {
        status: order.dispute_status,
        reason: order.dispute_reason,
        reported_at: order.dispute_created_at
      },
      chat_history: chatLogs
    });
  } catch (error) {
    console.error('Export legal evidence error:', error);
    sendServerError(res, error);
  }
};

// 11. Create a seller review for a completed order (buyer only, one per order)
exports.createReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.userId;

    if (!isValidRating(rating)) {
      return res.status(400).json({ error: 'กรุณาให้คะแนน 1-5 ดาว' });
    }

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!orderResult.rows?.length) return res.status(404).json({ error: 'Order not found' });

    const order = orderResult.rows[0];
    if (order.buyer_id !== userId) {
      return res.status(403).json({ error: 'มีเพียงผู้ซื้อของออเดอร์นี้เท่านั้นที่จะให้คะแนนร้านค้าได้' });
    }
    if (order.status !== 'completed') {
      return res.status(400).json({ error: 'สามารถให้คะแนนได้เฉพาะออเดอร์ที่ได้รับสินค้าเรียบร้อยแล้วเท่านั้น' });
    }

    const existing = await pool.query('SELECT id FROM reviews WHERE order_id = ?', [id]);
    if (existing.rows?.length) {
      return res.status(409).json({ error: 'คุณให้คะแนนออเดอร์นี้ไปแล้ว สามารถแก้ไขรีวิวเดิมได้' });
    }

    await pool.query(
      'INSERT INTO reviews (order_id, reviewer_id, seller_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [id, userId, order.seller_id, rating, comment || null]
    );

    const newAverage = await refreshSellerRating(order.seller_id);

    res.status(201).json({ message: 'ให้คะแนนร้านค้าสำเร็จ ขอบคุณสำหรับรีวิว', seller_rating: newAverage });
  } catch (error) {
    console.error('Create review error:', error);
    sendServerError(res, error);
  }
};

// 12. Edit an existing review (buyer only, own review)
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.userId;

    if (!isValidRating(rating)) {
      return res.status(400).json({ error: 'กรุณาให้คะแนน 1-5 ดาว' });
    }

    const orderResult = await pool.query('SELECT seller_id FROM orders WHERE id = ?', [id]);
    if (!orderResult.rows?.length) return res.status(404).json({ error: 'Order not found' });
    const sellerId = orderResult.rows[0].seller_id;

    const existing = await pool.query('SELECT id, reviewer_id FROM reviews WHERE order_id = ?', [id]);
    if (!existing.rows?.length) {
      return res.status(404).json({ error: 'ยังไม่มีรีวิวสำหรับออเดอร์นี้' });
    }
    if (existing.rows[0].reviewer_id !== userId) {
      return res.status(403).json({ error: 'คุณไม่สามารถแก้ไขรีวิวของผู้อื่นได้' });
    }

    await pool.query('UPDATE reviews SET rating = ?, comment = ? WHERE order_id = ?', [rating, comment || null, id]);

    const newAverage = await refreshSellerRating(sellerId);

    res.json({ message: 'แก้ไขรีวิวสำเร็จ', seller_rating: newAverage });
  } catch (error) {
    console.error('Update review error:', error);
    sendServerError(res, error);
  }
};

// 13. Get the review for a specific order (used to render the "already reviewed" state)
exports.getReviewForOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const orderResult = await pool.query('SELECT buyer_id, seller_id FROM orders WHERE id = ?', [id]);
    if (!orderResult.rows?.length) return res.status(404).json({ error: 'Order not found' });

    const order = orderResult.rows[0];
    if (order.buyer_id !== userId && order.seller_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query('SELECT id, rating, comment, created_at, updated_at FROM reviews WHERE order_id = ?', [id]);
    res.json(result.rows?.[0] || null);
  } catch (error) {
    console.error('Get review for order error:', error);
    sendServerError(res, error);
  }
};
