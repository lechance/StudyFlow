import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getDb } from './db';
import type { User } from './types';

const SESSION_COOKIE_NAME = 'study_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'study-app-secret-key-2024';

export async function createSession(userId: string): Promise<string> {
  const sessionId = generateSessionId();
  const db = getDb();
  
  db.prepare(`
    INSERT INTO sessions (id, user_id, created_at, expires_at)
    VALUES (?, ?, datetime('now'), datetime('now', '+7 days'))
  `).run(sessionId, userId);

  return sessionId;
}

// 设置 session cookie 到 response
export function setSessionCookieToResponse(response: NextResponse, sessionId: string, isHttps = false) {
  // 根据 isHttps 参数决定是否使用 Secure 属性
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
}

// 在 API Route 中使用的设置 cookie 函数
export async function setSessionCookie(sessionId: string): Promise<{ cookieHeader: string }> {
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: false,  // 始终为 false，确保 HTTP/HTTPS 都能工作
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  };
  
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, cookieOptions);
  
  // 返回 cookie 字符串，手动设置到响应头
  const serialized = `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; Max-Age=${cookieOptions.maxAge}; HttpOnly; SameSite=${cookieOptions.sameSite}`;
  return { cookieHeader: serialized };
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const sessionId = await getSessionCookie();
    if (!sessionId) return null;

    const db = getDb();
    const session = db.prepare(`
      SELECT s.*, u.* FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > datetime('now')
    `).get(sessionId) as any;

    if (!session) return null;

    return {
      id: session.user_id,
      username: session.username,
      password: session.password,
      email: session.email,
      role: session.role,
      avatar: session.avatar,
      streak_days: session.streak_days,
      total_study_time: session.total_study_time,
      created_at: session.created_at,
      updated_at: session.updated_at
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

export async function deleteSession(sessionId: string) {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

function generateSessionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 简单的密码哈希（生产环境建议使用 bcrypt）
export function hashPassword(password: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password + SESSION_SECRET).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// 添加 sessions 表初始化
export function initSessionsTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}
