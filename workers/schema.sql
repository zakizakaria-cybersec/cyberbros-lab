-- CyberBros Lab Database Schema for Cloudflare D1

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    snapshot_id TEXT NOT NULL,
    difficulty TEXT DEFAULT 'beginner',
    cpu_count INTEGER DEFAULT 2,
    memory_gb INTEGER DEFAULT 4
);

-- VM Instances table
CREATE TABLE IF NOT EXISTS vm_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    challenge_id INTEGER NOT NULL,
    instance_id TEXT NOT NULL,
    public_ip TEXT NOT NULL,
    ssh_username TEXT DEFAULT 'root',
    ssh_password TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    destroyed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (challenge_id) REFERENCES challenges(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vm_user_id ON vm_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_vm_challenge_id ON vm_instances(challenge_id);
CREATE INDEX IF NOT EXISTS idx_vm_status ON vm_instances(status);
CREATE INDEX IF NOT EXISTS idx_vm_expires_at ON vm_instances(expires_at);

-- Seed challenges
INSERT INTO challenges (name, description, snapshot_id, difficulty, cpu_count, memory_gb) VALUES
('SQL Injection Basics', 'Learn the fundamentals of SQL injection attacks and how to exploit vulnerable web applications.', 'snapshot-sql-injection-101', 'beginner', 2, 4),
('Cross-Site Scripting (XSS)', 'Master XSS attacks by exploiting client-side vulnerabilities in web applications.', 'snapshot-xss-lab', 'intermediate', 2, 4),
('Privilege Escalation', 'Practice escalating privileges on a Linux system to gain root access.', 'snapshot-privesc-lab', 'intermediate', 2, 4),
('Web Application Penetration Testing', 'Comprehensive lab covering OWASP Top 10 vulnerabilities in a realistic web application.', 'snapshot-webapp-pentest', 'advanced', 4, 8);
