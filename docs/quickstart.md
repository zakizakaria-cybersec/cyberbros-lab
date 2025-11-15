# Quick Start Guide

Get CyberBros Lab running in 5 minutes!

## Option 1: Docker Compose (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- 2GB+ RAM available

### Steps

1. **Clone and setup:**
   ```bash
   git clone https://github.com/zakizakaria-cybersec/cyberbros-lab.git
   cd cyberbros-lab
   cp .env.example .env
   ```

2. **Start services:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

4. **Create an account:**
   - Go to http://localhost:3000
   - Click "Register"
   - Enter email and password
   - Login with your credentials

5. **Start a challenge:**
   - Select a challenge from the dashboard
   - Click "Start Challenge"
   - Get VM connection details
   - Connect via SSH (mock IPs for local testing)

### Stop Services

```bash
docker-compose down
```

## Option 2: Manual Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cyberbros"
export JWT_SECRET="dev-secret-key"
export CLOUD_PROVIDER="mock"

# Run migrations
alembic upgrade head

# Start server
uvicorn src.main:app --reload
```

Backend runs on http://localhost:8000

### Frontend Setup

```bash
# Open new terminal
cd frontend

# Install dependencies
npm install

# Set environment
export NEXT_PUBLIC_API_URL="http://localhost:8000"

# Start server
npm run dev
```

Frontend runs on http://localhost:3000

### PostgreSQL Setup

```bash
# Install PostgreSQL
# On Ubuntu/Debian:
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb cyberbros
```

## Option 3: Using Makefile

```bash
# Install dependencies
make install

# Setup environment
make setup

# Start development
make dev

# View logs
make logs

# Stop services
make down
```

## What's Next?

### Explore the API

Visit http://localhost:8000/docs for interactive API documentation.

### Test with Mock Provider

The default configuration uses a mock cloud provider that simulates VM creation without actual cloud resources.

**Features of Mock Provider:**
- Instant "VM" creation
- Fake IP addresses
- Random credentials
- No cloud costs
- Perfect for testing

### Connect to Hetzner Cloud

1. Get Hetzner Cloud account and API token
2. Update `.env`:
   ```env
   CLOUD_PROVIDER=hetzner
   HETZNER_API_TOKEN=your-token-here
   ```
3. Set up infrastructure:
   ```bash
   cd infra
   terraform init
   terraform apply
   ```
4. Create challenge snapshots
5. Restart services

## Common Commands

```bash
# View backend logs
docker-compose logs -f backend

# View frontend logs
docker-compose logs -f frontend

# Restart a service
docker-compose restart backend

# Run database migrations
docker-compose exec backend alembic upgrade head

# Access database shell
docker-compose exec postgres psql -U postgres -d cyberbros

# Stop and remove everything
docker-compose down -v
```

## Troubleshooting

**Port already in use:**
```bash
# Check what's using the port
sudo lsof -i :8000  # or :3000

# Change port in docker-compose.yml
```

**Database connection error:**
```bash
# Check PostgreSQL is running
docker-compose ps

# View database logs
docker-compose logs postgres
```

**Frontend can't reach backend:**
```bash
# Check NEXT_PUBLIC_API_URL in .env
# Verify backend is running on :8000
curl http://localhost:8000/health
```

**Module not found errors:**
```bash
# Backend
cd backend && pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

## Testing the Platform

### 1. Register a User
```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### 2. Login
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### 3. Get Challenges
```bash
curl -X GET http://localhost:8000/api/challenges \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Start a VM
```bash
curl -X POST http://localhost:8000/api/challenge/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"challenge_id":1}'
```

## Sample Challenges

The platform comes with 4 pre-seeded challenges:

1. **Web Exploitation 101** (Easy)
   - SQL injection, XSS basics
   - 2 vCPU, 4GB RAM

2. **Linux Privilege Escalation** (Medium)
   - Find and exploit misconfigurations
   - 2 vCPU, 4GB RAM

3. **Network Penetration Testing** (Hard)
   - Port scanning, pivoting
   - 4 vCPU, 8GB RAM

4. **Binary Exploitation** (Hard)
   - Buffer overflows, ROP
   - 2 vCPU, 4GB RAM

## Development Workflow

1. Make changes to code
2. Backend auto-reloads (uvicorn --reload)
3. Frontend auto-reloads (next dev)
4. Test changes
5. Commit and push

## Getting Help

- **Documentation**: Check `docs/` directory
- **API Reference**: http://localhost:8000/docs
- **Issues**: GitHub Issues
- **Architecture**: `docs/architecture.md`

## Next Steps

1. ✅ Platform running locally
2. 📚 Read `docs/architecture.md`
3. 🔧 Explore `docs/api.md`
4. 🚀 Deploy: `docs/deployment.md`
5. 🤝 Contribute: `CONTRIBUTING.md`

Happy hacking! 🔐
