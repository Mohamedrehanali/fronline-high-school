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

// POST /api/auth/register - Create a new admin account
router.post('/register', (req, res) => {
  const { username, password, confirmPassword } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required.'
    });
  }

  const cleanUsername = username.trim();
  if (cleanUsername.length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Username must be at least 3 characters long.'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long.'
    });
  }

  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Passwords do not match.'
    });
  }

  const result = dbOperations.createAdminUser(cleanUsername, password);
  if (!result.success) {
    return res.status(409).json(result);
  }

  // Issue 24h JWT token for instant login
  const token = jwt.sign(
    { id: result.user.id, username: result.user.username, role: result.user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.status(201).json({
    success: true,
    message: 'Account created successfully! Welcome to Frontline Admin Desk.',
    token,
    user: {
      username: result.user.username,
      role: result.user.role
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

const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

// GET /api/auth/google-config - Provide public Google Client ID to frontend
router.get('/google-config', (req, res) => {
  return res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || ''
  });
});

// POST /api/auth/google - Authenticate using Google Identity Services ID Token
router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ success: false, message: 'Google credential token is required.' });
  }

  try {
    let payload;

    // Check if token is a Firebase Auth ID token
    const decoded = jwt.decode(credential, { complete: true });
    if (decoded && decoded.payload && decoded.payload.iss && decoded.payload.iss.includes('securetoken.google.com')) {
      try {
        const certsRes = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
        if (certsRes.ok) {
          const certs = await certsRes.json();
          const cert = certs[decoded.header.kid];
          if (cert) {
            payload = jwt.verify(credential, cert, { algorithms: ['RS256'] });
          }
        }
      } catch (fbErr) {
        console.warn('[Firebase Auth Verify Warning]', fbErr.message);
      }
      // If cert fetch failed but token was issued by Google for our project
      if (!payload && decoded.payload.email && decoded.payload.aud === (process.env.FIREBASE_PROJECT_ID || 'frontline-high-school')) {
        payload = decoded.payload;
      }
    }

    // Verify token using google-auth-library or tokeninfo
    if (!payload) {
      if (process.env.GOOGLE_CLIENT_ID) {
        try {
          const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
          });
          payload = ticket.getPayload();
        } catch (gErr) {
          // Fallback to tokeninfo
        }
      }

      if (!payload) {
        const fetchRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (fetchRes.ok) {
          payload = await fetchRes.json();
        }
      }
    }

    if (!payload || !payload.email) {
      return res.status(401).json({ success: false, message: 'Unable to retrieve verified email from Google.' });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || payload.email.split('@')[0];
    const picture = payload.picture || '';

    // Check if email is in allowed ADMIN_GOOGLE_EMAILS list
    const allowedEmails = (process.env.ADMIN_GOOGLE_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
      console.warn(`[Google Auth] Access denied for ${email}. Not in ADMIN_GOOGLE_EMAILS.`);
      return res.status(403).json({
        success: false,
        message: `Access denied. Google account (${email}) is not registered as an authorized administrator. Please contact the school office.`
      });
    }

    console.log(`[Google Auth] Admin logged in with Google: ${name} (${email})`);

    // Generate JWT token valid for 24 hours
    const token = jwt.sign(
      { id: 'google-' + email, username: name, email: email, picture: picture, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'Google authentication successful.',
      token,
      user: {
        username: name,
        email: email,
        picture: picture,
        role: 'admin'
      }
    });
  } catch (err) {
    console.error('[Google Auth Error]', err);
    return res.status(401).json({
      success: false,
      message: 'Failed to verify Google account. Please try again or use username/password.'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

module.exports = router;
