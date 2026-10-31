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
      const savedUser = JSON.parse(localStorage.getItem('frontline_admin_user') || '{}');
      showDashboard(data.user.username || savedUser.username, data.user.picture || savedUser.picture);
    } else {
      localStorage.removeItem('frontline_admin_token');
      localStorage.removeItem('frontline_admin_user');
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
  initGoogleSignIn();
}

function showDashboard(username, picture) {
  loginScreen.style.display = 'none';
  dashboardApp.style.display = 'flex';
  adminUsernameDisplay.textContent = username || 'Admin';

  const avatar = document.getElementById('adminAvatar');
  const dot = document.getElementById('adminUserDot');
  if (avatar && dot) {
    if (picture) {
      avatar.src = picture;
      avatar.style.display = 'inline-block';
      dot.style.display = 'none';
    } else {
      avatar.style.display = 'none';
      dot.style.display = 'inline-block';
    }
  }

  loadDashboardData();
}

// ==========================================
// GOOGLE SIGN-IN HANDLER
// ==========================================
const DEFAULT_GOOGLE_CLIENT_ID = '644735241675-7u6e7p8go0o641tmif2guark1s7kolfl.apps.googleusercontent.com';
let googleClientId = DEFAULT_GOOGLE_CLIENT_ID;
let googleInitRetries = 0;

async function initGoogleSignIn() {
  try {
    const fallbackBtn = document.getElementById('fallbackGoogleBtn');
    const googleBtnContainer = document.getElementById('googleSignInBtn');

    // Optionally fetch dynamic config from server if available
    try {
      const res = await fetch(`${API_BASE}/auth/google-config`);
      if (res.ok) {
        const data = await res.json();
        if (data.googleClientId) {
          googleClientId = data.googleClientId;
        }
      }
    } catch (e) {
      // Use DEFAULT_GOOGLE_CLIENT_ID
    }

    const clientIdToUse = googleClientId || DEFAULT_GOOGLE_CLIENT_ID;

    if (clientIdToUse && window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.initialize({
        client_id: clientIdToUse,
        callback: handleGoogleSignInCallback,
        auto_select: false
      });

      // Calculate container width safely
      const containerWidth = Math.min(320, window.innerWidth - 60);

      window.google.accounts.id.renderButton(googleBtnContainer, {
        theme: 'outline',
        size: 'large',
        width: containerWidth,
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left'
      });

      if (fallbackBtn) fallbackBtn.style.display = 'none';
      if (googleBtnContainer) googleBtnContainer.style.display = 'block';
    } else if (googleInitRetries < 25) {
      // If Google CDN script is still loading asynchronously, retry
      googleInitRetries++;
      setTimeout(initGoogleSignIn, 200);
    } else {
      if (fallbackBtn) fallbackBtn.style.display = 'flex';
      if (googleBtnContainer) googleBtnContainer.style.display = 'none';
    }
  } catch (err) {
    console.warn('Could not initialize Google Sign-In:', err);
  }
}
window.initGoogleSignIn = initGoogleSignIn;

window.promptGoogleSignIn = function() {
  const clientIdToUse = googleClientId || DEFAULT_GOOGLE_CLIENT_ID;
  if (window.google && window.google.accounts && window.google.accounts.id) {
    window.google.accounts.id.prompt();
  } else {
    alert('Google services are still loading. Please wait a moment or sign in with admin password.');
  }
};

window.handleGoogleSignInCallback = async function(response) {
  if (!response || !response.credential) return;

  loginAlert.style.display = 'none';
  loginBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      authToken = data.token;
      localStorage.setItem('frontline_admin_token', authToken);
      localStorage.setItem('frontline_admin_user', JSON.stringify(data.user));
      showDashboard(data.user.username, data.user.picture);
    } else {
      loginAlert.textContent = data.message || 'Google sign-in was not authorized.';
      loginAlert.style.display = 'block';
    }
  } catch (err) {
    loginAlert.textContent = 'Network error while authenticating with Google.';
    loginAlert.style.display = 'block';
  } finally {
    loginBtn.disabled = false;
  }
};

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
  await Promise.all([loadStats(), loadEnquiries(), loadCmsContent()]);
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
      const badge = document.getElementById('badgeEnquiriesCount');
      if (badge) badge.textContent = s.total || 0;
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

