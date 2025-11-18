# 🚀 Deployment Checklist - Get Everything Working

## ✅ Step 1: Add GitHub Secrets (Required First!)

Go to your GitHub repo: `https://github.com/zakizakaria-cybersec/cyberbros-lab/settings/secrets/actions`

Click **"New repository secret"** and add these **one by one**:

### Scaleway Credentials
```
Name: SCALEWAY_ACCESS_KEY
Value: <your-scaleway-access-key>

Name: SCALEWAY_SECRET_KEY  
Value: <your-scaleway-secret-key>

Name: SCALEWAY_PROJECT_ID
Value: <your-scaleway-project-id>
```

### Hetzner Credentials (add later when you have it)
```
Name: HETZNER_API_TOKEN
Value: <your-hetzner-token>
```

### Cloudflare R2 for Terraform State
```
Name: R2_ENDPOINT
Value: https://<your-account-id>.r2.cloudflarestorage.com

Name: R2_ACCESS_KEY
Value: <your-r2-access-key>

Name: R2_SECRET_KEY
Value: <your-r2-secret-key>
```

### Backend Callback
```
Name: CALLBACK_TOKEN
Value: <generate-a-random-token-here>  # Example: openssl rand -hex 32
```

**📝 Note:** You can skip Hetzner token for now - the system will just fail on fallback (which is fine for testing).

---

## ✅ Step 2: Create Cloudflare R2 Bucket

**Option A: Using Cloudflare Dashboard**
1. Go to https://dash.cloudflare.com
2. Select **R2** from sidebar
3. Click **"Create bucket"**
4. Name: `cyberbros-terraform-state`
5. Create API token with read/write access

**Option B: Using Wrangler CLI**
```bash
wrangler r2 bucket create cyberbros-terraform-state
```

Then create R2 API token:
```bash
# In Cloudflare dashboard: R2 → Manage R2 API Tokens
# Create token with "Admin Read & Write" permissions
```

---

## ✅ Step 3: Update Cloudflare Worker Configuration

### 3.1 Update `workers/wrangler.toml`

```toml
name = "cyberbros-lab-api"
main = "src/index.ts"
compatibility_date = "2023-12-01"

[[d1_databases]]
binding = "DB"
database_name = "cyberbros-lab-db"
database_id = "<YOUR_D1_DATABASE_ID>"  # Get this from: wrangler d1 list

[vars]
ENVIRONMENT = "production"
JWT_EXPIRATION_MINUTES = "10080"
VM_DEFAULT_LIFETIME_HOURS = "2"
VM_CLEANUP_INTERVAL_MINUTES = "15"
GITHUB_REPO = "zakizakaria-cybersec/cyberbros-lab"
BACKEND_URL = "https://cyberbros-lab-api.your-subdomain.workers.dev"

# Cron trigger for VM cleanup (every 15 minutes)
[triggers]
crons = ["*/15 * * * *"]
```

### 3.2 Get your D1 Database ID

```bash
cd workers
wrangler d1 list
```

Copy the database ID and update `wrangler.toml`.

### 3.3 Set Worker Secrets

```bash
cd workers

# JWT secret (generate random string)
echo "Enter JWT secret (or press enter to generate):"
wrangler secret put JWT_SECRET

# GitHub Personal Access Token
# Create at: https://github.com/settings/tokens
# Permissions needed: repo (all), workflow
wrangler secret put GITHUB_TOKEN

# Same callback token as GitHub secrets
wrangler secret put CALLBACK_TOKEN

# Optional: Hetzner token (for direct API fallback)
wrangler secret put HETZNER_API_TOKEN
```

---

## ✅ Step 4: Deploy Cloudflare Worker

```bash
cd workers

# Install dependencies (if not done)
npm install

# Deploy D1 database schema
wrangler d1 execute cyberbros-lab-db --remote --file=../schema.sql

# Deploy worker
npm run deploy

# Note the URL: https://cyberbros-lab-api.your-subdomain.workers.dev
```

---

