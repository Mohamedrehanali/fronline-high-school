const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { dbOperations } = require('../db');
const { authenticateAdmin, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required.'
    });
  }

  const admin = dbOperations.verifyAdmin(username.trim(), password);
  if (!admin) {
    return res.status(401).json({
      success: false,
      message: 'Invalid username or password.'
    });
  }

  // Generate JWT token valid for 24 hours
  const token = jwt.sign(
    { id: admin.id, username: admin.username, role: admin.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.json({
    success: true,
    message: 'Login successful.',
    token,
    user: {
      username: admin.username,
      role: admin.role
    }
  });
});

// GET /api/auth/check
router.get('/check', authenticateAdmin, (req, res) => {
  return res.json({
    success: true,
    user: req.admin
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

module.exports = router;
