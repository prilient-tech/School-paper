#!/bin/bash

# AI Education Platform Deployment Script
# This script helps automate the deployment process

set -e  # Exit on any error

echo "🚀 Starting AI Education Platform Deployment..."

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

# Check if Node.js is installed
check_nodejs() {
    print_status "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js v16 or higher."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Node.js version 16 or higher is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_success "Node.js $(node -v) is installed"
}

# Check if npm is installed
check_npm() {
    print_status "Checking npm installation..."
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    print_success "npm $(npm -v) is installed"
}

# Check if MongoDB is running
check_mongodb() {
    print_status "Checking MongoDB connection..."
    if ! command -v mongod &> /dev/null; then
        print_warning "MongoDB is not installed locally. Make sure you have a MongoDB instance running."
    else
        if pgrep -x "mongod" > /dev/null; then
            print_success "MongoDB is running"
        else
            print_warning "MongoDB is not running. Please start MongoDB or use a cloud instance."
        fi
    fi
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
    npm run build
    print_success "Frontend built successfully"
    cd ..
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    # Backend directories
    mkdir -p backend/uploads
    mkdir -p backend/logs
    
    # Set permissions
    chmod 755 backend/uploads
    chmod 755 backend/logs
    
    print_success "Directories created"
}

# Check environment files
check_environment() {
    print_status "Checking environment configuration..."
    
    if [ ! -f "backend/.env" ]; then
        print_warning "backend/.env file not found. Please create it with the required configuration."
        print_status "You can copy backend/env.example to backend/.env and update the values."
    else
        print_success "Backend environment file found"
    fi
    
    if [ ! -f "frontend/.env" ]; then
        print_warning "frontend/.env file not found. Please create it with the required configuration."
    else
        print_success "Frontend environment file found"
    fi
}

# Start development servers
start_development() {
    print_status "Starting development servers..."
    
    # Start backend in background
    cd backend
    npm start &
    BACKEND_PID=$!
    cd ..
    
    # Wait a moment for backend to start
    sleep 3
    
    # Start frontend
    cd frontend
    npm start &
    FRONTEND_PID=$!
    cd ..
    
    print_success "Development servers started"
    print_status "Backend PID: $BACKEND_PID"
    print_status "Frontend PID: $FRONTEND_PID"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend: http://localhost:5025"
    
    # Wait for user to stop
    echo ""
    print_warning "Press Ctrl+C to stop the servers"
    wait
}

# Production deployment
deploy_production() {
    print_status "Starting production deployment..."
    
    # Build frontend
    build_frontend
    
    # Copy frontend build to backend public directory
    print_status "Copying frontend build to backend..."
    mkdir -p backend/public
    cp -r frontend/build/* backend/public/
    
    print_success "Production deployment completed"
    print_status "You can now start the production server with: cd backend && npm start"
}

# Main deployment function
main() {
    echo "🎓 AI Education Platform Deployment Script"
    echo "=========================================="
    
    # Check prerequisites
    check_nodejs
    check_npm
    check_mongodb
    
    # Create directories
    create_directories
    
    # Check environment
    check_environment
    
    # Install dependencies
    install_backend
    install_frontend
    
    # Ask user for deployment type
    echo ""
    echo "Choose deployment type:"
    echo "1) Development (start both servers)"
    echo "2) Production (build and prepare for deployment)"
    echo "3) Exit"
    echo ""
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            start_development
            ;;
        2)
            deploy_production
            ;;
        3)
            print_status "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'print_status "Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT

# Run main function
main 