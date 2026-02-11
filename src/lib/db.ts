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

export async function getUserById(db: D1Database, id: number) {
  const result = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .first();
  return result;
}

export async function createUser(db: D1Database, username: string, passwordHash: string, expiredAt: string, role: string = 'user') {
  const result = await db
    .prepare('INSERT INTO users (username, password_hash, expired_at, role) VALUES (?, ?, ?, ?)')
    .bind(username, passwordHash, expiredAt, role)
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

export async function createWorkflow(db: D1Database, name: string, description: string, cozeWorkflowId: string, inputParams: string) {
  const result = await db
    .prepare('INSERT INTO workflows (name, description, coze_workflow_id, input_params) VALUES (?, ?, ?, ?)')
    .bind(name, description, cozeWorkflowId, inputParams)
    .run();
  return result;
}

export async function updateWorkflow(db: D1Database, id: number, name: string, description: string, cozeWorkflowId: string, inputParams: string) {
  const result = await db
    .prepare('UPDATE workflows SET name = ?, description = ?, coze_workflow_id = ?, input_params = ? WHERE id = ?')
    .bind(name, description, cozeWorkflowId, inputParams, id)
    .run();
  return result;
}

export async function deleteWorkflow(db: D1Database, id: number) {
  const result = await db
    .prepare('DELETE FROM workflows WHERE id = ?')
    .bind(id)
    .run();
  return result;
}

export async function getInviteCode(db: D1Database, code: string) {
  const result = await db
    .prepare('SELECT * FROM invite_codes WHERE code = ? AND is_used = 0')
    .bind(code)
    .first();
  return result;
}

export async function createInviteCode(db: D1Database, code: string, durationHours: number = 3) {
  const result = await db
    .prepare('INSERT INTO invite_codes (code, duration_hours, is_used) VALUES (?, ?, 0)')
    .bind(code, durationHours)
    .run();
  return result;
}

export async function getAllInviteCodes(db: D1Database) {
  const result = await db
    .prepare('SELECT ic.*, u.username as used_by_username FROM invite_codes ic LEFT JOIN users u ON ic.used_by = u.id ORDER BY ic.created_at DESC')
    .all();
  return result.results;
}

export async function useInviteCode(db: D1Database, codeId: number, userId: number) {
  await db
    .prepare('UPDATE invite_codes SET is_used = 1, used_by = ? WHERE id = ?')
    .bind(userId, codeId)
    .run();
}

export async function updateUserExpiry(db: D1Database, userId: number, newExpiredAt: string) {
  await db
    .prepare('UPDATE users SET expired_at = ? WHERE id = ?')
    .bind(newExpiredAt, userId)
    .run();
}
