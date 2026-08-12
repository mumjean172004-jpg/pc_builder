-- ============================================
-- PC Builder Pro — Database Schema (SQLite)
-- ============================================

DROP TABLE IF EXISTS build_comments;
DROP TABLE IF EXISTS build_likes;
DROP TABLE IF EXISTS build_parts;
DROP TABLE IF EXISTS builds;
DROP TABLE IF EXISTS product_review_flags;
DROP TABLE IF EXISTS product_photos;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS parts;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- Users
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar_url TEXT DEFAULT NULL,
    phone TEXT UNIQUE DEFAULT NULL,
    google_id TEXT UNIQUE DEFAULT NULL,
    facebook_id TEXT UNIQUE DEFAULT NULL,
    active_role TEXT CHECK(active_role IN ('buyer', 'seller')) DEFAULT 'buyer',
    shop_name TEXT DEFAULT NULL,
    seller_avatar_url TEXT DEFAULT NULL,
    seller_address_province TEXT DEFAULT NULL,
    seller_address_district TEXT DEFAULT NULL,
    seller_phone TEXT DEFAULT NULL,
    is_seller_verified INTEGER DEFAULT 0,
    seller_id_card TEXT DEFAULT NULL,
    seller_full_name TEXT DEFAULT NULL,
    seller_bank_name TEXT DEFAULT NULL,
    seller_bank_account TEXT DEFAULT NULL,
    seller_bank_account_name TEXT DEFAULT NULL,
    seller_rating REAL DEFAULT 5.0,
    sales_count INTEGER DEFAULT 0,
    has_seller_badge INTEGER DEFAULT 0,
    is_phone_verified INTEGER DEFAULT 0,
    is_email_verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Part Categories
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT DEFAULT 'microchip',
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PC Parts (specs stored as JSON text)
CREATE TABLE parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    brand TEXT NOT NULL,
    model TEXT DEFAULT NULL,
    specs TEXT NOT NULL DEFAULT '{}',
    price REAL NOT NULL DEFAULT 0,
    image_url TEXT DEFAULT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Marketplace Product Listings
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    part_id INTEGER REFERENCES parts(id),
    condition TEXT NOT NULL CHECK (condition IN ('new', 'used_90', 'used_80', 'used_70')),
    remaining_warranty_months INTEGER NOT NULL DEFAULT 0,
    price REAL NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 1,
    serial_number TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'paused')),
    review_status TEXT NOT NULL DEFAULT 'approved' CHECK (review_status IN ('approved', 'pending_review', 'rejected')),
    suspicious_score INTEGER NOT NULL DEFAULT 0,
    suspicious_reasons TEXT NOT NULL DEFAULT '[]',
    proof_image_url TEXT DEFAULT NULL,
    sn_image_url TEXT DEFAULT NULL,
    is_prebuilt_set INTEGER DEFAULT 0,
    prebuilt_specs TEXT DEFAULT NULL,
    prebuilt_components TEXT DEFAULT NULL,
    allow_hand_pickup INTEGER DEFAULT 1,
    allow_cod INTEGER DEFAULT 0,
    allow_express INTEGER DEFAULT 1,
    pickup_location TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE product_review_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Builds
CREATE TABLE builds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    is_public INTEGER DEFAULT 1,
    total_price REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Build Parts (many-to-many)
CREATE TABLE build_parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    build_id INTEGER NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    part_id INTEGER NOT NULL REFERENCES parts(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    UNIQUE(build_id, part_id)
);

-- Build Likes
CREATE TABLE build_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    build_id INTEGER NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(build_id, user_id)
);

-- Build Comments
CREATE TABLE build_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    build_id INTEGER NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_parts_category ON parts(category_id);
CREATE INDEX idx_parts_brand ON parts(brand);
CREATE INDEX idx_parts_price ON parts(price);
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_part ON products(part_id);
CREATE INDEX idx_products_status ON products(status, review_status);
CREATE INDEX idx_product_photos_product ON product_photos(product_id);
CREATE INDEX idx_builds_user ON builds(user_id);
CREATE INDEX idx_builds_public ON builds(is_public);
CREATE INDEX idx_build_parts_build ON build_parts(build_id);
CREATE INDEX idx_build_likes_build ON build_likes(build_id);
CREATE INDEX idx_build_comments_build ON build_comments(build_id);

-- C2C Order Booking & Chat Negotiation Tables
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK(status IN ('pending', 'paid', 'shipped', 'completed', 'cancelled')) DEFAULT 'pending',
  shipping_address TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  total_price INTEGER NOT NULL,
  shipping_type TEXT DEFAULT 'parcel',
  shipping_method TEXT DEFAULT 'express',
  courier_name TEXT DEFAULT NULL,
  tracking_number TEXT DEFAULT NULL,
  pickup_location TEXT DEFAULT NULL,
  proof_of_packing_url TEXT DEFAULT NULL,
  payment_slip_url TEXT DEFAULT NULL,
  slip_verified_at DATETIME DEFAULT NULL,
  slip_trans_ref TEXT DEFAULT NULL,
  slip_amount REAL DEFAULT NULL,
  dispute_status TEXT DEFAULT NULL,
  dispute_reason TEXT DEFAULT NULL,
  dispute_created_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  price INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id INTEGER,
  message_type TEXT CHECK(message_type IN ('text', 'system')) DEFAULT 'text',
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_order ON chat_rooms(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_members ON chat_rooms(buyer_id, seller_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);

-- New Tables for Advanced User/Authentication features
CREATE TABLE IF NOT EXISTS buyer_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT DEFAULT NULL,
    district TEXT NOT NULL,
    province TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    is_default INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wishlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_or_phone TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    is_verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_buyer_addresses_user ON buyer_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_otps_lookup ON otps(email_or_phone, code);

