# CyberBros Lab - Architecture Documentation

## Overview

CyberBros Lab is a cybersecurity training platform that provides isolated VM environments for each participant. Users can select challenges, and the system automatically provisions a dedicated VM from a snapshot that expires after 2 hours.

## System Architecture

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
└────────┬────────┘
         │ REST API
         │
┌────────▼────────┐
│   Backend       │
│   (FastAPI)     │
└────────┬────────┘
         │
    ┌────┴────┬──────────┐
    │         │          │
┌───▼──┐  ┌──▼───┐  ┌───▼──────┐
│ DB   │  │ Cloud│  │Scheduler │
│(PG)  │  │Driver│  │ (APSched)│
└──────┘  └──┬───┘  └──────────┘
             │
        ┌────▼────────┐
        │  Hetzner    │
        │  Cloud API  │
        └─────────────┘
```

## Components

### Frontend (Next.js + TypeScript)

- **Login/Register**: User authentication
- **Dashboard**: Lists available challenges
- **VM Details Page**: Shows connection info and countdown timer
- **API Client**: Axios-based HTTP client with JWT auth

### Backend (FastAPI + Python)

#### Layers

1. **Routes** (`/src/routes/`)
   - `auth.py`: Registration, login endpoints
   - `challenges.py`: List challenges
   - `vms.py`: Start VM, get status

2. **Services** (`/src/services/`)
   - `auth_service.py`: User authentication logic
   - `challenge_service.py`: Challenge management
   - `vm_service.py`: VM lifecycle management

3. **Models** (`/src/models/`)
   - `user.py`: User model
   - `challenge.py`: Challenge model
   - `vm_instance.py`: VM instance model with status tracking

4. **Cloud Providers** (`/src/cloud_providers/`)
   - `base.py`: Abstract provider interface
   - `hetzner.py`: Hetzner Cloud implementation
   - `mock.py`: Mock provider for local testing

#### Background Scheduler

- Uses APScheduler
- Runs cleanup job every 5 minutes (configurable)
- Checks for expired VMs and destroys them via cloud API
- Updates database status

### Database (PostgreSQL)

#### Schema

**users**
- id (PK)
- email (unique)
- hashed_password
- created_at

**challenges**
- id (PK)
- name
- description
- snapshot_id
- difficulty
- cpu_count
- memory_gb

**vm_instances**
- id (PK)
- user_id (FK)
- challenge_id (FK)
- instance_id (cloud provider ID)
- public_ip
- ssh_username
- ssh_password
- status (pending/running/expired/failed)
- created_at
- expires_at
- destroyed_at

### Cloud Provider Layer

Abstraction allows easy integration with other providers (AWS, DigitalOcean, etc.)

**Interface** (CloudProvider ABC):
- `create_vm_from_snapshot(snapshot_id, name, expires_at, cpu_count, memory_gb) -> VMInfo`
- `destroy_vm(instance_id) -> bool`
- `get_vm_status(instance_id) -> str`

**Hetzner Implementation**:
- Creates server from snapshot/image
- Assigns public IPv4
- Generates random password
- Returns connection details

## Data Flow

### User Registration/Login
1. User submits credentials
2. Backend validates and creates JWT token
3. Frontend stores token in localStorage
4. Token sent in Authorization header for subsequent requests

### Starting a Challenge
1. User clicks "Start Challenge"
2. Frontend sends POST to `/api/challenge/start`
3. Backend:
   - Creates VM instance record (status: pending)
   - Calls cloud provider to create VM
   - Updates record with IP, credentials (status: running)
   - Returns VM details
4. Frontend redirects to VM details page

### VM Lifecycle
1. VM is created with 2-hour expiration
2. Background scheduler checks every 5 minutes
3. Expired VMs are destroyed via cloud API
4. Database updated (status: expired, destroyed_at)

### Getting VM Status
1. Frontend polls `/api/challenge/status?challenge_id=X`
2. Backend checks database for running VM
3. Calculates time remaining
4. Returns VM details with countdown

## Security Considerations

- JWT tokens for authentication
- Passwords hashed with bcrypt
- Environment variables for secrets
- CORS configured for frontend domain
- SQL injection prevention via ORM
- Each user gets isolated VM

## Scalability

- Stateless backend (horizontal scaling)
- Database connection pooling
- Async VM provisioning
- Background job for cleanup (distributed workers possible)
- Cloud provider abstraction (multi-region, multi-cloud)

## Monitoring & Logging

- Structured logging in backend
- VM lifecycle events logged
- Scheduler job execution logged
- API request/response logging via FastAPI middleware

## Future Enhancements

- Queue system (Celery/RabbitMQ) for async VM provisioning
- VM snapshot scheduling for periodic backups
- User progress tracking
- Challenge scoring system
- Multi-cloud support
- Resource quota management per user
- Email notifications
- Admin dashboard
