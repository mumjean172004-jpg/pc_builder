-- ============================================
-- PC Builder Pro — Database Schema (MySQL)
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;

-- Full drop list — every table this file defines, PLUS `parts` (a legacy table
-- removed from this schema entirely on 2026-08-17, not redefined below at all).
-- Without an explicit DROP for a table that's no longer part of the schema,
-- re-applying this file against a database that still has it (e.g. an older
-- deploy) leaves it behind as an orphan forever — confirmed live on 2026-08-20
-- re-applying against a stale Railway database that still had the old `parts`
-- table from before the product-centric migration. Keep this list in sync with
-- every CREATE TABLE below (and any future removed table) so a re-apply is
-- always a true clean slate, not just "whatever this file currently defines".
DROP TABLE IF EXISTS admin_logs;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS otps;
DROP TABLE IF EXISTS wishlists;
DROP TABLE IF EXISTS buyer_addresses;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_rooms;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS build_comments;
DROP TABLE IF EXISTS build_likes;
DROP TABLE IF EXISTS build_parts;
DROP TABLE IF EXISTS builds;
DROP TABLE IF EXISTS product_review_flags;
DROP TABLE IF EXISTS product_photos;
DROP TABLE IF EXISTS spec_cpu;
DROP TABLE IF EXISTS spec_cpu_cooler;
DROP TABLE IF EXISTS spec_motherboard;
DROP TABLE IF EXISTS spec_ram;
DROP TABLE IF EXISTS spec_gpu;
DROP TABLE IF EXISTS spec_case;
DROP TABLE IF EXISTS spec_psu;
DROP TABLE IF EXISTS spec_storage;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS chipset_generations;
DROP TABLE IF EXISTS cpu_models;
DROP TABLE IF EXISTS cpu_generations;
DROP TABLE IF EXISTS psu_efficiency;
DROP TABLE IF EXISTS psu_modular;
DROP TABLE IF EXISTS gpu_chips;
DROP TABLE IF EXISTS vga_series;
DROP TABLE IF EXISTS cpu_series;
DROP TABLE IF EXISTS brands;
DROP TABLE IF EXISTS chipsets;
DROP TABLE IF EXISTS sockets;
DROP TABLE IF EXISTS form_factors;
DROP TABLE IF EXISTS ram_types;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS seller_profiles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS parts;

SET FOREIGN_KEY_CHECKS = 1;

