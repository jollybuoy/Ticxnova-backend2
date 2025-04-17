const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { poolConnect } = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();

// ✅ CORS Setup
app.use(cors({
  origin: '*', // Replace with frontend URL in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Body parser
app.use(express.json());

// ✅ Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ✅ Health Check
app.get('/', (req, res) => {
  res.status(200).send('🚀 Ticxnova API is up and running!');
});

// ✅ Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.get('/test-ai', (req, res) => res.send("🧠 AI Route Loaded"));

// ✅ AI Chat Route (only if key is present)
if (process.env.OPENAI_API_KEY) {
  try {
const aichatRoutes = require('./routes/aichatRoutes');
app.post('/api/aichat/ask', aichatRoutes);
    console.log("✅ AI Chat route enabled");
  } catch (err) {
    console.error("⚠️ Failed to load AI route:", err.message);
  }
} else {
  console.warn("⚠️ OPENAI_API_KEY not found. Skipping /api/aichat route.");
}

// ✅ 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err.stack || err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ✅ Start server only after DB connection
const PORT = process.env.PORT || 5000;
poolConnect
  .then(() => {
    console.log('✅ Connected to Azure SQL Database');
    app.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ DB Connection Failed:', err.message);
    process.exit(1);
  });
