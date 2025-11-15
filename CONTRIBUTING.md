# Contributing to CyberBros Lab

Thank you for your interest in contributing to CyberBros Lab! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. Create a new issue with a clear title and description
3. Include steps to reproduce the bug
4. Provide system information (OS, Node version, etc.)
5. Add relevant logs or screenshots

**Bug Report Template:**
```markdown
**Description:**
Clear description of the bug

**Steps to Reproduce:**
1. Step one
2. Step two
3. ...

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Environment:**
- OS: [e.g., Ubuntu 20.04]
- Node.js: [e.g., v20.0.0]
- Browser: [e.g., Chrome 120]
```

### Suggesting Features

1. Check existing feature requests
2. Create a new issue with the "enhancement" label
3. Clearly describe the feature and its benefits
4. Provide use cases and examples

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/cyberbros-lab.git
   cd cyberbros-lab
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the code style guidelines
   - Write clear commit messages
   - Add tests if applicable
   - Update documentation

4. **Test your changes**
   ```bash
   # Backend
   cd backend
   npm run build
   npm run dev
   
   # Frontend
   cd frontend
   npm run build
   npm run dev
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Provide a clear description
   - Reference related issues
   - Add screenshots for UI changes
   - Wait for review

## Development Setup

### Prerequisites

- Node.js 20+
- MongoDB 5+
- Git
- Cloud provider account (Hetzner or Scaleway)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/zakizakaria-cybersec/cyberbros-lab.git
cd cyberbros-lab

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run build

# Frontend setup
cd ../frontend
npm install
cp .env.example .env
npm run build

# Seed database
cd ../backend
npm run seed
```

### Running in Development

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

## Code Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for new code
- Follow ESLint rules (when configured)
- Use async/await over promises
- Add JSDoc comments for functions
- Use meaningful variable names
- Keep functions small and focused

**Example:**
```typescript
/**
 * Creates a new VM session for a challenge
 * @param userId - The ID of the user
 * @param challengeId - The ID of the challenge
 * @returns VM session with connection details
 */
async function createVMSession(
  userId: string,
  challengeId: string
): Promise<VMSession> {
  // Implementation
}
```

### File Naming

- Use camelCase for files: `userController.ts`
- Use PascalCase for components: `Layout.astro`
- Use kebab-case for scripts: `provision-vm.sh`

### Git Commit Messages

Follow conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Examples:**
```
feat: add rate limiting to API endpoints
fix: resolve VM cleanup cron job issue
docs: update API documentation for new endpoints
refactor: extract VM provisioning logic into service
```

## Project Structure

```
cyberbros-lab/
├── backend/               # Express API
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   └── jobs/          # Background jobs
├── frontend/              # Astro.js frontend
│   └── src/
│       ├── pages/         # Page components
│       ├── layouts/       # Layout components
│       └── lib/           # Utilities and API client
└── infrastructure/        # IaC and scripts
    ├── terraform/         # Terraform configs
    └── scripts/           # Shell scripts
```

## Adding New Features

### Adding a New Challenge

1. Edit `backend/src/scripts/seedChallenges.ts`
2. Add challenge object with required fields
3. Run seed script: `npm run seed`

### Adding a New Cloud Provider

1. Create service in `backend/src/services/`
2. Implement interface: `createServer`, `deleteServer`, `getServerStatus`
3. Update `vmService.ts` to support new provider
4. Add provider configuration to `.env.example`

### Adding New API Endpoints

1. Create controller in `backend/src/controllers/`
2. Define routes in `backend/src/routes/`
3. Add authentication middleware if needed
4. Update API documentation
5. Test endpoints

### Adding New Frontend Pages

1. Create page in `frontend/src/pages/`
2. Use existing layout: `Layout.astro`
3. Integrate with API client: `lib/api.ts`
4. Test responsiveness
5. Update navigation if needed

## Testing

### Manual Testing Checklist

- [ ] User can sign up
- [ ] User can login
- [ ] Challenges load correctly
- [ ] Challenge filters work
- [ ] VM provisioning succeeds
- [ ] SSH credentials are displayed
- [ ] Sessions page shows active VMs
- [ ] VM can be stopped manually
- [ ] Auto-cleanup works (after 2 hours)

### API Testing

Use curl or Postman to test endpoints:

```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123"}'

# Get challenges
curl http://localhost:3000/api/challenges \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Documentation

When adding features, update:

- `README.md` - Main documentation
- `API_DOCUMENTATION.md` - API changes
- `SETUP_GUIDE.md` - Setup instructions
- Code comments - Inline documentation

## Review Process

1. **Automated Checks**
   - Build succeeds
   - TypeScript compiles
   - No security vulnerabilities

2. **Code Review**
   - Code quality
   - Follows guidelines
   - Tests pass
   - Documentation updated

3. **Approval**
   - At least one maintainer approval
   - All comments addressed
   - CI/CD passes

## Areas for Contribution

### High Priority

- [ ] Add rate limiting
- [ ] Implement request validation
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Improve error handling
- [ ] Add password reset
- [ ] Email verification

### Medium Priority

- [ ] User dashboard with statistics
- [ ] Leaderboard system
- [ ] Challenge submission system
- [ ] Admin panel
- [ ] Challenge templates
- [ ] Multiple language support

### Low Priority

- [ ] Dark mode
- [ ] Mobile app
- [ ] WebSocket for real-time updates
- [ ] Team competitions
- [ ] Social features
- [ ] Achievement system

## Questions?

- Create an issue with the "question" label
- Check existing documentation
- Review closed issues and PRs

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (ISC License).

Thank you for contributing to CyberBros Lab! 🔒🚀
