# 🗂️ PC Builder Pro & Second-hand C2C Marketplace - Project Analysis & Flowcharts

เอกสารนี้รวบรวมรายละเอียดการวิเคราะห์ระบบย่อยของโครงการ **PC Builder Pro** ทั้งในส่วนของโครงสร้างฐานข้อมูล หน้าบ้าน หลังบ้าน และกฎการประมวลผลทางธุรกิจ พร้อม Flowchart แสดงลำดับขั้นตอนการทำงาน (Workflows) ในแต่ละส่วนด้วย Mermaid Diagram

---

## 🗺️ ภาพรวมสถาปัตยกรรมระบบ (System Subsystems Overview)

โครงการนี้ประกอบด้วย 5 ระบบย่อยหลักที่เชื่อมต่อประสานงานกันผ่านฐานข้อมูล MySQL/MariaDB และ WebSockets ดังนี้:

```mermaid
graph TD
    User([ผู้ใช้บริการ / สมาชิก]) <--> Auth[1. ระบบจัดการผู้ใช้และสิทธิ์ Auth]
    User <--> Market[2. ระบบตลาดขายสินค้า C2C]
    User <--> Builder[3. ระบบจัดสเปกคอมและ Auto-Builder]
    User <--> Booking[4. ระบบจองสินค้าและแชตสด C2C]
    Admin([ผู้ดูแลระบบ / Admin]) <--> AdminSys[5. ระบบแอดมินและการจัดการสกรีนทุจริต]
    
    Auth <--> DB[(MySQL / MariaDB Database)]
    Market <--> DB
    Builder <--> DB
    Booking <--> DB
    AdminSys <--> DB
    
    Booking <--> WS[Real-time Server Socket.io]
    WS <--> User
```

1. **Authentication & Profile Management (ระบบลงทะเบียน เข้าสู่ระบบ และจัดการสิทธิ์)**:
   * รองรับการล็อกอินแบบปกติ (Email/Phone + bcrypt password) และแบบโซเชียล (Google/Facebook)
   * รักษาความปลอดภัยของเซสชันผ่าน JWT HttpOnly Cookie
   * มีระบบสมัครเปิดร้านค้า (Seller Registration) เพื่อป้อนข้อมูลประวัติการเงิน บัญชีธนาคาร และบัตรประชาชน
   * จัดการที่อยู่จัดส่งสินค้า (Delivery Addresses) และรายการสินค้าที่สนใจ (Wishlist) ของผู้ใช้
   * มีระบบส่งและยืนยัน OTP สำหรับการตรวจสอบเบอร์โทรศัพท์และอีเมล

2. **Marketplace & Anti-Fraud Inspection (ระบบลงขายสินค้ามือสองและการสกรีนตรวจจับทุจริต)**:
   * เปิดให้ผู้ขายที่ได้รับการยืนยันลงประกาศขายอุปกรณ์ไอทีแยกตามหมวดหมู่
   * ตรวจสอบความถูกต้องของรูปถ่ายสินค้า (บังคับใช้รูปภาพอย่างน้อย 3 รูปสำหรับสินค้าสภาพมือสองเพื่อความโปร่งใส)
   * **Anti-Fraud Engine**: เมื่อมีการสร้างหรืออัปเดตโพสต์ ระบบจะนำราคาไปเปรียบเทียบกับราคากลาง (MSRP) ในแคตตาล็อกอะไหล่มาตรฐาน (`parts` table) ตามสภาพการใช้งาน หากต่ำเกินราคาขั้นต่ำ (`Price Floor Rule`) จะถูกหักคะแนนความน่าเชื่อถือ `+70` ทันที และตรวจสอบหากซีเรียลนัมเบอร์ของสินค้าซ้ำกับสินค้าอื่นที่วางขายอยู่ในระบบ จะโดนหัก `+90` คะแนน 
   * หาก `suspicious_score` เกิน `70` ขึ้นไป ประกาศจะถูกส่งเข้าสถานะ `pending_review` เพื่อรอแอดมินตรวจสอบ โดยยังไม่เผยแพร่สู่ผู้ใช้อื่น

