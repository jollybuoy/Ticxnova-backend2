const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { poolConnect } = require('./config/db');

// Load .env configuration
dotenv.config();

// Initialize Express app
const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json()); // ✅ Parse incoming JSON requests

// ✅ Connect to Azure SQL Database
poolConnect
  .then(() => console.log('✅ Connected to Azure SQL Database'))
  .catch(err => console.error('❌ DB Connection Failed:', err));

// ✅ Register routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const ticketRoutes = require('./routes/ticketRoutes');
app.use('/api/tickets', ticketRoutes);

// Root route (optional)
app.get('/', (req, res) => {
  res.send('🚀 Ticxnova API is running');
});

// ✅ Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
