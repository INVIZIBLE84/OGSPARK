#!/bin/bash
set -e

echo "🚀 Starting OGSPARK Backend Setup..."
echo "=========================================="

# Check Node.js
echo "📋 Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2)
REQUIRED_VERSION="18.0.0"
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is not compatible. Please install Node.js 18 or higher."
    exit 1
fi
echo "✅ Node.js version $NODE_VERSION"

# Check Docker
echo "🐳 Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker."
    exit 1
fi
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker."
    exit 1
fi
echo "✅ Docker is running"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup environment
echo "🔧 Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file. Please update it with your configuration."
else
    echo "✅ .env file already exists"
fi

# Start services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check PostgreSQL
until docker exec ogspark_db pg_isready -U user -d ogspark; do
    echo "⏳ Waiting for PostgreSQL..."
    sleep 5
done
echo "✅ PostgreSQL is ready!"

# Check Redis
until docker exec ogspark_redis redis-cli ping | grep -q "PONG"; do
    echo "⏳ Waiting for Redis..."
    sleep 5
done
echo "✅ Redis is ready!"

# Setup database
echo "🗄️ Setting up database..."
npx prisma generate
npx prisma db push

# Seed database
echo "🌱 Seeding database..."
if [ -f "prisma/seed.ts" ]; then
    npx ts-node prisma/seed.ts
fi

# Build project
echo "🔨 Building project..."
npm run build

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your actual values"
echo "2. Run 'npm run dev' to start development server"
echo "3. Access API at http://localhost:3001"
echo "4. Run 'npx prisma studio' to view database"
echo ""