<<<<<<< HEAD
# AI Education Platform

A comprehensive AI-powered education platform for generating questions from PDF documents and managing question banks. Built with React.js frontend and Node.js/Express.js backend with MongoDB database.

## 🚀 Features

### Core Features
- **PDF Upload & Processing**: Upload PDF documents and extract text content
- **AI Question Generation**: Generate multiple question types using OpenAI GPT-4
- **Question Bank Management**: Organize questions by subject, chapter, and topic
- **Question Paper Creation**: Create custom question papers with various export formats
- **Image to PDF Conversion**: Convert multiple images to PDF for processing
- **User Management**: Role-based access control (Super Admin, Admin, Teacher)
- **Real-time Dashboard**: Statistics and recent activity monitoring

### Question Types Supported
- Multiple Choice Questions (MCQ)
- Short Answer Questions
- Long Answer Questions
- True/False Questions
- Fill in the Blank Questions

### Export Options
- PDF Export (print-ready format)
- JSON Export
- Question paper generation with customizable settings

## 🛠️ Tech Stack

### Frontend
- **React.js** - UI framework
- **Tailwind CSS** - Styling
- **React Query** - Data fetching and caching
- **Axios** - HTTP client
- **React Router** - Navigation

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **OpenAI API** - AI question generation
- **Multer** - File upload handling
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **pdf-parse** - PDF text extraction
- **pdf-lib** - PDF manipulation
- **sharp** - Image processing

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **MongoDB** (v4.4 or higher)
- **OpenAI API Key**

## 🔧 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ai-education-platform
```

### 2. Install Dependencies

#### Backend Dependencies
```bash
cd backend
npm install
```

#### Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 3. Environment Configuration

#### Backend Environment (.env)
Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=5025
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/ai_education_platform

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379
```

#### Frontend Environment
Create a `.env` file in the `frontend` directory:

```env
REACT_APP_API_URL=http://localhost:5025
REACT_APP_ENV=development
```

### 4. Database Setup

#### Start MongoDB
```bash
# Start MongoDB service
mongod

# Or using MongoDB Atlas (cloud)
# Update MONGODB_URI in .env with your Atlas connection string
```

#### Database Seeding
The application automatically seeds the database with initial data on first run:
- Super Admin user
- Sample subjects and chapters
- Default configurations

### 5. OpenAI API Setup

1. Sign up for OpenAI API at https://platform.openai.com/
2. Generate an API key
3. Add the API key to your backend `.env` file

## 🚀 Running the Application

### Development Mode

#### Start Backend Server
```bash
cd backend
npm start
# or
npm run dev
```

#### Start Frontend Development Server
```bash
cd frontend
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5025

### Production Mode

#### Build Frontend
```bash
cd frontend
npm run build
```

#### Start Production Server
```bash
cd backend
NODE_ENV=production npm start
```

## 📁 Project Structure

```
ai-education-platform/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── Chapter.js
│   │   ├── Pdf.js
│   │   ├── Question.js
│   │   ├── QuestionPaper.js
│   │   ├── Subject.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── chapters.js
│   │   ├── dashboard.js
│   │   ├── images.js
│   │   ├── pdfs.js
│   │   ├── questionPapers.js
│   │   ├── questions.js
│   │   ├── subjects.js
│   │   └── users.js
│   ├── services/
│   │   ├── aiService.js
│   │   ├── pdfService.js
│   │   └── queueService.js
│   ├── utils/
│   │   ├── logger.js
│   │   └── seeder.js
│   ├── uploads/
│   ├── logs/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   └── UI/
│   │   ├── contexts/
│   │   ├── pages/
│   │   │   ├── Auth/
│   │   │   ├── Dashboard/
│   │   │   ├── Questions/
│   │   │   ├── PDFs/
│   │   │   ├── Images/
│   │   │   └── Users/
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
├── .gitignore
└── README.md
```

## 🔐 Authentication & Authorization

### User Roles
- **Super Admin**: Full system access, user management
- **Admin**: Content management, question bank access
- **Teacher**: Question generation, paper creation, limited access

### Default Super Admin Credentials
- **Email**: admin@example.com
- **Password**: admin123

**⚠️ Important**: Change these credentials after first login!

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### PDF Management
- `GET /api/pdfs` - Get all PDFs
- `POST /api/pdfs` - Upload new PDF
- `GET /api/pdfs/:id` - Get PDF by ID
- `PUT /api/pdfs/:id` - Update PDF
- `DELETE /api/pdfs/:id` - Delete PDF

### Question Management
- `GET /api/questions` - Get all questions (with pagination)
- `POST /api/questions` - Create manual question
- `POST /api/questions/generate` - Generate AI questions
- `GET /api/questions/:id` - Get question by ID
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question

### Question Papers
- `GET /api/question-papers` - Get all question papers
- `POST /api/question-papers` - Create question paper
- `GET /api/question-papers/:id` - Get question paper by ID
- `PUT /api/question-papers/:id` - Update question paper
- `DELETE /api/question-papers/:id` - Delete question paper

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/recent-activity` - Get recent activity
- `GET /api/dashboard/system-status` - Get system status

