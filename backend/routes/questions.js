const express = require('express');
const { body, validationResult } = require('express-validator');
const Question = require('../models/Question');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const { requireTeacher } = require('../middleware/auth');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/questions
// @desc    Get all questions (with pagination and filtering)
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
    
    // Filter by chapter
    if (req.query.chapter) {
      filter.chapter = req.query.chapter;
    }
    
    // Filter by type
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    // Filter by difficulty
    if (req.query.difficulty) {
      filter.difficulty = req.query.difficulty;
    }
    
    // Filter by topic
    if (req.query.topic) {
      filter.topic = { $regex: req.query.topic, $options: 'i' };
    }
    
    // Filter by generator (for teachers)
    if (req.user.role === 'teacher') {
      filter.generatedBy = req.user.id;
    }
    
    // Search by question text
    if (req.query.search) {
      filter.question = { $regex: req.query.search, $options: 'i' };
    }

    const questions = await Question.find(filter)
      .populate('subject', 'name code')
      .populate('chapter', 'name number')
      .populate('generatedBy', 'name email')
      .populate('sourcePdf', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Question.countDocuments(filter);

    res.json({
      success: true,
      data: questions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get questions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/questions/:id
// @desc    Get question by ID
// @access  Private (Admin, Teacher)
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('chapter', 'name number')
      .populate('generatedBy', 'name email')
      .populate('sourcePdf', 'title');

    if (!question) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && question.generatedBy._id.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    logger.error('Get question error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/questions
// @desc    Create a new question manually
// @access  Private (Admin, Teacher)
router.post('/', [
  requireTeacher,
  body('question', 'Question text is required').not().isEmpty(),
  body('type', 'Question type is required').isIn(['mcq', 'short_answer', 'long_answer', 'true_false', 'fill_blank']),
  body('difficulty', 'Difficulty is required').isIn(['easy', 'medium', 'hard']),
  body('subject', 'Subject is required').isMongoId(),
  body('chapter', 'Chapter is required').isMongoId(),
  body('topic', 'Topic is required').not().isEmpty()
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
      question, 
      type, 
      difficulty, 
      subject, 
      chapter, 
      topic, 
      options, 
      correctAnswer, 
      explanation, 
      marks 
    } = req.body;

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

    // Validate MCQ options
    if (type === 'mcq') {
      if (!options || !Array.isArray(options) || options.length !== 4) {
        return res.status(400).json({ 
          success: false, 
          message: 'MCQ questions must have exactly 4 options' 
        });
      }
      
      const correctOptions = options.filter(opt => opt.isCorrect);
      if (correctOptions.length !== 1) {
        return res.status(400).json({ 
          success: false, 
          message: 'MCQ questions must have exactly one correct answer' 
        });
      }
    }

    // Validate True/False options
    if (type === 'true_false') {
      if (!options || !Array.isArray(options) || options.length !== 2) {
        return res.status(400).json({ 
          success: false, 
          message: 'True/False questions must have exactly 2 options' 
        });
      }
    }

    const questionDoc = new Question({
      question,
      type,
      difficulty,
      subject,
      chapter,
      topic,
      options: options || [],
      correctAnswer: correctAnswer || '',
      explanation: explanation || '',
      marks: marks || 1,
      generatedBy: req.user.id
    });

    await questionDoc.save();

    logger.info(`New question created manually: ${topic} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: questionDoc
    });
  } catch (error) {
    logger.error('Create question error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   PUT /api/questions/:id
// @desc    Update question
// @access  Private (Admin, Teacher)
router.put('/:id', [
  requireTeacher,
  body('question', 'Question text is required').not().isEmpty(),
  body('type', 'Question type is required').isIn(['mcq', 'short_answer', 'long_answer', 'true_false', 'fill_blank']),
  body('difficulty', 'Difficulty is required').isIn(['easy', 'medium', 'hard'])
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
      question, 
      type, 
      difficulty, 
      topic, 
      options, 
      correctAnswer, 
      explanation, 
      marks 
    } = req.body;

    const questionDoc = await Question.findById(req.params.id);
    if (!questionDoc) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && questionDoc.generatedBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Validate MCQ options
    if (type === 'mcq') {
      if (!options || !Array.isArray(options) || options.length !== 4) {
        return res.status(400).json({ 
          success: false, 
          message: 'MCQ questions must have exactly 4 options' 
        });
      }
      
      const correctOptions = options.filter(opt => opt.isCorrect);
      if (correctOptions.length !== 1) {
        return res.status(400).json({ 
          success: false, 
          message: 'MCQ questions must have exactly one correct answer' 
        });
      }
    }

    // Update question
    questionDoc.question = question;
    questionDoc.type = type;
    questionDoc.difficulty = difficulty;
    questionDoc.topic = topic;
    questionDoc.options = options || questionDoc.options;
    questionDoc.correctAnswer = correctAnswer !== undefined ? correctAnswer : questionDoc.correctAnswer;
    questionDoc.explanation = explanation !== undefined ? explanation : questionDoc.explanation;
    questionDoc.marks = marks || questionDoc.marks;

    await questionDoc.save();

    logger.info(`Question updated: ${topic} by ${req.user.email}`);

    res.json({
      success: true,
      data: questionDoc
    });
  } catch (error) {
    logger.error('Update question error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   DELETE /api/questions/:id
// @desc    Delete question
// @access  Private (Admin, Teacher)
router.delete('/:id', requireTeacher, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ 
        success: false, 
        message: 'Question not found' 
      });
    }

    // Check access for teachers
    if (req.user.role === 'teacher' && question.generatedBy.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    await Question.findByIdAndDelete(req.params.id);

    logger.info(`Question deleted: ${question.topic} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    logger.error('Delete question error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/questions/generate
// @desc    Generate questions using AI
// @access  Private (Admin, Teacher)
router.post('/generate', [
  requireTeacher,
  body('content', 'Content is required').not().isEmpty(),
  body('subject', 'Subject is required').isMongoId(),
  body('chapter', 'Chapter is required').isMongoId(),
  body('topic', 'Topic is required').not().isEmpty(),
  body('questionTypes').optional().isArray(),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  body('count').optional().isInt({ min: 1, max: 20 })
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
      content, 
      subject, 
      chapter, 
      topic, 
      questionTypes, 
      difficulty, 
      count 
    } = req.body;

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

    // Generate questions using AI
    const generatedQuestions = await aiService.generateQuestions(content, {
      subject: subjectExists.name,
      chapter: chapterExists.name,
      topic,
      questionTypes: questionTypes || ['mcq', 'short_answer'],
      difficulty: difficulty || 'medium',
      count: count || 5
    });

    // Save questions to database
    const savedQuestions = [];
    for (const questionData of generatedQuestions) {
      const question = new Question({
        ...questionData,
        subject,
        chapter,
        generatedBy: req.user.id
      });
      
      await question.save();
      savedQuestions.push(question);
    }

    logger.info(`Generated ${savedQuestions.length} questions for topic: ${topic}`);

    res.status(201).json({
      success: true,
      data: savedQuestions,
      count: savedQuestions.length
    });
  } catch (error) {
    logger.error('Generate questions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/questions/statistics
// @desc    Get question bank statistics
// @access  Private (Admin, Teacher)
router.get('/statistics', async (req, res) => {
  try {
    const filter = { isActive: true };
    
    // Filter by generator (for teachers)
    if (req.user.role === 'teacher') {
      filter.generatedBy = req.user.id;
    }

    const [totalQuestions, typeStats, difficultyStats, topicStats] = await Promise.all([
      Question.countDocuments(filter),
      Question.aggregate([
        { $match: filter },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Question.aggregate([
        { $match: filter },
        { $group: { _id: '$difficulty', count: { $sum: 1 } } }
      ]),
      Question.aggregate([
        { $match: filter },
        { $group: { _id: '$topic', count: { $sum: 1 } } }
      ])
    ]);

    const statistics = {
      total: totalQuestions,
      byType: typeStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      byDifficulty: difficultyStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      byTopic: topicStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Get question statistics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/questions/export
// @desc    Export questions to JSON/Excel
// @access  Private (Admin, Teacher)
router.get('/export', async (req, res) => {
  try {
    const { format = 'json', subject, chapter, type, difficulty } = req.query;

    const filter = { isActive: true };
    
    if (subject) filter.subject = subject;
    if (chapter) filter.chapter = chapter;
    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;
    
    // Filter by generator (for teachers)
    if (req.user.role === 'teacher') {
      filter.generatedBy = req.user.id;
    }

    const questions = await Question.find(filter)
      .populate('subject', 'name code')
      .populate('chapter', 'name number')
      .populate('generatedBy', 'name email');

    if (format === 'json') {
      res.json({
        success: true,
        data: questions,
        count: questions.length
      });
    } else {
      // TODO: Implement Excel export
      res.status(400).json({
        success: false,
        message: 'Excel export not implemented yet'
      });
    }
  } catch (error) {
    logger.error('Export questions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
