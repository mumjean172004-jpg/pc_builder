# รายการงานปรับปรุงระบบหลังบ้าน (Phase 1 Tasks)

- [x] 1. อัปเกรดฐานข้อมูลเป็น MySQL
  - [x] สร้างไฟล์ [schema_mysql.sql](file:///c:/Users/Kanomjean/Downloads/project/02_database/schema_mysql.sql) กำหนดโครงสร้างตารางข้อมูลเวอร์ชัน MySQL
  - [x] ปรับปรุงไฟล์เชื่อมต่อ [database.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/config/database.js) ให้เชื่อมต่อ MySQL ผ่าน `mysql2/promise` และปิดฟังก์ชันจำลองแปลง SQL เดิม

- [x] 2. ปรับปรุงระบบความปลอดภัยเซสชัน (Cookie-based Auth)
  - [x] ติดตั้ง `cookie-parser` และอัปเดตลงทะเบียนใน [server.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/server.js)
  - [x] ปรับปรุง Middleware ยืนยันสิทธิ [auth.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/middleware/auth.js) ให้อ่านโทเค็นจากคุกกี้เป็นหลัก
  - [x] ปรับปรุงกระบวนการสร้างโทเค็นใน [authController.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/controllers/authController.js) ให้ส่งผ่าน HttpOnly คุกกี้ และเพิ่ม API `/logout`
  - [x] อัปเดตไฟล์หน้าบ้าน [app.js](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/js/app.js) ให้รองรับการกดส่งข้อมูลและเรียกใช้ API `/logout` เมื่อออกจากระบบ

- [x] 3. ติดตั้งระบบตรวจสอบข้อมูลขาเข้า (Input Validation)
  - [x] พัฒนาไฟล์ [validators.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/middleware/validators.js) เพื่อเขียนชุดสกรีนข้อมูลผ่าน `express-validator`
  - [x] เชื่อมต่อ Validator เข้าสู่ Routes ต่างๆ ในระบบหลังบ้าน

- [x] 4. ปรับเปลี่ยนรหัสดึง ID ล่าสุดใน Controller
  - [x] แก้ไขการดึงค่าไอดีข้อมูลใหม่จาก `lastInsertRowid` มาดึงค่าผ่านตัวแปร `insertId` ที่รองรับกับ MySQL ใน [productController.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/controllers/productController.js), [buildsController.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/controllers/buildsController.js), และ [bookingController.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/controllers/bookingController.js)

- [x] 5. ตรวจสอบการทำงานของระบบ (Verification)
  - [x] ติดตั้งแพ็กเกจไลบรารีที่จำเป็น (`mysql2`, `cookie-parser`, `express-validator`)
  - [x] รันโปรแกรมเพื่อทดสอบการเชื่อมต่อ MySQL, การสร้างคุกกี้ และการแจ้งเตือน Validation ขาเข้า

---

# รายการงานระบบอัปโหลดไฟล์จำลองชำระเงิน (Phase 2 Tasks)

- [x] 6. ติดตั้งระบบอัปโหลดไฟล์ด้วย Multer
  - [x] พัฒนา Middleware [upload.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/middleware/upload.js) สำหรับคัดกรองขนาดและชนิดของรูปภาพ
  - [x] เปิดบริการ static directory สำหรับโฟลเดอร์ `/uploads` และสร้างรูทอัปโหลดไฟล์ที่ [server.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/server.js)

- [x] 7. อัปเกรดฐานข้อมูลและโมเดลสถานะออเดอร์
  - [x] ดำเนินการอัปเกรดคอลัมน์ `payment_slip_url` และปรับปรุงสถานะ `status` เป็น `waiting_verification` ในตาราง `orders`
  - [x] ปรับปรุงการตรวจสอบและการเปลี่ยนสถานะใน [bookingController.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/controllers/bookingController.js)

- [x] 8. พัฒนาระบบอัปโหลดภาพประกาศขายฝั่งหน้าบ้าน
  - [x] แก้ไขฟอร์มหน้า [sell-product.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/sell-product.html) ให้สามารถเลือกอัปโหลดรูปภาพจริงได้

- [x] 9. พัฒนาระบบชำระเงินและตรวจสลิปโอนเงินในห้องแชต C2C
  - [x] ปรับปรุงกล่องแชตและ Modal ชำระเงินใน [inbox.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/inbox.html) ฝั่งผู้ซื้อให้สร้าง PromptPay QR Code จำลองและอัปโหลดสลิปได้
  - [x] ปรับปรุงระบบตรวจหลักฐานใน [inbox.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/inbox.html) ฝั่งผู้ขายให้ตรวจสอบรูปสลิปและกดยืนยันยอดเงินหรือตีกลับสลิปได้

- [x] 10. ตรวจสอบการทำงานของเฟส 2 (Verification Phase 2)
  - [x] รันระบบและตรวจสอบกระบวนการอัปโหลดไฟล์และการจอง-ชำระเงิน-ตรวจสลิปให้ถูกต้องสมบูรณ์

---

# รายการงานระบบสื่อสารและแชทแบบเรียลไทม์ (Phase 3 Tasks)

- [x] 11. ติดตั้งระบบ Socket.io บนหลังบ้าน
  - [x] พัฒนาโมดูลเริ่มต้น [socket.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/config/socket.js) เพื่อตั้งค่า Socket.io และกำหนด Middleware ตรวจ JWT Token
  - [x] ปรับเปลี่ยนพอร์ตและวิธีการบูตใน [server.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/server.js) ให้ใช้ HTTP Server ในการบูตคู่กับ Socket.io

- [x] 12. พัฒนาระบบคัดกรองห้องและการสื่อสารเรียลไทม์
  - [x] จัดระเบียบการสืบค้นสิทธิ์เข้าห้องแชตและการรับส่งข้อมูลแชตเรียลไทม์ใน [socket.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/config/socket.js)
  - [x] ผูกสัญญาณ Broadcast ใน [bookingController.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/controllers/bookingController.js) เมื่อพิมพ์แชตหรืออัปเดตสถานะการเงินสำเร็จ

- [x] 13. ปรับปรุงหน้าแชตบนหน้าบ้านให้ทำงานแบบเรียลไทม์
  - [x] แนบตัวแปลภาษา Socket.io และยกเลิกลูป Polling เดิมในหน้า [inbox.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/inbox.html)
  - [x] ผูกดัก Event ข้อความใหม่และการเปลี่ยนสถานะในห้องแชตให้แสดงผลแบบเรียลไทม์ทันที

- [x] 14. ตรวจสอบผลการทำงานในเฟส 3 (Verification Phase 3)
  - [x] ตรวจเช็กการเข้าสู่ระบบแชตแยกบัญชีผู้ซื้อ/ผู้ขาย และยืนยันการคุยแชตโต้ตอบและเปลี่ยนสลิปแบบเรียลไทม์

---

# รายการงานระบบแอดมินหลังบ้าน (Phase 4 Tasks)

- [x] 15. อัปเกรดฐานข้อมูลสำหรับแอดมินหลังบ้าน
  - [x] อัปเดตโครงสร้างฟิลด์ `role` ในตาราง `users` และประเภท `'disputed'` ในตาราง `orders` ใน [schema_mysql.sql](file:///c:/Users/Kanomjean/Downloads/project/02_database/schema_mysql.sql)
  - [x] จัดระเบียบและรันอัปเกรดฐานข้อมูล MySQL ของเครื่องผู้ใช้
- [x] 16. พัฒนาระบบ API ป้องกันสิทธิ์และจัดทำข้อมูลหลังบ้าน
  - [x] พัฒนา Middleware `isAdmin` ใน [auth.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/middleware/auth.js)
  - [x] สร้างการดึงสถิติ Dashboard และลอจิกจัดการแอดมินใน [adminController.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/controllers/adminController.js) และผูกเส้นทางใน [adminRoutes.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/routes/adminRoutes.js)
- [x] 17. พัฒนาหน้าจอ Admin Dashboard ฝั่งหน้าบ้าน
  - [x] สร้างหน้าแผงวิเคราะห์และแผนภูมิ [index.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/admin/index.html)
  - [x] สร้างหน้าคัดกรองผู้ใช้งาน [users.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/admin/users.html) และจัดการชิ้นส่วน
  - [x] สร้างหน้าจัดการสินค้าทุจริต [products.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/admin/products.html) และหน้าตัดพิพาทการเงิน [disputes.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/admin/disputes.html)
- [x] 18. ตรวจสอบกระบวนการทั้งหมดของเฟส 4 (Verification Phase 4)
  - [x] รันการตรวจสอบการกั้นสิทธิ์ผู้ใช้ทั่วไป, สิทธิ์การระงับบัญชี และการยุติข้อพิพาทโดยแอดมิน
