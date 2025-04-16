const sql = require('mssql');
const dotenv = require('dotenv');
dotenv.config();

// ✅ Environment validation
const requiredEnv = ['DB_USER', 'DB_PASS', 'DB_SERVER', 'DB_NAME'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
}

// ✅ SQL Config for Azure
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

// ✅ Connection Pool
const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect()
  .then(() => console.log('✅ Connected to Azure SQL Database'))
  .catch((err) => {
    console.error('❌ Failed to connect to SQL DB:', err);
    process.exit(1); // stop app if DB fails
  });

// ✅ Handle connection pool error events
pool.on('error', err => {
  console.error('❌ SQL connection pool error:', err);
});

module.exports = {
  sql,
  pool,
  poolConnect
};
