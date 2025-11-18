# CyberBros Lab - Cloudflare D1 + Terraform Architecture

## Overview

The system now uses **Cloudflare D1 (SQLite)** for database and **Terraform** for VM provisioning, triggered via **GitHub Actions**.

## Architecture Flow

```
┌─────────────┐
│   Frontend  │
│  (Next.js)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│         FastAPI Backend (Optional Proxy)         │
│         Can call Workers API directly            │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│          Cloudflare Workers API                  │
│         (Primary data layer with D1)             │
│                                                   │
│  Routes:                                          │
│  • /api/register, /api/login                     │
│  • /api/challenges                               │
│  • /api/user/assignments                         │
│  • /api/admin/assignments, /bulk                 │
│  • /api/admin/users                              │
│  • /api/challenge/start (triggers provisioning)  │
│  • /api/vms (get VMs)                            │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│               Cloudflare D1 Database             │
│            (SQLite - Global Database)            │
│                                                   │
│  Tables:                                          │
│  • users (role: admin/user)                      │
│  • challenges                                    │
│  • assignments (admin assigns to users)          │
│  • instances (VM records)                        │
│  • provisioning_logs                             │
└───────────────────────────────────────────────────┘

       │ (When user starts challenge)
       ▼
┌─────────────────────────────────────────────────┐
│           GitHub Actions Workflow                │
│         (Terraform VM Provisioning)              │
│                                                   │
│  1. Receive repository_dispatch event            │
│  2. Run terraform init with R2 backend           │
│  3. Try Scaleway first (primary)                 │
│  4. Fallback to Hetzner if fails                 │
│  5. Callback to Workers API with credentials     │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│      Cloud Providers (Scaleway/Hetzner)         │
│           Managed by Terraform                   │
│                                                   │
│  • Creates VM from snapshot                      │
│  • Configures SSH access                         │
│  • Sets up firewall rules                        │
│  • Returns IP + credentials                      │
└───────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│        Terraform State in Cloudflare R2          │
│     (Per-instance state isolation)               │
│  Key: vms/{instance_id}/terraform.tfstate        │
└───────────────────────────────────────────────────┘
```

## Key Components

### 1. Cloudflare Workers + D1 Database

**Location:** `/workers/`

- **Primary API** for all database operations
- Uses **D1 (SQLite)** for data storage
- Handles authentication (JWT tokens)
- Manages assignments (admin assigns challenges to users)
- Triggers GitHub Actions for VM provisioning
- Receives callbacks from GitHub Actions

**Endpoints:**
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/challenges` - List challenges
- `GET /api/user/assignments` - Get user's assigned challenges
- `POST /api/challenge/start` - Start challenge (trigger VM provisioning)
- `GET /api/vms` - Get user's VMs
- `GET /api/admin/users` - List all users (admin)
- `POST /api/admin/assignments` - Assign challenge to user (admin)
- `POST /api/admin/assignments/bulk` - Bulk assign challenges (admin)

### 2. Terraform Infrastructure

**Location:** `/infra/`

- **provision_vm.tf** - Main provisioning logic
- **modules/scaleway_vm/** - Scaleway provider
- **modules/hetzner_vm/** - Hetzner provider (fallback)
- **State Storage** - Cloudflare R2 (per-instance isolation)

**Features:**
- Primary provider: Scaleway
- Fallback provider: Hetzner
- Auto-generates SSH credentials
- Creates VM from snapshots
- Configures firewall rules
- Stores state in R2 with unique keys per instance

### 3. GitHub Actions Workflows

**Location:** `/.github/workflows/`

**provision-vm.yml:**
- Triggered by `repository_dispatch` event type `provision-vm`
- Runs Terraform to create VM
- Tries Scaleway first, falls back to Hetzner
- Callbacks Workers API with VM details (IP, credentials)
- Schedules automatic destroy at expiration

**destroy-vm.yml:**
- Triggered by `repository_dispatch` event type `destroy-vm`
- Runs `terraform destroy` to cleanup resources
- Removes Terraform state from R2
- Updates D1 instance status to `destroyed`

### 4. FastAPI Backend (Optional Proxy Layer)

**Location:** `/backend/`

- **Can be used as a proxy** to Workers API
- Or **connect directly** to Workers for simpler architecture
- Provides additional business logic if needed
- **WorkersAPIClient** service for communication

**New Service:** `backend/src/services/workers_api_client.py`
- Async HTTP client for Workers API
- Handles all database operations via Workers
- Manages JWT tokens
- Calls VM provisioning endpoints

## User Flows

### Admin Flow: Assign Challenges to Users

1. Admin logs in → receives JWT token
2. Admin views all users: `GET /api/admin/users`
3. Admin views challenges: `GET /api/challenges`
4. Admin assigns challenge to users:
   - Single: `POST /api/admin/assignments`
   - Bulk: `POST /api/admin/assignments/bulk` with `user_ids[]`
5. Assignment stored in **D1 database**

### User Flow: Start Challenge & Get VM

1. User logs in → receives JWT token
2. User views assigned challenges: `GET /api/user/assignments`
3. User starts challenge: `POST /api/challenge/start`
   - Creates instance record in D1 (status: `provisioning`)
   - Triggers GitHub Actions workflow
4. GitHub Actions runs Terraform:
   - Creates VM on Scaleway (or Hetzner fallback)
   - Generates SSH username/password
   - Callbacks Workers API with credentials
5. Workers API updates D1:
   - Instance status → `running`
   - Stores IP address
   - Stores encrypted SSH credentials
   - Updates assignment status → `in_progress`
6. User gets VM details: `GET /api/vms`
7. User gets SSH credentials (one-time): `GET /api/instances/{id}/credentials`
8. User connects via SSH to practice challenge
9. VM auto-destroys after duration expires

## Environment Variables

### Workers (wrangler.toml)
```toml
[vars]
ENVIRONMENT = "production"
JWT_EXPIRATION_MINUTES = "1440"
VM_DEFAULT_LIFETIME_HOURS = "2"
BACKEND_URL = "https://api.cyberbros.lab"
GITHUB_REPO = "owner/cyberbros-lab"

