# PC Builder Pro

แพลตฟอร์มจัดสเปกคอมพิวเตอร์ออนไลน์ และตลาดกลางซื้อขายชิ้นส่วนคอมพิวเตอร์มือสอง (C2C) — โปรเจกต์ปริญญานิพนธ์ (Senior Project), คณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยเทคโนโลยีราชมงคลสุวรรณภูมิ

รวม 2 ระบบเข้าด้วยกัน:
1. **PC Builder** — เครื่องมือจัดสเปกคอมพิวเตอร์ พร้อมระบบตรวจสอบความเข้ากันได้ของชิ้นส่วน (ซ็อกเก็ต CPU/เมนบอร์ด, ชนิด RAM, ขนาดตัวเครื่อง, กำลังไฟ PSU) และตัวช่วยจัดสเปกอัตโนมัติตามงบประมาณ
2. **Marketplace** — ตลาดกลาง C2C สำหรับซื้อขายชิ้นส่วนคอมพิวเตอร์มือสอง พร้อมระบบป้องกันการทุจริต (ตรวจราคาต่ำผิดปกติ, ตรวจซีเรียลซ้ำ), ระบบแชทเจรจาซื้อขายแบบเรียลไทม์, ยืนยันสลิปโอนเงิน, และระบบจัดการข้อพิพาทโดยแอดมิน

## Tech Stack

| ส่วน | เทคโนโลยี |
|---|---|
| Frontend | Vanilla HTML5 / CSS3 / JavaScript (ไม่มีเฟรมเวิร์ก) |
| Backend | Node.js + Express.js |
| Database | MySQL / MariaDB (ผ่าน `mysql2/promise` connection pool) |
| Real-time | Socket.io (แชทเจรจาซื้อขาย, แจ้งเตือนสถานะออเดอร์) |
| Auth | JWT (เก็บใน HttpOnly cookie) + bcrypt |
| File uploads | Multer |
| Testing | Jest (unit tests สำหรับ compatibility engine, anti-fraud scoring, auth) |

## เริ่มต้นใช้งาน (Local Setup)

### สิ่งที่ต้องมีก่อน
- Node.js
- MySQL หรือ MariaDB (พอร์ตเริ่มต้น `3306`) — เช่นผ่าน XAMPP

### ขั้นตอน

1. **ติดตั้งฐานข้อมูล** — สร้างฐานข้อมูลและ import ตารางตามลำดับ:
   ```
   02_database/schema_mysql.sql
   02_database/seed_data_mysql.sql
   ```

2. **ตั้งค่าไฟล์ environment** — คัดลอก `03_backend/.env.example` เป็น `03_backend/.env` แล้วกรอกค่าการเชื่อมต่อฐานข้อมูล (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`) และค่าอื่นๆ ตามที่ระบุในไฟล์ (เช่น `JWT_SECRET`)

3. **ติดตั้ง dependencies และรันเซิร์ฟเวอร์**:
   ```bash
   cd 03_backend
   npm install
   npm run dev    # hot-reload ด้วย nodemon, หรือ npm start สำหรับรันปกติ
   ```

4. **เปิดใช้งาน** — เซิร์ฟเวอร์รันที่ `http://localhost:3000` และให้บริการทั้ง API (`/api/*`) และไฟล์หน้าเว็บ (จาก `04_frontend/`) ในตัวเดียวกัน — เปิด `http://localhost:3000/index.html` ในเบราว์เซอร์ได้เลย ไม่ต้องรันหน้าเว็บแยก

### รัน unit tests
```bash
cd 03_backend
npm test
```

## โครงสร้างโปรเจกต์

```
04_frontend/    หน้าเว็บ (vanilla HTML/CSS/JS)
03_backend/     Express API server
02_database/    schema และ seed data (MySQL)
KnowledgeBase/  เอกสารประกอบโครงการ (Obsidian vault) — ดู KnowledgeBase/Index.md
```

**เอกสารเชิงลึก** (สถาปัตยกรรม, กฎธุรกิจ, API endpoints, ฐานข้อมูล ฯลฯ) อยู่ใน [`KnowledgeBase/`](KnowledgeBase/Index.md) — เริ่มอ่านจาก `KnowledgeBase/Index.md`