3. **PC Builder & Compatibility Engine (ระบบจัดสเปกคอมพิวเตอร์และการคำนวณความเข้ากันได้)**:
   * **Manual Mode**: ให้ผู้ใช้เลือกชิ้นส่วนทีละชิ้น และสแกนความเข้ากันได้แบบเรียลไทม์ (ซ็อกเก็ต CPU/บอร์ด, ชนิด RAM/บอร์ด, ความยาว GPU/เคส, ความสูงซิงค์พัดลม/เคส, ขนาด AIO/เคส, ขนาดบอร์ด/เคส, และความต้องการพลังงาน PSU โดยมี safety headroom 20%)
   * **Auto Build Solver**: อัลกอริทึมจัดสเปกอัจฉริยะ รับข้อมูล งบประมาณ และลักษณะการใช้งาน ( gaming, work, general) แล้วสืบค้นแคตตาล็อกร่วมกับราคาที่ถูกที่สุดในตลาดมือสอง เพื่อออกแบบสเปกที่คุ้มค่าที่สุด 3 ทางเลือก: ประหยัดสุดในงบ, คุ้มที่สุด (แนะนำ), และประสิทธิภาพสูงสุดในงบ โดยมีการคํานวณปัญหาคอขวด (Bottleneck) ระหว่าง CPU และ GPU

4. **C2C Booking, Payment & Transaction Lifecycle (ระบบสั่งจอง เจรจา และโอนเงิน)**:
   * จัดกลุ่มออเดอร์ตามผู้ขาย (Order Splitting) เมื่อผู้ซื้อเลือกสินค้าหลายรายการจากผู้ขายต่างคนกัน
   * เปลี่ยนสถานะสินค้าที่ถูกจองให้กลายเป็น `'sold'` ทันทีเพื่อล็อกสินค้าไม่ให้ผู้อื่นกดสั่งซื้อซ้ำ
   * สร้างห้องแชตเจรจาระหว่างผู้ซื้อและผู้ขายโดยอัตนวยัติ พร้อมส่ง System message เริ่มต้นดีล
   * ผู้ซื้อจ่ายเงินโดยอัปโหลดรูปภาพสลิปหลักฐานการโอนเงิน (Slip Upload) และผู้ขายเป็นผู้ตรวจสอบอนุมัติ
   * ควบคุมการเปลี่ยนสถานะการทำรายการผ่าน 6 สถานะหลัก พร้อมดักกลไกรีเซ็ตคืนค่าสินค้าเป็น `'active'` เมื่อมีการยกเลิกออเดอร์ (`cancelled`)
   * อัปเดตข้อมูลห้องแชต สถานะใบสั่งซื้อ และการส่งข้อความสดผ่าน Socket.io แบบเรียลไทม์

5. **Admin Moderation & Operations (ระบบหลังบ้านสำหรับผู้ดูแลระบบ)**:
   * ตรวจสอบประกาศขายที่ถูกส่งมารอกลั่นกรองและอนุมัติ (Flagged Products)
   * เข้าดูประวัติบันทึกการทำงานของทีมงาน (Admin Logs) เพื่อเพิ่มความโปร่งใสของระบบ
   * จัดการระงับการใช้งานบัญชีผู้ใช้ (Suspend Users) หรือปรับปรุงข้อมูลแคตตาล็อกอะไหล่มาตรฐานของระบบ

---

## 📊 แผนผังการทำงานของแต่ละระบบย่อย (System Workflows)

### 1. ระบบจัดการผู้ใช้และสิทธิ์การเข้าใช้งาน (Authentication & Profile Flow)
แสดงขั้นตอนตั้งแต่การสมัครสมาชิก การเข้าสู่ระบบ และการตรวจสอบสิทธิ์การเป็นผู้ขายในการลงประกาศหรือสลับบทบาท

