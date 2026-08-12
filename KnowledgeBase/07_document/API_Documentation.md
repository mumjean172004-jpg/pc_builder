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
| POST | `/compatibility` | - | ตรวจสอบความเข้ากันได้ (`{parts: [{part_id, quantity}]}`) → `{compatible, warnings[], errors[]}` |
| POST | `/intelligence` | - | ประเมินคอขวด/ค่าไฟ/เฟรมเรตโดยประมาณ |
| POST | `/cross-match` | - | เทียบราคามือหนึ่งกับอะไหล่มือสองในตลาดของชุดจัดสเปก |
| POST | `/auto` | - | ตัวช่วยจัดสเปกอัตโนมัติตามงบประมาณ/การใช้งาน — คืน 3 ระดับ (ประหยัดสุด/คุ้มค่าสุด/แรงสุด) |
| POST | `/` | 🔒 | บันทึกชุดจัดสเปกใหม่ (`name`, `is_public`, `parts: [{part_id, quantity}]`) |
| PUT | `/:id` | 🔒 | แก้ไข (เจ้าของเท่านั้น) — `name`/`description`/`is_public`/`parts` ทุกฟิลด์ optional (partial update) |
| DELETE | `/:id` | 🔒 | ลบชุดจัดสเปก (เจ้าของเท่านั้น) |
| POST/DELETE | `/:id/like` | 🔒 | กดไลก์/ยกเลิกไลก์ → คืน `likes_count` ล่าสุด |
| POST | `/:id/comments` | 🔒 | แสดงความคิดเห็น (`content`) |

### `/api/parts` (สาธารณะทั้งหมด)
`GET /` (รายการอะไหล่, `is_active=1` เท่านั้น), `GET /categories`, `GET /brands`, `GET /category/:slug`, `GET /:id`

---

## 📦 Marketplace Products (Prefix: `/api/products`)

| Method | Path | Auth | คำอธิบาย |
|---|---|---|---|
| GET | `/metadata` | - | หมวดหมู่/อะไหล่/แบรนด์ที่ใช้ในฟอร์มลงประกาศ |
| POST | `/availability` | - | เช็คสถานะพร้อมขายของสินค้าหลายชิ้นพร้อมกัน |
| GET | `/` | - | รายการสินค้า พร้อมตัวกรอง: `category`, `brand`, `condition`, `min_price`/`max_price`, `has_warranty`, `sort` (`created_desc`/`price_asc`/`price_desc`/`warranty_desc`), `search`, `page` (default 1), `limit` (default 24, สูงสุด 100) — **คืนเป็น envelope `{ data, total, page, totalPages }` ไม่ใช่ array ตรงๆ อีกต่อไป** (เปลี่ยนเมื่อ 2026-08-12 พร้อมกับแก้ทุกจุดที่เรียกฝั่ง frontend) ตรรกะคำนวณหน้าอยู่ที่ `services/paginationService.js` (มี unit test) |
| GET | `/:id` | - | รายละเอียดสินค้า 1 ชิ้น |
| POST | `/` | 🔒 | ลงประกาศขายใหม่ — ผ่าน `productValidator` (บังคับ `price≥0`, `stock_quantity≥1`, `condition`, `serial_number`) → คำนวณ `suspicious_score` อัตโนมัติ (ดู [[05_pc_builder/Marketplace_Listing_Checks]]) |
| PUT | `/:id` | 🔒 | แก้ไขประกาศ (เจ้าของเท่านั้น) — partial update, มีการตรวจสอบ `price≥0`/`stock_quantity≥1` เช่นกันถ้าส่งค่ามา |
| DELETE | `/:id` | 🔒 | ลบประกาศ (เจ้าของเท่านั้น) |
| GET | `/seller/:sellerId/reviews` | - | รายการรีวิวของร้านค้า (แบ่งหน้า `?page=`, 10 รายการ/หน้า) → `{ reviews, total, page }` |

---

## 💳 C2C Order Booking & Chats (Prefix: `/api/bookings`)

