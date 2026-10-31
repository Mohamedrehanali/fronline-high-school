// Frontline High School - Admin Portal JavaScript

const API_BASE = '/api';
let authToken = localStorage.getItem('frontline_admin_token') || '';
let currentEnquiries = [];
let activeEnquiryId = null;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboardApp = document.getElementById('dashboardApp');
const loginForm = document.getElementById('loginForm');
const loginAlert = document.getElementById('loginAlert');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminUsernameDisplay = document.getElementById('adminUsernameDisplay');

// Stats Elements
const statTotal = document.getElementById('statTotal');
const statToday = document.getElementById('statToday');
const statNew = document.getElementById('statNew');
const statEnrolled = document.getElementById('statEnrolled');

// Table Controls
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const gradeFilter = document.getElementById('gradeFilter');
const refreshBtn = document.getElementById('refreshBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const tableBody = document.getElementById('tableBody');
const tableLoading = document.getElementById('tableLoading');
const emptyState = document.getElementById('emptyState');

// Modal Elements
const detailModal = document.getElementById('detailModal');
const modalRefTitle = document.getElementById('modalRefTitle');
const modalBody = document.getElementById('modalBody');
const modalCloseBtn = document.getElementById('modalCloseBtn');

// ==========================================
// AUTHENTICATION
// ==========================================

async function verifyAuth() {
  if (!authToken) {
    showLogin();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/check`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (res.ok) {
      const data = await res.json();
      showDashboard(data.user.username);
    } else {
      localStorage.removeItem('frontline_admin_token');
      authToken = '';
      showLogin();
    }
  } catch (err) {
    showLogin();
  }
}

function showLogin() {
  loginScreen.style.display = 'flex';
  dashboardApp.style.display = 'none';
}

function showDashboard(username) {
  loginScreen.style.display = 'none';
  dashboardApp.style.display = 'flex';
  adminUsernameDisplay.textContent = username || 'Admin';
  loadDashboardData();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginAlert.style.display = 'none';
  loginBtn.disabled = true;
  loginBtn.textContent = 'Authenticating...';

  const username = loginForm.username.value;
  const password = loginForm.password.value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      authToken = data.token;
      localStorage.setItem('frontline_admin_token', authToken);
      showDashboard(data.user.username);
      loginForm.reset();
    } else {
      loginAlert.textContent = data.message || 'Login failed. Please check credentials.';
      loginAlert.style.display = 'block';
    }
  } catch (err) {
    loginAlert.textContent = 'Cannot connect to server. Ensure the backend is running.';
    loginAlert.style.display = 'block';
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In to Dashboard';
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
  } catch (e) {
    // Continue local logout
  }
  localStorage.removeItem('frontline_admin_token');
  authToken = '';
  showLogin();
});

// ==========================================
// DATA LOADING
// ==========================================

async function loadDashboardData() {
  await Promise.all([loadStats(), loadEnquiries()]);
}

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/enquiries/stats`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      const s = data.stats;
      statTotal.textContent = s.total || 0;
      statToday.textContent = s.today || 0;
      statNew.textContent = s.new || 0;
      statEnrolled.textContent = s.enrolled || 0;
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function loadEnquiries() {
  tableLoading.style.display = 'block';
  emptyState.style.display = 'none';
  tableBody.innerHTML = '';

  const params = new URLSearchParams();
  if (statusFilter.value !== 'all') params.append('status', statusFilter.value);
  if (gradeFilter.value !== 'all') params.append('grade', gradeFilter.value);
  if (searchInput.value.trim()) params.append('search', searchInput.value.trim());

  try {
    const res = await fetch(`${API_BASE}/enquiries?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (res.ok) {
      const data = await res.json();
      currentEnquiries = data.enquiries || [];
      renderTable(currentEnquiries);
    } else {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:red;padding:20px;">Failed to load data. Please re-authenticate.</td></tr>`;
    }
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:red;padding:20px;">Error connecting to server.</td></tr>`;
  } finally {
    tableLoading.style.display = 'none';
  }
}

// ==========================================
// TABLE RENDERING
// ==========================================

function renderTable(list) {
  tableBody.innerHTML = '';

  if (!list || list.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  list.forEach(item => {
    const tr = document.createElement('tr');

    // Clean phone number for links
    const cleanPhone = item.phone.replace(/[^0-9]/g, '');
    const dateFormatted = new Date(item.created_at).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    tr.innerHTML = `
      <td><span class="ref-tag">${item.ref_id}</span></td>
      <td><span class="time-tag">${dateFormatted}</span></td>
      <td>
        <div class="person-name">${escapeHtml(item.parent_name)}</div>
        <small style="color:var(--muted);">${item.email ? escapeHtml(item.email) : 'No email provided'}</small>
      </td>
      <td>
        <div style="font-weight:600;">${item.student_name ? escapeHtml(item.student_name) : '—'}</div>
        <span class="student-tag">${escapeHtml(item.grade || 'General')}</span>
      </td>
      <td>
        <div class="phone-wrapper">
          <span style="font-weight:600;">${escapeHtml(item.phone)}</span>
          <a href="tel:${cleanPhone}" class="quick-btn quick-call" title="Call Parent">☎</a>
          <a href="https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=Hello%20${encodeURIComponent(item.parent_name)}%2C%20regarding%20your%20Frontline%20High%20School%20admission%20enquiry..." target="_blank" class="quick-btn quick-wa" title="WhatsApp Message">💬</a>
        </div>
      </td>
      <td>
        <select class="select-control" style="font-size:12px;padding:4px 8px;border-radius:4px;" onchange="updateStatus(${item.id}, this.value)">
          <option value="new" ${item.status === 'new' ? 'selected' : ''}>🔴 New</option>
          <option value="contacted" ${item.status === 'contacted' ? 'selected' : ''}>🟡 Contacted</option>
          <option value="enrolled" ${item.status === 'enrolled' ? 'selected' : ''}>🟢 Enrolled</option>
          <option value="closed" ${item.status === 'closed' ? 'selected' : ''}>⚪ Closed</option>
        </select>
      </td>
      <td>
        <div class="notes-preview" title="${escapeHtml(item.notes || 'No notes yet')}">
          ${item.notes ? escapeHtml(item.notes) : '<em style="color:#a0aec0;">Click View to add notes</em>'}
        </div>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" onclick="openDetailModal(${item.id})" title="View full details">View</button>
          <button class="btn-icon danger" onclick="deleteEnquiry(${item.id})" title="Delete enquiry">✕</button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// Helper to escape HTML characters
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==========================================
// ACTIONS (STATUS, NOTES, DELETE, CSV)
// ==========================================

window.updateStatus = async function(id, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/enquiries/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      loadStats();
    }
  } catch (err) {
    alert('Failed to update status.');
  }
};

window.deleteEnquiry = async function(id) {
  if (!confirm('Are you sure you want to delete this enquiry? This action cannot be undone.')) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/enquiries/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (res.ok) {
      loadDashboardData();
    } else {
      alert('Failed to delete enquiry.');
    }
  } catch (err) {
    alert('Error connecting to server.');
  }
};

window.openDetailModal = function(id) {
  const item = currentEnquiries.find(e => e.id === id);
  if (!item) return;
  activeEnquiryId = id;

  modalRefTitle.textContent = `Enquiry: ${item.ref_id}`;

  const cleanPhone = item.phone.replace(/[^0-9]/g, '');

  modalBody.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <small>Parent / Guardian</small>
        <p>${escapeHtml(item.parent_name)}</p>
      </div>
      <div class="detail-item">
        <small>Student Name</small>
        <p>${escapeHtml(item.student_name || 'Not provided')}</p>
      </div>
      <div class="detail-item">
        <small>Grade / Class</small>
        <p><strong style="color:var(--navy);">${escapeHtml(item.grade || 'General')}</strong></p>
      </div>
      <div class="detail-item">
        <small>Contact Phone</small>
        <p>
          <a href="tel:${cleanPhone}" style="color:var(--navy);font-weight:700;">${escapeHtml(item.phone)}</a>
          &nbsp;
          <a href="https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}" target="_blank" style="color:var(--success);font-weight:700;">(WhatsApp)</a>
        </p>
      </div>
      <div class="detail-item">
        <small>Email Address</small>
        <p>${item.email ? `<a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a>` : 'Not provided'}</p>
      </div>
      <div class="detail-item">
        <small>Enquiry Date</small>
        <p>${new Date(item.created_at).toLocaleString()}</p>
      </div>
      <div class="detail-message">
        <small>Parent Message / Notes</small>
        <p style="margin-top:6px;font-style:italic;">${escapeHtml(item.message) || 'No specific question entered.'}</p>
      </div>
    </div>

    <hr style="border:0;border-top:1px solid var(--border);margin:20px 0;">

    <form id="modalNotesForm">
      <div class="form-group">
        <label for="modalStatus">Enquiry Status</label>
        <select id="modalStatus" class="select-control">
          <option value="new" ${item.status === 'new' ? 'selected' : ''}>🔴 New (Pending)</option>
          <option value="contacted" ${item.status === 'contacted' ? 'selected' : ''}>🟡 Contacted / Follow-up</option>
          <option value="enrolled" ${item.status === 'enrolled' ? 'selected' : ''}>🟢 Enrolled / Admitted</option>
          <option value="closed" ${item.status === 'closed' ? 'selected' : ''}>⚪ Closed / Archived</option>
        </select>
      </div>

      <div class="form-group">
        <label for="modalNotes">School Office Notes & Follow-up Remarks</label>
        <textarea id="modalNotes" class="form-control" rows="4" placeholder="e.g. Called parent on Tuesday. Parent will visit school for campus tour on Saturday with transfer certificate...">${escapeHtml(item.notes || '')}</textarea>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Close</button>
        <button type="submit" class="btn btn-gold" id="saveNotesBtn">Save Changes</button>
      </div>
    </form>
  `;

  detailModal.style.display = 'grid';

  // Handle form submit
  document.getElementById('modalNotesForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveNotesBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const status = document.getElementById('modalStatus').value;
    const notes = document.getElementById('modalNotes').value;

    try {
      const res = await fetch(`${API_BASE}/enquiries/${activeEnquiryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ status, notes })
      });

      if (res.ok) {
        closeModal();
        loadDashboardData();
      } else {
        alert('Failed to save notes.');
      }
    } catch (err) {
      alert('Network error while saving notes.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  });
};

function closeModal() {
  detailModal.style.display = 'none';
  activeEnquiryId = null;
}

modalCloseBtn.addEventListener('click', closeModal);
detailModal.addEventListener('click', (e) => {
  if (e.target === detailModal) closeModal();
});

// CSV Export
exportCsvBtn.addEventListener('click', async () => {
  try {
    const res = await fetch(`${API_BASE}/enquiries/export/csv`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `frontline_school_enquiries_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } else {
      alert('Failed to download CSV export.');
    }
  } catch (err) {
    alert('Error connecting to export service.');
  }
});

// Search & Filter event listeners
let debounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadEnquiries, 300);
});

statusFilter.addEventListener('change', loadEnquiries);
gradeFilter.addEventListener('change', loadEnquiries);
refreshBtn.addEventListener('click', loadDashboardData);

// Initialize on load
verifyAuth();
