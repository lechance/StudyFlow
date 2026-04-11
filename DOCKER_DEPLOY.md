# StudyFlow Docker 部署

## 快速部署

```bash
# 构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f

# 停止
docker compose down
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 5000 | 监听端口 |
| NODE_ENV | production | 运行环境 |

## 数据

数据库文件保存在 Docker volume `studyflow_data` 中。

```bash
# 备份
docker run --rm -v studyflow_data:/data -v $(pwd):/backup alpine tar czf backup.tar.gz -C /data .

# 恢复
docker run --rm -v studyflow_data:/data -v $(pwd):/backup alpine tar xzf backup.tar.gz -C /data
```

## 健康检查

```bash
docker inspect --format='{{.State.Health.Status}}' studyflow-app
```