```mermaid
flowchart TD
    Start([ผู้ใช้งานเข้าสู่ระบบ/สมัครสมาชิก]) --> ChooseType{สมัครสมาชิกใหม่ หรือ ล็อกอิน?}
    
    %% Register Flow
    ChooseType -- สมัครสมาชิก --> InputReg[กรอกข้อมูล Username, Password, Email/Phone]
    InputReg --> CheckExist{Username/Email/Phone ซ้ำในระบบหรือไม่?}
    CheckExist -- ใช่ --> AlertReg[แจ้งเตือนข้อมูลซ้ำ/กรอกใหม่] --> InputReg
    CheckExist -- ไม่ซ้ำ --> HashPass[เข้ารหัสรหัสผ่านด้วย bcrypt hash]
    HashPass --> CreateUser[บันทึกข้อมูลผู้ใช้ลงตาราง users]
    CreateUser --> GenJWT[สร้าง JWT Token]
    GenJWT --> SaveCookie[บันทึก token ลง HttpOnly Cookie]
    SaveCookie --> UserHome[เข้าสู่หน้าหลักในสถานะผู้ซื้อ]
    
    %% Login Flow
    ChooseType -- เข้าสู่ระบบปกติ --> InputLogin[กรอก Email/Phone และ Password]
    InputLogin --> GetUserDB[ค้นหาผู้ใช้ในฐานข้อมูล]
    GetUserDB --> CheckStatus{สถานะบัญชี = suspended?}
    CheckStatus -- ใช่ --> AlertSuspended[แจ้งเตือนบัญชีถูกระงับ] --> Start
    CheckStatus -- ไม่ใช่ --> CheckPass{รหัสผ่านถูกต้อง?}
    CheckPass -- ไม่ถูกต้อง --> AlertWrongPass[แจ้งเตือนรหัสผ่านผิด] --> InputLogin
    CheckPass -- ถูกต้อง --> GenJWT
    
    %% Social Login
    ChooseType -- เข้าสู่ระบบโซเชียล --> SocialAuth[ล็อกอินผ่าน Google / Facebook]
    SocialAuth --> CheckSocialId{มีประวัติ ID นี้ในระบบ?}
    CheckSocialId -- มีประวัติ --> CheckStatus
    CheckSocialId -- ไม่มีประวัติ --> AutoCreate[ลงทะเบียนบัญชีใหม่โดยใช้ข้อมูลจากโซเชียลอัตโนมัติ] --> GenJWT
    
    %% Seller Switch Role
    UserHome --> UserAction{ผู้ใช้สลับสิทธิ์เป็นผู้ขาย?}
    UserAction -- ใช่ --> CheckSellerReg{ลงทะเบียนเป็นผู้ขายแล้ว?}
    CheckSellerReg -- ยังไม่ได้ลง --> GoRegister[กรอกข้อมูลร้านค้า, บัญชีธนาคาร, แนบภาพบัตรประชาชน]
    GoRegister --> SaveSeller[บันทึกข้อมูลและรอการอนุมัติ]
    CheckSellerReg -- ลงทะเบียนแล้ว --> UpdateRole[ปรับฟิลด์ active_role = 'seller' บนฐานข้อมูล] --> ShowSellerUI[เปลี่ยนโหมดแสดงผลเป็นร้านค้าผู้ขาย]
```

---

### 2. ระบบลงขายสินค้าและการสกรีนความโปร่งใส (Product Listing & Anti-Fraud Flow)
แสดงขั้นตอนการตรวจสอบความเสี่ยงของการขายสินค้า เช่น ราคาต่ำเกินจริงหรือซีเรียลซ้ำซ้อน

