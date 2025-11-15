# Deployment Guide

This guide covers deploying CyberBros Lab to production.

## Prerequisites

- Server with Docker and Docker Compose
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)
- Cloud provider account (Hetzner Cloud)
- PostgreSQL database

## Production Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
```

### 2. Clone Repository

```bash
git clone https://github.com/zakizakaria-cybersec/cyberbros-lab.git
cd cyberbros-lab
```

### 3. Configure Environment

```bash
cp .env.example .env
nano .env
```

Update the following critical variables:

```env
# Database
DATABASE_URL=postgresql://user:password@db_host:5432/cyberbros

# JWT Secret (generate a strong secret)
JWT_SECRET=your-very-secure-random-secret-key-here

# Cloud Provider
CLOUD_PROVIDER=hetzner
HETZNER_API_TOKEN=your-hetzner-token

# Application
ENVIRONMENT=production
DEBUG=false
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

### 4. Set Up SSL (with Nginx + Let's Encrypt)

Create `nginx.conf`:

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Add Nginx to `docker-compose.yml`:

```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/conf.d/default.conf
    - ./certbot/conf:/etc/letsencrypt
    - ./certbot/www:/var/www/certbot
  depends_on:
    - frontend
    - backend

certbot:
  image: certbot/certbot
  volumes:
    - ./certbot/conf:/etc/letsencrypt
    - ./certbot/www:/var/www/certbot
  entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

### 5. Initialize Database

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Wait for database to be ready
sleep 10

# Run migrations
docker-compose run --rm backend alembic upgrade head
```

### 6. Build and Start Services

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 7. Set Up Infrastructure

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # Add your Hetzner token

terraform init
terraform plan
terraform apply
```

### 8. Create Challenge Snapshots

1. Create a base server in Hetzner Cloud
2. SSH into the server and set up challenge environment
3. Create a snapshot via Hetzner Console
4. Note the snapshot ID
5. Add challenge to database:

```sql
INSERT INTO challenges (name, description, snapshot_id, difficulty, cpu_count, memory_gb)
VALUES ('My Challenge', 'Description', 'snapshot-id', 'medium', 2, 4);
```

## Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:8000/health

# Check API docs
curl http://localhost:8000/docs
```

### Logs

```bash
# All logs
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### Database Backup

```bash
# Backup
docker-compose exec postgres pg_dump -U postgres cyberbros > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres cyberbros < backup.sql
```

## Scaling

### Horizontal Scaling (Backend)

```yaml
backend:
  deploy:
    replicas: 3
  # ... rest of config
```

### Load Balancer

Use Nginx or cloud load balancer to distribute traffic across backend instances.

### Database Connection Pooling

Update `DATABASE_URL` to use PgBouncer for connection pooling.

## Security Hardening

1. **Firewall**:
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **Secrets Management**:
   - Use environment variables, not hardcoded values
   - Consider using HashiCorp Vault or AWS Secrets Manager

3. **Rate Limiting**:
   - Add rate limiting to Nginx
   - Consider using Cloudflare

4. **Monitoring**:
   - Set up monitoring with Prometheus + Grafana
   - Configure alerts for errors and downtime

5. **Backups**:
   - Automate daily database backups
   - Store backups in separate location

## Troubleshooting

**Service won't start:**
- Check logs: `docker-compose logs service-name`
- Verify environment variables
- Check port conflicts

**Database connection failed:**
- Verify DATABASE_URL
- Check PostgreSQL is running
- Check network connectivity

**VMs not provisioning:**
- Verify Hetzner API token
- Check cloud provider API limits
- Review backend logs

**Frontend can't connect to backend:**
- Verify NEXT_PUBLIC_API_URL
- Check CORS settings
- Verify backend is accessible

## Maintenance

### Update Application

```bash
git pull
docker-compose build
docker-compose up -d
```

### Database Migration

```bash
# Create migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migration
docker-compose exec backend alembic upgrade head
```

### Clean Up Old VMs

The scheduler automatically cleans up expired VMs. To manually clean up:

```bash
# Check for stuck VMs in database
docker-compose exec postgres psql -U postgres -d cyberbros -c "SELECT * FROM vm_instances WHERE status='running' AND expires_at < NOW();"

# Clean up via API (requires admin endpoint)
```

## Performance Optimization

1. **Database Indexing**: Ensure proper indexes on frequently queried columns
2. **Caching**: Add Redis for caching challenge data
3. **CDN**: Use CDN for static assets
4. **Database Connection Pool**: Use PgBouncer
5. **Async Workers**: Use Celery for VM provisioning

## Cost Optimization

1. **VM Cleanup**: Ensure scheduler is running regularly
2. **Instance Types**: Use appropriate Hetzner instance types
3. **Monitoring**: Track VM usage and costs
4. **Quotas**: Implement user quotas to prevent abuse
