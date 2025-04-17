const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { poolConnect } = require('./config/db');
const aichatRoutes = require('./routes/aichatRoutes');


// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// ✅ CORS Configuration
app.use(cors({
  origin: '*', // ✅ In production, replace with specific frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ JSON Middleware
app.use(express.json());

// ✅ Request Logger (optional but useful for Azure logs)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ✅ Database Connection
poolConnect
  .then(() => console.log('✅ Connected to Azure SQL Database'))
  .catch(err => {
    console.error('❌ DB Connection Failed:', err);
    process.exit(1); // Exit on DB failure
  });

// ✅ Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/aichat', aichatRoutes);

// ✅ Health Check (Azure will call this)
app.get('/', (req, res) => {
  res.status(200).send('🚀 Ticxnova API is up and running!');
});

// ✅ 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err.stack || err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ✅ Start Server on Azure Expected PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
