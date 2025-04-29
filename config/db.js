const sql = require('mssql');
const dotenv = require('dotenv');

// ✅ Load environment variables early
dotenv.config();

// ✅ Log for debugging (remove in production)
console.log("🔍 DB Config - server:", process.env.DB_SERVER);
console.log("🔍 DB Config - user:", process.env.DB_USER);
console.log("🔍 DB Config - database:", process.env.DB_NAME);

// ✅ Construct the SQL config
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER, // e.g., ticxnova.database.windows.net
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: true,               // Required for Azure
    trustServerCertificate: false // Use true for self-signed certs
  }
};

// ✅ Connect using mssql
const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

pool.on('error', err => {
  console.error('❌ SQL connection pool error:', err);
});

module.exports = {
  sql,
  pool,
  poolConnect
};
