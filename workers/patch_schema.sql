-- Add missing columns to users table
-- We use a try-catch approach by just running the statements. 
-- If users table exists, these might fail if columns exist, but based on errors they don't.
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1;
ALTER TABLE users ADD COLUMN updated_at DATETIME;

-- Create other tables if they don't exist (using the full schema definition)
CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    snapshot_id TEXT NOT NULL,
    difficulty TEXT DEFAULT 'beginner' CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
    cpu_count INTEGER DEFAULT 2,
    memory_gb INTEGER DEFAULT 4,
    duration_hours INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    challenge_id INTEGER NOT NULL,
    assigned_by INTEGER NOT NULL,
    status TEXT DEFAULT 'assigned' CHECK(status IN ('assigned', 'in_progress', 'completed', 'expired')),
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    expires_at DATETIME,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (challenge_id) REFERENCES challenges(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    challenge_id INTEGER NOT NULL,
    assignment_id INTEGER,
    instance_id TEXT NOT NULL,
    provider TEXT DEFAULT 'hetzner' CHECK(provider IN ('hetzner', 'aws', 'digitalocean', 'fallback')),
    public_ip TEXT NOT NULL,
    ssh_username TEXT DEFAULT 'root',
    ssh_password_encrypted TEXT,
    ssh_private_key_encrypted TEXT,
    status TEXT DEFAULT 'provisioning' CHECK(status IN ('provisioning', 'running', 'expired', 'destroying', 'destroyed', 'failed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    expires_at DATETIME NOT NULL,
    destroyed_at DATETIME,
    server_type TEXT,
    location TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (challenge_id) REFERENCES challenges(id),
    FOREIGN KEY (assignment_id) REFERENCES assignments(id)
);

CREATE TABLE IF NOT EXISTS provisioning_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    provider TEXT,
    message TEXT NOT NULL,
    error_details TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instance_id) REFERENCES instances(id)
);