```mermaid
flowchart TD
    Start([ผู้ขายเข้าสู่ระบบและเริ่มลงประกาศขาย]) --> InputForm[กรอกข้อมูลสินค้า: หมวดหมู่, สภาพ, ซีเรียลนัมเบอร์, ราคา, รายละเอียด, แนบภาพ]
    InputForm --> CheckCondition{สภาพสินค้าเป็นสินค้ามือสอง?}
    
    %% Photo check
    CheckCondition -- ใช่ --> CheckPhotoCount{แนบรูปสินค้าอย่างน้อย 3 รูป?}
    CheckPhotoCount -- ไม่ครบ --> AlertPhotos[ปฏิเสธและเตือน: สินค้ามือสองต้องมีรูปอย่างน้อย 3 รูป] --> InputForm
    CheckPhotoCount -- ครบถ้วน --> GetMSRP[ดึงราคา MSRP และรายละเอียดสินค้าแนะนำจากตาราง parts]
    CheckCondition -- เป็นสินค้าใหม่ --> GetMSRP
    
    %% Anti-Fraud Price Check
    GetMSRP --> CheckPriceFloor{ราคาสินค้า < เกณฑ์จำกัดตามสภาพ? <br/>- สินค้าใหม่: < 65% MSRP<br/>- มือสอง 90%: < 50% MSRP<br/>- มือสอง 80%: < 40% MSRP<br/>- มือสอง 70%: < 30% MSRP}
    CheckPriceFloor -- ต่ำเกินไปจริง --> PenaltyPrice[บวกคะแนนความสงสัย suspicious_score +70 <br/>และเพิ่มเหตุผลราคาต่ำผิดปกติลง Array]
    CheckPriceFloor -- ราคาเหมาะสม --> CheckSerial
    
    %% Anti-Fraud Serial Check
    PenaltyPrice --> CheckSerial{มีเลข Serial Number ตรงกับสินค้าชิ้นอื่นที่ยังขายไม่หมด?}
    CheckSerial -- ซ้ำกัน --> PenaltySerial[บวกคะแนนความสงสัย suspicious_score +90 <br/>และเพิ่มเหตุผลซีเรียลซ้ำลง Array]
    CheckSerial -- ไม่ซ้ำ --> ComputeScore
    
    %% Scoring and review
    PenaltySerial --> ComputeScore[ประมวลผลผลลัพธ์คะแนนความน่าสงสัยรวม]
    CheckSerial -- ไม่ซ้ำ --> ComputeScore
    
    ComputeScore --> CheckSuspicion{คะแนนความน่าสงสัยรวม >= 70?}
    CheckSuspicion -- ใช่ --> PendingReview[บันทึกสินค้าเป็นสถานะ 'pending_review' <br/>และปักธงลงตาราง product_review_flags เพื่อรอแอดมินอนุมัติ]
    CheckSuspicion -- ไม่ใช่ --> PublishActive[บันทึกสินค้าเป็นสถานะ 'approved' และเปิดขายสู่หน้าตลาดทันที]
    
    PendingReview --> Complete([เสร็จสิ้นกระบวนการลงสินค้า])
    PublishActive --> Complete
```

---

### 3. ระบบประมวลผลความเข้ากันได้และการจัดสเปกอัจฉริยะ (Compatibility & Auto-Builder Flow)
แสดงกระบวนการตรวจสอบความถูกต้องของการประกอบฮาร์ดแวร์ และขั้นตอนการทำงานของอัลกอริทึมจัดสเปกอัจฉริยะ

