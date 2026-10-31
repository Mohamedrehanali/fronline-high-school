const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Ensure data directory exists
const dataDir = process.env.VERCEL ? '/tmp/data' : path.join(__dirname, '..', 'data');
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

  // Site Content Table (for matter and photos CMS)
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_key TEXT UNIQUE NOT NULL,
      content_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed default website matter and photos
  seedDefaultContent();

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

// Default content for school website
const DEFAULT_SITE_CONTENT = {
  contact: {
    phone: "+91 98859 73220",
    phone_clean: "+919885973220",
    whatsapp: "919885973220",
    address: "Sha Shab Gutta, X Road, Sheshabgutta,\nMahbubnagar, Telangana 509001",
    hours: "Monday – Saturday · 9:00 AM – 5:30 PM",
    hours_note: "Confirm holiday and office timings by phone."
  },
  hero: {
    eyebrow: "WELCOME TO",
    title_line1: "FRONTLINE",
    title_line2: "HIGH SCHOOL",
    tagline: "Learning today. Leading tomorrow.",
    copy: "A school community focused on learning, character and helping every student move forward.",
    location_badge: "Sheshabgutta, Mahbubnagar – 509001",
    bg_photo: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1900&q=85"
  },
  about: {
    heading: "A place to learn,\ngrow and shine.",
    lead: "Welcome to Frontline High School.",
    p1: "Frontline High School is located at Sha Shab Gutta, X Road, Sheshabgutta, Mahbubnagar, Telangana. This website is a place for parents and students to find school information, admission updates, events and contact details.",
    p2: "We believe every student's journey matters. Our aim is to support a positive learning environment where students can build knowledge, confidence and good values.",
    founding_year: "2010",
    founding_note: "Established with a commitment to quality education.",
    campus_photo: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1100&q=85"
  },
  leadership: {
    correspondent_name: "Mohammed Ahmed",
    correspondent_title: "CORRESPONDENT",
    correspondent_message: "We are committed to nurturing disciplined, thoughtful individuals equipped for life and career success.",
    correspondent_photo: "",
    principal_name: "Dr. K. Srinivasa Rao",
    principal_title: "PRINCIPAL",
    principal_message: "Our faculty empowers students with strong academic fundamentals, character building, and creative thinking.",
    principal_photo: "",
    best_teacher_name: "Mrs. Radhika Sharma",
    best_teacher_title: "BEST TEACHER · MATHEMATICS",
    best_teacher_message: "Recognised for innovative teaching methods and student mentoring in senior classes.",
    best_teacher_photo: ""
  },
  students: {
    topper_badge: "TOPPER · CLASS 10",
    topper_name: "Amina Fatima",
    topper_details: "Scored 98.4% in Board Examinations · School Rank 1",
    topper_photo: "",
    achiever_badge: "ACHIEVER · SCIENCE OLYMPIAD",
    achiever_name: "Syed Rayyan",
    achiever_details: "Gold Medalist at State Level Science Olympiad",
    achiever_photo: "",
    star_badge: "STUDENT OF THE YEAR",
    star_name: "Ananya Reddy",
    star_details: "Excellence in Academics, Sports & Leadership",
    star_photo: ""
  },
  events: {
    event1_badge: "UPCOMING EVENT · 14 NOV",
    event1_title: "Annual Sports Day & Children's Day",
    event1_desc: "Track & field events, cultural programmes, and annual student awards at school campus from 9:00 AM.",
    event1_photo: "",
    event2_badge: "SCHOOL UPDATE · ADMISSIONS",
    event2_title: "Admissions Open for Academic Year 2024-25",
    event2_desc: "Applications are open for Nursery to Class 10. Visit school office or submit online enquiry.",
    event2_photo: "",
    event3_badge: "ACADEMIC CALENDAR",
    event3_title: "Exam Dates & Timetable Notice",
    event3_desc: "Mid-term examination schedule and syllabus revision guidelines published on notice board.",
    event3_photo: ""
  },
  gallery: {
    g1_label: "Campus",
    g1_photo: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80",
    g2_label: "Classroom",
    g2_photo: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80",
    g3_label: "Activities",
    g3_photo: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80",
    g4_label: "Celebrations",
    g4_photo: "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=800&q=80",
    g5_label: "Students",
    g5_photo: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80",
    g6_label: "School Events",
    g6_photo: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80"
  }
};

function seedDefaultContent() {
  const checkStmt = db.prepare('SELECT id FROM site_content WHERE section_key = ?');
  const insertStmt = db.prepare('INSERT INTO site_content (section_key, content_json, updated_at) VALUES (?, ?, ?)');
  const now = new Date().toISOString();

  for (const [key, val] of Object.entries(DEFAULT_SITE_CONTENT)) {
    const existing = checkStmt.get(key);
    if (!existing) {
      insertStmt.run(key, JSON.stringify(val), now);
    }
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
  },

  // Create a new admin user
  createAdminUser(username, password, role = 'admin') {
    const checkStmt = db.prepare('SELECT id FROM admin_users WHERE username = ?');
    const existing = checkStmt.get(username);
    if (existing) {
      return {
        success: false,
        message: `Username '${username}' is already taken. Please choose another username.`
      };
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const insertStmt = db.prepare(`
      INSERT INTO admin_users (username, password_hash, role, created_at)
      VALUES (?, ?, ?, ?)
    `);
    const info = insertStmt.run(username, hash, role, new Date().toISOString());

    return {
      success: true,
      user: {
        id: info.lastInsertRowid,
        username,
        role
      }
    };
  },

  // Content CMS Operations
  getAllContent() {
    const rows = db.prepare('SELECT section_key, content_json FROM site_content').all();
    const result = {};
    for (const row of rows) {
      try {
        result[row.section_key] = JSON.parse(row.content_json);
      } catch (e) {
        result[row.section_key] = {};
      }
    }
    return result;
  },

  getContent(sectionKey) {
    const row = db.prepare('SELECT content_json FROM site_content WHERE section_key = ?').get(sectionKey);
    if (!row) return null;
    try {
      return JSON.parse(row.content_json);
    } catch (e) {
      return null;
    }
  },

  updateContent(sectionKey, data) {
    const now = new Date().toISOString();
    const jsonStr = JSON.stringify(data);
    const check = db.prepare('SELECT id FROM site_content WHERE section_key = ?').get(sectionKey);

    if (check) {
      db.prepare('UPDATE site_content SET content_json = ?, updated_at = ? WHERE section_key = ?')
        .run(jsonStr, now, sectionKey);
    } else {
      db.prepare('INSERT INTO site_content (section_key, content_json, updated_at) VALUES (?, ?, ?)')
        .run(sectionKey, jsonStr, now);
    }
    return this.getContent(sectionKey);
  },

  resetAllContent() {
    const now = new Date().toISOString();
    const updateStmt = db.prepare('UPDATE site_content SET content_json = ?, updated_at = ? WHERE section_key = ?');
    for (const [key, val] of Object.entries(DEFAULT_SITE_CONTENT)) {
      updateStmt.run(JSON.stringify(val), now, key);
    }
    return this.getAllContent();
  }
};

module.exports = {
  db,
  dbOperations
};
