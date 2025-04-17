const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { poolConnect } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const aiChatRoutes = require('./routes/aichatRoutes'); // ✅ Import router

dotenv.config();
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/', (req, res) => {
  res.status(200).send('🚀 Ticxnova API is up and running!');
});

app.get('/test-ai', (req, res) => {
  res.send("🧠 AI Route Loaded");
});

// ✅ Use routers correctly
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/aichat', aiChatRoutes); // ✅ Fix here

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err.stack || err);
  res.status(500).json({ error: 'Internal Server Error' });
});

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