// ==========================================
// CMS CONTROLLER (MATTER & PHOTO MANAGEMENT)
// ==========================================
window.switchMainTab = function(tabName) {
  const tabEnquiries = document.getElementById('tabEnquiriesBtn');
  const tabCms = document.getElementById('tabCmsBtn');
  const viewEnquiries = document.getElementById('enquiriesSectionView');
  const viewCms = document.getElementById('cmsSectionView');

  if (tabName === 'cms') {
    tabEnquiries.classList.remove('active');
    tabCms.classList.add('active');
    viewEnquiries.style.display = 'none';
    viewCms.style.display = 'block';
    loadCmsContent();
  } else {
    tabCms.classList.remove('active');
    tabEnquiries.classList.add('active');
    viewCms.style.display = 'none';
    viewEnquiries.style.display = 'block';
  }
};

window.switchCmsSection = function(sectionId) {
  const sections = ['secContact', 'secLeadership', 'secStudents', 'secEvents', 'secGallery'];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === sectionId) ? 'block' : 'none';
  });

  const buttons = document.querySelectorAll('.cms-sub-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('onclick').includes(sectionId)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
};

window.triggerFileInput = function(fileInputId) {
  const fileInput = document.getElementById(fileInputId);
  if (fileInput) fileInput.click();
};

window.updatePreviewFromInput = function(url, previewBoxId) {
  const box = document.getElementById(previewBoxId);
  if (!box) return;
  if (url && url.trim()) {
    box.style.backgroundImage = `url('${url.trim()}')`;
    const span = box.querySelector('span');
    if (span) span.style.display = 'none';
  } else {
    box.style.backgroundImage = 'none';
    const span = box.querySelector('span');
    if (span) span.style.display = 'block';
  }
};

window.handleFileUpload = async function(fileInput, targetInputId, previewBoxId) {
  if (!fileInput.files || fileInput.files.length === 0) return;
  const file = fileInput.files[0];

  const formData = new FormData();
  formData.append('photo', file);

  const previewBox = document.getElementById(previewBoxId);
  if (previewBox) {
    const span = previewBox.querySelector('span');
    if (span) span.textContent = 'Uploading...';
  }

  try {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    const data = await res.json();
    if (res.ok && data.success) {
      const inputEl = document.getElementById(targetInputId);
      if (inputEl) inputEl.value = data.url;
      updatePreviewFromInput(data.url, previewBoxId);
      showCmsAlert(`✓ Photo uploaded successfully! Remember to click "Save All Changes".`, 'success');
    } else {
      alert(data.message || 'Failed to upload photo.');
      if (previewBox) {
        const span = previewBox.querySelector('span');
        if (span) span.textContent = 'Upload Failed';
      }
    }
  } catch (err) {
    alert('Error connecting to upload service.');
  } finally {
    fileInput.value = '';
  }
};

