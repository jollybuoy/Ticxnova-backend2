// ✅ BACKEND (e.g. app.js or server.js)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const { poolConnect } = require('./config/db');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Replace with frontend URL in production
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Socket.IO notifications
io.on('connection', (socket) => {
  console.log('🔌 WebSocket connected');

  // Example broadcast every 30s (for demo/testing only)
  setInterval(() => {
    socket.emit('new-notification', {
      id: Date.now(),
      type: 'assignment',
      message: '🔔 A new ticket has been assigned to you.',
      isRead: false,
      time: new Date().toLocaleTimeString()
    });
  }, 30000);
});

// REST API sample
app.get('/api/notifications', (req, res) => {
  res.json([
    {
      id: 1,
      type: 'note',
      message: '📝 Note added to your ticket.',
      isRead: false,
      time: new Date().toLocaleTimeString()
    }
  ]);
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
