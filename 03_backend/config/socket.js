const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const pool = require('./database');

let io = null;

module.exports = {
  init(server) {
    io = new Server(server, {
      cors: {
        origin: '*', // Allow all origins for dev
        methods: ['GET', 'POST']
      }
    });

    // Authentication Middleware
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }
      
      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Authentication error: Invalid token'));
      }
      
      socket.userId = decoded.userId;
      next();
    });

    // Connection Events
    io.on('connection', (socket) => {
      console.log(`🔌 User connected to Socket: User ID ${socket.userId} (Socket ID: ${socket.id})`);

      socket.on('join_room', async ({ roomId }) => {
        try {
          const roomResult = await pool.query(
            'SELECT buyer_id, seller_id FROM chat_rooms WHERE id = ?',
            [roomId]
          );

          if (!roomResult.rows?.length) {
            socket.emit('error_message', { error: 'ห้องเจรจาไม่มีอยู่ในระบบ' });
            return;
          }

          const room = roomResult.rows[0];
          if (room.buyer_id !== socket.userId && room.seller_id !== socket.userId) {
            socket.emit('error_message', { error: 'คุณไม่มีสิทธิ์เข้าถึงห้องเจรจานี้' });
            return;
          }

          const roomName = `room_${roomId}`;
          socket.join(roomName);
          console.log(`🚪 User ${socket.userId} joined room: ${roomName}`);
        } catch (err) {
          console.error('Socket join_room error:', err.message);
          socket.emit('error_message', { error: 'เกิดข้อผิดพลาดในการเข้าห้องเจรจา' });
        }
      });

      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected from Socket: User ID ${socket.userId} (Socket ID: ${socket.id})`);
      });
    });

    return io;
  },

  getIO() {
    if (!io) {
      throw new Error('Socket.io is not initialized! Call init(server) first.');
    }
    return io;
  }
};
