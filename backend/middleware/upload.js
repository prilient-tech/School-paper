const multer = require('multer');
const path = require('path');
const { sanitizeFilename } = require('../utils/fileUtils');

// Custom storage for multer that automatically sanitizes filenames
const createSanitizedStorage = (destination) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destination);
    },
    filename: (req, file, cb) => {
      // Sanitize the filename
      const sanitizedName = sanitizeFilename(file.originalname);
      cb(null, sanitizedName);
    }
  });
};

// PDF upload configuration
const pdfUpload = multer({
  storage: createSanitizedStorage('./uploads'),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Image upload configuration
const imageUpload = multer({
  storage: createSanitizedStorage('./uploads'),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB per file
    files: 20 // Maximum 20 images at once
  },
  fileFilter: (req, file, cb) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, GIF, WebP) are allowed'), false);
    }
  }
});

// Generic file upload configuration
const genericUpload = multer({
  storage: createSanitizedStorage('./uploads'),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  }
});

module.exports = {
  pdfUpload,
  imageUpload,
  genericUpload,
  createSanitizedStorage
};