> ทุกเส้นทางในกลุ่มนี้ต้องล็อกอิน (🔒 ทั้งหมด — บังคับผ่าน `router.use(authMiddleware)`)

| Method | Path | คำอธิบาย |
|---|---|---|
| POST | `/` | สร้างใบสั่งจอง — แยกเป็นออเดอร์ต่อผู้ขาย 1 ราย พร้อมเปิดห้องแชทอัตโนมัติ |
| PUT | `/:id/status` | เปลี่ยนสถานะออเดอร์ทั่วไป (`pending`→`waiting_verification`→`paid`→`shipped`→`completed`, หรือ `cancelled`) — endpoint หลักที่ frontend ใช้จริงสำหรับทุกการเปลี่ยนสถานะรวมถึงแจ้งจัดส่ง |
| POST | `/:id/slip` | อัปโหลดสลิปโอนเงิน (`multipart/form-data`, ฟิลด์ `slip`) → เปลี่ยนสถานะเป็น `waiting_verification` |
| PUT | `/:id/ship` | endpoint เฉพาะสำหรับแจ้งจัดส่งพร้อมเลขพัสดุ — มีอยู่ในระบบแต่ **frontend ไม่ได้เรียกใช้จริง** (ใช้ `/status` แทน) |
| GET | `/:id/tracking` | ดึงรายละเอียดการติดตามพัสดุ |
| POST | `/:id/dispute` | แจ้งเปิดข้อพิพาท (`reason`) — เฉพาะผู้ซื้อ/ผู้ขายของออเดอร์นั้น → สถานะเป็น `disputed` |
| GET | `/:id/evidence` | ออกเอกสารหลักฐานธุรกรรม (สำหรับพิมพ์/บันทึกเป็น PDF) |
| POST | `/:id/review` | ให้คะแนนร้านค้า (`rating` 1-5, `comment` optional) — เฉพาะผู้ซื้อของออเดอร์ที่ `status='completed'`, รีวิวได้ 1 ครั้ง/ออเดอร์ (คืน `409` ถ้ารีวิวไปแล้ว) → คำนวณ `users.seller_rating` ใหม่ทันที |
| PUT | `/:id/review` | แก้ไขรีวิวเดิม (เฉพาะเจ้าของรีวิว) |
| GET | `/:id/review` | ดึงรีวิวของออเดอร์นั้น (คืน `null` ถ้ายังไม่มี) |
| GET | `/chats/rooms` | รายชื่อห้องแชททั้งหมดของผู้ใช้ |
| GET | `/chats/rooms/:roomId` | รายละเอียดห้อง + ข้อความทั้งหมด |
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
| PUT | `/products/:id/review` | อนุมัติ/ปฏิเสธประกาศขายที่ถูกปักธง |
| GET | `/disputes` | รายการออเดอร์ที่มีสถานะข้อพิพาท |
| PUT | `/orders/:id/override` | แอดมินบังคับเปลี่ยนสถานะออเดอร์เพื่อยุติข้อพิพาท |
| POST | `/parts` | เพิ่มอะไหล่มาตรฐานใหม่เข้าแคตตาล็อก (`name`, `category_id`, `brand`, `price` จำเป็น) |
| PUT | `/parts/:id` | แก้ไขอะไหล่มาตรฐาน (partial update — รวม `is_active`) |
| DELETE | `/parts/:id` | ลบอะไหล่มาตรฐาน — คืน `409` พร้อมข้อความอธิบาย ถ้ามีสินค้า/ชุดจัดสเปคอ้างอิงอยู่ (ป้องกันที่ระดับฐานข้อมูลด้วย FK RESTRICT) |
| DELETE | `/reviews/:id` | ลบรีวิว (moderation กรณีเนื้อหาไม่เหมาะสม) → คำนวณ `seller_rating` ของร้านนั้นใหม่ทันที |

ทุก action ของแอดมิน (ระงับบัญชี, อนุมัติ/ปฏิเสธสินค้า, เพิ่ม/แก้ไข/ลบอะไหล่) จะถูกบันทึกลงตาราง `admin_logs` โดยอัตโนมัติ
