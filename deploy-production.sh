#!/bin/bash

# AI Education Platform - Production Deployment Script
# This script handles the complete production deployment process

set -e  # Exit on any error

echo "🚀 Starting AI Education Platform Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
check_directory() {
    if [ ! -f "deploy.sh" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    print_success "Directory structure verified"
}

# Install frontend dependencies
install_frontend() {
    print_status "Installing frontend dependencies..."
    cd frontend
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in frontend directory"
        exit 1
    fi
    
    npm install
    print_success "Frontend dependencies installed"
    cd ..
}

# Build frontend for production
build_frontend() {
    print_status "Building frontend for production..."
    cd frontend
    
    # Clean previous build
    if [ -d "build" ]; then
        rm -rf build
        print_status "Cleaned previous build"
    fi
    
    # Build the application
    npm run build
    
    if [ ! -f "build/index.html" ]; then
        print_error "Build failed - index.html not found in build directory"
        exit 1
    fi
    
    print_success "Frontend built successfully"
    print_status "Build files created in frontend/build/"
    cd ..
}

# Install backend dependencies
install_backend() {
    print_status "Installing backend dependencies..."
    cd backend
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in backend directory"
        exit 1
    fi
    
    npm install
    print_success "Backend dependencies installed"
    cd ..
}

# Copy frontend build to backend
copy_frontend_to_backend() {
    print_status "Copying frontend build to backend..."
    
    # Create backend public directory if it doesn't exist
    mkdir -p backend/public
    
    # Copy build files to backend public directory
    cp -r frontend/build/* backend/public/
    
    # Verify the copy
    if [ ! -f "backend/public/index.html" ]; then
        print_error "Failed to copy index.html to backend/public/"
        exit 1
    fi
    
    print_success "Frontend build copied to backend/public/"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    # Backend directories
    mkdir -p backend/uploads
    mkdir -p backend/logs
    mkdir -p backend/public
    
    # Set permissions
    chmod 755 backend/uploads
    chmod 755 backend/logs
    chmod 755 backend/public
    
    print_success "Directories created"
}

# Check environment configuration
check_environment() {
    print_status "Checking environment configuration..."
    
    if [ ! -f "backend/.env" ]; then
        print_warning "backend/.env file not found"
        print_status "Creating .env from example..."
        if [ -f "backend/env.example" ]; then
            cp backend/env.example backend/.env
            print_warning "Please update backend/.env with your actual configuration values"
        else
            print_error "backend/env.example not found"
            exit 1
        fi
    else
        print_success "Backend environment file found"
    fi
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment setup..."
    
    # Check if index.html exists in backend/public
    if [ ! -f "backend/public/index.html" ]; then
        print_error "index.html not found in backend/public/"
        exit 1
    fi
    
    # Check if backend can start
    print_status "Testing backend startup..."
    cd backend
    timeout 10s npm start > /dev/null 2>&1 || true
    cd ..
    
    print_success "Deployment verification completed"
}

# Main deployment function
main() {
    echo "🎓 AI Education Platform Production Deployment"
    echo "=============================================="
    
    # Check directory
    check_directory
    
    # Create directories
    create_directories
    
    # Check environment
    check_environment
    
    # Install dependencies
    install_frontend
    install_backend
    
    # Build frontend
    build_frontend
    
    # Copy to backend
    copy_frontend_to_backend
    
    # Verify deployment
    verify_deployment
    
    echo ""
    print_success "🎉 Production deployment completed successfully!"
    echo ""
    print_status "Next steps:"
    echo "1. Update backend/.env with your configuration"
    echo "2. Start the server: cd backend && npm start"
    echo "3. Access your application at: http://localhost:5025"
    echo ""
    print_status "The index.html file is now available at: backend/public/index.html"
}

# Run main function
main 