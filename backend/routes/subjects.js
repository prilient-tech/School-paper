const express = require('express');
const { body, validationResult } = require('express-validator');
const Subject = require('../models/Subject');
const { requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/subjects
// @desc    Get all subjects (with pagination and filtering)
// @access  Private (Admin, Teacher)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { isActive: true };
    
    // Filter by grade
    if (req.query.grade) {
      filter.grade = req.query.grade;
    }
    
    // Search by name or code
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { code: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const subjects = await Subject.find(filter)
      .populate('assignedTeachers', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Subject.countDocuments(filter);

    res.json({
      success: true,
      data: subjects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get subjects error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/subjects/:id
// @desc    Get subject by ID
// @access  Private (Admin, Teacher)
router.get('/:id', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('assignedTeachers', 'name email')
      .populate('createdBy', 'name email');

    if (!subject) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subject not found' 
      });
    }

    res.json({
      success: true,
      data: subject
    });
  } catch (error) {
    logger.error('Get subject error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/subjects
// @desc    Create a new subject
// @access  Private (Admin, Super Admin)
router.post('/', [
  requireAdmin,
  body('name', 'Subject name is required').not().isEmpty(),
  body('code', 'Subject code is required').not().isEmpty(),
  body('grade', 'Grade is required').isIn(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'college'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, code, description, grade, assignedTeachers } = req.body;

    // Check if subject code already exists
    const existingSubject = await Subject.findOne({ code: code.toUpperCase() });
    if (existingSubject) {
      return res.status(400).json({ 
        success: false, 
        message: 'Subject code already exists' 
      });
    }

    const subject = new Subject({
      name,
      code: code.toUpperCase(),
      description,
      grade,
      assignedTeachers: assignedTeachers || [],
      createdBy: req.user.id
    });

    await subject.save();

    logger.info(`New subject created: ${name} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: subject
    });
  } catch (error) {
    logger.error('Create subject error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/subjects/:id
// @desc    Update subject
// @access  Private (Admin, Super Admin)
router.put('/:id', [
  requireAdmin,
  body('name', 'Subject name is required').not().isEmpty(),
  body('grade', 'Grade is required').isIn(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'college'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, description, grade, assignedTeachers, isActive } = req.body;

    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subject not found' 
      });
    }

    // Update subject
    subject.name = name;
    subject.description = description;
    subject.grade = grade;
    subject.assignedTeachers = assignedTeachers || subject.assignedTeachers;
    subject.isActive = isActive !== undefined ? isActive : subject.isActive;

    await subject.save();

    logger.info(`Subject updated: ${name} by ${req.user.email}`);

    res.json({
      success: true,
      data: subject
    });
  } catch (error) {
    logger.error('Update subject error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/subjects/:id
// @desc    Delete subject
// @access  Private (Admin, Super Admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subject not found' 
      });
    }

    // Check if subject has chapters or questions
    const Chapter = require('../models/Chapter');
    const Question = require('../models/Question');
    
    const chapterCount = await Chapter.countDocuments({ subject: subject._id });
    const questionCount = await Question.countDocuments({ subject: subject._id });

    if (chapterCount > 0 || questionCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete subject. It has ${chapterCount} chapters and ${questionCount} questions.` 
      });
    }

    await Subject.findByIdAndDelete(req.params.id);

    logger.info(`Subject deleted: ${subject.name} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Subject deleted successfully'
    });
  } catch (error) {
    logger.error('Delete subject error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/subjects/:id/assign-teachers
// @desc    Assign teachers to subject
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

    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subject not found' 
      });
    }

    subject.assignedTeachers = teachers;
    await subject.save();

    logger.info(`Teachers assigned to subject: ${subject.name}`);

    res.json({
      success: true,
      message: 'Teachers assigned successfully',
      data: subject
    });
  } catch (error) {
    logger.error('Assign teachers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/subjects/:id/statistics
// @desc    Get subject statistics
// @access  Private (Admin, Teacher)
router.get('/:id/statistics', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ 
        success: false, 
        message: 'Subject not found' 
      });
    }

    const Chapter = require('../models/Chapter');
    const Question = require('../models/Question');
    const Pdf = require('../models/Pdf');

    const [chapterCount, questionCount, pdfCount] = await Promise.all([
      Chapter.countDocuments({ subject: subject._id, isActive: true }),
      Question.countDocuments({ subject: subject._id, isActive: true }),
      Pdf.countDocuments({ subject: subject._id })
    ]);

    const statistics = {
      subject: subject.name,
      totalChapters: chapterCount,
      totalQuestions: questionCount,
      totalPdfs: pdfCount,
      assignedTeachers: subject.assignedTeachers.length
    };

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Get subject statistics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
