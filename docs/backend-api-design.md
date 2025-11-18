# Backend API Design - CyberBros Lab

## Overview
Comprehensive REST API for the CyberBros Lab challenge platform with role-based access control, automatic provider fallback, and comprehensive logging.

## Architecture

### Key Features
- ✅ Role-based access control (Admin/User)
- ✅ Manual challenge assignment by admins
- ✅ One active VM per user enforcement
- ✅ Automatic provider fallback (Scaleway → Hetzner)
- ✅ Encrypted SSH credential storage
- ✅ One-time credential display
- ✅ Event-based status updates
- ✅ Comprehensive audit logging
- ✅ Challenge-specific VM durations

---

## Authentication

### POST `/api/register`
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "role": "user",
  "is_active": true,
  "created_at": "2025-11-18T10:00:00Z",
  "updated_at": "2025-11-18T10:00:00Z"
}
```

### POST `/api/login`
Authenticate and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user",
    "is_active": true,
    "created_at": "2025-11-18T10:00:00Z",
    "updated_at": "2025-11-18T10:00:00Z"
  }
}
```

### GET `/api/me`
Get current user information.

**Headers:** `Authorization: Bearer <token>`

---

## User Endpoints

### GET `/api/user/challenges`
Get challenges assigned to the current user.

**Auth:** Required (User/Admin)

**Response:**
```json
[
  {
    "id": 1,
    "name": "SQL Injection Basics",
    "description": "Learn SQL injection fundamentals",
    "difficulty": "beginner",
    "duration_hours": 2
  }
]
```

### GET `/api/user/assignments`
Get all assignments for the current user with details.

**Auth:** Required (User/Admin)

**Response:**
```json
[
  {
    "id": 1,
    "user_id": 5,
    "challenge_id": 1,
    "assigned_by": 1,
    "status": "assigned",
    "assigned_at": "2025-11-18T10:00:00Z",
    "user_email": "user@example.com",
    "challenge_name": "SQL Injection Basics",
    "admin_email": "admin@example.com",
    "notes": "Complete within 1 week"
  }
]
```

### POST `/api/user/vm/start`
Start a VM for an assigned challenge.

**Auth:** Required (User/Admin)

**Request:**
```json
{
  "challenge_id": 1
}
```

**Response:**
```json
{
  "id": 10,
  "challenge_id": 1,
  "status": "running",
  "public_ip": "192.168.1.100",
  "ssh_username": "root",
  "created_at": "2025-11-18T10:30:00Z",
  "started_at": "2025-11-18T10:30:15Z",
  "expires_at": "2025-11-18T12:30:00Z",
  "time_remaining_seconds": 7185,
  "provider": "hetzner",
  "credentials_accessed": false
}
```

**Rules:**
- User must have the challenge assigned
- Only one active VM per user
- Automatic fallback from Scaleway to Hetzner on failure
- VM expires after challenge-specific duration

### GET `/api/user/vm/credentials/{instance_id}`
Get SSH credentials (one-time display warning).

**Auth:** Required (User/Admin)

**Response:**
```json
{
  "ssh_username": "root",
  "ssh_password": "SecureRandomPass123",
  "ssh_private_key": null,
  "public_ip": "192.168.1.100",
  "message": "⚠️ These credentials are shown only once. Please save them securely."
}
```

**Note:** System tracks if credentials were accessed via `credentials_accessed` flag.

### GET `/api/user/vm/status/{instance_id}`
Get VM status without sensitive credentials.

**Auth:** Required (User/Admin)

**Response:** Same as `/api/user/vm/start` response.

### GET `/api/user/vm/active`
Get the user's currently active VM if any.

**Auth:** Required (User/Admin)

**Response:** VM status or `null` if no active VM.

### POST `/api/user/vm/reset`
Reset (destroy and recreate) a VM.

**Auth:** Required (User/Admin)

**Request:**
```json
{
  "instance_id": 10
}
```

**Response:** New VM status.

### DELETE `/api/user/vm/{instance_id}`
Destroy a VM.

**Auth:** Required (User/Admin)

**Response:** `204 No Content`

---

## Admin Endpoints - Challenge Management

