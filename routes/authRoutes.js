const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { poolConnect, sql, pool } = require('../config/db');

const router = express.Router();

// ✨ Register Route with Domain Logic
router.post('/register', async (req, res) => {
  await poolConnect;
  const { name, email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const domain = email.split('@')[1]; // 🔥 Extract domain

    const request = pool.request();
    await request
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('passwordHash', sql.NVarChar, hashedPassword)
      .input('role', sql.NVarChar, role || 'User')
      .input('domain', sql.NVarChar, domain)
      .query(`
        INSERT INTO Users (name, email, passwordHash, role, domain)
        VALUES (@name, @email, @passwordHash, @role, @domain)
      `);

    res.status(201).json({ message: '✅ User registered successfully' });
  } catch (err) {
    console.error('❌ Registration Error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 🔐 Login Route
router.post('/login', async (req, res) => {
  await poolConnect;
  const { email, password } = req.body;

  try {
    const request = pool.request();
    request.input('email', sql.NVarChar, email);

    const result = await request.query('SELECT * FROM Users WHERE email = @email');
    const user = result.recordset[0];

    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        domain: user.domain,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({ token });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 🔐 Microsoft Login Route (auto-register)
router.post('/microsoft-login', async (req, res) => {
  await poolConnect;
  const { name, email } = req.body;
  const domain = email.split('@')[1];

  try {
    const checkUser = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM Users WHERE email = @email');

    let user = checkUser.recordset[0];

    // 🔄 Auto-register if user does not exist
    if (!user) {
      const insertUser = await pool.request()
        .input('name', sql.NVarChar, name || 'Microsoft User')
        .input('email', sql.NVarChar, email)
        .input('role', sql.NVarChar, 'User')
        .input('domain', sql.NVarChar, domain)
        .query(`
          INSERT INTO Users (name, email, role, domain)
          OUTPUT INSERTED.*
          VALUES (@name, @email, @role, @domain)
        `);

      user = insertUser.recordset[0];
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        domain: user.domain,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({ token });
  } catch (err) {
    console.error("❌ Microsoft login error:", err);
    res.status(500).json({ error: "Microsoft login failed" });
  }
});

module.exports = router;
