# 🚀 Quick Setup Guide for Senior Developer

## Prerequisites Checklist
- [ ] Node.js v16+ installed
- [ ] MongoDB installed and running
- [ ] OpenAI API key obtained
- [ ] Git repository cloned

## ⚡ Quick Start (5 minutes)

### 1. Environment Setup
```bash
# Backend environment
cd backend
cp env.example .env
# Edit .env with your configurations:
# - MONGODB_URI (MongoDB connection string)
# - OPENAI_API_KEY (Your OpenAI API key)
# - JWT_SECRET (Secure random string for JWT)

# Frontend environment
cd ../frontend
echo "REACT_APP_API_URL=http://localhost:5025" > .env
```

### 2. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Start Development Servers
```bash
# Option A: Use deployment script
./deploy.sh

# Option B: Manual start
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Frontend
cd frontend && npm start
```

### 4. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5025
- **Default Admin**: admin@example.com / admin123

## 🔧 Production Deployment

### Option 1: Simple Production
```bash
# Build frontend
cd frontend && npm run build

# Start production server
cd backend && NODE_ENV=production npm start
```

### Option 2: Using Deployment Script
```bash
./deploy.sh
# Choose option 2 for production deployment
```

## 📋 Environment Variables

### Backend (.env)
```env
PORT=5025
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/ai_education_platform
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRE=7d
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
LOG_LEVEL=error
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5025
REACT_APP_ENV=production
```

## 🐛 Common Issues & Solutions

### MongoDB Connection Error
```bash
# Start MongoDB
mongod

# Or use MongoDB Atlas
# Update MONGODB_URI in .env
```

### OpenAI API Error
- Verify API key in backend/.env
- Check API quota at https://platform.openai.com/usage

### Port Already in Use
```bash
# Kill process on port 5025
lsof -ti:5025 | xargs kill -9

# Or change PORT in backend/.env
```

### Frontend Build Error
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📊 Key Features to Test

1. **User Authentication**
   - Login with admin@example.com / admin123
   - Create new users

2. **PDF Upload & Processing**
   - Upload a PDF file
   - Check question generation

3. **Question Management**
   - View generated questions
   - Create question papers
   - Export to PDF

4. **Image to PDF**
   - Upload multiple images
   - Convert to PDF
   - Generate questions

## 🔐 Security Checklist

- [ ] Change default admin password
- [ ] Set secure JWT_SECRET
- [ ] Configure proper CORS settings
- [ ] Set up SSL certificates (production)
- [ ] Configure firewall rules
- [ ] Set up database backups

## 📞 Support

- Check logs in `backend/logs/`
- Review README.md for detailed documentation
- Check API endpoints in README.md

## 🚀 Ready to Deploy!

Your AI Education Platform is now ready for production deployment. The application includes:

- ✅ User authentication & authorization
- ✅ PDF processing & AI question generation
- ✅ Question bank management
- ✅ Question paper creation & export
- ✅ Image to PDF conversion
- ✅ Real-time dashboard
- ✅ Pagination & search
- ✅ Professional UI/UX

**Next Steps:**
1. Test all features thoroughly
2. Configure production environment
3. Set up monitoring and logging
4. Deploy to production server
5. Set up SSL and domain

---

**Need Help?** Check the main README.md for comprehensive documentation. 