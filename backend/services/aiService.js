const OpenAI = require('openai');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    console.log('Initializing AI Service with OpenAI API Key:', apiKey)
    if (!apiKey) {
      logger.warn('OpenAI API key not configured. AI features will be disabled.');
      this.openai = null;
    } else {
      this.openai = new OpenAI({
        apiKey: apiKey
      });
    }
  }

  // Generate questions from text content
  async generateQuestions(content, options = {}) {
    try {
      const {
        subject = 'General',
        chapter = 'General',
        topic = 'General',
        questionTypes = ['mcq', 'short_answer', 'long_answer'],
        difficulty = 'medium',
        count = 5
      } = options;

      // Clean and chunk the content
      const cleanedContent = this.cleanContent(content);
      const chunks = this.chunkContent(cleanedContent, 2000);

      const questions = [];

      for (const chunk of chunks) {
        const chunkQuestions = await this.generateQuestionsFromChunk(
          chunk,
          subject,
          chapter,
          topic,
          questionTypes,
          difficulty,
          Math.ceil(count / chunks.length)
        );
        questions.push(...chunkQuestions);
      }

      // Ensure we have a good mix of question types
      const finalQuestions = this.ensureQuestionTypeMix(questions, questionTypes, count);

      // Limit to requested count
      return finalQuestions.slice(0, count);
    } catch (error) {
      logger.error('AI question generation error:', error);
      throw new Error('Failed to generate questions');
    }
  }

  // Generate questions from a single chunk
  async generateQuestionsFromChunk(chunk, subject, chapter, topic, questionTypes, difficulty, count) {
    if (!this.openai) {
      logger.warn('OpenAI not configured. Generating sample questions instead.');
      return this.generateSampleQuestions(chunk, subject, chapter, topic, questionTypes, difficulty, count);
    }

    // Validate content quality
    if (!this.isValidContent(chunk)) {
      logger.warn('Content quality too low, generating sample questions instead.');
      return this.generateSampleQuestions(chunk, subject, chapter, topic, questionTypes, difficulty, count);
    }

    const prompt = this.buildQuestionPrompt(chunk, subject, chapter, topic, questionTypes, difficulty, count);

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a CBSE question paper creator. Respond with ONLY valid JSON arrays. No explanations or other text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent JSON
        max_tokens: 2000
      });

      const response = completion.choices[0].message.content;
      const parsedQuestions = this.parseQuestionsFromResponse(response, questionTypes);
      
      // If parsing failed, generate sample questions
      if (!parsedQuestions || parsedQuestions.length === 0) {
        logger.warn('AI response parsing failed, falling back to sample questions');
        return this.generateSampleQuestions(chunk, subject, chapter, topic, questionTypes, difficulty, count);
      }
      
      return parsedQuestions;
    } catch (error) {
      logger.error('OpenAI API error:', error);
      logger.warn('Falling back to sample questions due to API error');
      return this.generateSampleQuestions(chunk, subject, chapter, topic, questionTypes, difficulty, count);
    }
  }

  // Build the prompt for question generation
  buildQuestionPrompt(content, subject, chapter, topic, questionTypes, difficulty, count) {
    const questionTypeMap = {
      mcq: 'Multiple Choice Questions',
      short_answer: 'Short Answer Questions',
      long_answer: 'Long Answer Questions',
      true_false: 'True/False Questions',
      fill_blank: 'Fill in the Blank Questions'
    };

    const selectedTypes = questionTypes.map(type => questionTypeMap[type]).join(', ');

    return `Generate ${count} questions based on this content for ${subject} - ${chapter}.

IMPORTANT: Generate a mix of different question types: ${selectedTypes}

CRITICAL: Respond with ONLY a JSON array. No explanations, no markdown, no other text.

Content: ${content}

Return exactly this format with different question types:
[
  {"question":"What is the main topic?","type":"mcq","difficulty":"medium","topic":"${topic}","options":[{"text":"Option A","isCorrect":true},{"text":"Option B","isCorrect":false},{"text":"Option C","isCorrect":false},{"text":"Option D","isCorrect":false}],"correctAnswer":"Option A","explanation":"Explanation here","marks":1},
  {"question":"Explain the key concept briefly.","type":"short_answer","difficulty":"medium","topic":"${topic}","correctAnswer":"Brief explanation here","explanation":"Detailed explanation","marks":2},
  {"question":"Is this statement true or false?","type":"true_false","difficulty":"medium","topic":"${topic}","options":[{"text":"True","isCorrect":true},{"text":"False","isCorrect":false}],"correctAnswer":"True","explanation":"Explanation here","marks":1}
]

Rules:
- JSON only, no other text
- Generate a mix of question types: ${selectedTypes}
- For MCQ: 4 options, one correct
- For True/False: options "True"/"False"
- For short_answer/long_answer/fill_blank: use correctAnswer field, no options
- Use CBSE style language
- Keep vocabulary simple and appropriate for school level
- IMPORTANT: Make questions specific to the actual content provided, not generic
- Reference specific terms, concepts, or examples from the content
- Avoid generic phrases like "the content" or "this material"`;
  }

  // Validate content quality
  isValidContent(content) {
    if (!content || content.length < 50) {
      return false;
    }

    // Check for meaningful words (not just random characters)
    const words = content.split(/\s+/).filter(word => word.length > 2);
    const meaningfulWords = words.filter(word => {
      // Check if word contains actual letters/characters
      const hasLetters = /[a-zA-Z]/.test(word);
      const notJustNumbers = !/^\d+$/.test(word);
      const notJustSymbols = !/^[^\w]+$/.test(word);
      return hasLetters && notJustNumbers && notJustSymbols;
    });

    // If less than 30% of words are meaningful, content is poor
    const meaningfulPercentage = (meaningfulWords.length / words.length) * 100;
    return meaningfulPercentage > 30;
  }

  // Parse questions from AI response
  parseQuestionsFromResponse(response, questionTypes) {
    try {
      logger.info('Attempting to parse AI response. Response length:', response.length);
      logger.info('Response preview:', response.substring(0, 500));
      
      // Strategy 1: Try simple JSON parsing first
      let questions = this.trySimpleJSONParse(response);
      
      // Strategy 2: Try to extract and clean JSON
      if (!questions || questions.length === 0) {
        questions = this.tryExtractJSON(response);
      }
      
      // Strategy 3: Try to parse as structured text
      if (!questions || questions.length === 0) {
        questions = this.tryParseStructuredText(response, questionTypes);
      }
      
      // Strategy 4: Last resort - generate sample questions
      if (!questions || questions.length === 0) {
        logger.error('All parsing strategies failed, generating sample questions');
        return this.generateSampleQuestions('', 'General', 'General', 'General', questionTypes, 'medium', 3);
      }

      // Ensure questions is an array
      if (!Array.isArray(questions)) {
        questions = [questions];
      }

      // Validate and clean questions
      const validQuestions = questions
        .filter(q => q && this.validateQuestion(q, questionTypes))
        .map(q => this.cleanQuestion(q));

      logger.info(`Successfully parsed ${validQuestions.length} questions`);
      return validQuestions;
    } catch (error) {
      logger.error('Question parsing error:', error);
      logger.error('Response that failed to parse:', response);
      // Return sample questions as fallback
      return this.generateSampleQuestions('', 'General', 'General', 'General', questionTypes, 'medium', 3);
    }
  }

  // Try simple JSON parsing
  trySimpleJSONParse(response) {
    try {
      // Remove any leading/trailing whitespace and try direct parse
      const cleaned = response.trim();
      const parsed = JSON.parse(cleaned);
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        logger.info('Simple JSON parse successful');
        return parsed;
      }
    } catch (e) {
      logger.warn('Simple JSON parse failed');
    }
    return null;
  }

  // Try to extract JSON from response
  tryExtractJSON(response) {
    try {
      // Look for JSON array pattern
      const arrayMatch = response.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        const jsonString = arrayMatch[0];
        const cleaned = this.cleanJSONString(jsonString);
        const parsed = JSON.parse(cleaned);
        
        if (Array.isArray(parsed) && parsed.length > 0) {
          logger.info('JSON extraction successful');
          return parsed;
        }
      }
      
      // Look for individual objects
      const objectMatches = response.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
      if (objectMatches && objectMatches.length > 0) {
        const questions = [];
        for (const match of objectMatches) {
          try {
            const cleaned = this.cleanJSONString(match);
            const question = JSON.parse(cleaned);
            if (question && typeof question === 'object' && question.question) {
              questions.push(question);
            }
          } catch (e) {
            // Skip invalid objects
          }
        }
        if (questions.length > 0) {
          logger.info('Individual object extraction successful');
          return questions;
        }
      }
    } catch (e) {
      logger.warn('JSON extraction failed:', e.message);
    }
    return null;
  }

  // Try to parse structured text
  tryParseStructuredText(response, questionTypes) {
    try {
      const questions = [];
      const lines = response.split('\n');
      let currentQuestion = null;

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) continue;
        
        // Check for question start
        if (trimmedLine.match(/^\d+\./) || trimmedLine.match(/^Q\d+\./) || trimmedLine.match(/^Question\s+\d+/)) {
          // Save previous question
          if (currentQuestion && currentQuestion.question) {
            questions.push(currentQuestion);
          }
          
          // Start new question
          currentQuestion = {
            question: trimmedLine.replace(/^\d+\.\s*/, '').replace(/^Q\d+\.\s*/, '').replace(/^Question\s+\d+\.?\s*/, ''),
            type: questionTypes[0] || 'mcq',
            difficulty: 'medium',
            topic: 'General',
            options: [],
            correctAnswer: '',
            explanation: '',
            marks: 1
          };
        } 
        // Check for options
        else if (currentQuestion && trimmedLine.match(/^[A-D][\.\)]\s/)) {
          const optionText = trimmedLine.replace(/^[A-D][\.\)]\s*/, '');
          currentQuestion.options.push({
            text: optionText,
            isCorrect: false
          });
        }
        // Check for correct answer
        else if (currentQuestion && (trimmedLine.toLowerCase().includes('correct') || trimmedLine.toLowerCase().includes('answer'))) {
          currentQuestion.correctAnswer = trimmedLine;
        }
        // Check for explanation
        else if (currentQuestion && (trimmedLine.toLowerCase().includes('explanation') || trimmedLine.toLowerCase().includes('reason'))) {
          currentQuestion.explanation = trimmedLine;
        }
        // Append to question text if it's substantial
        else if (currentQuestion && trimmedLine.length > 10 && !trimmedLine.startsWith('#')) {
          currentQuestion.question += ' ' + trimmedLine;
        }
      }
      
      // Add the last question
      if (currentQuestion && currentQuestion.question) {
        questions.push(currentQuestion);
      }
      
      // Set default correct answer for MCQ questions
      questions.forEach(q => {
        if (q.options && q.options.length > 0 && !q.correctAnswer) {
          q.options[0].isCorrect = true;
          q.correctAnswer = q.options[0].text;
        }
      });
      
      if (questions.length > 0) {
        logger.info('Structured text parsing successful');
        return questions;
      }
    } catch (e) {
      logger.warn('Structured text parsing failed:', e.message);
    }
    return null;
  }



  // Clean JSON string
  cleanJSONString(jsonString) {
    return jsonString
      .replace(/\\n/g, ' ')           // Replace escaped newlines with spaces
      .replace(/\\r/g, ' ')           // Replace escaped carriage returns
      .replace(/\\t/g, ' ')           // Replace escaped tabs
      .replace(/\\"/g, '"')           // Fix escaped quotes
      .replace(/\\\\/g, '\\')         // Fix double backslashes
      .replace(/\n/g, ' ')            // Remove actual newlines
      .replace(/\r/g, ' ')            // Remove carriage returns
      .replace(/\t/g, ' ')            // Remove tabs
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/,\s*]/g, ']')         // Remove trailing commas
      .replace(/,\s*}/g, '}')         // Remove trailing commas in objects
      .replace(/[^\x20-\x7E]/g, '')   // Remove non-printable characters
      .trim();
  }

  // Check if question has valid structure
  isValidQuestionStructure(question) {
    return question && 
           question.question && 
           question.question.length > 10 &&
           question.type;
  }

  // Validate question structure
  validateQuestion(question, allowedTypes) {
    const requiredFields = ['question', 'type', 'difficulty', 'topic'];
    const hasRequiredFields = requiredFields.every(field => question[field]);

    const validType = allowedTypes.includes(question.type);
    const validDifficulty = ['easy', 'medium', 'hard'].includes(question.difficulty);

    // Validate MCQ options
    if (question.type === 'mcq') {
      const hasOptions = question.options && Array.isArray(question.options) && question.options.length === 4;
      const hasCorrectAnswer = question.options && question.options.some(opt => opt.isCorrect);
      return hasRequiredFields && validType && validDifficulty && hasOptions && hasCorrectAnswer;
    }

    // Validate other question types
    if (question.type === 'true_false') {
      const hasOptions = question.options && Array.isArray(question.options) && question.options.length === 2;
      return hasRequiredFields && validType && validDifficulty && hasOptions;
    }

    return hasRequiredFields && validType && validDifficulty;
  }

  // Clean question data
  cleanQuestion(question) {
    return {
      question: question.question.trim(),
      type: question.type,
      difficulty: question.difficulty,
      topic: question.topic.trim(),
      options: question.options || [],
      correctAnswer: question.correctAnswer || '',
      explanation: question.explanation || '',
      marks: question.marks || 1,
      aiModel: 'gpt-3.5-turbo'
    };
  }

  // Clean content for better processing
  cleanContent(content) {
    return content
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\.\,\;\:\!\?\-\(\)]/g, '')
      .trim();
  }

  // Ensure a good mix of question types
  ensureQuestionTypeMix(questions, allowedTypes, targetCount) {
    if (questions.length === 0) return questions;

    // Count questions by type
    const typeCounts = {};
    allowedTypes.forEach(type => typeCounts[type] = 0);
    
    questions.forEach(q => {
      if (typeCounts.hasOwnProperty(q.type)) {
        typeCounts[q.type]++;
      }
    });

    // Calculate target distribution (try to have at least 1 of each type)
    const targetPerType = Math.max(1, Math.floor(targetCount / allowedTypes.length));
    
    // Sort questions to prioritize underrepresented types
    const sortedQuestions = [...questions].sort((a, b) => {
      const aCount = typeCounts[a.type] || 0;
      const bCount = typeCounts[b.type] || 0;
      
      // If one type is underrepresented, prioritize it
      if (aCount < targetPerType && bCount >= targetPerType) return -1;
      if (bCount < targetPerType && aCount >= targetPerType) return 1;
      
      // Otherwise, maintain original order
      return 0;
    });

    // Take the best mix
    const finalQuestions = [];
    const finalTypeCounts = {};
    allowedTypes.forEach(type => finalTypeCounts[type] = 0);

    for (const question of sortedQuestions) {
      if (finalTypeCounts[question.type] < targetPerType) {
        finalQuestions.push(question);
        finalTypeCounts[question.type]++;
      }
      
      if (finalQuestions.length >= targetCount) break;
    }

    // If we still have space, add remaining questions
    if (finalQuestions.length < targetCount) {
      for (const question of sortedQuestions) {
        if (!finalQuestions.find(q => q._id === question._id)) {
          finalQuestions.push(question);
          if (finalQuestions.length >= targetCount) break;
        }
      }
    }

    return finalQuestions;
  }

  // Chunk content for processing
  chunkContent(content, maxChunkSize) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
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

  // Generate question bank summary
  async generateQuestionBankSummary(questions) {
    try {
      const summary = {
        total: questions.length,
        byType: {},
        byDifficulty: {},
        byTopic: {}
      };

      questions.forEach(q => {
        // Count by type
        summary.byType[q.type] = (summary.byType[q.type] || 0) + 1;

        // Count by difficulty
        summary.byDifficulty[q.difficulty] = (summary.byDifficulty[q.difficulty] || 0) + 1;

        // Count by topic
        summary.byTopic[q.topic] = (summary.byTopic[q.topic] || 0) + 1;
      });

      return summary;
    } catch (error) {
      logger.error('Question bank summary error:', error);
      return null;
    }
  }

  // Generate sample questions when OpenAI is not available or parsing fails
  generateSampleQuestions(chunk, subject, chapter, topic, questionTypes, difficulty, count) {
    const questions = [];
    
    // Extract some key terms from the chunk for more relevant questions
    const words = chunk.split(/\s+/).filter(word => word.length > 4).slice(0, 5);
    const keyTerms = words.length > 0 ? words.join(', ') : 'key concepts';
    
    const sampleQuestions = [
      {
        question: `What is the main topic discussed in the ${chapter} chapter of ${subject}?`,
        type: 'mcq',
        difficulty: difficulty,
        topic: topic,
        options: [
          { text: 'Introduction to key concepts', isCorrect: true },
          { text: 'Advanced mathematical formulas', isCorrect: false },
          { text: 'Historical background', isCorrect: false },
          { text: 'Practical applications only', isCorrect: false }
        ],
        correctAnswer: 'Introduction to key concepts',
        explanation: `This chapter focuses on introducing the fundamental concepts of ${topic} in ${subject}.`,
        marks: 1
      },
      {
        question: `Explain the key concepts covered in the ${chapter} chapter of ${subject}.`,
        type: 'short_answer',
        difficulty: difficulty,
        topic: topic,
        correctAnswer: `The ${chapter} chapter covers ${keyTerms} and their applications in ${subject}.`,
        explanation: 'This chapter provides a comprehensive overview of the main concepts and their practical significance.',
        marks: 2
      },
      {
        question: `True or False: The ${chapter} chapter contains important information about ${subject}.`,
        type: 'true_false',
        difficulty: difficulty,
        topic: topic,
        options: [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false }
        ],
        correctAnswer: 'True',
        explanation: `The ${chapter} chapter is essential for understanding ${topic} in ${subject}.`,
        marks: 1
      },
      {
        question: `What are the main learning objectives of the ${chapter} chapter?`,
        type: 'long_answer',
        difficulty: difficulty,
        topic: topic,
        correctAnswer: `The main learning objectives include understanding ${keyTerms}, applying concepts to real-world scenarios, and developing analytical skills in ${subject}.`,
        explanation: 'This chapter aims to build a strong foundation in the subject matter.',
        marks: 3
      },
      {
        question: `Fill in the blank: The ${chapter} chapter focuses on _____ in ${subject}.`,
        type: 'fill_blank',
        difficulty: difficulty,
        topic: topic,
        correctAnswer: keyTerms,
        explanation: `The chapter primarily deals with ${keyTerms} and their applications.`,
        marks: 1
      }
    ];

    // Generate the requested number of questions
    for (let i = 0; i < count && i < sampleQuestions.length; i++) {
      const question = { ...sampleQuestions[i] };
      
      // Ensure the question type is in the allowed types
      if (questionTypes && !questionTypes.includes(question.type)) {
        question.type = questionTypes[0] || 'mcq';
      }
      
      questions.push(question);
    }

    logger.info(`Generated ${questions.length} sample questions for ${subject} - ${chapter}`);
    return questions;
  }

  // Test AI service connection
  async testConnection() {
    if (!this.openai) {
      return false;
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });
      return completion.choices[0].message.content ? true : false;
    } catch (error) {
      logger.error('AI service connection test failed:', error);
      return false;
    }
  }
}

module.exports = new AIService();
