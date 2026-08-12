# 🚀 Deployment Guide (Railway)

วิธี deploy ระบบทั้งหมด (backend + frontend + MySQL) ขึ้น Railway จริง — บันทึกจากการ deploy ครั้งแรกเมื่อ 2026-08-12 พร้อมทุกปัญหาที่เจอจริงและวิธีแก้ ให้ AI agent/นักพัฒนาคนอื่นไม่ต้องไล่แก้ซ้ำ

> [!NOTE]
> **ห้ามใส่รหัสผ่าน/connection string จริงลงไฟล์นี้หรือไฟล์ใดๆ ใน repo** — ไฟล์นี้ถูก commit ขึ้น GitHub เก็บเฉพาะ *ชื่อ* ตัวแปรและ *วิธีการ* เท่านั้น ค่าจริงเก็บไว้ในหน้า Railway Variables เท่านั้น

---

## สถาปัตยกรรมที่ใช้จริง

* **Frontend + Backend**: รวมเป็น service เดียวบน Railway (Express serve ทั้ง API และไฟล์ static — เหมือนตอนรัน local ทุกประการ ไม่ได้แยก Firebase Hosting)
* **Database**: Railway MySQL plugin (ใน project เดียวกัน, เชื่อมผ่าน private network `mysql.railway.internal:3306`)
* **Build**: **Dockerfile ที่ root ของ repo** (ไม่ใช่ Railway's Railpack/Nixpacks default) — ดูเหตุผลด้านล่าง

---

## ⚠️ ปัญหาที่เจอจริงและวิธีแก้ (เรียงตามลำดับที่เจอ)

### 1. Railway's "Root Directory" ทำให้ `04_frontend/` หายจากคอนเทนเนอร์
`server.js` เสิร์ฟหน้าเว็บด้วย `path.join(__dirname, '..', '04_frontend')` — คือขึ้นไปหนึ่งชั้นจาก `03_backend` ไปหา `04_frontend` (โฟลเดอร์พี่น้อง) ใช้ได้ปกติตอน local เพราะ repo ทั้งก้อนอยู่เครื่องเดียวกัน

แต่ถ้าตั้งค่า **Root Directory = `03_backend`** บน Railway (ดูเป็นทางเลือกที่ตรงไปตรงมาที่สุดในตอนแรก) Railway จะตัดโค้ดเฉพาะโฟลเดอร์นั้นเข้าคอนเทนเนอร์เท่านั้น — `04_frontend/` ไม่ถูกก็อปปี้เข้าไปด้วยเลย ทำให้ทุกหน้าเว็บ 404 ถึงแม้ API จะทำงานปกติ

ลองแก้ด้วย Custom Build/Start Command (`cd 03_backend && npm install` / `npm start`) พร้อมเคลียร์ Root Directory ให้ว่าง — ก็ยังไม่เวิร์ก เพราะ **Railway's Railpack builder auto-detect `package.json` ที่เจอก่อน แล้วถือเป็น effective root ของตัวเอง โดยไม่สนใจโฟลเดอร์พี่น้อง** ไม่ว่าจะตั้ง Root Directory/Build Command ยังไงก็ตาม

**วิธีแก้ที่ได้ผลจริง**: เขียน `Dockerfile` ไว้ที่ root ของ repo คุมเองตรงๆ ว่าอะไรถูกก็อปปี้เข้าคอนเทนเนอร์บ้าง (ดู `/Dockerfile`) — สำคัญ: **ต้องไปเปลี่ยน Railway Settings → "Builder" จาก "Railpack" เป็น "Dockerfile" เองด้วย** ระบบไม่ auto-switch ให้ถึงแม้จะมี Dockerfile อยู่ที่ root แล้วก็ตาม (เจอ log ยืนยันว่ายังใช้ Railpack อยู่แม้ push Dockerfile ไปแล้ว)

### 2. `express-rate-limit` พังหลัง reverse proxy — ต้อง `trust proxy`
Railway (เหมือนแพลตฟอร์ม cloud ทั่วไป) อยู่หลัง reverse proxy ที่ตั้ง header `X-Forwarded-For` เสมอ ถ้า Express ไม่ได้ตั้ง `app.set('trust proxy', 1)` จะเจอ `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` ทุกครั้งที่มีคนเรียก endpoint ที่มี rate limit (login/register/OTP) — พังเงียบๆ เฉพาะ production เพราะ local dev ไม่มี proxy คั่นกลาง จึงไม่เคยเจอตอนทดสอบเครื่อง

แก้แล้วใน `server.js` (บรรทัดเดียว หลัง `const app = express();`) — ไม่กระทบ local dev เลย

### 3. `better-sqlite3` เป็น dependency ที่ไม่ได้ใช้จริง — เอาออกแล้ว
เหลือจากก่อนย้ายมาใช้ MySQL อ้างอิงเฉพาะใน `scripts/init-db.js` (ไม่ได้ถูกเรียกจาก flow จริง) เป็น native module ที่ต้อง compile ตอน build — ความเสี่ยง build fail เพิ่มโดยไม่จำเป็น ลบออกจาก `package.json` แล้ว (ไฟล์ `init-db.js` ยังอยู่แต่จะรันไม่ได้ถ้าเรียกตรงๆ — ไม่มีใครเรียกมันอยู่แล้ว)

### 4. `DB_HOST`/`DB_NAME` ต้องตั้งเป็นค่า Railway ไม่ใช่ค่า local
เผลอใส่ค่า default ของเครื่อง dev (`localhost` / `pc_builder`) ไปตอนแรก ทำให้ backend พยายามต่อ `127.0.0.1:3306` (ตัวเอง) แล้ว `ECONNREFUSED` เสมอ — ต้องเป็นค่าจาก Railway MySQL service's Variables tab

---

## ✅ Checklist สำหรับ deploy ใหม่ (หรือ deploy โปรเจกต์อื่นที่โครงสร้างคล้ายกัน)

1. Push repo ขึ้น GitHub (ต้องมี `Dockerfile` ที่ root แล้ว)
2. Railway → New Project → Deploy from GitHub repo
3. Settings → **Builder → เปลี่ยนเป็น "Dockerfile" ด้วยมือ** (ข้อ 1 ด้านบน) — อย่าใช้ Root Directory/Custom Build Command
4. เพิ่ม MySQL plugin ในโปรเจกต์เดียวกัน → import `02_database/schema_mysql.sql` แล้ว (ถ้าต้องการ) `seed_data_mysql.sql` ผ่าน public endpoint ชั่วคราว (เปิด Public Access ใน MySQL service → Connect → Public Network, import เสร็จปิดกลับได้)
5. ตั้ง Environment Variables ของ backend service (อ้างอิงชื่อจาก `.env.example`):
   - `DB_HOST` = ค่า private network ของ MySQL service (เช่น `mysql.railway.internal`)
   - `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` = ตามที่ MySQL service ให้มา
   - `JWT_SECRET` = สุ่มใหม่ ≥32 ตัวอักษร (ห้ามใช้ค่าตัวอย่างใน `.env.example`)
   - `NODE_ENV=production`
6. เปิด **Volume** สำหรับ `03_backend/uploads` (ไม่งั้นรูปสินค้า/สลิปหายทุกครั้งที่ deploy ใหม่)
7. Deploy → เช็ค Build Logs ต้องขึ้น "load build definition from Dockerfile" (ไม่ใช่ "using build driver railpack")
8. ทดสอบ: `/index.html`, `/admin/index.html` (ต้อง 200), `/api/products` (ต้องมีข้อมูล ไม่ใช่ error), `/api/auth/login` (ต้อง login ผ่าน)

## หมายเหตุเรื่องรหัสผ่าน seed data
`seed_data_mysql.sql`'s bcrypt hash **ไม่ตรงกับ `password123`** ตามที่คอมเมนต์ในไฟล์บอกไว้ (ยืนยันแล้วทั้งบน local และ Railway) ต้อง reset รหัสผ่านของ `admin@example.com`/`john@example.com` เองหลัง seed ด้วยสคริปต์ bcrypt.hash + UPDATE ตรงๆ (ดูรูปแบบใน `03_backend/scripts/` — ห้าม hardcode รหัสผ่านจริงลง repo)
