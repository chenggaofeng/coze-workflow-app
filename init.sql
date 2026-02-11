-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  expired_at TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 邀请码表
CREATE TABLE IF NOT EXISTS invite_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  duration_hours INTEGER NOT NULL DEFAULT 3,
  is_used INTEGER DEFAULT 0,
  used_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (used_by) REFERENCES users(id)
);

-- 工作流表
CREATE TABLE IF NOT EXISTS workflows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  coze_workflow_id TEXT NOT NULL,
  input_params TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 为 users 表添加 role 字段（如果不存在）
-- SQLite 不支持 ALTER TABLE ADD COLUMN IF NOT EXISTS，所以需要检查
-- 这里使用 PRAGMA 检查列是否存在
