// PC Builder Pro — Express Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const pool = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const partsRoutes = require('./routes/partsRoutes');
const buildsRoutes = require('./routes/buildsRoutes');
const productRoutes = require('./routes/productRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const http = require('http');
const socket = require('./config/socket');

const app = express();
const server = http.createServer(app);

// Trust the platform's reverse proxy (Railway/etc.) so express-rate-limit
// and req.ip resolve the real client IP from X-Forwarded-For correctly.
app.set('trust proxy', 1);

// Initialize WebSockets
socket.init(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Test database connection
pool.query('SELECT 1 as test').then(() => {
  console.log('✅ Database connected successfully');
}).catch((err) => {
  console.error('❌ Database connection error:', err.message);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/builds', buildsRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// Static uploads serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Image Upload Endpoint
const upload = require('./middleware/upload');
const { authMiddleware } = require('./middleware/auth');
app.post('/api/upload', authMiddleware, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'กรุณาเลือกไฟล์ภาพที่ต้องการอัปโหลด' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(201).json({ url: fileUrl });
  });
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', '04_frontend')));

// API health check + version info
const { version: APP_VERSION } = require('./package.json');
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'PC Builder Pro API is running',
    version: APP_VERSION,
    env: process.env.NODE_ENV || 'development'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`\n🚀 PC Builder Pro server running on http://0.0.0.0:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Frontend: http://localhost:${PORT}/index.html\n`);
});