### POST `/api/admin/challenges`
Create a new challenge.

**Auth:** Required (Admin only)

**Request:**
```json
{
  "name": "Advanced XSS Lab",
  "description": "Master XSS exploitation techniques",
  "snapshot_id": "snapshot-xss-advanced",
  "difficulty": "advanced",
  "cpu_count": 2,
  "memory_gb": 4,
  "duration_hours": 4
}
```

**Response:**
```json
{
  "id": 5,
  "name": "Advanced XSS Lab",
  "description": "Master XSS exploitation techniques",
  "snapshot_id": "snapshot-xss-advanced",
  "difficulty": "advanced",
  "cpu_count": 2,
  "memory_gb": 4,
  "duration_hours": 4,
  "is_active": true,
  "created_at": "2025-11-18T10:00:00Z",
  "updated_at": "2025-11-18T10:00:00Z"
}
```

### GET `/api/admin/challenges`
List all challenges (including inactive).

**Auth:** Required (Admin only)

**Query Parameters:**
- `include_inactive` (boolean, default: true)

### GET `/api/admin/challenges/{challenge_id}`
Get challenge details.

**Auth:** Required (Admin only)

### PUT `/api/admin/challenges/{challenge_id}`
Update a challenge.

**Auth:** Required (Admin only)

**Request:** Partial update (all fields optional)

### DELETE `/api/admin/challenges/{challenge_id}`
Delete a challenge.

**Auth:** Required (Admin only)

**Response:** `204 No Content`

### POST `/api/admin/challenges/{challenge_id}/activate`
Activate a challenge.

**Auth:** Required (Admin only)

### POST `/api/admin/challenges/{challenge_id}/deactivate`
Deactivate a challenge.

**Auth:** Required (Admin only)

---

## Admin Endpoints - Assignment Management

### POST `/api/admin/assignments`
Assign a challenge to a user.

**Auth:** Required (Admin only)

**Request:**
```json
{
  "user_id": 5,
  "challenge_id": 1,
  "notes": "Complete by end of week",
  "expires_at": "2025-11-25T23:59:59Z"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id": 5,
  "challenge_id": 1,
  "assigned_by": 1,
  "status": "assigned",
  "assigned_at": "2025-11-18T10:00:00Z",
  "notes": "Complete by end of week",
  "expires_at": "2025-11-25T23:59:59Z"
}
```

### GET `/api/admin/assignments`
List all assignments with filters.

**Auth:** Required (Admin only)

**Query Parameters:**
- `user_id` (int, optional)
- `challenge_id` (int, optional)
- `status` (string, optional): assigned, in_progress, completed, expired

**Response:** Array of assignments with user/challenge details.

### GET `/api/admin/assignments/{assignment_id}`
Get assignment details.

**Auth:** Required (Admin only)

### PUT `/api/admin/assignments/{assignment_id}`
Update an assignment.

**Auth:** Required (Admin only)

### DELETE `/api/admin/assignments/{assignment_id}`
Delete an assignment.

**Auth:** Required (Admin only)

---

## Admin Endpoints - Monitoring

### GET `/api/admin/monitoring/instances`
List all VM instances with filters.

**Auth:** Required (Admin only)

**Query Parameters:**
- `user_id` (int, optional)
- `challenge_id` (int, optional)
- `status` (string, optional): provisioning, running, expired, destroying, destroyed, failed
- `provider` (string, optional): scaleway, hetzner

**Response:**
```json
[
  {
    "id": 10,
    "user_id": 5,
    "challenge_id": 1,
    "instance_id": "hetzner-12345",
    "provider": "hetzner",
    "public_ip": "192.168.1.100",
    "status": "running",
    "created_at": "2025-11-18T10:30:00Z",
    "started_at": "2025-11-18T10:30:15Z",
    "expires_at": "2025-11-18T12:30:00Z",
    "user_email": "user@example.com",
    "challenge_name": "SQL Injection Basics"
  }
]
```

### GET `/api/admin/monitoring/instances/{instance_id}/logs`
Get provisioning logs for a specific instance.

**Auth:** Required (Admin only)

