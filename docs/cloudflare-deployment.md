# Cloudflare Deployment Guide

This guide covers deploying the CyberBros Lab application to Cloudflare's edge infrastructure.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Backend Deployment (Cloudflare Workers)](#backend-deployment)
- [Frontend Deployment (Cloudflare Pages)](#frontend-deployment)
- [Environment Configuration](#environment-configuration)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts
- Cloudflare account (free tier works)
- Hetzner Cloud account with API token
- Git repository (GitHub, GitLab, or similar)

### Local Development Tools
```bash
# Install Node.js (v18 or later)
node --version  # Should be >= 18.0.0

# Install Wrangler CLI globally (optional)
npm install -g wrangler

# Or use npx for one-time commands
npx wrangler --version
```

### Authenticate with Cloudflare
```bash
npx wrangler login
```
This opens a browser for OAuth authentication.

## Initial Setup

### 1. Project Structure
```
cyberbros-lab/
├── workers/           # Cloudflare Workers backend
│   ├── src/
│   ├── wrangler.toml  # Worker configuration
│   ├── schema.sql     # D1 database schema
│   └── package.json
├── frontend/          # Next.js frontend
│   ├── src/
│   ├── next.config.js
│   └── package.json
└── docs/             # Documentation
```

### 2. Install Dependencies

**Backend:**
```bash
cd workers
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

## Backend Deployment

### Step 1: Create D1 Database

```bash
cd workers

# Create production database
npx wrangler d1 create cyberbros_db

# Output will show:
# database_id = "your-database-id-here"
```

Copy the `database_id` and update `workers/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "cyberbros_db"
database_id = "your-database-id-here"  # Replace with actual ID
```

### Step 2: Initialize Database Schema

```bash
# Apply schema to remote database
npx wrangler d1 execute cyberbros_db --remote --file=./schema.sql

# Verify it worked
npx wrangler d1 execute cyberbros_db --remote --command="SELECT COUNT(*) FROM challenges"
```

### Step 3: Create KV Namespace

```bash
# Create production KV namespace
npx wrangler kv:namespace create "SESSIONS"

# Output will show:
# id = "your-kv-namespace-id"
```

Update `workers/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "SESSIONS"
id = "your-kv-namespace-id"  # Replace with actual ID
```

### Step 4: Set Production Secrets

```bash
# Generate and set JWT secret
echo "$(openssl rand -base64 32)" | npx wrangler secret put JWT_SECRET

# Set Hetzner API token
echo "your-hetzner-api-token" | npx wrangler secret put HETZNER_API_TOKEN
```

### Step 5: Deploy Worker

```bash
# Deploy to production
npx wrangler deploy

# Output will show:
# Deployed to: https://your-worker.your-subdomain.workers.dev
```

**Save your Worker URL** - you'll need it for the frontend.

### Step 6: Verify Deployment

```bash
# Test the API
curl https://your-worker.your-subdomain.workers.dev/challenges

# Should return JSON with 4 challenges
```

## Frontend Deployment

### Step 1: Configure Next.js for Static Export

Ensure `frontend/next.config.js` has:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
```

### Step 2: Build with Production API URL

```bash
cd frontend

# Build with your Worker URL
NEXT_PUBLIC_API_URL=https://your-worker.your-subdomain.workers.dev npm run build
```

This creates an `out/` directory with static files.

### Step 3: Deploy to Cloudflare Pages

```bash
# Deploy to Pages
npx wrangler pages deploy out --project-name cyberbros-lab-frontend --commit-dirty=true

# Output will show:
# Deployment complete! https://xxx.cyberbros-lab-frontend.pages.dev
```

### Step 4: Set Up Custom Domain (Optional)

1. Go to Cloudflare Dashboard → Pages → your project
2. Click "Custom domains"
3. Add your domain (e.g., `lab.yourdomain.com`)
4. Cloudflare will automatically configure DNS

## Environment Configuration

### Development vs Production

**Local Development:**
```bash
# Backend (runs on localhost:8787)
cd workers
npm run dev

# Frontend (runs on localhost:3000 or custom port)
cd frontend
npm run dev

# Or expose on network (for Raspberry Pi)
npm run dev -- -H 0.0.0.0 -p 3001
```

**Production:**
- Backend: Automatic via `wrangler deploy`
- Frontend: Automatic via `wrangler pages deploy`

### Environment Variables

**Workers** (`workers/wrangler.toml`):
```toml
[vars]
ENVIRONMENT = "production"
VM_TIMEOUT_HOURS = "2"
```

**Frontend** (`frontend/.env.local`):
```bash
# Development
NEXT_PUBLIC_API_URL=http://localhost:8787

# Production (set during build)
NEXT_PUBLIC_API_URL=https://your-worker.your-subdomain.workers.dev
```

## Deployment Checklist

### Before Deploying Backend:
- [ ] D1 database created and ID added to `wrangler.toml`
- [ ] KV namespace created and ID added to `wrangler.toml`
- [ ] Database schema applied with seed data
- [ ] JWT_SECRET set as secret
- [ ] HETZNER_API_TOKEN set as secret
- [ ] Code tested locally with `npm run dev`

### Before Deploying Frontend:
- [ ] Backend Worker URL obtained
- [ ] `next.config.js` configured for static export
- [ ] Build successful with production API URL
- [ ] `out/` directory exists with static files

### After Deployment:
- [ ] Test user registration
- [ ] Test user login
- [ ] Test challenge listing
- [ ] Test VM provisioning (if Hetzner token is valid)
- [ ] Verify CORS headers working
- [ ] Check scheduled cleanup job in Worker dashboard

## Updating Production

### Backend Updates:
```bash
cd workers

# Make your changes to src/

# Test locally
npm run dev

# Deploy when ready
npx wrangler deploy
```

Changes are live immediately (within seconds).

### Frontend Updates:
```bash
cd frontend

# Make your changes to src/

# Test locally
npm run dev

# Build and deploy
NEXT_PUBLIC_API_URL=https://your-worker.your-subdomain.workers.dev npm run build
npx wrangler pages deploy out --project-name cyberbros-lab-frontend
```

### Database Schema Updates:
```bash
# Create migration file (e.g., add_new_column.sql)
# Then apply it:
npx wrangler d1 execute cyberbros_db --remote --file=./migrations/add_new_column.sql
```

## Troubleshooting

### Worker Not Responding
```bash
# Check logs
npx wrangler tail

# View recent deployments
npx wrangler deployments list
```

### CORS Errors
Ensure `workers/src/utils/response.ts` includes:
```typescript
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
'Access-Control-Allow-Headers': 'Content-Type, Authorization',
```

### Database Connection Issues
```bash
# Verify database ID
npx wrangler d1 list

# Check database contents
npx wrangler d1 execute cyberbros_db --remote --command="SELECT * FROM challenges"
```

### Secret Not Working
```bash
# List secrets (shows names only, not values)
npx wrangler secret list

# Update a secret
echo "new-value" | npx wrangler secret put SECRET_NAME
```

### Frontend Build Errors
```bash
# Clean and rebuild
rm -rf .next out
npm run build
```

### Permission Denied on Raspberry Pi
```bash
# Fix ownership
sudo chown -R $USER:$USER frontend/.next frontend/out
```

## Monitoring

### Worker Analytics
1. Cloudflare Dashboard → Workers & Pages
2. Click your Worker
3. View metrics: requests, errors, CPU time

### D1 Database Queries
```bash
# Check database size
npx wrangler d1 execute cyberbros_db --remote --command="SELECT COUNT(*) FROM vm_instances"

# View recent VMs
npx wrangler d1 execute cyberbros_db --remote --command="SELECT * FROM vm_instances ORDER BY created_at DESC LIMIT 5"
```

### Real-time Logs
```bash
# Tail logs from production Worker
npx wrangler tail

# Filter for errors only
npx wrangler tail --status error
```

## Cost Considerations

### Cloudflare Free Tier Limits:
- **Workers**: 100,000 requests/day
- **D1**: 5 GB storage, 5 million reads/day
- **KV**: 100,000 reads/day, 1,000 writes/day
- **Pages**: Unlimited static requests

For a small cybersecurity lab (1-10 users), free tier is sufficient.

## Security Best Practices

1. **Rotate Secrets Regularly**
   ```bash
   echo "new-jwt-secret" | npx wrangler secret put JWT_SECRET
   ```

2. **Use Strong Passwords**
   - Minimum 8 characters enforced in code
   - Consider adding password complexity requirements

3. **Monitor API Usage**
   - Check Worker analytics for unusual traffic
   - Set up Cloudflare alerts for high request rates

4. **Secure Hetzner Token**
   - Never commit token to git
   - Rotate if compromised
   - Use Hetzner API token permissions to limit scope

5. **HTTPS Only**
   - Cloudflare automatically provides SSL
   - No HTTP traffic allowed

## Rollback Procedure

### Rollback Worker:
```bash
# List recent deployments
npx wrangler deployments list

# View specific deployment
npx wrangler deployments view <deployment-id>

# Rollback: redeploy previous version from git
git checkout <previous-commit>
npx wrangler deploy
git checkout main
```

### Rollback Frontend:
```bash
# Build and deploy previous version
git checkout <previous-commit>
cd frontend
NEXT_PUBLIC_API_URL=https://your-worker.your-subdomain.workers.dev npm run build
npx wrangler pages deploy out --project-name cyberbros-lab-frontend
git checkout main
```

## Support Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
