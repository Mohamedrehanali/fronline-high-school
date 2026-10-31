require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

// Initialize database
require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable trust proxy for cloud hosting (Render, Heroku, etc.)
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    school: 'Frontline High School',
    location: 'Sheshabgutta, Mahbubnagar',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/enquiries', require('./routes/enquiries'));

// Serve Admin Dashboard at /admin
const adminDir = path.join(__dirname, '..', 'admin');
app.use('/admin', express.static(adminDir));

// Serve Public School Website at /
const websiteDir = path.join(__dirname, '..', 'frontline_school_website');
app.use(express.static(websiteDir));

// Fallback for /admin single-page routing
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(adminDir, 'index.html'));
});

// Fallback for root website
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  res.sendFile(path.join(websiteDir, 'index.html'));
});

// Start Server if executed directly
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('====================================================');
    console.log('   🏫 FRONTLINE HIGH SCHOOL - BACKEND SERVER        ');
    console.log('====================================================');
    console.log(`  🌐 Public Website : http://localhost:${PORT}`);
    console.log(`  🔐 Admin Portal   : http://localhost:${PORT}/admin`);
    console.log(`  📊 Health API     : http://localhost:${PORT}/api/health`);
    console.log('----------------------------------------------------');
    console.log(`  Default Admin Credentials:`);
    console.log(`  Username : ${process.env.ADMIN_USERNAME || 'admin'}`);
    console.log(`  Password : ${process.env.ADMIN_PASSWORD || 'frontline2024'}`);
    console.log('====================================================');
  });
}

module.exports = app;