**Response:**
```json
[
  {
    "id": 1,
    "instance_id": 10,
    "event_type": "provisioning_started",
    "provider": "scaleway",
    "message": "Started provisioning VM for challenge: SQL Injection Basics",
    "created_at": "2025-11-18T10:30:00Z"
  },
  {
    "id": 2,
    "instance_id": 10,
    "event_type": "provisioning_failed",
    "provider": "scaleway",
    "message": "Provisioning failed on scaleway: Connection timeout",
    "error_details": "{\"error_type\": \"ConnectionError\", \"error_message\": \"timeout\"}",
    "created_at": "2025-11-18T10:30:05Z"
  },
  {
    "id": 3,
    "instance_id": 10,
    "event_type": "provider_fallback",
    "provider": "hetzner",
    "message": "Falling back from scaleway to hetzner: Connection timeout",
    "created_at": "2025-11-18T10:30:06Z"
  },
  {
    "id": 4,
    "instance_id": 10,
    "event_type": "provisioning_success",
    "provider": "hetzner",
    "message": "Successfully provisioned VM with IP: 192.168.1.100",
    "created_at": "2025-11-18T10:30:15Z"
  }
]
```

### GET `/api/admin/monitoring/logs`
List all provisioning logs with filters.

**Auth:** Required (Admin only)

**Query Parameters:**
- `instance_id` (int, optional)
- `event_type` (string, optional)
- `provider` (string, optional)
- `limit` (int, default: 100)

### GET `/api/admin/monitoring/stats`
Get platform statistics.

**Auth:** Required (Admin only)

**Response:**
```json
{
  "users": {
    "total": 50
  },
  "challenges": {
    "total": 12,
    "active": 10
  },
  "instances": {
    "total": 245,
    "running": 15,
    "expired": 200,
    "failed": 5
  },
  "providers": {
    "hetzner": 180,
    "scaleway": 65
  },
  "today": {
    "failures": 3,
    "fallbacks": 2
  }
}
```

---

## Event Types

Provisioning log event types:
- `provisioning_started` - VM provisioning initiated
- `provisioning_success` - VM successfully provisioned
- `provisioning_failed` - VM provisioning failed
- `provider_fallback` - Automatic fallback to another provider
- `vm_starting` - VM is starting
- `vm_running` - VM is running and accessible
- `vm_stopping` - VM is stopping
- `vm_expired` - VM has expired
- `vm_destroying` - VM destruction initiated
- `vm_destroyed` - VM successfully destroyed
- `error` - General error occurred

---

## VM Status Flow

```
provisioning → running → expired → destroyed
     ↓
   failed
```

---

## Provider Fallback Logic

1. Attempt provisioning on **Scaleway** (primary)
2. If Scaleway fails:
   - Log failure event
   - Log fallback event
   - Attempt provisioning on **Hetzner** (fallback)
3. If both fail:
   - Mark VM as `failed`
   - Return error to user

All events are logged to `provisioning_logs` table for audit trail.

---

## Security Features

1. **Role-Based Access Control**
   - Admin-only endpoints protected by `get_current_admin_user`
   - User endpoints protected by `get_current_user`

2. **Encrypted Credentials**
   - SSH passwords stored encrypted using Fernet
   - Decrypted only when retrieved by authorized user

3. **One VM Per User**
   - Database constraint enforces single active VM
   - Prevents resource abuse

4. **Credential Access Tracking**
   - `credentials_accessed` flag
   - `credentials_accessed_at` timestamp
   - One-time display warning

5. **JWT Authentication**
   - Tokens include user role
   - Configurable expiration

---

## Error Responses

Standard error format:
```json
{
  "detail": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid input, constraint violation)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting & Best Practices

1. **VM Management**
   - Only one active VM per user
   - Destroy old VM before starting new one
   - VMs auto-expire based on challenge duration

2. **Credential Retrieval**
   - Retrieve credentials immediately after VM starts
   - Save credentials securely (shown once)
   - Use `credentials_accessed` flag to track access

3. **Monitoring**
   - Check VM status regularly
   - Monitor expiration time
   - Review provisioning logs for issues

4. **Admin Operations**
   - Batch assign challenges to multiple users
   - Monitor platform stats for capacity planning
   - Review fallback logs for provider reliability
