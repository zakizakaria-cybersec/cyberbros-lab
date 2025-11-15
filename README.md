# CyberBros Lab 🔐

A cybersecurity training platform where users can register, select challenges, and automatically receive isolated VM environments that last for 2 hours.

## 🎯 Features

- **User Authentication**: Email/password registration and JWT-based login
- **Challenge System**: Browse and start various cybersecurity challenges
- **Automatic VM Provisioning**: Each user gets their own isolated VM from a snapshot
- **Public IPv4 Access**: VMs are publicly reachable with SSH credentials
- **Auto-Expiration**: VMs automatically self-destruct after 2 hours
- **Concurrent Support**: Designed to handle many participants simultaneously
- **Cloud-Agnostic**: Pluggable cloud provider architecture (Hetzner Cloud default)

## 🏗️ Architecture

### Technology Stack

**Backend:**
- FastAPI (Python) - High-performance async web framework
- SQLAlchemy - ORM for database operations
- Alembic - Database migrations
- PostgreSQL - Relational database
- APScheduler - Background job scheduling
- JWT - Token-based authentication

**Frontend:**
- Next.js (React + TypeScript) - Server-side rendered React framework
- Axios - HTTP client
- CSS - Minimal styling (functionality over polish)

**Infrastructure:**
- Terraform - Infrastructure as Code for Hetzner Cloud
- Docker Compose - Local development environment
- Hetzner Cloud - Default cloud provider (easily swappable)

### Cloud Provider Abstraction

The platform uses a provider abstraction layer (`CloudProvider` interface) making it cloud-agnostic:
- **Hetzner Cloud** (default implementation)
- **Mock Provider** (for local testing)
- Easily extensible to AWS, DigitalOcean, Azure, etc.

## 📁 Repository Structure

```
cyberbros-lab/
├── backend/                    # FastAPI backend
│   ├── src/
│   │   ├── cloud_providers/   # Cloud provider drivers
│   │   │   ├── base.py        # Abstract interface
│   │   │   ├── hetzner.py     # Hetzner implementation
│   │   │   └── mock.py        # Mock for testing
│   │   ├── models/            # Database models
│   │   │   ├── user.py
│   │   │   ├── challenge.py
│   │   │   └── vm_instance.py
│   │   ├── routes/            # API endpoints
│   │   │   ├── auth.py
│   │   │   ├── challenges.py
│   │   │   └── vms.py
│   │   ├── services/          # Business logic
│   │   │   ├── auth_service.py
│   │   │   ├── challenge_service.py
│   │   │   └── vm_service.py
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── utils/             # Utilities (auth, etc.)
│   │   ├── config.py          # Configuration
│   │   ├── database.py        # Database setup
│   │   ├── scheduler.py       # Background jobs
│   │   └── main.py            # Application entry point
│   ├── alembic/               # Database migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── lib/               # API client, auth
│   │   ├── pages/             # Next.js pages
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   ├── dashboard.tsx
│   │   │   └── vm/[challengeId].tsx
│   │   └── styles/
│   ├── package.json
│   └── Dockerfile
├── infra/                      # Terraform infrastructure
│   ├── main.tf
│   ├── variables.tf
│   └── README.md
├── docs/                       # Documentation
│   ├── architecture.md
│   └── api.md
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local backend development)
- PostgreSQL 15+ (or use Docker)

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/zakizakaria-cybersec/cyberbros-lab.git
   cd cyberbros-lab
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure:
   - Database connection
   - JWT secret
   - Cloud provider (use `mock` for local testing)

3. **Start with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

   This starts:
   - PostgreSQL (port 5432)
   - Backend API (port 8000)
   - Frontend (port 3000)

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Manual Setup (without Docker)

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cyberbros"
export JWT_SECRET="your-secret-key"
export CLOUD_PROVIDER="mock"

# Run migrations
alembic upgrade head

# Start server
uvicorn src.main:app --reload
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set environment variable
export NEXT_PUBLIC_API_URL="http://localhost:8000"

# Start development server
npm run dev
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available configuration options:

**Database:**
- `DATABASE_URL` - PostgreSQL connection string

**JWT:**
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_ALGORITHM` - Algorithm (default: HS256)
- `JWT_EXPIRATION_MINUTES` - Token expiration (default: 1440)

**Cloud Provider:**
- `CLOUD_PROVIDER` - Provider name (hetzner/mock)
- `HETZNER_API_TOKEN` - Hetzner Cloud API token