## 🚀 Deployment

### Environment Variables for Production

#### Backend (.env)
```env
NODE_ENV=production
PORT=5025
MONGODB_URI=mongodb://your-production-mongodb-uri
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRE=7d
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
LOG_LEVEL=error
```

#### Frontend (.env)
```env
REACT_APP_API_URL=https://your-backend-domain.com
REACT_APP_ENV=production
```

### Deployment Steps

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Setup Production Server**
   - Install Node.js and MongoDB on production server
   - Copy backend files to server
   - Install dependencies: `npm install --production`

3. **Configure Environment**
   - Set up production environment variables
   - Configure MongoDB connection
   - Set up OpenAI API key

4. **Start Application**
   ```bash
   cd backend
   npm start
   ```

5. **Setup Reverse Proxy (Optional)**
   - Configure Nginx or Apache for better performance
   - Set up SSL certificates
   - Configure static file serving

### Docker Deployment (Optional)

Create a `Dockerfile` in the root directory:

```dockerfile
# Backend Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .
EXPOSE 5025
CMD ["npm", "start"]
```

## 🔧 Configuration

### File Upload Limits
- **Maximum File Size**: 10MB (configurable in .env)
- **Supported Formats**: PDF, Images (JPG, PNG, GIF)

### AI Configuration
- **Model**: GPT-4 Turbo
- **Temperature**: 0.3 (for consistent output)
- **Max Tokens**: 2000
- **Question Types**: Configurable per upload

### Database Configuration
- **Connection Pool**: 10 connections
- **Timeout**: 30 seconds
- **Indexes**: Optimized for common queries

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check if MongoDB is running
   - Verify connection string in .env
   - Check network connectivity

2. **OpenAI API Errors**
   - Verify API key is correct
   - Check API quota and billing
   - Ensure API key has proper permissions

3. **File Upload Issues**
   - Check upload directory permissions
   - Verify file size limits
   - Ensure proper file formats

4. **Frontend Build Errors**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify all environment variables

### Logs
- **Backend Logs**: `backend/logs/`
- **Error Logs**: `backend/logs/error.log`
- **Application Logs**: `backend/logs/combined.log`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Updates

### Version History
- **v1.0.0** - Initial release with core features
- **v1.1.0** - Added image to PDF conversion
- **v1.2.0** - Enhanced question generation and UI improvements

### Upcoming Features
- Advanced analytics dashboard
- Bulk question import/export
- Integration with LMS platforms
- Mobile application
- Multi-language support

---

**Note**: This is a production-ready application. Make sure to:
- Change default credentials
- Configure proper security settings
- Set up monitoring and logging
- Regular database backups
- Keep dependencies updated 
=======
# School-paer
>>>>>>> 8693b71d609e6df963d59b9e607f0ec08883aee4
