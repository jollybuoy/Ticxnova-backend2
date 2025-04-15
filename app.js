const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { poolConnect } = require('./config/db');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// ✅ Middleware
app.use(cors({
  origin: '*', // You can restrict this to frontend URL if needed
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Optional: Log each request (for dev or debugging)
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// ✅ Connect to Azure SQL
poolConnect
  .then(() => console.log('✅ Connected to Azure SQL Database'))
  .catch(err => console.error('❌ DB Connection Failed:', err));

// ✅ Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const ticketRoutes = require('./routes/ticketRoutes');
app.use('/api/tickets', ticketRoutes);

// Optional: Health check route
app.get('/', (req, res) => {
  res.send('🚀 Ticxnova API is up and running!');
});

// ✅ 404 - Not Found Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ✅ Global Error Handler (catch all)
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