#### ก) บริการตรวจสอบความเข้ากันได้ของอุปกรณ์ (Compatibility Check Workflow)
```mermaid
flowchart TD
    Start([ผู้ใช้เลือกชิ้นส่วนในหน้า Builder]) --> SendAPICheck[ส่งรายการสินค้าเข้าหน้า API /api/builds/compatibility]
    SendAPICheck --> QuerySpecs[ค้นหา Specs ชนิด JSON ของชิ้นส่วนที่ถูกส่งมา]
    
    %% Socket & Motherboard
    QuerySpecs --> CheckSocket{มี CPU และ Motherboard ครบ?<br/>Socket ตรงกัน?}
    CheckSocket -- ไม่ตรงกัน --> AddError[บันทึก ERROR: Socket ขัดแย้งกัน]
    CheckSocket -- ตรงกัน --> CheckChipset{Chipset รองรับ CPU ไหม?}
    CheckChipset -- ไม่รองรับ/ตระกูลต่ำ --> AddWarning[บันทึก WARNING: Chipset อาจต้องอัปเกรด BIOS]
    CheckChipset -- รองรับดี --> CheckRAM
    AddError --> CheckRAM
    AddWarning --> CheckRAM
    
    %% RAM & Motherboard
    CheckRAM{มี RAM และ Motherboard ครบ?<br/>RAM Type ตรงกับ Ram Slots?}
    CheckRAM -- ไม่ตรงกัน --> AddRamError[บันทึก ERROR: ประเภท RAM ไม่เข้ากัน]
    CheckRAM -- ตรงกัน --> CheckRamLimit{ความจุ RAM และจำนวนแถวรวม เกินขีดจำกัดบอร์ด?}
    CheckRamLimit -- เกินสเปกบอร์ด --> AddRamWarning[บันทึก WARNING: ความจุ/จำนวนแถวเกินลิมิตบอร์ด]
    CheckRamLimit -- ไม่เกิน --> CheckGPUCase
    AddRamError --> CheckGPUCase
    AddRamWarning --> CheckGPUCase
    
    %% GPU / Cooler Dimension vs Case
    CheckGPUCase{มีการ์ดจอ/พัดลม CPU และเคส ครบ?<br/>ขนาดความยาว/ความสูง เกินพื้นที่เคส?}
    CheckGPUCase -- เกินพิกัดเคส --> AddSizeError[บันทึก ERROR: อุปกรณ์ยาว/สูงเกินพื้นที่เคส]
    CheckGPUCase -- ใกล้เคียงเคส เกิน 90% --> AddSizeWarning[บันทึก WARNING: ขนาดเบียดพื้นที่เคสเกินไป ติดตั้งยาก]
    CheckGPUCase -- ขนาดพอดีเคส --> CheckPSU
    AddSizeError --> CheckPSU
    AddSizeWarning --> CheckPSU
    
    %% PSU Wattage Calculation
    CheckPSU{มี PSU และอุปกรณ์ใช้ไฟในระบบ?<br/>กำลังวัตต์ PSU เพียงพอ?}
    CheckPSU --> CalcWatt[คำนวณ TDP รวม = TDP ของ CPU + TDP ของ GPU + 100W สำหรับอุปกรณ์อื่น]
    CalcWatt --> ComparePSU{วัตต์ PSU < วัตต์ TDP รวม?}
    ComparePSU -- น้อยกว่าพลังงานขั้นต่ำ --> AddPsuError[บันทึก ERROR: กำลังไฟ PSU ไม่พอกับพลังงานที่ระบบใช้จริง]
    ComparePSU -- น้อยกว่า วัตต์รวม * 1.2 --> AddPsuWarning[บันทึก WARNING: กำลังไฟ PSU ต่ำกว่าระดับแนะนำสำหรับความเสถียร 20% Headroom]
    ComparePSU -- วัตต์เหลือเพียงพอ --> SendResult
    AddPsuError --> SendResult
    AddPsuWarning --> SendResult
    
    SendResult[ส่งข้อมูล Errors และ Warnings ทั้งหมดกลับหน้าบ้านเพื่อแจ้งผู้ใช้] --> End([จบการตรวจสอบ])
```

