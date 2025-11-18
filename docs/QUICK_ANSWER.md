# Quick Answer: Integration Overview

## YES, this works with your Cloudflare Workers + GitHub Actions setup!

## Complete Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      USER STARTS CHALLENGE                        │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│               CLOUDFLARE WORKER (API Handler)                     │
│  1. Authenticate user                                             │
│  2. Create instance record (status: provisioning)                 │
│  3. Log: provisioning_started                                     │
│  4. Trigger GitHub Actions workflow                               │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│            GITHUB ACTIONS WORKFLOW (provision-vm.yml)             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  STEP 1: Try Scaleway (Primary)                         │    │
│  │  - terraform init (R2 backend)                          │    │
│  │  - terraform apply -var provider_primary=scaleway       │    │
│  │  - Generate SSH credentials                             │    │
│  │  - Create VM with cloud-init                            │    │
│  └─────────────────┬───────────────────────────────────────┘    │
│                    │                                             │
│                    ├─[SUCCESS]─┐                                 │
│                    │            │                                │
│                    ├─[FAIL]─────┼─> Destroy partial resources    │
│                                 │                                │
│                                 ▼                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  STEP 2: Fallback to Hetzner                            │   │
│  │  - Log: provider_fallback                               │   │
│  │  - terraform init (clean state)                         │   │
│  │  - terraform apply -var provider_primary=hetzner        │   │
│  │  - Create VM on Hetzner                                 │   │
│  └──────────────────┬───────────────────────────────────────┘   │
│                     │                                            │
│                     ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  STEP 3: Send Callback                                   │   │
│  │  POST /api/provisioning/callback                         │   │
│  │  {                                                        │   │
│  │    "instance_id": 123,                                   │   │
│  │    "cloud_instance_id": "hetzner-xxx",                   │   │
│  │    "provider": "hetzner",                                │   │
│  │    "public_ip": "192.168.1.100",                         │   │
│  │    "ssh_username": "user123",                            │   │
│  │    "ssh_password": "SecurePass!"                         │   │
│  │  }                                                        │   │
│  └──────────────────┬───────────────────────────────────────┘   │
│                     │                                            │
│  ┌──────────────────▼───────────────────────────────────────┐   │
│  │  STEP 4: Schedule Destroy                                │   │
│  │  - Trigger destroy-vm workflow at expires_at             │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│         CLOUDFLARE WORKER (Callback Handler)                      │
│  1. Verify callback token                                         │
│  2. Update instances table:                                       │
│     - instance_id = "hetzner-xxx"                                │
│     - provider = "hetzner"                                        │
│     - public_ip = "192.168.1.100"                                │
│     - ssh_username, ssh_password_encrypted                        │
│     - status = "running"                                          │
│  3. Log: provisioning_success, vm_running                         │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                  USER GETS CREDENTIALS                            │
│  GET /api/challenge/123/status                                    │
│  Response:                                                        │
│  {                                                                │
│    "status": "running",                                           │
│    "public_ip": "192.168.1.100",                                 │
│    "ssh_username": "user123",                                    │
│    "ssh_password": "SecurePass!",                                │
│    "expires_at": "2025-11-18T14:00:00Z"                          │
│  }                                                                │
└───────────────────────────────────────────────────────────────────┘
```

## Key Components Created

### ✅ Terraform Modules
- `infra/modules/scaleway_vm/` - Scaleway VM with Ubuntu 24.04
- `infra/modules/hetzner_vm/` - Hetzner VM with Ubuntu 24.04
- `infra/provision_vm.tf` - Main provisioning logic with fallback

### ✅ GitHub Actions Workflows
- `.github/workflows/provision-vm.yml` - Provision with fallback
- `.github/workflows/destroy-vm.yml` - Cleanup expired VMs

### ✅ Cloudflare Worker Integration
- `workers/src/services/github-actions.ts` - Trigger workflows
- `workers/src/routes/provisioning.ts` - Handle callbacks
- Updated `workers/src/routes/vms.ts` - Use GitHub Actions
- Updated `workers/src/index.ts` - Route callbacks

### ✅ D1 Database Schema
- Updated `schema.sql` with all required tables
- `instances` table with encrypted credentials
- `provisioning_logs` table for audit trail

## Requirements Met

✅ **Receives provisioning jobs via queue** - Cloudflare Worker triggers GitHub Actions  
✅ **First deploy VM on Scaleway** - Primary provider  
✅ **If fail → destroy → retry on Hetzner** - Automatic fallback with cleanup  
✅ **Generate SSH username + password** - Random generation per instance  
✅ **Capture VM IP + credentials → send back** - Callback to Worker API  
✅ **Schedule destroy job when time expires** - Cron job + GitHub Actions  
✅ **Log all events** - Comprehensive audit trail  

✅ **Ubuntu 24.04 image** - Configured in both modules  
✅ **Accept instance name, SSH CIDR, metadata** - All supported  
✅ **Generated credentials via cloud-init** - Automated user setup  
✅ **Output instance_id, public IP** - Returned to Worker  

## Setup Steps

1. **Add GitHub Secrets** (see terraform-github-actions-setup.md)
2. **Deploy Cloudflare Worker**
   ```bash
   cd workers
   wrangler secret put GITHUB_TOKEN
   wrangler secret put CALLBACK_TOKEN
   npm run deploy
   ```
3. **Initialize Terraform**
   ```bash
   cd infra
   terraform init
   ```
4. **Test the flow**
   ```bash
   curl -X POST https://your-worker.workers.dev/api/challenge/start \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"challenge_id":1}'
   ```

## Monitoring

View logs in:
- **GitHub Actions**: Workflow runs page
- **Cloudflare Worker**: Real-time logs dashboard
- **D1 Database**: Query `provisioning_logs` table

```sql
-- View provisioning flow for instance 123
SELECT event_type, provider, message, created_at 
FROM provisioning_logs 
WHERE instance_id = 123 
ORDER BY created_at ASC;
```

## Result

**You now have a fully automated, self-healing VM provisioning system that:**
- Provisions VMs via Terraform when users start challenges
- Automatically falls back from Scaleway to Hetzner on failure
- Generates unique SSH credentials per instance
- Logs every step for audit and debugging
- Integrates seamlessly with Cloudflare Workers and D1
- Uses GitHub Actions as the orchestration layer
