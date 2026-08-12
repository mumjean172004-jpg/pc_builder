-- ============================================
-- PC Builder Pro — Seed Data (SQLite)
-- ============================================

-- Categories
INSERT IGNORE INTO categories (id, name, slug, icon, display_order) VALUES
(1, 'CPU', 'cpu', 'microchip', 1),
(2, 'CPU Cooler', 'cpu-cooler', 'fan', 2),
(3, 'Motherboard', 'motherboard', 'memory', 3),
(4, 'Memory', 'ram', 'memory', 4),
(5, 'Graphics Card', 'gpu', 'desktop', 6),
(6, 'Storage', 'storage', 'hdd', 5),
(7, 'Power Supply', 'psu', 'bolt', 7),
(8, 'Case', 'case', 'box', 8),
(9, 'Monitor', 'monitor', 'monitor', 9),
(10, 'Full Pre-built PC', 'full-pc', 'desktop', 10),
(11, 'Accessories', 'accessories', 'keyboard', 11);

-- CPUs
INSERT IGNORE INTO parts (id, name, category_id, brand, model, specs, price) VALUES
(1, 'Intel Core i5-12400F', 1, 'Intel', 'i5-12400F', '{"socket": "LGA1700", "cores": 6, "threads": 12, "base_clock": "2.5GHz", "boost_clock": "4.4GHz", "tdp": 65, "cache": "18MB", "integrated_graphics": false}', 5490),
(2, 'Intel Core i5-13600K', 1, 'Intel', 'i5-13600K', '{"socket": "LGA1700", "cores": 14, "threads": 20, "base_clock": "3.5GHz", "boost_clock": "5.1GHz", "tdp": 125, "cache": "24MB", "integrated_graphics": true}', 10900),
(3, 'Intel Core i7-13700K', 1, 'Intel', 'i7-13700K', '{"socket": "LGA1700", "cores": 16, "threads": 24, "base_clock": "3.4GHz", "boost_clock": "5.4GHz", "tdp": 125, "cache": "30MB", "integrated_graphics": true}', 15900),
(4, 'Intel Core i9-13900K', 1, 'Intel', 'i9-13900K', '{"socket": "LGA1700", "cores": 24, "threads": 32, "base_clock": "3.0GHz", "boost_clock": "5.8GHz", "tdp": 125, "cache": "36MB", "integrated_graphics": true}', 24900),
(5, 'AMD Ryzen 5 5600X', 1, 'AMD', 'Ryzen 5 5600X', '{"socket": "AM4", "cores": 6, "threads": 12, "base_clock": "3.7GHz", "boost_clock": "4.6GHz", "tdp": 65, "cache": "32MB", "integrated_graphics": false}', 5290),
(6, 'AMD Ryzen 7 5800X3D', 1, 'AMD', 'Ryzen 7 5800X3D', '{"socket": "AM4", "cores": 8, "threads": 16, "base_clock": "3.4GHz", "boost_clock": "4.5GHz", "tdp": 105, "cache": "96MB", "integrated_graphics": false}', 11900),
(7, 'AMD Ryzen 5 7600X', 1, 'AMD', 'Ryzen 5 7600X', '{"socket": "AM5", "cores": 6, "threads": 12, "base_clock": "4.7GHz", "boost_clock": "5.3GHz", "tdp": 105, "cache": "32MB", "integrated_graphics": true}', 8900),
(8, 'AMD Ryzen 7 7800X3D', 1, 'AMD', 'Ryzen 7 7800X3D', '{"socket": "AM5", "cores": 8, "threads": 16, "base_clock": "4.2GHz", "boost_clock": "5.0GHz", "tdp": 120, "cache": "96MB", "integrated_graphics": false}', 16900),
(9, 'AMD Ryzen 9 7950X', 1, 'AMD', 'Ryzen 9 7950X', '{"socket": "AM5", "cores": 16, "threads": 32, "base_clock": "4.5GHz", "boost_clock": "5.7GHz", "tdp": 170, "cache": "64MB", "integrated_graphics": true}', 22900),
(10, 'Intel Core i3-12100F', 1, 'Intel', 'i3-12100F', '{"socket": "LGA1700", "cores": 4, "threads": 8, "base_clock": "3.3GHz", "boost_clock": "4.3GHz", "tdp": 58, "cache": "12MB", "integrated_graphics": false}', 3290);

