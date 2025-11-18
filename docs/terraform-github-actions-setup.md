# Terraform + GitHub Actions + Cloudflare Workers Setup Guide

## Architecture Overview

```
User → Cloudflare Worker → Enqueue Job → GitHub Actions → Terraform
                                                              ↓
                                                         Scaleway VM
                                                              ↓ (on failure)
                                                         Hetzner VM
                                                              ↓
                                                      Callback to Worker
                                                              ↓
                                                      Update D1 Database
```

## Prerequisites

1. **GitHub Repository** with Actions enabled
2. **Cloudflare Account** with Workers and D1
3. **Scaleway Account** with API credentials
4. **Hetzner Account** with API token
5. **Cloudflare R2** (or S3) for Terraform state storage

---

## Part 1: GitHub Repository Setup

### 1.1 Add Repository Secrets

Go to **Settings → Secrets and variables → Actions** and add:

```bash
# Scaleway credentials
SCALEWAY_ACCESS_KEY=<your-access-key>
SCALEWAY_SECRET_KEY=<your-secret-key>
SCALEWAY_PROJECT_ID=<your-project-id>

# Hetzner credentials
HETZNER_API_TOKEN=<your-hetzner-token>

# Terraform state storage (Cloudflare R2)
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY=<r2-access-key>
R2_SECRET_KEY=<r2-secret-key>

# Backend API
BACKEND_URL=https://api.cyberbros.lab
CALLBACK_TOKEN=<generate-random-token>

# GitHub token for workflows
GITHUB_TOKEN=${{ secrets.GITHUB_TOKEN }} # Auto-provided
```

### 1.2 Verify Workflow Files

Ensure these files exist:
- `.github/workflows/provision-vm.yml`
- `.github/workflows/destroy-vm.yml`

---

## Part 2: Cloudflare Workers Setup

### 2.1 Update wrangler.toml

```toml
name = "cyberbros-lab-api"
main = "src/index.ts"
compatibility_date = "2023-12-01"

[env.production]
name = "cyberbros-lab-api-prod"

[[d1_databases]]
binding = "DB"
database_name = "cyberbros-lab-db"
database_id = "<your-d1-database-id>"

# Optional: Cloudflare Queue for job queuing
# [[queues.producers]]
# binding = "PROVISIONING_QUEUE"
# queue = "vm-provisioning-queue"

[vars]
ENVIRONMENT = "production"
JWT_EXPIRATION_MINUTES = "10080"
VM_DEFAULT_LIFETIME_HOURS = "2"
VM_CLEANUP_INTERVAL_MINUTES = "15"
GITHUB_REPO = "zakizakaria-cybersec/cyberbros-lab"
BACKEND_URL = "https://api.cyberbros.lab"
```

### 2.2 Set Worker Secrets

```bash
# JWT secret
wrangler secret put JWT_SECRET

# Hetzner token (for direct API if needed)
wrangler secret put HETZNER_API_TOKEN

# GitHub token (for triggering workflows)
wrangler secret put GITHUB_TOKEN

# Callback token (for authenticating GitHub Actions callbacks)
wrangler secret put CALLBACK_TOKEN
```

### 2.3 Deploy D1 Database Schema

```bash
cd workers
wrangler d1 execute cyberbros-lab-db --file=../schema.sql --remote
```

### 2.4 Deploy Worker

```bash
cd workers
npm install
npm run deploy
```

---

## Part 3: Terraform Setup

### 3.1 Create Cloudflare R2 Bucket for State

```bash
# Using Cloudflare dashboard or Wrangler
wrangler r2 bucket create cyberbros-terraform-state
```

### 3.2 Initialize Terraform Modules

```bash
cd infra

# Install providers
terraform init
```

### 3.3 Validate Modules

```bash
# Validate Scaleway module
cd modules/scaleway_vm
terraform init
terraform validate

# Validate Hetzner module
cd ../hetzner_vm
terraform init
terraform validate
```

---

## Part 4: Integration Flow

### 4.1 User Starts Challenge

**Request to Cloudflare Worker:**
```bash
POST https://your-worker.workers.dev/api/challenge/start
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "challenge_id": 1
}
```

**Worker Actions:**
1. Creates `instances` record with status `provisioning`
2. Logs `provisioning_started` event
3. Triggers GitHub Actions workflow via repository dispatch

