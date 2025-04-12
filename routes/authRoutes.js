const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { poolConnect, sql, pool } = require('../config/db');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  await poolConnect;
  const { name, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const request = pool.request();
    await request
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('passwordHash', sql.NVarChar, hashedPassword)
      .input('role', sql.NVarChar, role || 'User')
      .query(`
        INSERT INTO Users (name, email, passwordHash, role)
        VALUES (@name, @email, @passwordHash, @role)
      `);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('❌ Registration Error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }  
});

// Login
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
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
