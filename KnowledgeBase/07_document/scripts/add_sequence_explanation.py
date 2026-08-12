# -*- coding: utf-8 -*-
import sys

ch3_path = r"c:\Users\Kanomjean\Downloads\project\KnowledgeBase\07_document\Chapter3_Methodology.md"

with open(ch3_path, "r", encoding="utf-8") as f:
    content = f.read()

target = "**ภาพที่ 3.9** Sequence Diagram แสดงลำดับกระบวนการรับส่งข้อมูลหลักฐานสลิปโอนชำระเงินเรียลไทม์"

replacement = """**ภาพที่ 3.9** เป็นการดำเนินงานขั้นตอนลำดับกระบวนการรับส่งข้อมูลหลักฐานสลิปโอนชำระเงินเรียลไทม์ ซึ่งมีรายละเอียดขั้นตอนการทำงานดังนี้:
1) ผู้ซื้อ (Client A) ทำการแนบภาพถ่ายสลิปเงินโอนหลักฐานการชำระเงินเพื่อบันทึกลงในส่วนแสดงผลเว็บเบราว์เซอร์ A
2) เบราว์เซอร์ฝั่งผู้ซื้อ (Browser A) ทำการยิง API ในรูปแบบ REST Request ไปยังเซิร์ฟเวอร์หลัก (POST /api/bookings/upload-slip)
3) เซิร์ฟเวอร์หลัก (Express Server) ประมวลผลและส่งข้อมูลไปอัปเดตสถานะธุรกรรมคำสั่งจองเป็นรอตรวจรับการชำระเงิน ('waiting_verification') และบันทึก Slip URL ลงในฐานข้อมูล MySQL
4) เซิร์ฟเวอร์หลักส่งสัญญาณแจ้งเตือนและกระจายข้อมูลสดผ่านช่องทาง WebSockets (Socket event: status_updated) ไปยังเครื่องเว็บเบราว์เซอร์ B ของฝั่งผู้ขายแบบเรียลไทม์
5) เว็บเบราว์เซอร์ฝั่งผู้ขาย (Browser B) ได้รับสัญญาณและยิง API ส่งคำร้องขอเพื่อดึงรายละเอียดเอกสารออเดอร์มาตรวจสอบ (GET /api/bookings/:id)
6) เซิร์ฟเวอร์หลักดึงข้อมูลรูปภาพสลิปเงินโอนหลักฐานดังกล่าวและคืนรูปภาพสลิปกลับมาแสดงผลที่เบราว์เซอร์ฝั่งผู้ขาย
7) เบราว์เซอร์ฝั่งผู้ขายนำข้อมูลมาประเมินผลแสดงรูปสลิปและแสดงปุ่มกดยืนยันยอดโอนเงิน (Approve) บนหน้าต่างห้องสนทนาแชตของผู้ขาย (Client B) เพื่อให้กดยืนยันชำระเงิน"""

if target in content:
    new_content = content.replace(target, replacement)
    with open(ch3_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Chapter3_Methodology.md updated with Sequence Diagram explanation successfully!")
else:
    # Try loose replace
    import re
    new_content, count = re.subn(r"\*\*ภาพที่ 3\.9\*\* Sequence Diagram แสดงลำดับกระบวนการรับส่งข้อมูลหลักฐานสลิปโอนชำระเงินเรียลไทม์", replacement, content)
    if count > 0:
        with open(ch3_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Chapter3_Methodology.md updated with Sequence Diagram explanation via regex successfully!")
    else:
        print("Error: Target caption not found in Chapter3_Methodology.md")
        sys.exit(1)