### 4.2 GitHub Actions Provisions VM

**Workflow Steps:**
1. Checkout repository
2. Setup Terraform
3. Initialize Terraform with R2 backend
4. **Attempt Scaleway provisioning**
   - Generate SSH username/password
   - Apply Terraform with Scaleway module
   - If success: extract outputs → send callback
   - If failure: destroy partial resources → proceed to fallback
5. **Fallback to Hetzner** (if Scaleway failed)
   - Log fallback event
   - Apply Terraform with Hetzner module
   - Extract outputs → send callback
6. **Send callback to Worker**
   - POST to `/api/provisioning/callback`
   - Include: instance_id, provider, IP, credentials
7. **Schedule destroy job**
   - Trigger destroy workflow at expiration time

### 4.3 Callback Updates Database

**GitHub Actions sends:**
```bash
POST https://your-worker.workers.dev/api/provisioning/callback
Authorization: Bearer <callback-token>
Content-Type: application/json

{
  "success": true,
  "instance_id": 123,
  "cloud_instance_id": "hetzner-456789",
  "provider": "hetzner",
  "public_ip": "192.168.1.100",
  "ssh_username": "user12345",
  "ssh_password": "SecurePass!@#"
}
```

**Worker Actions:**
1. Verifies callback token
2. Updates `instances` table with VM details
3. Sets status to `running`
4. Logs `provisioning_success` and `vm_running` events

### 4.4 User Gets Credentials

**Request:**
```bash
GET https://your-worker.workers.dev/api/challenge/123/status
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "status": "running",
  "vm": {
    "instance_id": "hetzner-456789",
    "public_ip": "192.168.1.100",
    "ssh_username": "user12345",
    "ssh_password": "SecurePass!@#",
    "status": "running",
    "expires_at": "2025-11-18T14:00:00Z",
    "time_remaining_minutes": 115
  }
}
```

---

## Part 5: VM Cleanup

### 5.1 Scheduled Cleanup (Cron)

**Worker cron trigger** (configured in `wrangler.toml`):
```toml
[triggers]
crons = ["*/15 * * * *"]  # Every 15 minutes
```

**Cleanup process:**
1. Query expired VMs (`expires_at < now()` AND `status = 'running'`)
2. For each expired VM:
   - Trigger destroy workflow via GitHub Actions
   - Update status to `destroying`
3. GitHub Actions destroys via Terraform
4. Callback updates status to `destroyed`

### 5.2 Manual Destruction

**API endpoint:**
```bash
DELETE https://your-worker.workers.dev/api/vms/123
Authorization: Bearer <jwt-token>
```

**Process:**
1. Triggers GitHub Actions destroy workflow
2. Terraform destroys infrastructure
3. Updates database

---

## Part 6: Monitoring & Logging

### 6.1 View Provisioning Logs

**Query D1 database:**
```sql
SELECT * FROM provisioning_logs 
WHERE instance_id = 123 
ORDER BY created_at ASC;
```

**Log events tracked:**
- `provisioning_started` - Workflow triggered
- `provisioning_failed` - Provider failed
- `provider_fallback` - Switched to fallback
- `provisioning_success` - VM created
- `vm_running` - VM accessible
- `vm_expired` - VM expired
- `vm_destroying` - Destruction started
- `vm_destroyed` - VM removed

### 6.2 GitHub Actions Logs

View workflow runs:
```
https://github.com/<owner>/<repo>/actions
```

---

## Part 7: Testing

### 7.1 Test Provisioning

```bash
# 1. Login and get token
TOKEN=$(curl -X POST https://your-worker.workers.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.access_token')

# 2. Start challenge
RESPONSE=$(curl -X POST https://your-worker.workers.dev/api/challenge/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"challenge_id":1}')

echo $RESPONSE

# 3. Extract instance ID
INSTANCE_ID=$(echo $RESPONSE | jq -r '.id')

# 4. Check status (wait ~2-3 minutes for provisioning)
curl -X GET https://your-worker.workers.dev/api/challenge/$INSTANCE_ID/status \
  -H "Authorization: Bearer $TOKEN"
```

### 7.2 Test Fallback

To test Scaleway → Hetzner fallback:
1. Temporarily invalidate Scaleway credentials in GitHub secrets
2. Start a challenge
3. Monitor GitHub Actions logs
4. Verify fallback occurs and Hetzner VM is created
5. Check `provisioning_logs` for `provider_fallback` event

