# 🚀 CyberBros Lab - Complete Setup Guide

This guide will walk you through setting up the entire CyberBros Lab platform from scratch.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Cloud Provider Setup](#cloud-provider-setup)
3. [Local Development Setup](#local-development-setup)
4. [Production Deployment](#production-deployment)
5. [Testing the Platform](#testing-the-platform)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Node.js**: Version 20 or higher
- **MongoDB**: Version 5 or higher
- **Git**: For cloning the repository
- **Docker & Docker Compose**: (Optional) For containerized deployment

### Cloud Provider Accounts
You need at least one of the following:
- **Hetzner Cloud** account with API token
- **Scaleway** account with API credentials

## Cloud Provider Setup

### Option 1: Hetzner Cloud

1. **Create Account**: Visit [hetzner.com](https://www.hetzner.com)
2. **Generate API Token**:
   - Go to Console → Security → API Tokens
   - Click "Generate API Token"
   - Give it read/write permissions
   - Copy and save the token securely

3. **Recommended Server Types**:
   - `cx11` - 1 vCPU, 2GB RAM (Beginner challenges)
   - `cx21` - 2 vCPU, 4GB RAM (Intermediate/Advanced)
   - `cx31` - 2 vCPU, 8GB RAM (Expert challenges)

### Option 2: Scaleway

1. **Create Account**: Visit [scaleway.com](https://www.scaleway.com)
2. **Generate API Credentials**:
   - Go to Console → Credentials
   - Create a new API key
   - Note your Organization ID
   - Save API Key and Secret Key

3. **Recommended Instance Types**:
   - `DEV1-S` - Small instances
   - `DEV1-M` - Medium instances

## Local Development Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/zakizakaria-cybersec/cyberbros-lab.git
cd cyberbros-lab
```

### Step 2: Set Up MongoDB

**Option A: Install MongoDB Locally**
```bash
# Ubuntu/Debian
sudo apt-get install mongodb

# macOS
brew install mongodb-community
brew services start mongodb-community

# Verify
mongosh
```

**Option B: Use Docker**
```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:7
```

### Step 3: Configure Backend

```bash
cd backend
npm install

# Create environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required .env values:**
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/cyberbros-lab
JWT_SECRET=generate-a-random-secret-here
HETZNER_API_TOKEN=your-hetzner-token-here
VM_AUTO_DELETE_HOURS=2
NODE_ENV=development
```

**Generate a secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Seed Database

```bash
npm run seed
```

Expected output:
```
✅ Connected to MongoDB
🗑️  Cleared existing challenges
✅ Seeded 5 challenges
  - SQL Injection 101 (beginner)
  - Basic Buffer Overflow (intermediate)
  - Cross-Site Scripting (XSS) (beginner)
  - Linux Privilege Escalation (advanced)
  - Cryptography Challenge (intermediate)
✅ Disconnected from MongoDB
```

### Step 5: Configure Frontend

```bash
cd ../frontend
npm install

# Create environment file
cp .env.example .env

# Edit if needed (default should work)
nano .env
```

Default frontend .env:
```env
PUBLIC_API_URL=http://localhost:3000/api
```

### Step 6: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Expected output:
```
✅ MongoDB connected successfully
✅ VM cleanup job scheduled (runs every 15 minutes)
🚀 Server running on port 3000
📍 Health check: http://localhost:3000/health
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Expected output:
```
🚀 astro v4.x.x started in Xms
┃ Local    http://localhost:4321/
┃ Network  use --host to expose
```

### Step 7: Verify Installation

1. **Test Backend Health**:
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"..."}
```

2. **Open Frontend**: http://localhost:4321

3. **Create Test Account**:
   - Click "Sign Up"
   - Enter username, email, password
   - You should be redirected to challenges page

## Production Deployment

### Using Docker Compose (Recommended)

```bash
# Create production .env in root
cp backend/.env.example .env

# Edit with production values
nano .env

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Seed database
docker-compose exec backend npm run seed

# Scale if needed
docker-compose up -d --scale backend=2
```

### Manual Production Deployment

1. **Build Backend**:
```bash
cd backend
npm ci --production
npm run build
```

2. **Build Frontend**:
```bash
cd frontend
npm ci
npm run build
```

3. **Use Process Manager** (e.g., PM2):
```bash
npm install -g pm2

# Start backend
cd backend
pm2 start dist/app.js --name cyberbros-backend

# Start frontend
cd frontend
pm2 start "npm run preview" --name cyberbros-frontend

# Save process list
pm2 save
pm2 startup
```

4. **Set Up Nginx** (reverse proxy):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

## Testing the Platform

### 1. Create User Account
- Navigate to http://localhost:4321
- Click "Sign Up"
- Fill in: username, email, password
- Click "Sign Up"

### 2. Browse Challenges
- After signup, you'll see the challenges page
- Try filtering by difficulty
- Click on a challenge to view details

### 3. Start a Challenge
- Click "Start Challenge"
- Wait for VM creation (10-30 seconds)
- Note the IP, username, and password

### 4. Connect to VM
```bash
ssh root@<VM_IP>
# Enter the password when prompted
```

### 5. Test Auto-Cleanup
- Start a challenge
- Wait 2+ hours (or modify VM_AUTO_DELETE_HOURS)
- VM should be automatically deleted

## Troubleshooting

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
sudo systemctl status mongodb
# or
docker ps | grep mongo

# Test connection
mongosh mongodb://localhost:27017/cyberbros-lab
```

### Backend Won't Start
```bash
# Check for TypeScript errors
cd backend
npm run build

# Check logs
npm run dev
```

### Frontend Build Errors
```bash
# Clear cache and rebuild
cd frontend
rm -rf node_modules dist .astro
npm install
npm run build
```

### VM Creation Fails
- Verify API tokens are correct
- Check API rate limits
- Ensure sufficient cloud account balance
- Test API manually:
```bash
curl -H "Authorization: Bearer $HETZNER_API_TOKEN" \
  https://api.hetzner.cloud/v1/servers
```

### Port Already in Use
```bash
# Find process using port
lsof -i :3000
lsof -i :4321

# Kill process
kill -9 <PID>
```

## Advanced Configuration

### Custom VM Timeout
Edit backend/.env:
```env
VM_AUTO_DELETE_HOURS=1  # 1 hour instead of 2
```

### Add More Challenges
1. Edit `backend/src/scripts/seedChallenges.ts`
2. Add your challenge object
3. Run: `npm run seed`

### Enable HTTPS
Use Let's Encrypt with Nginx:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Next Steps

1. Customize challenges for your needs
2. Set up monitoring (e.g., Prometheus, Grafana)
3. Configure backups for MongoDB
4. Implement rate limiting
5. Add logging aggregation
6. Set up CI/CD pipeline

## Support

For issues and questions:
- Check the main README.md
- Review API documentation
- Check cloud provider documentation

Happy Hacking! 🔒🚀
