const express = require('express');
const router = express.Router();
const { dbOperations } = require('../db');
const { authenticateAdmin } = require('../middleware/auth');

// GET /api/content - Fetch all published content for the website
router.get('/', (req, res) => {
  try {
    const allContent = dbOperations.getAllContent();
    return res.json({
      success: true,
      content: allContent
    });
  } catch (err) {
    console.error('[Content Fetch Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load website content.' });
  }
});

// GET /api/content/:section - Fetch a specific section
router.get('/:section', (req, res) => {
  try {
    const data = dbOperations.getContent(req.params.section);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Content section not found.' });
    }
    return res.json({ success: true, section: req.params.section, data });
  } catch (err) {
    console.error('[Section Fetch Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load section.' });
  }
});

// PUT /api/content/:section - Update a specific section (Protected for Admin)
router.put('/:section', authenticateAdmin, (req, res) => {
  try {
    const section = req.params.section;
    const incomingData = req.body;

    if (!incomingData || typeof incomingData !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid content data payload.' });
    }

    const current = dbOperations.getContent(section) || {};
    const updated = { ...current, ...incomingData };

    dbOperations.updateContent(section, updated);
    console.log(`[CMS] Admin updated section '${section}'`);

    return res.json({
      success: true,
      message: `Section '${section}' updated successfully!`,
      data: updated
    });
  } catch (err) {
    console.error('[Content Update Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update section.' });
  }
});

// POST /api/content - Batch update multiple sections (Protected for Admin)
router.post('/', authenticateAdmin, (req, res) => {
  try {
    const sections = req.body;
    if (!sections || typeof sections !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid payload.' });
    }

    for (const [secKey, secData] of Object.entries(sections)) {
      if (typeof secData === 'object' && secData !== null) {
        const current = dbOperations.getContent(secKey) || {};
        dbOperations.updateContent(secKey, { ...current, ...secData });
      }
    }

    console.log('[CMS] Batch website content update completed.');
    return res.json({
      success: true,
      message: 'Website matter and photos updated successfully! Changes are live on the website.',
      content: dbOperations.getAllContent()
    });
  } catch (err) {
    console.error('[Batch Update Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to save website changes.' });
  }
});

// POST /api/content/reset - Reset content to default (Protected for Admin)
router.post('/reset', authenticateAdmin, (req, res) => {
  try {
    const resetData = dbOperations.resetAllContent();
    return res.json({
      success: true,
      message: 'Website content reset to factory default values.',
      content: resetData
    });
  } catch (err) {
    console.error('[Reset Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to reset content.' });
  }
});

module.exports = router;
