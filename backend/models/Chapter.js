const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Chapter name is required'],
    trim: true,
    maxlength: [200, 'Chapter name cannot be more than 200 characters']
  },
  number: {
    type: Number,
    required: [true, 'Chapter number is required'],
    min: [1, 'Chapter number must be at least 1']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Subject is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  assignedTeachers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  totalQuestions: {
    type: Number,
    default: 0
  },
  totalPdfs: {
    type: Number,
    default: 0
  },
  topics: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index for unique chapter number within a subject
chapterSchema.index({ subject: 1, number: 1 }, { unique: true });
chapterSchema.index({ subject: 1, name: 1 });

module.exports = mongoose.model('Chapter', chapterSchema);
