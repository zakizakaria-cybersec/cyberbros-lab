# Development Workflow & Lifecycle

This guide establishes a structured development workflow following industry standards, optimized for small teams (1-5 developers).

## Table of Contents
- [Git Workflow](#git-workflow)
- [Branch Strategy](#branch-strategy)
- [Development Lifecycle](#development-lifecycle)
- [Code Review Process](#code-review-process)
- [Testing Strategy](#testing-strategy)
- [Release Process](#release-process)
- [Environment Strategy](#environment-strategy)

## Git Workflow

### Branch Strategy (GitHub Flow - Simplified)

We use a simplified GitHub Flow, perfect for small teams:

```
main (production)
  ├── feature/user-authentication
  ├── feature/vm-auto-cleanup
  ├── bugfix/cors-headers
  └── hotfix/security-patch
```

### Branch Types

| Branch Type | Purpose | Naming | Example |
|------------|---------|--------|---------|
| `main` | Production-ready code | `main` | `main` |
| `feature/*` | New features | `feature/description` | `feature/hetzner-integration` |
| `bugfix/*` | Bug fixes | `bugfix/description` | `bugfix/login-validation` |
| `hotfix/*` | Urgent production fixes | `hotfix/description` | `hotfix/security-jwt` |
| `chore/*` | Maintenance tasks | `chore/description` | `chore/update-dependencies` |

### Workflow Steps

#### 1. Start New Work

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/add-rdp-support

# Or for bugfix
git checkout -b bugfix/fix-vm-timeout
```

#### 2. Make Changes

```bash
# Make your changes
# Edit files...

# Check status
git status

# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add RDP port configuration for Windows VMs"
```

#### 3. Push to Remote

```bash
# Push feature branch
git push origin feature/add-rdp-support
```

#### 4. Create Pull Request

On GitHub:
1. Click "Pull Request"
2. Base: `main` ← Compare: `feature/add-rdp-support`
3. Fill out PR template (see below)
4. Request review (if team > 1)

#### 5. Merge and Deploy

```bash
# After PR approval, merge via GitHub UI
# Delete feature branch
git branch -d feature/add-rdp-support
git push origin --delete feature/add-rdp-support

# Update local main
git checkout main
git pull origin main
```

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples
```bash
git commit -m "feat(vm): add RDP support for Windows challenges"
git commit -m "fix(auth): resolve JWT expiration edge case"
git commit -m "docs: update deployment guide with custom domain steps"
git commit -m "chore(deps): update wrangler to v4.47.0"
```

## Development Lifecycle

### 1. Planning Phase

**For Solo Developer:**
- Create GitHub Issues for tasks
- Label: `feature`, `bug`, `enhancement`
- Add to GitHub Project board

**For Small Team:**
- Weekly planning meeting (30 min)
- Assign issues to team members
- Set milestones for major releases

### 2. Development Phase

**Local Development Setup:**

```bash
# Terminal 1: Backend
cd workers
npm run dev  # Runs on localhost:8787

# Terminal 2: Frontend
cd frontend
npm run dev  # Runs on localhost:3000

# Or for network access (Raspberry Pi)
npm run dev -- -H 0.0.0.0 -p 3001
```

**Development Checklist:**
- [ ] Create feature branch
- [ ] Write code
- [ ] Test locally
- [ ] Update documentation if needed
- [ ] Commit with conventional message
- [ ] Push to remote

### 3. Testing Phase

**Manual Testing:**
```bash
# Test backend endpoints
curl http://localhost:8787/challenges

# Test frontend
# Open browser: http://localhost:3000
# Test user flows manually
```

**Database Testing:**
```bash
# Local database
npx wrangler d1 execute cyberbros_db --local --command="SELECT * FROM challenges"

# Test with local data
npx wrangler d1 execute cyberbros_db --local --file=./test-data.sql
```

### 4. Review Phase

**Self-Review Checklist:**
- [ ] Code follows project conventions
- [ ] No console.logs left in production code
- [ ] Error handling implemented
- [ ] CORS headers correct
- [ ] No hardcoded secrets
- [ ] TypeScript types properly defined
- [ ] Comments added for complex logic

**For Teams - PR Review:**
- Reviewer checks code quality
- Tests functionality locally
- Approves or requests changes
- Merge after approval

### 5. Deployment Phase

See [Cloudflare Deployment Guide](./cloudflare-deployment.md)

```bash
# Backend
cd workers
npx wrangler deploy

# Frontend
cd frontend
NEXT_PUBLIC_API_URL=https://your-worker.workers.dev npm run build
npx wrangler pages deploy out --project-name cyberbros-lab-frontend
```

### 6. Monitoring Phase

```bash
# Watch logs
npx wrangler tail

# Check for errors
npx wrangler tail --status error

# Monitor analytics in Cloudflare Dashboard
```

## Pull Request Template

Create `.github/pull_request_template.md`:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Feature (new functionality)
- [ ] Bug fix
- [ ] Documentation update
- [ ] Refactor
- [ ] Hotfix

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Tested locally
- [ ] Backend tests pass
- [ ] Frontend builds successfully
- [ ] No console errors

## Checklist
- [ ] Code follows project conventions
- [ ] Self-reviewed code
- [ ] Documentation updated
- [ ] No secrets committed
- [ ] CORS configured correctly

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #issue_number
```

## Issue Templates

Create `.github/ISSUE_TEMPLATE/feature.md`:

```markdown
---
name: Feature Request
about: Suggest a new feature
title: '[FEATURE] '
labels: feature
---

## Feature Description
Clear description of the feature

## Use Case
Why is this feature needed?

## Proposed Solution
How should it work?

## Alternatives Considered
What other approaches did you consider?

## Additional Context
Any other relevant information
```

Create `.github/ISSUE_TEMPLATE/bug.md`:

```markdown
---
name: Bug Report
about: Report a bug
title: '[BUG] '
labels: bug
---

## Bug Description
What's wrong?

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error

## Expected Behavior
What should happen?

## Actual Behavior
What actually happens?

## Environment
- Browser: 
- OS: 
- Version:

## Screenshots
Add screenshots if applicable

## Error Messages
```
Paste any error messages here
```
```

## Environment Strategy

### Three-Tier Strategy

| Environment | Purpose | URL | Deploy |
|------------|---------|-----|--------|
| **Local** | Active development | localhost:8787 | Manual |
| **Staging** | Pre-production testing | staging.workers.dev | On PR merge |
| **Production** | Live application | production.workers.dev | On release tag |

### Setup Staging Environment

**Workers:**

Create `workers/wrangler.staging.toml`:
```toml
name = "cyberbros-lab-workers-staging"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "cyberbros_db_staging"
database_id = "staging-database-id"

[[kv_namespaces]]
binding = "SESSIONS"
id = "staging-kv-id"

[env.staging]
vars = { ENVIRONMENT = "staging" }
```

Deploy to staging:
```bash
npx wrangler deploy --config wrangler.staging.toml
```

**Frontend:**

```bash
# Staging build
NEXT_PUBLIC_API_URL=https://staging-worker.workers.dev npm run build
npx wrangler pages deploy out --project-name cyberbros-lab-staging
```

### When to Use Each Environment

- **Local**: Daily development, quick iterations
- **Staging**: PR testing, integration testing, stakeholder demos
- **Production**: Validated releases only

## Release Process

### Version Numbering (Semantic Versioning)

Format: `MAJOR.MINOR.PATCH`

- `MAJOR`: Breaking changes (e.g., 2.0.0)
- `MINOR`: New features, backward compatible (e.g., 1.1.0)
- `PATCH`: Bug fixes (e.g., 1.0.1)

### Release Workflow

#### 1. Prepare Release

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Update version in package.json
cd workers
npm version minor  # or major, patch

cd ../frontend
npm version minor

# Commit version bumps
git add .
git commit -m "chore: bump version to 1.1.0"
```

#### 2. Create Release Tag

```bash
# Create annotated tag
git tag -a v1.1.0 -m "Release version 1.1.0

Features:
- Add RDP support
- Improve VM cleanup
- Update UI for challenge cards

Bug fixes:
- Fix CORS issue
- Resolve JWT expiration bug"

# Push tag
git push origin v1.1.0
```

#### 3. Deploy Release

```bash
# Deploy backend
cd workers
npx wrangler deploy

# Deploy frontend
cd ../frontend
NEXT_PUBLIC_API_URL=https://your-worker.workers.dev npm run build
npx wrangler pages deploy out --project-name cyberbros-lab-frontend
```

#### 4. Create GitHub Release

On GitHub:
1. Go to Releases → Draft new release
2. Select tag `v1.1.0`
3. Release title: `v1.1.0 - RDP Support & Improvements`
4. Description: Copy from tag message
5. Publish release

### Release Schedule

**For Solo Developer:**
- Release when features are complete
- Aim for 1-2 releases per month
- Hotfixes as needed

**For Small Team:**
- Weekly releases (e.g., every Friday)
- Hotfixes within 24 hours of critical bugs

## Code Review Guidelines

### For Author (Before Requesting Review)

- [ ] Self-review the diff
- [ ] All tests pass locally
- [ ] No debugging code left (console.logs)
- [ ] Code is commented where needed
- [ ] PR description is clear
- [ ] Screenshots for UI changes

### For Reviewer

**Check:**
- Code quality and readability
- Proper error handling
- Security considerations
- Performance implications
- TypeScript types correct
- No hardcoded values

**Review Time:**
- Small PRs (< 100 lines): Within 4 hours
- Medium PRs (100-500 lines): Within 24 hours
- Large PRs (> 500 lines): Break it down!

**Approval:**
- ✅ Approve if all checks pass
- 💬 Comment if clarification needed
- ❌ Request changes if issues found

## Project Maintenance

### Weekly Tasks (Solo Developer)

```bash
# Monday: Plan week
# Review open issues
# Create tasks in GitHub Projects

# Friday: Release & cleanup
# Merge approved PRs
# Deploy to production
# Update documentation
# Close completed issues
```

### Monthly Tasks

```bash
# Update dependencies
cd workers && npm update
cd frontend && npm update

# Review Cloudflare usage
# Check Worker analytics
# Review D1 database size

# Security audit
npm audit
npm audit fix

# Documentation review
# Update any outdated docs
```

### Quarterly Tasks

- Review and update architecture
- Performance optimization
- Security review
- Dependency major version updates
- User feedback integration

## Automation (GitHub Actions)

Create `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy to Staging

on:
  pull_request:
    branches: [ main ]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./workers
        run: npm ci
      
      - name: Deploy to Staging
        working-directory: ./workers
        run: npx wrangler deploy --config wrangler.staging.toml
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Documentation Standards

### Keep Updated

- `README.md`: Project overview, quick start
- `docs/api.md`: API endpoints
- `docs/architecture.md`: System design
- `docs/deployment.md`: Deployment procedures
- `docs/development-workflow.md`: This file
- `CHANGELOG.md`: Version history

### Documentation Rules

1. **Update docs with code changes**
2. **Use clear examples**
3. **Include troubleshooting sections**
4. **Add diagrams for complex flows**
5. **Keep it concise**

## Best Practices Summary

### Do's ✅
- Commit frequently with clear messages
- Test locally before pushing
- Keep PRs small and focused
- Document complex logic
- Use TypeScript types strictly
- Handle errors gracefully
- Review your own code first
- Update documentation

### Don'ts ❌
- Don't commit secrets
- Don't push directly to main
- Don't leave TODO comments without issues
- Don't merge untested code
- Don't skip code review
- Don't ignore TypeScript errors
- Don't use `any` type without reason
- Don't hardcode configuration

## Quick Reference

### Daily Commands

```bash
# Start development
cd workers && npm run dev
cd frontend && npm run dev

# Check status
git status

# Commit work
git add .
git commit -m "feat: description"
git push

# View logs
npx wrangler tail
```

### Weekly Commands

```bash
# Update dependencies
npm update

# Check for issues
npm audit

# Deploy production
npx wrangler deploy
```

### Emergency Commands

```bash
# Rollback Worker
git log --oneline
git checkout <previous-commit>
cd workers && npx wrangler deploy
git checkout main

# View production logs
npx wrangler tail --status error

# Check database
npx wrangler d1 execute cyberbros_db --remote --command="SELECT COUNT(*) FROM vm_instances WHERE status='running'"
```

## Support & Communication

**For Solo Developer:**
- Keep personal notes in `docs/notes.md` (git ignored)
- Document decisions in commit messages
- Use GitHub Issues as task tracker

**For Small Team:**
- Daily standups (15 min, async in chat)
- Weekly planning meeting (30 min)
- Use GitHub Discussions for questions
- Document decisions in GitHub wiki
- Emergency contact list in team chat

## Conclusion

This workflow scales from solo to small team (5 people). Adjust as needed:
- **Smaller scope**: Skip staging environment
- **Larger team**: Add more formal code review
- **More features**: Add automated testing

**Remember**: The best workflow is one that your team actually follows. Start simple, iterate based on what works.
