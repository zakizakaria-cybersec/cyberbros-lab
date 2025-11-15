# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in CyberBros Lab, please report it by emailing the maintainers or creating a private security advisory on GitHub.

**Please do NOT open public issues for security vulnerabilities.**

## Security Best Practices

### For Deployment

1. **Environment Variables**
   - Never commit `.env` files to version control
   - Use strong, randomly generated secrets for `JWT_SECRET`
   - Rotate API tokens regularly
   - Use different credentials for development and production

2. **Database Security**
   - Use strong MongoDB authentication
   - Enable MongoDB access control
   - Restrict MongoDB network access
   - Regular backups of the database
   - Encrypt data at rest

3. **API Security**
   - Implement rate limiting (e.g., using `express-rate-limit`)
   - Enable CORS only for trusted origins
   - Use HTTPS in production (TLS/SSL)
   - Implement request validation and sanitization
   - Add API request logging

4. **VM Management**
   - Use separate cloud accounts for different environments
   - Implement user quotas (max VMs per user)
   - Monitor cloud costs and usage
   - Set up billing alerts
   - Regular cleanup of orphaned resources

5. **Authentication**
   - Passwords are hashed using bcrypt (implemented)
   - JWT tokens expire after 7 days (configured)
   - Consider implementing refresh tokens
   - Add password strength requirements
   - Implement account lockout after failed attempts

### Code Security

1. **Dependencies**
   - Regularly update npm packages: `npm audit`
   - Use `npm audit fix` to resolve vulnerabilities
   - Review security advisories
   - Pin critical dependency versions

2. **Input Validation**
   - Always validate user input
   - Sanitize data before database operations
   - Use Mongoose schema validation (implemented)
   - Validate JWT tokens properly (implemented)

3. **Secrets Management**
   - Never hardcode secrets in source code
   - Use environment variables (implemented)
   - Consider using secret management tools (AWS Secrets Manager, HashiCorp Vault)
   - Rotate secrets regularly

### Infrastructure Security

1. **VM Isolation**
   - Each challenge VM is isolated
   - VMs auto-expire after 2 hours (implemented)
   - Use firewalls to restrict VM network access
   - Consider using VPNs for VM access

2. **Cloud Provider Security**
   - Use read-only API tokens where possible
   - Enable two-factor authentication
   - Set up cloud provider security alerts
   - Regular security audits
   - Use separate accounts for staging/production

3. **Docker Security**
   - Use official base images
   - Run containers as non-root users
   - Keep images updated
   - Scan images for vulnerabilities
   - Use Docker secrets for sensitive data

## Known Security Considerations

1. **VM Credentials in API Responses**
   - VM passwords are transmitted in API responses
   - Consider encrypting credentials in transit
   - Use HTTPS in production (required)

2. **Challenge Flags**
   - Flags are excluded from API responses (implemented)
   - Store flags securely in database
   - Consider implementing flag validation endpoints

3. **Session Management**
   - JWT tokens are stored in localStorage
   - Consider using httpOnly cookies instead
   - Implement token refresh mechanism
   - Add session invalidation

4. **Rate Limiting**
   - Currently not implemented
   - Recommended: 100 requests/15 min for auth
   - Recommended: 10 VM creations/hour per user
   - Use middleware like `express-rate-limit`

## Recommended Improvements

### High Priority

1. **Implement Rate Limiting**
   ```javascript
   import rateLimit from 'express-rate-limit';
   
   const apiLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 100
   });
   
   app.use('/api/', apiLimiter);
   ```

2. **Add Request Validation**
   ```javascript
   import { body, validationResult } from 'express-validator';
   
   app.post('/api/auth/signup',
     body('email').isEmail(),
     body('password').isLength({ min: 8 }),
     (req, res) => {
       const errors = validationResult(req);
       if (!errors.isEmpty()) {
         return res.status(400).json({ errors: errors.array() });
       }
       // ...
     }
   );
   ```

3. **Enable HTTPS**
   - Use Let's Encrypt for SSL certificates
   - Configure Nginx/Apache with SSL
   - Redirect HTTP to HTTPS

4. **Implement CSRF Protection**
   ```javascript
   import csrf from 'csurf';
   app.use(csrf({ cookie: true }));
   ```

### Medium Priority

1. **Add Logging and Monitoring**
   - Use Winston or Bunyan for logging
   - Log security events (failed logins, etc.)
   - Set up monitoring alerts
   - Implement audit trails

2. **Implement User Quotas**
   - Limit concurrent VMs per user
   - Limit VM creations per time period
   - Track user resource usage

3. **Add Account Security Features**
   - Email verification
   - Password reset functionality
   - Account lockout after failed attempts
   - Two-factor authentication

### Low Priority

1. **Security Headers**
   ```javascript
   import helmet from 'helmet';
   app.use(helmet());
   ```

2. **Database Query Optimization**
   - Add indexes for frequently queried fields
   - Use projection to limit returned data
   - Implement pagination

3. **API Versioning**
   - Version API endpoints (/api/v1/...)
   - Maintain backward compatibility
   - Document breaking changes

## Security Checklist for Production

- [ ] Change default JWT_SECRET
- [ ] Enable MongoDB authentication
- [ ] Implement rate limiting
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS properly
- [ ] Set up cloud provider security
- [ ] Implement request validation
- [ ] Enable security logging
- [ ] Set up monitoring and alerts
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Implement backups
- [ ] Test disaster recovery
- [ ] Document security procedures
- [ ] Train team on security practices

## Compliance

For production use, consider compliance with:
- GDPR (if serving EU users)
- CCPA (if serving California users)
- SOC 2 (for enterprise customers)
- ISO 27001 (information security management)

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)

## Contact

For security concerns, contact the maintainers at:
- Create a private security advisory on GitHub
- Email: security@cyberbroslab.com (if available)

Last Updated: 2024-11-15
