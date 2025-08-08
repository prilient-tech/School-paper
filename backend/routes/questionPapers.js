const express = require('express');
const { body, validationResult } = require('express-validator');
const QuestionPaper = require('../models/QuestionPaper');
const Question = require('../models/Question');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const { requireTeacher } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/question-papers
// @desc    Get all question papers (with pagination and filtering)
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
    
    // Filter by difficulty
    if (req.query.difficulty) {
      filter.difficulty = req.query.difficulty;
    }
    
    // Filter by creator (for teachers)
    if (req.user.role === 'teacher') {
      filter.createdBy = req.user.id;
    }
    
    // Search by title
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' };
    }

    const questionPapers = await QuestionPaper.find(filter)
      .populate('subject', 'name code')
      .populate('chapters', 'name number')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await QuestionPaper.countDocuments(filter);

    res.json({
      success: true,
      data: questionPapers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get question papers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/question-papers/:id
// @desc    Get question paper by ID
// @access  Private (Admin, Teacher)
router.get('/:id', async (req, res) => {
  try {
    const questionPaper = await QuestionPaper.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('chapters', 'name number')
      .populate('createdBy', 'name email')
      .populate({
        path: 'questions.question',
        populate: [
          { path: 'subject', select: 'name code' },
          { path: 'chapter', select: 'name number' }
        ]
      });

    if (!questionPaper) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question paper not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && questionPaper.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    res.json({
      success: true,
      data: questionPaper
    });
  } catch (error) {
    logger.error('Get question paper error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/question-papers
// @desc    Create a new question paper
// @access  Private (Admin, Teacher)
router.post('/', [
  requireTeacher,
  body('title', 'Title is required').not().isEmpty(),
  body('subject', 'Subject is required').isMongoId(),
  body('duration', 'Duration is required').isInt({ min: 15, max: 300 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { 
      title, 
      description, 
      subject, 
      chapters, 
      questions, 
      duration, 
      instructions, 
      difficulty 
    } = req.body;

    // Validate subject
    const subjectExists = await Subject.findById(subject);
    if (!subjectExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Subject not found' 
      });
    }

    // Validate chapters if provided
    if (chapters && chapters.length > 0) {
      const Chapter = require('../models/Chapter');
      const chapterExists = await Chapter.find({ _id: { $in: chapters } });
      if (chapterExists.length !== chapters.length) {
        return res.status(400).json({ 
          success: false, 
          message: 'One or more chapters not found' 
        });
      }
    }

    // Validate questions if provided
    if (questions && questions.length > 0) {
      const questionIds = questions.map(q => q.question);
      const questionExists = await Question.find({ _id: { $in: questionIds } });
      if (questionExists.length !== questionIds.length) {
        return res.status(400).json({ 
          success: false, 
          message: 'One or more questions not found' 
        });
      }
    }

    const questionPaper = new QuestionPaper({
      title,
      description: description || '',
      subject,
      chapters: chapters || [],
      questions: questions || [],
      duration,
      instructions: instructions || '',
      difficulty: difficulty || 'mixed',
      createdBy: req.user.id
    });

    await questionPaper.save();

    logger.info(`New question paper created: ${title} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: questionPaper
    });
  } catch (error) {
    logger.error('Create question paper error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/question-papers/:id
// @desc    Update question paper
// @access  Private (Admin, Teacher)
router.put('/:id', [
  requireTeacher,
  body('title', 'Title is required').not().isEmpty(),
  body('duration', 'Duration is required').isInt({ min: 15, max: 300 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { 
      title, 
      description, 
      chapters, 
      questions, 
      duration, 
      instructions, 
      difficulty 
    } = req.body;

    const questionPaper = await QuestionPaper.findById(req.params.id);
    if (!questionPaper) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question paper not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && questionPaper.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Save previous version
    questionPaper.previousVersions.push({
      version: questionPaper.version,
      questions: questionPaper.questions,
      totalMarks: questionPaper.totalMarks,
      updatedAt: new Date()
    });

    // Update question paper
    questionPaper.title = title;
    questionPaper.description = description !== undefined ? description : questionPaper.description;
    questionPaper.chapters = chapters || questionPaper.chapters;
    questionPaper.questions = questions || questionPaper.questions;
    questionPaper.duration = duration;
    questionPaper.instructions = instructions !== undefined ? instructions : questionPaper.instructions;
    questionPaper.difficulty = difficulty || questionPaper.difficulty;
    questionPaper.version += 1;

    await questionPaper.save();

    logger.info(`Question paper updated: ${title} by ${req.user.email}`);

    res.json({
      success: true,
      data: questionPaper
    });
  } catch (error) {
    logger.error('Update question paper error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/question-papers/:id
// @desc    Delete question paper
// @access  Private (Admin, Teacher)
router.delete('/:id', requireTeacher, async (req, res) => {
  try {
    const questionPaper = await QuestionPaper.findById(req.params.id);
    
    if (!questionPaper) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question paper not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && questionPaper.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    await QuestionPaper.findByIdAndDelete(req.params.id);

    logger.info(`Question paper deleted: ${questionPaper.title} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Question paper deleted successfully'
    });
  } catch (error) {
    logger.error('Delete question paper error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/question-papers/:id/add-questions
// @desc    Add questions to question paper
// @access  Private (Admin, Teacher)
router.post('/:id/add-questions', [
  requireTeacher,
  body('questions', 'Questions array is required').isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { questions } = req.body;

    const questionPaper = await QuestionPaper.findById(req.params.id);
    if (!questionPaper) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question paper not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && questionPaper.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Validate questions
    const questionIds = questions.map(q => q.question);
    const questionExists = await Question.find({ _id: { $in: questionIds } });
    if (questionExists.length !== questionIds.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'One or more questions not found' 
      });
    }

    // Add questions to question paper
    questionPaper.questions.push(...questions);
    await questionPaper.save();

    logger.info(`Questions added to question paper: ${questionPaper.title}`);

    res.json({
      success: true,
      message: 'Questions added successfully',
      data: questionPaper
    });
  } catch (error) {
    logger.error('Add questions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/question-papers/:id/remove-questions
// @desc    Remove questions from question paper
// @access  Private (Admin, Teacher)
router.post('/:id/remove-questions', [
  requireTeacher,
  body('questionIds', 'Question IDs array is required').isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { questionIds } = req.body;

    const questionPaper = await QuestionPaper.findById(req.params.id);
    if (!questionPaper) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question paper not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && questionPaper.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Remove questions from question paper
    questionPaper.questions = questionPaper.questions.filter(
      q => !questionIds.includes(q.question.toString())
    );
    await questionPaper.save();

    logger.info(`Questions removed from question paper: ${questionPaper.title}`);

    res.json({
      success: true,
      message: 'Questions removed successfully',
      data: questionPaper
    });
  } catch (error) {
    logger.error('Remove questions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/question-papers/:id/reorder-questions
// @desc    Reorder questions in question paper
// @access  Private (Admin, Teacher)
router.post('/:id/reorder-questions', [
  requireTeacher,
  body('questionOrder', 'Question order array is required').isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { questionOrder } = req.body;

    const questionPaper = await QuestionPaper.findById(req.params.id);
    if (!questionPaper) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question paper not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && questionPaper.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Reorder questions
    const reorderedQuestions = [];
    for (const orderItem of questionOrder) {
      const question = questionPaper.questions.find(q => q.question.toString() === orderItem.questionId);
      if (question) {
        question.order = orderItem.order;
        reorderedQuestions.push(question);
      }
    }

    questionPaper.questions = reorderedQuestions;
    await questionPaper.save();

    logger.info(`Questions reordered in question paper: ${questionPaper.title}`);

    res.json({
      success: true,
      message: 'Questions reordered successfully',
      data: questionPaper
    });
  } catch (error) {
    logger.error('Reorder questions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/question-papers/:id/export
// @desc    Export question paper to PDF
// @access  Private (Admin, Teacher)
router.post('/:id/export', [
  requireTeacher,
  body('format', 'Format is required').isIn(['pdf', 'json'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { format } = req.body;

    const questionPaper = await QuestionPaper.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('chapters', 'name number')
      .populate({
        path: 'questions.question',
        populate: [
          { path: 'subject', select: 'name code' },
          { path: 'chapter', select: 'name number' }
        ]
      });

    if (!questionPaper) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question paper not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && questionPaper.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Add export history
    questionPaper.exportHistory.push({
      exportedAt: new Date(),
      exportedBy: req.user.id,
      format
    });

    await questionPaper.save();

    if (format === 'json') {
      res.json({
        success: true,
        data: questionPaper
      });
    } else {
      // TODO: Implement PDF export
      res.status(400).json({
        success: false,
        message: 'PDF export not implemented yet'
      });
    }
  } catch (error) {
    logger.error('Export question paper error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/question-papers/:id/statistics
// @desc    Get question paper statistics
// @access  Private (Admin, Teacher)
router.get('/:id/statistics', async (req, res) => {
  try {
    const questionPaper = await QuestionPaper.findById(req.params.id)
      .populate('subject', 'name code');

    if (!questionPaper) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question paper not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && questionPaper.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const statistics = {
      title: questionPaper.title,
      subject: questionPaper.subject.name,
      totalQuestions: questionPaper.statistics.totalQuestions,
      totalMarks: questionPaper.totalMarks,
      duration: questionPaper.duration,
      difficulty: questionPaper.difficulty,
      exportCount: questionPaper.exportHistory.length,
      version: questionPaper.version
    };

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Get question paper statistics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