[secrets]
JWT_SECRET = "..."
HETZNER_API_TOKEN = "..."
CALLBACK_TOKEN = "..."
GITHUB_TOKEN = "..."
```

### Backend (.env)
```env
# Workers API
WORKERS_API_URL=https://api.cyberbros.lab

# JWT (must match Workers)
JWT_SECRET=...
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440

# Application
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:3000
```

### GitHub Actions Secrets
- `SCALEWAY_ACCESS_KEY`
- `SCALEWAY_SECRET_KEY`
- `SCALEWAY_PROJECT_ID`
- `HETZNER_API_TOKEN`
- `R2_ENDPOINT`
- `R2_ACCESS_KEY`
- `R2_SECRET_KEY`
- `CALLBACK_TOKEN`
- `GITHUB_TOKEN`

## Database Schema (D1)

### users
- id, email, hashed_password, role (user/admin), is_active

### challenges
- id, name, description, snapshot_id, difficulty, cpu_count, memory_gb, duration_hours

### assignments
- id, user_id, challenge_id, assigned_by (admin_id), status, assigned_at, started_at, completed_at

### instances
- id, user_id, challenge_id, assignment_id, instance_id (cloud), provider, public_ip, ssh_username, ssh_password_encrypted, status, expires_at

### provisioning_logs
- id, instance_id, event_type, provider, message, error_details, created_at

## Deployment Steps

### 1. Deploy Cloudflare Workers
```bash
cd workers
npm install
wrangler d1 create cyberbros-db  # Create D1 database
wrangler d1 execute cyberbros-db --file=schema.sql  # Initialize schema
wrangler publish
```

### 2. Configure GitHub Secrets
Add all required secrets to your GitHub repository settings.

### 3. Deploy Backend (Optional)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

### 4. Deploy Frontend
```bash
cd frontend
npm install
npm run build
# Deploy to Cloudflare Pages, Vercel, etc.
```

## Benefits of This Architecture

✅ **Serverless & Scalable** - Workers scale automatically  
✅ **Global Database** - D1 replicated worldwide  
✅ **Infrastructure as Code** - Terraform for reproducibility  
✅ **Provider Fallback** - Automatic failover between cloud providers  
✅ **Cost Effective** - Pay per use, no idle servers  
✅ **Audit Trail** - Provisioning logs track everything  
✅ **State Management** - Isolated Terraform state per VM  
✅ **Security** - Encrypted credentials, JWT authentication  

## Next Steps

1. **Test Workers API** locally with `wrangler dev`
2. **Test GitHub Actions** workflows with manual dispatch
3. **Create VM snapshots** for challenges on Scaleway/Hetzner
4. **Deploy to production** and monitor logs
5. **Set up monitoring** with Cloudflare Analytics
