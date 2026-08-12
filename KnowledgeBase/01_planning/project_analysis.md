# PC Builder Pro — รายงานการวิเคราะห์ระบบปัจจุบัน

จากการวิเคราะห์โครงสร้างของโปรเจกต์ **PC Builder Pro** ปัจจุบัน ระบบถูกพัฒนาแบ่งออกเป็น 3 ส่วนหลัก ได้แก่ ระบบฐานข้อมูล (Database), ระบบหลังบ้าน (Backend), และระบบหน้าบ้าน (Frontend) โดยมีรายละเอียดดังนี้ครับ:

---

## 1. ระบบฐานข้อมูล (Database)
ระบบใช้ **SQLite** เป็น Database หลัก (รันผ่านไลบรารี `better-sqlite3` ในฝั่ง Node.js) โดยมีการออกแบบ Schema ไว้ในไฟล์ [schema.sql](file:///c:/Users/Kanomjean/Downloads/project/02_database/schema.sql) และถูกควบคุม/เริ่มต้นระบบอัตโนมัติในไฟล์ [database.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/config/database.js) ซึ่งมีตารางทั้งหมดดังนี้:

| กลุ่มข้อมูล | ตารางที่ใช้งาน | คำอธิบายรายละเอียด |
| :--- | :--- | :--- |
| **ระบบสมาชิก** | `users` | เก็บข้อมูลผู้ใช้งาน รหัสผ่าน (Hash) และ URL รูปโปรไฟล์ |
| **แคตตาล็อกอะไหล่** | `categories`<br>`parts` | **Categories**: หมวดหมู่ของอุปกรณ์ เช่น CPU, GPU, RAM, Case, PSU ฯลฯ<br>**Parts**: รายการอะไหล่คอมพิวเตอร์มาตรฐาน โดยสเปกของแต่ละชิ้นเก็บในรูปแบบ JSON Text ในฟิลด์ `specs` |
| **ตลาดซื้อขาย C2C** | `products`<br>`product_photos`<br>`product_review_flags` | **Products**: รายการประกาศขายมือสอง/มือหนึ่งจากผู้ใช้ มีระบบคำนวณ **Suspicious Score** (ตรวจจับการตั้งราคาที่ต่ำผิดปกติ หรือฟิวเจอร์การฉ้อโกง)<br>**Product Photos**: รูปภาพของสินค้าประกาศขาย |
| **การจัดสเปกคอม (Builds)** | `builds`<br>`build_parts`<br>`build_likes`<br>`build_comments` | **Builds**: รายการจัดสเปกคอมพิวเตอร์ของผู้ใช้ พร้อมราคารวม<br>**Build Parts**: เชื่อมโยงอะไหล่แต่ละชิ้นในสเปกคอมนั้นๆ<br>**Social**: ตารางการกดไลก์และการแสดงความเห็นของแต่ละสเปก |
| **การซื้อขาย & ห้องแชต** | `orders`<br>`order_items`<br>`chat_rooms`<br>`chat_messages` | **Orders**: ใบสั่งซื้อสินค้าในระบบ Marketplace<br>**Chat Rooms & Messages**: ระบบห้องแชตคุยต่อรองราคาระหว่างผู้ซื้อและผู้ขาย และระบบแจ้งเตือนสถานะคำสั่งซื้ออัตโนมัติ (System message) |

---

## 2. ระบบหลังบ้าน (Backend)
ระบบพัฒนาด้วย **Node.js** + **Express** มีโครงสร้างสถาปัตยกรรมแบบ **Controller-Route** พร้อมทั้งระบบการแปลงคำสั่ง SQL จาก PostgreSQL เป็น SQLite อัตโนมัติใน [database.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/config/database.js) เพื่อความสะดวกในการรันในเครื่องส่วนตัว

### Controllers & Routes ที่ทำไปแล้ว:
1. **ระบบสมัครและเข้าสู่ระบบ (Auth)**:
   - ไฟล์ควบคุม: [authController.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/controllers/authController.js)
   - ไฟล์เส้นทาง: [authRoutes.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/routes/authRoutes.js)
   - หน้าที่: สมัครสมาชิก, ล็อกอิน (เซต Session บนคุกกี้/โทเคน), ตรวจสอบสถานะการเข้าสู่ระบบ
2. **ระบบจัดการรายการประกาศขาย (Products)**:
   - ไฟล์ควบคุม: [productController.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/controllers/productController.js)
   - ไฟล์เส้นทาง: [productRoutes.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/routes/productRoutes.js)
   - หน้าที่: ลงประกาศขายใหม่, ดึงรายการสินค้าทั้งหมด (กรองตามหมวดหมู่ ราคา สภาพสินค้า ค้นหาชื่อสินค้า), ดึงรายละเอียดสินค้าเดี่ยวๆ และคำนวณคะแนนน่าสงสัย (เช่น ถ้าราคาต่ำกว่าเกณฑ์มาตรฐานประวัติอะไหล่ชิ้นนั้น จะถูกตั้งสถานะ `pending_review` หรือระบุว่ามีความเสี่ยง)
3. **ระบบจัดสเปกคอมพิวเตอร์ (Builds)**:
   - ไฟล์ควบคุม: [buildsController.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/controllers/buildsController.js)
   - ไฟล์เส้นทาง: [buildsRoutes.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/routes/buildsRoutes.js)
   - หน้าที่: สร้างสเปกใหม่, อัปเดตสเปก, ตรวจเช็กระบบ Social (ไลก์, คอมเมนต์), และแสดงรายละเอียดสเปก
4. **ระบบแคตตาล็อกอะไหล่สำหรับจัดสเปก (Parts)**:
   - ไฟล์ควบคุม: [partsController.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/controllers/partsController.js)
   - ไฟล์เส้นทาง: [partsRoutes.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/routes/partsRoutes.js)
   - หน้าที่: ดึงอะไหล่แยกตามหมวดหมู่เพื่อแสดงในหน้าจัดสเปกคอมพิวเตอร์
5. **ระบบการจองซื้อขายและการแชตคุย (Booking & Chat)**:
   - ไฟล์ควบคุม: [bookingController.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/controllers/bookingController.js)
   - ไฟล์เส้นทาง: [bookingRoutes.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/routes/bookingRoutes.js)
   - หน้าที่: เปิดห้องแชตคุยกันระหว่างคู่ค้า, ดึงข้อมูลการสนทนา, ส่งข้อความทั่วไป/ส่งข้อความจำพวกระบบสั่งซื้อ, สร้างใบสั่งซื้อ (`order`), ปรับปรุงสถานะคำสั่งซื้อ (`pending` ➔ `paid` ➔ `shipped` ➔ `completed`)

### ระบบการตรวจความเข้ากันได้ของฮาร์ดแวร์ (Hardware Compatibility Rules):
ไฟล์บริการ: [compatibilityService.js](file:///c:/Users/Kanomjean/Downloads/project/03_backend/services/compatibilityService.js)
ตรวจสอบความถูกต้องของสเปกคอมพิวเตอร์ที่จัดขึ้นมา ได้แก่:
- **CPU ↔ Motherboard socket**: Socket ต้องตรงกัน (เช่น LGA1700, AM4, AM5)
- **RAM type ↔ Motherboard**: ชนิดของแรมต้องตรงกัน (DDR4/DDR5) ขนาดความจุห้ามเกินขีดจำกัด และจำนวนแถวห้ามเกิน Slot ของเมนบอร์ด
- **GPU length ↔ Case**: ขนาดการ์ดจอห้ามยาวเกินขนาดที่เคสรองรับ
- **PSU Wattage ↔ Build draw**: กำลังไฟของ PSU ต้องเพียงพอกับอัตราการกินไฟของอะไหล่ทั้งหมดรวมกัน
- **Cooler height ↔ Case**: ความสูงของซิงก์พัดลม/บล็อกน้ำ ต้องไม่สูงเกินพื้นที่ว่างในเคส
- **Form factor matching**: ขนาดเมนบอร์ด (ATX, Micro-ATX, Mini-ITX) ต้องใส่กับเคสที่มีขนาดเหมาะสมได้

---

## 3. ระบบหน้าบ้าน (Frontend)
ส่วนติดต่อผู้ใช้งานเป็น **Static Web Apps (HTML5 + Vanilla CSS + Vanilla JS)** เชื่อมต่อกับ Backend ผ่าน API Fetch โดยมีหน้าต่างๆ ดังนี้:

- [index.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/index.html): หน้าแรก แสดง Dashboard รายการสเปกยอดฮิต และรายการสินค้าราคาพิเศษล่าสุด
- [login.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/login.html): หน้าสำหรับเข้าสู่ระบบและสมัครสมาชิก
- [products.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/products.html): หน้าค้นหารายการสินค้าในตลาดซื้อขาย C2C
- [product-detail.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/product-detail.html): หน้าแสดงข้อมูลของสินค้าชิ้นนั้นๆ พร้อมตรวจสอบประวัติความปลอดภัย และปุ่มกดคุยสนทนากับผู้ขาย
- [sell-product.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/sell-product.html): หน้าฟอร์มสำหรับผู้ที่ต้องการประกาศขายสินค้า
- [builder.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/builder.html): หน้าจำลองจัดสเปกคอมพิวเตอร์ ซึ่งจะเรียก API ไปหาหลังบ้านเพื่อประเมินความเข้ากันได้ (Compatibility Status) แบบเรียลไทม์
- [builds.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/builds.html) & [build-detail.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/build-detail.html): หน้ารวมสเปกที่มีคนแชร์ และแสดงรายละเอียดของแต่ละสเปก
- [inbox.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/inbox.html): หน้าศูนย์การพูดคุยต่อรองราคาสินค้าและการกดยืนยันการสั่งซื้อ
- [profile.html](file:///c:/Users/Kanomjean/Downloads/project/04_frontend/profile.html): หน้าข้อมูลโปรไฟล์ผู้ใช้ แสดงประวัติการจัดสเปกและสินค้าที่วางขาย

---

## 💡 สรุปสถานะปัจจุบัน
ระบบพื้นฐานของ **PC Builder Pro** (ระบบสมาชิก, ระบบจัดสเปกคอมพิวเตอร์พร้อมเช็กความเข้ากันได้, ตลาดซื้อขายอะไหล่มือสองพร้อมระบบตรวจสอบความน่าเชื่อถือเบื้องต้น และระบบห้องแชตสั่งซื้อสินค้า) **ได้รับการพัฒนาโครงสร้างหลักเสร็จเรียบร้อยแล้ว**
