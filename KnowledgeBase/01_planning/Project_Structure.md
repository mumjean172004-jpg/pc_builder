# 📐 Project Structure (โครงสร้างไฟล์และโฟลเดอร์ของโครงการ)

โครงสร้างโฟลเดอร์ในโปรเจกต์นี้ได้รับการแบ่งหน้าที่การทำงานอย่างเป็นสัดส่วน (Separation of Concerns) ทำให้ประหยัดโทเค็นของ AI และง่ายต่อการทำความเข้าใจของนักพัฒนา

---

## 🗂️ Directories Tree

### 1. `KnowledgeBase/` (Obsidian Note Vault)
คลังเอกสารและคู่มือคู่คิดสำหรับนักพัฒนาและโมเดล AI
* `Index.md`: หน้าสารบัญหลักสำหรับการนำทางในคลังความรู้ [[Index]]
* `01_planning/`: แฟ้มบันทึกการวางแผนและประเมินโครงการ (เช่น แผนงานเชิงระบบ, task, walkthrough)
* `05_pc_builder/`: เกณฑ์และเงื่อนไขการประเมินความเข้ากันได้ของอุปกรณ์และคัดกรองสินค้าทุจริต
* `06_testing/`: ข้อมูลแผนงานและบันทึกการทดสอบฟังก์ชันการใช้งานระบบ
* `07_document/`: แฟ้มเอกสารประกอบรายงานโครงงานเชิงวิชาการและไดอะแกรมระบบ
  * `AI_Agent_Entry.md`: จุดเริ่มต้นและกฎเหล็กการทำงานหลักของโปรเจกต์ [[AI_Agent_Entry]]
  * `Database_Schema.md`: โครงสร้างและข้อมูลคอลัมน์ตาราง MySQL [[Database_Schema]]
  * `API_Documentation.md`: รูทบริการ API ทางหลังบ้านและ Security Middleware [[API_Documentation]]
  * `ProjectReport_Template.md`: โครงสร้างและรูปแบบเล่มรายงานโครงการ [[ProjectReport_Template]]
  * `Chapter1_Introduction.md` ถึง `Chapter5_Conclusion.md`: ดราฟต์บทต่าง ๆ ของเล่มรายงานโครงงาน
  * `scripts/`: โฟลเดอร์รวมสคริปต์ Python สำหรับรวบรวม ปรับแต่ง และเขียนไฟล์รายงาน Word (.docx)
    * `add_sequence_explanation.py`: เพิ่มคำอธิบายลำดับการทำงานในรายงาน
    * `adjust_academic_tone.py`: ปรับปรุงภาษาในเล่มรายงานให้เป็นทางการเชิงวิชาการ
    * `clean_duplicates.py`: ล้างคำหรือประโยคซ้ำซ้อนในหัวข้อต่าง ๆ
    * `convert_chapter2.py` / `convert_chapter3.py`: แปลงบทที่ 2 และบทที่ 3 เป็นรูปแบบที่กำหนด
    * `convert_to_docx.py`: รวบรวมเอกสารมาร์กดาวน์เพื่อแปลงเป็นไฟล์ Word (.docx) เต็มเล่ม
    * `fix_report_merge.py` / `merge_detailed_flowchart.py`: สคริปต์จัดการแก้ไขและผสานผังงาน (Flowcharts) เข้าเล่มรายงาน
    * `replace_chapter3.py` / `replace_chapter3_in_report.py`: ปรับเปลี่ยนเนื้อหาบทที่ 3 และการนำเข้าเนื้อหาในเล่มรายงานหลัก


### 2. `02_database/` (MySQL Schema and Seed Scripts)
เก็บรวบรวมไฟล์สำหรับการเริ่มต้นระบบดาต้าเบส MySQL / MariaDB
* `schema_mysql.sql`: สคริปต์ประกาศตารางข้อมูล ดัก Constraints และสร้างระบบความสัมพันธ์ (Foreign Keys)
* `seed_data_mysql.sql`: ข้อมูลแคตตาล็อกอะไหล่เริ่มต้น reference price และบัญชีผู้ใช้เริ่มต้น
* `schema.sql` / `seed_data.sql`: สคริปต์ฐานข้อมูล SQLite ดั้งเดิม (เก็บสำรองไว้สำหรับใช้อ้างอิงโครงสร้างเดิม)

