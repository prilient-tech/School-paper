const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const Pdf = require('../models/Pdf');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const { requireTeacher } = require('../middleware/auth');
const imageService = require('../services/imageService');
const logger = require('../utils/logger');

const router = express.Router();

// Import sanitized upload middleware
const { imageUpload } = require('../middleware/upload');

// @route   GET /api/images
// @desc    Get all image uploads (converted to PDFs)
// @access  Private (Admin, Teacher)
router.get('/', requireTeacher, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { source: 'images' }; // Only show PDFs created from images
    
    // Filter by subject
    if (req.query.subject) {
      filter.subject = req.query.subject;
    }
    
    // Filter by chapter
    if (req.query.chapter) {
      filter.chapter = req.query.chapter;
    }
    
    // Filter by processing status
    if (req.query.processingStatus) {
      filter.processingStatus = req.query.processingStatus;
    }
    
    // Filter by uploader (for teachers)
    if (req.user.role === 'teacher') {
      filter.uploadedBy = req.user.id;
    }
    
    // Search by title
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' };
    }

    const images = await Pdf.find(filter)
      .populate('subject', 'name code')
      .populate('chapter', 'name number')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Pdf.countDocuments(filter);

    res.json({
      success: true,
      data: images,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get images error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/images
// @desc    Upload multiple images and convert to PDF
// @access  Private (Teacher)
router.post('/', 
  requireTeacher,
  imageUpload.array('images', 20), // Maximum 20 images
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('subject').isMongoId().withMessage('Valid subject is required'),
    body('chapter').isMongoId().withMessage('Valid chapter is required')
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No images were uploaded'
        });
      }

      // Validate subject and chapter exist
      const subject = await Subject.findById(req.body.subject);
      const chapter = await Chapter.findById(req.body.chapter);

      if (!subject) {
        return res.status(400).json({
          success: false,
          message: 'Subject not found'
        });
      }

      if (!chapter) {
        return res.status(400).json({
          success: false,
          message: 'Chapter not found'
        });
      }

      // Create PDF record first
      const pdf = new Pdf({
        title: req.body.title,
        subject: req.body.subject,
        chapter: req.body.chapter,
        uploadedBy: req.user.id,
        source: 'images', // Mark as created from images
        processingStatus: 'processing',
        questionGenerationStatus: 'pending',
        originalImages: req.files.map(file => ({
          filename: file.filename, // Already sanitized by middleware
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        }))
      });

      await pdf.save();

      // Convert images to PDF asynchronously
      logger.info(`Starting async PDF conversion for PDF ID: ${pdf._id}`);
      imageService.convertImagesToPDF(req.files, pdf._id)
        .then(async (pdfUrl) => {
          logger.info(`PDF conversion completed, URL: ${pdfUrl}`);
          // Update PDF record with the generated PDF URL
          await Pdf.findByIdAndUpdate(pdf._id, {
            pdfUrl,
            processingStatus: 'completed',
            questionGenerationStatus: 'ready'
          });
          logger.info(`Images converted to PDF successfully: ${pdf._id}`);
        })
        .catch(async (error) => {
          logger.error('Image to PDF conversion error:', error);
          await Pdf.findByIdAndUpdate(pdf._id, {
            processingStatus: 'failed',
            questionGenerationStatus: 'failed'
          });
        });

      res.json({
        success: true,
        message: 'Images uploaded successfully. PDF conversion in progress.',
        data: {
          id: pdf._id,
          title: pdf.title,
          status: 'processing'
        }
      });

    } catch (error) {
      logger.error('Upload images error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @route   GET /api/images/:id
// @desc    Get image upload by ID
// @access  Private (Admin, Teacher)
router.get('/:id', requireTeacher, async (req, res) => {
  try {
    const image = await Pdf.findOne({ 
      _id: req.params.id, 
      source: 'images' 
    })
    .populate('subject', 'name code')
    .populate('chapter', 'name number')
    .populate('uploadedBy', 'name email');

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image upload not found'
      });
    }

    // Check if teacher can access this image
    if (req.user.role === 'teacher' && image.uploadedBy._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: image
    });
  } catch (error) {
    logger.error('Get image by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/images/:id
// @desc    Delete image upload
// @access  Private (Admin, Teacher)
router.delete('/:id', requireTeacher, async (req, res) => {
  try {
    const image = await Pdf.findOne({ 
      _id: req.params.id, 
      source: 'images' 
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image upload not found'
      });
    }

    // Check if teacher can delete this image
    if (req.user.role === 'teacher' && image.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Delete the PDF file if it exists
    if (image.pdfUrl) {
      try {
        await imageService.deletePDFFile(image.pdfUrl);
      } catch (deleteError) {
        logger.error('Error deleting PDF file:', deleteError);
      }
    }

    await Pdf.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Image upload deleted successfully'
    });
  } catch (error) {
    logger.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 