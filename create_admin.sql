-- 添加 role 列到 users 表（如果不存在）
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';

-- 创建默认管理员账号
-- 用户名: admin
-- 密码: admin123
INSERT INTO users (username, password_hash, expired_at, role, created_at)
VALUES (
  'admin',
  '$2a$10$C6JP7XVa17wECAd7JtTc3eLK9xlZwJ/81tZ8osYixOCrvuFC7gMUC',
  '2099-12-31T23:59:59.000Z',
  'admin',
  CURRENT_TIMESTAMP
);

-- 创建一个示例邀请码
INSERT INTO invite_codes (code, duration_hours, is_used, created_at)
VALUES ('WELCOME2024', 3, 0, CURRENT_TIMESTAMP);