### 3. `03_backend/` (Node.js API Express Application)
แอปพลิเคชันหลังบ้านที่ทำหน้าที่ติดต่อจัดการและคำนวณประมวลผลข้อมูลหลัก
* `server.js`: ไฟล์ทางเข้าหลัก (Entry Point) บูตระบบ HTTP/WebSockets Server คุม Static Uploads และ API Routing
* `package.json`: แฟ้มลงทะเบียนชุดคำสั่งและ Dependencies (`express`, `mysql2`, `socket.io`, `multer`, `cookie-parser`, `bcrypt`, `jsonwebtoken`, `express-validator`)
* `.env`: คอนฟิกูเรชันระบบฐานข้อมูล (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `JWT_SECRET`)
* `config/`:
  - `database.js`: ตัวจัดการการเชื่อมต่อดาต้าเบส MySQL Connection Pool หลัก
  - `socket.js`: ตัวจัดตั้งการเชื่อมต่อ Socket.io คุมแชตและสถานะการเงินเรียลไทม์ และสกรีน JWT Auth Middleware
* `middleware/`:
  - `auth.js`: ตรวจสอบความถูกต้องของ JWT Token ใน Cookie บัญชีผู้ใช้
  - `upload.js`: ควบคุมการทำงานของ Multer สำหรับรับรูปภาพสินค้า/รูปสลิป
  - `validators.js`: ตรวจกรองโครงสร้างตัวแปรขาเข้า (ข้อมูลสมัคร, ประกาศขาย, จองสินค้า) ด้วย `express-validator`
* `controllers/`: คอนโทรลเลอร์จัดเก็บตรรกะการประมวลผลและส่งผลลัพธ์ API
* `routes/`: ตัวกำหนดรูท API แยกตามการทำงานแต่ละหมวดหมู่
* `services/compatibilityService.js`: บริการคำนวณและประเมินความเข้ากันได้ของการจัดสเปกคอมพิวเตอร์

### 4. `04_frontend/` (Static Frontend Application)
หน้าจอเว็บบอร์ดแสดงผลฝั่งผู้ใช้ (UI / Client Application)
* `index.html`: หน้าหลัก แนะนำเครื่องจัดสเปกเด่นและประกาศขายล่าสุด
* `builder.html` / `js/builder.js`: เครื่องมือหลักสำหรับจัดสเปกและเช็คความเข้ากันได้ของชิ้นส่วนแบบ Real-time
* `products.html` / `product-detail.html`: หน้ากริดแสดงประกาศขายสินค้า ค้นหา กรองหมวดหมู่ และรายละเอียดสินค้า
* `sell-product.html`: แบบฟอร์มลงประกาศขายสินค้ามือสอง รองรับการอัปโหลดและลบไฟล์รูปพรีวิวเรียลไทม์
* `inbox.html`: ห้องส่งแชตเจรจาซื้อขายต่อรอง C2C รองรับสลิปโอนเงิน PromptPay QR จำลอง และ Socket.io
* `login.html`: ฟอร์มล็อกอินและสมัครสมาชิก
* `profile.html`: ข้อมูลส่วนตัว สเปกคอมพิวเตอร์ที่บันทึกไว้ และรายการสินค้าลงประกาศของผู้ใช้งาน
* `js/app.js`: ศูนย์รวม Helpers หน้าบ้าน (เรียกใช้ API, ควบคุม Toast, ถอดตัวแปรผู้ใช้ออกจากคุกกี้ และคุม Layout เมนูบน)
* `css/style.css`: หน้ากากจัดแต่งการแสดงผล สีปุ่ม ธีมมืด/สว่าง (CSS Variables) และแอนิเมชันของทั้งเว็บไซต์
