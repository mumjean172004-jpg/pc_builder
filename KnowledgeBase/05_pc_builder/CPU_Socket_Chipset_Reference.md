# 🧩 CPU Socket & Chipset Reference (Intel + AMD, ครบทุกยุค)

ตารางอ้างอิง Socket ↔ Chipset ฉบับเต็ม ใช้เป็นฐานข้อมูลสำหรับ:
- `services/specTables.js` — `sockets`/`chipsets` master lookup table (cascading dropdown ตอนเพิ่มรุ่นใหม่)
- `services/compatibilityService.js`'s `SOCKET_CHIPSET_MAP` (ปัจจุบันมีแค่ 3 socket ยุคปัจจุบัน — LGA1700/AM4/AM5 — ตารางนี้คือชุดข้อมูลเต็มถ้าจะขยายให้ครอบคลุมโน้ตบุ๊ก/เครื่องเก่า)

**สถานะ:** เอกสารอ้างอิงเฉยๆ ยังไม่ได้ seed ลงตาราง `sockets`/`chipsets` จริงในฐานข้อมูล (ตอนนี้ seed ไว้แค่ LGA1700, LGA1851, AM4, AM5 กับ chipset ยุคปัจจุบันเท่านั้น — ดู `03_backend/scripts/migrate_builder_v3.js`) ถ้าจะเพิ่มให้ครบตามตารางนี้ต้องเขียน migration script ใหม่หรือแก้ seed เดิม

---

## 🔵 ฝั่ง Intel — Mainstream

เกรดเมนบอร์ด: **Z** (ท็อป, OC ได้) > **H-เลข70** (รองท็อป ตัด OC) > **B** (กลาง คุ้มค่าที่สุด) > **H-เลข10** (เริ่มต้น) — บวก **Q/W** สายองค์กร/ธุรกิจ

| Socket | ยุคสมัย (Gen) | รหัสซีรีส์ | ชิปเซ็ตทั้งหมด (ท็อป → เริ่มต้น) | ชิปเซ็ตสายองค์กร/ธุรกิจ |
|---|---|---|---|---|
| LGA 1851 | Core Ultra 200 | 800 Series | Z890, H870, B860, H810 | Q870, W880 |
| LGA 1700 | Gen 14, 13 | 700 Series | Z790, H770, B760 | — |
| LGA 1700 | Gen 12 | 600 Series | Z690, H670, B660, H610 | Q670, W680 |
| LGA 1200 | Gen 11 | 500 Series | Z590, H570, B560, H510 | Q570, W580 |
| LGA 1200 | Gen 10 | 400 Series | Z490, H470, B460, H410 | Q470, W480 |
| LGA 1151 (v2) | Gen 9, 8 | 300 Series | Z390, Z370, H370, B365, B360, H310 | Q370, B365 |
| LGA 1151 (v1) | Gen 7 | 200 Series | Z270, H270, B250 | Q270, Q250 |
| LGA 1151 (v1) | Gen 6 | 100 Series | Z170, H170, B150, H110 | Q170, Q150 |
| LGA 1150 | Gen 4, 5 | 9 & 8 Series | Z97, H97, Z87, H87, B85, H81 | Q87, Q85 |
| LGA 1155 | Gen 2, 3 | 7 & 6 Series | Z77, H77, B75, Z68, P67, H67, H61 (ฮิตมาก) | Q77, Q75, Q67, Q65 |
| LGA 775 | Core 2 Duo/Quad | 4, 3, 900 Series | X48, X38 (ท็อป) · P45, P43, P35, P31 (ไม่มีการ์ดจอออนบอร์ด) · G45, G43, G41, G31 (มีการ์ดจอออนบอร์ด) | Q45, Q43, Q35, Q33 |

## 👑 Intel Workstation & HEDT

| แบรนด์ | Socket | ยุคสมัย | รหัสชิปเซ็ต (Workstation) |
|---|---|---|---|
| Intel | LGA 2066 | Core X-Series (Gen 7-10) | X299 |
| Intel | LGA 2011-v3 | Core i7 Extreme (Gen 5) | X99 |
| Intel | LGA 2011 | Core i7 (Gen 2-3) | X79 |

