-- Live Chat Database Schema
-- Add to existing SQLite database

-- Chat Categories
CREATE TABLE IF NOT EXISTS chat_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chat Requests (when user clicks "Chat Now")
CREATE TABLE IF NOT EXISTS chat_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL, -- anonymous user ID
    user_name TEXT,
    user_email TEXT,
    category_id INTEGER,
    message TEXT,
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected, expired
    assigned_to INTEGER, -- support user ID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    accepted_at DATETIME,
    rejected_at DATETIME,
    expires_at DATETIME DEFAULT (datetime('now', '+10 minutes')),
    FOREIGN KEY (category_id) REFERENCES chat_categories(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Active Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    support_user_id INTEGER NOT NULL,
    status TEXT DEFAULT 'active', -- active, ended
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    FOREIGN KEY (request_id) REFERENCES chat_requests(id),
    FOREIGN KEY (support_user_id) REFERENCES users(id)
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    sender_type TEXT NOT NULL, -- 'user' or 'support'
    sender_id TEXT NOT NULL, -- user_id or support_user_id
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text', -- text, link, file
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
);

-- Insert default chat categories
INSERT OR IGNORE INTO chat_categories (name, description) VALUES
('General Support', 'General questions and support'),
('Technical Issues', 'Technical problems and bugs'),
('Account Help', 'Account-related questions'),
('Billing & Pricing', 'Billing and pricing inquiries'),
('Feature Request', 'Suggestions for new features'),
('Other', 'Other topics not covered above');