async function loadCmsContent() {
  try {
    const res = await fetch(`${API_BASE}/content`);
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success || !json.content) return;

    const c = json.content;

    // Contact & Info
    if (c.contact) {
      setVal('cmsContactPhone', c.contact.phone);
      setVal('cmsContactWhatsapp', c.contact.whatsapp);
      setVal('cmsContactAddress', c.contact.address);
      setVal('cmsContactHours', c.contact.hours);
      setVal('cmsContactHoursNote', c.contact.hours_note);
    }
    if (c.about) {
      setVal('cmsFoundingYear', c.about.founding_year);
      setVal('cmsAboutLead', c.about.lead);
      setVal('cmsAboutP1', c.about.p1);
      setVal('cmsAboutP2', c.about.p2);
      setVal('cmsCampusPhoto', c.about.campus_photo);
      updatePreviewFromInput(c.about.campus_photo, 'prevCampusPhoto');
    }

    // Leadership
    if (c.leadership) {
      setVal('cmsCorrespName', c.leadership.correspondent_name);
      setVal('cmsCorrespMessage', c.leadership.correspondent_message);
      setVal('cmsCorrespPhoto', c.leadership.correspondent_photo);
      updatePreviewFromInput(c.leadership.correspondent_photo, 'prevCorrespPhoto');

      setVal('cmsPrincipalName', c.leadership.principal_name);
      setVal('cmsPrincipalMessage', c.leadership.principal_message);
      setVal('cmsPrincipalPhoto', c.leadership.principal_photo);
      updatePreviewFromInput(c.leadership.principal_photo, 'prevPrincipalPhoto');

      setVal('cmsTeacherName', c.leadership.best_teacher_name);
      setVal('cmsTeacherTitle', c.leadership.best_teacher_title);
      setVal('cmsTeacherMessage', c.leadership.best_teacher_message);
      setVal('cmsTeacherPhoto', c.leadership.best_teacher_photo);
      updatePreviewFromInput(c.leadership.best_teacher_photo, 'prevTeacherPhoto');
    }

    // Students
    if (c.students) {
      setVal('cmsTopperBadge', c.students.topper_badge);
      setVal('cmsTopperName', c.students.topper_name);
      setVal('cmsTopperDetails', c.students.topper_details);
      setVal('cmsTopperPhoto', c.students.topper_photo);
      updatePreviewFromInput(c.students.topper_photo, 'prevTopperPhoto');

      setVal('cmsAchieverBadge', c.students.achiever_badge);
      setVal('cmsAchieverName', c.students.achiever_name);
      setVal('cmsAchieverDetails', c.students.achiever_details);
      setVal('cmsAchieverPhoto', c.students.achiever_photo);
      updatePreviewFromInput(c.students.achiever_photo, 'prevAchieverPhoto');

      setVal('cmsStarBadge', c.students.star_badge);
      setVal('cmsStarName', c.students.star_name);
      setVal('cmsStarDetails', c.students.star_details);
      setVal('cmsStarPhoto', c.students.star_photo);
      updatePreviewFromInput(c.students.star_photo, 'prevStarPhoto');
    }

    // Events
    if (c.events) {
      setVal('cmsEvent1Badge', c.events.event1_badge);
      setVal('cmsEvent1Title', c.events.event1_title);
      setVal('cmsEvent1Desc', c.events.event1_desc);
      setVal('cmsEvent1Photo', c.events.event1_photo);
      updatePreviewFromInput(c.events.event1_photo, 'prevEvent1Photo');

      setVal('cmsEvent2Badge', c.events.event2_badge);
      setVal('cmsEvent2Title', c.events.event2_title);
      setVal('cmsEvent2Desc', c.events.event2_desc);
      setVal('cmsEvent2Photo', c.events.event2_photo);
      updatePreviewFromInput(c.events.event2_photo, 'prevEvent2Photo');

      setVal('cmsEvent3Badge', c.events.event3_badge);
      setVal('cmsEvent3Title', c.events.event3_title);
      setVal('cmsEvent3Desc', c.events.event3_desc);
      setVal('cmsEvent3Photo', c.events.event3_photo);
      updatePreviewFromInput(c.events.event3_photo, 'prevEvent3Photo');
    }

    // Gallery
    if (c.gallery) {
      for (let i = 1; i <= 6; i++) {
        setVal(`cmsGallery${i}Label`, c.gallery[`g${i}_label`]);
        setVal(`cmsGallery${i}Photo`, c.gallery[`g${i}_photo`]);
        updatePreviewFromInput(c.gallery[`g${i}_photo`], `prevGallery${i}`);
      }
    }
  } catch (err) {
    console.error('Failed to load CMS content:', err);
  }
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null) el.value = val;
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function showCmsAlert(msg, type = 'success') {
  const alertEl = document.getElementById('cmsAlertBanner');
  if (!alertEl) return;
  alertEl.className = `alert ${type}`;
  alertEl.textContent = msg;
  alertEl.style.display = 'block';
  window.scrollTo({ top: 120, behavior: 'smooth' });
  setTimeout(() => {
    alertEl.style.display = 'none';
  }, 5000);
}

