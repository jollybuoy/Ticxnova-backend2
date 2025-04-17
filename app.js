const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { poolConnect } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const askAI = require('./routes/aichatRoutes'); // ⬅️ Direct AI route handler

// ✅ Load environment variables
dotenv.config();

// ✅ Initialize Express app
const app = express();

// ✅ CORS Configuration
app.use(cors({
  origin: '*', // In production, use specific frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ✅ Health Check Route
app.get('/', (req, res) => {
  res.status(200).send('🚀 Ticxnova API is up and running!');
});

// ✅ Test Route for AI
app.get('/test-ai', (req, res) => {
  res.send("🧠 AI Route Loaded");
});

// ✅ API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/aichat', askAI); // ✅ Use as a router

// ✅ 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err.stack || err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ✅ Start Server after DB connects
const PORT = process.env.PORT || 5000;

poolConnect
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ DB Connection Failed:', err);
    process.exit(1);
  });
