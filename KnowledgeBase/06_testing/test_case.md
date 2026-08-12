# 🧪 Comprehensive System Test Results

Generated at: 22/7/2569 01:25:12

### Test Execution Summary
| Total Tests | Passed | Failed |
| :---: | :---: | :---: |
| 20 | 20 | 0 |

### Test Case Details
| Section | Test Case Name | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| Auth | Register New Buyer User | User registered successfully | User registered successfully | ✅ Pass |
| Auth | Login Buyer User | Token returned in cookie | Token received | ✅ Pass |
| Auth | Register New Seller User | User registered successfully | User registered successfully | ✅ Pass |
| Auth | Login Seller User | Token returned in cookie | Token received | ✅ Pass |
| Auth | Seller Registration & KYC Onboarding | Seller registered and verified | ลงทะเบียนเป็นผู้ขายและยืนยันตัวตนสำเร็จ! | ✅ Pass |
| Auth | Login Admin User | Token returned in cookie | Token received | ✅ Pass |
| PC Builder | Compatible CPU & Motherboard (AM4 / AM4) | compatible: true | compatible: true | ✅ Pass |
| PC Builder | Incompatible Socket Check (AM4 vs LGA1700) | compatible: false, errors include Socket | compatible: false, errors: ["Socket ของ CPU (AM4) ไม่ตรงกับ Socket ของ Motherboard (LGA1700). วิธีแก้: กรุณาเปลี่ยน CPU ให้ใช้ socket เดียวกันกับ Motherboard หรือเลือก Motherboard ที่มี socket ตรงกันกับ CPU (เช่น AM4)"] | ✅ Pass |
| PC Builder | Incompatible RAM Type Check (DDR4 motherboard vs DDR5 RAM) | compatible: false, errors include RAM type | compatible: false, errors: ["ชนิดของ RAM (DDR5) ไม่ตรงกับชนิดที่ Motherboard รองรับ (DDR4). วิธีแก้: เปลี่ยนชนิด RAM ให้เป็น DDR4 หรือเลือก Motherboard ที่รองรับ RAM DDR5"] | ✅ Pass |
| PC Builder | PSU Wattage TDP Limit Check (550W PSU for 615W Draw) | compatible: false, errors include PSU wattage | compatible: false, errors: ["กำลังไฟของ PSU (550W) น้อยกว่ากำลังไฟขั้นต่ำรวมของทั้งระบบ (615W). วิธีแก้: เปลี่ยน PSU ที่มีกำลังวัตต์สูงขึ้นด่วนเพื่อความเสถียรและป้องกันความเสียหาย"] | ✅ Pass |
| Marketplace | Normal Product Listing Creation | Product created successfully, suspicious_score = 0 | product_id: 22, score: 0 | ✅ Pass |
| Marketplace | Price Floor Suspicious Score Flagging | suspicious_score >= 70, contains Price reasons | score: 70, reasons: ["Price is unusually low compared with catalog reference price (18%)."] | ✅ Pass |
| Marketplace | Duplicate Serial Suspicious Score Flagging | suspicious_score >= 90, contains Serial reasons | score: 90, reasons: ["Serial number already exists on another non-sold listing."] | ✅ Pass |
| Bookings | Create C2C Order Booking with Risk Acceptance | Booking created with shipping_method=express | order_id: 12, shipping: express | ✅ Pass |
| Bookings | Product status locked on Booking | sold | sold | ✅ Pass |
| Bookings | Seller Dispatch with Courier & Tracking No. | Status updated to shipped with tracking | status: shipped | ✅ Pass |
| Bookings | Cancel Order Status Update | cancelled | cancelled | ✅ Pass |
| Bookings | MySQL Transaction Rollback: Product restored to active | active | active | ✅ Pass |
| Admin | Access Admin Dashboard API (Seeded Admin) | 200 OK with statistics | status: 200, activeListings: 8 | ✅ Pass |
| Admin | Prevent Non-Admin from accessing Admin API | 403 Forbidden or 401 Unauthorized | status: 403, error: ไม่มีสิทธิ์เข้าถึง: เฉพาะแอดมินเท่านั้น | ✅ Pass |
