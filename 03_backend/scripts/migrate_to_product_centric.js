// PC Builder Pro — Migration to Product-Centric Architecture
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function migrate() {
  console.log('=== Starting Migration to Product-Centric Architecture ===\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pc_builder',
    port: parseInt(process.env.DB_PORT || '3306'),
    multipleStatements: true
  });

  try {
    console.log('Connected to MySQL successfully.');

    // 1. Temporarily disable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    // 2. Clear old transactions & test data
    console.log('Clearing dirty test tables...');
    const tablesToTruncate = [
      'orders', 'order_items', 'chat_messages', 'chat_rooms',
      'reviews', 'wishlists', 'buyer_addresses',
      'build_comments', 'build_likes', 'build_parts', 'builds',
      'product_review_flags', 'product_photos', 'products'
    ];
    for (const table of tablesToTruncate) {
      try {
        await connection.query(`TRUNCATE TABLE \`${table}\`;`);
      } catch (e) {
        console.log(`Note: Truncate ${table}: ${e.message}`);
      }
    }

    // 3. Remove prebuilt category 'full-pc'
    await connection.query("DELETE FROM categories WHERE slug = 'full-pc';");

    // 4. Update products table schema to be standalone Product-Centric
    console.log('Updating products table schema...');
    
    // Add brand, model, sku to products if they do not exist
    const [cols] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
    `);
    const existingCols = cols.map(c => c.COLUMN_NAME);

    if (!existingCols.includes('brand')) {
      await connection.query('ALTER TABLE products ADD COLUMN brand VARCHAR(100) NOT NULL AFTER category_id;');
    }
    if (!existingCols.includes('model')) {
      await connection.query('ALTER TABLE products ADD COLUMN model VARCHAR(150) NOT NULL AFTER brand;');
    }
    if (!existingCols.includes('sku')) {
      await connection.query('ALTER TABLE products ADD COLUMN sku VARCHAR(64) DEFAULT NULL AFTER total_warranty_days;');
    }

    // 5. Update spec_* tables to use product_id
    console.log('Recreating spec_* tables with product_id...');
    const specTableDefinitions = [
      `CREATE TABLE IF NOT EXISTS spec_cpu (
        product_id INT PRIMARY KEY,
        socket VARCHAR(50) NOT NULL,
        generation VARCHAR(50) DEFAULT NULL,
        series VARCHAR(50) DEFAULT NULL,
        tdp INT DEFAULT NULL,
        cores INT DEFAULT NULL,
        threads INT DEFAULT NULL,
        integrated_graphics TINYINT DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS spec_motherboard (
        product_id INT PRIMARY KEY,
        socket VARCHAR(50) NOT NULL,
        chipset VARCHAR(50) NOT NULL,
        form_factor VARCHAR(50) NOT NULL,
        ram_type VARCHAR(20) NOT NULL,
        ram_slots INT DEFAULT 4,
        max_ram_gb INT DEFAULT 128,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS spec_ram (
        product_id INT PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        capacity_gb INT NOT NULL,
        speed INT NOT NULL,
        modules INT DEFAULT 2,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS spec_gpu (
        product_id INT PRIMARY KEY,
        series VARCHAR(50) DEFAULT NULL,
        chip VARCHAR(100) DEFAULT NULL,
        vram_gb INT DEFAULT NULL,
        vram_type VARCHAR(20) DEFAULT NULL,
        tdp INT DEFAULT NULL,
        length_mm INT DEFAULT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS spec_storage (
        product_id INT PRIMARY KEY,
        interface VARCHAR(50) DEFAULT NULL,
        capacity_gb INT DEFAULT NULL,
        read_speed VARCHAR(50) DEFAULT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS spec_psu (
        product_id INT PRIMARY KEY,
        wattage INT NOT NULL,
        efficiency VARCHAR(50) DEFAULT NULL,
        modularity VARCHAR(50) DEFAULT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS spec_case (
        product_id INT PRIMARY KEY,
        form_factor VARCHAR(50) NOT NULL,
        case_type VARCHAR(50) DEFAULT NULL,
        max_gpu_length_mm INT DEFAULT NULL,
        max_cooler_height_mm INT DEFAULT NULL,
        radiator_support VARCHAR(100) DEFAULT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS spec_cpu_cooler (
        product_id INT PRIMARY KEY,
        cooler_type VARCHAR(50) DEFAULT NULL,
        radiator_size INT DEFAULT NULL,
        height_mm INT DEFAULT NULL,
        supported_sockets TEXT DEFAULT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    ];

    // Drop old spec tables and recreate
    const oldSpecTables = ['spec_cpu', 'spec_motherboard', 'spec_ram', 'spec_gpu', 'spec_storage', 'spec_psu', 'spec_case', 'spec_cpu_cooler'];
    for (const st of oldSpecTables) {
      await connection.query(`DROP TABLE IF EXISTS \`${st}\`;`);
    }
    for (const ddl of specTableDefinitions) {
      await connection.query(ddl);
    }

    // 6. Update build_parts to reference product_id
    console.log('Updating build_parts table...');
    await connection.query('DROP TABLE IF EXISTS build_parts;');
    await connection.query(`
      CREATE TABLE build_parts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        build_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Seed comprehensive master lookup dictionaries
    console.log('Seeding Master Lookup Tables (Sockets, Chipsets, Series, Chips)...');

    // Sockets
    await connection.query('TRUNCATE TABLE sockets;');
    await connection.query(`
      INSERT INTO sockets (id, name, brand) VALUES 
      (1, 'LGA1851', 'Intel'),
      (2, 'LGA1700', 'Intel'),
      (3, 'LGA1200', 'Intel'),
      (4, 'LGA1151', 'Intel'),
      (5, 'AM5', 'AMD'),
      (6, 'AM4', 'AMD');
    `);

    // Chipsets (socket_id FK)
    await connection.query('TRUNCATE TABLE chipsets;');
    await connection.query(`
      INSERT INTO chipsets (socket_id, name) VALUES 
      -- Intel LGA1851 (id 1)
      (1, 'Z890'), (1, 'B860'), (1, 'H810'),
      -- Intel LGA1700 (id 2)
      (2, 'Z790'), (2, 'B760'), (2, 'H770'), (2, 'Z690'), (2, 'B660'), (2, 'H610'),
      -- Intel LGA1200 (id 3)
      (3, 'Z590'), (3, 'B560'), (3, 'H510'),
      -- AMD AM5 (id 5)
      (5, 'X870E'), (5, 'X870'), (5, 'X670E'), (5, 'X670'), (5, 'B650E'), (5, 'B650'), (5, 'A620'),
      -- AMD AM4 (id 6)
      (6, 'X570'), (6, 'B550'), (6, 'A520'), (6, 'B450'), (6, 'A320');
    `);

    // CPU Generations
    await connection.query('TRUNCATE TABLE cpu_generations;');
    await connection.query(`
      INSERT INTO cpu_generations (id, name, brand, socket_id) VALUES 
      (1, 'Core Ultra 200 (Arrow Lake)', 'Intel', 1),
      (2, 'Gen 14 (Raptor Lake Refresh)', 'Intel', 2),
      (3, 'Gen 13 (Raptor Lake)', 'Intel', 2),
      (4, 'Gen 12 (Alder Lake)', 'Intel', 2),
      (5, 'Gen 11 (Rocket Lake)', 'Intel', 3),
      (6, 'Gen 10 (Comet Lake)', 'Intel', 3),
      (7, 'Ryzen 9000 Series (Zen 5)', 'AMD', 5),
      (8, 'Ryzen 8000 Series (Zen 4)', 'AMD', 5),
      (9, 'Ryzen 7000 Series (Zen 4)', 'AMD', 5),
      (10, 'Ryzen 5000 Series (Zen 3)', 'AMD', 6),
      (11, 'Ryzen 3000 Series (Zen 2)', 'AMD', 6);
    `);

    // CPU Models
    await connection.query('DROP TABLE IF EXISTS cpu_models;');
    await connection.query(`
      CREATE TABLE cpu_models (
        id INT AUTO_INCREMENT PRIMARY KEY,
        generation_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        FOREIGN KEY (generation_id) REFERENCES cpu_generations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await connection.query(`
      INSERT INTO cpu_models (generation_id, name) VALUES
      -- Gen 14
      (2, 'Intel Core i9-14900K'), (2, 'Intel Core i7-14700K'), (2, 'Intel Core i5-14600K'), (2, 'Intel Core i5-14400F'),
      -- Gen 13
      (3, 'Intel Core i9-13900K'), (3, 'Intel Core i7-13700K'), (3, 'Intel Core i5-13600K'), (3, 'Intel Core i5-13400F'), (3, 'Intel Core i3-13100'),
      -- Gen 12
      (4, 'Intel Core i9-12900K'), (4, 'Intel Core i7-12700K'), (4, 'Intel Core i5-12600K'), (4, 'Intel Core i5-12400F'),
      -- Ryzen 9000
      (7, 'AMD Ryzen 9 9950X'), (7, 'AMD Ryzen 9 9900X'), (7, 'AMD Ryzen 7 9700X'), (7, 'AMD Ryzen 5 9600X'),
      -- Ryzen 7000
      (9, 'AMD Ryzen 9 7950X3D'), (9, 'AMD Ryzen 7 7800X3D'), (9, 'AMD Ryzen 7 7700X'), (9, 'AMD Ryzen 5 7600X'), (9, 'AMD Ryzen 5 7500F'),
      -- Ryzen 5000
      (10, 'AMD Ryzen 7 5800X3D'), (10, 'AMD Ryzen 7 5700X3D'), (10, 'AMD Ryzen 5 5600X'), (10, 'AMD Ryzen 5 5600'), (10, 'AMD Ryzen 5 5500');
    `);

    // CPU Series
    await connection.query('TRUNCATE TABLE cpu_series;');
    await connection.query(`
      INSERT INTO cpu_series (name) VALUES 
      ('Intel Core i9'), ('Intel Core i7'), ('Intel Core i5'), ('Intel Core i3'),
      ('Intel Core Ultra 9'), ('Intel Core Ultra 7'), ('Intel Core Ultra 5'),
      ('AMD Ryzen 9'), ('AMD Ryzen 7'), ('AMD Ryzen 5'), ('AMD Ryzen 3');
    `);

    // GPU Series & Chips
    await connection.query('TRUNCATE TABLE vga_series;');
    await connection.query(`
      INSERT INTO vga_series (id, name) VALUES 
      (1, 'GeForce RTX 50 Series'),
      (2, 'GeForce RTX 40 Series'),
      (3, 'GeForce RTX 30 Series'),
      (4, 'GeForce RTX 20 Series'),
      (5, 'GeForce GTX 16 Series'),
      (6, 'Radeon RX 7000 Series'),
      (7, 'Radeon RX 6000 Series');
    `);

    await connection.query('TRUNCATE TABLE gpu_chips;');
    await connection.query(`
      INSERT INTO gpu_chips (series_id, name) VALUES 
      -- RTX 40 (id 2)
      (2, 'RTX 4090'), (2, 'RTX 4080 SUPER'), (2, 'RTX 4070 Ti SUPER'), (2, 'RTX 4070 SUPER'), (2, 'RTX 4060 Ti'), (2, 'RTX 4060'),
      -- RTX 30 (id 3)
      (3, 'RTX 3090 Ti'), (3, 'RTX 3080 Ti'), (3, 'RTX 3080'), (3, 'RTX 3070 Ti'), (3, 'RTX 3070'), (3, 'RTX 3060 Ti'), (3, 'RTX 3060'),
      -- RX 7000 (id 6)
      (6, 'RX 7900 XTX'), (6, 'RX 7900 XT'), (6, 'RX 7800 XT'), (6, 'RX 7700 XT'), (6, 'RX 7600 XT'), (6, 'RX 7600'),
      -- RX 6000 (id 7)
      (7, 'RX 6950 XT'), (7, 'RX 6800 XT'), (7, 'RX 6700 XT'), (7, 'RX 6600 XT'), (7, 'RX 6600');
    `);

    // Form factors & RAM types & Brands
    await connection.query('TRUNCATE TABLE form_factors;');
    await connection.query(`
      INSERT INTO form_factors (name, size_level) VALUES ('E-ATX', 4), ('ATX', 3), ('Micro-ATX', 2), ('Mini-ITX', 1);
    `);

    await connection.query('TRUNCATE TABLE ram_types;');
    await connection.query(`
      INSERT INTO ram_types (name) VALUES ('DDR5'), ('DDR4');
    `);

    await connection.query('TRUNCATE TABLE brands;');
    await connection.query(`
      INSERT INTO brands (name) VALUES 
      ('Intel'), ('AMD'), ('NVIDIA'), ('ASUS'), ('MSI'), ('GIGABYTE'), ('ASRock'), 
      ('Corsair'), ('Kingston'), ('G.SKILL'), ('Samsung'), ('Western Digital'), 
      ('Crucial'), ('DeepCool'), ('Lian Li'), ('NZXT'), ('Thermalright'), ('Thermaltake'), ('Seasonic');
    `);

    // 8. Ensure test seller accounts exist
    console.log('Ensuring seller users...');
    const [users] = await connection.query("SELECT id, username FROM users WHERE role = 'seller' OR role = 'admin' LIMIT 5");
    let sellerId = users.length > 0 ? users[0].id : 1;

    // 9. Seed Clean Realistic Sample Products
    console.log('Seeding Clean Sample Products...');

    const sampleProducts = [
      // 1. CPU Intel i7-13700K
      {
        category_slug: 'cpu',
        brand: 'Intel',
        model: 'Core i7-13700K',
        condition: 'used_90',
        price: 10900.00,
        original_price: 14900.00,
        sku: 'SKU-CPU-13700K-01',
        stock_quantity: 2,
        serial_number: 'SN-CPU-INTEL-889921',
        description: 'ซีพียู Intel Core i7-13700K สภาพสวยมาก ใช้งานปกติ ไร้รอย ขาไม่งอ ประกันศูนย์ Synnex ถึงปี 2026',
        photos: ['https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&auto=format&fit=crop'],
        spec: {
          table: 'spec_cpu',
          data: { socket: 'LGA1700', generation: 'Gen 13 (Raptor Lake)', series: 'Intel Core i7', tdp: 125, cores: 16, threads: 24, integrated_graphics: 1 }
        }
      },
      // 2. CPU AMD Ryzen 7 7800X3D
      {
        category_slug: 'cpu',
        brand: 'AMD',
        model: 'Ryzen 7 7800X3D',
        condition: 'used_90',
        price: 13500.00,
        original_price: 16900.00,
        sku: 'SKU-CPU-7800X3D-02',
        stock_quantity: 1,
        serial_number: 'SN-CPU-AMD-778812',
        description: 'ซีพียูเกมมิ่งตัวท็อป AMD Ryzen 7 7800X3D กล่องครบ ประกันศูนย์ S-Trek 2 ปี+',
        photos: ['https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=600&auto=format&fit=crop'],
        spec: {
          table: 'spec_cpu',
          data: { socket: 'AM5', generation: 'Ryzen 7000 Series (Zen 4)', series: 'AMD Ryzen 7', tdp: 120, cores: 8, threads: 16, integrated_graphics: 1 }
        }
      },
      // 3. Motherboard ASUS ROG STRIX B760-F GAMING WIFI
      {
        category_slug: 'motherboard',
        brand: 'ASUS',
        model: 'ROG STRIX B760-F GAMING WIFI',
        condition: 'used_90',
        price: 6800.00,
        original_price: 8990.00,
        sku: 'SKU-MB-B760F-01',
        stock_quantity: 1,
        serial_number: 'SN-MB-ASUS-991244',
        description: 'เมนบอร์ด ASUS ROG STRIX B760-F DDR5 สภาพ 95% อุปกรณ์ครบกล่อง เสาไวไฟครบ',
        photos: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop'],
        spec: {
          table: 'spec_motherboard',
          data: { socket: 'LGA1700', chipset: 'B760', form_factor: 'ATX', ram_type: 'DDR5', ram_slots: 4, max_ram_gb: 192 }
        }
      },
      // 4. Motherboard MSI MAG B650 TOMAHAWK WIFI
      {
        category_slug: 'motherboard',
        brand: 'MSI',
        model: 'MAG B650 TOMAHAWK WIFI',
        condition: 'used_90',
        price: 6200.00,
        original_price: 7990.00,
        sku: 'SKU-MB-B650T-02',
        stock_quantity: 2,
        serial_number: 'SN-MB-MSI-667788',
        description: 'เมนบอร์ด MSI MAG B650 Tomahawk AM5 รองรับ Ryzen 7000/8000/9000 บอร์ดหนาทนทาน VRM เย็น',
        photos: ['https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=600&auto=format&fit=crop'],
        spec: {
          table: 'spec_motherboard',
          data: { socket: 'AM5', chipset: 'B650', form_factor: 'ATX', ram_type: 'DDR5', ram_slots: 4, max_ram_gb: 192 }
        }
      },
      // 5. GPU ASUS TUF Gaming GeForce RTX 4070 Ti SUPER 16GB
      {
        category_slug: 'gpu',
        brand: 'ASUS',
        model: 'TUF Gaming RTX 4070 Ti SUPER 16GB',
        condition: 'used_90',
        price: 26900.00,
        original_price: 33500.00,
        sku: 'SKU-GPU-4070TIS-01',
        stock_quantity: 1,
        serial_number: 'SN-GPU-ASUS-443322',
        description: 'การ์ดจอ ASUS TUF RTX 4070 Ti SUPER 16GB GDDR6X ใช้งานน้อยมาก เล่นเกมปรับสุดลื่นๆ ไม่เคยขุด',
        photos: ['https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop'],
        spec: {
          table: 'spec_gpu',
          data: { series: 'GeForce RTX 40 Series', chip: 'RTX 4070 Ti SUPER', vram_gb: 16, vram_type: 'GDDR6X', tdp: 285, length_mm: 305 }
        }
      },
      // 6. RAM Corsair Vengeance RGB 32GB (16GBx2) DDR5 6000MHz
      {
        category_slug: 'ram',
        brand: 'Corsair',
        model: 'Vengeance RGB 32GB (2x16GB) DDR5 6000MHz',
        condition: 'new',
        price: 4290.00,
        original_price: 4890.00,
        sku: 'SKU-RAM-COR-DDR5-01',
        stock_quantity: 4,
        serial_number: 'SN-RAM-COR-112233',
        description: 'แรม Corsair Vengeance DDR5 32GB บัส 6000MHz CL36 ของใหม่มือหนึ่ง ประกันศูนย์ Lifetime',
        photos: ['https://images.unsplash.com/photo-1562976540-1502c2145186?w=600&auto=format&fit=crop'],
        spec: {
          table: 'spec_ram',
          data: { type: 'DDR5', capacity_gb: 32, speed: 6000, modules: 2 }
        }
      },
      // 7. Storage Samsung 990 PRO 1TB PCIe 4.0 NVMe
      {
        category_slug: 'storage',
        brand: 'Samsung',
        model: '990 PRO 1TB PCIe 4.0 NVMe M.2',
        condition: 'used_90',
        price: 3190.00,
        original_price: 4290.00,
        sku: 'SKU-SSD-SAM-990P-01',
        stock_quantity: 3,
        serial_number: 'SN-SSD-SAM-990011',
        description: 'SSD Samsung 990 PRO 1TB สุขภาพ 100% อ่านเขียนเร็ว 7450MB/s ประกัน 4 ปี+',
        photos: ['https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&auto=format&fit=crop'],
        spec: {
          table: 'spec_storage',
          data: { interface: 'NVMe PCIe 4.0', capacity_gb: 1000, read_speed: '7450MB/s' }
        }
      },
      // 8. PSU Corsair RM850e 850W 80+ Gold
      {
        category_slug: 'psu',
        brand: 'Corsair',
        model: 'RM850e 850W 80+ Gold Fully Modular',
        condition: 'used_90',
        price: 3450.00,
        original_price: 4490.00,
        sku: 'SKU-PSU-COR-850E-01',
        stock_quantity: 2,
        serial_number: 'SN-PSU-COR-885544',
        description: 'เพาเวอร์ซัพพลาย Corsair RM850e 850W 80 Plus Gold ถอดสายได้ครบทุกเส้น สาย ATX 3.0 PCIe 5.0 พร้อมใช้',
        photos: ['https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=600&auto=format&fit=crop'],
        spec: {
          table: 'spec_psu',
          data: { wattage: 850, efficiency: '80 Plus Gold', modularity: 'Full' }
        }
      },
      // 9. Case Lian Li O11 Dynamic EVO
      {
        category_slug: 'case',
        brand: 'Lian Li',
        model: 'O11 Dynamic EVO White',
        condition: 'used_90',
        price: 3900.00,
        original_price: 5490.00,
        sku: 'SKU-CASE-LL-O11D-01',
        stock_quantity: 1,
        serial_number: 'SN-CASE-LL-554433',
        description: 'เคส Lian Li O11D EVO สีขาว กระจกใส ไร้รอย อุปกรณ์ครบกล่อง',
        photos: ['https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop'],
        spec: {
          table: 'spec_case',
          data: { form_factor: 'E-ATX', case_type: 'Mid Tower', max_gpu_length_mm: 422, max_cooler_height_mm: 167, radiator_support: '360mm' }
        }
      },
      // 10. CPU Cooler DeepCool LT720 360mm AIO
      {
        category_slug: 'cpu-cooler',
        brand: 'DeepCool',
        model: 'LT720 360mm Liquid Cooler',
        condition: 'used_90',
        price: 2850.00,
        original_price: 3990.00,
        sku: 'SKU-CLR-DC-LT720-01',
        stock_quantity: 2,
        serial_number: 'SN-CLR-DC-332211',
        description: 'ชุดน้ำปิด 3 ตอน DeepCool LT720 360mm ไฟ ARGB สวยงาม ระบายความร้อนดีเยี่ยม ขาครบ LGA1700/AM5',
        photos: ['https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600&auto=format&fit=crop'],
        spec: {
          table: 'spec_cpu_cooler',
          data: { cooler_type: 'Liquid 360mm', radiator_size: 360, height_mm: 52, supported_sockets: 'LGA1700,LGA1200,LGA1151,AM5,AM4' }
        }
      }
    ];

    const [catRows] = await connection.query('SELECT id, slug FROM categories');
    const catMap = Object.fromEntries(catRows.map(c => [c.slug, c.id]));

    for (const item of sampleProducts) {
      const categoryId = catMap[item.category_slug];
      if (!categoryId) continue;

      const [res] = await connection.query(
        `INSERT INTO products (
          seller_id, category_id, brand, model, \`condition\`, remaining_warranty_months,
          warranty_type, warranty_years, warranty_months, warranty_days,
          price, original_price, sku, stock_quantity, serial_number, description,
          status, review_status, suspicious_score, suspicious_reasons,
          proof_image_url, sn_image_url, allow_hand_pickup, allow_express, pickup_location
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sellerId,
          categoryId,
          item.brand,
          item.model,
          item.condition,
          24,
          'manufacturer_warranty',
          2, 0, 0,
          item.price,
          item.original_price,
          item.sku,
          item.stock_quantity,
          item.serial_number,
          item.description,
          'active',
          'approved',
          0,
          '[]',
          item.photos[0],
          item.photos[0],
          1, 1, 'กรุงเทพฯ พระราม 9'
        ]
      );

      const productId = res.insertId;

      // Add photo
      for (let i = 0; i < item.photos.length; i++) {
        await connection.query(
          'INSERT INTO product_photos (product_id, image_url, display_order) VALUES (?, ?, ?)',
          [productId, item.photos[i], i]
        );
      }

      // Add spec
      if (item.spec && item.spec.table && item.spec.data) {
        const specFields = Object.keys(item.spec.data);
        const specVals = Object.values(item.spec.data);
        const placeholders = specFields.map(() => '?').join(', ');
        const colsSql = specFields.map(f => `\`${f}\``).join(', ');

        await connection.query(
          `INSERT INTO \`${item.spec.table}\` (product_id, ${colsSql}) VALUES (?, ${placeholders})`,
          [productId, ...specVals]
        );
      }
    }

    // 10. Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('\n✨ Database Migration to Product-Centric Architecture Completed Successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