---

## Part 8: Production Considerations

### 8.1 Security

- [ ] Use strong, randomly generated `CALLBACK_TOKEN`
- [ ] Restrict GitHub Actions to specific branches
- [ ] Enable branch protection rules
- [ ] Use separate production credentials
- [ ] Encrypt sensitive Terraform outputs
- [ ] Implement rate limiting on Worker endpoints

### 8.2 Cost Optimization

- [ ] Set appropriate VM expiration times
- [ ] Monitor Scaleway/Hetzner usage
- [ ] Implement user quotas (max VMs per user)
- [ ] Auto-cleanup orphaned resources
- [ ] Use cheaper instance types for basic challenges

### 8.3 Reliability

- [ ] Monitor GitHub Actions workflow success rate
- [ ] Set up alerts for provisioning failures
- [ ] Implement retry logic for transient failures
- [ ] Backup Terraform state regularly
- [ ] Test disaster recovery procedures

### 8.4 Scalability

- [ ] Use Cloudflare Queues for high-volume provisioning
- [ ] Implement queuing system for concurrent requests
- [ ] Load test provisioning pipeline
- [ ] Consider multi-region deployments
- [ ] Cache challenge metadata in KV

---

## Environment Variables Reference

### Worker Environment (wrangler.toml + secrets)
```bash
# Public vars
ENVIRONMENT=production
JWT_EXPIRATION_MINUTES=10080
VM_DEFAULT_LIFETIME_HOURS=2
VM_CLEANUP_INTERVAL_MINUTES=15
GITHUB_REPO=owner/repo
BACKEND_URL=https://api.cyberbros.lab

# Secrets (wrangler secret put)
JWT_SECRET=<random-secret>
HETZNER_API_TOKEN=<hetzner-token>
GITHUB_TOKEN=<github-pat>
CALLBACK_TOKEN=<random-token>
```

### GitHub Actions Secrets
```bash
SCALEWAY_ACCESS_KEY=<access-key>
SCALEWAY_SECRET_KEY=<secret-key>
SCALEWAY_PROJECT_ID=<project-id>
HETZNER_API_TOKEN=<token>
R2_ENDPOINT=<r2-endpoint>
R2_ACCESS_KEY=<r2-key>
R2_SECRET_KEY=<r2-secret>
BACKEND_URL=https://api.cyberbros.lab
CALLBACK_TOKEN=<same-as-worker>
```

---

## Troubleshooting

### Issue: Workflow not triggering
**Solution:** 
- Verify `GITHUB_TOKEN` has repo dispatch permissions
- Check Worker logs for API errors
- Verify GitHub repository visibility (must be public or PAT has access)

### Issue: Scaleway provisioning always fails
**Solution:**
- Verify Scaleway credentials
- Check region/zone availability
- Ensure image ID exists
- Review Scaleway API quotas

### Issue: Callback not received
**Solution:**
- Verify `CALLBACK_TOKEN` matches between Worker and GitHub
- Check Worker logs for authentication errors
- Ensure Worker URL is accessible from GitHub Actions
- Review GitHub Actions network policies

### Issue: Terraform state conflicts
**Solution:**
- Ensure unique state keys per instance
- Check R2 bucket permissions
- Verify no concurrent workflows for same instance
- Consider state locking mechanism

---

## Next Steps

1. ✅ Deploy infrastructure as documented
2. ✅ Test end-to-end flow with single user
3. ✅ Monitor provisioning logs for issues
4. ✅ Load test with multiple concurrent users
5. ✅ Set up monitoring and alerting
6. ✅ Document operational procedures
7. ✅ Train team on troubleshooting

---

## Summary

**Does this work with your current setup?**

✅ **YES** - This architecture fully integrates:
- Cloudflare Workers (API + D1 database)
- GitHub Actions (provisioning orchestration)
- Terraform (infrastructure as code)
- Automatic fallback (Scaleway → Hetzner)
- Event-based logging
- Scheduled cleanup

**Key Benefits:**
- ✅ Automatic VM provisioning when user starts challenge
- ✅ Provider fallback without manual intervention
- ✅ Git-versioned infrastructure code
- ✅ Comprehensive audit trail
- ✅ Serverless, scalable architecture
- ✅ Cost-effective (pay per use)