#### ข) ระบบจัดสเปกคอมพิวเตอร์อัตโนมัติ (Auto-Builder Solver Workflow)
```mermaid
flowchart TD
    Start(["ผู้ใช้เลือกงบประมาณและลักษณะการใช้งาน"]) --> GetReq["รับงบประมาณ และ Use Case ในหลังบ้าน"]
    GetReq --> FetchParts["ดึงแคตตาล็อกอะไหล่มาตรฐานและราคามือสองที่ถูกที่สุดในตลาดมาจำลองราคาจริง"]
    FetchParts --> PairCPUGPU["สร้างคู่แมตช์ระหว่าง CPU และ GPU ทั้งหมด"]
    
    PairCPUGPU --> BottleneckCheck{"ประเมินคะแนนประสิทธิภาพ CPU vs GPU <br/>- ความแรงการ์ดจอสูงกว่า CPU เกินเกณฑ์? (คอขวด CPU)<br/>- ความแรง CPU สูงกว่าการ์ดจอเกินเกณฑ์? (คอขวด GPU)"}
    BottleneckCheck -- "คอขวดรุนแรง เกิน 35%" --> SkipPair["ข้ามคู่ชิ้นส่วนนี้ไป"]
    BottleneckCheck -- "ความเข้ากันได้สมดุล" --> FindOtherParts["ค้นหาชิ้นส่วนอื่นที่จำเป็นและเข้ากันได้ Socket, RAM Type, Form Factor"]
    
    FindOtherParts --> Generate3Options{"กรองและประมวลผลจัดกลุ่มสเปกคอมพิวเตอร์ที่ได้ 3 หมวดหมู่"}
    
    %% Cheapest
    Generate3Options --> CatCheapest["1. สเปกประหยัดสุดในงบ: เลือกอุปกรณ์ราคาถูกที่สุดที่ทํางานเข้ากันได้สมบูรณ์"]
    %% Value
    Generate3Options --> CatValue["2. สเปกคุ้มที่สุด: จัดงบเน้นประสิทธิภาพต่อราคาเหมาะสมที่สุด อุปกรณ์แบรนด์แนะนำ"]
    %% Performance
    Generate3Options --> CatMax["3. สเปกแรงที่สุดในงบ: ดึงงบไปลงที่ความแรงของ CPU/GPU หลักสูงสุดในข้อจำกัดงบ"]
    
    CatCheapest --> BuildFormattedResponse["รวบรวมชิ้นส่วนและจัดรูปแบบ JSON แนะนำสินค้าพร้อมชี้เป้าสินค้าในตลาด"]
    CatValue --> BuildFormattedResponse
    CatMax --> BuildFormattedResponse
    
    BuildFormattedResponse --> ReturnUI["ส่งตัวเลือกทั้ง 3 รูปแบบไปแสดงผลเปรียบเทียบในฝั่งหน้าบ้าน"] --> EndAuto(["เสร็จสิ้น"])
```

---

### 4. ระบบสั่งจอง เจรจา และโอนเงิน C2C (Order Booking & Live Chat Flow)
แสดงวัฏจักรชีวิตของออเดอร์ (Order Status Transition Lifecycle) และระบบการทำงานของ WebSocket

