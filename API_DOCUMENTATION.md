# CyberBros Lab API Documentation

Base URL: `http://localhost:3000/api`

## Authentication

Most endpoints require authentication via JWT token.

**Authentication Header:**
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Health Check

#### GET /health
Check if the server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Authentication Endpoints

### POST /api/auth/signup

Create a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Validation:**
- `username`: 3-30 characters, required
- `email`: Valid email format, required
- `password`: Minimum 6 characters, required

**Success Response (201):**
```json
{
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

**Error Response (400):**
```json
{
  "error": "User already exists with this email or username"
}
```

---

### POST /api/auth/login

Login to an existing account.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

**Error Response (401):**
```json
{
  "error": "Invalid email or password"
}
```

---

## Challenge Endpoints

### GET /api/challenges

List all available challenges.

**Authentication:** Required

**Query Parameters:**
- `difficulty` (optional): Filter by difficulty (`beginner`, `intermediate`, `advanced`, `expert`)
- `category` (optional): Filter by category (e.g., `Web Security`, `Binary Exploitation`)

**Example Request:**
```
GET /api/challenges?difficulty=beginner&category=Web%20Security
```

**Success Response (200):**
```json
{
  "challenges": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "SQL Injection 101",
      "description": "Learn the basics of SQL injection...",
      "difficulty": "beginner",
      "category": "Web Security",
      "points": 100,
      "vmConfig": {
        "imageId": "ubuntu-20.04",
        "serverType": "cx11",
        "location": "nbg1"
      },
      "hints": [
        "Try using OR 1=1 in the username field",
        "Look for authentication bypass techniques"
      ],
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

**Note:** The `flags` field is excluded from responses for security.

---

### GET /api/challenges/:id

Get details of a specific challenge.

**Authentication:** Required

**URL Parameters:**
- `id`: Challenge ID

**Example Request:**
```
GET /api/challenges/507f1f77bcf86cd799439011
```

**Success Response (200):**
```json
{
  "challenge": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "SQL Injection 101",
    "description": "Learn the basics of SQL injection...",
    "difficulty": "beginner",
    "category": "Web Security",
    "points": 100,
    "vmConfig": {
      "imageId": "ubuntu-20.04",
      "serverType": "cx11",
      "location": "nbg1"
    },
    "hints": [
      "Try using OR 1=1 in the username field"
    ],
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "error": "Challenge not found"
}
```

---

### POST /api/challenges

Create a new challenge (admin endpoint).

**Authentication:** Required

**Request Body:**
```json
{
  "title": "New Challenge",
  "description": "Challenge description",
  "difficulty": "intermediate",
  "category": "Network Security",
  "points": 200,
  "vmConfig": {
    "imageId": "ubuntu-20.04",
    "serverType": "cx11",
    "location": "nbg1"
  },
  "flags": ["FLAG{secret_flag}"],
  "hints": ["Hint 1", "Hint 2"]
}
```

**Success Response (201):**
```json
{
  "challenge": {
    "_id": "507f1f77bcf86cd799439012",
    "title": "New Challenge",
    ...
  }
}
```

---

## VM Management Endpoints

### POST /api/vm/start/:challengeId

Start a VM for a specific challenge.

**Authentication:** Required

**URL Parameters:**
- `challengeId`: Challenge ID

**Example Request:**
```
POST /api/vm/start/507f1f77bcf86cd799439011
```

**Success Response (200):**
```json
{
  "message": "VM created successfully",
  "session": {
    "id": "507f1f77bcf86cd799439020",
    "ipAddress": "95.217.123.45",
    "username": "root",
    "password": "Xy9Kp2mN4sQ1",
    "expiresAt": "2024-01-15T12:30:00.000Z",
    "status": "running"
  }
}
```

**Notes:**
- If user already has an active VM for this challenge, returns existing session
- VM automatically expires after 2 hours (configurable)
- Password is randomly generated

**Error Response (500):**
```json
{
  "error": "Failed to start challenge"
}
```

---

### DELETE /api/vm/stop/:sessionId

Stop and delete a VM session.

**Authentication:** Required

**URL Parameters:**
- `sessionId`: VM Session ID

**Example Request:**
```
DELETE /api/vm/stop/507f1f77bcf86cd799439020
```

**Success Response (200):**
```json
{
  "message": "VM stopped and deleted successfully"
}
```

**Error Response (404):**
```json
{
  "error": "VM session not found"
}
```

---

### GET /api/vm/sessions

Get all active VM sessions for the authenticated user.

**Authentication:** Required

**Example Request:**
```
GET /api/vm/sessions
```

**Success Response (200):**
```json
{
  "sessions": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "userId": "507f1f77bcf86cd799439011",
      "challengeId": {
        "_id": "507f1f77bcf86cd799439015",
        "title": "SQL Injection 101",
        "difficulty": "beginner",
        "category": "Web Security"
      },
      "vmId": "12345678",
      "provider": "hetzner",
      "ipAddress": "95.217.123.45",
      "username": "root",
      "password": "Xy9Kp2mN4sQ1",
      "status": "running",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "expiresAt": "2024-01-15T12:30:00.000Z"
    }
  ]
}
```

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 404 | Not Found |
| 500 | Internal Server Error |

## Error Response Format

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

## Rate Limiting

Currently not implemented, but recommended for production:
- 100 requests per 15 minutes per IP for auth endpoints
- 1000 requests per hour for authenticated endpoints
- 10 VM creations per hour per user

## Authentication Flow

1. **Sign Up / Login**: POST to `/api/auth/signup` or `/api/auth/login`
2. **Receive Token**: Extract `token` from response
3. **Store Token**: Save in localStorage or secure cookie
4. **Use Token**: Include in `Authorization: Bearer <token>` header for all subsequent requests
5. **Token Expiry**: Tokens expire after 7 days, user must login again

## Example Usage

### Using cURL

**Signup:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Get Challenges:**
```bash
curl http://localhost:3000/api/challenges \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Start Challenge:**
```bash
curl -X POST http://localhost:3000/api/vm/start/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Using JavaScript (Fetch API)

```javascript
// Login
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  })
});
const { token } = await response.json();

// Get challenges
const challengesResponse = await fetch('http://localhost:3000/api/challenges', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { challenges } = await challengesResponse.json();

// Start challenge
const vmResponse = await fetch(`http://localhost:3000/api/vm/start/${challengeId}`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
const { session } = await vmResponse.json();
console.log(`SSH: ssh ${session.username}@${session.ipAddress}`);
```

## WebSocket Support

Currently not implemented. Future versions may include:
- Real-time VM status updates
- Challenge progress notifications
- Live collaboration features

## Versioning

Current API version: v1 (implicit)

Future versions will use URL versioning:
- v1: `/api/v1/...`
- v2: `/api/v2/...`

## Support

For API issues or questions:
- Check server logs for detailed error messages
- Verify environment variables are set correctly
- Ensure MongoDB is running and accessible
- Test cloud provider API tokens manually
