// PC Builder Pro — Database Initialization (SQLite)
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('=== PC Builder Pro — Database Initialization (SQLite) ===\n');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Created data directory');
}

const dbPath = path.join(dataDir, 'pc_builder.db');
console.log('Database path:', dbPath);

// Remove old database for clean slate
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('🗑️  Removed old database');
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
console.log('✅ Database created');

// Read and execute schema
const schemaPath = path.join(__dirname, '..', '..', '02_database', 'schema.sql');
const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

// Split and execute each statement
const schemaStatements = schemaSQL.split(';').filter(s => s.trim());
for (const stmt of schemaStatements) {
  if (stmt.trim()) {
    try {
      db.exec(stmt);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.error('Schema error:', error.message);
      }
    }
  }
}
console.log('✅ Tables created');

// Read and execute seed data
const seedPath = path.join(__dirname, '..', '..', '02_database', 'seed_data.sql');
const seedSQL = fs.readFileSync(seedPath, 'utf8');

const seedStatements = seedSQL.split(';').filter(s => s.trim());
for (const stmt of seedStatements) {
  if (stmt.trim()) {
    try {
      db.exec(stmt);
    } catch (error) {
      if (!error.message.includes('UNIQUE constraint failed')) {
        console.error('Seed error:', error.message);
      }
    }
  }
}
console.log('✅ Seed data inserted');

// Verify counts
const tables = ['users', 'categories', 'parts', 'builds', 'build_parts', 'build_likes', 'build_comments'];
console.log('\n--- Table Counts ---');
for (const table of tables) {
  const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
  console.log(`  ${table}: ${result.count} rows`);
}

db.close();
console.log('\n✨ Database initialized successfully!');
console.log('   You can now start the server with: node server.js');
