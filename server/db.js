const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'frontline.db');

// Initialize SQLite database (using Node.js 22 built-in node:sqlite or better-sqlite3)
let db;
try {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(dbPath);
  console.log(`[DB] Connected to SQLite database using node:sqlite at: ${dbPath}`);
} catch (err) {
  try {
    const Database = require('better-sqlite3');
    db = new Database(dbPath);
    console.log(`[DB] Connected to SQLite database using better-sqlite3 at: ${dbPath}`);
  } catch (err2) {
    console.error('[DB] Failed to load SQLite database engine:', err, err2);
    throw new Error('SQLite database engine could not be initialized.');
  }
}

// Enable WAL mode for better concurrency and performance
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
} catch (e) {
  // Pragma may vary depending on engine
}

// Initialize tables
function initDatabase() {
  // Enquiries Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_id TEXT UNIQUE NOT NULL,
      parent_name TEXT NOT NULL,
      student_name TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      grade TEXT,
      enquiry_type TEXT DEFAULT 'admission',
      message TEXT,
      status TEXT DEFAULT 'new',
      notes TEXT DEFAULT '',
      ip_address TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Admin Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TEXT NOT NULL
    );
  `);

  // Seed default admin user if not exists
  const defaultAdmin = process.env.ADMIN_USERNAME || 'admin';
  const defaultPass = process.env.ADMIN_PASSWORD || 'frontline2024';

  const checkStmt = db.prepare('SELECT id FROM admin_users WHERE username = ?');
  const existing = checkStmt.get(defaultAdmin);

  if (!existing) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(defaultPass, salt);
    const insertStmt = db.prepare(`
      INSERT INTO admin_users (username, password_hash, role, created_at)
      VALUES (?, ?, ?, ?)
    `);
    insertStmt.run(defaultAdmin, hash, 'admin', new Date().toISOString());
    console.log(`[DB] Default admin user '${defaultAdmin}' initialized.`);
  }
}

initDatabase();

// Helper to generate reference ID like FLS-2024-8192
function generateRefId() {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `FLS-${year}-${random}`;
}

// Database helper operations
const dbOperations = {
  // Create a new enquiry
  createEnquiry(data) {
    const refId = generateRefId();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO enquiries (
        ref_id, parent_name, student_name, phone, email,
        grade, enquiry_type, message, status, notes, ip_address, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      refId,
      data.parent_name.trim(),
      data.student_name ? data.student_name.trim() : '',
      data.phone.trim(),
      data.email ? data.email.trim().toLowerCase() : '',
      data.grade ? data.grade.trim() : 'Not Specified',
      data.enquiry_type || 'admission',
      data.message ? data.message.trim() : '',
      'new',
      '',
      data.ip_address || '',
      now,
      now
    );

    const getStmt = db.prepare('SELECT * FROM enquiries WHERE ref_id = ?');
    return getStmt.get(refId);
  },

  // Get list of enquiries with optional filtering & search
  getEnquiries(filters = {}) {
    let sql = 'SELECT * FROM enquiries WHERE 1=1';
    const params = [];

    if (filters.status && filters.status !== 'all') {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.grade && filters.grade !== 'all') {
      sql += ' AND grade = ?';
      params.push(filters.grade);
    }

    if (filters.search) {
      const term = `%${filters.search.trim()}%`;
      sql += ' AND (parent_name LIKE ? OR student_name LIKE ? OR phone LIKE ? OR ref_id LIKE ?)';
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY id DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(Number(filters.limit));
      if (filters.offset) {
        sql += ' OFFSET ?';
        params.push(Number(filters.offset));
      }
    }

    const stmt = db.prepare(sql);
    return stmt.all(...params);
  },

  // Get single enquiry by ID
  getEnquiryById(id) {
    const stmt = db.prepare('SELECT * FROM enquiries WHERE id = ?');
    return stmt.get(Number(id));
  },

  // Update status and/or notes
  updateEnquiry(id, { status, notes }) {
    const now = new Date().toISOString();
    let sql = 'UPDATE enquiries SET updated_at = ?';
    const params = [now];

    if (status !== undefined) {
      sql += ', status = ?';
      params.push(status);
    }

    if (notes !== undefined) {
      sql += ', notes = ?';
      params.push(notes);
    }

    sql += ' WHERE id = ?';
    params.push(Number(id));

    const stmt = db.prepare(sql);
    stmt.run(...params);

    return this.getEnquiryById(id);
  },

  // Delete an enquiry
  deleteEnquiry(id) {
    const stmt = db.prepare('DELETE FROM enquiries WHERE id = ?');
    const result = stmt.run(Number(id));
    return result;
  },

  // Get stats for admin dashboard
  getStats() {
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM enquiries');
    const total = totalStmt.get().count;

    const newStmt = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE status = 'new'");
    const newCount = newStmt.get().count;

    const contactedStmt = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE status = 'contacted'");
    const contactedCount = contactedStmt.get().count;

    const enrolledStmt = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE status = 'enrolled'");
    const enrolledCount = enrolledStmt.get().count;

    const todayDate = new Date().toISOString().slice(0, 10);
    const todayStmt = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE created_at LIKE ?");
    const todayCount = todayStmt.get(`${todayDate}%`).count;

    return {
      total,
      new: newCount,
      contacted: contactedCount,
      enrolled: enrolledCount,
      today: todayCount
    };
  },

  // Admin authentication helper
  verifyAdmin(username, password) {
    const stmt = db.prepare('SELECT * FROM admin_users WHERE username = ?');
    const user = stmt.get(username);
    if (!user) return null;

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) return null;

    return {
      id: user.id,
      username: user.username,
      role: user.role
    };
  }
};

module.exports = {
  db,
  dbOperations
};
