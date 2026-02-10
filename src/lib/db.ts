import { D1Database } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
}

export async function getUserByUsername(db: D1Database, username: string) {
  const result = await db
    .prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first();
  return result;
}

export async function createUser(db: D1Database, username: string, passwordHash: string, expiredAt: string) {
  const result = await db
    .prepare('INSERT INTO users (username, password_hash, expired_at) VALUES (?, ?, ?)')
    .bind(username, passwordHash, expiredAt)
    .run();
  return result;
}

export async function getWorkflows(db: D1Database) {
  const result = await db
    .prepare('SELECT * FROM workflows ORDER BY created_at DESC')
    .all();
  return result.results;
}

export async function getWorkflowById(db: D1Database, id: number) {
  const result = await db
    .prepare('SELECT * FROM workflows WHERE id = ?')
    .bind(id)
    .first();
  return result;
}

export async function getInviteCode(db: D1Database, code: string) {
  const result = await db
    .prepare('SELECT * FROM invite_codes WHERE code = ? AND is_used = FALSE')
    .bind(code)
    .first();
  return result;
}

export async function useInviteCode(db: D1Database, codeId: number, userId: number) {
  await db
    .prepare('UPDATE invite_codes SET is_used = TRUE, used_by = ? WHERE id = ?')
    .bind(userId, codeId)
    .run();
}

export async function updateUserExpiry(db: D1Database, userId: number, newExpiredAt: string) {
  await db
    .prepare('UPDATE users SET expired_at = ? WHERE id = ?')
    .bind(newExpiredAt, userId)
    .run();
}
