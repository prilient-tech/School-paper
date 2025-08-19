const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['mcq', 'short_answer', 'long_answer', 'true_false', 'fill_blank'],
    required: [true, 'Question type is required']
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: [true, 'Difficulty level is required']
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Subject is required']
  },
  chapter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    required: [true, 'Chapter is required']
  },
  topic: {
    type: String,
    trim: true
  },
  options: {
    type: [{
      text: {
        type: String,
        required: true
      },
      isCorrect: {
        type: Boolean,
        default: false
      }
    }],
    default: []
  },
  correctAnswer: {
    type: String,
    required: function() {
      return this.type !== 'mcq' && this.type !== 'true_false';
    }
  },
  explanation: {
    type: String,
    trim: true
  },
  marks: {
    type: Number,
    default: 1,
    min: [1, 'Marks must be at least 1']
  },
  sourcePdf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pdf'
  },
  sourceText: {
    type: String,
    trim: true
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date
  },
  aiModel: {
    type: String,
    default: 'gpt-5'
  },
  language: {
    type: String,
    enum: ['english', 'hindi', 'sanskrit', 'urdu', 'unknown'],
    default: 'english'
  },
  generationPrompt: {
    type: String
  },
  metadata: {
    pageNumber: Number,
    chunkIndex: Number,
    confidence: Number
  }
}, {
  timestamps: true
});

// Indexes for better query performance
questionSchema.index({ subject: 1, chapter: 1 });
questionSchema.index({ type: 1, difficulty: 1 });
questionSchema.index({ topic: 1 });
questionSchema.index({ isActive: 1 });
questionSchema.index({ generatedBy: 1 });

// Virtual for question bank statistics
questionSchema.virtual('isMCQ').get(function() {
  return this.type === 'mcq';
});

questionSchema.virtual('hasOptions').get(function() {
  return this.type === 'mcq' || this.type === 'true_false';
});

module.exports = mongoose.model('Question', questionSchema);