**VM Configuration:**
- `VM_DEFAULT_LIFETIME_HOURS` - VM lifetime (default: 2)
- `VM_CLEANUP_INTERVAL_MINUTES` - Cleanup job interval (default: 5)

## 🛠️ VM Provisioning Flow

1. **User starts challenge:**
   - Clicks "Start Challenge" button
   - Frontend sends POST to `/api/challenge/start`

2. **Backend creates VM:**
   - Creates `VMInstance` record (status: pending)
   - Calls cloud provider `create_vm_from_snapshot()`
   - Provider clones VM from snapshot
   - Provider assigns public IPv4
   - Provider generates SSH credentials

3. **Backend updates record:**
   - Stores instance ID, IP, credentials
   - Sets status to "running"
   - Sets expiration time (current time + 2 hours)

4. **User receives connection details:**
   - Public IP address
   - SSH username
   - SSH password
   - Time remaining counter

5. **Auto-cleanup:**
   - Background scheduler runs every 5 minutes
   - Checks for VMs past expiration time
   - Calls cloud provider `destroy_vm()`
   - Updates status to "expired"

## 📊 Database Schema

**users**
- Stores user accounts with hashed passwords

**challenges**
- Static list of challenges with snapshot IDs and resource requirements

**vm_instances**
- Tracks all VM instances with status, expiration, and connection details

See `docs/architecture.md` for detailed schema.

## 🌐 Cloud Provider Integration

### Using Hetzner Cloud

1. **Get API token:**
   - Create account at https://www.hetzner.com/cloud
   - Generate API token in Cloud Console

2. **Set up infrastructure:**
   ```bash
   cd infra
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your token
   terraform init
   terraform apply
   ```

3. **Create challenge snapshots:**
   - Set up a base server with challenge environment
   - Create snapshot via Hetzner Console
   - Note snapshot ID
   - Add to database as challenge

4. **Configure backend:**
   ```bash
   export CLOUD_PROVIDER="hetzner"
   export HETZNER_API_TOKEN="your-token"
   ```

### Adding Another Provider

1. Create new file: `backend/src/cloud_providers/yourprovider.py`
2. Implement `CloudProvider` abstract class
3. Implement methods: `create_vm_from_snapshot()`, `destroy_vm()`, `get_vm_status()`
4. Update factory in `__init__.py`
5. Set `CLOUD_PROVIDER=yourprovider` in environment

## 🧪 Testing

### With Mock Provider

```bash
export CLOUD_PROVIDER="mock"
```

The mock provider simulates VM creation without actual cloud resources, perfect for development and testing.

### Testing Workflow

1. Register user at `/register`
2. Login at `/login`
3. View challenges at `/dashboard`
4. Start challenge - receives fake IP and credentials
5. VM "expires" after 2 hours (configurable)

## 📚 Documentation

- **Architecture**: See `docs/architecture.md`
- **API Reference**: See `docs/api.md`
- **Infrastructure**: See `infra/README.md`

## 🔒 Security Considerations

- Passwords hashed with bcrypt
- JWT tokens for stateless authentication
- CORS configured for specific origins
- SQL injection prevention via ORM
- Each user gets isolated VM
- VMs auto-destroy after timeout
- Environment variables for secrets

**Production recommendations:**
- Use HTTPS
- Enable rate limiting
- Implement user quotas
- Add logging and monitoring
- Use secrets manager for credentials
- Regular security audits

## 📈 Scaling Considerations

- **Horizontal scaling**: Backend is stateless
- **Database**: Use connection pooling
- **VM provisioning**: Consider async queue (Celery/Redis)
- **Cleanup**: Distribute scheduler across workers
- **Multi-region**: Deploy in multiple cloud regions
- **Load balancing**: Use reverse proxy (nginx)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

**Database connection failed:**
- Check PostgreSQL is running
- Verify DATABASE_URL is correct

**Frontend can't reach backend:**
- Check NEXT_PUBLIC_API_URL is set
- Verify backend is running on correct port
- Check CORS configuration

**VM provisioning fails:**
- Check cloud provider credentials
- Verify snapshot IDs exist
- Check cloud provider API limits
- Review backend logs

**VMs not cleaning up:**
- Check scheduler is running
- Verify cloud provider API access
- Check VM_CLEANUP_INTERVAL_MINUTES setting

## 📞 Support

For issues and questions:
- GitHub Issues: https://github.com/zakizakaria-cybersec/cyberbros-lab/issues
- Documentation: `docs/` directory

---

Built with ❤️ for cybersecurity education