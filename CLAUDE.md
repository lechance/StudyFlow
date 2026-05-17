# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
pnpm dev          # Start dev server (port 3000)
pnpm build        # Production build
pnpm start        # Start production server (port 3000)
pnpm lint         # ESLint
pnpm ts-check     # TypeScript type check (tsc --noEmit)
```

## Architecture Overview

**Stack**: Next.js 16 (App Router) + React 19 + TypeScript + SQLite (better-sqlite3) + Tailwind CSS v4 + shadcn/ui

### Project Structure

```
src/
  app/
    (main)/            # Authenticated pages (dashboard, tasks, history, pomodoro, stats, recycle, settings)
      dashboard/       # Home page with stats overview, quick stats cards, pending tasks preview
      tasks/           # Task list (weekly view) and individual task detail [id]
      history/         # Completed task history with search, sorting, date filtering
      pomodoro/        # Pomodoro timer with start/pause + settings (focus/break durations)
      stats/           # Study statistics with bar chart trend and time distribution
      recycle/         # Recycle bin with restore/permanent delete
      settings/        # User settings
    api/               # 16 API route files
      auth/            # login, logout, register, me
      tasks/           # CRUD, reorder, batch complete, recycle
      subtasks/        # CRUD for subtasks within a task
      study/           # Study time records
      plans/           # Daily plans
      stats/           # Aggregated statistics
      users/           # User profile
      database/        # Database management
      storage/         # S3 backup config
    login/             # Login/register page (DISABLE_REGISTRATION = true)
  components/
    MainLayout.tsx     # Sidebar + mobile sheet nav, user popover, language switcher, TasksProvider wrapper
    AddTaskForm.tsx    # Task creation form
    ui/                # 40+ shadcn/ui components (button, card, dialog, etc.)
  lib/
    db.ts              # SQLite schema + migrations (better-sqlite3, Drizzle ORM as dev dep)
    auth.ts            # Session/cookie auth, bcrypt passwords with SHA256 legacy fallback
    types.ts           # All TypeScript interfaces (User, Task, StudyRecord, etc.)
    api.ts             # Client-side fetch wrapper with typed API methods
    i18n.tsx           # Custom LanguageProvider (zh-CN / en) with 1000+ translation keys
  hooks/
    useAuth.ts         # Auth context (login, register, logout, user state)
    useTasks.ts        # Tasks context (CRUD with optimistic updates, recycle bin operations)
  server.ts            # Custom HTTP server on port 5000
```

### Key Patterns

- **All pages are `'use client'`** — no server components in feature pages
- **State management**: React Context (AuthProvider, LanguageProvider, TasksProvider)
- **Optimistic updates**: useTasks hook updates local state immediately, syncs with backend
- **Authentication**: Session cookies (7-day expiry), session ID in `sessions` table
- **Database**: better-sqlite3 singleton (DELETE journal mode), no ORM in runtime (Drizzle is dev-only)
- **Language**: Custom i18n with `t('key')` function from `useLanguage()` hook
- **API calls**: Typed methods via `api.ts` client with `credentials: 'include'`

### Default Credentials

Admin user created on first run: `admin` / `admin123`

### API Route Convention

API routes use Next.js Route Handlers in `src/app/api/`. Each route exports named HTTP method functions (GET, POST, PUT, DELETE). Route params accessed via `context.params` (Next.js 16 pattern).