// Save All Content Button Handler
const saveAllContentBtn = document.getElementById('saveAllContentBtn');
if (saveAllContentBtn) {
  saveAllContentBtn.addEventListener('click', async () => {
    saveAllContentBtn.disabled = true;
    saveAllContentBtn.innerHTML = '<span>Saving Changes...</span>';

    const payload = {
      contact: {
        phone: getVal('cmsContactPhone'),
        phone_clean: getVal('cmsContactPhone').replace(/[^0-9+]/g, ''),
        whatsapp: getVal('cmsContactWhatsapp'),
        address: getVal('cmsContactAddress'),
        hours: getVal('cmsContactHours'),
        hours_note: getVal('cmsContactHoursNote')
      },
      about: {
        lead: getVal('cmsAboutLead'),
        p1: getVal('cmsAboutP1'),
        p2: getVal('cmsAboutP2'),
        founding_year: getVal('cmsFoundingYear'),
        campus_photo: getVal('cmsCampusPhoto')
      },
      leadership: {
        correspondent_name: getVal('cmsCorrespName'),
        correspondent_message: getVal('cmsCorrespMessage'),
        correspondent_photo: getVal('cmsCorrespPhoto'),
        principal_name: getVal('cmsPrincipalName'),
        principal_message: getVal('cmsPrincipalMessage'),
        principal_photo: getVal('cmsPrincipalPhoto'),
        best_teacher_name: getVal('cmsTeacherName'),
        best_teacher_title: getVal('cmsTeacherTitle') || 'BEST TEACHER · MATHEMATICS',
        best_teacher_message: getVal('cmsTeacherMessage'),
        best_teacher_photo: getVal('cmsTeacherPhoto')
      },
      students: {
        topper_badge: getVal('cmsTopperBadge') || 'TOPPER · CLASS 10',
        topper_name: getVal('cmsTopperName'),
        topper_details: getVal('cmsTopperDetails'),
        topper_photo: getVal('cmsTopperPhoto'),
        achiever_badge: getVal('cmsAchieverBadge') || 'ACHIEVER · SCIENCE OLYMPIAD',
        achiever_name: getVal('cmsAchieverName'),
        achiever_details: getVal('cmsAchieverDetails'),
        achiever_photo: getVal('cmsAchieverPhoto'),
        star_badge: getVal('cmsStarBadge') || 'STUDENT OF THE YEAR',
        star_name: getVal('cmsStarName'),
        star_details: getVal('cmsStarDetails'),
        star_photo: getVal('cmsStarPhoto')
      },
      events: {
        event1_badge: getVal('cmsEvent1Badge') || 'UPCOMING EVENT · [DATE]',
        event1_title: getVal('cmsEvent1Title'),
        event1_desc: getVal('cmsEvent1Desc'),
        event1_photo: getVal('cmsEvent1Photo'),
        event2_badge: getVal('cmsEvent2Badge') || 'SCHOOL UPDATE · [DATE]',
        event2_title: getVal('cmsEvent2Title'),
        event2_desc: getVal('cmsEvent2Desc'),
        event2_photo: getVal('cmsEvent2Photo'),
        event3_badge: getVal('cmsEvent3Badge') || 'ACADEMIC CALENDAR',
        event3_title: getVal('cmsEvent3Title'),
        event3_desc: getVal('cmsEvent3Desc'),
        event3_photo: getVal('cmsEvent3Photo')
      },
      gallery: {
        g1_label: getVal('cmsGallery1Label') || 'Campus',
        g1_photo: getVal('cmsGallery1Photo'),
        g2_label: getVal('cmsGallery2Label') || 'Classroom',
        g2_photo: getVal('cmsGallery2Photo'),
        g3_label: getVal('cmsGallery3Label') || 'Activities',
        g3_photo: getVal('cmsGallery3Photo'),
        g4_label: getVal('cmsGallery4Label') || 'Celebrations',
        g4_photo: getVal('cmsGallery4Photo'),
        g5_label: getVal('cmsGallery5Label') || 'Students',
        g5_photo: getVal('cmsGallery5Photo'),
        g6_label: getVal('cmsGallery6Label') || 'School events',
        g6_photo: getVal('cmsGallery6Photo')
      }
    };

    try {
      const res = await fetch(`${API_BASE}/content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showCmsAlert('✓ All website text and photos have been updated successfully! Changes are live.', 'success');
      } else {
        alert(data.message || 'Failed to save changes.');
      }
    } catch (err) {
      alert('Error connecting to server while saving content.');
    } finally {
      saveAllContentBtn.disabled = false;
      saveAllContentBtn.innerHTML = '<span>💾 Save All Changes</span>';
    }
  });
}

// Reset Defaults Handler
const resetContentBtn = document.getElementById('resetContentBtn');
if (resetContentBtn) {
  resetContentBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to reset all website matter and photos to defaults?')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/content/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showCmsAlert('✓ Content reset to defaults successfully.', 'success');
        loadCmsContent();
      }
    } catch (err) {
      alert('Error resetting content.');
    }
  });
}

// Initialize on load
verifyAuth();
