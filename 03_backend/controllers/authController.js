const bcrypt = require('bcrypt');
const pool = require('../config/database');
const { generateToken } = require('../utils/jwt');
const { sendServerError } = require('../utils/errorHandler');

// 1. Sign up normal flow
exports.register = async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;

    if (!username || (!email && !phone) || !password) {
      return res.status(400).json({ error: 'Missing required fields (Username, Email or Phone, and Password are required)' });
    }

    if (email && (!email.includes('@') || !email.includes('.'))) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    // Check if user already exists
    let query = 'SELECT * FROM users WHERE username = ?';
    let params = [username];
    if (email) {
      query += ' OR email = ?';
      params.push(email);
    }
    if (phone) {
      query += ' OR phone = ?';
      params.push(phone);
    }

    const userExists = await pool.query(query, params);
    if (userExists.rows && userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Username, email, or phone number already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (username, email, password, phone, active_role) VALUES (?, ?, ?, ?, ?)',
      [username, email || null, hashedPassword, phone || null, 'buyer']
    );

    // Get the created user
    const result = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = result.rows[0];
    const token = generateToken(user.id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        active_role: user.active_role
      }
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// 2. Login normal flow
exports.login = async (req, res) => {
  try {
    const { email, phone, login_identifier, password } = req.body;
    const identifier = login_identifier || email || phone;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/Phone and password required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = ? OR phone = ?', [identifier, identifier]);
    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email/phone or password' });
    }

    const user = result.rows[0];
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'บัญชีนี้ถูกระงับการใช้งานชั่วคราว' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email/phone or password' });
    }

    const token = generateToken(user.id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        active_role: user.active_role,
        role: user.role
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// 3. Social login (Google / Facebook)
exports.socialLogin = async (req, res) => {
  try {
    let { social_type, social_id, email, username, avatar_url, credential } = req.body;

    // Support Google Identity Services (credential token)
    if (credential && (!social_id || social_type === 'google')) {
      social_type = 'google';
      try {
        // Decode Google JWT payload safely
        const base64Payload = credential.split('.')[1];
        const decoded = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
        if (decoded && decoded.sub) {
          social_id = decoded.sub;
          email = decoded.email || email;
          username = decoded.name || decoded.given_name || username;
          avatar_url = decoded.picture || avatar_url;
        }
      } catch (jwtErr) {
        console.warn('⚠️ Google token decode warning:', jwtErr.message);
      }
    }

    if (!social_type || !social_id) {
      return res.status(400).json({ error: 'Social type and Social ID are required' });
    }

    let userResult;
    if (social_type === 'google') {
      userResult = await pool.query('SELECT * FROM users WHERE google_id = ?', [social_id]);
    } else if (social_type === 'facebook') {
      userResult = await pool.query('SELECT * FROM users WHERE facebook_id = ?', [social_id]);
    } else {
      return res.status(400).json({ error: 'Invalid social type' });
    }

    let user;
    if (userResult.rows && userResult.rows.length > 0) {
      user = userResult.rows[0];
      // Update avatar or email if provided
      if (avatar_url || email) {
        await pool.query(
          'UPDATE users SET avatar_url = COALESCE(?, avatar_url), email = COALESCE(email, ?) WHERE id = ?',
          [avatar_url || null, email || null, user.id]
        );
      }
    } else {
      // Check if user with same email exists -> Link accounts
      if (email) {
        const existingEmailUser = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingEmailUser.rows && existingEmailUser.rows.length > 0) {
          const colName = social_type === 'google' ? 'google_id' : 'facebook_id';
          await pool.query(`UPDATE users SET ${colName} = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?`, [social_id, avatar_url || null, existingEmailUser.rows[0].id]);
          const updated = await pool.query('SELECT * FROM users WHERE id = ?', [existingEmailUser.rows[0].id]);
          user = updated.rows[0];
        }
      }

      if (!user) {
        // Create new user for social signup
        const finalEmail = email || `${social_type}_${social_id}@pcbuilderpro.com`;
        const finalUsername = username ? username.replace(/\s+/g, '_').toLowerCase() : `${social_type}_user_${social_id.substring(0, 5)}`;

        // Check if username already registered
        const checkResult = await pool.query('SELECT * FROM users WHERE username = ?', [finalUsername]);
        let uniqueUsername = finalUsername;
        if (checkResult.rows && checkResult.rows.length > 0) {
          uniqueUsername = `${finalUsername}_${Math.floor(Math.random() * 1000)}`;
        }

        const dummyPassword = await bcrypt.hash(Math.random().toString(36), 10);
        const colName = social_type === 'google' ? 'google_id' : 'facebook_id';
        
        await pool.query(
          `INSERT INTO users (username, email, password, ${colName}, avatar_url, active_role, is_email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uniqueUsername, finalEmail, dummyPassword, social_id, avatar_url || null, 'buyer', email ? 1 : 0]
        );

        const fetchResult = await pool.query(`SELECT * FROM users WHERE ${colName} = ?`, [social_id]);
        user = fetchResult.rows[0];
      }
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'บัญชีนี้ถูกระงับการใช้งานชั่วคราว' });
    }

    const token = generateToken(user.id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    res.json({
      message: 'Social login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        active_role: user.active_role,
        role: user.role
      }
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// 3.5. Logout flow
exports.logout = async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    sendServerError(res, error);
  }
};

// 4. Get Profile (Combined Buyer/Seller info)
exports.getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, avatar_url, phone, google_id, facebook_id, active_role,
              shop_name, seller_avatar_url, seller_address_province, seller_address_district, seller_phone,
              id_card_number as seller_id_card, seller_full_name, bank_name as seller_bank_name, bank_account_number as seller_bank_account, bank_account_name as seller_bank_account_name,
              is_seller_verified, seller_rating, sales_count, has_seller_badge,
              is_phone_verified, is_email_verified, created_at 
       FROM users WHERE id = ?`,
      [req.userId]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    const buildStats = await pool.query(
      `SELECT
        COUNT(*) as total_builds,
        0 as public_builds,
        COALESCE(SUM(total_price), 0) as total_spent
       FROM builds WHERE user_id = ?`,
      [req.userId]
    );

    // Fetch Buyer Orders
    const buyerOrders = await pool.query(
      `SELECT o.*, u.username as seller_name, r.id as review_id, r.rating as review_rating, r.comment as review_comment
       FROM orders o
       JOIN users u ON o.seller_id = u.id
       LEFT JOIN reviews r ON r.order_id = o.id
       WHERE o.buyer_id = ?
       ORDER BY o.created_at DESC`,
      [req.userId]
    );

    const buyerOrdersEnriched = [];
    for (const order of buyerOrders.rows || []) {
      const items = await pool.query(
        `SELECT oi.*, pr.brand, pr.model, pr.name as part_name, p.category_id, c.slug as category_slug
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN categories c ON p.category_id = c.id
         LEFT JOIN parts pr ON p.part_id = pr.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      buyerOrdersEnriched.push({ ...order, items: items.rows || [] });
    }

    // Fetch Seller Orders
    const sellerOrders = await pool.query(
      `SELECT o.*, u.username as buyer_name
       FROM orders o
       JOIN users u ON o.buyer_id = u.id
       WHERE o.seller_id = ?
       ORDER BY o.created_at DESC`,
      [req.userId]
    );

    const sellerOrdersEnriched = [];
    for (const order of sellerOrders.rows || []) {
      const items = await pool.query(
        `SELECT oi.*, pr.brand, pr.model, pr.name as part_name, p.category_id, c.slug as category_slug
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN categories c ON p.category_id = c.id
         LEFT JOIN parts pr ON p.part_id = pr.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      sellerOrdersEnriched.push({ ...order, items: items.rows || [] });
    }

    res.json({ 
      ...user, 
      stats: buildStats.rows[0],
      buyer_orders: buyerOrdersEnriched,
      seller_orders: sellerOrdersEnriched
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// 5. Update Profile (Basic info)
exports.updateProfile = async (req, res) => {
  try {
    const { username, email, avatar_url, phone } = req.body;
    const userId = req.userId;

    if (email) {
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (emailCheck.rows && emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    if (username) {
      const usernameCheck = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
      if (usernameCheck.rows && usernameCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    if (phone) {
      const phoneCheck = await pool.query('SELECT id FROM users WHERE phone = ? AND id != ?', [phone, userId]);
      if (phoneCheck.rows && phoneCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Phone number already in use' });
      }
    }

    await pool.query(
      `UPDATE users SET 
        username = COALESCE(?, username), 
        email = COALESCE(?, email), 
        avatar_url = COALESCE(?, avatar_url),
        phone = COALESCE(?, phone)
       WHERE id = ?`,
      [username, email, avatar_url, phone, userId]
    );

    const result = await pool.query(
      `SELECT id, username, email, phone, avatar_url, active_role, is_phone_verified, is_email_verified, created_at 
       FROM users WHERE id = ?`,
      [userId]
    );
    res.json({ message: 'Profile updated', user: result.rows[0] });
  } catch (error) {
    sendServerError(res, error);
  }
};

// 6. Change Password
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.userId;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Both current and new password required' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const userResult = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
    const passwordMatch = await bcrypt.compare(current_password, userResult.rows[0].password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    sendServerError(res, error);
  }
};

// 7. Send OTP (Mock Implementation)
exports.sendOTP = async (req, res) => {
  try {
    const { email_or_phone } = req.body;
    if (!email_or_phone) {
      return res.status(400).json({ error: 'Email or Phone is required' });
    }

    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiration
    const expiresAtStr = expiresAt.toISOString().replace('T', ' ').substring(0, 19);

    await pool.query(
      'INSERT INTO otps (email_or_phone, code, expires_at) VALUES (?, ?, ?)',
      [email_or_phone, code, expiresAtStr]
    );

    // Print to server logs for verification/developer use
    console.log(`\n========================================`);
    console.log(`[MOCK OTP SERVICE]`);
    console.log(`To: ${email_or_phone}`);
    console.log(`OTP Code: ${code}`);
    console.log(`Expires in: 5 minutes`);
    console.log(`========================================\n`);

    res.json({
      message: `OTP code sent successfully to ${email_or_phone}`,
      code // Return in body for easier mock frontend consumption
    });
  } catch (error) {
    sendServerError(res, error);
  }
};

// 8. Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email_or_phone, code } = req.body;
    if (!email_or_phone || !code) {
      return res.status(400).json({ error: 'Email/Phone and OTP code are required' });
    }

    // Check OTP record
    const result = await pool.query(
      `SELECT * FROM otps 
       WHERE email_or_phone = ? AND code = ? AND is_verified = 0 
       ORDER BY created_at DESC LIMIT 1`,
      [email_or_phone, code]
    );

    let otpRow = result.rows?.[0];
    
    // JS Fallback check for timezone discrepancies
    if (!otpRow) {
      const fallbackResult = await pool.query(
        'SELECT * FROM otps WHERE email_or_phone = ? AND code = ? AND is_verified = 0 ORDER BY created_at DESC LIMIT 1',
        [email_or_phone, code]
      );
      const row = fallbackResult.rows?.[0];
      if (row) {
        const expiresTime = new Date(row.expires_at.replace(' ', 'T') + 'Z').getTime();
        // Allow within 5 minutes of created time
        if (expiresTime > Date.now() - 5 * 60 * 1000) {
          otpRow = row;
        }
      }
    }

    if (!otpRow) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' });
    }

    // Mark as verified
    await pool.query('UPDATE otps SET is_verified = 1 WHERE id = ?', [otpRow.id]);

    // If request has active logged-in user, verify their status
    if (req.userId) {
      const isEmail = email_or_phone.includes('@');
      if (isEmail) {
        await pool.query('UPDATE users SET is_email_verified = 1, email = ? WHERE id = ?', [email_or_phone, req.userId]);
      } else {
        await pool.query('UPDATE users SET is_phone_verified = 1, phone = ? WHERE id = ?', [email_or_phone, req.userId]);
      }
    }

    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    sendServerError(res, error);
  }
};

// 8.5 Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email_or_phone, code, new_password } = req.body;
    if (!email_or_phone || !code || !new_password) {
      return res.status(400).json({ error: 'Email/Phone, OTP code, and new password are required' });
    }

    // Check OTP record
    const result = await pool.query(
      `SELECT * FROM otps 
       WHERE email_or_phone = ? AND code = ? AND is_verified = 0 
       ORDER BY created_at DESC LIMIT 1`,
      [email_or_phone, code]
    );

    let otpRow = result.rows?.[0];
    
    // JS Fallback check for timezone discrepancies
    if (!otpRow) {
      const fallbackResult = await pool.query(
        'SELECT * FROM otps WHERE email_or_phone = ? AND code = ? AND is_verified = 0 ORDER BY created_at DESC LIMIT 1',
        [email_or_phone, code]
      );
      const row = fallbackResult.rows?.[0];
      if (row) {
        const expiresTime = new Date(row.expires_at.replace(' ', 'T') + 'Z').getTime();
        if (expiresTime > Date.now() - 5 * 60 * 1000) {
          otpRow = row;
        }
      }
    }

    if (!otpRow) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' });
    }

    // Find user
    const userRes = await pool.query('SELECT * FROM users WHERE email = ? OR phone = ? LIMIT 1', [email_or_phone, email_or_phone]);
    const user = userRes.rows?.[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

    // Mark OTP as verified
    await pool.query('UPDATE otps SET is_verified = 1 WHERE id = ?', [otpRow.id]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    sendServerError(res, error);
  }
};

// 9. Switch active user role (buyer / seller)
exports.switchRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || (role !== 'buyer' && role !== 'seller')) {
      return res.status(400).json({ error: 'Role must be either "buyer" or "seller"' });
    }

    if (role === 'seller') {
      const userRes = await pool.query(
        'SELECT shop_name, bank_account_number, is_seller_verified FROM users WHERE id = ?',
        [req.userId]
      );
      const user = userRes.rows?.[0];
      const isRegistered = user && (user.is_seller_verified === 1 || (user.shop_name && user.bank_account_number));
      if (!isRegistered) {
        return res.status(403).json({
          error: 'คุณยังไม่ได้ลงทะเบียนเป็นผู้ขาย กรุณากรอกข้อมูลร้านค้าและเลขบัญชีธนาคารเพื่อเริ่มต้นขายสินค้า',
          requires_seller_registration: true
        });
      }
    }

    await pool.query('UPDATE users SET active_role = ? WHERE id = ?', [role, req.userId]);
    res.json({ message: `Switched active role to ${role}`, active_role: role });
  } catch (error) {
    sendServerError(res, error);
  }
};

// 9.5. Register as a Seller (Onboarding & KYC)
exports.registerSeller = async (req, res) => {
  try {
    const {
      shop_name,
      seller_phone,
      seller_bank_name,
      seller_bank_account,
      seller_bank_account_name,
      seller_full_name,
      seller_address_province,
      seller_address_district,
      seller_id_card,
      seller_avatar_url
    } = req.body;
    const userId = req.userId;

    if (!shop_name || !seller_phone || !seller_bank_account || !seller_address_province) {
      return res.status(400).json({
        error: 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วน (ชื่อร้านค้า, เบอร์โทร, เลขบัญชีธนาคาร และจังหวัด)'
      });
    }

    const fullName = seller_full_name || seller_bank_account_name || shop_name;
    const bankAccountName = seller_bank_account_name || seller_full_name || shop_name;

    await pool.query(
      `UPDATE users SET
        shop_name = ?,
        seller_phone = ?,
        bank_name = ?,
        bank_account_number = ?,
        bank_account_name = ?,
        seller_bank_name = ?,
        seller_bank_account = ?,
        seller_bank_account_name = ?,
        seller_full_name = ?,
        seller_address_province = ?,
        seller_address_district = ?,
        id_card_number = COALESCE(?, id_card_number),
        seller_avatar_url = COALESCE(?, seller_avatar_url),
        kyc_status = 'pending',
        active_role = 'seller'
       WHERE id = ?`,
      [
        shop_name,
        seller_phone,
        seller_bank_name || 'ธนาคารกสิกรไทย (KBANK)',
        seller_bank_account,
        bankAccountName,
        seller_bank_name || 'ธนาคารกสิกรไทย (KBANK)',
        seller_bank_account,
        bankAccountName,
        fullName,
        seller_address_province,
        seller_address_district || null,
        seller_id_card || null,
        seller_avatar_url || null,
        userId
      ]
    );

    const result = await pool.query(
      `SELECT id, username, email, phone, avatar_url, active_role,
              shop_name, seller_avatar_url, seller_address_province, seller_address_district, seller_phone,
              seller_full_name, bank_name as seller_bank_name, bank_account_number as seller_bank_account, bank_account_name as seller_bank_account_name,
              id_card_number as seller_id_card, is_seller_verified, has_seller_badge, seller_rating, sales_count
       FROM users WHERE id = ?`,
      [userId]
    );

    res.status(200).json({
      message: 'ลงทะเบียนเป็นผู้ขายและยืนยันตัวตนสำเร็จ!',
      user: result.rows[0]
    });
  } catch (error) {
    sendServerError(res, error);
  }
};


// 10. Update Seller Profile Info
exports.updateSellerProfile = async (req, res) => {
  try {
    const {
      shop_name,
      seller_avatar_url,
      seller_address_province,
      seller_address_district,
      seller_phone,
      seller_bank_name,
      seller_bank_account,
      seller_bank_account_name,
      seller_full_name
    } = req.body;
    const userId = req.userId;

    await pool.query(
      `UPDATE users SET 
        shop_name = COALESCE(?, shop_name), 
        seller_avatar_url = COALESCE(?, seller_avatar_url),
        seller_address_province = COALESCE(?, seller_address_province),
        seller_address_district = COALESCE(?, seller_address_district),
        seller_phone = COALESCE(?, seller_phone),
        seller_bank_name = COALESCE(?, seller_bank_name),
        seller_bank_account = COALESCE(?, seller_bank_account),
        seller_bank_account_name = COALESCE(?, seller_bank_account_name),
        seller_full_name = COALESCE(?, seller_full_name)
       WHERE id = ?`,
      [
        shop_name || null, 
        seller_avatar_url || null, 
        seller_address_province || null, 
        seller_address_district || null, 
        seller_phone || null, 
        seller_bank_name || null,
        seller_bank_account || null, 
        seller_bank_account_name || null,
        seller_full_name || null,
        userId
      ]
    );

    const result = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    res.json({ message: 'Seller profile updated successfully', user: result.rows[0] });
  } catch (error) {
    sendServerError(res, error);
  }
};

// 11. Verify Seller KYC (Verify ID Card + Bank Account)
exports.verifySellerIdentity = async (req, res) => {
  try {
    const { id_card, full_name, bank_name, bank_account, bank_account_name, phone, kyc_document_url } = req.body;
    const userId = req.userId;

    if (!id_card || !bank_account || !phone || !kyc_document_url) {
      return res.status(400).json({ error: 'กรุณากรอกเลขบัตรประชาชน เลขบัญชีธนาคาร เบอร์โทรศัพท์ และอัปโหลดเอกสารยืนยันตัวตนให้ครบถ้วน' });
    }

    const officialFullName = full_name || bank_account_name;
    const officialAccountName = bank_account_name || full_name;

    // Update seller identity fields and set to pending
    await pool.query(
      `UPDATE users SET
        id_card_number = ?,
        seller_full_name = COALESCE(?, seller_full_name),
        bank_name = COALESCE(?, bank_name),
        bank_account_number = ?,
        bank_account_name = COALESCE(?, bank_account_name),
        seller_bank_name = COALESCE(?, seller_bank_name),
        seller_bank_account = ?,
        seller_bank_account_name = COALESCE(?, seller_bank_account_name),
        seller_phone = ?,
        kyc_status = 'pending',
        kyc_document_url = COALESCE(?, kyc_document_url),
        is_phone_verified = 1,
        phone = COALESCE(phone, ?)
       WHERE id = ?`,
      [id_card, officialFullName || null, bank_name || null, bank_account, officialAccountName || null, bank_name || null, bank_account, officialAccountName || null, phone, kyc_document_url, phone, userId]
    );

    const result = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    res.json({ message: 'ส่งข้อมูลยืนยันตัวตนสำเร็จ กรุณารอผู้ดูแลระบบตรวจสอบเอกสาร!', user: result.rows[0] });
  } catch (error) {
    sendServerError(res, error);
  }
};

// 12. Get shipping addresses
exports.getBuyerAddresses = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM buyer_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC', [req.userId]);
    res.json(result.rows || []);
  } catch (error) {
    sendServerError(res, error);
  }
};

// 13. Add shipping address
exports.addBuyerAddress = async (req, res) => {
  try {
    const { recipient_name, phone, address_line1, address_line2, district, sub_district, province, postal_code, is_default } = req.body;
    const userId = req.userId;

    if (!recipient_name || !phone || !address_line1 || !district || !sub_district || !province || !postal_code) {
      return res.status(400).json({ error: 'Missing required address fields' });
    }

    // If default, unset other defaults
    if (is_default) {
      await pool.query('UPDATE buyer_addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    }

    // If this is the first address, make it default
    const countResult = await pool.query('SELECT COUNT(*) as count FROM buyer_addresses WHERE user_id = ?', [userId]);
    const isFirstAddress = countResult.rows?.[0]?.count === 0;
    const finalDefault = (is_default || isFirstAddress) ? 1 : 0;

    await pool.query(
      `INSERT INTO buyer_addresses (
        user_id, recipient_name, phone, address_line1, address_line2, district, sub_district, province, postal_code, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, recipient_name, phone, address_line1, address_line2 || null, district, sub_district, province, postal_code, finalDefault]
    );

    res.status(201).json({ message: 'Address added successfully' });
  } catch (error) {
    sendServerError(res, error);
  }
};

// 14. Update shipping address
exports.updateBuyerAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipient_name, phone, address_line1, address_line2, district, sub_district, province, postal_code, is_default } = req.body;
    const userId = req.userId;

    const addrResult = await pool.query('SELECT * FROM buyer_addresses WHERE id = ? AND user_id = ?', [id, userId]);
    if (!addrResult.rows || addrResult.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found or unauthorized' });
    }

    if (is_default) {
      await pool.query('UPDATE buyer_addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    }

    await pool.query(
      `UPDATE buyer_addresses SET 
        recipient_name = COALESCE(?, recipient_name),
        phone = COALESCE(?, phone),
        address_line1 = COALESCE(?, address_line1),
        address_line2 = COALESCE(?, address_line2),
        district = COALESCE(?, district),
        sub_district = COALESCE(?, sub_district),
        province = COALESCE(?, province),
        postal_code = COALESCE(?, postal_code),
        is_default = COALESCE(?, is_default)
       WHERE id = ? AND user_id = ?`,
      [recipient_name, phone, address_line1, address_line2, district, sub_district, province, postal_code, is_default, id, userId]
    );

    res.json({ message: 'Address updated successfully' });
  } catch (error) {
    sendServerError(res, error);
  }
};

// 15. Delete shipping address
exports.deleteBuyerAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const addrResult = await pool.query('SELECT * FROM buyer_addresses WHERE id = ? AND user_id = ?', [id, userId]);
    if (!addrResult.rows || addrResult.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found or unauthorized' });
    }

    const wasDefault = addrResult.rows[0].is_default === 1;

    await pool.query('DELETE FROM buyer_addresses WHERE id = ? AND user_id = ?', [id, userId]);

    if (wasDefault) {
      const nextAddr = await pool.query('SELECT id FROM buyer_addresses WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId]);
      if (nextAddr.rows && nextAddr.rows.length > 0) {
        await pool.query('UPDATE buyer_addresses SET is_default = 1 WHERE id = ?', [nextAddr.rows[0].id]);
      }
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    sendServerError(res, error);
  }
};

// 16. Get Wishlist items
exports.getWishlist = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.id as wishlist_id, p.*, c.name as category_name, c.slug as category_slug, 
              parts.name as part_name, parts.brand, parts.model, u.username as seller_name
       FROM wishlists w
       JOIN products p ON w.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       JOIN users u ON p.seller_id = u.id
       LEFT JOIN parts ON p.part_id = parts.id
       WHERE w.user_id = ?`,
      [req.userId]
    );

    // Attach photos if any
    const items = result.rows || [];
    const enrichedItems = [];
    for (const item of items) {
      const photos = await pool.query(
        'SELECT image_url FROM product_photos WHERE product_id = ? ORDER BY display_order ASC, id ASC',
        [item.id]
      );
      enrichedItems.push({
        ...item,
        photos: (photos.rows || []).map((row) => row.image_url)
      });
    }

    res.json(enrichedItems);
  } catch (error) {
    sendServerError(res, error);
  }
};

// 17. Add to Wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const prodResult = await pool.query('SELECT id FROM products WHERE id = ?', [product_id]);
    if (!prodResult.rows || prodResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await pool.query(
      'INSERT IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)',
      [req.userId, product_id]
    );

    res.status(201).json({ message: 'Product added to wishlist' });
  } catch (error) {
    sendServerError(res, error);
  }
};

// 18. Remove from Wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    await pool.query('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', [req.userId, productId]);
    res.json({ message: 'Product removed from wishlist' });
  } catch (error) {
    sendServerError(res, error);
  }
};
