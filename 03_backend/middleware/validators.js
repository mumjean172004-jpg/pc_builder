const { body, validationResult } = require('express-validator');

// Common middleware to handle validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

// 1. Validator for User Registration
exports.registerValidator = [
  body('username')
    .trim()
    .isLength({ min: 3 })
    .withMessage('ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร')
    .matches(/^[a-zA-Z0-9_\-]+$/)
    .withMessage('ชื่อผู้ใช้ต้องเป็นตัวอักษร ภาษาอังกฤษ ตัวเลข หรือขีดล่างเท่านั้น'),

  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('รูปแบบอีเมลไม่ถูกต้อง'),

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{9,10}$/)
    .withMessage('เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร'),

  // Custom check: either email or phone must be provided
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phone) {
      throw new Error('กรุณากรอกอีเมล หรือ เบอร์โทรศัพท์ อย่างใดอย่างหนึ่ง');
    }
    return true;
  }),

  validate
];

// 2. Validator for Product Listing
exports.productValidator = [
  body('price')
    .isFloat({ min: 0 })
    .withMessage('ราคาสินค้าต้องเป็นตัวเลขและห้ามติดลบ'),

  body('stock_quantity')
    .isInt({ min: 1 })
    .withMessage('จำนวนสินค้าต้องเป็นจำนวนเต็มตั้งแต่ 1 ชิ้นขึ้นไป'),

  body('condition')
    .isIn(['new', 'used_90', 'used_80', 'used_70'])
    .withMessage('สภาพสินค้าไม่ถูกต้อง'),

  body('serial_number')
    .trim()
    .notEmpty()
    .withMessage('กรุณาระบุ Serial Number ของสินค้า'),

  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .escape(), // Prevent XSS by escaping HTML tags

  validate
];

// 3. Validator for Order Booking
exports.bookingValidator = [
  body('shipping_address')
    .trim()
    .notEmpty()
    .withMessage('กรุณาระบุที่อยู่จัดส่ง'),

  body('contact_phone')
    .trim()
    .matches(/^[0-9]{9,10}$/)
    .withMessage('เบอร์โทรศัพท์ติดต่อปลายทางไม่ถูกต้อง (ต้องเป็นตัวเลข 9-10 หลัก)'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('ต้องมีรายการสินค้าอย่างน้อย 1 ชิ้นสำหรับการสั่งซื้อ'),

  validate
];

// 4. Validator for Seller Registration
exports.sellerRegistrationValidator = [
  body('shop_name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('ชื่อร้านค้า/ชื่อผู้ขายต้องมีความยาวอย่างน้อย 2 ตัวอักษร'),

  body('seller_phone')
    .trim()
    .matches(/^[0-9]{9,10}$/)
    .withMessage('เบอร์โทรศัพท์ร้านค้าต้องเป็นตัวเลข 9-10 หลัก'),

  body('seller_bank_account')
    .trim()
    .notEmpty()
    .withMessage('กรุณาระบุชื่อธนาคารและเลขที่บัญชีสำหรับรับเงิน'),

  body('seller_address_province')
    .trim()
    .notEmpty()
    .withMessage('กรุณาระบุจังหวัดที่อยู่ร้านค้า/จัดส่ง'),

  body('seller_id_card')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{13}$/)
    .withMessage('เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก'),

  validate
];

