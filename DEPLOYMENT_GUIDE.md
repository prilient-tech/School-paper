# AI Education Platform - Deployment Guide

## Quick Fix for Missing index.html

If you're getting a "missing required fields index.html" error during deployment, follow these steps:

### 1. Build the Frontend
```bash
cd frontend
npm install
npm run build
```

This will create the `frontend/build/` directory containing the production-ready `index.html` file.

### 2. Deploy to Server

#### Option A: Using the Deploy Script
```bash
chmod +x deploy.sh
./deploy.sh
```
Choose option 2 for production deployment.

#### Option B: Manual Deployment
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Build frontend
cd frontend && npm run build

# Copy build to backend public directory
mkdir -p ../backend/public
cp -r build/* ../backend/public/

# Start the server
cd ../backend && npm start
```

### 3. Server Configuration

Make sure your server is configured to serve static files from the `backend/public/` directory.

#### For Express.js (already configured in server.js):
```javascript
app.use(express.static('public'));
```

#### For Nginx:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## Important Notes

- The `frontend/build/` directory is intentionally excluded from git (see `.gitignore`)
- The build process must be run on the server or during deployment
- The `index.html` file is generated during the build process
- Always run `npm run build` before deploying to production

## Environment Variables

Make sure to set up your environment variables:

1. Copy `backend/env.example` to `backend/.env`
2. Update the values with your actual configuration
3. Set up frontend environment variables if needed

## Troubleshooting

- **Missing index.html**: Run `npm run build` in the frontend directory
- **Build errors**: Check for missing dependencies and run `npm install`
- **Port conflicts**: Update the PORT in your environment variables
- **Database connection**: Ensure MongoDB is running and accessible 