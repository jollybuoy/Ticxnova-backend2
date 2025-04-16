const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
// const { poolConnect } = require('./config/db'); // 🔴 Temporarily disabled

// ✅ Load environment variables
dotenv.config();

// ✅ Initialize Express app
const app = express();

// ✅ CORS Configuration
app.use(cors({
  origin: '*', // In production, restrict this
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ✅ Health check to verify Azure container is running
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// ✅ DB Connection — 🔴 Disabled for now to prevent container crash
/*
poolConnect
  .then(() => console.log('✅ Connected to Azure SQL Database'))
  .catch(err => {
    console.error('❌ DB Connection Failed:', err);
    process.exit(1);
  });
*/

// ✅ Routes — ⚠️ Only include if they don’t depend on DB yet
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/tickets', require('./routes/ticketRoutes'));
// app.use('/api/aichat', require('./routes/aichatRoutes'));

// ✅ Default route
app.get('/', (req, res) => {
  res.status(200).send('🚀 Ticxnova API is up and running!');
});

// ✅ 404 Not Found
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ✅ Error Handling
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err.stack || err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
