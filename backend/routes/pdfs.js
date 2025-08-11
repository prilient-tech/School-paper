const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const Pdf = require('../models/Pdf');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const { requireTeacher } = require('../middleware/auth');
const pdfService = require('../services/pdfService');
const queueService = require('../services/queueService');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
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

// @route   GET /api/pdfs
// @desc    Get all PDFs (with pagination and filtering)
// @access  Private (Admin, Teacher)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    
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
    
    // Filter by question generation status
    if (req.query.questionGenerationStatus) {
      filter.questionGenerationStatus = req.query.questionGenerationStatus;
    }
    
    // Filter by uploader (for teachers)
    if (req.user.role === 'teacher') {
      filter.uploadedBy = req.user.id;
    }
    
    // Search by title
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' };
    }

    const pdfs = await Pdf.find(filter)
      .populate('subject', 'name code')
      .populate('chapter', 'name number')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Pdf.countDocuments(filter);

    res.json({
      success: true,
      data: pdfs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get PDFs error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/pdfs/:id
// @desc    Get PDF by ID
// @access  Private (Admin, Teacher)
router.get('/:id', async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('chapter', 'name number')
      .populate('uploadedBy', 'name email')
      .populate('generatedQuestions', 'question type difficulty topic');

    if (!pdf) {
      return res.status(404).json({ 
        success: false, 
        message: 'PDF not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && pdf.uploadedBy._id.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    res.json({
      success: true,
      data: pdf
    });
  } catch (error) {
    logger.error('Get PDF error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/pdfs
// @desc    Upload and process PDF
// @access  Private (Admin, Teacher)
router.post('/', [
  requireTeacher,
  upload.single('pdf'),
  body('title', 'Title is required').not().isEmpty(),
  body('subject', 'Subject is required').isMongoId(),
  body('chapter', 'Chapter is required').isMongoId(),
  body('description').optional(),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'PDF file is required' 
      });
    }

    const { title, subject, chapter, description, tags, questionTypes, difficulty, questionCount } = req.body;

    // Validate subject and chapter
    const [subjectExists, chapterExists] = await Promise.all([
      Subject.findById(subject),
      Chapter.findById(chapter)
    ]);

    if (!subjectExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Subject not found' 
      });
    }

    if (!chapterExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Chapter not found' 
      });
    }

    // Validate PDF file
    try {
      pdfService.validatePDFFile(req.file);
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }

    // Save file
    const fileInfo = await pdfService.saveUploadedFile(req.file);

    // Create PDF record
    const pdf = new Pdf({
      title,
      filename: fileInfo.filename,
      originalName: fileInfo.originalName,
      filePath: fileInfo.filePath,
      fileSize: fileInfo.fileSize,
      mimeType: fileInfo.mimeType,
      subject,
      chapter,
      uploadedBy: req.user.id,
      description: description || '',
      tags: tags || []
    });

    await pdf.save();

    // Add to processing queue
    const job = await queueService.addPDFProcessingJob({
      pdfId: pdf._id,
      chunkSize: 1000,
      questionTypes: questionTypes ? JSON.parse(questionTypes) : ['mcq', 'short_answer'],
      difficulty: difficulty || 'medium',
      questionCount: questionCount ? parseInt(questionCount) : 10
    });

    logger.info(`PDF uploaded: ${title} by ${req.user.email}`);

    // Send immediate response to prevent timeout
    res.status(201).json({
      success: true,
      data: pdf,
      jobId: job.id,
      message: 'PDF uploaded successfully. Questions are being generated in the background.',
      status: 'processing'
    });

    // Continue processing in background
    logger.info(`Starting background processing for PDF: ${pdf._id}`);
  } catch (error) {
    logger.error('Upload PDF error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/pdfs/:id
// @desc    Update PDF metadata
// @access  Private (Admin, Teacher)
router.put('/:id', [
  requireTeacher,
  body('title', 'Title is required').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { title, description, tags, isPublic } = req.body;

    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ 
        success: false, 
        message: 'PDF not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && pdf.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Update PDF
    pdf.title = title;
    pdf.description = description !== undefined ? description : pdf.description;
    pdf.tags = tags || pdf.tags;
    pdf.isPublic = isPublic !== undefined ? isPublic : pdf.isPublic;

    await pdf.save();

    logger.info(`PDF updated: ${title} by ${req.user.email}`);

    res.json({
      success: true,
      data: pdf
    });
  } catch (error) {
    logger.error('Update PDF error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/pdfs/:id
// @desc    Delete PDF
// @access  Private (Admin, Teacher)
router.delete('/:id', requireTeacher, async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    
    if (!pdf) {
      return res.status(404).json({ 
        success: false, 
        message: 'PDF not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && pdf.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Delete file from storage
    await pdfService.deleteFile(pdf.filePath);

    // Delete PDF record
    await Pdf.findByIdAndDelete(req.params.id);

    logger.info(`PDF deleted: ${pdf.title} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'PDF deleted successfully'
    });
  } catch (error) {
    logger.error('Delete PDF error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/pdfs/:id/regenerate-questions
// @desc    Regenerate questions for PDF
// @access  Private (Admin, Teacher)
router.post('/:id/regenerate-questions', [
  requireTeacher,
  body('questionTypes').optional().isArray(),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  body('count').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { questionTypes, difficulty, count } = req.body;

    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ 
        success: false, 
        message: 'PDF not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && pdf.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Check if PDF is processed
    if (pdf.processingStatus !== 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'PDF must be processed before generating questions' 
      });
    }

    // Add question generation job
    const job = await queueService.addQuestionGenerationJob({
      pdfId: pdf._id,
      subject: pdf.subject,
      chapter: pdf.chapter,
      questionTypes: questionTypes || ['mcq', 'short_answer'],
      difficulty: difficulty || 'medium',
      count: count || 10
    });

    logger.info(`Question regeneration started for PDF: ${pdf.title}`);

    res.json({
      success: true,
      message: 'Question regeneration started',
      jobId: job.id
    });
  } catch (error) {
    logger.error('Regenerate questions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/pdfs/:id/preview
// @desc    Get PDF preview
// @access  Private (Admin, Teacher)
router.get('/:id/preview', async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ 
        success: false, 
        message: 'PDF not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && pdf.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const preview = await pdfService.generatePreview(pdf.filePath, 3);

    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    logger.error('Get PDF preview error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/pdfs/:id/statistics
// @desc    Get PDF statistics
// @access  Private (Admin, Teacher)
router.get('/:id/statistics', async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('chapter', 'name number');

    if (!pdf) {
      return res.status(404).json({ 
        success: false, 
        message: 'PDF not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && pdf.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const statistics = await pdfService.getPDFStatistics(pdf.filePath);

    res.json({
      success: true,
      data: {
        ...statistics,
        processingStatus: pdf.processingStatus,
        questionGenerationStatus: pdf.questionGenerationStatus,
        generatedQuestions: pdf.generatedQuestions.length
      }
    });
  } catch (error) {
    logger.error('Get PDF statistics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/pdfs/:id/job-status
// @desc    Get PDF processing job status
// @access  Private (Admin, Teacher)
router.get('/:id/job-status', async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ 
        success: false, 
        message: 'PDF not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && pdf.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Get queue statistics
    const queueStats = await queueService.getQueueStats();

    res.json({
      success: true,
      data: {
        processingStatus: pdf.processingStatus,
        questionGenerationStatus: pdf.questionGenerationStatus,
        queueStats
      }
    });
  } catch (error) {
    logger.error('Get job status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Get PDF processing status
// @route   GET /api/pdfs/:id/status
// @desc    Get PDF processing status
// @access  Private
router.get('/:id/status', requireTeacher, async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ 
        success: false, 
        message: 'PDF not found' 
      });
    }

    res.json({
      success: true,
      data: {
        id: pdf._id,
        status: pdf.processingStatus,
        progress: pdf.progress || 0,
        totalQuestions: pdf.totalQuestions || 0,
        generatedQuestions: pdf.generatedQuestions || 0,
        error: pdf.processingError || null
      }
    });
  } catch (error) {
    logger.error('Get PDF status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
