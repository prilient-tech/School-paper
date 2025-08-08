const mongoose = require('mongoose');

const questionPaperSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Question paper title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Subject is required']
  },
  chapters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter'
  }],
  questions: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    order: {
      type: Number,
      required: true
    },
    marks: {
      type: Number,
      default: 1
    },
    section: {
      type: String,
      trim: true
    }
  }],
  totalMarks: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },
  instructions: {
    type: String,
    maxlength: [1000, 'Instructions cannot be more than 1000 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'mixed'],
    default: 'mixed'
  },
  questionTypes: [{
    type: String,
    enum: ['mcq', 'short_answer', 'long_answer', 'true_false', 'fill_blank']
  }],
  statistics: {
    totalQuestions: {
      type: Number,
      default: 0
    },
    mcqCount: {
      type: Number,
      default: 0
    },
    shortAnswerCount: {
      type: Number,
      default: 0
    },
    longAnswerCount: {
      type: Number,
      default: 0
    },
    trueFalseCount: {
      type: Number,
      default: 0
    },
    fillBlankCount: {
      type: Number,
      default: 0
    }
  },
  exportHistory: [{
    exportedAt: {
      type: Date,
      default: Date.now
    },
    exportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    format: {
      type: String,
      enum: ['pdf', 'docx', 'json'],
      default: 'pdf'
    },
    filePath: String
  }],
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    version: Number,
    questions: [{
      question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
      },
      order: Number,
      marks: Number,
      section: String
    }],
    totalMarks: Number,
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
questionPaperSchema.index({ subject: 1, createdBy: 1 });
questionPaperSchema.index({ isActive: 1, isPublic: 1 });
questionPaperSchema.index({ difficulty: 1 });
questionPaperSchema.index({ 'questions.question': 1 });

// Pre-save middleware to calculate statistics
questionPaperSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    this.statistics.totalQuestions = this.questions.length;
    this.totalMarks = this.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    
    // Count question types
    this.statistics.mcqCount = 0;
    this.statistics.shortAnswerCount = 0;
    this.statistics.longAnswerCount = 0;
    this.statistics.trueFalseCount = 0;
    this.statistics.fillBlankCount = 0;
    
    // This will be populated when questions are loaded
  }
  next();
});

module.exports = mongoose.model('QuestionPaper', questionPaperSchema);
