const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateAdmin } = require('../middleware/auth');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, 'photo-' + uniqueSuffix + ext);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif|svg/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mime = file.mimetype.toLowerCase();

  if (allowed.test(ext) || allowed.test(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WEBP, GIF, SVG) are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB limit
  fileFilter: fileFilter
});

// POST /api/upload - Upload an image (protected for admin)
router.post('/', authenticateAdmin, upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    console.log(`[Upload] New image uploaded: ${fileUrl} (${req.file.size} bytes)`);

    return res.json({
      success: true,
      message: 'Photo uploaded successfully.',
      url: fileUrl,
      filename: req.file.filename
    });
  } catch (err) {
    console.error('[Upload Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to process uploaded file.' });
  }
});

module.exports = router;
