# CyberBros Lab 🔐

A cybersecurity training platform where users can register, select challenges, and automatically receive isolated VM environments that last for 2 hours.

> **🚀 Now powered by Cloudflare's edge infrastructure for global low-latency access!**

## 🎯 Features

- **User Authentication**: Email/password registration and JWT-based login
- **Challenge System**: Browse and start various cybersecurity challenges
- **Automatic VM Provisioning**: Each user gets their own isolated VM from a snapshot
- **Public IPv4 Access**: VMs are publicly reachable with SSH credentials
- **Auto-Expiration**: VMs automatically self-destruct after 2 hours
- **Concurrent Support**: Designed to handle many participants simultaneously
- **Edge Computing**: Runs on Cloudflare's global network (300+ locations)
- **Serverless Backend**: Zero server management with Cloudflare Workers
- **Cloud Integration**: Hetzner Cloud for VM provisioning

## 🏗️ Architecture

### Technology Stack

**Backend (Cloudflare Workers):**
- TypeScript - Type-safe edge computing
- Cloudflare Workers - Serverless compute at the edge
- Cloudflare D1 - SQLite database at the edge
- Cloudflare KV - Key-value storage for sessions
- Web Crypto API - JWT authentication
- Hono-style routing - Fast request routing
- Cron Triggers - Scheduled VM cleanup

**Frontend (Cloudflare Pages):**
- Next.js 14 (React + TypeScript) - Static site generation
- Axios - HTTP client
- Static Export - Pre-rendered pages for maximum performance
- Cloudflare CDN - Global content delivery

**Infrastructure:**
- Hetzner Cloud - VM provisioning and management
- Wrangler CLI - Cloudflare deployment tool
- GitHub - Version control and CI/CD

**Legacy Stack (backend/):**
- FastAPI (Python) - Original backend implementation
- PostgreSQL - Original database
- Docker Compose - Local development option

### Cloud Provider Abstraction

The platform uses a provider abstraction layer (`CloudProvider` interface) making it cloud-agnostic:
- **Hetzner Cloud** (default implementation)
- **Mock Provider** (for local testing)
- Easily extensible to AWS, DigitalOcean, Azure, etc.

## 📁 Repository Structure

```
cyberbros-lab/
├── workers/                    # Cloudflare Workers backend (PRIMARY)
│   ├── src/
│   │   ├── index.ts           # Main Worker entry point
│   │   ├── types.ts           # TypeScript interfaces
│   │   ├── routes/            # API route handlers
│   │   │   ├── auth.ts        # Authentication endpoints
│   │   │   ├── challenges.ts  # Challenge endpoints
│   │   │   └── vms.ts         # VM provisioning endpoints
│   │   ├── services/          # Business logic
│   │   │   └── hetzner.ts     # Hetzner Cloud integration
│   │   └── utils/             # Helper functions
│   │       ├── auth.ts        # JWT utilities
│   │       └── response.ts    # HTTP response helpers
│   ├── wrangler.toml          # Cloudflare configuration
│   ├── schema.sql             # D1 database schema
│   └── package.json
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   └── CountdownTimer.tsx
│   │   ├── lib/               # API client, auth
│   │   │   ├── api.ts         # API client
│   │   │   └── auth.ts        # Auth utilities
│   │   ├── pages/             # Next.js pages
│   │   │   ├── index.tsx      # Landing page
│   │   │   ├── login.tsx      # Login page
│   │   │   ├── register.tsx   # Registration page
│   │   │   ├── dashboard.tsx  # Dashboard
│   │   │   └── vm/[challengeId].tsx  # VM details
│   │   └── styles/
│   │       └── globals.css
│   ├── next.config.js
│   └── package.json
├── backend/                    # Legacy FastAPI backend
│   └── ...                    # (Original Python implementation)
├── docs/                       # Documentation
│   ├── cloudflare-deployment.md      # Deployment guide
│   ├── development-workflow.md       # Development process
│   ├── quick-reference.md            # Command reference
│   ├── architecture.md               # System architecture
│   └── api.md                        # API documentation
├── infra/                      # Terraform infrastructure
│   ├── main.tf                # Hetzner Cloud resources
│   └── variables.tf
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (for development)
- **Cloudflare account** (free tier works)
- **Hetzner Cloud account** (for VM provisioning)
- **Wrangler CLI** (installed via npm)

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/zakizakaria-cybersec/cyberbros-lab.git
   cd cyberbros-lab
   ```

2. **Authenticate with Cloudflare:**
   ```bash
   npx wrangler login
   ```

3. **Set up backend (Workers):**
   ```bash
   cd workers
   npm install
   
   # Create local D1 database
   npx wrangler d1 create cyberbros_db
   # Copy database ID to wrangler.toml
   
   # Initialize database
   npx wrangler d1 execute cyberbros_db --local --file=./schema.sql
   
   # Start development server
   npm run dev  # Runs on http://localhost:8787
   ```

4. **Set up frontend:**
   ```bash
   cd frontend
   npm install
   
   # Start development server
   npm run dev  # Runs on http://localhost:3000
   ```

5. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8787
   - Try registering and exploring challenges!

### Production Deployment

See the comprehensive guides:
- **[Cloudflare Deployment Guide](./docs/cloudflare-deployment.md)** - Complete deployment instructions
- **[Development Workflow](./docs/development-workflow.md)** - Git workflow and best practices
- **[Quick Reference](./docs/quick-reference.md)** - Common commands and troubleshooting

**Quick deployment:**
```bash
# Deploy backend
cd workers
npx wrangler deploy

# Deploy frontend
cd frontend
NEXT_PUBLIC_API_URL=https://your-worker.workers.dev npm run build
npx wrangler pages deploy out --project-name cyberbros-lab-frontend
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

### Essential Guides
- **[Cloudflare Deployment](./docs/cloudflare-deployment.md)** - Deploy to production
- **[Development Workflow](./docs/development-workflow.md)** - Git workflow, branching, releases
- **[Quick Reference](./docs/quick-reference.md)** - Common commands and tips

### Technical Documentation
- **[Architecture](./docs/architecture.md)** - System design and components
- **[API Reference](./docs/api.md)** - Endpoint documentation
- **[Quickstart](./docs/quickstart.md)** - Getting started guide

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

### Cloudflare Edge Benefits
- **Global deployment**: Runs in 300+ locations worldwide
- **Auto-scaling**: Handles traffic spikes automatically
- **Zero cold starts**: Sub-50ms response times
- **Built-in DDoS protection**: Enterprise-grade security
- **No server management**: Focus on code, not infrastructure

### Free Tier Limits
- **Workers**: 100,000 requests/day
- **D1 Database**: 5 GB storage, 5 million reads/day
- **KV Storage**: 100,000 reads/day, 1,000 writes/day
- **Pages**: Unlimited static requests

Perfect for small-medium cybersecurity labs (1-50 concurrent users)

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