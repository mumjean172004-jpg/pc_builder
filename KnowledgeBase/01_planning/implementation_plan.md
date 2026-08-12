# แผนการพัฒนาระบบแชทเรียลไทม์ (Phase 3 Implementation Plan - Socket.io)

การพัฒนาฟังก์ชันการทำงานหลักใน **เฟส 3** เพื่อเปลี่ยนระบบเจรจาซื้อขาย (C2C Chat) จากระบบเดิมที่ใช้การดึงข้อมูลเป็นระยะ (API Polling ทุก 3 วินาที) ให้เป็นระบบส่งข้อมูลแบบเรียลไทม์ผ่าน **WebSockets (Socket.io)**

---

## 📢 รายละเอียดทางเทคนิค (Technical Design)

### 1. โครงสร้างการผูกเซิร์ฟเวอร์ (Server Integration)
* อัปเกรดตัวเริ่มการทำงานของ Express Server ใน [server.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/server.js) ให้ครอบคลุมด้วย Node.js `http` Module เพื่อให้สามารถนำพอร์ตไปแชร์ใช้งานร่วมกับ Socket.io ได้
* เปลี่ยนจาก `app.listen(PORT)` มาเป็น `server.listen(PORT)`

### 2. การยืนยันสิทธิการเข้าถึงของ Socket (Security Middleware)
* ป้องกันห้องสนทนาโดยตั้งค่า Socket.io Middleware ให้ตรวจอ่าน JWT Token ที่ส่งมาจากฝั่งหน้าบ้านทางก้าน `handshake.auth.token`
* ทำการถอดรหัสความปลอดภัยของ Token เพื่อสกัดเอา `userId` ไปเก็บไว้บนออบเจกต์ Socket (เช่น `socket.userId`) ช่วยยืนยันว่าไม่มี Socket เถื่อนแอบเข้ามาดักอ่านข้อความในระบบ

### 3. การจัดการห้องแชท (WebSockets Rooms)
* เมื่อผู้ใช้คลิกเปิดห้องแชตบนหน้าเว็บ ➔ หน้าบ้านจะยิง Event `join_room` พร้อมส่ง `roomId` มาหาหลังบ้าน
* หลังบ้านจะตรวจสอบว่าผู้ใช้นั้นมีสิทธิ์ในห้องแชตดังกล่าวจริง (เป็นผู้ซื้อหรือผู้ขาย) แล้วจึงใช้คำสั่ง `socket.join("room_" + roomId)`
* เมื่อมีการพิมพ์ข้อความส่ง หรือมีการกดอัปเดตสถานะการเงิน/จัดส่ง/คืนสลิป ➔ หลังบ้านจะบันทึกลง MySQL ตามปกติ แล้วจึงทำตัวกระจายเสียง (Broadcast) ไปหาทุกคนในห้องสนทนานั้นทันที:
  - `new_message`: ส่งข้อมูลข้อความแชตใหม่ไปแสดงผลบนจออีกฝั่งทันที
  - `status_updated`: ส่งข้อมูลการปรับเปลี่ยนสถานะสั่งจองเพื่อทำการรีเฟรชหน้าจอปุ่มตัวเลือกให้ทำงานเรียลไทม์

### 4. หน้าบ้าน (Frontend)
* ยกเลิกลูปดึงข้อมูลจำลอง `pollInterval = setInterval(...)` ทุก 3 วินาทีใน [inbox.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/inbox.html) ออกไป เพื่อป้องกันปัญหายอดขอคิวรียิงชนฐานข้อมูลบ่อยโดยไม่จำเป็น
* ดำเนินการโหลดสคริปต์ `/socket.io/socket.io.js` ของระบบ Socket.io มาใช้งาน และเขียนคลาสจัดเชื่อมโยงเข้าหากลุ่ม Event `new_message` และ `status_updated`

---

## 🛠️ รายละเอียดการเปลี่ยนแปลง (Proposed Changes)

### 1. ระบบหลังบ้าน (Backend)

#### [MODIFY] [server.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/server.js)
* อัปเกรดเซิร์ฟเวอร์หลักให้รองรับการเชื่อมต่อของ Socket.io
* ย้ายฟังก์ชันจัดคีย์ Logic แชตเรียลไทม์มาตั้งเป็นโมดูลแยกหรือจัดระเบียบเขียนโครงคุมการเชื่อมเข้าออกของ Websocket

#### [NEW] [socket.js (Helper/Init)](file:///c:/Users/Kanomjean/Downloads/project/03_backend/config/socket.js)
โมดูลแยกสำหรับกำหนดค่าคอนฟิก, พอร์ตเชื่อมต่อ, ตรวจสอบ JWT Auth Handshake และจัดการ Events ของ Socket.io

#### [MODIFY] [bookingController.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/controllers/bookingController.js)
* ปรับแต่งฟังก์ชัน `postMessage` และ `updateBookingStatus` ให้ทำการเรียกใช้ตัวส่งแพร่สัญญาณออกผ่านตัวช่วยส่งของ Socket.io เมื่อระบบเขียนผลลัพธ์ลงฐานข้อมูลสำเร็จ

---

### 2. ระบบหน้าบ้าน (Frontend)

#### [MODIFY] [inbox.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/inbox.html)
* แนบสคริปต์ตัวลูกของ Socket.io: `<script src="/socket.io/socket.io.js"></script>`
* ลบรหัสการดึงโพล `pollInterval` ออกทั้งหมด
* พัฒนาลอจิกเริ่มเชื่อมต่อ Socket เมื่อผู้ใช้กดคลิกเปิดห้องสนทนา และคอยรับ Events ต่างๆ เพื่อมาวาด Render หน้าต่างแชตแบบเรียลไทม์

---

## 🔍 แผนการทดสอบความถูกต้อง (Verification Plan)

1. **ติดตั้ง Socket.io:** ทำการติดตั้งแพ็กเกจ `socket.io` ลงใน `03_backend`
2. **ทดสอบเจรจาซื้อขายเรียลไทม์ (Live Chat Test):**
   * เปิดเบราว์เซอร์ 2 หน้าต่างในโหมดไม่ระบุตัวตน (Incognito)
   * หน้าต่างที่ 1: เข้าสู่ระบบเป็นผู้ซื้อ (johndoe) ➔ เปิดหน้าแชต Inbox
   * หน้าต่างที่ 2: เข้าสู่ระบบเป็นผู้ขาย (janedoe) ➔ เปิดหน้าแชต Inbox
   * ทดลองกรอกข้อมูลพิมพ์แชตคุยโต้ตอบ ➔ สังเกตว่าข้อความของอีกฝั่งแสดงขึ้นจอบนหน้าจอทันทีโดยไม่จำเป็นต้องทำการกดรีเฟรชหรือรอเวลา 3 วินาที
3. **ทดสอบยืนยันสลิปและปรับสถานะออเดอร์:**
   * ฝั่งผู้ซื้อกดแนบอัปโหลดสลิป ➔ หน้าจอผู้ขายเปลี่ยนแถบการกระทำเป็นปุ่ม "ตรวจสอบหลักฐานการโอนเงิน" ทันทีโดยไม่ต้องกด F5
   * ฝั่งผู้ขายกดยืนยันยอดโอนสำเร็จ ➔ หน้าจอผู้ซื้อเปลี่ยน Badge สีสถานะเป็น "ชำระเงินแล้ว" แบบเรียลไทม์
