const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
  toggle.textContent = open ? '×' : '☰';
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = '☰';
}));
document.getElementById('year').textContent = new Date().getFullYear();

// ==========================================
// ONLINE ENQUIRY MODAL (BACKEND CONNECTED)
// ==========================================
const enquiryModal = document.getElementById('enquiryModal');
const openModalBtn = document.getElementById('openAdmissionModalBtn');
const closeModalBtn = document.getElementById('closeEnquiryModalBtn');
const enquiryForm = document.getElementById('enquiryForm');
const modalAlert = document.getElementById('modalAlert');
const modalSuccessCard = document.getElementById('modalSuccessCard');
const successRefId = document.getElementById('successRefId');
const successDoneBtn = document.getElementById('successDoneBtn');
const submitBtn = document.getElementById('submitEnquiryBtn');

function openEnquiryModal() {
  if (!enquiryModal) return;
  enquiryModal.style.display = 'grid';
  enquiryModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeEnquiryModal() {
  if (!enquiryModal) return;
  enquiryModal.style.display = 'none';
  enquiryModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

if (openModalBtn) {
  openModalBtn.addEventListener('click', openEnquiryModal);
}

if (closeModalBtn) {
  closeModalBtn.addEventListener('click', closeEnquiryModal);
}

if (enquiryModal) {
  enquiryModal.addEventListener('click', (e) => {
    if (e.target === enquiryModal) closeEnquiryModal();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && enquiryModal && enquiryModal.style.display !== 'none') {
    closeEnquiryModal();
  }
});

if (successDoneBtn) {
  successDoneBtn.addEventListener('click', () => {
    closeEnquiryModal();
    // Reset view back to form for subsequent opens
    setTimeout(() => {
      modalSuccessCard.style.display = 'none';
      enquiryForm.style.display = 'block';
      enquiryForm.reset();
      modalAlert.style.display = 'none';
    }, 300);
  });
}

if (enquiryForm) {
  enquiryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalAlert.style.display = 'none';

    const parentName = enquiryForm.parent_name.value.trim();
    const studentName = enquiryForm.student_name.value.trim();
    const phone = enquiryForm.phone.value.trim();
    const email = enquiryForm.email.value.trim();
    const grade = enquiryForm.grade.value;
    const message = enquiryForm.message.value.trim();

    if (!parentName || !phone || !grade) {
      modalAlert.className = 'modal-status-alert error';
      modalAlert.textContent = 'Please fill in all required fields (Parent Name, Mobile Number, and Class).';
      modalAlert.style.display = 'block';
      return;
    }

    // Submit state
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span>Submitting Enquiry...</span>';

    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parent_name: parentName,
          student_name: studentName,
          phone: phone,
          email: email,
          grade: grade,
          enquiry_type: 'admission',
          message: message
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        successRefId.textContent = result.ref_id || 'Registered';
        enquiryForm.style.display = 'none';
        modalSuccessCard.style.display = 'block';
      } else {
        modalAlert.className = 'modal-status-alert error';
        modalAlert.textContent = result.message || 'Something went wrong. Please check your details and try again.';
        modalAlert.style.display = 'block';
      }
    } catch (err) {
      modalAlert.className = 'modal-status-alert error';
      modalAlert.innerHTML = `Unable to reach backend server. You can also send this enquiry directly on <a href="https://wa.me/919885973220?text=Hello%20Frontline%20High%20School%2C%20Admission%20enquiry%20for%20${encodeURIComponent(studentName || parentName)}%20(Class%20${encodeURIComponent(grade)})" target="_blank" style="color:#15803d;font-weight:700;text-decoration:underline;">WhatsApp to +91 98859 73220</a>.`;
      modalAlert.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

// ==========================================
// DYNAMIC CMS CONTENT LOADER (PHOTOS & MATTER)
// ==========================================
async function loadWebsiteContent() {
  try {
    const res = await fetch('/api/content');
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success || !json.content) return;

    const c = json.content;

    // Helper to safely set text content
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el && text !== undefined && text !== null && text !== '') el.innerText = text;
    };

    // Helper to safely set HTML (e.g. for titles with <br> or <b>)
    const setHtml = (id, html) => {
      const el = document.getElementById(id);
      if (el && html !== undefined && html !== null && html !== '') el.innerHTML = html;
    };

    // Helper to safely set background image
    const setBgPhoto = (id, url) => {
      const el = document.getElementById(id);
      if (el && url && url.trim()) {
        el.style.backgroundImage = `url('${url.trim()}')`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        // Hide child placeholder text if photo is present
        const span = el.querySelector('span');
        if (span && !el.classList.contains('gallery-item') && !el.classList.contains('about-photo')) {
          span.style.display = 'none';
        }
      }
    };

    // 1. Contact & Topline
    if (c.contact) {
      if (c.contact.phone) {
        setText('toplinePhone', `Call: ${c.contact.phone}`);
        setText('quickfactPhone', c.contact.phone);
        setText('contactPhoneText', c.contact.phone);
        const phoneLink = document.getElementById('contactPhoneLink');
        if (phoneLink) phoneLink.href = `tel:${c.contact.phone_clean || c.contact.phone}`;
        const admPhone = document.getElementById('admissionPhoneLink');
        if (admPhone) admPhone.href = `tel:${c.contact.phone_clean || c.contact.phone}`;
      }
      if (c.contact.address) {
        setHtml('contactAddress', c.contact.address.replace(/\n/g, '<br>'));
      }
      if (c.contact.hours) {
        setText('contactHours', c.contact.hours);
      }
      if (c.contact.hours_note) {
        setText('contactHoursNote', c.contact.hours_note);
      }
      if (c.contact.whatsapp) {
        const waLink = document.getElementById('admissionWhatsappLink');
        if (waLink) waLink.href = `https://wa.me/${c.contact.whatsapp}?text=Hello%20Frontline%20High%20School%2C%20I%20would%20like%20to%20enquire%20about%20admissions.`;
      }
    }

    // 2. Hero Section
    if (c.hero) {
      setText('heroEyebrow', c.hero.eyebrow);
      if (c.hero.title_line1 || c.hero.title_line2) {
        setHtml('heroTitle', `${c.hero.title_line1 || 'FRONTLINE'}<br><em>${c.hero.title_line2 || 'HIGH SCHOOL'}</em>`);
      }
      setText('heroSub', c.hero.tagline);
      setText('heroCopy', c.hero.copy);
      if (c.hero.location_badge) setText('heroLocation', `⌖ &nbsp; ${c.hero.location_badge}`);
      if (c.hero.bg_photo) {
        const heroEl = document.getElementById('home');
        if (heroEl) {
          heroEl.style.background = `linear-gradient(90deg,#071d35ed 0%,#0c2c4bd9 48%,#0c2c4b45 100%),url('${c.hero.bg_photo}') center/cover`;
        }
      }
    }

    // 3. About Section
    if (c.about) {
      if (c.about.heading) setHtml('aboutHeading', c.about.heading.replace(/\n/g, '<br>'));
      setText('aboutLead', c.about.lead);
      setText('aboutP1', c.about.p1);
      setText('aboutP2', c.about.p2);
      if (c.about.founding_year) {
        setHtml('aboutFounding', `Established in <b>${c.about.founding_year}</b>`);
      }
      setText('aboutFoundingNote', c.about.founding_note);
      setBgPhoto('aboutPhoto', c.about.campus_photo);
    }

    // 4. Leadership & Faculty
    if (c.leadership) {
      setText('correspName', c.leadership.correspondent_name);
      setText('correspTitle', c.leadership.correspondent_title);
      setText('correspMessage', c.leadership.correspondent_message);
      setBgPhoto('correspPhoto', c.leadership.correspondent_photo);

      setText('principalName', c.leadership.principal_name);
      setText('principalTitle', c.leadership.principal_title);
      setText('principalMessage', c.leadership.principal_message);
      setBgPhoto('principalPhoto', c.leadership.principal_photo);

      setText('teacherName', c.leadership.best_teacher_name);
      setText('teacherTitle', c.leadership.best_teacher_title);
      setText('teacherMessage', c.leadership.best_teacher_message);
      setBgPhoto('teacherPhoto', c.leadership.best_teacher_photo);
    }

    // 5. Star Students
    if (c.students) {
      setText('topperName', c.students.topper_name);
      setText('topperBadge', c.students.topper_badge);
      setText('topperDetails', c.students.topper_details);
      setBgPhoto('topperPhoto', c.students.topper_photo);

      setText('achieverName', c.students.achiever_name);
      setText('achieverBadge', c.students.achiever_badge);
      setText('achieverDetails', c.students.achiever_details);
      setBgPhoto('achieverPhoto', c.students.achiever_photo);

      setText('starName', c.students.star_name);
      setText('starBadge', c.students.star_badge);
      setText('starDetails', c.students.star_details);
      setBgPhoto('starPhoto', c.students.star_photo);
    }

    // 6. Events & Notices
    if (c.events) {
      setText('event1Badge', c.events.event1_badge);
      setText('event1Title', c.events.event1_title);
      setText('event1Desc', c.events.event1_desc);
      setBgPhoto('event1Photo', c.events.event1_photo);

      setText('event2Badge', c.events.event2_badge);
      setText('event2Title', c.events.event2_title);
      setText('event2Desc', c.events.event2_desc);
      setBgPhoto('event2Photo', c.events.event2_photo);

      setText('event3Badge', c.events.event3_badge);
      setText('event3Title', c.events.event3_title);
      setText('event3Desc', c.events.event3_desc);
      setBgPhoto('event3Photo', c.events.event3_photo);
    }

    // 7. Gallery
    if (c.gallery) {
      for (let i = 1; i <= 6; i++) {
        setText(`galleryLabel${i}`, c.gallery[`g${i}_label`]);
        setBgPhoto(`galleryItem${i}`, c.gallery[`g${i}_photo`]);
      }
    }
  } catch (e) {
    // Graceful fallback to default static HTML if offline
  }
}

// Hydrate dynamic content on page load
loadWebsiteContent();


