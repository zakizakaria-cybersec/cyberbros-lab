# Quick Reference Guide

## 🚀 Common Commands

### Local Development

```bash
# Start backend (Cloudflare Workers)
cd workers
npm run dev                    # Local: http://localhost:8787

# Start frontend (Next.js)
cd frontend
npm run dev                    # Local: http://localhost:3000

# Network access (for Raspberry Pi)
npm run dev -- -H 0.0.0.0 -p 3001
```

### Database Operations

```bash
# Local database
npx wrangler d1 execute cyberbros_db --local --command="SELECT * FROM challenges"

# Production database
npx wrangler d1 execute cyberbros_db --remote --command="SELECT * FROM challenges"

# Apply schema
npx wrangler d1 execute cyberbros_db --remote --file=./schema.sql

# Check VM instances
npx wrangler d1 execute cyberbros_db --remote --command="SELECT * FROM vm_instances"
```

### Deployment

```bash
# Deploy backend
cd workers
npx wrangler deploy

# Deploy frontend
cd frontend
NEXT_PUBLIC_API_URL=https://your-worker.workers.dev npm run build
npx wrangler pages deploy out --project-name cyberbros-lab-frontend
```

### Secrets Management

```bash
# Set secrets
echo "your-secret-value" | npx wrangler secret put SECRET_NAME

# List secrets (names only)
npx wrangler secret list

# Common secrets
echo "your-jwt-secret" | npx wrangler secret put JWT_SECRET
echo "your-hetzner-token" | npx wrangler secret put HETZNER_API_TOKEN
```

### Monitoring

```bash
# Real-time logs
npx wrangler tail

# Error logs only
npx wrangler tail --status error

# Filter by method
npx wrangler tail --method POST
```

### Git Workflow

```bash
# Start new feature
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# Commit changes
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name

# After PR merge, cleanup
git checkout main
git pull origin main
git branch -d feature/your-feature-name
```

### Version Management

```bash
# Bump version
cd workers
npm version minor    # 1.0.0 -> 1.1.0
npm version patch    # 1.0.0 -> 1.0.1
npm version major    # 1.0.0 -> 2.0.0

# Create release tag
git tag -a v1.1.0 -m "Release version 1.1.0"
git push origin v1.1.0
```

### Troubleshooting

```bash
# Fix permissions (Raspberry Pi)
sudo chown -R $USER:$USER frontend/.next frontend/out

# Clean build
rm -rf .next out node_modules
npm install
npm run build

# Check Wrangler version
npx wrangler --version

# Re-authenticate
npx wrangler login

# View deployments
npx wrangler deployments list
```

## 📋 Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(vm): add RDP support` |
| `fix` | Bug fix | `fix(auth): resolve JWT expiration` |
| `docs` | Documentation | `docs: update deployment guide` |
| `style` | Code formatting | `style: fix indentation` |
| `refactor` | Code restructure | `refactor: simplify auth logic` |
| `test` | Add tests | `test: add VM service tests` |
| `chore` | Maintenance | `chore: update dependencies` |

## 🏷️ Branch Naming

| Type | Format | Example |
|------|--------|---------|
| Feature | `feature/description` | `feature/hetzner-integration` |
| Bug Fix | `bugfix/description` | `bugfix/cors-headers` |
| Hotfix | `hotfix/description` | `hotfix/security-jwt` |
| Chore | `chore/description` | `chore/update-deps` |

## 🔍 Useful Queries

### Database Queries

```sql
-- Count challenges
SELECT COUNT(*) FROM challenges;

-- List active VMs
SELECT * FROM vm_instances WHERE status='running';

-- Find VMs by user
SELECT * FROM vm_instances WHERE user_id=1;

-- Get expired VMs
SELECT * FROM vm_instances WHERE expires_at < datetime('now');

-- Count VMs by status
SELECT status, COUNT(*) as count FROM vm_instances GROUP BY status;
```

### API Endpoints

```bash
# Health check
curl https://your-worker.workers.dev/

# Get challenges
curl https://your-worker.workers.dev/challenges

# Register user
curl -X POST https://your-worker.workers.dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST https://your-worker.workers.dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get current user (with token)
curl https://your-worker.workers.dev/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Provision VM (with token)
curl -X POST https://your-worker.workers.dev/vms/provision/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Check VM status (with token)
curl https://your-worker.workers.dev/vms/status/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔧 Environment Variables

### Workers (`wrangler.toml`)
```toml
[vars]
ENVIRONMENT = "production"
VM_TIMEOUT_HOURS = "2"
```

### Frontend (`.env.local`)
```bash
# Development
NEXT_PUBLIC_API_URL=http://localhost:8787