-- Users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar_url TEXT DEFAULT NULL,
    phone VARCHAR(50) UNIQUE DEFAULT NULL,
    google_id VARCHAR(255) UNIQUE DEFAULT NULL,
    facebook_id VARCHAR(255) UNIQUE DEFAULT NULL,
    active_role VARCHAR(50) DEFAULT 'buyer' CHECK (active_role IN ('buyer', 'seller')),
    is_phone_verified TINYINT DEFAULT 0,
    is_email_verified TINYINT DEFAULT 0,
    role VARCHAR(50) DEFAULT 'member',
    status VARCHAR(50) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seller/KYC data, 1:1 with users via user_id as PK+FK (enforces one seller
-- profile per account by construction, not just convention)
CREATE TABLE seller_profiles (
    user_id INT PRIMARY KEY,
    shop_name VARCHAR(255) DEFAULT NULL,
    shop_avatar_url TEXT DEFAULT NULL,
    address_province VARCHAR(255) DEFAULT NULL,
    address_district VARCHAR(255) DEFAULT NULL,
    contact_phone VARCHAR(50) DEFAULT NULL,
    full_name VARCHAR(255) DEFAULT NULL,
    id_card_number VARCHAR(50) DEFAULT NULL,
    bank_name VARCHAR(100) DEFAULT NULL,
    bank_account_number VARCHAR(100) DEFAULT NULL,
    bank_account_name VARCHAR(255) DEFAULT NULL,
    kyc_status VARCHAR(50) DEFAULT 'none',
    kyc_document_url TEXT DEFAULT NULL,
    is_verified TINYINT DEFAULT 0,
    has_badge TINYINT DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    sales_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Part Categories
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    icon VARCHAR(100) DEFAULT 'microchip',
    display_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Master lookup tables — drive cascading dropdowns (pick socket -> filtered chipset
-- list, etc.) on the admin catalog form and the seller "add new model" form, and give
-- the typed spec_* tables below FK-checked values instead of free-text strings.
CREATE TABLE sockets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    brand VARCHAR(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chipsets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    socket_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    UNIQUE KEY uniq_socket_chipset (socket_id, name),
    FOREIGN KEY (socket_id) REFERENCES sockets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE form_factors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL,
    size_level INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ram_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Open lookups (auto-register a new value the first time a seller/admin uses it,
-- see specTables.js's `open: true`) vs closed standards below (PSU wattage/rating
-- are real fixed electrical standards, so unknown values are rejected instead).
CREATE TABLE brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cpu_series (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vga_series (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE gpu_chips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    series_id INT DEFAULT NULL,
    FOREIGN KEY (series_id) REFERENCES vga_series(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE psu_modular (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE psu_efficiency (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CPU generation/model cascading-picker data (add-model modal only — never read by
-- compatibilityService, which is driven entirely by spec_cpu.socket_id; see
-- spec_cpu.generation_id below for the one place a value from here is persisted).
CREATE TABLE cpu_generations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    brand VARCHAR(10) NOT NULL,
    socket_id INT NOT NULL,
    FOREIGN KEY (socket_id) REFERENCES sockets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cpu_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    generation_id INT NOT NULL,
    FOREIGN KEY (generation_id) REFERENCES cpu_generations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Which CPU generation(s) a given chipset supports — drives the motherboard
-- listing form's "Gen ที่ใช้ได้" (compatible generation) picker. Many-to-many:
-- a chipset era (e.g. Z790/H770/B760) commonly supports more than one generation.
CREATE TABLE chipset_generations (
    chipset_id INT NOT NULL,
    generation_id INT NOT NULL,
    PRIMARY KEY (chipset_id, generation_id),
    FOREIGN KEY (chipset_id) REFERENCES chipsets(id) ON DELETE CASCADE,
    FOREIGN KEY (generation_id) REFERENCES cpu_generations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Marketplace Product Listings — the single source of truth for everything.
-- There is no separate neutral `parts` catalog: a seller's own listing (brand,
-- model, price) IS the record; the spec_* tables below key directly off
-- products.id and store plain spec values (no FK-checked lookup ids), and the
-- anti-fraud/auto-build/Cross-Match engines compare real listings against each
-- other (same brand+model) rather than against an admin-controlled MSRP.
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    category_id INT NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    `condition` VARCHAR(50) NOT NULL CHECK (`condition` IN ('new', 'used_90', 'used_80', 'used_70')),
    remaining_warranty_months INT NOT NULL DEFAULT 0,
    warranty_type ENUM('no_warranty', 'seller_warranty', 'manufacturer_warranty', 'lifetime') NOT NULL DEFAULT 'no_warranty',
    warranty_years INT NOT NULL DEFAULT 0,
    warranty_months INT NOT NULL DEFAULT 0,
    warranty_days INT NOT NULL DEFAULT 0,
    total_warranty_days INT GENERATED ALWAYS AS (warranty_years * 365 + warranty_months * 30 + warranty_days) STORED,
    sku VARCHAR(64) DEFAULT NULL,
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2) DEFAULT NULL,
    stock_quantity INT NOT NULL DEFAULT 1,
    serial_number VARCHAR(255) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'paused')),
    review_status VARCHAR(50) NOT NULL DEFAULT 'approved' CHECK (review_status IN ('approved', 'pending_review', 'rejected')),
    suspicious_score INT NOT NULL DEFAULT 0,
    suspicious_reasons TEXT NOT NULL,
    proof_image_url TEXT DEFAULT NULL,
    sn_image_url TEXT DEFAULT NULL,
    is_prebuilt_set TINYINT DEFAULT 0,
    prebuilt_specs TEXT DEFAULT NULL,
    prebuilt_components TEXT DEFAULT NULL,
    allow_hand_pickup TINYINT DEFAULT 1,
    allow_cod TINYINT DEFAULT 0,
    allow_express TINYINT DEFAULT 1,
    pickup_location VARCHAR(255) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Typed spec tables, one per category, keyed 1:1 to the listing they describe.
-- Values are plain strings/numbers as entered (e.g. socket 'LGA1700', chipset
-- 'B760') rather than FK ids into sockets/chipsets/etc — those lookup tables
-- still exist to drive the seller's cascading "add new model" picker, but are
-- no longer joined against these spec rows at read time.
CREATE TABLE spec_cpu (
    product_id INT PRIMARY KEY,
    socket VARCHAR(50) NOT NULL,
    generation VARCHAR(50) DEFAULT NULL,
    series VARCHAR(50) DEFAULT NULL,
    tdp INT DEFAULT NULL,
    cores INT DEFAULT NULL,
    threads INT DEFAULT NULL,
    integrated_graphics TINYINT DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE spec_cpu_cooler (
    product_id INT PRIMARY KEY,
    cooler_type VARCHAR(50) DEFAULT NULL,
    radiator_size INT DEFAULT NULL,
    height_mm INT DEFAULT NULL,
    supported_sockets TEXT DEFAULT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE spec_motherboard (
    product_id INT PRIMARY KEY,
    socket VARCHAR(50) NOT NULL,
    chipset VARCHAR(50) NOT NULL,
    generation VARCHAR(50) DEFAULT NULL,
    form_factor VARCHAR(50) NOT NULL,
    ram_type VARCHAR(20) NOT NULL,
    ram_slots INT DEFAULT 4,
    max_ram_gb INT DEFAULT 128,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE spec_ram (
    product_id INT PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    capacity_gb INT NOT NULL,
    speed INT NOT NULL,
    modules INT DEFAULT 2,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE spec_gpu (
    product_id INT PRIMARY KEY,
    series VARCHAR(50) DEFAULT NULL,
    chip VARCHAR(100) DEFAULT NULL,
    vram_gb INT DEFAULT NULL,
    vram_type VARCHAR(20) DEFAULT NULL,
    tdp INT DEFAULT NULL,
    length_mm INT DEFAULT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE spec_case (
    product_id INT PRIMARY KEY,
    form_factor VARCHAR(50) NOT NULL,
    case_type VARCHAR(50) DEFAULT NULL,
    max_gpu_length_mm INT DEFAULT NULL,
    max_cooler_height_mm INT DEFAULT NULL,
    radiator_support VARCHAR(100) DEFAULT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE spec_psu (
    product_id INT PRIMARY KEY,
    wattage INT NOT NULL,
    efficiency VARCHAR(50) DEFAULT NULL,
    modularity VARCHAR(50) DEFAULT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE spec_storage (
    product_id INT PRIMARY KEY,
    interface VARCHAR(50) DEFAULT NULL,
    capacity_gb INT DEFAULT NULL,
    read_speed VARCHAR(50) DEFAULT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_url TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_review_flags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    reason TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Builds
CREATE TABLE builds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    is_public TINYINT DEFAULT 1,
    total_price DECIMAL(12, 2) DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Build Parts (many-to-many) — each pick binds to a real marketplace listing
-- (products), not the neutral parts catalog, so a build always reflects things
-- that can actually be bought right now.
CREATE TABLE build_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    build_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Build Likes
CREATE TABLE build_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    build_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(build_id, user_id),
    FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Build Comments
CREATE TABLE build_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    build_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- C2C Order Booking & Chat Negotiation Tables
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  buyer_id INT NOT NULL,
  seller_id INT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK(status IN ('pending', 'waiting_verification', 'paid', 'shipped', 'completed', 'cancelled', 'disputed')),
  shipping_address TEXT NOT NULL,
  contact_phone VARCHAR(50) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  shipping_method VARCHAR(50) DEFAULT 'express',
  shipping_type VARCHAR(50) DEFAULT 'parcel',
  courier_name VARCHAR(100) DEFAULT NULL,
  tracking_number VARCHAR(100) DEFAULT NULL,
  pickup_location TEXT DEFAULT NULL,
  proof_of_packing_url TEXT DEFAULT NULL,
  is_risk_accepted TINYINT DEFAULT 0,
  risk_accepted_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  payment_slip_url VARCHAR(255) DEFAULT NULL,
  slip_verified_at DATETIME DEFAULT NULL,
  slip_trans_ref VARCHAR(100) DEFAULT NULL,
  slip_amount DECIMAL(10,2) DEFAULT NULL,
  dispute_status VARCHAR(50) DEFAULT NULL,
  dispute_reason TEXT DEFAULT NULL,
  dispute_created_at DATETIME DEFAULT NULL,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  price INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chat_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT DEFAULT NULL,
  buyer_id INT NOT NULL,
  seller_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  sender_id INT DEFAULT NULL,
  message_type VARCHAR(50) DEFAULT 'text' CHECK(message_type IN ('text', 'system')),
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- New Tables for Advanced User/Authentication features
CREATE TABLE buyer_addresses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT DEFAULT NULL,
    sub_district VARCHAR(255) DEFAULT NULL,
    district VARCHAR(255) NOT NULL,
    province VARCHAR(255) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    is_default TINYINT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wishlists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE otps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email_or_phone VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    expires_at DATETIME NOT NULL,
    is_verified TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status, review_status);
CREATE INDEX idx_product_photos_product ON product_photos(product_id);
CREATE INDEX idx_builds_user ON builds(user_id);
CREATE INDEX idx_builds_public ON builds(is_public);
CREATE INDEX idx_build_parts_build ON build_parts(build_id);
CREATE INDEX idx_build_parts_product ON build_parts(product_id);
CREATE INDEX idx_chipsets_socket ON chipsets(socket_id);
CREATE INDEX idx_build_likes_build ON build_likes(build_id);
CREATE INDEX idx_build_comments_build ON build_comments(build_id);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_chat_rooms_order ON chat_rooms(order_id);
CREATE INDEX idx_chat_rooms_members ON chat_rooms(buyer_id, seller_id);
CREATE INDEX idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX idx_buyer_addresses_user ON buyer_addresses(user_id);
CREATE INDEX idx_wishlists_user ON wishlists(user_id);
CREATE INDEX idx_otps_lookup ON otps(email_or_phone, code);

CREATE TABLE admin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_admin_logs_admin ON admin_logs(admin_id);

CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    seller_id INT NOT NULL,
    rating INT NOT NULL,
    comment TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_order_review (order_id),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_reviews_seller ON reviews(seller_id);

