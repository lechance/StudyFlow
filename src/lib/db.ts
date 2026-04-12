import Database from 'better-sqlite3';
import path from 'path';

// 使用 COZE_PROJECT_ENV 判断生产环境
const isProdEnv = process.env.COZE_PROJECT_ENV === 'PROD';
// 生产环境使用 /app/work 持久化目录，开发环境使用项目 data 目录
const dbBaseDir = isProdEnv ? '/app/work/studyflow-data' : path.join(process.cwd(), 'data');
const dbPath = path.join(dbBaseDir, 'study.db');

// 存储在 global 上的键名
const DB_GLOBAL_KEY = '__studyflow_db__';

// 获取全局数据库实例
function getGlobalDb(): Database.Database | undefined {
  return (global as any)[DB_GLOBAL_KEY];
}

// 设置全局数据库实例
function setGlobalDb(dbInstance: Database.Database) {
  (global as any)[DB_GLOBAL_KEY] = dbInstance;
}

let db: Database.Database | undefined = getGlobalDb();

if (!db) {
  const fs = require('fs');
  
  // Ensure database directory exists
  if (!fs.existsSync(dbBaseDir)) {
    fs.mkdirSync(dbBaseDir, { recursive: true });
    console.log('Created database directory:', dbBaseDir);
  }
  
  // Ensure database file exists
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '');
    console.log('Created database file:', dbPath);
  }
  
  db = new Database(dbPath);
  // Use DELETE journal mode instead of WAL to avoid concurrency issues
  db.pragma('journal_mode = DELETE');
  db.pragma('synchronous = NORMAL');
  
  // Check if we can write to the database
  try {
    db.exec('SELECT 1');
  } catch (error) {
    console.error('Database read test failed:', error);
  }
  
  // 保存到 global
  setGlobalDb(db);
  
  initializeTables(db);
}

export function getDb(): Database.Database {
  if (!db) {
    db = getGlobalDb();
  }
  return db!;
}

function initializeTables(database: Database.Database) {
  try {
    database.exec(`
      -- 用户表
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        signature TEXT,
        role TEXT DEFAULT 'user',
        avatar TEXT,
        streak_days INTEGER DEFAULT 0,
        total_study_time INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- 任务表
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        deadline TEXT,
        plan_date TEXT,
        estimated_time INTEGER,
        completed_at TEXT,
        is_deleted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- 学习记录表
      CREATE TABLE IF NOT EXISTS study_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        task_id TEXT,
        duration INTEGER NOT NULL,
        date TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      );

      -- 每日计划表
      CREATE TABLE IF NOT EXISTS daily_plans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        content TEXT,
        completed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- 回收站表（软删除的任务）
      CREATE TABLE IF NOT EXISTS recycle_bin (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        task_data TEXT NOT NULL,
        deleted_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- 番茄钟设置表
      CREATE TABLE IF NOT EXISTS pomodoro_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        focus_duration INTEGER DEFAULT 25,
        break_duration INTEGER DEFAULT 5,
        long_break_duration INTEGER DEFAULT 15,
        sessions_before_long_break INTEGER DEFAULT 4,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- 子任务表
      CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- 创建索引
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_study_records_user_date ON study_records(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON daily_plans(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);

      -- 会话表
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- S3 存储配置表
      CREATE TABLE IF NOT EXISTS storage_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        provider TEXT DEFAULT 's3',
        endpoint_url TEXT,
        access_key TEXT,
        secret_key TEXT,
        bucket_name TEXT,
        region TEXT DEFAULT 'us-east-1',
        enabled INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
  
  // Migration: Add description column if it doesn't exist (tasks table)
  try {
    database.exec("ALTER TABLE tasks ADD COLUMN description TEXT");
  } catch (e: any) {
    if (!e.message.includes('duplicate column name')) {
      // Column already exists or other error, ignore
    }
  }
  
  // Migration: Add description column if it doesn't exist (subtasks table)
  try {
    database.exec("ALTER TABLE subtasks ADD COLUMN description TEXT");
  } catch (e: any) {
    if (!e.message.includes('duplicate column name')) {
      // Column already exists or other error, ignore
    }
  }
  
  // 创建默认管理员用户
  createDefaultAdmin(database);
}

function createDefaultAdmin(database: Database.Database) {
  try {
    const existingAdmin = database.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    if (!existingAdmin) {
      // 使用与 auth.ts 一致的简单哈希和密钥
      const crypto = require('crypto');
      const SESSION_SECRET = process.env.SESSION_SECRET || 'study-app-secret-key-2024';
      const hashedPassword = crypto.createHash('sha256').update('admin123' + SESSION_SECRET).digest('hex');
      const adminId = generateId();
      
      database.prepare(`
        INSERT INTO users (id, username, password, email, role, streak_days, total_study_time)
        VALUES (?, ?, ?, ?, 'admin', 0, 0)
      `).run(adminId, 'admin', hashedPassword, 'admin@studyflow.local');
      
      // 创建管理员的默认番茄钟设置
      database.prepare(`
        INSERT INTO pomodoro_settings (id, user_id, focus_duration, break_duration, long_break_duration, sessions_before_long_break)
        VALUES (?, ?, 25, 5, 15, 4)
      `).run(generateId(), adminId);
      
      console.log('Default admin user created: admin / admin123');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
    throw error;
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
