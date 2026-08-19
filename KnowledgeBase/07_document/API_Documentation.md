# 🌐 API Documentation

รายการเส้นทางการเชื่อมต่อ (API Endpoints) ทั้งหมดของระบบ PC Builder Pro โดยให้บริการผ่านพาธเริ่มต้น `/api/` — ตรงกับไฟล์ `03_backend/routes/*.js` ทุกเส้นทาง ณ วันที่ปรับปรุงล่าสุด (ถ้าเอกสารนี้กับโค้ดขัดแย้งกัน ให้ยึดโค้ดจริงเป็นหลัก)

> [!NOTE]
> ระบบควบคุมเซสชันการล็อกอินผ่าน **HttpOnly Cookie** ในชื่อ `token` เป็นหลัก (มี `Authorization: Bearer <token>` เป็นระบบสำรอง) — เส้นทางที่ทำเครื่องหมาย 🔒 ต้องแนบ token มาด้วยเสมอ

> [!NOTE]
> Error response ระดับ `500` (unexpected/DB error) ทุก endpoint ตอบข้อความไทยทั่วไป (`เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง`) แทนการส่ง `error.message` ดิบจาก DB กลับไปตรงๆ — รายละเอียดจริงถูก log ไว้ที่ server (`console.error`) เท่านั้น ดู `03_backend/utils/errorHandler.js` — error ระดับ `400`/`403`/`404`/`409` ที่ตั้งใจเขียนข้อความอธิบายไว้ (เช่น `requires_seller_registration`) ไม่ได้รับผลกระทบ ยังคงข้อความเดิม

---

## 🔒 Authentication & Profile (Prefix: `/api/auth`)

| Method | Path | Auth | คำอธิบาย |
|---|---|---|---|
| GET | `/config` | - | คืนค่า `google_client_id` (public config สำหรับปุ่ม Google Sign-In) |
| POST | `/register` | - | สมัครสมาชิก (`username`, `email`/`phone` อย่างน้อย 1 อย่าง, `password`) → คืน `token` + `user` — ⏱️ rate-limited (20 ครั้ง/15 นาทีต่อ IP) |
| POST | `/login` | - | เข้าสู่ระบบด้วย `login_identifier` (อีเมลหรือเบอร์โทรเท่านั้น — **ไม่รองรับ username**) + `password` — ⏱️ rate-limited (20 ครั้ง/15 นาทีต่อ IP) |
| POST | `/social-login` | - | ล็อกอิน/สมัครผ่าน Google (ส่ง `credential` จริง) หรือ mock social login (`social_type`, `social_id`, ฯลฯ) |
| POST | `/logout` | - | ล้างคุกกี้เซสชัน |
| POST | `/send-otp` | - | ส่งรหัส OTP 6 หลัก (mock — โค้ดจริงอยู่ใน response/log ไม่ได้ส่ง SMS/Email จริง) ไปยัง `email_or_phone` — ⏱️ rate-limited (10 ครั้ง/15 นาทีต่อ IP) |
| POST | `/verify-otp` | - | ยืนยันรหัส OTP — ⏱️ rate-limited (10 ครั้ง/15 นาทีต่อ IP) |
| POST | `/reset-password` | - | ตั้งรหัสผ่านใหม่ด้วย OTP ที่ยืนยันแล้ว — ⏱️ rate-limited (20 ครั้ง/15 นาทีต่อ IP) |
| GET | `/profile` | 🔒 | ดึงข้อมูลโปรไฟล์ผู้ใช้ปัจจุบัน |
| PUT | `/profile` | 🔒 | แก้ไข `username`/`email`/`phone` |
| PUT | `/change-password` | 🔒 | เปลี่ยนรหัสผ่าน (`current_password`, `new_password` ≥8 ตัวอักษร) — คืน `401` ถ้ารหัสผ่านปัจจุบันผิด |
| POST | `/switch-role` | 🔒 | สลับ `active_role` ระหว่าง `'buyer'`/`'seller'` |
| POST | `/register-seller` | 🔒 | ลงทะเบียนเปิดร้านค้า (ชื่อร้าน, บัญชีธนาคาร, ที่อยู่) |
| PUT | `/seller-profile` | 🔒 | แก้ไขข้อมูลร้านค้า |
| POST | `/verify-seller` | 🔒 | ส่งเอกสารยืนยันตัวตน KYC (`id_card`, `bank_account`, `phone`, `kyc_document_url` จำเป็น — ฟิลด์อื่น optional) |
| GET/POST | `/addresses` | 🔒 | ดึง/เพิ่มที่อยู่จัดส่งของผู้ซื้อ |
| PUT/DELETE | `/addresses/:id` | 🔒 | แก้ไข/ลบที่อยู่จัดส่ง |
| GET | `/wishlist` | 🔒 | ดึงรายการสินค้าที่ถูกใจ |
| POST | `/wishlist` | 🔒 | เพิ่มสินค้าเข้ารายการที่ถูกใจ (`product_id`) — เพิ่มซ้ำได้อย่างปลอดภัย (`INSERT IGNORE`) |
| DELETE | `/wishlist/:productId` | 🔒 | ลบออกจากรายการที่ถูกใจ |

