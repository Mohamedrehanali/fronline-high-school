const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'frontline_high_school_secure_jwt_token_key_2024';

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Authorization header is required.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, message: 'Invalid authorization format. Expected: Bearer <token>' });
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }
}

module.exports = {
  authenticateAdmin,
  JWT_SECRET
};
