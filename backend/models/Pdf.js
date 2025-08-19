const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'PDF title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  filename: {
    type: String
  },
  originalName: {
    type: String
  },
  filePath: {
    type: String
  },
  fileSize: {
    type: Number
  },
  pdfUrl: {
    type: String
  },
  source: {
    type: String,
    enum: ['upload', 'images'],
    default: 'upload'
  },
  originalImages: [{
    filename: String,
    mimetype: String,
    size: Number
  }],
  mimeType: {
    type: String,
    default: 'application/pdf'
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
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required']
  },
  extractedText: {
    type: String,
    default: ''
  },
  textChunks: [{
    content: String,
    pageNumber: Number,
    chunkIndex: Number,
    language: String,
    languageConfidence: Number
  }],
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: {
    type: String
  },
  totalPages: {
    type: Number,
    default: 0
  },
  language: {
    type: String,
    enum: ['english', 'hindi', 'sanskrit', 'urdu', 'unknown'],
    default: 'unknown'
  },
  languageConfidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  questionGenerationStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  generatedQuestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
pdfSchema.index({ subject: 1, chapter: 1 });
pdfSchema.index({ uploadedBy: 1 });
pdfSchema.index({ processingStatus: 1 });
pdfSchema.index({ questionGenerationStatus: 1 });

module.exports = mongoose.model('Pdf', pdfSchema);