-- CPU Coolers
INSERT IGNORE INTO parts (id, name, category_id, brand, model, specs, price) VALUES
(11, 'Cooler Master Hyper 212 RGB', 2, 'Cooler Master', 'Hyper 212 RGB', '{"type": "air", "height_mm": 159, "tdp_rating": 150, "noise_db": "6-27", "rpm": "650-1800"}', 1290),
(12, 'Noctua NH-D15', 2, 'Noctua', 'NH-D15', '{"type": "air", "height_mm": 165, "tdp_rating": 220, "noise_db": "24.6", "rpm": "300-1500"}', 3990),
(13, 'be quiet! Dark Rock Pro 4', 2, 'be quiet!', 'Dark Rock Pro 4', '{"type": "air", "height_mm": 163, "tdp_rating": 250, "noise_db": "24.3", "rpm": "1500"}', 3490),
(14, 'Corsair iCUE H150i Elite', 2, 'Corsair', 'H150i Elite', '{"type": "aio", "radiator_mm": 360, "tdp_rating": 300, "noise_db": "10-36", "rpm": "400-2400"}', 5990),
(15, 'NZXT Kraken X63', 2, 'NZXT', 'Kraken X63', '{"type": "aio", "radiator_mm": 280, "tdp_rating": 280, "noise_db": "21-36", "rpm": "500-1800"}', 4490),
(16, 'Deepcool AK400', 2, 'Deepcool', 'AK400', '{"type": "air", "height_mm": 155, "tdp_rating": 220, "noise_db": "28", "rpm": "500-1850"}', 990);

-- Motherboards
INSERT IGNORE INTO parts (id, name, category_id, brand, model, specs, price) VALUES
(17, 'MSI PRO B660M-A DDR4', 3, 'MSI', 'PRO B660M-A DDR4', '{"socket": "LGA1700", "chipset": "B660", "form_factor": "mATX", "ram_type": "DDR4", "ram_slots": 2, "max_ram_gb": 64, "m2_slots": 2, "sata_ports": 4, "pcie_version": "4.0"}', 3490),
(18, 'ASUS TUF Gaming Z690-Plus WiFi', 3, 'ASUS', 'TUF Z690-Plus WiFi', '{"socket": "LGA1700", "chipset": "Z690", "form_factor": "ATX", "ram_type": "DDR4", "ram_slots": 4, "max_ram_gb": 128, "m2_slots": 4, "sata_ports": 4, "pcie_version": "5.0"}', 8990),
(19, 'Gigabyte B760M DS3H DDR4', 3, 'Gigabyte', 'B760M DS3H DDR4', '{"socket": "LGA1700", "chipset": "B760", "form_factor": "mATX", "ram_type": "DDR4", "ram_slots": 2, "max_ram_gb": 64, "m2_slots": 2, "sata_ports": 4, "pcie_version": "4.0"}', 2990),
(20, 'ASUS ROG Strix B550-F Gaming', 3, 'ASUS', 'ROG Strix B550-F', '{"socket": "AM4", "chipset": "B550", "form_factor": "ATX", "ram_type": "DDR4", "ram_slots": 4, "max_ram_gb": 128, "m2_slots": 2, "sata_ports": 6, "pcie_version": "4.0"}', 5990),
(21, 'MSI MAG B550 Tomahawk', 3, 'MSI', 'MAG B550 Tomahawk', '{"socket": "AM4", "chipset": "B550", "form_factor": "ATX", "ram_type": "DDR4", "ram_slots": 4, "max_ram_gb": 128, "m2_slots": 2, "sata_ports": 6, "pcie_version": "4.0"}', 5490),
(22, 'ASUS ROG Strix X670E-E Gaming WiFi', 3, 'ASUS', 'ROG Strix X670E-E', '{"socket": "AM5", "chipset": "X670E", "form_factor": "ATX", "ram_type": "DDR5", "ram_slots": 4, "max_ram_gb": 128, "m2_slots": 4, "sata_ports": 4, "pcie_version": "5.0"}', 16990),
(23, 'Gigabyte B650 AORUS Elite AX', 3, 'Gigabyte', 'B650 AORUS Elite AX', '{"socket": "AM5", "chipset": "B650", "form_factor": "ATX", "ram_type": "DDR5", "ram_slots": 4, "max_ram_gb": 128, "m2_slots": 3, "sata_ports": 4, "pcie_version": "4.0"}', 7990),
(24, 'MSI MPG Z790 Carbon WiFi', 3, 'MSI', 'MPG Z790 Carbon WiFi', '{"socket": "LGA1700", "chipset": "Z790", "form_factor": "ATX", "ram_type": "DDR5", "ram_slots": 4, "max_ram_gb": 128, "m2_slots": 5, "sata_ports": 6, "pcie_version": "5.0"}', 13990);

