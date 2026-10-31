const express = require('express');
const router = express.Router();
const { dbOperations } = require('../db');
const { authenticateAdmin } = require('../middleware/auth');

// Validation helper
function validateEnquiryInput(body) {
  const errors = [];
  const parent_name = body.parent_name || body.name;
  const phone = body.phone;

  if (!parent_name || typeof parent_name !== 'string' || parent_name.trim().length < 2) {
    errors.push('Please provide a valid parent or student name (at least 2 characters).');
  }

  if (!phone || typeof phone !== 'string' || !/^[0-9+ -]{7,15}$/.test(phone.trim())) {
    errors.push('Please provide a valid contact phone number.');
  }

  if (body.email && typeof body.email === 'string' && body.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email.trim())) {
      errors.push('Please provide a valid email address.');
    }
  }

  return errors;
}

// ==========================================
// PUBLIC ROUTES
// ==========================================

// POST /api/enquiries - Submit an admission or contact enquiry
router.post('/', (req, res) => {
  try {
    const errors = validateEnquiryInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors.join(' ')
      });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    const newEnquiry = dbOperations.createEnquiry({
      parent_name: req.body.parent_name || req.body.name,
      student_name: req.body.student_name || '',
      phone: req.body.phone,
      email: req.body.email || '',
      grade: req.body.grade || 'Not Specified',
      enquiry_type: req.body.enquiry_type || 'admission',
      message: req.body.message || '',
      ip_address: typeof clientIp === 'string' ? clientIp.split(',')[0].trim() : ''
    });

    console.log(`[Enquiry] New ${newEnquiry.enquiry_type} submission from ${newEnquiry.parent_name} (${newEnquiry.phone}) Ref: ${newEnquiry.ref_id}`);

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your enquiry has been received successfully. The Frontline High School office will contact you soon.',
      ref_id: newEnquiry.ref_id,
      data: {
        ref_id: newEnquiry.ref_id,
        created_at: newEnquiry.created_at
      }
    });
  } catch (err) {
    console.error('[Enquiry Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to process enquiry. Please try again or call the school directly at +91 98859 73220.'
    });
  }
});

// ==========================================
// PROTECTED ADMIN ROUTES
// ==========================================

// GET /api/enquiries/stats - Summary counts
router.get('/stats', authenticateAdmin, (req, res) => {
  try {
    const stats = dbOperations.getStats();
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('[Stats Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch statistics.' });
  }
});

// GET /api/enquiries/export/csv - Export all enquiries to CSV
router.get('/export/csv', authenticateAdmin, (req, res) => {
  try {
    const list = dbOperations.getEnquiries();

    // Generate CSV content
    const headers = ['Reference ID', 'Parent Name', 'Student Name', 'Phone', 'Email', 'Grade', 'Type', 'Status', 'Message', 'Staff Notes', 'Date'];
    const rows = list.map(item => [
      `"${item.ref_id}"`,
      `"${(item.parent_name || '').replace(/"/g, '""')}"`,
      `"${(item.student_name || '').replace(/"/g, '""')}"`,
      `"${item.phone}"`,
      `"${item.email || ''}"`,
      `"${item.grade || ''}"`,
      `"${item.enquiry_type}"`,
      `"${item.status}"`,
      `"${(item.message || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${(item.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${item.created_at}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="frontline_enquiries_${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(csvContent);
  } catch (err) {
    console.error('[Export Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to generate CSV export.' });
  }
});

// GET /api/enquiries - List all enquiries with search & filters
router.get('/', authenticateAdmin, (req, res) => {
  try {
    const { status, grade, search, limit, offset } = req.query;
    const enquiries = dbOperations.getEnquiries({
      status,
      grade,
      search,
      limit,
      offset
    });
    return res.json({
      success: true,
      count: enquiries.length,
      enquiries
    });
  } catch (err) {
    console.error('[Fetch Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load enquiries.' });
  }
});

// GET /api/enquiries/:id - Single enquiry details
router.get('/:id', authenticateAdmin, (req, res) => {
  try {
    const enquiry = dbOperations.getEnquiryById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }
    return res.json({ success: true, enquiry });
  } catch (err) {
    console.error('[Details Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch enquiry.' });
  }
});

// PATCH /api/enquiries/:id - Update status and notes
router.patch('/:id', authenticateAdmin, (req, res) => {
  try {
    const { status, notes } = req.body;
    const existing = dbOperations.getEnquiryById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    const updated = dbOperations.updateEnquiry(req.params.id, { status, notes });
    return res.json({
      success: true,
      message: 'Enquiry updated successfully.',
      enquiry: updated
    });
  } catch (err) {
    console.error('[Update Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update enquiry.' });
  }
});

// DELETE /api/enquiries/:id - Delete enquiry
router.delete('/:id', authenticateAdmin, (req, res) => {
  try {
    const existing = dbOperations.getEnquiryById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    dbOperations.deleteEnquiry(req.params.id);
    return res.json({
      success: true,
      message: `Enquiry ${existing.ref_id} deleted successfully.`
    });
  } catch (err) {
    console.error('[Delete Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete enquiry.' });
  }
});

module.exports = router;
