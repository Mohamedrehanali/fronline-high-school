# Frontline High School - Website & Backend

This repository contains the complete web application for **Frontline High School** (Sheshabgutta, Mahbubnagar, Telangana), with an **Express.js & SQLite backend** and an **Admin Portal**, designed so the frontend visual appearance and layout remain **100% intact**.

---

## 📁 Project Structure

```text
frontline_high_school_website_with_logo/
│
├── frontline_school_website/       # Frontend website (clean & visually intact)
│   ├── assets/
│   │   └── frontline-logo.png      # School crest / logo
│   ├── index.html                  # Main school landing page
│   ├── styles.css                  # Responsive design system
│   └── script.js                   # Navigation & enquiry modal logic
│
├── server/                         # Backend API (Node.js & Express)
│   ├── db.js                       # SQLite database initialization & CRUD
│   ├── middleware/
│   │   └── auth.js                 # JWT Bearer token authentication
│   ├── routes/
│   │   ├── auth.js                 # Admin login, logout, verification
│   │   └── enquiries.js            # Enquiry submissions, status updates, CSV export
│   └── server.js                   # Main server & static asset routing
│
├── admin/                          # School Office Admin Portal
│   ├── index.html                  # Admin dashboard UI
│   ├── admin.css                   # Admin portal styling (Navy & Gold theme)
│   └── admin.js                    # Lead management, search, filters & export
│
├── data/
│   └── frontline.db                # SQLite database (auto-created)
│
├── .env                            # Active environment configuration
├── .env.example                    # Environment template
├── package.json                    # Project dependencies & npm scripts
└── test-backend.js                 # Automated backend test suite
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Server
```bash
# Start server in production mode
npm start

# OR run in development mode with auto-reload
npm run dev
```

### 3. Open in Browser
- **Public Website:** [http://localhost:3000](http://localhost:3000)
- **Admin Portal:** [http://localhost:3000/admin](http://localhost:3000/admin)
- **API Health Check:** [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 🔐 Default Admin Credentials

| Field | Value |
|---|---|
| **Portal URL** | `http://localhost:3000/admin` |
| **Username** | `admin` |
| **Password** | `frontline2024` |

*(Credentials and secrets can be customized in the `.env` file)*

---

## 🌟 Key Features

1. **Zero Frontend Visual Disruption:**
   - The school's existing design, typography (`Playfair Display`, `DM Sans`), colors (Navy `#123b67`, Gold `#d6ad67`), and layout are preserved with 100% fidelity.
   - When parents click **"Online Admission Enquiry"**, a matching branded modal opens smoothly without altering the page layout.
   - Standalone fallback: If opened directly via `file://`, the page gracefully provides WhatsApp prefilled enquiry links.

2. **Persistent SQLite Database (`data/frontline.db`):**
   - Stores student and parent enquiries with unique reference IDs (e.g. `#FLS-2024-XXXX`).
   - Zero external database setup needed (no Postgres or MySQL server required).
   - Backed up easily by copying `data/frontline.db`.

3. **Admin Desk Portal (`/admin`):**
   - Real-time stat cards (Total Enquiries, Today's Submissions, Pending, Enrolled).
   - Search by parent name, student name, phone number, or reference ID.
   - Filter by status (`New`, `Contacted`, `Enrolled`, `Closed`) or Class (`Nursery` to `Class 10`).
   - 1-Click WhatsApp and Call quick action buttons for admissions staff.
   - Internal office notes to log parent follow-ups and campus visits.
   - Instant **Export to CSV** for school records and Excel reporting.

---

## 📡 API Reference

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Server status and uptime |
| `POST` | `/api/enquiries` | Public | Submit new admission / contact enquiry |
| `POST` | `/api/auth/login` | Public | Admin login (returns JWT token) |
| `GET` | `/api/auth/check` | Protected | Verify active admin session |
| `GET` | `/api/enquiries` | Protected | List all enquiries (supports filters & search) |
| `GET` | `/api/enquiries/stats` | Protected | Dashboard KPI statistics |
| `GET` | `/api/enquiries/:id` | Protected | Fetch enquiry details |
| `PATCH` | `/api/enquiries/:id` | Protected | Update status & staff notes |
| `DELETE` | `/api/enquiries/:id` | Protected | Delete enquiry record |
| `GET` | `/api/enquiries/export/csv` | Protected | Download enquiries as CSV file |

---

## 🧪 Automated Testing

Run the automated test suite anytime to verify all 10 API endpoints, database operations, authentication, and static file serving:

```bash
npm test
```