-- RAM
INSERT IGNORE INTO parts (id, name, category_id, brand, model, specs, price) VALUES
(25, 'Corsair Vengeance LPX 16GB DDR4-3200', 4, 'Corsair', 'Vengeance LPX 16GB', '{"type": "DDR4", "capacity_gb": 16, "modules": 2, "speed": "3200MHz", "latency": "CL16", "voltage": "1.35V"}', 1790),
(26, 'G.Skill Trident Z5 RGB 32GB DDR5-6000', 4, 'G.Skill', 'Trident Z5 RGB 32GB', '{"type": "DDR5", "capacity_gb": 32, "modules": 2, "speed": "6000MHz", "latency": "CL30", "voltage": "1.35V"}', 5990),
(27, 'Kingston Fury Beast 16GB DDR4-3600', 4, 'Kingston', 'Fury Beast 16GB', '{"type": "DDR4", "capacity_gb": 16, "modules": 2, "speed": "3600MHz", "latency": "CL18", "voltage": "1.35V"}', 1990),
(28, 'Corsair Dominator Platinum 32GB DDR5-5600', 4, 'Corsair', 'Dominator Platinum 32GB', '{"type": "DDR5", "capacity_gb": 32, "modules": 2, "speed": "5600MHz", "latency": "CL36", "voltage": "1.25V"}', 6990),
(29, 'Teamgroup T-Force Delta RGB 16GB DDR4-3200', 4, 'Teamgroup', 'T-Force Delta RGB 16GB', '{"type": "DDR4", "capacity_gb": 16, "modules": 2, "speed": "3200MHz", "latency": "CL16", "voltage": "1.35V"}', 1690),
(30, 'G.Skill Ripjaws V 32GB DDR4-3600', 4, 'G.Skill', 'Ripjaws V 32GB', '{"type": "DDR4", "capacity_gb": 32, "modules": 2, "speed": "3600MHz", "latency": "CL16", "voltage": "1.35V"}', 3490),
(31, 'Kingston Fury Beast 32GB DDR5-5200', 4, 'Kingston', 'Fury Beast 32GB DDR5', '{"type": "DDR5", "capacity_gb": 32, "modules": 2, "speed": "5200MHz", "latency": "CL40", "voltage": "1.25V"}', 4490),
(32, 'ADATA XPG Lancer 16GB DDR5-5200', 4, 'ADATA', 'XPG Lancer 16GB', '{"type": "DDR5", "capacity_gb": 16, "modules": 2, "speed": "5200MHz", "latency": "CL38", "voltage": "1.25V"}', 2990);

