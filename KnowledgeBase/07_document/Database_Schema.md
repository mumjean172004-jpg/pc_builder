# 💾 Database Schema (MySQL/MariaDB)

ฐานข้อมูลของโครงการเปลี่ยนจาก SQLite มาเป็น **MySQL / MariaDB** (เชื่อมต่อผ่าน Connection Pool บนโฮสต์ `localhost:3306`) ด้านล่างนี้คือตารางฟิลด์ ข้อจำกัด และอินเด็กซ์ทั้งหมดที่ทำงานอยู่จริงในปัจจุบัน — ตรงกับ [schema_mysql.sql](file:///c:/Users/Kanomjean/Downloads/project/02_database/schema_mysql.sql) ทุกฟิลด์ (แหล่งข้อมูลจริง, ถ้าเอกสารนี้กับไฟล์ .sql ขัดแย้งกันให้ยึดไฟล์ .sql เป็นหลัก)

**รวมทั้งหมด 40 ตาราง** (อัปเดต 2026-08-18 — **สถาปัตยกรรมเปลี่ยนเป็น Product-Centric 100%**: ตาราง `parts` (แคตตาล็อกกลางที่แยกจากสินค้าจริง) **ถูกลบออกจากระบบทั้งหมดแล้ว** — `products` คือแหล่งความจริงหนึ่งเดียวสำหรับทุกอย่างตอนนี้ ทั้งข้อมูลยี่ห้อ/รุ่น สเปก และการเทียบราคากันเอง ดู §3/§3a/§4 ด้านล่าง — **`02_database/schema_mysql.sql` และ `02_database/seed_data_mysql.sql` ถูกแก้ให้ตรงกับของจริง 100%**, ยืนยันด้วยการรัน schema+seed ทั้งไฟล์กับฐานข้อมูลว่างจริงแล้วเทียบ `INFORMATION_SCHEMA` กับฐานข้อมูล dev ทีละคอลัมน์ — ล่าสุดเพิ่มตาราง `chipset_generations` (§3a) ทำให้นับได้ 40 ตาราง)

---

## 🗄️ Database Tables (ตารางข้อมูลทั้งหมด)

### 1. `users` (บัญชีผู้ใช้ — general account เท่านั้น)
* `id` (INT, PK, Auto Increment)
* `username` (VARCHAR(255), Unique, Not Null)
* `email` (VARCHAR(255), Unique, Not Null)
* `password` (VARCHAR(255), Not Null) — bcrypt hash
* `avatar_url` (TEXT, Default Null)
* `phone` (VARCHAR(50), Unique, Default Null)
* `google_id` / `facebook_id` (VARCHAR(255), Unique, Default Null) — สำหรับ Social Login
* `active_role` (VARCHAR(50), Default `'buyer'`) — `'buyer'` หรือ `'seller'` (สลับได้ในโปรไฟล์)
* `is_phone_verified`, `is_email_verified` (TINYINT, Default 0)
* `role` (VARCHAR(50), Default `'member'`) — `'member'` หรือ `'admin'`
* `status` (VARCHAR(50), Default `'active'`) — `'active'` หรือ `'suspended'`
* `created_at` (DATETIME, Default Current Timestamp)

> ⚠️ **เปลี่ยนโครงสร้างครั้งใหญ่ 2026-08-17**: ข้อมูลผู้ขาย/KYC/บัญชีธนาคารทั้งหมด **ย้ายออกจากตารางนี้ไปตาราง `seller_profiles` แล้ว** (ดูข้อ 1a ด้านล่าง) — `users` ลดจาก 36 คอลัมน์เหลือ 14 คอลัมน์ตามด้านบน คอลัมน์เก่าที่เอกสารเวอร์ชันก่อนหน้าเคยพูดถึง (`shop_name`, `seller_bank_account`, `id_card_number`, `kyc_status`, คู่ซ้ำ `seller_`-prefix ทั้งหมด ฯลฯ) **ถูกลบออกจากฐานข้อมูลจริงแล้ว ไม่ใช่แค่เลิกใช้** — ห้ามอ้างอิงคอลัมน์เหล่านี้ในโค้ดใหม่ ให้ query ผ่าน `seller_profiles` (join ด้วย `user_id`) แทนเสมอ

### 1a. `seller_profiles` (ข้อมูลผู้ขาย/KYC — แยกจาก `users` โดยเจตนา)
ความสัมพันธ์ 1:1 กับ `users` แบบบังคับโดยโครงสร้าง — ใช้ `user_id` เป็นทั้ง Primary Key และ Foreign Key พร้อมกัน (ไม่ใช่ auto-increment id แยก) จึงรับประกัน "1 บัญชีผู้ใช้ = 1 ร้านค้า" ได้โดยไม่ต้องพึ่ง unique constraint แยก
* `user_id` (INT, PK, FK → `users.id` ON DELETE CASCADE)
* `shop_name`, `shop_avatar_url`, `address_province`, `address_district`, `contact_phone`, `full_name`
* `id_card_number`, `bank_name`, `bank_account_number`, `bank_account_name` — ข้อมูล KYC/บัญชีธนาคารรับเงิน
* `kyc_status` (Default `'none'`), `kyc_document_url`
* `is_verified` (TINYINT, Default 0) — สถานะยืนยัน KYC ผู้ขาย
* `has_badge` (TINYINT, Default 0)
* `rating` (DECIMAL(3,2), Default `0.00`) — คำนวณจากค่าเฉลี่ยของตาราง `reviews` จริง อัปเดตทุกครั้งที่มีรีวิวใหม่/แก้ไข/ลบ (ดู `services/reviewService.js`)
* `sales_count` (INT, Default 0)
* `created_at` (DATETIME)
* **เหตุผลที่แยก**: `users` เดิมสะสมคอลัมน์คู่ซ้ำจากการแพตช์ทับหลายรอบ (เช่น `bank_name`/`seller_bank_name` ที่ `registerSeller` เขียนพร้อมกันทั้งคู่ แต่ `updateSellerProfile` เขียนแค่ตัวเดียว ทำให้ค่าเพี้ยนกันได้) — ทุก controller ที่อ่าน/เขียนข้อมูลผู้ขาย (`authController.js`, `bookingController.js`, `productController.js`) ตอนนี้ join ผ่าน `seller_profiles` แล้ว โดย response shape ที่ frontend เห็นยังเหมือนเดิมทุก field name (aliased กลับผ่าน SQL)

### 2. `categories` (หมวดหมู่ชิ้นส่วน)
* `id` (INT, PK, Auto Increment)
* `name` (VARCHAR(255), Not Null)
* `slug` (VARCHAR(255), Unique, Not Null)
* `icon` (VARCHAR(100), Default `'microchip'`)
* `display_order` (INT, Default 0)
* `created_at` (DATETIME, Default Current Timestamp)

### 3. ~~`parts`~~ — ลบออกจากระบบแล้ว (2026-08-17)
เดิมเป็นแคตตาล็อกอะไหล่กลางที่แยกจากสินค้าจริง ใช้เป็นราคาอ้างอิง (MSRP) และฐานข้อมูลสเปก — **ถูกลบออกทั้งตาราง** พร้อมคอลัมน์ `products.part_id` และ `build_parts.part_id` (`03_backend/scripts/migrate_remove_parts.js`, ตรวจแล้วว่าไม่มีแถว spec_* กำพร้าและไม่มี FK ค้างก่อนลบจริง) เหตุผล: ผู้ใช้ต้องการให้ **`products` (สินค้าที่ผู้ขายลงขายจริง) เป็นศูนย์กลางของทุกอย่าง** — ทั้งข้อมูลสเปกและการเทียบราคา ไม่ใช่ให้มีแคตตาล็อกกลางที่แยกต่างหาก ดู §3a/§4 และการเปลี่ยนระบบตรวจจับสินค้าราคาผิดปกติด้านล่าง

### 3a. 🧩 Typed Spec Tables + Master Lookup Tables (ระบบจัดสเปกและ Cascading Dropdown)
ตารางสเปกแบบ typed หนึ่งตารางต่อหมวดหมู่ **ผูก 1:1 กับ `products.id` โดยตรง** (คอลัมน์ `product_id` เป็น PK+FK) เก็บค่าสเปกเป็น plain string/number ตามที่ผู้ขายกรอกจริง (ไม่ใช่ FK id เข้า lookup table อีกต่อไป — เปลี่ยนจากระบบเดิมที่ผูกกับ `sockets`/`chipsets`/ฯลฯ) ดูรายละเอียดเชิงลึกที่ **`03_backend/services/specTables.js`**:

**Spec tables (1 ต่อ 1 กับ `products.id`, join ผ่าน `product_id`):**
`spec_cpu` (socket, generation, series, cores, threads) · `spec_motherboard` (socket, chipset, **generation** (ใหม่ 2026-08-18), form_factor, ram_type, ram_slots, max_ram_gb) · `spec_ram` (type, capacity_gb, speed, modules) · `spec_gpu` (series, chip, vram_gb, vram_type, length_mm) · `spec_psu` (wattage, efficiency, modularity) · `spec_storage` (interface, capacity_gb, read_speed)

> ⚠️ **`spec_cpu.tdp`/`spec_cpu.integrated_graphics`/`spec_gpu.tdp` และตาราง `spec_case`/`spec_cpu_cooler` ยังอยู่ในฐานข้อมูลจริง (ไม่ได้ DROP) แต่ไม่ถูกใช้งานแล้ว (Round 12, 2026-08-18)** — ดูสรุป Round 12 ด้านล่างสำหรับเหตุผลและรายละเอียดเต็ม: `services/specTables.js`'s `CATEGORY_SPEC_CONFIG` เลิกอ่าน/เขียนคอลัมน์ TDP/iGPU ทั้งหมด และหมวด `cpu-cooler`/`case` ถูกถอดออกจากระบบทั้งหมด ไม่ใช่แค่ "ยังไม่มี cascade" เหมือนที่เคยระบุไว้ก่อนหน้านี้อีกต่อไป

**Master lookup tables** (`sockets`, `chipsets`, `form_factors`, `ram_types`, `psu_modular`, `psu_efficiency`, `brands`, `cpu_series`, `vga_series`, `gpu_chips`, `cpu_generations`, `cpu_models`) — ยังอยู่ครบเหมือนเดิม ใช้ขับเคลื่อน cascading dropdown ในหน้าลงขายสินค้าเท่านั้น **ไม่มี FK เชื่อมกับ spec_* อีกต่อไป** — ค่าที่เลือกจาก dropdown ถูกเขียนลง spec_* เป็น plain string ตรงๆ ระบบตรวจ compatibility (`compatibilityService.js`) ยึดค่า `spec_cpu.socket`/`spec_motherboard.socket` (string เทียบ string) เป็นหลักเสมอ — **ขนาดข้อมูลจริง ณ 2026-08-18**: `sockets` 19 แถว (Intel LGA1851/1700/1200/1151(v1)/1151(v2)/1150/1155/775/2066/2011-v3/2011 + AMD AM5/AM4/AM3+/AM3/FM2+/sTR5/sTRX4/TR4), `chipsets` 119 แถว, `cpu_generations` 28 แถว, `cpu_models` 389 แถว, `vga_series` 12 แถว, `gpu_chips` 78 แถว — ครอบคลุมตั้งแต่ปัจจุบันย้อนไปถึงยุค Sandy Bridge/FX-Series รวม HEDT/Threadripper ครบ (`03_backend/scripts/migrate_builder_v8.js`/`v9.js`)

**`chipset_generations`** (many-to-many, `chipset_id` + `generation_id`, composite PK) — ตารางใหม่ (2026-08-18) บอกว่าชิปเซ็ตแต่ละตัวรองรับ CPU generation ไหนบ้าง (เช่น B760/H770/Z790 รองรับทั้ง Gen 14 และ Gen 13) ขับเคลื่อนขั้นตอน "2.4 Gen ที่ใช้ได้" ในฟอร์มลงขายเมนบอร์ด — ค่าที่เลือกถูกบันทึกลง `spec_motherboard.generation` โดยตรง บาง socket (LGA775, LGA2011 เปล่า, AM3, FM2+) มีข้อมูลชิปเซ็ตแต่ไม่มี mapping ใน ตารางนี้เลย เพราะเอกสารอ้างอิงต้นฉบับไม่ได้ให้รายชื่อ CPU รุ่นที่ตรงกันมา — เป็นช่องว่างที่ตั้งใจปล่อยว่างไว้ ไม่ใช่ข้อมูลผิด

### 4. `products` (รายการสินค้าลงประกาศขายตลาด C2C — ศูนย์กลางของทุกอย่าง)
* `id` (INT, PK, Auto Increment)
* `seller_id` (INT, Not Null, FK → `users.id` ON DELETE CASCADE)
* `category_id` (INT, Not Null, FK → `categories.id`)
* `brand` (VARCHAR(100), Not Null), `model` (VARCHAR(150), Not Null) — **ข้อมูลยี่ห้อ/รุ่นอยู่ในตารางนี้โดยตรงแล้ว** ไม่มีการอ้างอิง catalog กลางอีกต่อไป (แทนที่ `part_id` เดิม) ใช้เทียบ exact-match กับสินค้าอื่นที่ยี่ห้อ/รุ่นเดียวกันในระบบตรวจราคาผิดปกติและ Cross-Match
* `condition` (VARCHAR(50), Not Null, CHECK) — `'new'`, `'used_90'`, `'used_80'`, `'used_70'`
* `remaining_warranty_months` (INT, Default 0) — **คำนวณจากคอลัมน์ compound ด้านล่างเสมอ ห้าม client ส่งค่านี้ตรงๆ** (`productController.js`'s `computeRemainingWarrantyMonths`) กันปัญหาค่าเพี้ยนแบบเดียวกับที่เคยเกิดกับ `users`
* `warranty_type` (ENUM: `'no_warranty'`/`'seller_warranty'`/`'manufacturer_warranty'`/`'lifetime'` (4 ค่า เพิ่ม `'lifetime'` 2026-08-18), Default `'no_warranty'`), `warranty_years`/`warranty_months`/`warranty_days` (INT, Default 0) — ฟิลด์ประกันแบบผสมที่ผู้ขายกรอกจริง — **`'lifetime'` ใช้ sentinel `years=99, months=0, days=0`** (บันทึกโดย `productController.js`'s `normalizeWarrantyFields`, ไม่ใช่ค่าจริงที่แก้ไขได้ตรงๆ) เพื่อให้ `total_warranty_days`/`remaining_warranty_months` ยังเป็นตัวเลขที่ query กรอง/เรียงลำดับได้ตามปกติ โดยไม่ต้อง special-case `'lifetime'` แยกทุกจุดที่อ่านค่านี้
* `total_warranty_days` (INT, **GENERATED ALWAYS AS** `(warranty_years*365 + warranty_months*30 + warranty_days) STORED`) — คำนวณอัตโนมัติโดย MySQL เอง ไม่ต้องเขียนโค้ด sync (สำหรับ `'lifetime'` จะได้ 36,135 วัน จาก sentinel ด้านบน)
* `sku` (VARCHAR(64), Default Null) — สร้างอัตโนมัติหลัง insert รูปแบบ `SKU-{CATEGORY}-{ID แบบ 6 หลัก}` เช่น `SKU-CPU-000067` — **ฟอร์มลงขายสินค้าไม่มีช่องให้กรอก SKU เองแล้ว (ลบออก 2026-08-18)** ระบบ generate ให้อัตโนมัติเสมอ (คอลัมน์ยังรับค่า custom ผ่าน API ได้ถ้าส่งมาตรงๆ แต่ frontend ปัจจุบันไม่ส่ง)
* `price` (DECIMAL(10,2), Not Null)
* `original_price` (DECIMAL(10,2), Default Null) — ราคาป้ายเดิมที่ผู้ขายใส่เพื่อโชว์ส่วนลด (self-reported) **ไม่เคยถูกส่งเข้า `antiFraudService.scoreListing`** (ดูหมายเหตุระบบตรวจราคาผิดปกติด้านล่าง) — **ฟอร์มลงขายสินค้าไม่มีช่องให้กรอกฟิลด์นี้แล้ว (ลบออก 2026-08-18)** สินค้าเก่าที่เคยตั้งไว้ก่อนหน้ายังแสดงราคาขีดฆ่าปกติใน `products.html`/`product-detail.html` แต่สินค้าใหม่จะไม่มีทางตั้งค่านี้ผ่านฟอร์มหลักได้อีกต่อไป (คอลัมน์ยังอยู่ ยังรับค่าผ่าน API ได้ถ้ามีใครส่งมาตรงๆ)
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

### 8. `build_parts` (many-to-many — จัดสเปกผูกกับสินค้าที่ลงขายจริง)
* `id` (INT, PK), `build_id` (FK → `builds.id` ON DELETE CASCADE), `product_id` (FK → `products.id` ON DELETE CASCADE, Not Null) — ชุดจัดสเปกอ้างอิง **สินค้าที่ลงขายจริงเสมอ** (ไม่มีแคตตาล็อกกลางให้ผูกกับอย่างอื่นแล้ว), `quantity` (INT, Default 1), `price` (DECIMAL(10,2), Not Null) — ราคา ณ ตอนเพิ่มเข้าชุดจัดสเปก (เขียนโดย `buildsController.createBuild`/`updateBuild` เท่านั้น)
* ~~`part_id`~~ — คอลัมน์ legacy ที่เคยอ้างถึงตาราง `parts` **ถูกลบออกแล้ว** (2026-08-17, ไม่มี FK อ้างอิงค้างอยู่ก่อนลบ ตรวจสอบแล้ว)

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
* ระบบทางเดียว (ผู้ซื้อรีวิวผู้ขายเท่านั้น) รีวิวได้เฉพาะออเดอร์ที่ `orders.status = 'completed'` — ทุกครั้งที่สร้าง/แก้ไขรีวิว `seller_profiles.rating` จะถูกคำนวณใหม่ทันที (ดู `services/reviewService.js` — ย้ายจาก `users.seller_rating` เดิมตั้งแต่แยก `seller_profiles` เมื่อ 2026-08-17)

---

## ⚡ Active Database Indexes (อินเด็กซ์ดักการค้นหาความเร็วสูง)
`idx_products_seller`, `idx_products_category`, `idx_products_status (status, review_status)`, `idx_product_photos_product`, `idx_builds_user`, `idx_builds_public`, `idx_build_parts_build`, `idx_build_parts_product`, `idx_build_likes_build`, `idx_build_comments_build`, `idx_orders_buyer`, `idx_orders_seller`, `idx_order_items_order`, `idx_chat_rooms_order`, `idx_chat_rooms_members (buyer_id, seller_id)`, `idx_chat_messages_room`, `idx_buyer_addresses_user`, `idx_wishlists_user`, `idx_otps_lookup (email_or_phone, code)`, `idx_admin_logs_admin`, `idx_reviews_seller`

## 🛡️ ระบบตรวจจับสินค้าราคาผิดปกติ (Anti-Fraud) — เปลี่ยนแหล่งราคาอ้างอิง (2026-08-17)
เดิม `evaluateSuspicion` เทียบราคาที่ลงขายกับ `parts.price` (MSRP ที่แอดมินคุมเท่านั้น) — หลังลบ `parts` ออก ไม่มีราคากลางให้เทียบอีกต่อไป ระบบเปลี่ยนไปเทียบกับ **ค่าเฉลี่ยราคาของสินค้าอื่นที่ยี่ห้อ+รุ่นเดียวกัน ที่กำลังลงขายอยู่จริง** (`status = 'active' AND review_status = 'approved'`, ไม่รวมประกาศตัวเอง) แทน — ถ้ายังไม่มีสินค้ายี่ห้อ/รุ่นนั้นลงขายมาก่อนเลย (ของใหม่ในระบบ) จะข้ามการตรวจราคาไปเลย (เหมือนพฤติกรรมเดิม) `products.original_price` (ราคาป้ายเดิมที่ผู้ขายกรอกเอง) **ไม่เคยถูกใช้เป็นราคาอ้างอิงในการตรวจ** เพราะผู้ขายกำหนดเองได้ ใช้ตรวจสอบไม่ได้ ดู `productController.js`'s `getCrossListingReferencePrice`

## ⚠️ จุดที่ควรระวังเวลาแก้ไขข้อมูล
* **ห้ามใช้ `schema_mysql.sql` รันซ้ำกับฐานข้อมูลที่มีข้อมูลจริงอยู่แล้ว** — ไฟล์เริ่มต้นด้วย `DROP TABLE IF EXISTS` ทุกตาราง จะลบข้อมูลทั้งหมดทันที ถ้าต้องแก้ schema บนฐานข้อมูลที่มีข้อมูลอยู่แล้ว ให้เขียน `ALTER TABLE`/migration script แยกต่างหาก (ดูตัวอย่างที่ `03_backend/scripts/migrate_builder_v3.js` ถึง `v9.js`, `migrate_products_v1.js`, `migrate_seller_profiles_v1.js`/`v2...js`, `migrate_to_product_centric.js`, `migrate_remove_parts.js`)
* **`compatibilityService.js`'s case-fit checks (GPU length / cooler height ↔ case) และ PSU-wattage check ถูกลบออกทั้งหมดแล้ว (Round 12, 2026-08-18)** — ไม่ใช่แค่ "ไม่ค่อยทำงานจริง" เหมือนที่เคยระบุไว้ก่อนหน้า แต่โค้ดถูกลบทิ้งไปเลย เหลือแค่ 2 การตรวจ (CPU↔MB socket, RAM↔MB) ดูสรุป Round 12 ด้านล่าง
* **`orders.total_price` เปลี่ยนจาก `INT` เป็น `DECIMAL(12,2)` แล้ว (2026-08-12)** — เดิมเป็น INT ทำให้ข้อมูลทดสอบเก่า overflow ไปเป็น `2147483647` (ค่าสูงสุดของ INT 32-bit) จากบั๊ก string-concatenation เก่าที่แก้ไปแล้วในโค้ด แต่ตัวคอลัมน์ไม่เคยถูกแก้ตาม — เมื่อเปลี่ยนเป็น DECIMAL ทุกค่าที่อ่านจากคอลัมน์นี้ผ่าน `mysql2` จะกลายเป็น **string** เสมอ (ต้องห่อ `Number(...)` ก่อนคำนวณ/`.toLocaleString()` — บั๊ก string-concatenation แบบเดียวกันนี้เจออีกครั้งใน `buildsController.autoBuild`'s `getActualPrice` ระหว่างการลบ `parts` ออก 2026-08-17 และแก้แล้ว — จำ pattern นี้ไว้ทุกจุดที่อ่านคอลัมน์ DECIMAL/price จาก DB)
* **`build_parts.price` เป็น `NOT NULL` ไม่มีค่า default** — พบระหว่างการลบ `parts` ว่า `createBuild`/`updateBuild` ไม่เคยเขียนคอลัมน์นี้เลย ทำให้บันทึกชุดจัดสเปกทุกครั้ง **500 error จริงบน live** ก่อนแก้ (2026-08-17) — แก้แล้วโดยให้ทั้งสอง endpoint ดึงราคาสินค้า ณ ตอนนั้นมาเขียนลงไปด้วย
* **สรุป epic ใหญ่ "ย้ายสถาปัตยกรรมสู่ Product-Centric 100%" (2026-08-17)** — ลบตาราง `parts` และคอลัมน์ `products.part_id`/`build_parts.part_id` ทั้งหมด (§3), `products` มี `brand`/`model` เป็นของตัวเองโดยตรง (§4), ตาราง `spec_*` ทั้งหมดย้ายจากผูกกับ `parts.id` มาผูกกับ `products.id` โดยตรงและเก็บค่าสเปกเป็น plain string แทน FK id (§3a), ระบบตรวจราคาผิดปกติเปลี่ยนมาเทียบกับสินค้าจริงที่ลงขายอยู่แทน MSRP (ดูหัวข้อด้านบน), และ **`schema_mysql.sql`/`seed_data_mysql.sql` ถูกแก้ให้ตรงกับฐานข้อมูลจริง 100%** (ยืนยันด้วยการรัน schema+seed ทั้งไฟล์ใส่ฐานข้อมูลว่างจริงแล้ว diff ทีละคอลัมน์กับ `INFORMATION_SCHEMA` ของเครื่อง dev) — ระหว่างตรวจพบและแก้บั๊กจริงเพิ่มอีก 2 จุดที่ไม่เกี่ยวกับ schema โดยตรงแต่กระทบฟีเจอร์หลัก: `buildsController.autoBuild`'s form-factor compatibility map ไม่รู้จัก `'E-ATX'` (ทำให้จัดสเปกอัตโนมัติหาชุดที่เข้ากันไม่เจอเลยแม้งบเพียงพอ) และ cooler AIO-detection อ่านชื่อคอลัมน์ผิด (`type`/`radiator_mm` ที่ไม่มีจริง แทนที่จะเป็น `cooler_type`/`radiator_size`)
* **สรุป Round 10-11 (2026-08-18)** — GPU/Storage/PSU ได้ cascade เฉพาะจริงในฟอร์มลงขาย (เดิม storage/psu ไม่มี cascade เลย เก็บ specs เป็น `{}` เปล่าตลอด), `warranty_type` เพิ่ม `'lifetime'`, ลบช่อง SKU/ราคาป้ายเต็มออกจากฟอร์ม, ขยายฐานข้อมูล CPU/motherboard chipset เต็มรูปแบบ (§3a ตัวเลขด้านบน) พร้อม `chipset_generations` ใหม่ — ระหว่างแก้พบบั๊กจริงเพิ่มอีกหลายจุด: `sell-product.html` ไม่เคยประกาศฟังก์ชัน `setBtnLoading` เลย ทำให้ **การลงขายสินค้าทุกครั้งพัง (`ReferenceError`) มาตลอดก่อนหน้านี้** (แก้แล้ว), GPU/CPU cascade เดิมไม่เคยเก็บ `tdp` เลยทั้งคู่ ทำให้การตรวจกำลังไฟ PSU (`compatibilityService.js` §5 "PSU wattage") ใช้ค่า TDP เริ่มต้น (65W/150W) แทนค่าจริงเสมอ (แก้แล้วในตอนนั้น — ดูหมายเหตุ Round 12 ด้านล่างว่าฟิลด์นี้ถูกถอดออกไปอีกทีในภายหลัง), และมอเธอร์บอร์ดเดิม hardcode `form_factor: 'ATX'`/`ram_type: 'DDR5'` ในทุกการลงขาย ไม่ว่า socket จะเป็นอะไรจริง (แก้แล้ว เปลี่ยนเป็นช่องเลือกจริงพร้อมค่าเริ่มต้นที่ถูกต้องตาม socket)

* **สรุป Round 12 (2026-08-18) — ถอด TDP/iGPU + Auto-Build ทั้งฟีเจอร์ + ยกเลิก 3 หมวดหมู่** — ตามคำขอผู้ใช้: (1) เพิ่ม RAM Bus จริงในฟอร์มลงขาย RAM (เดิม hardcode `speed: 6000` เสมอ), (2) ถอดฟิลด์ `spec_cpu.tdp`/`integrated_graphics`/`spec_gpu.tdp` ออกจาก `CATEGORY_SPEC_CONFIG` (คอลัมน์ยังอยู่ในตาราง ไม่ได้ DROP) และลบฟีเจอร์ "จัดสเปกอัตโนมัติ (Auto-Build)" ทั้งหมด (`POST /builds/auto`, `buildsController.autoBuild`, UI ทั้งหน้า) — ทำให้ `compatibilityService.js`'s checkCompatibility เหลือแค่ 2 การตรวจ (CPU↔MB socket, RAM↔MB) จาก 6 การตรวจเดิม, (3) ยกเลิกหมวดหมู่ `cpu-cooler`/`case`/`accessories` ทั้งระบบ (`migrate_retire_categories.js` ลบสินค้าจริง 2 ชิ้นและแถวหมวดหมู่ทั้ง 3 ออกจากฐานข้อมูลจริง, `spec_case`/`spec_cpu_cooler` เหลือเป็นตารางกำพร้าไม่มีใครเขียน/อ่านแล้ว) `LISTING_CATEGORY_SLUGS` เหลือ 7 หมวด: `cpu`/`gpu`/`motherboard`/`ram`/`psu`/`storage`/`monitor`

* **สรุป Round 13 (2026-08-19) — ตัวกรองสเปกละเอียดใน products.html** — เพิ่ม endpoint ใหม่ `GET /products/spec-options` คืนค่า distinct ของแต่ละ spec column (whitelist ผ่าน `FILTERABLE_SPEC_COLUMNS` ใน `productController.js`) เฉพาะจากสินค้าที่ `status='active' AND review_status='approved'` จริง (ไม่ใช่ master lookup table ทั้งหมด ตามพฤติกรรมเดียวกับตัวกรองในหน้า builder.html) และเพิ่ม query param `spec_<col>` ให้ `GET /products` กรองตาม spec จริงได้ (whitelist คอลัมน์เดียวกัน ป้องกัน SQL injection ผ่าน query key)

* **สรุป Round 14 (2026-08-19/20) — ล็อคความเข้ากันได้, แก้ escrow ชำระเงิน, สิทธิ์แอดมิน, ย้ายสินค้าสาธิต** — (1) เพิ่มปุ่ม "ดูใน Shopee" ในสรุปชุดประกอบ (ลิงก์ค้นหาภายนอกล้วนๆ ไม่มีการเรียก API), (2) `builder.js`'s `renderPartsList()` เพิ่มการกรองล่วงหน้าแบบกำหนดตายตัว (ไม่ใช่ text-matching แบบ `getPartCompatibilityStatus()` เดิม) ให้เลือก CPU แล้วเมนบอร์ดเหลือแค่ Socket ตรงกัน และ RAM เหลือแค่ชนิดตรงกับเมนบอร์ดที่เลือก, (3) แก้บั๊กจริงในระบบชำระเงิน — `bookingController.uploadPaymentSlip` เคยตั้ง `status='paid'` ทันทีที่อัปโหลดสลิป (ข้าม `waiting_verification` ทั้งที่หน้าจอผู้ขายตรวจสลิปมีอยู่แล้วใน `inbox.html` แต่เข้าไม่ถึง) แก้แล้วให้เข้า `waiting_verification` จริง รอผู้ขายกดยืนยันเอง, (4) เพิ่ม `DELETE /admin/products/:id` (เช็ค `order_items` ก่อนลบ, บันทึก `admin_logs`) และตัวกรอง `review_status` ให้ `GET /admin/products`, (5) ย้ายสินค้าสาธิต 8 ชิ้นจากบัญชี admin ไปเป็นของผู้ขายจริง `johndoe` (คัดลอกทุกฟิลด์รวม Serial Number เดิม) พร้อมเพิ่มอีก 8 ชิ้นให้หลากหลาย Socket/Brand/Gen มากขึ้น (`migrate_reassign_demo_listings.js`) — **พบบั๊กจริงเพิ่ม 2 จุดระหว่าง audit ก่อน push โค้ดขึ้น git**: (ก) `bookingController.getRoomMessages` (endpoint ที่หน้าแชท `inbox.html` เรียกตอนโหลดห้อง) ไม่เคย `SELECT`/คืนค่า `courier_name`/`tracking_number`/`proof_of_packing_url`/`is_seller_verified` เลยตั้งแต่แรก ทำให้ข้อมูลเลขพัสดุ/รูปแพ็กของ/badge ผู้ขายยืนยันตัวตน **ไม่เคยแสดงในหน้าแชทได้เลยหลังโหลดหน้าใหม่** (แก้แล้ว), (ข) ปุ่ม "ยืนยันจัดส่ง" จริงในหน้าแชทเรียก `PUT /:id/status` (`updateBookingStatus`) ไม่ใช่ `PUT /:id/ship` (`shipOrderWithProof`, endpoint หลังนี้ไม่มี frontend เรียกใช้เลย เป็น dead code) — Round 14 เดิมใส่ guard "ต้องจ่ายเงินก่อนถึงจะส่งของได้" ไว้ที่ `shipOrderWithProof` เท่านั้น ทำให้ endpoint จริงที่ใช้งานอยู่ (`updateBookingStatus`) **ยังคงอนุญาตให้ผู้ขายกดยืนยันจัดส่งได้แม้ยังไม่ได้รับการยืนยันชำระเงินเลย** และยังไม่เคยรับ/บันทึก `proof_of_packing_url` เลยด้วย (ผู้ซื้อ/ผู้ขายส่ง `packing_proof_url` ผิดชื่อฟิลด์มาตลอด ไม่ตรงกับคอลัมน์จริงในทุกจุดของ frontend) — แก้ครบทั้งสามจุด (guard, การบันทึก, ชื่อฟิลด์) แล้ว ยืนยันผ่าน live HTTP จริง