# Production (build time)
NEXT_PUBLIC_API_URL=https://your-worker.workers.dev
```

## 📊 Project Structure

```
cyberbros-lab/
├── workers/                 # Cloudflare Workers backend
│   ├── src/
│   │   ├── index.ts        # Main entry point
│   │   ├── types.ts        # TypeScript interfaces
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   └── utils/          # Helper functions
│   ├── wrangler.toml       # Worker configuration
│   ├── schema.sql          # Database schema
│   └── package.json
│
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── pages/          # Next.js pages
│   │   ├── components/     # React components
│   │   ├── lib/            # API client & utilities
│   │   └── styles/         # CSS files
│   ├── next.config.js      # Next.js configuration
│   └── package.json
│
├── docs/                   # Documentation
│   ├── cloudflare-deployment.md
│   ├── development-workflow.md
│   ├── quickstart.md
│   ├── api.md
│   └── architecture.md
│
└── README.md               # Project overview
```

## ⚡ Performance Tips

### Backend
- Workers run in 300+ locations worldwide
- Cold start < 50ms
- Use D1 prepared statements for repeated queries
- Cache frequently accessed data in KV

### Frontend
- Static export for fastest loading
- Images optimized automatically by Cloudflare
- CDN caching at edge locations
- No Node.js server needed

## 🛡️ Security Checklist

- [ ] JWT_SECRET is strong and secret
- [ ] HETZNER_API_TOKEN is not committed
- [ ] CORS configured correctly
- [ ] Input validation on all endpoints
- [ ] Password minimum 8 characters
- [ ] SQL injection prevented (D1 prepared statements)
- [ ] Rate limiting considered
- [ ] HTTPS enforced automatically

## 📈 Monitoring Metrics

### Key Metrics to Watch
- **Request Success Rate**: Should be > 99%
- **Response Time**: Average < 100ms
- **Error Rate**: Should be < 1%
- **VM Provisioning Time**: < 60 seconds
- **Database Query Time**: < 10ms average

### Cloudflare Dashboard
1. Workers & Pages → Your Worker
2. View:
   - Requests per second
   - Errors
   - CPU time
   - Memory usage
3. Set up alerts for anomalies

## 🆘 Emergency Procedures

### Worker is Down
```bash
# Check recent deployments
npx wrangler deployments list

# View logs
npx wrangler tail --status error

# Rollback
git log --oneline
git checkout <previous-working-commit>
cd workers && npx wrangler deploy
git checkout main
```

### Database Corrupted
```bash
# Backup current state
npx wrangler d1 export cyberbros_db > backup.sql

# Re-apply clean schema
npx wrangler d1 execute cyberbros_db --remote --file=./schema.sql
```

### High Error Rate
```bash
# Check error logs
npx wrangler tail --status error

# Check database
npx wrangler d1 execute cyberbros_db --remote --command="SELECT COUNT(*) FROM challenges"

# Verify secrets set
npx wrangler secret list
```

### Frontend Build Failed
```bash
# Clean and rebuild
cd frontend
rm -rf .next out node_modules
npm install
NEXT_PUBLIC_API_URL=https://your-worker.workers.dev npm run build
```

## 📞 Support Contacts

- **Cloudflare Status**: https://www.cloudflarestatus.com/
- **Cloudflare Docs**: https://developers.cloudflare.com/
- **Hetzner Status**: https://status.hetzner.com/
- **Next.js Docs**: https://nextjs.org/docs

## 💡 Tips for Solo Developers

1. **Commit Often**: Small commits are easier to review and rollback
2. **Document Decisions**: Future you will thank present you
3. **Test Locally First**: Don't debug in production
4. **Use GitHub Issues**: Track your TODOs
5. **Set Up Alerts**: Know when things break
6. **Backup Database**: Regular exports
7. **Monitor Costs**: Check Cloudflare usage monthly
8. **Keep It Simple**: Don't over-engineer

## 📚 Learning Resources

- [Cloudflare Workers Tutorial](https://developers.cloudflare.com/workers/get-started/guide/)
- [D1 Database Guide](https://developers.cloudflare.com/d1/get-started/)
- [Next.js Learn](https://nextjs.org/learn)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Git Branching Model](https://nvie.com/posts/a-successful-git-branching-model/)

## 🎯 Success Metrics

### Week 1
- [ ] Local development working
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] Basic auth working

### Month 1
- [ ] 5+ challenges added
- [ ] VM provisioning tested
- [ ] Documentation complete
- [ ] Monitoring set up

### Month 3
- [ ] 10+ active users
- [ ] < 1% error rate
- [ ] Custom domain configured
- [ ] Automated deployments

---

**Remember**: This is a living document. Update it as your workflow evolves!
