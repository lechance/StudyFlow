# StudyFlow 数据存储与部署指南

## 数据存储机制

### 1. 存储位置
- **数据库文件**: `data/study.db`
- **类型**: SQLite 数据库（单个文件）
- **大小**: 约 120KB（当前示例数据）

### 2. 数据库表结构

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| `users` | 用户表 | id, username, password, email, role |
| `tasks` | 任务表 | id, user_id, title, description, category, priority, status, plan_date, deadline |
| `subtasks` | 子任务表 | id, task_id, user_id, title, description, completed |
| `study_records` | 学习记录表 | id, user_id, task_id, duration, date |
| `daily_plans` | 每日计划表 | id, user_id, date, content, completed |
| `check_ins` | 打卡记录表 | id, user_id, date, completed |
| `pomodoro_settings` | 番茄钟设置 | id, user_id, focus_duration, break_duration |
| `sessions` | 会话表 | id, user_id, created_at, expires_at |
| `recycle_bin` | 回收站 | id, user_id, task_id, task_data, deleted_at |

### 3. Docker 部署数据持久化

```yaml
# docker-compose.yml
volumes:
  - studyflow_data:/app/data  # 持久化数据目录

volumes:
  studyflow_data:  # Docker 管理的数据卷
```

**原理**: Docker Compose 创建命名卷 `studyflow_data`，挂载到容器的 `/app/data` 目录，容器重启或重建不会丢失数据。

---

## 数据备份方法

### 方法 1: 直接复制数据库文件

```bash
# 本地备份（开发环境）
cp data/study.db data/backup/study_$(date +%Y%m%d).db

# Docker 环境备份
docker cp studyflow-app:/app/data/study.db ./backup/
```

### 方法 2: 使用 SQLite 命令导出

```bash
# 导出为 SQL 文件（可读性更好）
sqlite3 data/study.db ".dump" > backup/study_$(date +%Y%m%d).sql

# Docker 环境
docker exec studyflow-app sqlite3 /app/data/study.db ".dump" > ./backup/study.sql
```

### 方法 3: 自动备份脚本

```bash
#!/bin/bash
# backup.sh - 数据备份脚本

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
cp data/study.db "$BACKUP_DIR/study_$DATE.db"

# 保留最近 30 天备份
find $BACKUP_DIR -name "study_*.db" -mtime +30 -delete

echo "Backup completed: study_$DATE.db"
```

---

## 数据迁移方法

### 场景 1: 从开发环境迁移到生产服务器

```bash
# 1. 打包数据
tar -czvf studyflow_data.tar.gz data/

# 2. 传输到生产服务器
scp studyflow_data.tar.gz user@server:/path/to/studyflow/

# 3. 解压覆盖
tar -xzvf studyflow_data.tar.gz

# 4. 重启服务
docker-compose down && docker-compose up -d
```

### 场景 2: 迁移到新的 Docker 主机

```bash
# 1. 在原服务器备份
docker run --rm -v studyflow_data:/data -v $(pwd):/backup alpine tar czvf /backup/studyflow_data.tar.gz -C /data .

# 2. 传输备份文件
scp studyflow_data.tar.gz user@newserver:/path/

# 3. 在新服务器恢复
docker run --rm -v studyflow_data:/data -v $(pwd):/backup alpine tar xzvf /backup/studyflow_data.tar.gz -C /data

# 4. 启动服务
docker-compose up -d
```

### 场景 3: 导出数据用于其他应用

```bash
# 导出为 CSV（需要 sqlite-utils 或类似工具）
sqlite3 data/study.db "SELECT * FROM tasks;" > tasks.csv

# 导出为 JSON
sqlite3 data/study.db ".mode json" ".output tasks.json" "SELECT * FROM tasks;" ".output"
```

---

## 数据安全建议

### 1. 定期备份
- 建议每日自动备份
- 保留最近 30 天备份
- 重要数据异地存储

### 2. 监控存储空间
```bash
# 检查数据库大小
ls -lh data/study.db

# Docker 卷大小
docker volume inspect studyflow_data
```

### 3. 迁移前验证
```bash
# 验证数据库完整性
sqlite3 data/study.db "PRAGMA integrity_check;"

# 验证表结构
sqlite3 data/study.db ".schema"
```

---

## 常见问题

### Q: 容器删除后数据会丢失吗？
**A**: 不会，只要使用 Docker Compose 并配置了 `volumes`，数据会持久化到 Docker 管理的命名卷中。

### Q: 如何查看 Docker 卷的实际位置？
```bash
docker volume inspect studyflow_data
```

### Q: 数据库文件损坏怎么办？
**A**: 
1. 使用最近备份恢复
2. 运行 `PRAGMA integrity_check` 检查
3. 如果是 WAL 模式问题，删除 `-wal` 和 `-shm` 文件

### Q: 如何清理过期会话？
```bash
# 清理过期会话（生产环境可设置定时任务）
docker exec studyflow-app node -e "
const db = require('better-sqlite3')('/app/data/study.db');
const result = db.prepare(\"DELETE FROM sessions WHERE expires_at < datetime('now')\").run();
console.log('Deleted', result.changes, 'expired sessions');
"
```
