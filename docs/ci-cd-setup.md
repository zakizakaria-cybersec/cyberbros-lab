# CI/CD Setup Guide

This guide explains how to set up automatic deployments to Cloudflare when you push to GitHub.

## Overview

Three GitHub Actions workflows have been created:
1. **deploy-workers.yml** - Auto-deploy Workers on push to main
2. **deploy-pages.yml** - Auto-deploy Frontend on push to main  
3. **deploy-staging.yml** - Deploy to staging on pull requests

## Setup Steps

### 1. Get Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use template: "Edit Cloudflare Workers"
4. Or create custom token with permissions:
   - **Account**: Cloudflare Workers Scripts - Edit
   - **Account**: Cloudflare Pages - Edit
   - **Account**: D1 - Edit
5. Click "Continue to summary" → "Create Token"
6. **Copy the token** (you won't see it again!)

### 2. Add Secrets to GitHub

1. Go to your GitHub repo: `https://github.com/zakizakaria-cybersec/cyberbros-lab`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Add these secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `CLOUDFLARE_API_TOKEN` | Your token from step 1 | For Wrangler deployments |
| `NEXT_PUBLIC_API_URL` | `https://cyberbros-lab-workers.bidguru94.workers.dev` | Your Worker URL |

### 3. Test the Workflow

```bash
# Make a change to workers
cd workers/src
echo "// Test change" >> index.ts

# Commit and push
git add .
git commit -m "test: trigger worker deployment"
git push origin main
```

**What happens:**
1. GitHub Actions detects change in `workers/` folder
2. Runs workflow: installs deps, deploys to Cloudflare
3. Your Worker is updated automatically!
4. Check: **Actions** tab in GitHub to see deployment status

### 4. Test Frontend Deployment

```bash
# Make a change to frontend
cd frontend/src/pages
echo "// Test change" >> index.tsx

# Commit and push
git add .
git commit -m "test: trigger frontend deployment"
git push origin main
```

**What happens:**
1. GitHub Actions detects change in `frontend/` folder
2. Builds Next.js with production API URL
3. Deploys to Cloudflare Pages
4. Frontend is updated!

## How It Works

### Trigger Conditions

**Workers deployment triggers when:**
- Push to `main` branch
- Files changed in `workers/` directory
- Or workflow file itself changed

**Frontend deployment triggers when:**
- Push to `main` branch
- Files changed in `frontend/` directory
- Or workflow file itself changed

**Staging deployment triggers when:**
- Pull request opened/updated to `main`
- Useful for testing before merging

### Deployment Flow

```
Local Changes
    ↓
git push origin main
    ↓
GitHub Actions Triggered
    ↓
Install Dependencies
    ↓
Build (if needed)
    ↓
Deploy to Cloudflare
    ↓
Live in Seconds! ✨
```

## Viewing Deployment Status

### GitHub UI
1. Go to repo → **Actions** tab
2. See running/completed workflows
3. Click workflow to see logs
4. Green ✓ = success, Red ✗ = failed

### Cloudflare Dashboard
1. Check Workers dashboard for new deployment
2. Check Pages dashboard for new build
3. View analytics and logs

## Troubleshooting

### ❌ Workflow Failed: "Authentication error"

**Problem:** CLOUDFLARE_API_TOKEN is invalid or missing

**Solution:**
```bash
# Regenerate token in Cloudflare Dashboard
# Update secret in GitHub Settings → Secrets
```

### ❌ Workflow Failed: "Database not found"

**Problem:** D1 database ID in `wrangler.toml` doesn't exist

**Solution:**
```bash
# Verify database exists
npx wrangler d1 list

# Update wrangler.toml with correct ID
```

### ❌ Frontend Build Failed

**Problem:** Missing NEXT_PUBLIC_API_URL secret

**Solution:**
```bash
# Add secret in GitHub Settings → Secrets
# Secret name: NEXT_PUBLIC_API_URL
# Secret value: https://your-worker.workers.dev
```

### ❌ Workflow Runs But Doesn't Deploy

**Problem:** Path filter didn't match changed files

**Solution:**
```yaml
# Check paths in workflow file
paths:
  - 'workers/**'  # Must match your changes
```

## Advanced Configuration

### Deploy Only on Specific Branches

Edit `.github/workflows/deploy-workers.yml`:
```yaml
on:
  push:
    branches:
      - main
      - production  # Add more branches
```

### Deploy on Git Tags (Releases)

Create `.github/workflows/deploy-release.yml`:
```yaml
on:
  push:
    tags:
      - 'v*'  # Trigger on v1.0.0, v1.1.0, etc.
```

### Add Deployment Notifications

Add Slack/Discord webhook:
```yaml
- name: Notify Success
  run: |
    curl -X POST ${{ secrets.DISCORD_WEBHOOK }} \
      -H "Content-Type: application/json" \
      -d '{"content":"🚀 Deployed to production!"}'
```

### Run Tests Before Deploy

```yaml
- name: Run Tests
  working-directory: ./workers
  run: npm test

- name: Deploy (only if tests pass)
  if: success()
  run: npx wrangler deploy
```

## Manual Deployment Override

Even with CI/CD, you can still deploy manually:
```bash
cd workers
npx wrangler deploy
```

This is useful for:
- Emergency hotfixes
- Testing without committing
- Rollbacks

## Disable Auto-Deployment

### Temporarily (for specific commit)
```bash
git commit -m "docs: update README [skip ci]"
# [skip ci] prevents workflow from running
```

### Permanently
1. Go to repo → **Actions** tab
2. Click workflow name
3. Click "..." → "Disable workflow"

## Environment-Specific Deployments

### Production (main branch)
```yaml
on:
  push:
    branches: [main]
env:
  ENVIRONMENT: production
```

### Staging (develop branch)
```yaml
on:
  push:
    branches: [develop]
env:
  ENVIRONMENT: staging
```

## Cost Considerations

**GitHub Actions:**
- Free for public repos (unlimited minutes)
- Private repos: 2,000 minutes/month free
- Each deployment takes ~2-3 minutes

**Cloudflare:**
- Deployments are free (unlimited)
- Only charged for usage (requests, compute)

## Security Best Practices

1. **Never commit secrets** to git
2. **Use GitHub Secrets** for all sensitive data
3. **Rotate API tokens** regularly (every 90 days)
4. **Limit token permissions** to only what's needed
5. **Review workflow logs** for exposed secrets
6. **Use branch protection** to require reviews

## Workflow Status Badges

Add to README.md:
```markdown
![Deploy Workers](https://github.com/zakizakaria-cybersec/cyberbros-lab/actions/workflows/deploy-workers.yml/badge.svg)
![Deploy Pages](https://github.com/zakizakaria-cybersec/cyberbros-lab/actions/workflows/deploy-pages.yml/badge.svg)
```

## Next Steps

1. ✅ Set up GitHub secrets (CLOUDFLARE_API_TOKEN, NEXT_PUBLIC_API_URL)
2. ✅ Push a test change to trigger deployment
3. ✅ Monitor Actions tab for deployment status
4. ✅ Verify changes live on Cloudflare
5. ✅ Celebrate automatic deployments! 🎉

## Summary

| Action | Result |
|--------|--------|
| Push to `main` with worker changes | Worker auto-deploys |
| Push to `main` with frontend changes | Frontend auto-deploys |
| Create pull request | Staging deployment (optional) |
| Manual deploy | `npx wrangler deploy` still works |

Your development workflow is now:
```bash
git add .
git commit -m "feat: new feature"
git push origin main
# ✨ Automatically deployed in ~2 minutes!
```

No more manual deployment commands needed! 🚀
