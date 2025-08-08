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
      
      // Clean and chunk the text
      const cleanedText = this.cleanText(text);
      const chunks = this.chunkText(cleanedText, options.chunkSize || 1000);
      
      return {
        extractedText: cleanedText,
        textChunks: chunks.map((chunk, index) => ({
          content: chunk,
          chunkIndex: index,
          pageNumber: Math.floor(index / 2) + 1 // Approximate page number
        })),
        totalPages: pageCount,
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

  // Clean extracted text
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\.\,\;\:\!\?\-\(\)\[\]\{\}]/g, '')
      .replace(/\n+/g, ' ')
      .trim();
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
