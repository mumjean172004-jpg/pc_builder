require('dotenv').config();
const pool = require('../config/database');

(async () => {
  const check = await pool.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviews'"
  );

  if (check.rows.length === 0) {
    await pool.query(`
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
      )
    `);
    console.log('Created table: reviews');
  } else {
    console.log('Already exists: reviews');
  }

  const idx = await pool.query("SHOW INDEX FROM reviews WHERE Key_name = 'idx_reviews_seller'");
  if (idx.rows.length === 0) {
    await pool.query('CREATE INDEX idx_reviews_seller ON reviews(seller_id)');
    console.log('Created index idx_reviews_seller');
  } else {
    console.log('Index idx_reviews_seller already exists');
  }

  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
