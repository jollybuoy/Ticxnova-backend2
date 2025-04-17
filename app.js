const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { poolConnect } = require('./config/db');

// ✅ Load environment variables
dotenv.config();

// ✅ Initialize Express app
const app = express();

// ✅ CORS Configuration
app.use(cors({
  origin: '*', // 🔐 Replace with actual frontend URL in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ JSON Middleware
app.use(express.json());

// ✅ Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ✅ Connect to DB
poolConnect
  .then(() => console.log('✅ Connected to Azure SQL Database'))
  .catch(err => {
    console.error('❌ DB Connection Failed:', err);
    process.exit(1);
  });

// ✅ Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));

// ✅ Load AI Chat only if API key is available
if (process.env.OPENAI_API_KEY) {
  app.use('/aichat', require('./routes/aichatRoutes'));
  console.log('✅ AI Chat route enabled');
} else {
  console.warn('⚠️ OPENAI_API_KEY missing, AI Chatbot route is disabled');
}

// ✅ Health Check
app.get('/', (req, res) => {
  res.status(200).send('🚀 Ticxnova API is up and running!');
});

// ✅ 404 Fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err.stack || err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