```mermaid
flowchart TD
    Start([ผู้ซื้อกดยืนยันสั่งจองสินค้าในตะกร้า]) --> FetchCheck[ดึงข้อมูลเช็คความพร้อมสินค้า]
    FetchCheck --> CheckStatus{สถานะของสินค้ายังเป็น 'active' และไม่จองตัวเอง?}
    CheckStatus -- ไม่พร้อมขาย/ซื้อของตนเอง --> RejectBooking[ปฏิเสธคำสั่งสั่งจองและแจ้งเตือน] --> EndBooking([จบการทำงาน])
    CheckStatus -- พร้อมขาย --> SplitSellers[แยกสินค้าตามผู้ขาย เพื่อสร้างใบสั่งจองแยกตามร้านค้า]
    
    SplitSellers --> CreateOrders[1. บันทึกข้อมูลลงตาราง orders สถานะ 'pending' <br/>2. สร้างตาราง order_items <br/>3. อัปเดตตาราง products สถานะสินค้าเป็น 'sold' <br/>4. สร้างห้องแชตคุยในตาราง chat_rooms]
    CreateOrders --> SendSystemMsg[ส่งข้อความระบบชี้แจงคำสั่งซื้อและยอดชำระเข้าไปในห้องแชตแรกรุ่น]
    
    SendSystemMsg --> OrderLifeCycle{การดำเนินขั้นตอนใบจอง}
    
    %% Upload Slip Flow
    OrderLifeCycle -- ผู้ซื้อโอนเงินสำเร็จและส่งสลิป --> UploadSlip[ผู้ซื้ออัปโหลดรูปภาพสลิปใบโอนเงิน]
    UploadSlip --> UpdateWaiting[ปรับออเดอร์เป็นสถานะ 'waiting_verification']
    UpdateWaiting --> PushWS1[ส่งการแจ้งเตือนและแชร์สลิปในแชตเรียลไทม์ผ่าน Socket.io]
    
    PushWS1 --> VerifySlip{ผู้ขายยืนยันยอดโอนสำเร็จ?}
    VerifySlip -- ปฏิเสธสลิป / ยอดไม่ตรง --> RejectSlip[ผู้ขายกดปฏิเสธสลิป: ปรับสถานะกลับมาเป็น 'pending' <br/>ลบลิงก์รูปสลิปทิ้ง และแจ้งเตือนให้โอนใหม่] --> OrderLifeCycle
    VerifySlip -- อนุมัติสลิป --> ApproveSlip[ปรับออเดอร์เป็นสถานะ 'paid']
    ApproveSlip --> PushWS2[ส่งการแจ้งเตือนเรียลไทม์ ยอดเงินถูกต้อง]
    
    %% Shipping Flow
    PushWS2 --> SellerShip[ผู้ขายห่อของ นำส่งขนส่ง และกรอกบริษัทขนส่ง + เลขพัสดุ Tracking]
    SellerShip --> UpdateShipped[ปรับออเดอร์เป็นสถานะ 'shipped' และส่งข้อความระบบแจ้งเลขพัสดุ]
    
    %% Completed Flow
    UpdateShipped --> BuyerVerify{ผู้ซื้อได้รับของและกดปุ่มยืนยันยอมรับสินค้า?}
    BuyerVerify -- ใช่ --> CompleteOrder[ปรับออเดอร์เป็นสถานะ 'completed' เสร็จสิ้นกระบวนการซื้อขาย]
    
    %% Cancel Flow
    OrderLifeCycle -- ผู้ซื้อ/ผู้ขาย กดยกเลิกรายการสั่งจอง <br/>(ทำได้ขณะสถานะ pending/waiting/paid) --> CancelOrder[ปรับออเดอร์เป็นสถานะ 'cancelled']
    CancelOrder --> RestoreProducts[ระบบหลังบ้านสั่งสแกนสินค้าภายในออเดอร์นั้น <br/>และปรับคืนสถานะ products คืนเป็น 'active' พร้อมขายใหม่]
    RestoreProducts --> SendCancelMsg[ส่งข้อความระบบแจ้งยกเลิกออเดอร์เข้าห้องแชต]
    
    CompleteOrder --> EndBooking
    SendCancelMsg --> EndBooking
```

---

### 5. ระบบตรวจสอบทุจริตและการดำเนินงานฝั่งแอดมิน (Admin Moderation & Anti-Fraud Operations Flow)
แสดงขั้นตอนที่แอดมินดูแลความโปร่งใสในระบบ ตรวจสอบโพสต์ที่น่าสงสัย และควบคุมสมาชิก

```mermaid
flowchart TD
    Start([แอดมินล็อกอินเข้าสู่ระบบหลังบ้าน]) --> AuthCheck{ผ่าน Middleware ตรวจสิทธิ์แอดมิน?}
    AuthCheck -- ไม่มีสิทธิ์ --> Block[ส่ง Error 403 Forbidden]
    AuthCheck -- เป็นแอดมิน --> AdminMenu{เลือกเมนูการดำเนินงาน}
    
    %% Flagged Products Menu
    AdminMenu -- ดูสินค้าที่มีความเสี่ยงทุจริต --> ViewFlagged[ระบบค้นหาและลิสต์สินค้าที่ review_status = 'pending_review']
    ViewFlagged --> InspectFlags[แอดมินอ่านรายงานการปักธง รายละเอียดสินค้า คะแนน และรูปภาพสลิปที่เกี่ยวข้อง]
    InspectFlags --> DecisionReview{พิจารณาความถูกต้องของประกาศ?}
    DecisionReview -- ไม่ผ่าน/ทุจริตจริง --> RejectListing[อัปเดต review_status = 'rejected' <br/>และระงับการแสดงผลสินค้าในตลาด]
    DecisionReview -- อนุมัติ/ถูกต้องปกติ --> ApproveListing[อัปเดต review_status = 'approved' <br/>และเปิดเผยแพร่สินค้าสู่หน้าตลาด]
    
    %% User Management Menu
    AdminMenu -- จัดการบัญชีผู้ใช้ --> ViewUsers[ดึงรายชื่อสมาชิกทั้งหมดในระบบ]
    ViewUsers --> SuspendAction{ต้องการระงับผู้ใช้ที่ก่อกวน/โกงเงิน?}
    SuspendAction -- ใช่ --> SuspendUser[ปรับฟิลด์ status = 'suspended' ในตาราง users <br/>ส่งผลให้ผู้ใช้ถูกตัดจากระบบและไม่สามารถล็อกอินได้]
    SuspendAction -- ไม่ทำอะไร --> AdminMenu
    
    %% Admin Logs
    RejectListing --> LogAction[บันทึกประวัติการกระทำลงตาราง admin_logs เพื่อตรวจสอบย้อนหลัง]
    ApproveListing --> LogAction
    SuspendUser --> LogAction
    
    LogAction --> AdminMenu
```

