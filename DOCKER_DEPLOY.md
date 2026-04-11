# StudyFlow - Docker Production Deployment

## 快速部署

### 方式一：使用 Docker Compose（推荐）

```bash
# 1. 进入项目目录
cd /path/to/studyflow

# 2. 构建并启动
docker compose up -d --build

# 3. 查看日志
docker compose logs -f

# 4. 停止服务
docker compose down
```

### 方式二：单独构建镜像

```bash
# 1. 构建镜像
docker build -t studyflow:latest .

# 2. 运行容器
docker run -d \
  --name studyflow-app \
  -p 5000:5000 \
  -v studyflow_data:/app/data \
  -e NODE_ENV=production \
  -e NEXT_TELEMETRY_DISABLED=1 \
  studyflow:latest
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| NODE_ENV | 运行环境 | production |
| PORT | 监听端口 | 5000 |
| NEXT_TELEMETRY_DISABLED | 禁用遥测 | 1 |
| HOSTNAME | 监听地址 | 0.0.0.0 |

## 数据持久化

数据库文件存储在 Docker volume `studyflow_data` 中，映射到容器内的 `/app/data` 目录。

### 备份数据
```bash
# 备份 volume
docker run --rm -v studyflow_data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data

# 恢复数据
docker run --rm -v studyflow_data:/data -v $(pwd):/backup alpine tar xzf /backup/backup.tar.gz -C /
```

## 健康检查

容器内置健康检查，每 30 秒自动检测服务状态。

```bash
# 检查健康状态
docker inspect --format='{{.State.Health.Status}}' studyflow-app
```

## 日志管理

```bash
# 查看实时日志
docker compose logs -f app

# 查看最近 100 行日志
docker compose logs --tail=100 app

# 导出日志到文件
docker compose logs app > app.log
```

## 常用命令

```bash
# 重启服务
docker compose restart

# 重新构建（代码更新后）
docker compose up -d --build --force-recreate

# 进入容器
docker compose exec app sh

# 查看资源使用
docker stats studyflow-app

# 完全清除（包括数据）
docker compose down -v --rmi local
```
