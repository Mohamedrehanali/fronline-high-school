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

