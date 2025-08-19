const OpenAI = require('openai');
const logger = require('../utils/logger');
const { clear } = require('winston');

class AIService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    console.log('Initializing Multi-Language AI Service with OpenAI API Key:', apiKey);
    if (!apiKey) {
      logger.warn('OpenAI API key not configured. AI features will be disabled.');
      this.openai = null;
    } else {
      this.openai = new OpenAI({
        apiKey: apiKey
      });
    }

    // Language-specific model configurations
    this.languageModels = {
      english: {
        provider: 'openai',
        model: 'gpt-5',
        maxTokens: 4000,
        temperature: 0.3
      },
      hindi: {
        provider: 'huggingface',
        model: 'Llama-3-Nanda-10B-Chat',
        maxTokens: 2000,
        temperature: 0.7
      },
      sanskrit: {
        provider: 'huggingface',
        model: 'ByT5-Sanskrit',
        maxTokens: 2000,
        temperature: 0.7
      },
      urdu: {
        provider: 'huggingface',
        model: 'Paramanu',
        maxTokens: 2000,
        temperature: 0.7
      }
    };
  }

  // Get language-specific model configuration
  getModelConfig(language) {
    const lang = language.toLowerCase();
    return this.languageModels[lang] || this.languageModels.english;
  }

  // Get language-specific instructions
  getLanguageInstructions(language) {
    const lang = language.toLowerCase();
    const instructions = {
      english: 'You are a CBSE question paper creator. Respond with ONLY valid JSON arrays. No explanations or other text.',
      hindi: 'आप एक CBSE प्रश्न पत्र निर्माता हैं। केवल वैध JSON arrays के साथ जवाब दें। कोई स्पष्टीकरण या अन्य टेक्स्ट नहीं।',
      sanskrit: 'त्वं CBSE प्रश्नपत्रस्य निर्माता असि। केवलं वैध JSON arrays सह उत्तरं ददातु। न कोऽपि स्पष्टीकरणः अन्यः वा पाठः।',
      urdu: 'آپ ایک CBSE سوالیہ پیپر بنانے والے ہیں۔ صرف درست JSON arrays کے ساتھ جواب دیں۔ کوئی وضاحت یا دوسرا متن نہیں۔'
    };
    return instructions[lang] || instructions.english;
  }

  // Generate questions from text content with language support
  async generateQuestions(content, options = {}) {
    try {
      const {
        subject = 'General',
        chapter = 'General',
        topic = 'General',
        questionTypes = ['mcq', 'short_answer', 'long_answer'],
        difficulty = 'medium',
        count = 5,
        language = 'english'
      } = options;

      logger.info(`Generating questions in ${language} language for ${subject} - ${chapter}`);

      // Clean and chunk the content
      const cleanedContent = this.cleanContent(content, language);
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
          Math.ceil(count / chunks.length),
          language
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

  // Generate questions from a single chunk with language support
  async generateQuestionsFromChunk(chunk, subject, chapter, topic, questionTypes, difficulty, count, language = 'english') {
    const modelConfig = this.getModelConfig(language);
    
    if (!this.openai && modelConfig.provider === 'openai') {
      logger.warn('OpenAI not configured. Generating sample questions instead.');
      return this.generateSampleQuestions(chunk, subject, chapter, topic, questionTypes, difficulty, count, language);
    }

    // Validate content quality
    if (!this.isValidContent(chunk, language)) {
      logger.warn('Content quality too low, generating sample questions instead.');
      return this.generateSampleQuestions(chunk, subject, chapter, topic, questionTypes, difficulty, count, language);
    }

    const prompt = this.buildQuestionPrompt(chunk, subject, chapter, topic, questionTypes, difficulty, count, language);

    try {
      if (modelConfig.provider === 'openai') {
        return await this.generateWithOpenAI(prompt, modelConfig, language);
      } else {
        return await this.generateWithHuggingFace(prompt, modelConfig, language);
      }
    } catch (error) {
      logger.error(`Error generating questions with ${modelConfig.provider}:`, error);
      logger.warn('Falling back to sample questions');
      return this.generateSampleQuestions(chunk, subject, chapter, topic, questionTypes, difficulty, count, language);
    }
  }

  // Generate questions using OpenAI
  async generateWithOpenAI(prompt, modelConfig, language) {
    const requestConfig = {
      model: modelConfig.model,
        messages: [
          {
            role: 'system',
          content: this.getLanguageInstructions(language)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      max_completion_tokens: modelConfig.maxTokens
    };

    // Only add temperature for models that support it (not GPT-5)
    if (modelConfig.model !== 'gpt-5' && modelConfig.temperature !== undefined) {
      requestConfig.temperature = modelConfig.temperature;
    }

    const completion = await this.openai.chat.completions.create(requestConfig);

      const response = completion.choices[0].message.content;
    return this.parseQuestionsFromResponse(response, ['mcq', 'short_answer', 'long_answer'], language);
  }

  // Generate questions using HuggingFace (placeholder for future implementation)
  async generateWithHuggingFace(prompt, modelConfig, language) {
    logger.info(`Using HuggingFace model: ${modelConfig.model} for ${language}`);
    
    // For now, return sample questions as HuggingFace integration requires additional setup
    // TODO: Implement HuggingFace API integration
    logger.warn('HuggingFace integration not yet implemented, using sample questions');
    return this.generateSampleQuestions('sample content', 'General', 'General', 'General', ['mcq', 'short_answer'], 'medium', 5, language);
  }

  // Build question prompt with language support
  buildQuestionPrompt(content, subject, chapter, topic, questionTypes, difficulty, count, language = 'english') {
    const lang = language.toLowerCase();
    
    const prompts = {
      english: `Generate ${count} ${difficulty} level questions from the following content for CBSE ${subject} - Chapter ${chapter} (${topic}).

Content: ${content}

Question Types: ${questionTypes.join(', ')}

Respond with ONLY a valid JSON array of questions. Each question should have:
- question: The question text
- type: One of ${questionTypes.join(', ')}
- difficulty: ${difficulty}
- topic: ${topic}
- options: Array of 4 options (for MCQ only)
- correctAnswer: The correct answer
- explanation: Brief explanation (optional)

Example format:
[{"question": "...", "type": "mcq", "difficulty": "${difficulty}", "topic": "${topic}", "options": ["...", "...", "...", "..."], "correctAnswer": "...", "explanation": "..."}]`,

      hindi: `निम्नलिखित सामग्री से CBSE ${subject} - अध्याय ${chapter} (${topic}) के लिए ${count} ${difficulty} स्तर के प्रश्न उत्पन्न करें।

सामग्री: ${content}

प्रश्न प्रकार: ${questionTypes.join(', ')}

केवल प्रश्नों के वैध JSON array के साथ जवाब दें। प्रत्येक प्रश्न में होना चाहिए:
- question: प्रश्न का पाठ
- type: ${questionTypes.join(', ')} में से एक
- difficulty: ${difficulty}
- topic: ${topic}
- options: 4 विकल्पों का array (केवल MCQ के लिए)
- correctAnswer: सही उत्तर
- explanation: संक्षिप्त स्पष्टीकरण (वैकल्पिक)`,

      sanskrit: `निम्नलिखित सामग्रीतः CBSE ${subject} - अध्याय ${chapter} (${topic}) कृते ${count} ${difficulty} स्तरस्य प्रश्नान् उत्पादयतु।

सामग्री: ${content}

प्रश्न प्रकाराः ${questionTypes.join(', ')}

केवलं प्रश्नानां वैध JSON array सह उत्तरं ददातु। प्रत्येक प्रश्ने भवेत्:
- question: प्रश्नस्य पाठः
- type: ${questionTypes.join(', ')} मध्ये एकः
- difficulty: ${difficulty}
- topic: ${topic}
- options: 4 विकल्पानां array (केवलं MCQ कृते)
- correctAnswer: सत्यम् उत्तरम्
- explanation: संक्षिप्तं स्पष्टीकरणम् (वैकल्पिकम्)`,

      urdu: `مندرجہ ذیل مواد سے CBSE ${subject} - باب ${chapter} (${topic}) کے لیے ${count} ${difficulty} سطح کے سوالات تیار کریں۔

مواد: ${content}

سوال کی اقسام: ${questionTypes.join(', ')}

صرف سوالات کے درست JSON array کے ساتھ جواب دیں۔ ہر سوال میں ہونا چاہیے:
- question: سوال کا متن
- type: ${questionTypes.join(', ')} میں سے ایک
- difficulty: ${difficulty}
- topic: ${topic}
- options: 4 اختیارات کا array (صرف MCQ کے لیے)
- correctAnswer: درست جواب
- explanation: مختصر وضاحت (اختیاری)`
    };

    return prompts[lang] || prompts.english;
  }

  // Parse questions from AI response with language support
  parseQuestionsFromResponse(response, questionTypes, language = 'english') {
    try {
      // Clean the response
      const cleanedResponse = this.cleanJSONString(response);
      
      // Try to parse as JSON
      let questions = JSON.parse(cleanedResponse);
      
      if (!Array.isArray(questions)) {
        logger.warn('AI response is not an array, attempting to extract array');
        questions = this.extractArrayFromResponse(cleanedResponse);
      }

      if (!questions || questions.length === 0) {
        logger.warn('No questions found in AI response');
        return [];
      }

      // Validate and clean each question
      const validQuestions = questions
        .filter(q => this.isValidQuestion(q, questionTypes))
        .map(q => this.cleanQuestion(q, language));

      logger.info(`Successfully parsed ${validQuestions.length} questions from AI response`);
      return validQuestions;

    } catch (error) {
      logger.error('Error parsing AI response:', error);
      logger.debug('Raw response:', response);
      return [];
    }
  }

  // Clean JSON string while preserving language characters
  cleanJSONString(jsonString) {
    // Remove control characters but preserve language characters
    return jsonString
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim()
      .replace(/^```json\s*/, '')
      .replace(/\s*```$/, '');
  }

  // Extract array from response if it's wrapped in other text
  extractArrayFromResponse(response) {
    try {
      // Look for array patterns
      const arrayMatch = response.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        return JSON.parse(arrayMatch[0]);
      }
      
      // Look for JSON object patterns
      const objectMatch = response.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        const obj = JSON.parse(objectMatch[0]);
        return obj.questions || obj.data || [obj];
      }
      
      return null;
    } catch (error) {
      logger.error('Error extracting array from response:', error);
      return null;
    }
  }

  // Validate question structure
  isValidQuestion(question, questionTypes) {
    return question &&
           question.question &&
           question.type &&
           questionTypes.includes(question.type) &&
           question.difficulty &&
           question.topic;
  }

  // Clean and format question with language awareness
  cleanQuestion(question, language = 'english') {
    if (!question || typeof question !== 'object') return null;

    const cleaned = { ...question };
    logger.info(`Cleaning question: ${question.question ? question.question.substring(0, 100) : 'NO_QUESTION'}`);

    // Clean question text - be more careful with cleaning
    if (cleaned.question) {
      // Don't over-clean sample questions
      if (typeof cleaned.question === 'string' && cleaned.question.includes('{')) {
        // This is a sample question with placeholders, clean minimally
        cleaned.question = cleaned.question
          .replace(/\s+/g, ' ')
          .trim();
      } else {
        // For AI-generated questions, apply minimal cleaning
        cleaned.question = cleaned.question
          .replace(/\s+/g, ' ')
          .replace(/\n+/g, ' ')
          .trim();
      }
      
      // Ensure question is not empty after cleaning
      if (!cleaned.question || cleaned.question.trim().length === 0) {
        logger.warn(`Question became empty after cleaning, using original: ${question.question}`);
        cleaned.question = question.question || 'Sample question';
      }
      
      // Remove any corrupted characters that might have been introduced
      if (language === 'hindi' || language === 'sanskrit') {
        // Remove common corrupted patterns
        cleaned.question = cleaned.question
          .replace(/[,\-\?]{2,}/g, '') // Remove multiple commas, dashes, question marks
          .replace(/^[,\-\?\s]+/, '') // Remove leading corrupted chars
          .replace(/[,\-\?\s]+$/, '') // Remove trailing corrupted chars
          .trim();
      }
    }

    // Clean options for MCQ questions
    if (cleaned.options && Array.isArray(cleaned.options)) {
      cleaned.options = cleaned.options.map(option => {
        if (typeof option === 'string') {
          // Convert string option to object format
          return {
            text: option.trim(), // Minimal cleaning for options
            isCorrect: false
          };
        } else if (typeof option === 'object' && option.text) {
          return {
            text: option.text.trim(), // Minimal cleaning for options
            isCorrect: option.isCorrect || false
          };
        }
        return option;
      }).filter(option => option && option.text && option.text.trim().length > 0);
    }

    // Clean other text fields - minimal cleaning
    if (cleaned.correctAnswer) {
      cleaned.correctAnswer = typeof cleaned.correctAnswer === 'string' 
        ? cleaned.correctAnswer.trim() 
        : cleaned.correctAnswer;
    }

    if (cleaned.explanation) {
      cleaned.explanation = typeof cleaned.explanation === 'string' 
        ? cleaned.explanation.trim() 
        : cleaned.explanation;
    }

    // Ensure proper language formatting for sample questions
    if (language === 'hindi' || language === 'sanskrit') {
      // For sample questions, ensure they're properly formatted
      if (cleaned.question && cleaned.question.includes('{')) {
        // This is a sample question, ensure proper formatting
        cleaned.question = cleaned.question
          .replace(/\s+/g, ' ')
          .trim();
      }
    }

    // Ensure required fields are present
    if (!cleaned.type) cleaned.type = 'mcq';
    if (!cleaned.difficulty) cleaned.difficulty = 'medium';
    if (!cleaned.topic) cleaned.topic = 'General';
    if (!cleaned.language) cleaned.language = language;

    logger.info(`Cleaned question: ${cleaned.question ? cleaned.question.substring(0, 100) : 'EMPTY'}`);
    return cleaned;
  }

  // Clean content while preserving language characters
  cleanContent(content, language = 'english') {
    if (!content) return '';
    
    let cleaned = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();

    // Language-specific cleaning
    if (language === 'hindi' || language === 'sanskrit') {
      // Preserve Devanagari characters and common English words, remove random characters
      cleaned = cleaned
        .replace(/[^\u0900-\u097F\s\w\.\,\;\:\!\?\-\(\)\[\]\{\}\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u0F00-\u0FFF\u1000-\u109F\u1780-\u17FF\u1B00-\u1B7F\u1CD0-\u1CFF\uA800-\uA82F\uA840-\uA87F\uA880-\uA8DF\uA900-\uA92F\uA930-\uA95F\uAA00-\uAA5F\uAA60-\uAA7F\uAA80-\uAADF\uAAE0-\uAAFF\uAB00-\uAB2F\uAB30-\uAB6F\uAB70-\uABBF\uABC0-\uABFF\uD800-\uDFFF\uF900-\uFAFF\uFE70-\uFEFF]/g, '')
        .replace(/\b[a-z]{1,2}\b/g, '') // Remove very short English words (1-2 letters)
        .replace(/\b[a-z]{3,}\b(?=\s*[\u0900-\u097F])/g, '') // Remove English words before Hindi
        .replace(/(?<=[\u0900-\u097F])\s+\b[a-z]{3,}\b/g, '') // Remove English words after Hindi
        .replace(/\s+/g, ' ') // Clean up multiple spaces
        .trim();
    } else if (language === 'urdu') {
      // Preserve Arabic/Persian characters and common English words
      cleaned = cleaned.replace(/[^\u0600-\u06FF\s\w\.\,\;\:\!\?\-\(\)\[\]\{\}]/g, '');
    } else {
      // English cleaning
      cleaned = cleaned.replace(/[^\w\s\.\,\;\:\!\?\-\(\)\[\]\{\}]/g, '');
    }

    return cleaned;
  }

  // Validate content quality
  isValidContent(content, language = 'english') {
    if (!content || content.length < 50) return false;
    
    const words = content.split(/\s+/).filter(word => word.length > 0);
    if (words.length < 10) return false;

    // Language-specific validation
    if (language === 'hindi' || language === 'sanskrit' || language === 'urdu') {
      // Check for meaningful content in Indian languages
      const meaningfulChars = content.match(/[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u0F00-\u0FFF\u1000-\u109F\u1780-\u17FF\u1B00-\u1B7F\u1CD0-\u1CFF\uA800-\uA82F\uA840-\uA87F\uA880-\uA8DF\uA900-\uA92F\uA930-\uA95F\uAA00-\uAA5F\uAA60-\uAA7F\uAA80-\uAADF\uAAE0-\uAAFF\uAB00-\uAB2F\uAB30-\uAB6F\uAB70-\uABBF\uABC0-\uABFF\uD800-\uDFFF\uF900-\uFAFF\uFE70-\uFEFF]/g);
      if (meaningfulChars && meaningfulChars.length > 0) {
        // Lower threshold for mixed content
        return (meaningfulChars.length / content.length) > 0.05; // Reduced from 0.1 to 0.05
      }
      
      // If no meaningful chars but has mixed content, still consider valid
      const hasEnglish = content.match(/[a-zA-Z]/g);
      if (hasEnglish && content.length > 100) {
        return true; // Mixed content is valid
      }
    }

    // Default validation for English
    const meaningfulWords = words.filter(word => word.length > 2);
    return (meaningfulWords.length / words.length) > 0.3; // At least 30% meaningful words
  }

  // Chunk content for processing
  chunkContent(content, maxChunkSize) {
    const chunks = [];
    let currentChunk = '';
    
    const sentences = content.split(/[.!?।॥]/).filter(s => s.trim().length > 0);

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

    return chunks.length > 0 ? chunks : [content];
  }

  // Ensure good mix of question types
  ensureQuestionTypeMix(questions, questionTypes, targetCount) {
    const typeCounts = {};
    questionTypes.forEach(type => typeCounts[type] = 0);

      questions.forEach(q => {
      if (typeCounts.hasOwnProperty(q.type)) {
        typeCounts[q.type]++;
      }
    });
    
    // Calculate target distribution
    const targetPerType = Math.ceil(targetCount / questionTypes.length);
    
    // Sort questions to prioritize underrepresented types
    return questions.sort((a, b) => {
      const aCount = typeCounts[a.type] || 0;
      const bCount = typeCounts[b.type] || 0;
      return aCount - bCount;
    });
  }

  // Generate sample questions for fallback
  generateSampleQuestions(content, subject, chapter, topic, questionTypes, difficulty, count, language = 'english') {
    logger.info(`Generating ${count} sample questions in ${language} for ${subject} - ${chapter}`);
    
    const samples = {
      english: [
        {
          question: `What is the main topic discussed in ${chapter} of ${subject}?`,
          type: 'mcq',
          difficulty: difficulty,
          topic: topic,
          options: [
            { text: 'Option A', isCorrect: true },
            { text: 'Option B', isCorrect: false },
            { text: 'Option C', isCorrect: false },
            { text: 'Option D', isCorrect: false }
          ],
          correctAnswer: 'Option A',
          explanation: 'This is a sample question for demonstration purposes.'
        },
        {
          question: `Explain the key concept of ${topic} in ${subject}.`,
          type: 'short_answer',
          difficulty: difficulty,
          topic: topic,
          options: [],
          correctAnswer: 'Sample answer for demonstration.',
          explanation: 'This is a sample question for demonstration purposes.'
        }
      ],
      hindi: [
        {
          question: `${subject} के ${chapter} में क्या मुख्य विषय चर्चा की गई है?`,
          type: 'mcq',
          difficulty: difficulty,
          topic: topic,
          options: [
            { text: 'विकल्प A', isCorrect: true },
            { text: 'विकल्प B', isCorrect: false },
            { text: 'विकल्प C', isCorrect: false },
            { text: 'विकल्प D', isCorrect: false }
          ],
          correctAnswer: 'विकल्प A',
          explanation: 'यह प्रदर्शन उद्देश्यों के लिए एक नमूना प्रश्न है।'
        },
        {
          question: `${subject} में ${topic} की मुख्य अवधारणा को समझाएं।`,
          type: 'short_answer',
          difficulty: difficulty,
          topic: topic,
          options: [],
          correctAnswer: 'प्रदर्शन के लिए नमूना उत्तर।',
          explanation: 'यह प्रदर्शन उद्देश्यों के लिए एक नमूना प्रश्न है।'
        },
        {
          question: `${chapter} के अनुसार ${topic} का क्या महत्व है?`,
          type: 'mcq',
          difficulty: difficulty,
          topic: topic,
          options: [
            { text: 'यह अध्ययन के लिए आवश्यक है', isCorrect: true },
            { text: 'इसका कोई महत्व नहीं है', isCorrect: false },
            { text: 'यह वैकल्पिक विषय है', isCorrect: false },
            { text: 'इसे छोड़ा जा सकता है', isCorrect: false }
          ],
          correctAnswer: 'यह अध्ययन के लिए आवश्यक है',
          explanation: 'यह विषय पाठ्यक्रम का महत्वपूर्ण भाग है।'
        },
        {
          question: `${subject} के ${chapter} में ${topic} के बारे में क्या पढ़ाया जाता है?`,
          type: 'short_answer',
          difficulty: difficulty,
          topic: topic,
          options: [],
          correctAnswer: 'इस अध्याय में हमें मूल अवधारणाएं और सिद्धांत सिखाए जाते हैं।',
          explanation: 'यह अध्याय छात्रों को बुनियादी ज्ञान प्रदान करता है।'
        },
        {
          question: `${topic} से संबंधित मुख्य सिद्धांत क्या हैं?`,
          type: 'mcq',
          difficulty: difficulty,
          topic: topic,
          options: [
            { text: 'सिद्धांत A और B', isCorrect: true },
            { text: 'केवल सिद्धांत A', isCorrect: false },
            { text: 'सिद्धांत C और D', isCorrect: false },
            { text: 'कोई सिद्धांत नहीं', isCorrect: false }
          ],
          correctAnswer: 'सिद्धांत A और B',
          explanation: 'ये दोनों सिद्धांत इस विषय की नींव हैं।'
        }
      ],
      sanskrit: [
        {
          question: `${subject}स्य ${chapter} किम् मुख्यं विषयम् चर्चितम्?`,
          type: 'mcq',
          difficulty: difficulty,
          topic: topic,
          options: [
            { text: 'विकल्प A', isCorrect: true },
            { text: 'विकल्प B', isCorrect: false },
            { text: 'विकल्प C', isCorrect: false },
            { text: 'विकल्प D', isCorrect: false }
          ],
          correctAnswer: 'विकल्प A',
          explanation: 'एषः प्रदर्शनार्थं नमूना प्रश्नः।'
        },
        {
          question: `${subject}े ${topic}स्य मुख्यं सिद्धान्तं व्याख्यातु।`,
          type: 'short_answer',
          difficulty: difficulty,
          topic: topic,
          options: [],
          correctAnswer: 'प्रदर्शनार्थं नमूना उत्तरम्।',
          explanation: 'एषः प्रदर्शनार्थं नमूना प्रश्नः।'
        }
      ],
      urdu: [
        {
          question: `${subject} کے ${chapter} میں کیا اہم موضوع زیر بحث آیا ہے؟`,
          type: 'mcq',
          difficulty: difficulty,
          topic: topic,
          options: [
            { text: 'اختیار A', isCorrect: true },
            { text: 'اختیار B', isCorrect: false },
            { text: 'اختیار C', isCorrect: false },
            { text: 'اختیار D', isCorrect: false }
          ],
          correctAnswer: 'اختیار A',
          explanation: 'یہ مظاہرے کے مقاصد کے لیے ایک نمونہ سوال ہے۔'
        },
        {
          question: `${subject} میں ${topic} کی اہم تصور کو واضح کریں۔`,
          type: 'short_answer',
          difficulty: difficulty,
          topic: topic,
          options: [],
          correctAnswer: 'مظاہرے کے لیے نمونہ جواب۔',
          explanation: 'یہ مظاہرے کے مقاصد کے لیے ایک نمونہ سوال ہے۔'
        }
      ]
    };

    const langSamples = samples[language] || samples.english;
    const result = [];
    
    for (let i = 0; i < count; i++) {
      const sample = langSamples[i % langSamples.length];
      // Properly replace placeholders
      const question = sample.question
        .replace(/\{subject\}/g, subject)
        .replace(/\{chapter\}/g, chapter)
        .replace(/\{topic\}/g, topic);
      
      result.push({
        ...sample,
        question: question
      });
    }
    
    return result;
  }

  // Test connection to AI service
  async testConnection() {
    if (!this.openai) {
      return { success: false, message: 'OpenAI not configured' };
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'user',
            content: 'Hello! Please respond with "Connection successful"'
          }
        ],
        max_completion_tokens: 50
        // Note: No temperature parameter for GPT-5
      });

      const response = completion.choices[0].message.content;
      return { 
        success: true, 
        message: 'AI service connection successful',
        response: response
      };
    } catch (error) {
      logger.error('AI service connection test failed:', error);
      return { 
        success: false, 
        message: 'AI service connection failed',
        error: error.message
      };
    }
  }
}

module.exports = new AIService();