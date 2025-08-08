const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const logger = require('../utils/logger');

class ImageService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../uploads');
    this.ensureUploadDir();
  }

  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch (error) {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Convert multiple images to a single PDF
   * @param {Array} imageFiles - Array of multer file objects
   * @param {string} pdfId - MongoDB ID of the PDF record
   * @returns {Promise<string>} - URL/path to the generated PDF
   */
  async convertImagesToPDF(imageFiles, pdfId) {
    try {
      logger.info(`Starting PDF conversion for ${imageFiles.length} images, PDF ID: ${pdfId}`);

      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      
      // Process each image and add to PDF
      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];
        logger.info(`Processing image ${i + 1}/${imageFiles.length}: ${imageFile.originalname}`);

        try {
          // Convert image to PNG format for better compatibility
          const processedImageBuffer = await this.processImage(imageFile.buffer);
          
          // Embed the image in the PDF
          const image = await pdfDoc.embedPng(processedImageBuffer);
          
          // Get image dimensions
          const { width, height } = image.scale(1);
          
          // Create a new page with the image dimensions
          const page = pdfDoc.addPage([width, height]);
          
          // Draw the image on the page
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: width,
            height: height,
          });

          logger.info(`Successfully added image ${i + 1} to PDF`);
        } catch (imageError) {
          logger.error(`Error processing image ${i + 1}: ${imageError.message}`);
          // Continue with other images even if one fails
        }
      }

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      const pdfFileName = `images_${pdfId}_${Date.now()}.pdf`;
      const pdfPath = path.join(this.uploadDir, pdfFileName);
      
      await fs.writeFile(pdfPath, pdfBytes);
      
      logger.info(`PDF created successfully: ${pdfPath}`);
      
      // Return the relative path for storage in database
      return `/uploads/${pdfFileName}`;

    } catch (error) {
      logger.error('Error converting images to PDF:', error);
      throw new Error('Failed to convert images to PDF');
    }
  }

  /**
   * Process image to ensure compatibility with PDF
   * @param {Buffer} imageBuffer - Raw image buffer
   * @returns {Promise<Buffer>} - Processed PNG buffer
   */
  async processImage(imageBuffer) {
    try {
      // Use sharp to process the image
      const processedBuffer = await sharp(imageBuffer)
        .png() // Convert to PNG for better PDF compatibility
        .resize(800, 600, { // Resize to reasonable dimensions
          fit: 'inside',
          withoutEnlargement: true
        })
        .toBuffer();

      return processedBuffer;
    } catch (error) {
      logger.error('Error processing image:', error);
      throw new Error('Failed to process image');
    }
  }

  /**
   * Delete PDF file from filesystem
   * @param {string} pdfUrl - URL/path to the PDF file
   */
  async deletePDFFile(pdfUrl) {
    try {
      const filePath = path.join(__dirname, '..', pdfUrl);
      await fs.unlink(filePath);
      logger.info(`PDF file deleted: ${filePath}`);
    } catch (error) {
      logger.error('Error deleting PDF file:', error);
      throw error;
    }
  }

  /**
   * Get PDF file path for serving
   * @param {string} pdfUrl - URL/path to the PDF file
   * @returns {string} - Absolute file path
   */
  getPDFFilePath(pdfUrl) {
    return path.join(__dirname, '..', pdfUrl);
  }

  /**
   * Validate image file
   * @param {Object} file - Multer file object
   * @returns {boolean} - Whether file is valid
   */
  validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return validTypes.includes(file.mimetype);
  }
}

module.exports = new ImageService(); 