-- GPUs
INSERT IGNORE INTO parts (id, name, category_id, brand, model, specs, price) VALUES
(33, 'NVIDIA GeForce RTX 4060 8GB', 5, 'NVIDIA', 'RTX 4060', '{"vram_gb": 8, "vram_type": "GDDR6", "tdp": 115, "length_mm": 244, "pcie": "4.0 x16", "boost_clock": "2535MHz", "cuda_cores": 3072}', 11900),
(34, 'NVIDIA GeForce RTX 4070 12GB', 5, 'NVIDIA', 'RTX 4070', '{"vram_gb": 12, "vram_type": "GDDR6X", "tdp": 200, "length_mm": 285, "pcie": "4.0 x16", "boost_clock": "2475MHz", "cuda_cores": 5888}', 21900),
(35, 'NVIDIA GeForce RTX 4080 16GB', 5, 'NVIDIA', 'RTX 4080', '{"vram_gb": 16, "vram_type": "GDDR6X", "tdp": 320, "length_mm": 310, "pcie": "4.0 x16", "boost_clock": "2505MHz", "cuda_cores": 9728}', 42900),
(36, 'NVIDIA GeForce RTX 4090 24GB', 5, 'NVIDIA', 'RTX 4090', '{"vram_gb": 24, "vram_type": "GDDR6X", "tdp": 450, "length_mm": 336, "pcie": "4.0 x16", "boost_clock": "2520MHz", "cuda_cores": 16384}', 79900),
(37, 'AMD Radeon RX 6650 XT 8GB', 5, 'AMD', 'RX 6650 XT', '{"vram_gb": 8, "vram_type": "GDDR6", "tdp": 180, "length_mm": 240, "pcie": "4.0 x16", "boost_clock": "2635MHz", "stream_processors": 2048}', 8900),
(38, 'AMD Radeon RX 7800 XT 16GB', 5, 'AMD', 'RX 7800 XT', '{"vram_gb": 16, "vram_type": "GDDR6", "tdp": 263, "length_mm": 267, "pcie": "4.0 x16", "boost_clock": "2430MHz", "stream_processors": 3840}', 19900),
(39, 'AMD Radeon RX 7900 XTX 24GB', 5, 'AMD', 'RX 7900 XTX', '{"vram_gb": 24, "vram_type": "GDDR6", "tdp": 355, "length_mm": 287, "pcie": "4.0 x16", "boost_clock": "2500MHz", "stream_processors": 6144}', 36900),
(40, 'NVIDIA GeForce RTX 4060 Ti 8GB', 5, 'NVIDIA', 'RTX 4060 Ti', '{"vram_gb": 8, "vram_type": "GDDR6", "tdp": 160, "length_mm": 244, "pcie": "4.0 x16", "boost_clock": "2535MHz", "cuda_cores": 4352}', 15900);

-- Storage
INSERT IGNORE INTO parts (id, name, category_id, brand, model, specs, price) VALUES
(41, 'Samsung 970 EVO Plus 1TB NVMe', 6, 'Samsung', '970 EVO Plus 1TB', '{"interface": "NVMe", "form_factor": "M.2 2280", "capacity_gb": 1000, "read_speed": "3500MB/s", "write_speed": "3300MB_s", "type": "ssd"}', 3490),
(42, 'WD Black SN770 1TB NVMe', 6, 'Western Digital', 'SN770 1TB', '{"interface": "NVMe", "form_factor": "M.2 2280", "capacity_gb": 1000, "read_speed": "5150MB/s", "write_speed": "4900MB_s", "type": "ssd"}', 2990),
(43, 'Samsung 990 Pro 2TB NVMe', 6, 'Samsung', '990 Pro 2TB', '{"interface": "NVMe", "form_factor": "M.2 2280", "capacity_gb": 2000, "read_speed": "7450MB/s", "write_speed": "6900MB_s", "type": "ssd"}', 7990),
(44, 'Crucial P3 500GB NVMe', 6, 'Crucial', 'P3 500GB', '{"interface": "NVMe", "form_factor": "M.2 2280", "capacity_gb": 500, "read_speed": "3500MB/s", "write_speed": "1900MB_s", "type": "ssd"}', 1490),
(45, 'Seagate Barracuda 2TB HDD', 6, 'Seagate', 'Barracuda 2TB', '{"interface": "SATA", "form_factor": "3.5 inch", "capacity_gb": 2000, "read_speed": "220MB/s", "write_speed": "220MB_s", "type": "hdd", "rpm": 7200}', 2290),
(46, 'Samsung 870 EVO 1TB SATA SSD', 6, 'Samsung', '870 EVO 1TB', '{"interface": "SATA", "form_factor": "2.5 inch", "capacity_gb": 1000, "read_speed": "560MB/s", "write_speed": "530MB_s", "type": "ssd"}', 3290),
(47, 'Kingston NV2 1TB NVMe', 6, 'Kingston', 'NV2 1TB', '{"interface": "NVMe", "form_factor": "M.2 2280", "capacity_gb": 1000, "read_speed": "3500MB/s", "write_speed": "2800MB_s", "type": "ssd"}', 2290);

