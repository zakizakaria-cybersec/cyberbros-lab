#!/bin/bash
# CyberBros Lab Quick Start Script

set -e

echo "🔒 CyberBros Lab - Quick Start"
echo "=============================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "⚠️  Node.js version is $NODE_VERSION. Version 20+ is recommended."
fi

echo "✓ Node.js $(node -v) found"

# Check MongoDB
if ! command -v mongod &> /dev/null && ! docker ps | grep -q mongo; then
    echo "⚠️  MongoDB is not running. You can:"
    echo "   1. Start MongoDB locally"
    echo "   2. Run: docker run -d -p 27017:27017 mongo:7"
    echo ""
    read -p "Start MongoDB in Docker? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Starting MongoDB..."
        docker run -d --name cyberbros-mongodb -p 27017:27017 mongo:7
        echo "✓ MongoDB started"
        sleep 3
    fi
else
    echo "✓ MongoDB is available"
fi

# Backend setup
echo ""
echo "📦 Setting up Backend..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env with your API credentials"
    echo "   You'll need:"
    echo "   - HETZNER_API_TOKEN or"
    echo "   - SCALEWAY_API_KEY + SCALEWAY_API_SECRET + SCALEWAY_ORGANIZATION_ID"
    echo ""
    read -p "Press Enter after configuring .env..."
fi

echo "Building backend..."
npm run build

echo "Seeding database with sample challenges..."
npm run seed || echo "⚠️  Database seeding failed. Make sure MongoDB is running."

cd ..

# Frontend setup
echo ""
echo "🎨 Setting up Frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

if [ ! -f ".env" ]; then
    echo "Creating frontend .env file..."
    cp .env.example .env
fi

echo "Building frontend..."
npm run build

cd ..

echo ""
echo "✅ Setup Complete!"
echo ""
echo "To start the application:"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd backend && npm run dev"
echo ""
echo "Terminal 2 - Frontend:"
echo "  cd frontend && npm run dev"
echo ""
echo "Then visit: http://localhost:4321"
echo ""
echo "📚 Documentation:"
echo "  - README.md - Overview and quickstart"
echo "  - SETUP_GUIDE.md - Detailed setup instructions"
echo "  - API_DOCUMENTATION.md - API reference"
echo ""
echo "Happy Hacking! 🚀"
