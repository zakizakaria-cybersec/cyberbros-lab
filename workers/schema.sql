-- CyberBros Lab Database Schema for Cloudflare D1
-- Entities: Users, Challenges, Assignments, Instances, Provisioning Logs

-- ============================================================================
-- USERS TABLE (Admin + Normal Users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================================
-- CHALLENGES TABLE (Editable by Admins)
-- ============================================================================
CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    snapshot_id TEXT NOT NULL,
    difficulty TEXT DEFAULT 'beginner' CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
    cpu_count INTEGER DEFAULT 2,
    memory_gb INTEGER DEFAULT 4,
    duration_hours INTEGER DEFAULT 2,  -- Challenge-specific duration
    is_active BOOLEAN DEFAULT 1,
    created_by INTEGER,  -- Admin who created it
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX IF NOT EXISTS idx_challenges_is_active ON challenges(is_active);

-- ============================================================================
-- ASSIGNMENTS TABLE (Admin assigns challenge to user)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    challenge_id INTEGER NOT NULL,
    assigned_by INTEGER NOT NULL,  -- Admin who made the assignment
    status TEXT DEFAULT 'assigned' CHECK(status IN ('assigned', 'in_progress', 'completed', 'expired')),
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    expires_at DATETIME,  -- Optional expiry for the assignment itself
    notes TEXT,  -- Admin notes about the assignment
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (challenge_id) REFERENCES challenges(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_challenge_id ON assignments(challenge_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_by ON assignments(assigned_by);

-- ============================================================================
-- INSTANCES TABLE (Actual VM provisioning info)
-- One active VM per user constraint enforced by unique index
-- ============================================================================
CREATE TABLE IF NOT EXISTS instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    challenge_id INTEGER NOT NULL,
    assignment_id INTEGER,  -- Link to assignment (can be NULL for legacy/direct starts)
    
    -- VM details
    instance_id TEXT NOT NULL,  -- Cloud provider instance ID
    provider TEXT DEFAULT 'hetzner' CHECK(provider IN ('hetzner', 'aws', 'digitalocean', 'fallback')),
    public_ip TEXT NOT NULL,
    ssh_username TEXT DEFAULT 'root',
    ssh_password_encrypted TEXT,  -- Encrypted SSH password
    ssh_private_key_encrypted TEXT,  -- Encrypted SSH private key (optional)
    
    -- Status and lifecycle
    status TEXT DEFAULT 'provisioning' CHECK(status IN ('provisioning', 'running', 'expired', 'destroying', 'destroyed', 'failed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,  -- When VM became running
    expires_at DATETIME NOT NULL,  -- Based on challenge duration
    destroyed_at DATETIME,
    
    -- Metadata
    server_type TEXT,  -- e.g., 'cx11', 't2.micro'
    location TEXT,  -- e.g., 'nbg1', 'us-east-1'
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (challenge_id) REFERENCES challenges(id),
    FOREIGN KEY (assignment_id) REFERENCES assignments(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_instances_user_id ON instances(user_id);
CREATE INDEX IF NOT EXISTS idx_instances_challenge_id ON instances(challenge_id);
CREATE INDEX IF NOT EXISTS idx_instances_status ON instances(status);
CREATE INDEX IF NOT EXISTS idx_instances_expires_at ON instances(expires_at);
CREATE INDEX IF NOT EXISTS idx_instances_provider ON instances(provider);

-- Unique constraint: One active VM per user
-- Only one VM with status 'provisioning' or 'running' per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_instances_one_active_per_user 
ON instances(user_id) 
WHERE status IN ('provisioning', 'running');

-- ============================================================================
-- PROVISIONING_LOGS TABLE (VM lifecycle status & fallback provider tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS provisioning_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id INTEGER NOT NULL,  -- Reference to instances table
    
    -- Log details
    event_type TEXT NOT NULL CHECK(event_type IN (
        'provisioning_started',
        'provisioning_success',
        'provisioning_failed',
        'provider_fallback',
        'vm_starting',
        'vm_running',
        'vm_stopping',
        'vm_expired',
        'vm_destroying',
        'vm_destroyed',
        'error'
    )),
    provider TEXT,  -- Which provider was used for this event
    message TEXT NOT NULL,
    error_details TEXT,  -- JSON string with error details if applicable
    metadata TEXT,  -- JSON string with additional context
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (instance_id) REFERENCES instances(id)
);

-- Indexes for querying logs
CREATE INDEX IF NOT EXISTS idx_provisioning_logs_instance_id ON provisioning_logs(instance_id);
CREATE INDEX IF NOT EXISTS idx_provisioning_logs_event_type ON provisioning_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_provisioning_logs_created_at ON provisioning_logs(created_at);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Create default admin user (password should be changed immediately)
INSERT OR IGNORE INTO users (email, hashed_password, role) VALUES
('admin@cyberbros.lab', '$2a$10$example.hash.change.this.immediately', 'admin');

-- Seed challenges
INSERT OR IGNORE INTO challenges (name, description, snapshot_id, difficulty, cpu_count, memory_gb, duration_hours, created_by) VALUES
('SQL Injection Basics', 'Learn the fundamentals of SQL injection attacks and how to exploit vulnerable web applications.', 'snapshot-sql-injection-101', 'beginner', 2, 4, 2, 1),
('Cross-Site Scripting (XSS)', 'Master XSS attacks by exploiting client-side vulnerabilities in web applications.', 'snapshot-xss-lab', 'intermediate', 2, 4, 3, 1),
('Privilege Escalation', 'Practice escalating privileges on a Linux system to gain root access.', 'snapshot-privesc-lab', 'intermediate', 2, 4, 3, 1),
('Web Application Penetration Testing', 'Comprehensive lab covering OWASP Top 10 vulnerabilities in a realistic web application.', 'snapshot-webapp-pentest', 'advanced', 4, 8, 6, 1);