## ✅ Step 5: Update GitHub Secrets with Worker URL

Go back to GitHub secrets and add:

```
Name: BACKEND_URL
Value: https://cyberbros-lab-api.your-subdomain.workers.dev
```

---

## ✅ Step 6: Push Code to GitHub

```bash
# Make sure you're in the project root
cd /home/zaki/Websites/cyberbros-labs/cyberbros-lab

# Stage all changes
git add .

# Commit
git commit -m "Add Terraform + GitHub Actions provisioning with Scaleway/Hetzner fallback"

# Push to main branch
git push origin main
```

**⚠️ Important:** Make sure `.github/workflows/` directory is included in the commit!

---

## ✅ Step 7: Test the Complete Flow

### 7.1 Register a Test User

```bash
WORKER_URL="https://cyberbros-lab-api.your-subdomain.workers.dev"

# Register
curl -X POST $WORKER_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

### 7.2 Login and Get Token

```bash
# Login
TOKEN=$(curl -X POST $WORKER_URL/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }' | jq -r '.access_token')

echo "Token: $TOKEN"
```

### 7.3 View Available Challenges

```bash
# Get challenges
curl -X GET $WORKER_URL/api/challenges \
  -H "Authorization: Bearer $TOKEN"
```

### 7.4 Start a Challenge (Trigger Provisioning!)

```bash
# Start challenge ID 1
curl -X POST $WORKER_URL/api/challenge/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"challenge_id": 1}'

# Should return:
# {
#   "status": "provisioning",
#   "message": "VM provisioning initiated. Check status in a moment."
# }
```

### 7.5 Check GitHub Actions

1. Go to: `https://github.com/zakizakaria-cybersec/cyberbros-lab/actions`
2. You should see a workflow run: **"Provision VM"**
3. Click on it to watch the progress
4. Should take 2-3 minutes to complete

### 7.6 Check VM Status

```bash
# Wait 2-3 minutes, then check status
curl -X GET $WORKER_URL/api/challenge/1/status \
  -H "Authorization: Bearer $TOKEN"

# Should return:
# {
#   "status": "running",
#   "vm": {
#     "public_ip": "192.168.x.x",
#     "ssh_username": "userXXX",
#     "ssh_password": "SecurePass!",
#     ...
#   }
# }
```

### 7.7 SSH into Your VM!

```bash
# Extract credentials from status response
VM_IP="<public_ip_from_response>"
SSH_USER="<ssh_username_from_response>"
SSH_PASS="<ssh_password_from_response>"

# SSH (you'll be prompted for password)
ssh $SSH_USER@$VM_IP
```

---

## ✅ Step 8: Monitor and Debug

### Check Provisioning Logs

```bash
# Query D1 database for logs
wrangler d1 execute cyberbros-lab-db --remote \
  --command="SELECT * FROM provisioning_logs ORDER BY created_at DESC LIMIT 10"
```

### Check Worker Logs (Real-time)

```bash
cd workers
wrangler tail
```

Then trigger a challenge start to see live logs.

### Check GitHub Actions Logs

- Go to: https://github.com/zakizakaria-cybersec/cyberbros-lab/actions
- Click on the workflow run
- View each step's logs

---

## 🔧 Troubleshooting

### Issue: "workflow not found" error

**Solution:**
```bash
# Ensure workflows are pushed
ls -la .github/workflows/

# Should see:
# provision-vm.yml
# destroy-vm.yml

# If missing, check git status
git status

# Add and push
git add .github/workflows/
git commit -m "Add workflow files"
git push origin main
```

### Issue: Workflow triggered but fails immediately

**Solution:**
- Check GitHub secrets are set correctly
- Verify Scaleway credentials are valid
- Check workflow logs for specific error
- Ensure R2 bucket exists

### Issue: Callback not received

