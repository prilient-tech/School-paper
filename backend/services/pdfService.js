const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class PDFService {
  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    this.ensureUploadDirectory();
  }

  // Ensure upload directory exists
  async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadPath);
    } catch (error) {
      await fs.mkdir(this.uploadPath, { recursive: true });
      logger.info(`Created upload directory: ${this.uploadPath}`);
    }
  }

  // Extract text from PDF file
  async extractTextFromPDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      
      return {
        text: data.text,
        pageCount: data.numpages,
        info: data.info
      };
    } catch (error) {
      logger.error('PDF text extraction error:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  // Process PDF file and extract content
  async processPDF(filePath, options = {}) {
    try {
      const { text, pageCount, info } = await this.extractTextFromPDF(filePath);
      
      // Detect language from the text
      const languageInfo = this.detectLanguage(text);
      
      // Clean and chunk the text with language awareness
      const cleanedText = this.cleanText(text, languageInfo.language);
      const chunks = this.chunkText(cleanedText, options.chunkSize || 1000);
      
      return {
        extractedText: cleanedText,
        textChunks: chunks.map((chunk, index) => ({
          content: chunk,
          chunkIndex: index,
          pageNumber: Math.floor(index / 2) + 1, // Approximate page number
          language: languageInfo.language,
          languageConfidence: languageInfo.confidence
        })),
        totalPages: pageCount,
        language: languageInfo.language,
        languageConfidence: languageInfo.confidence,
        metadata: {
          title: info.Title || '',
          author: info.Author || '',
          subject: info.Subject || '',
          creator: info.Creator || '',
          producer: info.Producer || '',
          creationDate: info.CreationDate || '',
          modificationDate: info.ModDate || ''
        }
      };
    } catch (error) {
      logger.error('PDF processing error:', error);
      throw new Error('Failed to process PDF file');
    }
  }

  // Detect language from text content
  detectLanguage(text) {
    // Debug logging
    logger.info(`Language detection called with text length: ${text.length}`);
    logger.info(`First 200 characters: ${text.substring(0, 200)}`);
    
    const languagePatterns = {
      english: {
        patterns: [
          /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi,
          /\b(is|are|was|were|be|been|being|have|has|had|do|does|did)\b/gi,
          /\b(this|that|these|those|it|they|them|their|its)\b/gi
        ],
        weight: 1.0
      },
      hindi: {
        patterns: [
          /[\u0900-\u097F]/g, // Devanagari script
          /\b(क|ख|ग|घ|ङ|च|छ|ज|झ|ञ|ट|ठ|ड|ढ|ण|त|थ|द|ध|न|प|फ|ब|भ|म|य|र|ल|व|श|ष|स|ह|क्ष|त्र|ज्ञ)\b/g,
          /\b(का|की|के|कि|की|को|कौ|कै|कहाँ|कब|कैसे|क्यों)\b/g
        ],
        weight: 15.0 // Much higher weight for Hindi
      },
      sanskrit: {
        patterns: [
          /[\u0900-\u097F]/g, // Devanagari script
          /\b(त्वं|अहं|सः|सा|तत्|एतत्|इदम्|अस्मि|अस्ति|भवति|गच्छति|पठति)\b/g,
          /\b(धर्मः|अर्थः|कामः|मोक्षः|ब्रह्म|आत्मा|माया|कर्म|ज्ञान|भक्ति)\b/g
        ],
        weight: 12.0
      },
      urdu: {
        patterns: [
          /[\u0600-\u06FF]/g, // Arabic script
          /\b(کیا|کیسے|کب|کہاں|کیوں|کون|کوئی|کچھ|بہت|زیادہ|کم|بڑا|چھوٹا)\b/g,
          /\b(میں|آپ|وہ|یہ|اس|اسے|اسکا|اسکی|اسکے|ہم|تم|وہ|یہ)\b/g
        ],
        weight: 8.0
      }
    };

    let maxScore = 0;
    let detectedLanguage = 'unknown';
    let confidence = 0;

    // First, check for Hindi characters immediately - VERY AGGRESSIVE
    const hindiChars = text.match(/[\u0900-\u097F]/g);
    logger.info(`Hindi characters found: ${hindiChars ? hindiChars.length : 0}`);
    if (hindiChars && hindiChars.length > 0) {
      logger.info(`Hindi characters: ${hindiChars.slice(0, 10).join('')}`);
      // If we have ANY Hindi characters, prioritize Hindi - VERY LOW THRESHOLD
      const hindiScore = hindiChars.length * 3; // Increased multiplier
      if (hindiScore > 2) { // Extremely low threshold
        detectedLanguage = 'hindi';
        confidence = Math.min((hindiChars.length / text.length) * 300, 95); // Boost confidence more
        logger.info(`Hindi detected immediately with ${hindiChars.length} characters`);
        return {
          language: detectedLanguage,
          confidence: confidence,
          scores: { hindi: hindiChars.length, english: 0, sanskrit: 0, urdu: 0 }
        };
      }
    }

    // Regular pattern matching for other languages
    for (const [language, config] of Object.entries(languagePatterns)) {
      let score = 0;
      let totalMatches = 0;

      for (const pattern of config.patterns) {
        const matches = text.match(pattern);
        if (matches) {
          score += matches.length * config.weight;
          totalMatches += matches.length;
        }
      }

      // Normalize score by text length
      const normalizedScore = score / Math.max(text.length, 100);
      logger.info(`${language} score: ${normalizedScore.toFixed(4)}`);
      
      if (normalizedScore > maxScore) {
        maxScore = normalizedScore;
        detectedLanguage = language;
        confidence = Math.min(normalizedScore * 100, 100);
      }
    }

    // Very low threshold for language detection
    if (confidence < 0.3) { // Even lower threshold
      detectedLanguage = 'unknown';
      confidence = 0;
    }

    // Final fallback: if we have ANY Devanagari, it's Hindi
    if (detectedLanguage === 'unknown' && hindiChars && hindiChars.length > 0) {
      detectedLanguage = 'hindi';
      confidence = Math.max(80, (hindiChars.length / text.length) * 200); // Higher fallback confidence
      logger.info(`Hindi detected in fallback with ${hindiChars.length} characters`);
    }

    logger.info(`Language detection: ${detectedLanguage} (confidence: ${confidence.toFixed(2)}%)`);
    
    return {
      language: detectedLanguage,
      confidence: confidence,
      scores: Object.fromEntries(
        Object.keys(languagePatterns).map(lang => [
          lang, 
          (text.match(new RegExp(languagePatterns[lang].patterns.map(p => p.source).join('|'), 'g')) || []).length
        ])
      )
    };
  }

  // Clean text with language awareness
  cleanText(text, language = 'english') {
    let cleaned = text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();

    // Language-specific cleaning
    if (language === 'hindi' || language === 'sanskrit') {
      // Preserve Devanagari characters and common English words
      cleaned = cleaned.replace(/[^\u0900-\u097F\s\w\.\,\;\:\!\?\-\(\)\[\]\{\}]/g, '');
    } else if (language === 'urdu') {
      // Preserve Arabic/Persian characters and common English words
      cleaned = cleaned.replace(/[^\u0600-\u06FF\s\w\.\,\;\:\!\?\-\(\)\[\]\{\}]/g, '');
    } else {
      // English cleaning
      cleaned = cleaned.replace(/[^\w\s\.\,\;\:\!\?\-\(\)\[\]\{\}]/g, '');
    }

    return cleaned;
  }

  // Chunk text for processing
  chunkText(text, maxChunkSize) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  // Save uploaded file
  async saveUploadedFile(file, customName = null) {
    try {
      // If file is already saved to disk (using diskStorage), just return the info
      if (file.path) {
        return {
          filename: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype
        };
      }
      
      // Fallback for memory storage (if needed)
      const timestamp = Date.now();
      const originalName = file.originalname;
      const extension = path.extname(originalName);
      const baseName = path.basename(originalName, extension);
      
      const fileName = customName || `${baseName}_${timestamp}${extension}`;
      const filePath = path.join(this.uploadPath, fileName);

      await fs.writeFile(filePath, file.buffer);

      return {
        filename: fileName,
        originalName: originalName,
        filePath: filePath,
        fileSize: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      logger.error('File save error:', error);
      throw new Error('Failed to save uploaded file');
    }
  }

  // Delete file
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      logger.info(`File deleted: ${filePath}`);
    } catch (error) {
      logger.error('File deletion error:', error);
      // Don't throw error for file deletion failures
    }
  }

  // Get file info
  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      logger.error('File info error:', error);
      throw new Error('Failed to get file information');
    }
  }

  // Validate PDF file
  validatePDFFile(file) {
    const allowedMimeTypes = ['application/pdf'];
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only PDF files are allowed.');
    }

    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`);
    }

    return true;
  }

  // Generate PDF preview (first few pages)
  async generatePreview(filePath, maxPages = 3) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer, { max: maxPages });
      
      return {
        preview: data.text.substring(0, 1000) + '...',
        pageCount: data.numpages,
        previewPages: maxPages
      };
    } catch (error) {
      logger.error('PDF preview generation error:', error);
      throw new Error('Failed to generate PDF preview');
    }
  }

  // Extract specific page content
  async extractPageContent(filePath, pageNumber) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer, { 
        firstPage: pageNumber,
        lastPage: pageNumber 
      });
      
      return {
        pageNumber: pageNumber,
        content: data.text,
        pageCount: data.numpages
      };
    } catch (error) {
      logger.error('Page content extraction error:', error);
      throw new Error('Failed to extract page content');
    }
  }

  // Get PDF statistics
  async getPDFStatistics(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      
      const text = data.text;
      const words = text.split(/\s+/).filter(word => word.length > 0);
      const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
      const paragraphs = text.split(/\n\s*\n/).filter(para => para.trim().length > 0);

      return {
        pageCount: data.numpages,
        wordCount: words.length,
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        averageWordsPerPage: Math.round(words.length / data.numpages),
        averageSentencesPerPage: Math.round(sentences.length / data.numpages)
      };
    } catch (error) {
      logger.error('PDF statistics error:', error);
      throw new Error('Failed to get PDF statistics');
    }
  }
}

module.exports = new PDFService();
