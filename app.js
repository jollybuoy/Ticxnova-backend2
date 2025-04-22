const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { poolConnect } = require('./config/db');

dotenv.config();
const app = express();

// ✅ Define your CORS options
const corsOptions = {
  origin: 'https://yellow-dune-0ed10881e.6.azurestaticapps.net',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// ✅ Apply CORS once globally
app.use(cors(corsOptions));

// ✅ Body parser
app.use(express.json());

// ✅ Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ✅ Database connection
poolConnect
  .then(() => console.log('✅ Connected to Azure SQL Database'))
  .catch(err => {
    console.error('❌ DB Connection Failed:', err);
    process.exit(1);
  });

// ✅ Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));

// ✅ Health check
app.get('/', (req, res) => {
  res.status(200).send('🚀 Ticxnova API is up and running!');
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err.stack || err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ✅ Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
