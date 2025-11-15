# API Documentation

Base URL: `http://localhost:8000`

## Authentication

Most endpoints require authentication via JWT bearer token.

Include token in Authorization header:
```
Authorization: Bearer <your-token>
```

## Endpoints

### Authentication

#### POST /api/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "user@example.com",
  "created_at": "2024-01-15T10:30:00"
}
```

**Errors:**
- `400`: Email already registered

---

#### POST /api/login
Login and receive access token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Errors:**
- `401`: Incorrect email or password

---

#### GET /api/me
Get current user information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "user@example.com",
  "created_at": "2024-01-15T10:30:00"
}
```

---

### Challenges

#### GET /api/challenges
Get all available challenges.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Web Exploitation 101",
    "description": "Learn the basics of web application security...",
    "difficulty": "easy",
    "cpu_count": 2,
    "memory_gb": 4
  },
  {
    "id": 2,
    "name": "Linux Privilege Escalation",
    "description": "Practice privilege escalation techniques...",
    "difficulty": "medium",
    "cpu_count": 2,
    "memory_gb": 4
  }
]
```

---

### VM Management

#### POST /api/challenge/start
Start a challenge and provision a VM.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "challenge_id": 1
}
```

**Response:** `200 OK`
```json
{
  "id": 10,
  "challenge_id": 1,
  "instance_id": "mock-vm-1",
  "public_ip": "192.168.1.100",
  "ssh_username": "root",
  "ssh_password": "randompass123",
  "status": "running",
  "created_at": "2024-01-15T10:30:00",
  "expires_at": "2024-01-15T12:30:00",
  "time_remaining_seconds": 7200
}
```

**Errors:**
- `404`: Challenge not found
- `500`: Failed to provision VM

**Notes:**
- If user already has a running VM for this challenge, returns existing VM
- VM automatically expires after 2 hours

---

#### GET /api/challenge/status
Get status of running VM for a challenge.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `challenge_id` (required): Challenge ID

**Example:**
```
GET /api/challenge/status?challenge_id=1
```

**Response:** `200 OK`
```json
{
  "id": 10,
  "challenge_id": 1,
  "instance_id": "mock-vm-1",
  "public_ip": "192.168.1.100",
  "ssh_username": "root",
  "ssh_password": "randompass123",
  "status": "running",
  "created_at": "2024-01-15T10:30:00",
  "expires_at": "2024-01-15T12:30:00",
  "time_remaining_seconds": 5400
}
```

**Errors:**
- `404`: No active VM found for this challenge

---

### Health Check

#### GET /health
Check API health status.

**Response:** `200 OK`
```json
{
  "status": "healthy"
}
```

---

#### GET /
Root endpoint.

**Response:** `200 OK`
```json
{
  "message": "CyberBros Lab API",
  "version": "1.0.0",
  "docs": "/docs"
}
```

---

## Interactive Documentation

FastAPI provides automatic interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Error message description"
}
```

Common HTTP status codes:
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

Currently not implemented. Consider adding rate limiting in production to prevent abuse.

## Pagination

Currently not implemented. All list endpoints return all items. Consider adding pagination for production use.
