-- ============================================
-- PC Builder Pro — Seed Data (MySQL)
-- ============================================

-- Categories (matches productController.js's LISTING_CATEGORY_SLUGS — 'cpu-cooler',
-- 'case', 'accessories', and 'full-pc' were retired and are intentionally NOT seeded)
INSERT IGNORE INTO categories (id, name, slug, icon, display_order) VALUES
(1, 'CPU', 'cpu', 'microchip', 1),
(3, 'Motherboard', 'motherboard', 'memory', 3),
(4, 'Memory', 'ram', 'memory', 4),
(5, 'Graphics Card', 'gpu', 'desktop', 6),
(6, 'Storage', 'storage', 'hdd', 5),
(7, 'Power Supply', 'psu', 'bolt', 7),
(9, 'Monitor', 'monitor', 'monitor', 9);

-- Seed Users (passwords are bcrypt hash for 'password123')
INSERT IGNORE INTO users (id, username, email, password, avatar_url, role) VALUES
(1, 'johndoe', 'john@example.com', '$2b$10$tZ3F0lK72Fm5u5L/bV97Eu2t46m6jI52hC4mQoH5e88gT.V6.j7/K', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', 'member'),
(2, 'janedoe', 'jane@example.com', '$2b$10$tZ3F0lK72Fm5u5L/bV97Eu2t46m6jI52hC4mQoH5e88gT.V6.j7/K', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', 'member'),
(3, 'admin', 'admin@example.com', '$2b$10$tZ3F0lK72Fm5u5L/bV97Eu2t46m6jI52hC4mQoH5e88gT.V6.j7/K', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80', 'admin');

-- Seed Products (Active marketplace listings) — products.brand/model ARE the
-- catalog now; there is no separate `parts` table to reference.
INSERT IGNORE INTO products (id, seller_id, category_id, brand, model, `condition`, remaining_warranty_months, price, stock_quantity, serial_number, description, status, review_status, suspicious_score, suspicious_reasons) VALUES
(1, 1, 1, 'Intel', 'Core i5-12400F', 'used_90', 24, 4500.0, 1, 'SN12400F123', 'ขาย CPU Intel Core i5-12400F สภาพนางฟ้า ใช้งานได้ปกติ กล่องครบ', 'active', 'approved', 0, '[]'),
(2, 2, 3, 'MSI', 'PRO B660M-A DDR4', 'used_90', 12, 2800.0, 1, 'SNB660M123', 'เมนบอร์ด MSI PRO B660M-A DDR4 สภาพสวยๆ อุปกรณ์ครบกล่อง ประกันเหลือ', 'active', 'approved', 0, '[]'),
(3, 1, 4, 'Corsair', 'Vengeance LPX 16GB DDR4-3200', 'used_80', 6, 1200.0, 2, 'SNRAM123', 'RAM Corsair Vengeance LPX 16GB (8x2) DDR4 Bus 3200 ใช้งานได้ปกติ ไม่มีปัญหา', 'active', 'approved', 0, '[]'),
(4, 2, 5, 'NVIDIA', 'GeForce RTX 4060 8GB', 'used_90', 18, 9500.0, 1, 'SNGPU123', 'การ์ดจอ RTX 4060 8GB สภาพเหมือนใหม่ ไม่เคยขุด เล่นเกมอย่างเดียว ประกันยาว', 'active', 'approved', 0, '[]'),
(5, 1, 7, 'Cooler Master', 'MWE 550 Bronze', 'used_80', 0, 1100.0, 1, 'SNPSU123', 'PSU Cooler Master MWE 550W Bronze ใช้งานได้ดี ไฟนิ่งๆ', 'active', 'approved', 0, '[]'),
(7, 1, 6, 'Western Digital', 'SN770 1TB', 'used_90', 36, 2200.0, 1, 'SNSSD123', 'SSD WD Black SN770 1TB NVMe ความเร็วสูง สภาพ 99% ประกันเกือบเต็ม', 'active', 'approved', 0, '[]');

-- Typed specs, one row per seeded product above — plain values (not FK lookup
-- ids), matching how spec_* tables are written by the app today. (spec_case and
-- spec_cpu_cooler are intentionally not seeded — their categories were retired.)
INSERT IGNORE INTO spec_cpu (product_id, socket, cores, threads) VALUES
(1, 'LGA1700', 6, 12);

INSERT IGNORE INTO spec_motherboard (product_id, socket, chipset, form_factor, ram_type, ram_slots, max_ram_gb) VALUES
(2, 'LGA1700', 'B660', 'mATX', 'DDR4', 2, 64);

INSERT IGNORE INTO spec_ram (product_id, type, capacity_gb, speed, modules) VALUES
(3, 'DDR4', 16, 3200, 2);

INSERT IGNORE INTO spec_gpu (product_id, vram_gb, vram_type, length_mm) VALUES
(4, 8, 'GDDR6', 244);

INSERT IGNORE INTO spec_psu (product_id, wattage, efficiency, modularity) VALUES
(5, 550, '80+ Bronze', 'none');

INSERT IGNORE INTO spec_storage (product_id, interface, capacity_gb, read_speed) VALUES
(7, 'NVMe', 1000, '5150MB/s');