---

## 📸 Static Upload (`/api/upload`)

* **Method / Path**: `POST /api/upload`
* **Auth**: 🔒 ต้องล็อกอิน (เพิ่ม `authMiddleware` แล้ว — เดิมเปิดสาธารณะไม่มีการตรวจสอบสิทธิ์ ปิดช่องโหว่นี้แล้ว)
* **Content-Type**: `multipart/form-data`, ฟิลด์ `image` (ไฟล์เดียว, ≤5MB, ตรวจสอบ extension/mimetype)
* **Response (201)**: `{ "url": "/uploads/<random-filename>.png" }`

---

## 💓 Health Check & Version (`/api/health`)

* **Method / Path**: `GET /api/health` — ไม่ต้อง auth
* **Response**: `{ "status": "ok", "message": "...", "version": "<เลขจาก package.json>", "env": "development" | "production" }`
* ใช้เช็คว่า server ตอบสนองอยู่ (uptime monitor/deploy verification) และดูว่า production กำลังรันโค้ดเวอร์ชันไหนอยู่จริง — เลขเวอร์ชันตัวเดียวกันนี้ยังถูกดึงไปแสดงเป็นป้ายมุมขวาล่างของทุกหน้า frontend/admin ด้วย (ดู [[08_design_system/UI_UX_Guidelines]])

---

## 🛠️ PC Builder & Catalog (Prefix: `/api/builds` & `/api/parts`)

### `/api/builds`
| Method | Path | Auth | คำอธิบาย |
|---|---|---|---|
| GET | `/` | - | ดึงรายการชุดจัดสเปกสาธารณะ (`is_public=1`) |
| GET | `/user/:userId` | 🔒 | ดึงชุดจัดสเปกทั้งหมดของผู้ใช้คนนั้น (พร้อม `likes_count`/`comments_count`) |
| GET | `/:id` | 🔒 | รายละเอียดชุดจัดสเปก 1 รายการ พร้อมรายการอะไหล่, `comments` เต็ม, และ `user_liked` (สถานะไลก์ของผู้เรียกดู) |
| POST | `/compatibility` | - | ตรวจสอบความเข้ากันได้ (`{parts: [{product_id, quantity}]}`) → `{compatible, warnings[], errors[]}` — เหลือแค่ 2 การตรวจ (CPU↔MB socket, RAM↔MB) ตั้งแต่ Round 12 (2026-08-18), การตรวจ GPU-length/cooler-height↔case และ PSU-wattage ถูกลบออกทั้งหมด |
| GET | `/available-parts` | - | คืนสินค้าที่ **มีคนลงขายจริง** ต่อหมวดหมู่ (`?category=`), แนบสเปกประกอบแล้วและรูปสินค้า — **`POST /intelligence` (ประเมินคอขวด/ค่าไฟ/เฟรมเรต) ถูกลบออกจากระบบแล้ว** ตั้งแต่ Round 4, และ **`POST /auto` (จัดสเปกอัตโนมัติ) ถูกลบออกทั้งฟีเจอร์แล้วเช่นกัน** ตั้งแต่ Round 12 (2026-08-18) — ถ้าเจอโค้ด/เอกสารเก่าอ้างถึง endpoint เหล่านี้แปลว่าเป็นข้อมูลเก่า |
| POST | `/cross-match` | - | เทียบราคามือหนึ่งกับสินค้ามือสองในตลาดของชุดจัดสเปก (`{parts: [{product_id, quantity}]}`) — body key เปลี่ยนจาก `part_id`→`product_id` เมื่อ 2026-08-17 พร้อมลบตาราง `parts` (ฝั่ง frontend เดิมยังส่ง `part_id` ค้างอยู่ ทำให้ Cross-Match พังเงียบๆมาก่อนหน้านี้ — แก้แล้ว) |
| POST | `/` | 🔒 | บันทึกชุดจัดสเปกใหม่ (`name`, `is_public`, `parts: [{product_id, quantity}]`) |
| PUT | `/:id` | 🔒 | แก้ไข (เจ้าของเท่านั้น) — `name`/`description`/`is_public`/`parts` ทุกฟิลด์ optional (partial update) |
| DELETE | `/:id` | 🔒 | ลบชุดจัดสเปก (เจ้าของเท่านั้น) |
| POST/DELETE | `/:id/like` | 🔒 | กดไลก์/ยกเลิกไลก์ → คืน `likes_count` ล่าสุด |
| POST | `/:id/comments` | 🔒 | แสดงความคิดเห็น (`content`) |