---

## 🔴 ฝั่ง AMD — Mainstream

เกรดเมนบอร์ด: **X** (ท็อปสุด เลน PCIe เยอะ, มี E ต่อท้าย = Extreme) > **B** (กลาง มหาชนนิยม, OC CPU ได้ตั้งแต่ B ขึ้นไป) > **A** (เริ่มต้น ราคาประหยัดสุด)

| Socket | ยุคสมัย (ซีรีส์ CPU) | รหัสซีรีส์ | ชิปเซ็ตทั้งหมด (ท็อป → เริ่มต้น) |
|---|---|---|---|
| AM5 | Ryzen 9000 | 800 Series | X870E, X870, B850, B840 |
| AM5 | Ryzen 7000, 8000G | 600 Series | X670E, X670, B650E, B650, A620 |
| AM4 | Ryzen 5000 | 500 Series | X570S, X570, B550, A520 |
| AM4 | Ryzen 3000, 4000 | 400 Series | X470, B450 (บอร์ดแห่งชาติยอดฮิตที่สุด) |
| AM4 | Ryzen 1000, 2000 | 300 Series | X370, B350, A320 |
| AM3+ | FX-Series | 900 Series | 990FX, 990X, 970 |
| AM3 | Phenom II, Athlon II | 800, 700 Series | 890FX, 890GX, 880G, 870 · 790FX, 790GX, 785G, 770 |
| FM2+ / FM2 | A-Series (APU ยุคเก่า) | A-Series | A88X, A78, A68H, A58, A55 |

> หมายเหตุ: AMD มีชิปเซ็ตรหัส X300, A300 สำหรับคอมพิวเตอร์ขนาดจิ๋ว/Mini-PC ด้วย แต่ฝังมาในเครื่องแบรนด์สำเร็จรูป มักไม่มีบอร์ดแยกขายทั่วไป

## 👑 AMD Workstation & HEDT (Threadripper)

กลุ่มนี้ไม่มีบอร์ดเกรดเริ่มต้น/กลาง มีแต่เกรด "ท็อป" และ "ท็อปที่สุด"

| แบรนด์ | Socket | ยุคสมัย | รหัสชิปเซ็ต (Workstation) |
|---|---|---|---|
| AMD | sTR5 | Threadripper 7000 Series | TRX50 (High-End Desktop), WRX90 (Workstation PRO) |
| AMD | sTRX4 | Threadripper 3000 Series | TRX40 |
| AMD | TR4 | Threadripper 1000, 2000 | X399 |

---

## เทียบกับ seed data ปัจจุบันในระบบ (ณ วันที่เขียนเอกสารนี้)

`sockets` table มีแค่ 4 แถว: `LGA1700`, `LGA1851`, `AM4`, `AM5` — ตกยุคเก่าทั้งหมด (LGA1200 ลงไป, AM3/AM3+/FM2 ทั้งหมด, สาย Workstation/HEDT ทั้งหมด)

ถ้าจะรองรับ CPU มือสองรุ่นเก่าที่มีขายจริงในตลาด (เช่น i5-9400F บน LGA1151, Ryzen 5 3600 บน AM4 ก็มีอยู่แล้ว แต่ Ryzen 5 2600 บน AM4 รุ่นเก่ากว่าก็ยังนับ AM4 เดิม ไม่กระทบ — ที่กระทบจริงคือ Intel รุ่นก่อน LGA1700 ทั้งหมด และ AMD ก่อน AM4) ต้อง seed เพิ่มตามตารางข้างบนก่อน ไม่งั้าฟอร์ม "เพิ่มรุ่นใหม่" จะเลือก Socket เก่าไม่ได้เลย (เพราะ Socket เป็น closed lookup — พิมพ์ค่านอกลิสต์ไม่ได้ ต้องมีแอดมิน/สคริปต์เพิ่มให้ก่อน)
