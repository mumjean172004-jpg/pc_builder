# 🎨 วิธีนำแผนผังการทำงาน (Flowcharts) ไปใช้งานต่อบน Draw.io

โฟลเดอร์นี้รวบรวมไฟล์รหัส **Mermaid Diagram** ทั้งหมด 7 แผนผัง เพื่อให้คุณสามารถนำไปอัปโหลดหรือสร้างเป็นไดอะแกรมที่แก้ไขต่อได้อย่างง่ายดายบน **Draw.io (diagrams.net)**

---

## 🛠️ ขั้นตอนการนำเข้า (Import) สู่ Draw.io:

1. **เปิดเว็บไซด์ Draw.io**:
   * เข้าไปที่ [draw.io](https://app.diagrams.net/)
   * เลือกสร้างไฟล์ใหม่ (Create New Diagram) หรือเปิดไฟล์ที่มีอยู่

2. **คัดลอกรหัส Mermaid**:
   * เลือกไฟล์ไดอะแกรมที่คุณต้องการจากรายการด้านล่าง
   * คัดลอกข้อความ (Code) ทั้งหมดในไฟล์ `.mermaid` นั้นๆ

3. **วางรหัสลงใน Draw.io**:
   * ที่แถบเมนูด้านบนของ Draw.io เลือก: **Arrange** -> **Insert** -> **Advanced** -> **Mermaid...**
   * (หากเป็นภาษาไทย: **จัดเรียง** -> **แทรก** -> **ขั้นสูง** -> **Mermaid...**)
   * ลบรหัสตัวอย่างในกล่องข้อความออก แล้ววางรหัสที่คุณคัดลอกมาลงไปแทน
   * กดปุ่ม **Insert** (แทรก)

4. **ปรับแต่งและแก้ไขต่อ**:
   * Draw.io จะสร้างกล่องรูปทรง (Shapes) และเส้นเชื่อมต่อ (Connectors) ที่สามารถขยับ ย่อขยาย เปลี่ยนสี และแก้ไขตัวอักษรแต่ละส่วนได้ทันที!

---

## 📂 รายการไฟล์ไดอะแกรมที่มีให้เลือกใช้งาน:

| ลำดับ | ชื่อไฟล์ไดอะแกรม (ในโฟลเดอร์นี้) | คำอธิบายระบบย่อย |
|---|---|---|
| 0 | [0_system_overview.mermaid](file:///c:/Users/Kanomjean/Downloads/project/KnowledgeBase/07_document/drawio_sources/0_system_overview.mermaid) | 🗺️ ภาพรวมสถาปัตยกรรมระบบ (System Subsystems Overview) |
| 1 | [1_auth_flow.mermaid](file:///c:/Users/Kanomjean/Downloads/project/KnowledgeBase/07_document/drawio_sources/1_auth_flow.mermaid) | 🔐 ระบบจัดการผู้ใช้และสิทธิ์การเข้าใช้งาน (Authentication & Profile Flow) |
| 2 | [2_anti_fraud_flow.mermaid](file:///c:/Users/Kanomjean/Downloads/project/KnowledgeBase/07_document/drawio_sources/2_anti_fraud_flow.mermaid) | 🛡️ ระบบลงขายสินค้าและการสกรีนความโปร่งใส (Product Listing & Anti-Fraud Flow) |
| 3 | [3_compatibility_check_flow.mermaid](file:///c:/Users/Kanomjean/Downloads/project/KnowledgeBase/07_document/drawio_sources/3_compatibility_check_flow.mermaid) | 🔌 บริการตรวจสอบความเข้ากันได้ของอุปกรณ์ (Compatibility Check Workflow) |
| 4 | [4_auto_builder_flow.mermaid](file:///c:/Users/Kanomjean/Downloads/project/KnowledgeBase/07_document/drawio_sources/4_auto_builder_flow.mermaid) | 🤖 ระบบจัดสเปกคอมพิวเตอร์อัตโนมัติ (Auto-Builder Solver Workflow) |
| 5 | [5_order_booking_chat_flow.mermaid](file:///c:/Users/Kanomjean/Downloads/project/KnowledgeBase/07_document/drawio_sources/5_order_booking_chat_flow.mermaid) | 🛒 ระบบสั่งจอง เจรจา และโอนเงิน C2C (Order Booking & Live Chat Flow) |
| 6 | [6_admin_moderation_flow.mermaid](file:///c:/Users/Kanomjean/Downloads/project/KnowledgeBase/07_document/drawio_sources/6_admin_moderation_flow.mermaid) | 💻 ระบบตรวจสอบทุจริตและการดำเนินงานฝั่งแอดมิน (Admin Moderation Flow) |

---

💡 *เคล็ดลับ: คุณสามารถบันทึกเซฟงานในรูปแบบไฟล์ `.drawio` เพื่อเก็บไว้แก้ไขต่อในภายหลังได้ หรือส่งออก (Export) เป็นรูปภาพ `.png` / `.pdf` เพื่อใช้ประกอบรายงานโครงการได้ทันที*
