# Security

## Authentication
- JWT (JSON Web Tokens) สำหรับการยืนยันตัวตน
- Password Hashing: bcrypt
- Token Expiration: 24 hours

## Authorization
- Middleware ตรวจสอบ token ในทุก protected routes
- User สามารถแก้ไขเฉพาะข้อมูลของตัวเอง

## Data Protection
- HTTPS สำหรับการส่งข้อมูล
- Input Validation ในทุก API endpoint
- SQL Injection Prevention: Prepared Statements

## API Security
- CORS (Cross-Origin Resource Sharing) ตั้งค่าให้อนุญาตเฉพาะ domain ที่ต้องการ
- Rate Limiting: จำกัดจำนวน request ต่อ IP
- Request Size Limit: จำกัดขนาด payload

## Session Management
- Session Timeout: 30 นาที
- Auto Logout เมื่อ token หมดอายุ
- Secure Cookies (HttpOnly, Secure flag)