---

## 📝 ข้อสังเกตและคำถามสำคัญสำหรับการพัฒนาเพิ่มเติม (Observations & Open Questions)

ในฐานะนักพัฒนา นี่คือข้อสังเกตและคำถามทางเทคนิคที่สามารถระบุเพื่อความเสถียรสูงสุดของแอปพลิเคชัน:

1. **การยืนยันตัวตนและการตรวจจับภาพสลิปโอนเงิน (Slip Verification Integration)**:
   * *สถานะปัจจุบัน*: ระบบใช้การจำลอง PromptPay QR หน้าบ้าน และให้ผู้ซื้อส่งภาพหลักฐานเพื่อรอผู้ขายกดยอมรับ/ปฏิเสธด้วยมือ (Manual Approval)
   * *คำถาม/ข้อเสนอแนะ*: ในอนาคตต้องการให้เชื่อมต่อบริการภายนอก เช่น SlipOk หรือ EasySlip API ในการตรวจสอบยอดเงิน วันเวลาที่โอน และผู้รับเงินผ่านรหัสภาพ QR Code (Mini-QR) แบบอัตโนมัติ เพื่อป้องกันการปลอมแปลงสลิป หรือสลิปซ้ำหรือไม่?

2. **ระบบการยกเลิกออเดอร์อัตโนมัติเมื่อค้างชำระ (Pending Timeout)**:
   * *สถานะปัจจุบัน*: ปัจจุบันออเดอร์ที่อยู่ในสถานะ `pending` จะคงอยู่ตลอดไปจนกว่าจะมีคนกดยกเลิก (Cancelled) ด้วยตัวเอง
   * *คำถาม/ข้อเสนอแนะ*: ควรมีระบบตั้งเวลาอัตโนมัติ (เช่น Cron Job หรือ Database Event Scheduler) เพื่อยกเลิกออเดอร์อัตโนมัติและคืนของกลับเป็น `'active'` หากผู้ใช้กดยืนยันจองแล้วไม่มีการอัปโหลดรูปสลิปการโอนเงินภายในเวลาที่กำหนด (เช่น 30 นาที หรือ 1 ชั่วโมง) หรือไม่?

3. **กลไกการสแกนความเข้ากันได้แบบครอบคลุม (Edge Cases in Compatibility)**:
   * *สถานะปัจจุบัน*: ระบบการตรวจสอบ TDP ของ PSU ใช้การประมวลผลพื้นฐานคือ CPU TDP + GPU TDP + 100W (สำหรับบอร์ด/อุปกรณ์อื่น) และเปรียบเทียบกับกำลังไฟ PSU
   * *คำถาม/ข้อเสนอแนะ*: ข้อมูลของพัดลมระบายความร้อนหม้อน้ำ AIO และขนาดเคสบางตัวอาจรองรับได้หลายจุด (เช่น หน้าเคส 360มม. / ด้านบนเคส 240มม.) โครงสร้างข้อมูลตาราง `parts` ของสเปกเคสเป็นรูปแบบสตริง เช่น `"240/360mm"` ซึ่งใช้วิธีแยกคำและตรวจสอบทางข้อมูล การป้อนข้อมูลแคตตาล็อกจึงต้องใช้ความแม่นยำสูงในฟิลด์ JSON ของตาราง `parts.specs`