### `/api/parts` (ชื่อ prefix เดิม เก็บไว้ไม่เปลี่ยนกันกระทบ frontend — เหลือแค่ endpoint สาธารณะสำหรับ cascading dropdown เท่านั้น)
> **`partsController.js` ถูกลบออกจากระบบทั้งหมดแล้ว (2026-08-17)** พร้อมตาราง `parts` — endpoint เดิมทั้งหมดที่เคย CRUD แคตตาล็อกกลาง (`GET /`, `GET /brands`, `GET /category/:slug`, `GET /search`, `GET /:id`, `POST /` สำหรับผู้ขายเพิ่มรุ่นใหม่) **ไม่มีอยู่แล้ว** — ผู้ขายลงขายสินค้าใหม่ผ่าน `POST /api/products` โดยตรง (ใส่ `brand`/`model` เองในฟอร์ม ไม่ต้องผ่านแคตตาล็อกกลางอีกต่อไป)
* `GET /parts/categories` — ยังอยู่ (ย้าย handler ไปที่ `lookupController.getCategories` แล้ว แต่ path เดิมเหมือนเดิม เพราะ `builder.js` เรียกใช้ path นี้อยู่)

**`GET /parts/lookups/*`** (สาธารณะทั้งหมด) — endpoint แยกต่างหาก ให้ข้อมูลชุดเดียวกับที่ `/products/metadata` bulk-load ไว้แล้ว ดูตารางที่มาแต่ละอันใน [[07_document/Database_Schema]] §3a **⚠️ `sell-product.html` ไม่ได้เรียก endpoint กลุ่มนี้เลยสักตัว** — หน้าลงขายสินค้าโหลดทุกอย่าง (`sockets`/`chipsets`/`cpu_generations`/`cpu_models`/`vga_series`/`gpu_chips`/`psu_modular`/`psu_efficiency`/`chipset_generations`) มาครั้งเดียวจาก `GET /products/metadata` แล้ว filter/cascade ฝั่ง client เอง (ดูรายการด้านบน) — endpoint กลุ่มนี้จึงเป็น API แยกที่ยังใช้งานได้จริง แต่ไม่มีอะไรในระบบเรียกใช้จริงในปัจจุบัน (สำรองไว้เผื่อ integration อื่นในอนาคต):
| Path | Filter param | หมายเหตุ |
|---|---|---|
| `/sockets` | - | คืนทุก socket พร้อม `brand` |
| `/chipsets` | `?socket_id=` **บังคับ** (400 ถ้าไม่ส่ง) | |
| `/form-factors`, `/ram-types`, `/brands`, `/cpu-series`, `/vga-series`, `/psu-modular`, `/psu-efficiency` | - | flat list ไม่มี dependency |
| `/gpu-chips` | `?series_id=` ไม่บังคับ (ไม่ส่ง = คืนทั้งหมด) | |
| `/cpu-generations` | `?socket_id=` ไม่บังคับ | คืน `id, name, brand, socket_id` |
| `/cpu-models` | `?generation_id=` **บังคับ** (400 ถ้าไม่ส่ง) | ข้อมูล cascading picker เท่านั้น ไม่ผูกกับ compatibility engine |

---

## 📦 Marketplace Products (Prefix: `/api/products`)

