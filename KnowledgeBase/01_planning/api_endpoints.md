# API Endpoints

## Users
- `POST /api/users/register` - สมัครสมาชิก
- `POST /api/users/login` - เข้าสู่ระบบ
- `GET /api/users/:id` - ดูข้อมูลผู้ใช้
- `PUT /api/users/:id` - แก้ไขข้อมูลผู้ใช้

## Products
- `GET /api/products` - ดูรายการสินค้า (มี pagination)
- `GET /api/products/:id` - ดูรายละเอียดสินค้า
- `POST /api/products` - ลงขายสินค้า
- `PUT /api/products/:id` - แก้ไขสินค้า
- `DELETE /api/products/:id` - ลบสินค้า
- `GET /api/products/search?query=...` - ค้นหาสินค้า

## PC Parts
- `GET /api/pc-parts` - ดูรายการอะไหล่
- `GET /api/pc-parts/:id` - ดูรายละเอียดอะไหล่
- `GET /api/pc-parts/type/:type` - ดูอะไหล่ตามประเภท

## PC Builder
- `GET /api/pc-builder` - ดูรายการ Build ทั้งหมด
- `POST /api/pc-builder` - สร้าง Build ใหม่
- `GET /api/pc-builder/:id` - ดูรายละเอียด Build
- `POST /api/pc-builder/calculate` - คำนวณราคา Build

## Orders
- `GET /api/orders` - ดูรายการสั่งซื้อ
- `POST /api/orders` - สร้างสั่งซื้อใหม่
- `PUT /api/orders/:id/status` - อัปเดตสถานะการสั่งซื้อ
