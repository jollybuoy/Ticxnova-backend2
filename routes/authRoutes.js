const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { poolConnect, sql, pool } = require('../config/db');

const router = express.Router();

// ✨ Register Route with Domain Logic
router.post('/register', async (req, res) => {
  await poolConnect;
  let { name, email, password, role } = req.body;

  try {
    name = name?.trim();
    email = email?.trim().toLowerCase();
    role = role || 'User';

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // 🔍 Check if user already exists
    const existingUser = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id FROM Users WHERE email = @email');

    if (existingUser.recordset.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const domain = email.split('@')[1];

    await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('passwordHash', sql.NVarChar, hashedPassword)
      .input('role', sql.NVarChar, role)
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

// 🔐 Login Route (Updated to include name in token)
router.post('/login', async (req, res) => {
  await poolConnect;
  const { email, password } = req.body;

  try {
    const request = pool.request();
    request.input('email', sql.NVarChar, email.trim().toLowerCase());

    const result = await request.query('SELECT * FROM Users WHERE email = @email');
    const user = result.recordset[0];

    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        domain: user.domain
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

module.exports = router;
