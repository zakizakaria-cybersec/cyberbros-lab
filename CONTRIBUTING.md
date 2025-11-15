# Contributing to CyberBros Lab

Thank you for considering contributing to CyberBros Lab! This document provides guidelines for contributing to the project.

## How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**
4. **Test thoroughly**
5. **Commit your changes**: `git commit -m "Add your feature"`
6. **Push to your branch**: `git push origin feature/your-feature-name`
7. **Create a Pull Request**

## Development Setup

See the README.md for detailed setup instructions.

## Code Style

### Python (Backend)
- Follow PEP 8 style guide
- Use type hints
- Write docstrings for functions and classes
- Keep functions small and focused

### TypeScript (Frontend)
- Use TypeScript strict mode
- Follow React best practices
- Use functional components with hooks
- Keep components small and reusable

## Testing

- Add tests for new features
- Ensure all existing tests pass
- Test manually with the mock provider
- Document test scenarios

## Pull Request Guidelines

1. **Description**: Clearly describe what your PR does
2. **Testing**: Explain how you tested your changes
3. **Screenshots**: Include screenshots for UI changes
4. **Documentation**: Update docs if needed
5. **Breaking Changes**: Clearly mark any breaking changes

## Adding a New Cloud Provider

To add support for a new cloud provider:

1. Create a new file in `backend/src/cloud_providers/`
2. Implement the `CloudProvider` abstract class
3. Implement all required methods:
   - `create_vm_from_snapshot()`
   - `destroy_vm()`
   - `get_vm_status()`
4. Add provider to factory in `__init__.py`
5. Add documentation
6. Add tests

Example:
```python
from .base import CloudProvider, VMInfo

class MyCloudProvider(CloudProvider):
    def __init__(self, api_token: str):
        self.api_token = api_token
    
    def create_vm_from_snapshot(self, snapshot_id, name, expires_at, cpu_count, memory_gb):
        # Implementation
        pass
    
    def destroy_vm(self, instance_id):
        # Implementation
        pass
    
    def get_vm_status(self, instance_id):
        # Implementation
        pass
```

## Adding a New Challenge

To add a new challenge:

1. Create a VM/image with the challenge environment
2. Create a snapshot in your cloud provider
3. Note the snapshot ID
4. Add to database via migration or admin interface
5. Test the challenge

## Reporting Issues

When reporting issues:
- Use a clear, descriptive title
- Describe steps to reproduce
- Include error messages and logs
- Specify your environment (OS, Python version, etc.)

## Security

If you discover a security vulnerability:
- **DO NOT** create a public issue
- Email the maintainer directly
- Provide details and steps to reproduce
- Wait for a fix before disclosing

## Questions?

Feel free to:
- Open an issue for questions
- Start a discussion
- Contact the maintainers

Thank you for contributing! 🎉
