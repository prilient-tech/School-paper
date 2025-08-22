const path = require('path');

/**
 * Sanitize filename by removing spaces and special characters
 * @param {string} originalName - Original filename
 * @returns {string} - Sanitized filename
 */
const sanitizeFilename = (originalName) => {
  if (!originalName) return '';
  
  // Get file extension
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  
  // Remove spaces and special characters, keep only alphanumeric, dots, and hyphens
  const sanitizedName = nameWithoutExt
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .toLowerCase(); // Convert to lowercase
  
  // If sanitized name is empty, use a default
  const finalName = sanitizedName || 'file';
  
  // Add timestamp to ensure uniqueness
  const timestamp = Date.now();
  
  return `${finalName}_${timestamp}${ext}`;
};

/**
 * Generate a unique filename with original extension
 * @param {string} originalName - Original filename
 * @param {string} prefix - Optional prefix for the filename
 * @returns {string} - Unique sanitized filename
 */
const generateUniqueFilename = (originalName, prefix = '') => {
  if (!originalName) return '';
  
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  
  // Sanitize the name
  const sanitizedName = nameWithoutExt
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  
  const finalName = sanitizedName || 'file';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  return `${prefix}${finalName}_${timestamp}_${randomSuffix}${ext}`;
};

/**
 * Get file info from multer file object
 * @param {Object} file - Multer file object
 * @returns {Object} - File info object
 */
const getFileInfo = (file) => {
  const originalName = file.originalname;
  const sanitizedName = sanitizeFilename(originalName);
  const uniqueName = generateUniqueFilename(originalName);
  
  return {
    originalName,
    sanitizedName,
    uniqueName,
    extension: path.extname(originalName),
    mimeType: file.mimetype,
    size: file.size
  };
};

module.exports = {
  sanitizeFilename,
  generateUniqueFilename,
  getFileInfo
};
