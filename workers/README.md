# CyberBros Lab - Cloudflare Workers Backend

This is the Cloudflare Workers implementation of the CyberBros Lab backend, providing a serverless, globally distributed API for the cybersecurity training platform.

## 🚀 Features

- **Edge Computing**: Runs on 300+ Cloudflare data centers worldwide
- **Sub-millisecond Response**: Ultra-fast API responses
- **Auto-scaling**: Handles any traffic load automatically
- **Zero Cold Starts**: Always ready to serve requests
- **Cost-effective**: Pay only for what you use

## 📋 Prerequisites

- Node.js 18+ and npm
- Cloudflare account (free tier works)
- Wrangler CLI installed: `npm install -g wrangler`
- Hetzner Cloud API token

## 🛠️ Setup

### 1. Install Dependencies

```bash
cd workers
npm install
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Create D1 Database

```bash
# Create the database
wrangler d1 create cyberbros_db

# This will output a database ID - copy it to wrangler.toml
# Update the database_id in wrangler.toml with the ID from above

# Initialize the schema
wrangler d1 execute cyberbros_db --file=./schema.sql
```

### 4. Create KV Namespace

```bash
# Create KV namespace for sessions
wrangler kv:namespace create "SESSIONS"

# Copy the ID to wrangler.toml
```

### 5. Set Secrets

```bash
# Set JWT secret
wrangler secret put JWT_SECRET
# Enter a strong random string when prompted

# Set Hetzner API token
wrangler secret put HETZNER_API_TOKEN
# Enter your Hetzner Cloud API token
```

### 6. Update Configuration

Edit `wrangler.toml` and update:
- `database_id` with your D1 database ID
- KV namespace `id` with your KV namespace ID
- `zone_name` and `route` if deploying to production

## 🧪 Development

### Run Locally

```bash
npm run dev
```

This starts the development server at `http://localhost:8787`

### Test API Endpoints

```bash
# Health check
curl http://localhost:8787/health

# Register user
curl -X POST http://localhost:8787/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:8787/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get challenges (requires auth token)
curl http://localhost:8787/api/challenges \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🚀 Deployment

### Deploy to Production

```bash
# Deploy to Cloudflare
npm run deploy

# Deploy to production environment
wrangler deploy --env production
```

### Setup Custom Domain

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your worker
3. Go to Settings → Triggers → Custom Domains
4. Add your domain (e.g., `api.cyberbros-lab.com`)

### Setup Cron Trigger

The VM cleanup job is configured in `wrangler.toml`:
```toml
[triggers]
crons = ["*/5 * * * *"]  # Every 5 minutes
```

To view scheduled runs:
```bash
wrangler tail --format pretty
```

## 📊 Database Management

### Run SQL Queries

```bash
# Execute SQL commands
wrangler d1 execute cyberbros_db --command="SELECT * FROM users"

# Execute from file
wrangler d1 execute cyberbros_db --file=./query.sql
```

### Backup Database

```bash
wrangler d1 backup create cyberbros_db
wrangler d1 backup list cyberbros_db
wrangler d1 backup download cyberbros_db --id=BACKUP_ID
```

## 🔍 Monitoring

### View Logs

```bash
# Tail logs in real-time
wrangler tail

# Tail with pretty formatting
wrangler tail --format pretty

# Filter by status
wrangler tail --status error
```

### Analytics

View analytics in Cloudflare Dashboard:
- Workers & Pages → Your Worker → Analytics
- See requests, errors, CPU time, and more

## 📁 Project Structure

```
workers/
├── src/
│   ├── index.ts              # Main Worker entry point
│   ├── types.ts              # TypeScript interfaces
│   ├── routes/
│   │   ├── auth.ts           # Authentication routes
│   │   ├── challenges.ts     # Challenge routes
│   │   └── vms.ts            # VM management routes
│   ├── services/
│   │   └── hetzner.ts        # Hetzner Cloud integration
│   └── utils/
│       ├── auth.ts           # JWT utilities
│       └── response.ts       # HTTP response helpers
├── schema.sql                # D1 database schema
├── wrangler.toml            # Wrangler configuration
├── package.json
├── tsconfig.json
└── README.md
```

## 🔒 Security

- All passwords are hashed using SHA-256
- JWT tokens for authentication
- CORS configured for frontend access
- Secrets stored securely in Cloudflare
- API tokens never exposed in logs

## 💰 Cost Estimation

Free Tier Limits:
- 100,000 requests/day
- 10ms CPU time per request
- D1: 5GB storage, 5M row reads/day
- KV: 100,000 reads/day

Typical costs for moderate usage:
- Workers: ~$5/month (beyond free tier)
- D1: Free for most apps
- KV: ~$0.50/month
- **Total: ~$5-10/month**

## 🐛 Troubleshooting

### Database Not Found
```bash
# List all databases
wrangler d1 list

# Make sure database_id in wrangler.toml matches
```

### Secret Not Set
```bash
# List secrets
wrangler secret list

# Set missing secret
wrangler secret put SECRET_NAME
```

### Deployment Fails
```bash
# Check syntax
npm run build

# View detailed errors
wrangler deploy --verbose
```

## 📚 Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Hetzner Cloud API](https://docs.hetzner.cloud/)

## 🤝 Contributing

See main repository CONTRIBUTING.md for guidelines.

## 📄 License

MIT License - see LICENSE file in root directory.
