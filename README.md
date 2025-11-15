# 🔒 CyberBros Lab - Cybersecurity Training Platform

A comprehensive cybersecurity training platform that provides isolated VM environments for practicing hacking challenges. Built with Node.js, Express, MongoDB, and Astro.js.

## ✨ Features

- **User Authentication**: Secure signup/login with JWT tokens
- **Challenge Management**: Browse and filter challenges by difficulty and category
- **Instant VM Provisioning**: Automatic VM creation via Hetzner or Scaleway APIs
- **SSH Access**: Direct SSH access to isolated challenge environments
- **Auto-Cleanup**: VMs automatically deleted after 2 hours
- **Session Management**: Track and manage active VM sessions
- **Infrastructure as Code**: Terraform configurations and shell scripts included

## 🏗️ Architecture

```
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── models/    # MongoDB models (User, Challenge, VMSession)
│   │   ├── routes/    # API routes
│   │   ├── controllers/
│   │   ├── services/  # VM provisioning services (Hetzner, Scaleway)
│   │   └── middleware/
├── frontend/          # Astro.js frontend
│   └── src/
│       ├── pages/     # Pages (home, login, challenges, etc.)
│       ├── layouts/   # Layout components
│       └── lib/       # API client
└── infrastructure/    # Infrastructure as Code
    ├── terraform/     # Terraform configurations
    └── scripts/       # Provisioning/teardown scripts
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- MongoDB (or use Docker Compose)
- Hetzner Cloud or Scaleway account with API credentials

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/zakizakaria-cybersec/cyberbros-lab.git
cd cyberbros-lab
```

2. **Set up Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run build
```

3. **Set up Frontend**
```bash
cd ../frontend
npm install
cp .env.example .env
# Edit .env with API URL
```

4. **Start MongoDB**
```bash
# Option 1: Local MongoDB
mongod

# Option 2: Docker
docker run -d -p 27017:27017 mongo:7
```

5. **Seed the database with challenges**
```bash
cd backend
npm run seed
```

6. **Run the application**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Access the application at http://localhost:4321

## 🐳 Docker Deployment

```bash
# Create .env file in root directory
cp backend/.env.example .env
# Edit .env with your credentials

# Start all services
docker-compose up -d

# Seed challenges
docker-compose exec backend npm run seed

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📝 Environment Variables

### Backend (.env)
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/cyberbros-lab
JWT_SECRET=your-secret-key-change-this
HETZNER_API_TOKEN=your-hetzner-token
SCALEWAY_API_KEY=your-scaleway-key
SCALEWAY_API_SECRET=your-scaleway-secret
SCALEWAY_ORGANIZATION_ID=your-org-id
VM_AUTO_DELETE_HOURS=2
NODE_ENV=development
```

### Frontend (.env)
```
PUBLIC_API_URL=http://localhost:3000/api
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login to account

### Challenges
- `GET /api/challenges` - List all challenges
- `GET /api/challenges/:id` - Get challenge details
- `POST /api/challenges` - Create challenge (authenticated)

### VM Management
- `POST /api/vm/start/:challengeId` - Start VM for challenge
- `DELETE /api/vm/stop/:sessionId` - Stop and delete VM
- `GET /api/vm/sessions` - Get active sessions

## 🏗️ Infrastructure Management

### Using Terraform

```bash
cd infrastructure/terraform

# Initialize
terraform init

# Configure variables
cp variables.tfvars.example terraform.tfvars
# Edit terraform.tfvars

# Plan deployment
terraform plan

# Deploy
terraform apply

# Destroy
terraform destroy
```

### Using Shell Scripts

```bash
cd infrastructure/scripts

# Provision a VM
export HETZNER_API_TOKEN=your-token
./provision-vm.sh challenge-name cx11 ubuntu-20.04 nbg1

# Teardown a VM
./teardown-vm.sh <server_id>

# Cleanup expired VMs (older than 2 hours)
./cleanup-expired.sh 2
```

## 📊 Database Models

### User
- username, email, password (hashed)
- createdAt

### Challenge
- title, description, difficulty, category
- points, vmConfig (imageId, serverType, location)
- flags, hints, timestamps

### VMSession
- userId, challengeId, vmId
- provider (hetzner/scaleway)
- ipAddress, username, password
- status, createdAt, expiresAt

## 🛡️ Security Features

- Passwords hashed with bcrypt
- JWT-based authentication
- Auto-expiring VM sessions (2 hours)
- Isolated VM environments
- API rate limiting ready
- Secure credential handling

## 🎯 Challenge Categories

- Web Security (SQL Injection, XSS, etc.)
- Binary Exploitation
- Cryptography
- System Security
- Network Security

## 📈 Future Enhancements

- [ ] User progress tracking
- [ ] Leaderboard system
- [ ] Team competitions
- [ ] More cloud provider integrations (AWS, Azure, GCP)
- [ ] Challenge submission system
- [ ] Real-time collaboration features
- [ ] VPN access to VMs
- [ ] Custom VM templates
- [ ] Detailed analytics dashboard

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

Created by the CyberBros team for the cybersecurity community.

## 🙏 Acknowledgments

- Hetzner Cloud for VM infrastructure
- Scaleway for additional VM options
- MongoDB for database
- Astro.js for the frontend framework