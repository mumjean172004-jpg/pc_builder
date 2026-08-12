# 💾 Database Schema (MySQL/MariaDB)

ฐานข้อมูลของโครงการเปลี่ยนจาก SQLite มาเป็น **MySQL / MariaDB** (เชื่อมต่อผ่าน Connection Pool บนโฮสต์ `localhost:3306`) ด้านล่างนี้คือตารางฟิลด์ ข้อจำกัด และอินเด็กซ์ทั้งหมดที่ทำงานอยู่จริงในปัจจุบัน — ตรงกับ [schema_mysql.sql](file:///c:/Users/Kanomjean/Downloads/project/02_database/schema_mysql.sql) ทุกฟิลด์ (แหล่งข้อมูลจริง, ถ้าเอกสารนี้กับไฟล์ .sql ขัดแย้งกันให้ยึดไฟล์ .sql เป็นหลัก)

**รวมทั้งหมด 19 ตาราง**

---

## 🗄️ Database Tables (ตารางข้อมูลทั้งหมด)

### 1. `users` (ข้อมูลผู้ใช้)
เก็บประวัติบัญชีผู้ใช้งาน, ข้อมูลผู้ขาย/KYC, และสิทธิ์การใช้งาน
* `id` (INT, PK, Auto Increment)
* `username` (VARCHAR(255), Unique, Not Null)
* `email` (VARCHAR(255), Unique, Not Null)
* `password` (VARCHAR(255), Not Null) — bcrypt hash
* `avatar_url` (TEXT, Default Null)
* `phone` (VARCHAR(50), Unique, Default Null)
* `google_id` / `facebook_id` (VARCHAR(255), Unique, Default Null) — สำหรับ Social Login
* `active_role` (VARCHAR(50), Default `'buyer'`) — `'buyer'` หรือ `'seller'` (สลับได้ในโปรไฟล์)
* `shop_name`, `seller_avatar_url`, `seller_address_province`, `seller_address_district`, `seller_phone` — ข้อมูลร้านค้า (เขียนโดย `registerSeller`/`updateSellerProfile`)
* `is_seller_verified` (TINYINT, Default 0) — สถานะยืนยัน KYC ผู้ขาย
* `seller_id_card`, `seller_full_name`, `seller_bank_name`, `seller_bank_account`, `seller_bank_account_name` — ข้อมูล KYC/บัญชีธนาคารรับเงิน (คอลัมน์ใหม่ที่ buyer-facing แสดงผลจริง — `bookingController.js`/`productController.js` อ่านจากชุดนี้)
* `id_card_number`, `bank_account_number`, `bank_name`, `bank_account_name`, `kyc_status` (Default `'none'`), `kyc_document_url` — คอลัมน์ **legacy** ที่ `registerSeller`/`verifySellerIdentity` เขียนคู่ขนานไปกับชุดข้างบน (ดู [[08_design_system/UI_UX_Guidelines]] §10 เรื่องบั๊กบัญชีธนาคารซ้อนคอลัมน์) — **เพิ่มเข้า `schema_mysql.sql` เมื่อ 2026-08-13** หลังพบว่า Railway (สร้างจากไฟล์นี้ตรงๆ) ไม่มี 6 คอลัมน์นี้เลย ทำให้สมัครผู้ขาย/ยืนยัน KYC พังบน production จนกว่าจะไล่เพิ่มคอลัมน์ให้ตรงกับเครื่อง local ย้อนหลัง — **ก่อนหน้านี้คอลัมน์เหล่านี้เคยถูกเพิ่มเข้าเครื่อง local ผ่าน migration script แยกโดยไม่เคยใส่กลับเข้าไฟล์นี้ ทำให้ schema ไฟล์นี้กับของจริงไม่ตรงกันมานาน**
* `seller_rating` (DECIMAL(3,2), Default `0.00`) — คำนวณจากค่าเฉลี่ยของตาราง `reviews` จริง อัปเดตทุกครั้งที่มีรีวิวใหม่/แก้ไข/ลบ (ดู `services/reviewService.js`) ไม่ใช่ค่าคงที่แล้ว
* `sales_count` (INT, Default 0)
* `has_seller_badge` (TINYINT, Default 0)
* `is_phone_verified`, `is_email_verified` (TINYINT, Default 0)
* `role` (VARCHAR(50), Default `'member'`) — `'member'` หรือ `'admin'`
* `status` (VARCHAR(50), Default `'active'`) — `'active'` หรือ `'suspended'`
* `created_at` (DATETIME, Default Current Timestamp)

### 2. `categories` (หมวดหมู่ชิ้นส่วน)
* `id` (INT, PK, Auto Increment)
* `name` (VARCHAR(255), Not Null)
* `slug` (VARCHAR(255), Unique, Not Null)
* `icon` (VARCHAR(100), Default `'microchip'`)
* `display_order` (INT, Default 0)
* `created_at` (DATETIME, Default Current Timestamp)

### 3. `parts` (แคตตาล็อกอะไหล่มาตรฐาน)
ใช้เป็นราคาอ้างอิง (MSRP) สำหรับตรวจจับสินค้ามือสองราคาต่ำผิดปกติ และเป็นฐานข้อมูลสเปกสำหรับระบบจัดสเปกคอม — จัดการผ่านหน้าแอดมิน "คลังอะไหล่มาตรฐาน" (เพิ่ม/แก้ไข/ลบได้ — ลบถูกบล็อกที่ระดับฐานข้อมูลถ้ามีสินค้า/ชุดจัดสเปคอ้างอิงอยู่)
* `id` (INT, PK, Auto Increment)
* `name` (VARCHAR(255), Not Null)
* `category_id` (INT, Not Null, FK → `categories.id` ON DELETE RESTRICT)
* `brand` (VARCHAR(255), Not Null)
* `model` (VARCHAR(255), Default Null)
* `specs` (**TEXT**, Not Null) — เก็บ JSON string (ไม่ใช่ native JSON type), parse/stringify ฝั่งแอปพลิเคชัน
* `price` (DECIMAL(10,2), Not Null, Default 0) — ราคากลาง MSRP
* `image_url` (TEXT, Default Null)
* `is_active` (TINYINT, Default 1)
* `created_at` (DATETIME, Default Current Timestamp)

### 4. `products` (รายการสินค้าลงประกาศขายตลาด C2C)
* `id` (INT, PK, Auto Increment)
* `seller_id` (INT, Not Null, FK → `users.id` ON DELETE CASCADE)
* `category_id` (INT, Not Null, FK → `categories.id`)
* `part_id` (INT, Default Null, FK → `parts.id`)
* `condition` (VARCHAR(50), Not Null, CHECK) — `'new'`, `'used_90'`, `'used_80'`, `'used_70'`
* `remaining_warranty_months` (INT, Default 0)
* `price` (DECIMAL(10,2), Not Null)
* `stock_quantity` (INT, Default 1)
* `serial_number` (VARCHAR(255), Not Null)
* `description` (TEXT, Default Null)
* `status` (VARCHAR(50), Default `'active'`, CHECK) — `'active'`, `'sold'`, `'paused'`
* `review_status` (VARCHAR(50), Default `'approved'`, CHECK) — `'approved'`, `'pending_review'`, `'rejected'`
* `suspicious_score` (INT, Default 0) — **ไม่ถูก cap ที่ 100**, ดูรายละเอียดการคำนวณใน [[05_pc_builder/Marketplace_Listing_Checks]]
* `suspicious_reasons` (**TEXT**, Not Null) — เก็บ JSON array string
* `proof_image_url`, `sn_image_url` (TEXT, Default Null) — รูปหลักฐานคู่ป้ายชื่อร้าน/รูปซีเรียลนัมเบอร์
* `is_prebuilt_set` (TINYINT, Default 0), `prebuilt_specs`, `prebuilt_components` (TEXT, Default Null) — สำหรับประกาศขายคอมเซ็ตสำเร็จรูป
* `allow_hand_pickup` (TINYINT, Default 1), `allow_cod` (TINYINT, Default 0), `allow_express` (TINYINT, Default 1) — ช่องทางจัดส่งที่ผู้ขายเปิดรับ
* `pickup_location` (VARCHAR(255), Default Null)
* `created_at`, `updated_at` (DATETIME)

### 5. `product_photos`
* `id` (INT, PK), `product_id` (FK → `products.id` ON DELETE CASCADE), `image_url` (TEXT, Not Null), `display_order` (INT, Default 0)

### 6. `product_review_flags` (รายการปักธงเตือนของแอดมิน)
* `id` (INT, PK), `product_id` (FK → `products.id` ON DELETE CASCADE), `reason` (TEXT, Not Null), `severity` (CHECK: `'low'`/`'medium'`/`'high'`), `created_at`

### 7. `builds` (รายการจัดสเปกคอมพิวเตอร์)
* `id` (INT, PK), `user_id` (FK → `users.id` ON DELETE CASCADE), `name` (VARCHAR(255), Not Null), `description` (TEXT), `is_public` (TINYINT, Default 1), `total_price` (DECIMAL(12,2), Default 0), `created_at`, `updated_at`

### 8. `build_parts` (many-to-many)
* `id` (INT, PK), `build_id` (FK → `builds.id` ON DELETE CASCADE), `part_id` (FK → `parts.id` ON DELETE **RESTRICT**), `quantity` (INT, Default 1) — *Constraint*: `UNIQUE(build_id, part_id)`

### 9. `build_likes`
* `id` (INT, PK), `build_id` (FK → `builds.id` ON DELETE CASCADE), `user_id` (FK → `users.id` ON DELETE CASCADE), `created_at` — *Constraint*: `UNIQUE(build_id, user_id)` (กันกดไลก์ซ้ำ)

### 10. `build_comments`
* `id` (INT, PK), `build_id` (FK → `builds.id` ON DELETE CASCADE), `user_id` (FK → `users.id` ON DELETE CASCADE), `content` (TEXT, Not Null), `created_at`

---

## 💳 ตารางออเดอร์เจรจาซื้อขายและการเงิน

### 11. `orders` (รายการสั่งจอง / สัญญาข้อตกลงซื้อขาย)
* `id` (INT, PK, Auto Increment)
* `buyer_id`, `seller_id` (INT, Not Null, FK → `users.id` ON DELETE CASCADE)
* `status` (VARCHAR(50), Default `'pending'`)
  * *Constraint*: `CHECK (status IN ('pending', 'waiting_verification', 'paid', 'shipped', 'completed', 'cancelled', 'disputed'))` — **7 สถานะ** (ไม่ใช่ 6 — เพิ่ม `'disputed'` เข้ามาสำหรับระบบข้อพิพาท)
* `shipping_address` (TEXT, Not Null), `contact_phone` (VARCHAR(50), Not Null)
* `total_price` (DECIMAL(12,2), Not Null) — เปลี่ยนจาก INT เมื่อ 2026-08-12 (ดูหมายเหตุด้านล่าง)
* `shipping_method` (VARCHAR(50), Default `'express'`), `shipping_type` (VARCHAR(50), Default `'parcel'`)
* `courier_name`, `tracking_number` (VARCHAR(100), Default Null)
* `pickup_location` (TEXT, Default Null), `proof_of_packing_url` (TEXT, Default Null)
* `is_risk_accepted` (TINYINT, Default 0), `risk_accepted_at` (DATETIME, Default Null) — ยืนยันรับความเสี่ยงสำหรับออเดอร์มูลค่าสูงที่เลือกจัดส่งแบบโอนเงินก่อน
* `payment_slip_url` (VARCHAR(255), Default Null)
* `slip_verified_at` (DATETIME), `slip_trans_ref` (VARCHAR(100)), `slip_amount` (DECIMAL(10,2)) — ผลตรวจสอบสลิป
* `dispute_status` (VARCHAR(50), Default Null), `dispute_reason` (TEXT, Default Null), `dispute_created_at` (DATETIME, Default Null) — ระบบข้อพิพาท (ดู [[08_design_system/UI_UX_Guidelines]] §9)
* `created_at`, `updated_at` (DATETIME)

### 12. `order_items`
* `id` (INT, PK), `order_id` (FK → `orders.id` ON DELETE CASCADE), `product_id` (FK → `products.id`), `price` (INT, Not Null)

### 13. `chat_rooms`
* `id` (INT, PK), `order_id` (FK → `orders.id` ON DELETE **SET NULL**), `buyer_id`/`seller_id` (FK → `users.id` ON DELETE CASCADE), `created_at`

### 14. `chat_messages`
* `id` (INT, PK), `room_id` (FK → `chat_rooms.id` ON DELETE CASCADE), `sender_id` (Default Null — NULL หมายถึงข้อความระบบ), `message_type` (CHECK: `'text'`/`'system'`), `message` (TEXT, Not Null), `created_at`

---

## 👤 ตารางฟีเจอร์ผู้ใช้เพิ่มเติม

### 15. `buyer_addresses` (ที่อยู่จัดส่งของผู้ซื้อ)
* `id` (INT, PK), `user_id` (FK → `users.id` ON DELETE CASCADE), `recipient_name`, `phone` (VARCHAR, Not Null), `address_line1` (TEXT, Not Null), `address_line2` (TEXT, Default Null), `sub_district` (VARCHAR(255), Default Null), `district`, `province`, `postal_code` (Not Null), `is_default` (TINYINT, Default 0)

### 16. `wishlists` (รายการที่ถูกใจ)
* `id` (INT, PK), `user_id` (FK → `users.id` ON DELETE CASCADE), `product_id` (FK → `products.id` ON DELETE CASCADE), `created_at` — *Constraint*: `UNIQUE(user_id, product_id)` (เพิ่มซ้ำได้อย่างปลอดภัย ไม่ error — endpoint ใช้ `INSERT IGNORE`)

### 17. `otps` (รหัสยืนยันตัวตนชั่วคราว)
* `id` (INT, PK), `email_or_phone` (VARCHAR(255), Not Null), `code` (VARCHAR(50), Not Null), `expires_at` (DATETIME, Not Null), `is_verified` (TINYINT, Default 0), `created_at`

### 18. `admin_logs` (บันทึกการกระทำของแอดมิน)
* `id` (INT, PK), `admin_id` (FK → `users.id` ON DELETE CASCADE), `action` (VARCHAR(255), Not Null), `details` (TEXT, Default Null), `created_at`

### 19. `reviews` (รีวิว/ให้คะแนนร้านค้าโดยผู้ซื้อ)
* `id` (INT, PK), `order_id` (FK → `orders.id` ON DELETE CASCADE), `reviewer_id` (FK → `users.id`, ผู้ซื้อ), `seller_id` (FK → `users.id`, ผู้ขายที่ถูกรีวิว), `rating` (INT 1-5, Not Null), `comment` (TEXT, Default Null), `created_at`, `updated_at` — *Constraint*: `UNIQUE(order_id)` (รีวิวได้ 1 ครั้งต่อออเดอร์เท่านั้น)
* ระบบทางเดียว (ผู้ซื้อรีวิวผู้ขายเท่านั้น) รีวิวได้เฉพาะออเดอร์ที่ `orders.status = 'completed'` — ทุกครั้งที่สร้าง/แก้ไขรีวิว `users.seller_rating` จะถูกคำนวณใหม่ทันที (ดู `services/reviewService.js`)

---

## ⚡ Active Database Indexes (อินเด็กซ์ดักการค้นหาความเร็วสูง)
`idx_parts_category`, `idx_parts_brand`, `idx_parts_price`, `idx_products_seller`, `idx_products_category`, `idx_products_part`, `idx_products_status (status, review_status)`, `idx_product_photos_product`, `idx_builds_user`, `idx_builds_public`, `idx_build_parts_build`, `idx_build_likes_build`, `idx_build_comments_build`, `idx_orders_buyer`, `idx_orders_seller`, `idx_order_items_order`, `idx_chat_rooms_order`, `idx_chat_rooms_members (buyer_id, seller_id)`, `idx_chat_messages_room`, `idx_buyer_addresses_user`, `idx_wishlists_user`, `idx_otps_lookup (email_or_phone, code)`, `idx_admin_logs_admin`, `idx_reviews_seller`

## ⚠️ จุดที่ควรระวังเวลาแก้ไขข้อมูล
* **`parts` ลบไม่ได้ถ้ามีการอ้างอิงอยู่** — `products.part_id` และ `build_parts.part_id` ทั้งคู่มี FK ชี้มาที่ `parts.id` (แบบ RESTRICT) ฐานข้อมูลจะปฏิเสธการลบเองถ้ามีสินค้า/ชุดจัดสเปคใช้อะไหล่ตัวนั้นอยู่ — หน้าแอดมินจับ error นี้ (`ER_ROW_IS_REFERENCED_2`) แล้วแจ้งข้อความที่เข้าใจง่ายแทน
* **ห้ามใช้ `schema_mysql.sql` รันซ้ำกับฐานข้อมูลที่มีข้อมูลจริงอยู่แล้ว** — ไฟล์เริ่มต้นด้วย `DROP TABLE IF EXISTS` ทุกตาราง จะลบข้อมูลทั้งหมดทันที ถ้าต้องแก้ schema บนฐานข้อมูลที่มีข้อมูลอยู่แล้ว ให้เขียน `ALTER TABLE`/migration script แยกต่างหาก (ดูตัวอย่างที่ `03_backend/scripts/migrate_v2.js`)
* **`orders.total_price` เปลี่ยนจาก `INT` เป็น `DECIMAL(12,2)` แล้ว (2026-08-12)** — เดิมเป็น INT ทำให้ข้อมูลทดสอบเก่า overflow ไปเป็น `2147483647` (ค่าสูงสุดของ INT 32-bit) จากบั๊ก string-concatenation เก่าที่แก้ไปแล้วในโค้ด แต่ตัวคอลัมน์ไม่เคยถูกแก้ตาม — ข้อมูล 4 ออเดอร์เก่าที่ผิด (#7, #8, #9, #11) ถูกคำนวณใหม่จาก `order_items` ให้ถูกต้องแล้วด้วย เมื่อเปลี่ยนเป็น DECIMAL ทุกค่าที่อ่านจากคอลัมน์นี้ผ่าน `mysql2` จะกลายเป็น **string** (เหมือนคอลัมน์ DECIMAL อื่นๆ ในระบบ) — จุดที่เคยเรียก `.toLocaleString()` ตรงๆ บนค่านี้โดยไม่ห่อ `Number(...)` ถูกแก้พร้อมกันแล้ว: `bookingController.js` (`uploadPaymentSlip`ผ่าน`expectedAmount`, `exportLegalEvidence`) และ `adminController.js` (`getDisputes`) — ถ้าเพิ่มโค้ดใหม่ที่อ่าน `total_price` ให้ห่อ `Number(...)` ก่อนใช้เสมอ ตามแพทเทิร์นเดิมของโปรเจกต์
