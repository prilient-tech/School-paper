const express = require('express');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const Pdf = require('../models/Pdf');
const Question = require('../models/Question');
const QuestionPaper = require('../models/QuestionPaper');
const { requireTeacher } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private (Admin, Teacher)
router.get('/stats', requireTeacher, async (req, res) => {
  try {
    const stats = {};

    // Get counts based on user role
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      // Admin can see all data
      stats.totalUsers = await User.countDocuments();
      stats.totalSubjects = await Subject.countDocuments();
      stats.totalChapters = await Chapter.countDocuments();
    }

    // Teachers and admins can see educational content
    stats.totalPDFs = await Pdf.countDocuments();
    stats.totalQuestions = await Question.countDocuments();
    stats.totalQuestionPapers = await QuestionPaper.countDocuments();

    // Get counts for current user (for teachers)
    if (req.user.role === 'teacher') {
      stats.myPDFs = await Pdf.countDocuments({ uploadedBy: req.user.id });
      stats.myQuestions = await Question.countDocuments({ generatedBy: req.user.id });
      stats.myQuestionPapers = await QuestionPaper.countDocuments({ createdBy: req.user.id });
    }

    // Get processing status counts
    stats.processingPDFs = await Pdf.countDocuments({ processingStatus: 'processing' });
    stats.failedPDFs = await Pdf.countDocuments({ processingStatus: 'failed' });
    stats.completedPDFs = await Pdf.countDocuments({ processingStatus: 'completed' });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/dashboard/recent-activity
// @desc    Get recent activity for dashboard
// @access  Private (Admin, Teacher)
router.get('/recent-activity', requireTeacher, async (req, res) => {
  try {
    const activities = [];

    // Get recent PDFs
    const recentPDFs = await Pdf.find()
      .populate('uploadedBy', 'name')
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    recentPDFs.forEach(pdf => {
      activities.push({
        type: 'pdf_upload',
        title: `PDF uploaded: ${pdf.title}`,
        description: `${pdf.subject?.name || 'Unknown Subject'}`,
        user: pdf.uploadedBy?.name || 'Unknown User',
        timestamp: pdf.createdAt,
        icon: 'DocumentTextIcon',
        color: 'green'
      });
    });

    // Get recent questions
    const recentQuestions = await Question.find()
      .populate('generatedBy', 'name')
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    recentQuestions.forEach(question => {
      activities.push({
        type: 'question_created',
        title: `Question created: ${question.question.substring(0, 50)}...`,
        description: `${question.subject?.name || 'Unknown Subject'} - ${question.type}`,
        user: question.generatedBy?.name || 'Unknown User',
        timestamp: question.createdAt,
        icon: 'QuestionMarkCircleIcon',
        color: 'blue'
      });
    });

    // Get recent question papers
    const recentQuestionPapers = await QuestionPaper.find()
      .populate('createdBy', 'name')
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    recentQuestionPapers.forEach(paper => {
      activities.push({
        type: 'question_paper_created',
        title: `Question paper created: ${paper.title}`,
        description: `${paper.subject?.name || 'Unknown Subject'} - ${paper.questions?.length || 0} questions`,
        user: paper.createdBy?.name || 'Unknown User',
        timestamp: paper.createdAt,
        icon: 'ClipboardDocumentListIcon',
        color: 'purple'
      });
    });

    // Sort all activities by timestamp and take the most recent 10
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    res.json({
      success: true,
      data: sortedActivities
    });
  } catch (error) {
    logger.error('Dashboard recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/dashboard/system-status
// @desc    Get system status information
// @access  Private (Admin, Teacher)
router.get('/system-status', requireTeacher, async (req, res) => {
  try {
    const status = {
      aiService: {
        status: 'online',
        message: 'AI service is running'
      },
      database: {
        status: 'connected',
        message: 'Database connection active'
      },
      fileStorage: {
        status: 'available',
        message: 'File storage accessible'
      },
      jobQueue: {
        status: 'active',
        message: 'Background jobs processing'
      }
    };

    // Check database connection
    try {
      await User.findOne().limit(1);
      status.database.status = 'connected';
    } catch (error) {
      status.database.status = 'error';
      status.database.message = 'Database connection failed';
    }

    // Check for processing PDFs (indicates job queue activity)
    const processingCount = await Pdf.countDocuments({ processingStatus: 'processing' });
    if (processingCount > 0) {
      status.jobQueue.message = `${processingCount} PDFs being processed`;
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Dashboard system status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 