**Solution:**
```bash
# Check CALLBACK_TOKEN matches between GitHub and Worker
wrangler secret list

# Verify worker URL in GitHub secrets (BACKEND_URL)
# Test callback manually:
curl -X POST $WORKER_URL/api/provisioning/callback \
  -H "Authorization: Bearer <your-callback-token>" \
  -H "Content-Type: application/json" \
  -d '{"success":true,"instance_id":1}'
```

### Issue: Terraform state errors

**Solution:**
```bash
# Verify R2 bucket exists
wrangler r2 bucket list

# Check R2 credentials in GitHub secrets
# Ensure bucket is in same Cloudflare account
```

---

## 📊 Quick Status Check

Run this to verify everything is set up:

```bash
#!/bin/bash

echo "🔍 Checking deployment status..."
echo ""

# Check GitHub secrets
echo "✅ GitHub Secrets:"
echo "   - Go to: https://github.com/zakizakaria-cybersec/cyberbros-lab/settings/secrets/actions"
echo "   - Verify: SCALEWAY_ACCESS_KEY, SCALEWAY_SECRET_KEY, SCALEWAY_PROJECT_ID"
echo "   - Verify: R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY"
echo "   - Verify: CALLBACK_TOKEN, BACKEND_URL"
echo ""

# Check workflows
echo "✅ GitHub Workflows:"
if [ -f ".github/workflows/provision-vm.yml" ]; then
  echo "   ✓ provision-vm.yml exists"
else
  echo "   ✗ provision-vm.yml MISSING!"
fi

if [ -f ".github/workflows/destroy-vm.yml" ]; then
  echo "   ✓ destroy-vm.yml exists"
else
  echo "   ✗ destroy-vm.yml MISSING!"
fi
echo ""

# Check Terraform modules
echo "✅ Terraform Modules:"
if [ -d "infra/modules/scaleway_vm" ]; then
  echo "   ✓ scaleway_vm module exists"
else
  echo "   ✗ scaleway_vm module MISSING!"
fi

if [ -d "infra/modules/hetzner_vm" ]; then
  echo "   ✓ hetzner_vm module exists"
else
  echo "   ✗ hetzner_vm module MISSING!"
fi
echo ""

# Check worker files
echo "✅ Worker Files:"
if [ -f "workers/src/services/github-actions.ts" ]; then
  echo "   ✓ github-actions.ts exists"
else
  echo "   ✗ github-actions.ts MISSING!"
fi

if [ -f "workers/src/routes/provisioning.ts" ]; then
  echo "   ✓ provisioning.ts exists"
else
  echo "   ✗ provisioning.ts MISSING!"
fi
echo ""

echo "🎯 Next steps:"
echo "   1. Add GitHub secrets (if not done)"
echo "   2. Deploy Cloudflare Worker: cd workers && npm run deploy"
echo "   3. Push to GitHub: git push origin main"
echo "   4. Test provisioning: curl -X POST <worker-url>/api/challenge/start"
```

Save this as `check-deployment.sh`, make it executable, and run it:

```bash
chmod +x check-deployment.sh
./check-deployment.sh
```

---

## 🎉 Success Criteria

You'll know it's working when:

1. ✅ Worker deploys without errors
2. ✅ GitHub Actions workflow triggers when you start a challenge
3. ✅ Workflow completes successfully (green check)
4. ✅ VM status changes from "provisioning" to "running"
5. ✅ You can SSH into the VM with provided credentials
6. ✅ Provisioning logs appear in D1 database

---

## 📝 Summary of What to Do NOW

1. **Add GitHub secrets** (Scaleway + R2 + callback token)
2. **Create R2 bucket** (`cyberbros-terraform-state`)
3. **Update `workers/wrangler.toml`** with your D1 database ID
4. **Deploy worker** (`cd workers && npm run deploy`)
5. **Add BACKEND_URL** to GitHub secrets (your worker URL)
6. **Push to GitHub** (`git push origin main`)
7. **Test!** (follow Step 7 above)

**Time estimate:** 15-20 minutes if you have all credentials ready.

**You don't need Hetzner token yet** - the system will just try Scaleway only, which is perfect for initial testing!
