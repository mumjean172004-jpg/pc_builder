# 💻 Project Plan: Second-hand Computer Marketplace

---

## 📌 Project Overview

เว็บสำหรับซื้อ–ขายคอมพิวเตอร์มือสอง พร้อมระบบจัดสเปคคอมพิวเตอร์ (PC Builder)

---

# 🔥 Progress Checklist

* [ ] STEP 1: Planning
* [ ] STEP 2: Database
* [ ] STEP 3: Backend
* [ ] STEP 4: Frontend
* [ ] STEP 5: PC Builder
* [ ] STEP 6: Testing
* [ ] STEP 7: Document

---

# 🟦 STEP 1: Planning

## 📄 Feature List

* [ ] ระบบสมัครสมาชิก / Login
* [ ] ระบบแสดงสินค้า
* [ ] ระบบลงขายสินค้า
* [ ] ระบบค้นหา / กรองสินค้า
* [ ] ระบบจัดสเปคคอม (PC Builder)
* [ ] ระบบคำนวณราคา

---

## 📄 Page Structure

* [ ] Home
* [ ] Product List
* [ ] Product Detail
* [ ] Login / Register
* [ ] Sell Product
* [ ] PC Builder

---

## 📄 User Flow

* [ ] ผู้ใช้เข้าหน้าเว็บ
* [ ] เลือกดูสินค้า
* [ ] กดดูรายละเอียด
* [ ] สมัคร / Login
* [ ] ลงขาย หรือ จัดสเปค

---

# 🟦 STEP 2: Database

## 📄 Tables

* [ ] users
* [ ] products
* [ ] pc_parts

---

## 📄 Fields (ตัวอย่าง)

### users

* id
* username
* password

### products

* id
* name
* price
* description
* image
* seller_id

### pc_parts

* id
* name
* type (CPU, Mainboard, RAM)
* socket
* price

---

# 🟦 STEP 3: Backend

## 📄 API

* [ ] GET /products
* [ ] GET /products/:id
* [ ] POST /products

---

## 📄 Auth

* [ ] POST /login
* [ ] POST /register

---

## 📄 Structure

* [ ] server.js
* [ ] routes/
* [ ] controllers/

---

# 🟦 STEP 4: Frontend

## 📄 Pages

* [ ] index.html (Home)
* [ ] products.html
* [ ] product_detail.html
* [ ] login.html

---

## 📄 Tasks

* [ ] แสดงสินค้า
* [ ] เชื่อม API
* [ ] ทำ UI พื้นฐาน

---

# 🟦 STEP 5: PC Builder ⭐

## 📄 Features

* [ ] เลือก CPU
* [ ] เลือก Mainboard
* [ ] เลือก RAM

---

## 📄 Logic

* [ ] ตรวจสอบ socket
* [ ] filter อุปกรณ์ที่เข้ากันได้
* [ ] คำนวณราคา

---

## 📄 Files

* [ ] builder.html
* [ ] builder.js

---

# 🟦 STEP 6: Testing

## 📄 Check

* [ ] API ทำงานถูกต้อง
* [ ] หน้าเว็บโหลดได้
* [ ] Builder ใช้งานได้

---

## 📄 Bug List

* [ ] บันทึก error ที่เจอ
* [ ] แก้ไข

---

# 🟦 STEP 7: Document

## 📄 รายงาน

* [ ] บทนำ
* [ ] วัตถุประสงค์
* [ ] ขอบเขต

---

## 📄 เพิ่มเติม

* [ ] ER Diagram
* [ ] Use Case Diagram
* [ ] UI Screenshot

---

# 💡 Notes

* ห้ามข้าม STEP
* ทำทีละขั้น
* เสร็จแล้วค่อยไปขั้นถัดไป

---

# ✅ Progress Log

## วันที่:

* ทำอะไรไปแล้ว:
* ปัญหาที่เจอ:
* วิธีแก้:

---
