const express = require('express');
const { body, validationResult } = require('express-validator');
const Chapter = require('../models/Chapter');
const Subject = require('../models/Subject');
const { requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/chapters
// @desc    Get all chapters (with pagination and filtering)
// @access  Private (Admin, Teacher)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { isActive: true };
    
    // Filter by subject
    if (req.query.subject) {
      filter.subject = req.query.subject;
    }
    
    // Filter by chapter number
    if (req.query.number) {
      filter.number = parseInt(req.query.number);
    }
    
    // Search by name
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }

    const chapters = await Chapter.find(filter)
      .populate('subject', 'name code')
      .populate('assignedTeachers', 'name email')
      .populate('createdBy', 'name email')
      .sort({ 'subject.name': 1, number: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Chapter.countDocuments(filter);

    res.json({
      success: true,
      data: chapters,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get chapters error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/chapters/:id
// @desc    Get chapter by ID
// @access  Private (Admin, Teacher)
router.get('/:id', async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('assignedTeachers', 'name email')
      .populate('createdBy', 'name email');

    if (!chapter) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chapter not found' 
      });
    }

    res.json({
      success: true,
      data: chapter
    });
  } catch (error) {
    logger.error('Get chapter error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/chapters
// @desc    Create a new chapter
// @access  Private (Admin, Super Admin)
router.post('/', [
  requireAdmin,
  body('name', 'Chapter name is required').not().isEmpty(),
  body('number', 'Chapter number is required').isInt({ min: 1 }),
  body('subject', 'Subject is required').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, number, description, subject, topics, assignedTeachers } = req.body;

    // Check if subject exists
    const subjectExists = await Subject.findById(subject);
    if (!subjectExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Subject not found' 
      });
    }

    // Check if chapter number already exists for this subject
    const existingChapter = await Chapter.findOne({ 
      subject, 
      number: parseInt(number) 
    });
    if (existingChapter) {
      return res.status(400).json({ 
        success: false, 
        message: `Chapter ${number} already exists for this subject` 
      });
    }

    const chapter = new Chapter({
      name,
      number: parseInt(number),
      description,
      subject,
      topics: topics || [],
      assignedTeachers: assignedTeachers || [],
      createdBy: req.user.id
    });

    await chapter.save();

    logger.info(`New chapter created: ${name} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: chapter
    });
  } catch (error) {
    logger.error('Create chapter error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/chapters/:id
// @desc    Update chapter
// @access  Private (Admin, Super Admin)
router.put('/:id', [
  requireAdmin,
  body('name', 'Chapter name is required').not().isEmpty(),
  body('number', 'Chapter number is required').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, number, description, topics, assignedTeachers, isActive } = req.body;

    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chapter not found' 
      });
    }

    // Check if new chapter number conflicts with existing chapters
    if (number && number !== chapter.number) {
      const existingChapter = await Chapter.findOne({ 
        subject: chapter.subject, 
        number: parseInt(number),
        _id: { $ne: chapter._id }
      });
      if (existingChapter) {
        return res.status(400).json({ 
          success: false, 
          message: `Chapter ${number} already exists for this subject` 
        });
      }
    }

    // Update chapter
    chapter.name = name;
    chapter.number = number ? parseInt(number) : chapter.number;
    chapter.description = description;
    chapter.topics = topics || chapter.topics;
    chapter.assignedTeachers = assignedTeachers || chapter.assignedTeachers;
    chapter.isActive = isActive !== undefined ? isActive : chapter.isActive;

    await chapter.save();

    logger.info(`Chapter updated: ${name} by ${req.user.email}`);

    res.json({
      success: true,
      data: chapter
    });
  } catch (error) {
    logger.error('Update chapter error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/chapters/:id
// @desc    Delete chapter
// @access  Private (Admin, Super Admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);
    
    if (!chapter) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chapter not found' 
      });
    }

    // Check if chapter has questions or PDFs
    const Question = require('../models/Question');
    const Pdf = require('../models/Pdf');
    
    const questionCount = await Question.countDocuments({ chapter: chapter._id });
    const pdfCount = await Pdf.countDocuments({ chapter: chapter._id });

    if (questionCount > 0 || pdfCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete chapter. It has ${questionCount} questions and ${pdfCount} PDFs.` 
      });
    }

    await Chapter.findByIdAndDelete(req.params.id);

    logger.info(`Chapter deleted: ${chapter.name} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Chapter deleted successfully'
    });
  } catch (error) {
    logger.error('Delete chapter error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/chapters/:id/assign-teachers
// @desc    Assign teachers to chapter
// @access  Private (Admin, Super Admin)
router.post('/:id/assign-teachers', [
  requireAdmin,
  body('teachers', 'Teachers array is required').isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { teachers } = req.body;

    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chapter not found' 
      });
    }

    chapter.assignedTeachers = teachers;
    await chapter.save();

    logger.info(`Teachers assigned to chapter: ${chapter.name}`);

    res.json({
      success: true,
      message: 'Teachers assigned successfully',
      data: chapter
    });
  } catch (error) {
    logger.error('Assign teachers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/chapters/:id/statistics
// @desc    Get chapter statistics
// @access  Private (Admin, Teacher)
router.get('/:id/statistics', async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id)
      .populate('subject', 'name code');

    if (!chapter) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chapter not found' 
      });
    }

    const Question = require('../models/Question');
    const Pdf = require('../models/Pdf');

    const [questionCount, pdfCount] = await Promise.all([
      Question.countDocuments({ chapter: chapter._id, isActive: true }),
      Pdf.countDocuments({ chapter: chapter._id })
    ]);

    const statistics = {
      chapter: chapter.name,
      subject: chapter.subject.name,
      totalQuestions: questionCount,
      totalPdfs: pdfCount,
      assignedTeachers: chapter.assignedTeachers.length,
      topics: chapter.topics.length
    };

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Get chapter statistics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/chapters/subject/:subjectId
// @desc    Get chapters by subject
// @access  Private (Admin, Teacher)
router.get('/subject/:subjectId', async (req, res) => {
  try {
    const chapters = await Chapter.find({ 
      subject: req.params.subjectId, 
      isActive: true 
    })
    .populate('assignedTeachers', 'name email')
    .sort({ number: 1 });

    res.json({
      success: true,
      data: chapters
    });
  } catch (error) {
    logger.error('Get chapters by subject error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