-- Power Supplies
INSERT IGNORE INTO parts (id, name, category_id, brand, model, specs, price) VALUES
(48, 'Corsair RM750e 750W 80+ Gold', 7, 'Corsair', 'RM750e', '{"wattage": 750, "efficiency": "80+ Gold", "modularity": "full", "fan_size_mm": 120, "form_factor": "ATX"}', 3490),
(49, 'Corsair RM850x 850W 80+ Gold', 7, 'Corsair', 'RM850x', '{"wattage": 850, "efficiency": "80+ Gold", "modularity": "full", "fan_size_mm": 135, "form_factor": "ATX"}', 4490),
(50, 'EVGA SuperNOVA 650 G6 650W 80+ Gold', 7, 'EVGA', '650 G6', '{"wattage": 650, "efficiency": "80+ Gold", "modularity": "full", "fan_size_mm": 120, "form_factor": "ATX"}', 2790),
(51, 'Seasonic Focus GX-1000 1000W 80+ Gold', 7, 'Seasonic', 'Focus GX-1000', '{"wattage": 1000, "efficiency": "80+ Gold", "modularity": "full", "fan_size_mm": 120, "form_factor": "ATX"}', 5990),
(52, 'Cooler Master MWE 550 Bronze 550W', 7, 'Cooler Master', 'MWE 550 Bronze', '{"wattage": 550, "efficiency": "80+ Bronze", "modularity": "none", "fan_size_mm": 120, "form_factor": "ATX"}', 1790),
(53, 'be quiet! Straight Power 11 750W 80+ Gold', 7, 'be quiet!', 'Straight Power 11 750W', '{"wattage": 750, "efficiency": "80+ Gold", "modularity": "full", "fan_size_mm": 135, "form_factor": "ATX"}', 4290);

-- Cases
INSERT IGNORE INTO parts (id, name, category_id, brand, model, specs, price) VALUES
(54, 'NZXT H5 Flow', 8, 'NZXT', 'H5 Flow', '{"form_factor": "ATX", "max_gpu_length_mm": 365, "max_cooler_height_mm": 165, "radiator_support": "240/360mm", "included_fans": 2, "drive_bays": "2x 3.5, 2x 2.5"}', 2990),
(55, 'Corsair 4000D Airflow', 8, 'Corsair', '4000D Airflow', '{"form_factor": "ATX", "max_gpu_length_mm": 360, "max_cooler_height_mm": 170, "radiator_support": "240/360mm", "included_fans": 2, "drive_bays": "2x 3.5, 2x 2.5"}', 3490),
(56, 'Lian Li O11 Dynamic EVO', 8, 'Lian Li', 'O11 Dynamic EVO', '{"form_factor": "ATX", "max_gpu_length_mm": 420, "max_cooler_height_mm": 167, "radiator_support": "360/360/360mm", "included_fans": 0, "drive_bays": "6x 2.5"}', 4990),
(57, 'Cooler Master MasterBox Q300L', 8, 'Cooler Master', 'MasterBox Q300L', '{"form_factor": "mATX", "max_gpu_length_mm": 360, "max_cooler_height_mm": 157, "radiator_support": "120/240mm", "included_fans": 1, "drive_bays": "1x 3.5, 2x 2.5"}', 1490),
(58, 'Fractal Design Meshify C', 8, 'Fractal Design', 'Meshify C', '{"form_factor": "ATX", "max_gpu_length_mm": 315, "max_cooler_height_mm": 170, "radiator_support": "240/360mm", "included_fans": 2, "drive_bays": "2x 3.5, 3x 2.5"}', 3290),
(59, 'Phanteks Eclipse P400A Digital', 8, 'Phanteks', 'P400A Digital', '{"form_factor": "ATX", "max_gpu_length_mm": 420, "max_cooler_height_mm": 160, "radiator_support": "240/360mm", "included_fans": 3, "drive_bays": "2x 3.5, 2x 2.5"}', 2790);

-- Marketplace-only models
INSERT IGNORE INTO parts (id, name, category_id, brand, model, specs, price) VALUES
(60, 'Dell UltraSharp U2723QE 27 inch 4K', 9, 'Dell', 'UltraSharp U2723QE', '{"size_inches": 27, "resolution": "3840x2160", "refresh_rate": "60Hz", "panel": "IPS"}', 18900),
(61, 'LG UltraGear 27GP850-B 27 inch QHD', 9, 'LG', 'UltraGear 27GP850-B', '{"size_inches": 27, "resolution": "2560x1440", "refresh_rate": "165Hz", "panel": "Nano IPS"}', 12900),
(62, 'ASUS TUF Gaming VG27AQ 27 inch QHD', 9, 'ASUS', 'TUF Gaming VG27AQ', '{"size_inches": 27, "resolution": "2560x1440", "refresh_rate": "165Hz", "panel": "IPS"}', 10900),
(63, 'Gaming PC Ryzen 5 RTX 4060', 10, 'PC Builder Pro', 'Ryzen 5 RTX 4060', '{"cpu": "Ryzen 5", "gpu": "RTX 4060", "ram": "16GB", "storage": "1TB NVMe"}', 32900),
(64, 'Workstation PC Core i7 RTX 4070', 10, 'PC Builder Pro', 'Core i7 RTX 4070', '{"cpu": "Core i7", "gpu": "RTX 4070", "ram": "32GB", "storage": "2TB NVMe"}', 58900),
(65, 'Logitech G Pro X Keyboard', 11, 'Logitech', 'G Pro X Keyboard', '{"type": "keyboard", "switch": "hot-swappable", "connection": "USB"}', 3990),
(66, 'Razer DeathAdder V3 Mouse', 11, 'Razer', 'DeathAdder V3', '{"type": "mouse", "dpi": 30000, "connection": "USB"}', 2290),
(67, 'HyperX Cloud II Headset', 11, 'HyperX', 'Cloud II', '{"type": "headset", "connection": "USB/3.5mm"}', 2990);

