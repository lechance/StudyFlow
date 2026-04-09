# StudyFlow - 智能学习助手

## 项目概述

StudyFlow 是一款面向学生和职场人的智能学习计划与时间管理 Web 应用，提供任务管理、番茄钟、学习计划、数据统计等核心功能。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **数据库**: SQLite (better-sqlite3)
- **图标**: Lucide React
- **容器化**: Docker

## 目录结构

```
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (main)/              # 主应用页面群组
│   │   │   ├── dashboard/       # 首页仪表盘
│   │   │   ├── tasks/           # 任务管理
│   │   │   ├── pomodoro/        # 番茄钟
│   │   │   ├── plans/           # 学习计划
│   │   │   ├── stats/           # 数据统计
│   │   │   └── recycle/         # 回收站
│   │   ├── api/                 # API 路由
│   │   │   ├── auth/            # 认证 API
│   │   │   ├── tasks/           # 任务 API
│   │   │   ├── subtasks/        # 子任务 API
│   │   │   ├── study/           # 学习记录 API
│   │   │   ├── plans/           # 计划 API
│   │   │   ├── stats/           # 统计 API
│   │   │   └── users/           # 用户管理 API
│   │   └── login/               # 登录页面
│   ├── components/               # React 组件
│   │   ├── ui/                  # shadcn/ui 组件库
│   │   └── MainLayout.tsx       # 主布局组件
│   ├── hooks/                   # 自定义 Hooks
│   │   ├── useAuth.tsx          # 认证状态管理
│   │   └── useTasks.tsx         # 任务状态管理
│   └── lib/                     # 工具库
│       ├── api.ts               # API 客户端
│       ├── auth.ts              # 认证工具
│       ├── db.ts                # 数据库连接
│       └── types.ts             # TypeScript 类型定义
├── data/                        # SQLite 数据库目录
├── scripts/                     # 构建脚本
├── Dockerfile                   # Docker 构建文件
├── Dockerfile.prod              # 生产环境 Docker 构建文件
├── docker-compose.yml          # Docker Compose 配置
├── docker-compose.dev.yml      # 开发环境 Docker Compose 配置
├── .dockerignore               # Docker 忽略文件
├── DOCKER_DEPLOY.md             # Docker 部署指南
└── package.json
```

## 核心功能

### 1. 任务管理
- 创建、编辑、删除任务
- 任务分类（学习、工作、阅读、运动、其他）
- 优先级设置（高、中、低）
- 状态切换（待办、进行中、已完成）
- 截止日期和预计时长
- 任务按优先级和截止日期自动排序
- 回收站功能（30天恢复期）
- **子任务支持**：每个任务可添加子任务，显示完成进度

### 2. 番茄钟
- 25分钟专注 + 5分钟休息（可自定义）
- 每4个番茄钟后长休息15分钟
- 圆形进度显示
- 关联任务跟踪
- 完成提醒音效

### 3. 学习计划
- 每日计划制定
- 周视图概览
- 打卡记录
- 连续打卡天数统计

### 4. 数据统计
- 今日学习时长
- 本周/本月统计数据
- 学习趋势图表
- 任务完成率

### 5. 用户系统
- 用户注册/登录
- 会话管理
- 管理员用户管理

### 6. 国际化（i18n）
- 中英文支持
- 自动检测浏览器语言
- 语言切换持久化

### 7. Docker 部署
- 支持 Docker 容器化部署
- 多阶段构建优化镜像大小
- 数据卷持久化

## API 接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/logout` | POST | 用户登出 |
| `/api/auth/me` | GET | 获取当前用户 |
| `/api/tasks` | GET/POST | 获取/创建任务 |
| `/api/tasks/[id]` | GET/PUT/DELETE | 任务操作 |
| `/api/tasks/recycle` | GET | 回收站 |
| `/api/subtasks` | GET/POST/PUT/DELETE | 子任务 CRUD |
| `/api/study/records` | GET/POST | 学习记录 |
| `/api/plans` | GET/POST | 每日计划 |
| `/api/plans/checkin` | GET/POST | 打卡 |
| `/api/stats` | GET | 统计数据 |
| `/api/users` | GET | 用户列表（管理员） |

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务
pnpm start
```

## Docker 部署

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

## 访问地址

- 开发环境: http://localhost:5000
- 部署环境: https://${COZE_PROJECT_DOMAIN_DEFAULT}

## 数据库

使用 SQLite 数据库，文件存储在 `data/study.db`。

### 主要表结构

- `users`: 用户表
- `tasks`: 任务表
- `sessions`: 会话表
- `study_records`: 学习记录表
- `daily_plans`: 每日计划表
- `check_ins`: 打卡记录表
- `recycle_bin`: 回收站
- `pomodoro_settings`: 番茄钟设置

## 注意事项

1. 所有页面都需要登录才能访问
2. 任务删除后进入回收站，30天后自动清除
3. 番茄钟设置自动保存
4. 统计数据显示最近7/14/30天的数据
