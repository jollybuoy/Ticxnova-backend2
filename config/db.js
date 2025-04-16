const sql = require('mssql');
const dotenv = require('dotenv');
dotenv.config();

// ✅ Use correct environment variable keys
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // 🔁 Rename from DB_PASS to DB_PASSWORD
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE, // 🔁 Rename from DB_NAME to DB_DATABASE
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: true, // ✅ Required for Azure
    trustServerCertificate: false
  }
};

// ✅ Connect to the database
const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

// ✅ Handle errors
pool.on('error', err => {
  console.error('❌ SQL connection pool error:', err);
});

module.exports = {
  sql,
  pool,
  poolConnect
};
