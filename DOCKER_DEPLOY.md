# Docker Deployment Guide

StudyFlow 智能学习助手的 Docker 部署指南。

## 目录

- [快速开始](#快速开始)
- [部署方式](#部署方式)
  - [使用部署脚本](#使用部署脚本)
  - [使用 Docker Compose](#使用-docker-compose)
  - [使用 Docker](#使用-docker)
- [配置说明](#配置说明)
- [数据持久化](#数据持久化)
- [生产环境部署](#生产环境部署)
- [故障排除](#故障排除)

---

## 快速开始

```bash
# 方式一：使用部署脚本（推荐）
chmod +x deploy.sh
./deploy.sh start

# 方式二：直接使用 Docker Compose
docker-compose up -d
```

部署完成后访问：
- 本地: http://localhost:5000
- 服务器: http://你的服务器IP:5000

---

## 部署方式

### 使用部署脚本

```bash
# 启动生产环境
./deploy.sh start

# 启动开发环境
./deploy.sh start development

# 查看状态
./deploy.sh status

# 查看日志
./deploy.sh logs

# 重启
./deploy.sh restart

# 重新构建
./deploy.sh rebuild

# 停止
./deploy.sh stop

# 清理（删除所有容器、镜像和卷）
./deploy.sh clean
```

### 使用 Docker Compose

#### 生产环境
```bash
# 构建并启动
docker-compose up -d

# 构建并启动（重新构建）
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

#### 开发环境
```bash
# 启动开发模式（支持热更新）
docker-compose -f docker-compose.dev.yml up -d

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f

# 停止
docker-compose -f docker-compose.dev.yml down
```

### 使用 Docker

```bash
# 构建镜像
docker build -t studyflow -f Dockerfile.prod .

# 运行容器
docker run -d \
  --name studyflow-app \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  -e NODE_ENV=production \
  studyflow
```

---

## 配置说明

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `5000` |
| `NODE_ENV` | 运行环境 | `production` |
| `COZE_PROJECT_ENV` | 项目环境 | `PROD` |
| `COZE_PROJECT_DOMAIN_DEFAULT` | 访问域名 | 空 |

### 自定义端口

```bash
# 使用 docker-compose
DEPLOY_RUN_PORT=8080 docker-compose up -d

# 使用 docker run
docker run -d -p 8080:5000 studyflow
```

---

## 数据持久化

### 使用 Docker Compose（推荐）

Docker Compose 使用命名卷 `studyflow_data` 自动持久化数据：

```yaml
volumes:
  - studyflow_data:/app/data
```

数据存储在 Docker 的本地存储驱动中，可通过以下命令查看：

```bash
docker volume inspect studyflow_studyflow_data
```

### 使用 Docker 手动挂载

```bash
# 创建本地数据目录
mkdir -p ./data

# 挂载到容器
docker run -v $(pwd)/data:/app/data studyflow
```

### 数据备份

```bash
# 备份数据目录
tar -czvf studyflow_backup_$(date +%Y%m%d).tar.gz data/

# 恢复数据
tar -xzvf studyflow_backup_20240101.tar.gz
```

---

## 生产环境部署

### 前置要求

- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB 可用内存
- 10GB 可用磁盘空间

### 部署步骤

1. **克隆代码**
   ```bash
   git clone <repository-url>
   cd studyflow
   ```

2. **配置域名（可选）**
   ```bash
   export COZE_PROJECT_DOMAIN_DEFAULT="your-domain.com"
   ```

3. **启动服务**
   ```bash
   ./deploy.sh start
   ```

4. **配置反向代理（推荐）**

   使用 Nginx 作为反向代理，支持 HTTPS：

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **配置 HTTPS（使用 Let's Encrypt）**
   ```bash
   certbot --nginx -d your-domain.com
   ```

### 使用 Systemd 管理服务

创建 `/etc/systemd/system/studyflow.service`：

```ini
[Unit]
Description=StudyFlow Smart Learning Assistant
After=network.target docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/studyflow
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

启用服务：
```bash
sudo systemctl enable studyflow
sudo systemctl start studyflow
```

---

## 故障排除

### Docker 构建失败

如果您遇到 Docker 构建问题，尝试以下解决方案：

#### 方案1：使用 Slim 镜像（推荐用于 better-sqlite3）

```bash
# 使用 Node.js slim 镜像版本
DOCKERFILE=Dockerfile.prod.slim docker-compose up -d --build
```

#### 方案2：清理 Docker 缓存

```bash
# 清理所有未使用的 Docker 资源
docker builder prune -a

# 重新构建
docker-compose build --no-cache
docker-compose up -d
```

#### 方案3：检查构建日志

```bash
# 查看详细构建日志
docker-compose build --progress=plain

# 如果构建失败，查看具体错误
docker build -t studyflow -f Dockerfile.prod . --no-cache
```

### 常见构建错误

#### better-sqlite3 构建失败
```
error: could not load detritus.node
```
**解决方案**：使用 `Dockerfile.prod.slim` 或确保构建阶段安装了所有必要的构建工具。

#### pnpm-lock.yaml 错误
```
ERR_PNPM_LOCKFILE_MISSING_DEPENDENCY
```
**解决方案**：确保 `pnpm-lock.yaml` 存在且与 `package.json` 同步：
```bash
pnpm install
git add pnpm-lock.yaml
git commit -m "Update lockfile"
```

### 容器启动失败

```bash
# 查看详细日志
docker-compose logs app

# 检查容器状态
docker-compose ps

# 检查端口占用
netstat -tlnp | grep 5000
```

### 数据库问题

```bash
# 检查数据目录权限
ls -la data/

# 修复权限
chmod 755 data/
chown -R 1001:1001 data/

# 重置数据库（谨慎使用）
rm -rf data/*
docker-compose restart
``` 755 data/
chown -R 1001:1001 data/

# 重置数据库（谨慎使用）
rm -rf data/*
docker-compose restart
```

### 构建失败

```bash
# 清理 Docker 缓存
docker builder prune -a

# 重新构建
docker-compose build --no-cache
```

### 内存不足

增加 Docker 内存限制，或使用轻量级构建：

```dockerfile
# 在 Dockerfile.prod 中使用 alpine:latest
FROM alpine:latest AS runner
```

### 端口冲突

更改端口映射：

```bash
# 在 docker-compose.yml 中修改
ports:
  - "5001:5000"  # 外部5001映射到内部5000
```

---

## 常用命令速查

| 操作 | 命令 |
|------|------|
| 启动 | `docker-compose up -d` |
| 停止 | `docker-compose down` |
| 重启 | `docker-compose restart` |
| 查看日志 | `docker-compose logs -f` |
| 重新构建 | `docker-compose up -d --build` |
| 进入容器 | `docker exec -it studyflow-app sh` |
| 查看数据卷 | `docker volume ls` |
| 清理未使用资源 | `docker system prune -a` |

---

## 更多信息

- [项目 README](../README.md)
- [API 文档](./API.md)
- [开发指南](./DEVELOP.md)
