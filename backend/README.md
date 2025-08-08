# AI Education Platform - Backend

A comprehensive backend API for an AI-powered educational platform that enables PDF processing, AI question generation, and question paper management.

## Features

- 🔐 **Role-based Authentication**: Super Admin, Admin, and Teacher roles
- 📚 **Content Management**: Subjects, Chapters, and PDF uploads
- 🤖 **AI Integration**: OpenAI-powered question generation from PDF content
- 📄 **PDF Processing**: Text extraction and content analysis
- 🎯 **Question Bank**: Comprehensive question management with filtering
- 📝 **Question Papers**: Custom question paper creation and export
- 🔄 **Background Jobs**: Redis-based job queue for processing
- 📊 **Statistics**: Detailed analytics and reporting

## Tech Stack

- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with bcrypt
- **File Upload**: Multer with PDF processing
- **AI Integration**: OpenAI API
- **Job Queue**: BullMQ with Redis
- **Logging**: Winston
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Redis (v6 or higher)
- OpenAI API key

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-education-platform/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/ai-education-platform
   JWT_SECRET=your-super-secret-jwt-key
   OPENAI_API_KEY=your-openai-api-key
   REDIS_URL=redis://localhost:6379
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Documentation

### Authentication

#### POST /api/auth/login
Login with email and password.
```json
{
  "email": "admin@ai-education.com",
  "password": "admin123"
}
```

#### POST /api/auth/register
Register new user (Super Admin only).
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "teacher"
}
```

### Users Management

#### GET /api/users
Get all users with pagination and filtering.

#### PUT /api/users/:id
Update user information.

#### DELETE /api/users/:id
Delete user (Super Admin only).

### Subjects

#### GET /api/subjects
Get all subjects with filtering.

#### POST /api/subjects
Create new subject.

#### PUT /api/subjects/:id
Update subject.

#### DELETE /api/subjects/:id
Delete subject.

### Chapters

#### GET /api/chapters
Get all chapters with filtering.

#### POST /api/chapters
Create new chapter.

#### PUT /api/chapters/:id
Update chapter.

#### DELETE /api/chapters/:id
Delete chapter.

### PDF Management

#### POST /api/pdfs
Upload and process PDF file.
```json
{
  "title": "Mathematics Chapter 1",
  "subject": "subject_id",
  "chapter": "chapter_id",
  "description": "PDF description",
  "questionTypes": ["mcq", "short_answer"],
  "difficulty": "medium",
  "questionCount": 10
}
```

#### GET /api/pdfs
Get all PDFs with filtering.

#### GET /api/pdfs/:id
Get PDF details with generated questions.

#### PUT /api/pdfs/:id
Update PDF metadata.

#### DELETE /api/pdfs/:id
Delete PDF.

### Questions

#### GET /api/questions
Get all questions with filtering.

#### POST /api/questions
Create question manually.

#### POST /api/questions/generate
Generate questions using AI.
```json
{
  "content": "Educational content text...",
  "subject": "subject_id",
  "chapter": "chapter_id",
  "topic": "Algebra",
  "questionTypes": ["mcq", "short_answer"],
  "difficulty": "medium",
  "count": 5
}
```

#### PUT /api/questions/:id
Update question.

#### DELETE /api/questions/:id
Delete question.

### Question Papers

#### GET /api/question-papers
Get all question papers.

#### POST /api/question-papers
Create new question paper.
```json
{
  "title": "Mathematics Midterm",
  "subject": "subject_id",
  "duration": 120,
  "instructions": "Answer all questions",
  "questions": [
    {
      "question": "question_id",
      "order": 1,
      "marks": 5
    }
  ]
}
```

#### PUT /api/question-papers/:id
Update question paper.

#### POST /api/question-papers/:id/add-questions
Add questions to question paper.

#### POST /api/question-papers/:id/export
Export question paper to PDF/JSON.

## Database Schema

### User
- `name`: String
- `email`: String (unique)
- `password`: String (hashed)
- `role`: Enum ['super_admin', 'admin', 'teacher']
- `isActive`: Boolean
- `assignedSubjects`: Array of Subject IDs
- `assignedChapters`: Array of Chapter IDs

### Subject
- `name`: String
- `code`: String (unique)
- `description`: String
- `grade`: String
- `isActive`: Boolean
- `assignedTeachers`: Array of User IDs

### Chapter
- `name`: String
- `number`: Number
- `description`: String
- `subject`: Subject ID
- `topics`: Array of topics
- `isActive`: Boolean

### PDF
- `title`: String
- `filename`: String
- `filePath`: String
- `subject`: Subject ID
- `chapter`: Chapter ID
- `extractedText`: String
- `processingStatus`: Enum ['pending', 'processing', 'completed', 'failed']
- `questionGenerationStatus`: Enum ['pending', 'processing', 'completed', 'failed']

### Question
- `question`: String
- `type`: Enum ['mcq', 'short_answer', 'long_answer', 'true_false', 'fill_blank']
- `difficulty`: Enum ['easy', 'medium', 'hard']
- `subject`: Subject ID
- `chapter`: Chapter ID
- `topic`: String
- `options`: Array (for MCQ)
- `correctAnswer`: String
- `explanation`: String
- `marks`: Number

### QuestionPaper
- `title`: String
- `subject`: Subject ID
- `questions`: Array of question objects
- `duration`: Number (minutes)
- `totalMarks`: Number
- `instructions`: String
- `createdBy`: User ID

## Background Jobs

The system uses BullMQ with Redis for background processing:

1. **PDF Processing**: Extracts text from uploaded PDFs
2. **Question Generation**: Uses AI to generate questions from extracted text

### Job Status
- `pending`: Job is queued
- `processing`: Job is currently running
- `completed`: Job finished successfully
- `failed`: Job failed with error

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Different permissions for different roles
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers
- **File Upload Validation**: PDF file type and size validation

## Error Handling

The API uses centralized error handling with:
- HTTP status codes
- Descriptive error messages
- Detailed logging
- Validation error responses

## Logging

Uses Winston for comprehensive logging:
- Console logging for development
- File logging for production
- Error tracking
- Request/response logging

## Development

### Running Tests
```bash
npm test
```

### Code Linting
```bash
npm run lint
```

### Database Seeding
The system automatically seeds initial data:
- Super Admin user (admin@ai-education.com / admin123)
- Sample subjects and chapters

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure MongoDB connection string
3. Set up Redis server
4. Configure OpenAI API key
5. Set secure JWT secret
6. Configure file upload limits
7. Set up proper logging

## API Rate Limits

- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables

## File Upload Limits

- Maximum file size: 10MB (configurable)
- Allowed file types: PDF only
- File storage: Local filesystem (configurable)

## Monitoring

- Health check endpoint: `GET /health`
- Queue statistics available via BullMQ
- Detailed logging for debugging
- Error tracking and reporting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
