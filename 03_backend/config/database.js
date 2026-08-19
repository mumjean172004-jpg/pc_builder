// PC Builder Pro — MySQL Connection Pool Configuration
require('dotenv').config();
const mysql = require('mysql2/promise');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pc_builder',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log(`📡 Connecting to MySQL database "${poolConfig.database}" at ${poolConfig.host}:${poolConfig.port}...`);
const mysqlPool = mysql.createPool(poolConfig);

const pool = {
  async query(text, params = []) {
    // In MySQL, placeholders are '?', which are already used in our controllers.
    const [results] = await mysqlPool.query(text, params);
    
    if (Array.isArray(results)) {
      return {
        rows: results,
        rowCount: results.length
      };
    } else {
      return {
        rows: [],
        rowCount: results.affectedRows,
        insertId: results.insertId,
        lastInsertRowid: results.insertId // For backward compatibility with SQLite controllers
      };
    }
  },

  async connect() {
    const connection = await mysqlPool.getConnection();
    return {
      query: async (text, params = []) => {
        const [results] = await connection.query(text, params);
        if (Array.isArray(results)) {
          return { rows: results, rowCount: results.length };
        } else {
          return {
            rows: [],
            rowCount: results.affectedRows,
            insertId: results.insertId,
            lastInsertRowid: results.insertId
          };
        }
      },
      release: () => connection.release()
    };
  }
};

// Check DB Connection and ensure required columns exist
async function ensureSchemaColumns() {
  const columnsToAdd = [
    // orders columns
    { table: 'orders', column: 'courier_name', type: 'VARCHAR(100) DEFAULT NULL' },
    { table: 'orders', column: 'tracking_number', type: 'VARCHAR(100) DEFAULT NULL' },
    { table: 'orders', column: 'packing_proof_url', type: 'TEXT DEFAULT NULL' },
    { table: 'orders', column: 'proof_of_packing_url', type: 'TEXT DEFAULT NULL' },
    { table: 'orders', column: 'payment_slip_url', type: 'VARCHAR(255) DEFAULT NULL' },
    { table: 'orders', column: 'slip_verified_at', type: 'DATETIME DEFAULT NULL' },
    { table: 'orders', column: 'slip_trans_ref', type: 'VARCHAR(100) DEFAULT NULL' },
    { table: 'orders', column: 'slip_amount', type: 'DECIMAL(10,2) DEFAULT NULL' },
    { table: 'orders', column: 'dispute_status', type: 'VARCHAR(50) DEFAULT NULL' },
    { table: 'orders', column: 'dispute_reason', type: 'TEXT DEFAULT NULL' },
    { table: 'orders', column: 'dispute_created_at', type: 'DATETIME DEFAULT NULL' },
    { table: 'orders', column: 'shipping_type', type: 'VARCHAR(50) DEFAULT "parcel"' },
    { table: 'orders', column: 'shipping_method', type: 'VARCHAR(50) DEFAULT "express"' },
    { table: 'orders', column: 'pickup_location', type: 'TEXT DEFAULT NULL' },
    { table: 'orders', column: 'is_risk_accepted', type: 'TINYINT DEFAULT 0' },
    { table: 'orders', column: 'risk_accepted_at', type: 'DATETIME DEFAULT NULL' },

    // users columns (seller/KYC fields live in `seller_profiles` as of Round 3 —
    // do NOT add them back here, or every server boot resurrects the dropped
    // duplicate columns)
    { table: 'users', column: 'google_id', type: 'VARCHAR(255) DEFAULT NULL' },
    { table: 'users', column: 'facebook_id', type: 'VARCHAR(255) DEFAULT NULL' },
    { table: 'users', column: 'is_email_verified', type: 'TINYINT DEFAULT 0' },
    { table: 'users', column: 'is_phone_verified', type: 'TINYINT DEFAULT 0' },

    // products columns
    { table: 'products', column: 'serial_number', type: 'VARCHAR(100) DEFAULT NULL' },
    { table: 'products', column: 'proof_image_url', type: 'TEXT DEFAULT NULL' },
    { table: 'products', column: 'sn_image_url', type: 'TEXT DEFAULT NULL' },
    { table: 'products', column: 'is_pop_verified', type: 'TINYINT DEFAULT 0' }
  ];

  for (const item of columnsToAdd) {
    try {
      const checkSql = `
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = ? 
          AND COLUMN_NAME = ?
      `;
      const res = await pool.query(checkSql, [item.table, item.column]);
      if (!res.rows || res.rows.length === 0) {
        await pool.query(`ALTER TABLE \`${item.table}\` ADD COLUMN \`${item.column}\` ${item.type}`);
        console.log(`✨ Added missing column: ${item.table}.${item.column}`);
      }
    } catch (e) {
      // Ignore if table doesn't exist yet or other non-fatal errors
    }
  }
}

pool.query('SELECT 1 as test')
  .then(async () => {
    console.log('✅ MySQL Database connected successfully!');
    await ensureSchemaColumns();
  })
  .catch(err => console.error('❌ MySQL Connection error:', err.message));

module.exports = pool;
