const logger = require('../utils/logger');
const pdfService = require('./pdfService');
const aiService = require('./aiService');
const Pdf = require('../models/Pdf');
const Question = require('../models/Question');

class QueueService {
  constructor() {
    logger.info('Queue service initialized in synchronous mode (no Redis)');
  }

  // Add PDF processing job - runs synchronously
  async addPDFProcessingJob(data) {
    logger.info('Processing PDF synchronously:', data.pdfId);
    try {
      // Process PDF synchronously
      const pdf = await Pdf.findById(data.pdfId);
      if (!pdf) {
        throw new Error('PDF not found');
      }

      pdf.processingStatus = 'processing';
      await pdf.save();

      const processedData = await pdfService.processPDF(pdf.filePath, {
        chunkSize: data.chunkSize || 1000
      });

      pdf.extractedText = processedData.extractedText;
      pdf.textChunks = processedData.textChunks;
      pdf.totalPages = processedData.totalPages;
      pdf.processingStatus = 'completed';
      await pdf.save();

      // Generate questions synchronously
      await this.addQuestionGenerationJob({
        pdfId: pdf._id,
        subject: pdf.subject,
        chapter: pdf.chapter,
        questionTypes: data.questionTypes || ['mcq', 'short_answer'],
        difficulty: data.difficulty || 'medium',
        count: data.questionCount || 10
      });

      logger.info(`PDF processing completed: ${pdf._id}`);
      return { success: true, pdfId: pdf._id, synchronous: true };
    } catch (error) {
      logger.error('Synchronous PDF processing error:', error);
      
      // Update PDF status to failed
      const pdf = await Pdf.findById(data.pdfId);
      if (pdf) {
        pdf.processingStatus = 'failed';
        pdf.processingError = error.message;
        await pdf.save();
      }
      
      throw error;
    }
  }

  // Add question generation job - runs synchronously
  async addQuestionGenerationJob(data) {
    logger.info('Generating questions synchronously for PDF:', data.pdfId);
    try {
      // Generate questions synchronously
      const pdf = await Pdf.findById(data.pdfId);
      if (!pdf) {
        throw new Error('PDF not found');
      }

      pdf.questionGenerationStatus = 'processing';
      await pdf.save()

      // Process content in chunks for better question generation
      const chunks = aiService.chunkContent(pdf.extractedText, 2000);
      const questionsPerChunk = Math.ceil(data.count / chunks.length);
      
      const allQuestions = [];
      for (let i = 0; i < chunks.length && allQuestions.length < data.count; i++) {
        const chunk = chunks[i];
        const chunkQuestions = await aiService.generateQuestions(chunk, {
          subject: data.subject,
          chapter: data.chapter,
          questionTypes: data.questionTypes,
          difficulty: data.difficulty,
          count: questionsPerChunk
        });
        
        // Add chunk information to each question
        chunkQuestions.forEach(q => {
          q.sourceChunk = chunk;
          q.chunkIndex = i;
        });
        
        allQuestions.push(...chunkQuestions);
      }

      const savedQuestions = [];
      for (const questionData of allQuestions.slice(0, data.count)) {
        const question = new Question({
          ...questionData,
          subject: pdf.subject,
          chapter: pdf.chapter,
          sourcePdf: pdf._id,
          sourceText: questionData.sourceChunk || pdf.extractedText.substring(0, 500),
          generatedBy: pdf.uploadedBy,
          metadata: {
            chunkIndex: questionData.chunkIndex,
            pageNumber: questionData.metadata?.pageNumber,
            confidence: questionData.metadata?.confidence
          }
        });
        
        await question.save();
        savedQuestions.push(question._id);
      }

      pdf.generatedQuestions = savedQuestions;
      pdf.questionGenerationStatus = 'completed';
      await pdf.save();

      logger.info(`Question generation completed: ${pdf._id}, ${savedQuestions.length} questions created`);
      return { 
        success: true, 
        pdfId: pdf._id, 
        questionCount: savedQuestions.length,
        synchronous: true 
      };
    } catch (error) {
      logger.error('Synchronous question generation error:', error);
      
      // Update PDF status to failed
      const pdf = await Pdf.findById(data.pdfId);
      if (pdf) {
        pdf.questionGenerationStatus = 'failed';
        pdf.processingError = error.message;
        await pdf.save();
      }
      
      throw error;
    }
  }

  // Get job status - returns synchronous status
  async getJobStatus(queueName, jobId) {
    return { 
      status: 'synchronous_mode',
      message: 'Running in synchronous mode without Redis'
    };
  }

  // Get queue statistics - returns empty stats for synchronous mode
  async getQueueStats() {
    return {
      pdfProcessing: { waiting: 0, active: 0, completed: 0, failed: 0 },
      questionGeneration: { waiting: 0, active: 0, completed: 0, failed: 0 },
      redis_available: false,
      mode: 'synchronous'
    };
  }

  // Clean completed jobs - no-op in synchronous mode
  async cleanCompletedJobs() {
    logger.info('Running in synchronous mode - no jobs to clean');
  }

  // Pause all queues - no-op in synchronous mode
  async pauseQueues() {
    logger.info('Running in synchronous mode - no queues to pause');
  }

  // Resume all queues - no-op in synchronous mode
  async resumeQueues() {
    logger.info('Running in synchronous mode - no queues to resume');
  }

  // Graceful shutdown - no-op in synchronous mode
  async shutdown() {
    logger.info('Queue service shutdown complete (synchronous mode)');
  }
}

module.exports = new QueueService();