-- Seed Users (passwords are bcrypt hash for 'password123')
INSERT IGNORE INTO users (id, username, email, password, avatar_url, role) VALUES
(1, 'johndoe', 'john@example.com', '$2b$10$tZ3F0lK72Fm5u5L/bV97Eu2t46m6jI52hC4mQoH5e88gT.V6.j7/K', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', 'member'),
(2, 'janedoe', 'jane@example.com', '$2b$10$tZ3F0lK72Fm5u5L/bV97Eu2t46m6jI52hC4mQoH5e88gT.V6.j7/K', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', 'member'),
(3, 'admin', 'admin@example.com', '$2b$10$tZ3F0lK72Fm5u5L/bV97Eu2t46m6jI52hC4mQoH5e88gT.V6.j7/K', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80', 'admin');

-- Seed Products (Active marketplace listings)
INSERT IGNORE INTO products (id, seller_id, category_id, part_id, `condition`, remaining_warranty_months, price, stock_quantity, serial_number, description, status, review_status, suspicious_score, suspicious_reasons) VALUES
(1, 1, 1, 1, 'used_90', 24, 4500.0, 1, 'SN12400F123', 'ขาย CPU Intel Core i5-12400F สภาพนางฟ้า ใช้งานได้ปกติ กล่องครบ', 'active', 'approved', 0, '[]'),
(2, 2, 3, 17, 'used_90', 12, 2800.0, 1, 'SNB660M123', 'เมนบอร์ด MSI PRO B660M-A DDR4 สภาพสวยๆ อุปกรณ์ครบกล่อง ประกันเหลือ', 'active', 'approved', 0, '[]'),
(3, 1, 4, 25, 'used_80', 6, 1200.0, 2, 'SNRAM123', 'RAM Corsair Vengeance LPX 16GB (8x2) DDR4 Bus 3200 ใช้งานได้ปกติ ไม่มีปัญหา', 'active', 'approved', 0, '[]'),
(4, 2, 5, 33, 'used_90', 18, 9500.0, 1, 'SNGPU123', 'การ์ดจอ RTX 4060 8GB สภาพเหมือนใหม่ ไม่เคยขุด เล่นเกมอย่างเดียว ประกันยาว', 'active', 'approved', 0, '[]'),
(5, 1, 7, 52, 'used_80', 0, 1100.0, 1, 'SNPSU123', 'PSU Cooler Master MWE 550W Bronze ใช้งานได้ดี ไฟนิ่งๆ', 'active', 'approved', 0, '[]'),
(6, 2, 8, 54, 'used_90', 12, 2000.0, 1, 'SNCASE123', 'เคส NZXT H5 Flow สีดำ สภาพสวย ไม่มีรอย พัดลมติดเคสอยู่ครบ', 'active', 'approved', 0, '[]'),
(7, 1, 6, 42, 'used_90', 36, 2200.0, 1, 'SNSSD123', 'SSD WD Black SN770 1TB NVMe ความเร็วสูง สภาพ 99% ประกันเกือบเต็ม', 'active', 'approved', 0, '[]'),
(8, 2, 2, 16, 'used_90', 12, 750.0, 1, 'SNCOOL123', 'ซิงค์ลม Deepcool AK400 สภาพดี พัดลมหมุนเงียบ ระบายความร้อนดีมาก', 'active', 'approved', 0, '[]');