| Method | Path | Auth | คำอธิบาย |
|---|---|---|---|
| GET | `/metadata` (= `/meta/listing`) | - | หมวดหมู่/สินค้าที่ลงขายจริง/แบรนด์ที่ใช้ในฟอร์มลงประกาศ — สินค้าหมวด `cpu`/`motherboard`/`gpu` แนบ `specs` มาด้วยเพื่อขับเคลื่อน cascading filter ในหน้าลงขายสินค้า — หมวดอื่นไม่มีฟิลด์นี้เพิ่ม (⚠️ response key ชื่อ `parts` แต่ข้อมูลจริงคือสินค้าที่ลงขายอยู่จริง (`products`) ไม่ใช่แคตตาล็อกกลาง — ชื่อ key เก่าค้างมาจากก่อนลบตาราง `parts`) — **เพิ่มเมื่อ 2026-08-18**: `psu_modular`/`psu_efficiency` (ก่อนหน้านี้มีแต่ endpoint `/parts/lookups/*` แยก ไม่เคยรวมมาที่นี่) และ `chipset_generations` (คู่ `{chipset_id, generation_id}` ทั้งหมด — ขับเคลื่อนขั้นตอน "Gen ที่ใช้ได้" ของฟอร์มลงขายเมนบอร์ด) |
| POST | `/availability` | - | เช็คสถานะพร้อมขายของสินค้าหลายชิ้นพร้อมกัน |
| GET | `/` | - | รายการสินค้า พร้อมตัวกรอง: `category`, `brand`, `condition`, `min_price`/`max_price`, `has_warranty`, `sort` (`created_desc`/`price_asc`/`price_desc`/`warranty_desc`), `search`, `page` (default 1), `limit` (default 24, สูงสุด 100) — **เพิ่ม 2026-08-19**: `spec_<col>` (เช่น `spec_socket=AM5`) กรองตาม spec column จริง ใช้ได้เมื่อระบุ `category` ด้วยเท่านั้น, คอลัมน์ที่กรองได้ whitelist ไว้ที่ `FILTERABLE_SPEC_COLUMNS` ใน `productController.js` (คีย์ที่ไม่รู้จักจะถูกเมินเฉยๆ ไม่ error) — คืนเป็น envelope `{ data, total, page, totalPages }` — แต่ละสินค้าแนบ `specs` ตามหมวดของตัวเองเสมอ ไม่ว่าผลลัพธ์จะปนหลายหมวดหมู่กันหรือไม่ก็ตาม |
| GET | `/spec-options` | - | **เพิ่ม 2026-08-19** — ค่า distinct ของแต่ละ spec column ต่อหมวดหมู่ (`FILTERABLE_SPEC_COLUMNS` เดียวกับด้านบน) สำหรับสร้างตัวกรองละเอียดในหน้า products.html เฉพาะจากสินค้าที่ `status='active' AND review_status='approved'` จริง (ไม่ใช่ master lookup table ทั้งหมด) — คืนรูปแบบ `{ cpu: { socket: [...], generation: [...], ... }, motherboard: {...}, ... }` |
| GET | `/:id` | - | รายละเอียดสินค้า 1 ชิ้น |
| POST | `/` | 🔒 | ลงประกาศขายใหม่ — ผ่าน `productValidator` (บังคับ `brand`, `model`, `price≥0`, `stock_quantity≥1`, `condition`, `serial_number`) → คำนวณ `suspicious_score` อัตโนมัติโดยเทียบกับ**ค่าเฉลี่ยราคาของสินค้ายี่ห้อ/รุ่นเดียวกันที่ลงขายอยู่จริงในระบบ** (ดู [[07_document/Database_Schema]] §🛡️) — `warranty_type` (`no_warranty`/`seller_warranty`/`manufacturer_warranty`/**`lifetime`** — เพิ่ม 2026-08-18, ใช้ sentinel `years=99` ภายใน)/`warranty_years`/`warranty_months`/`warranty_days` (ประกันแบบผสม, คำนวณ `remaining_warranty_months` ฝั่ง server เสมอ ห้ามส่งตรงๆ) — `sku`/`original_price` ยังเป็น optional field ที่ backend รับได้เหมือนเดิม แต่ **`sell-product.html` ไม่มีช่องกรอกทั้งสองแล้ว (ลบออก 2026-08-18)** SKU จึงถูก generate อัตโนมัติเสมอในทางปฏิบัติ |
| PUT | `/:id` | 🔒 | แก้ไขประกาศ (เจ้าของเท่านั้น) — partial update, มีการตรวจสอบ `price≥0`/`stock_quantity≥1` เช่นกันถ้าส่งค่ามา, รับฟิลด์ประกัน/`original_price` แบบเดียวกับตอนสร้างได้ (partial merge กับค่าที่มีอยู่เดิม) |
| DELETE | `/:id` | 🔒 | ลบประกาศ (เจ้าของเท่านั้น) |
| GET | `/seller/:sellerId/reviews` | - | รายการรีวิวของร้านค้า (แบ่งหน้า `?page=`, 10 รายการ/หน้า) → `{ reviews, total, page }` |

---

## 💳 C2C Order Booking & Chats (Prefix: `/api/bookings`)

> ทุกเส้นทางในกลุ่มนี้ต้องล็อกอิน (🔒 ทั้งหมด — บังคับผ่าน `router.use(authMiddleware)`)

| Method | Path | คำอธิบาย |
|---|---|---|
| POST | `/` | สร้างใบสั่งจอง — แยกเป็นออเดอร์ต่อผู้ขาย 1 ราย พร้อมเปิดห้องแชทอัตโนมัติ |
| PUT | `/:id/status` | เปลี่ยนสถานะออเดอร์ทั่วไป (`pending`→`waiting_verification`→`paid`→`shipped`→`completed`, หรือ `cancelled`) — endpoint หลักที่ frontend ใช้จริงสำหรับทุกการเปลี่ยนสถานะรวมถึงแจ้งจัดส่ง (`courier_name`/`tracking_number`/`proof_of_packing_url` ส่งมาพร้อม `status: 'shipped'` ได้) — **แก้บั๊กจริง 2026-08-20**: เดิมไม่มีการเช็คว่า order จ่ายเงินแล้วหรือยังก่อนอนุญาตให้เปลี่ยนเป็น `shipped` เลย (ผู้ขายกดยืนยันจัดส่งได้แม้ผู้ซื้อยังไม่ได้ยืนยันโอนเงินด้วยซ้ำ) และไม่เคยรับ/บันทึก `proof_of_packing_url` เลย (ฝั่ง frontend เดิมส่งมาผิดชื่อฟิลด์เป็น `packing_proof_url` ด้วย ยิ่งซ้ำเติมปัญหา) — แก้ครบทั้งสามจุดแล้ว |
| POST | `/:id/slip` | อัปโหลดสลิปโอนเงิน (`multipart/form-data`, ฟิลด์ `slip`) → เปลี่ยนสถานะเป็น `waiting_verification` (ไม่ auto-confirm เป็น `paid` อีกต่อไปตั้งแต่ Round 14, 2026-08-19 — ต้องรอผู้ขายกดยืนยันเองผ่าน `/status`) |
| PUT | `/:id/ship` | endpoint เฉพาะสำหรับแจ้งจัดส่งพร้อมเลขพัสดุ — มีอยู่ในระบบแต่ **frontend ไม่ได้เรียกใช้จริง** (ใช้ `/status` แทน, ยืนยันผ่าน grep ทั้ง `04_frontend/` ไม่พบการเรียกใช้เลย — dead code ที่ปลอดภัย ไม่ใช่บั๊ก) |
| GET | `/:id/tracking` | ดึงรายละเอียดการติดตามพัสดุ |
| POST | `/:id/dispute` | แจ้งเปิดข้อพิพาท (`reason`) — เฉพาะผู้ซื้อ/ผู้ขายของออเดอร์นั้น → สถานะเป็น `disputed` |
| GET | `/:id/evidence` | ออกเอกสารหลักฐานธุรกรรม (สำหรับพิมพ์/บันทึกเป็น PDF) |
| POST | `/:id/review` | ให้คะแนนร้านค้า (`rating` 1-5, `comment` optional) — เฉพาะผู้ซื้อของออเดอร์ที่ `status='completed'`, รีวิวได้ 1 ครั้ง/ออเดอร์ (คืน `409` ถ้ารีวิวไปแล้ว) → คำนวณ `seller_profiles.rating` ใหม่ทันที (ย้ายจาก `users.seller_rating` เดิมตั้งแต่ 2026-08-17) |
| PUT | `/:id/review` | แก้ไขรีวิวเดิม (เฉพาะเจ้าของรีวิว) |
| GET | `/:id/review` | ดึงรีวิวของออเดอร์นั้น (คืน `null` ถ้ายังไม่มี) |
| GET | `/chats/rooms` | รายชื่อห้องแชททั้งหมดของผู้ใช้ |
| GET | `/chats/rooms/:roomId` | รายละเอียดห้อง + ข้อความทั้งหมด — เฉพาะผู้ซื้อ/ผู้ขายของห้องนั้น **หรือแอดมิน** (เพิ่ม 2026-08-13 ให้แอดมินดูแชทประกอบการตัดสินข้อพิพาทได้จากหน้า "จัดการข้อพิพาท") — **แก้บั๊กจริง 2026-08-20**: เดิม response ไม่เคยมี `courier_name`/`tracking_number`/`proof_of_packing_url`/`is_seller_verified` เลย (ไม่ได้ query คอลัมน์เหล่านี้จาก `orders`/`seller_profiles` ตั้งแต่แรก) ทำให้เลขพัสดุ/รูปแพ็กของ/badge ผู้ขายยืนยันตัวตนไม่เคยแสดงในหน้าแชทได้เลยหลังโหลดหน้าใหม่ — แก้แล้ว |
| POST | `/chats/rooms/:roomId/messages` | ส่งข้อความในห้องแชท (broadcast ผ่าน Socket.io event `new_message`) |

---

## 🛡️ Admin (Prefix: `/api/admin`)

> ทุกเส้นทางต้องล็อกอิน **และ** เป็น `role='admin'` เท่านั้น (บังคับผ่าน `authMiddleware` + `adminMiddleware`)

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/stats` | สถิติแดชบอร์ด (ยอดขายรวม, สินค้าพร้อมขาย, สมาชิกใหม่, สัดส่วนยอดขายตามหมวดหมู่) |
| GET | `/users` | รายชื่อสมาชิกทั้งหมด |
| PUT | `/users/:id/status` | ระงับ/ปลดระงับบัญชีผู้ใช้ |
| GET | `/products/flagged` | รายการสินค้าที่ถูกระบบ/ผู้ใช้ปักธงว่าน่าสงสัย |
| GET | `/products` | เพิ่ม 2026-08-17 — รายการสินค้า**ทั้งหมด**ในตลาด (read-only) พร้อมตัวกรอง `?category=`/`?status=`/`?search=` (ค้นจาก brand/model/serial_number) และ **`?review_status=` (เพิ่ม 2026-08-20)** — ขับเคลื่อนแท็บ "สินค้าในตลาดทั้งหมด" ในหน้าแอดมิน (เดิมคือแท็บ "คลังอะไหล่มาตรฐาน" ที่จัดการตาราง `parts` — เปลี่ยนบทบาทเป็นหน้าตรวจสอบตลาดทั่วไปแทน หลังลบ `parts` ออกจากระบบ) |
| PUT | `/products/:id/review` | อนุมัติ/ปฏิเสธประกาศขายที่ถูกปักธง — เดิมมีปุ่มเรียกเฉพาะในแท็บ "สินค้าที่ถูกปักธง" **เพิ่มปุ่มเรียกจากแท็บ "สินค้าในตลาดทั้งหมด" ได้ด้วยแล้ว (2026-08-20)** |
| DELETE | `/products/:id` | **เพิ่ม 2026-08-20** — ลบประกาศสินค้าถาวร (ตรวจก่อนว่ามี `order_items` อ้างอิงอยู่ไหม ถ้ามีปฏิเสธด้วย `400`) บันทึก `admin_logs` เสมอ — แยกจาก `DELETE /api/products/:id` ฝั่งผู้ขาย (ที่ก็อนุญาต `role='admin'` ลบได้เหมือนกัน แต่ไม่บันทึก audit log) เพื่อให้การลบของแอดมินมี log ที่ตรวจสอบย้อนหลังได้เสมอ |
| GET | `/disputes` | รายการออเดอร์ที่มีสถานะข้อพิพาท |
| PUT | `/orders/:id/override` | แอดมินบังคับเปลี่ยนสถานะออเดอร์เพื่อยุติข้อพิพาท |
| DELETE | `/reviews/:id` | ลบรีวิว (moderation กรณีเนื้อหาไม่เหมาะสม) → คำนวณ `seller_profiles.rating` ของร้านนั้นใหม่ทันที |

> ⚠️ **`POST /parts`, `PUT /parts/:id`, `DELETE /parts/:id` ถูกลบออกจากระบบแล้ว (2026-08-17)** พร้อมตาราง `parts` ที่ endpoint เหล่านี้เคย CRUD — แอดมินไม่มีแคตตาล็อกกลางให้จัดการอีกต่อไป มีแต่การตรวจสอบ/อนุมัติสินค้าที่ผู้ขายลงขายจริงเท่านั้น (ดู `GET /products` ด้านบน)

ทุก action ของแอดมิน (ระงับบัญชี, อนุมัติ/ปฏิเสธสินค้า) จะถูกบันทึกลงตาราง `admin_logs` โดยอัตโนมัติ
