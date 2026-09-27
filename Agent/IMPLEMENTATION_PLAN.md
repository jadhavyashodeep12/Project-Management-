# Project Management System — Implementation Plan

**Document Status:** Draft v1.0 (pre-Sprint-0)
**Author:** Principal Software Architect / Senior Backend / Staff Frontend Engineering
**Version:** 1.0.0
**Last Updated:** 2026-07-31

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Folder Structure](#3-folder-structure)
4. [Database Design](#4-database-design)
5. [API Design](#5-api-design)
6. [Authentication](#6-authentication)
7. [Authorization](#7-authorization)
8. [Validation Strategy](#8-validation-strategy)
9. [UI Pages](#9-ui-pages)
10. [Components](#10-components)
11. [State Management](#11-state-management)
12. [Search](#12-search)
13. [Dashboard](#13-dashboard)
14. [File Upload](#14-file-upload)
15. [Notifications](#15-notifications)
16. [Logging](#16-logging)
17. [Error Handling](#17-error-handling)
18. [Performance Optimization](#18-performance-optimization)
19. [Security](#19-security)
20. [Testing Strategy](#20-testing-strategy)
21. [CI/CD](#21-cicd)
22. [Dockerization](#22-dockerization)
23. [Documentation](#23-documentation)
24. [Git Workflow](#24-git-workflow)
25. [Development Roadmap](#25-development-roadmap)
26. [Resume-Worthy Advanced Features](#26-resume-worthy-advanced-features)
27. [Interview Preparation](#27-interview-preparation)
28. [Evaluation](#28-evaluation)

---

## 1. Product Overview

### 1.1 Problem Statement

Modern software teams struggle with fragmented tooling: spreadsheets go stale, chat threads lose context, and lightweight todo apps cannot model teams, sprints, permissions, and reporting. This project delivers a **self-hosted, Kanban/Scrum project management system** — a Jira/Trello hybrid — that unifies project tracking, sprint planning, team management, and reporting in one coherent product with a modern React frontend and a clean, API-first Python backend.

The system must support multiple roles (Admin, Project Manager, Team Lead, Developer, Viewer), granular permission control, real-time-ish UX (optimistic updates), file attachments, rich search, notifications, and role-specific dashboards — all served through a production-grade deployment stack (Docker, Nginx, MinIO) with CI/CD.

### 1.2 Users

| User | Description | Primary Needs |
|---|---|---|
| **Admin** | Platform owner; manages system configuration and users | User management, RBAC administration, system metrics, security review, global audit trail |
| **Project Manager** | Owns one or more projects | Project health, sprint planning, velocity/burndown charts, team assignment, backlog grooming |
| **Team Lead** | Leads a team within a project | Board management, task assignment, sprint execution, blockers, review activity |
| **Developer** | Executes tasks | My Tasks view, board interaction, comments/attachments, notifications, search |
| **Viewer** | Read-only stakeholder (product owner, exec) | Dashboards, task details, reporting; no mutation |

### 1.3 Use Cases

**Core:**
- UC-01: Register/login/logout with JWT tokens and refresh-token rotation
- UC-02: Create/manage projects, teams, boards, columns, sprints
- UC-03: CRUD tasks; assign to users; set status, priority, labels, estimates, due dates
- UC-04: Drag-and-drop tasks across board columns with optimistic updates
- UC-05: Comment on tasks; mention users (@handle) → triggers notification
- UC-06: Attach files (≤10 MB, validated MIME types) with thumbnails and secure access
- UC-07: Global search across tasks/projects with filters, saved filters
- UC-08: Receive in-app notifications (assigned, mentioned, deadline, status change, invite)
- UC-09: Role-specific dashboards with burndown, velocity, cumulative flow
- UC-10: Admin user/RBAC management and audit/activity review

**Supporting:** password reset, email verification, CSV export, bulk operations, undo, keyboard shortcuts, dark mode, audit logging.

### 1.4 Functional Requirements (FR) — Summary

| ID | Requirement |
|---|---|
| FR-1 | Authentication: JWT access (15 min) + rotating refresh (7 days) tokens stored in DB, secure HttpOnly cookies |
| FR-2 | RBAC: 5 roles × CRUD per resource; role hierarchy; permission-based checks |
| FR-3 | Projects, teams, memberships, boards, columns, sprints, tasks, labels, comments, attachments, notifications |
| FR-4 | Kanban board with drag-drop reordering; backlog; sprint views |
| FR-5 | Search: global + column-level, debounced, server-side pagination, saved filters |
| FR-6 | Dashboards per role with charts and KPIs |
| FR-7 | Notifications with preferences, unread count, mark-as-read, archive |
| FR-8 | Attachments: upload, validation, thumbnails, delete + storage cleanup |
| FR-9 | Audit/activity logging of every mutating action |
| FR-10 | CSV export, bulk ops, undo (soft-delete restore), keyboard shortcuts, dark mode |

### 1.5 Non-Functional Requirements (NFR)

| Category | Requirement |
|---|---|
| **Performance** | P95 API latency < 300 ms; board load < 1.5 s at 500 tasks; search < 500 ms |
| **Availability** | 99.5% uptime target; stateless API (horizontal scaling ready) |
| **Scalability** | Support 10K registered users, 1K concurrent; DB read replicas later |
| **Security** | OWASP Top 10 covered; tokens HttpOnly; bcrypt/argon2; rate limiting; audit logs |
| **Reliability** | Soft deletes, idempotent refresh, transactional writes |
| **Maintainability** | Clean Architecture layers, typed frontend/backend, 80% code coverage |
| **Usability** | Responsive (mobile tablet desktop), skeletons, empty/error states, dark mode |
| **Observability** | Structured JSON logs, request IDs, health endpoint, audit trail |

### 1.6 Success Metrics

| Metric | Target |
|---|---|
| Code coverage (backend / frontend) | 80% / 70% |
| E2E critical flows passing in CI | 100% |
| Board page load P95 | < 1.5 s |
| API error rate | < 1% |
| Lighthouse accessibility + performance | ≥ 90 |
| First paint after login | < 1 s |
| Zero secrets in VCS | ✓ |
| Migration drift (alembic check) | 0 |

---

## 2. System Architecture

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Browser (SPA)                                  │
│   React 19 + TS + Vite · TanStack Query · Zustand · Tailwind · shadcn/ui   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ HTTPS (REST JSON, credentials)
┌──────────────────────────────────▼──────────────────────────────────────────┐
│                              Nginx (reverse proxy)                          │
│   TLS termination · static file serving (built SPA) · gzip · rate limit    │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────────────┐
│                        Flask API (backend, uWSGI/gunicorn)                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │
│  │ Controllers│ │ Services   │ │ Repos      │ │ Middleware │ │ Schemas   │ │
│  │ (blueprint)│ │ (business) │ │ (SQLAlchemy│ │ auth/log/  │ │ (ser/mar) │ │
│  │            │ │ logic      │ │ data access│ │ errors/rate│ │           │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └───────────┘ │
└──────┬──────────────────────┬──────────────────────┬────────────────────────┘
       │                      │                      │
┌──────▼──────┐     ┌─────────▼─────────┐   ┌────────▼─────────┐
│ PostgreSQL  │     │ Redis (cache/     │   │ MinIO (files;    │
│ (primary DB)│     │ rate-limit/queue) │   │  local fs in dev)│
└─────────────┘     └───────────────────┘   └──────────────────┘
```

**Frontend:** React 19 SPA. TanStack Query owns server-state cache; Zustand owns tiny UI state; React Router owns URL state. The SPA talks only to the Flask API via a typed API client; Nginx serves static assets and proxies `/api/*` to Flask.

**Backend:** Flask application factory pattern. Blueprints register controllers. Clean Architecture layering enforced by import rules (controllers may not import repositories directly; they must go through services).

**Storage:** PostgreSQL for relational data (users, projects, tasks…); MinIO (S3-compatible) for attachments in prod, local filesystem in dev behind a `StorageProvider` interface; Redis for rate-limit counters and (optionally) query cache.

### 2.2 Clean Architecture Layers (Backend)

```
┌─────────────────────────────────────────────┐
│  Controllers (presentation layer)           │  ← HTTP in/out, schemas, status codes
│  · parse request, validate via schemas      │     no business logic
│  · call service, map errors, serialize      │
├─────────────────────────────────────────────┤
│  Services (application/business layer)      │  ← all business rules, transactions,
│  · orchestration, permissions, audit calls  │     authz checks, events
├─────────────────────────────────────────────┤
│  Repositories (persistence layer)           │  ← SQLAlchemy queries only,
│  · thin data access, N+1-safe eager loading │     no HTTP, no business rules
├─────────────────────────────────────────────┤
│  Models / DB (infrastructure)               │  ← SQLAlchemy ORM models + Alembic
│  + StorageProvider (local/MinIO)            │     migrations
└─────────────────────────────────────────────┘
```

Rules: dependencies point inward; controllers → services → repositories; repositories return domain models (SQLAlchemy ORM objects) to services; services return DTOs/ORM objects to controllers which serialize with Marshmallow/Smorest schemas.

### 2.3 Authentication Flow (JWT Access + Refresh)

1. Client submits `POST /api/v1/auth/login` with email/password.
2. Server verifies credentials (argon2), issues **access token** (JWT, 15 min, in-memory on client) and **refresh token** (opaque, 7 days, stored hashed in `refresh_tokens` table), sets both as **HttpOnly, Secure, SameSite=Lax** cookies.
3. All `/api/v1/*` requests carry the access token cookie; a `JWTAuthMiddleware` validates signature, expiry, and audience.
4. On `401` (expired access), the API client calls `POST /api/v1/auth/refresh` with the refresh cookie; server validates, **rotates** (revokes old, issues new), and sets fresh cookies.
5. On logout, refresh token is revoked server-side; access token dies by expiry (15 min).
6. Refresh tokens are one-time-use: reuse detection triggers revocation of the token family (security hardening).

### 2.4 Request Lifecycle

```
Browser → Nginx → Flask WSGI
  1. Nginx: TLS, static fallback, gzip
  2. Flask before_request: request-id (X-Request-ID or UUID), start timer, DB session bind
  3. JWT middleware: decode token → current_user on flask.g (or anonymous)
  4. Rate limiter (Flask-Limiter + Redis)
  5. Router → controller
  6. Controller: schema load/validate (Marshmallow) → 422 on failure
  7. Service: business rules + permission checks → repo calls in transaction
  8. Audit/activity logging (same transaction)
  9. Controller: serialize response
  10. after_request: structured JSON log line (method, path, status, duration, user, request-id)
  11. Error handler: any exception → AppException map → envelope
```

### 2.5 File Upload Flow

1. Client validates file client-side (type, ≤10 MB), compresses images (canvas → WebP/JPEG, max 2000 px), then sends `multipart/form-data` to `POST /api/v1/tasks/{id}/attachments`.
2. Server re-validates MIME (magic bytes via `python-magic`), size, dimensions.
3. `StorageProvider.put()` → local filesystem (dev) or MinIO bucket (prod), generating an opaque object key (UUID).
4. Attachment row persisted with original name, content type, size, key; transaction commits; thumbnail generated server-side for images (Pillow).
5. Frontend uploads with progress; TanStack Query invalidates the attachment list query; optimistic UI inserts a "uploading" placeholder card.
6. Download: `GET /api/v1/attachments/{id}/download` streams the file (authenticated + authorized); presigned URLs are returned for prod storage (expiring 15 min) to offload bandwidth from Flask.

### 2.6 Caching Strategy (Redis)

| Cache | Key | TTL | Invalidation |
|---|---|---|---|
| Rate-limit counters | `rl:{ip}:{route}` | 60 s | automatic |
| Board payload | `board:{id}:{viewer_role}` | 30 s | task/column mutation events |
| Dashboard aggregates | `dash:{role}:{user_id}` | 60 s | on relevant mutation |
| Session/blacklist | `jwt:blacklist:{jti}` | until access expiry | on logout |
| Repeated-login lockout | `lockout:{email}` | 15 min | on success |

A `CacheProvider` abstraction keeps the service layer cache-agnostic; Redis is optional in dev (falls back to in-memory TTL dict) — only used where it yields measurable wins, avoiding the classic "cache-everything" anti-pattern.

### 2.7 Scalability Considerations

- **Stateless API:** JWT auth + DB-backed refresh tokens ⇒ scale Flask horizontally behind Nginx/HAProxy.
- **Read/write split:** future — read replicas for search/board/dashboard queries; SQLAlchemy `binds`.
- **Connection pooling:** SQLAlchemy pool (5–20) per worker; PgBouncer in staging+.
- **MinIO/S3** offloads file I/O from the API process; presigned URLs keep object traffic off Flask entirely.
- **Indexes** on every FK + hot filter column; composite indexes for board load and search.
- **Pagination everywhere** (offset for tables, cursor for activity feeds) to bound response sizes.
- **WebSocket/Future push** is out of scope; short-polling or SSE can be added behind the existing notification service without architectural change.

---

## 3. Folder Structure

### 3.1 Backend (Flask, layered)

```
backend/
├── app/
│   ├── __init__.py              # app factory, blueprint registration, error handlers
│   ├── config.py                # env-driven config (dev/staging/prod/test)
│   ├── extensions.py            # db, migrate, limiter, cors, jwt helpers
│   ├── controllers/             # blueprints (HTTP layer)
│   │   ├── auth.py  users.py  projects.py  teams.py  boards.py
│   │   ├── tasks.py  sprints.py  comments.py  labels.py  attachments.py
│   │   ├── notifications.py  dashboard.py  search.py  admin.py  health.py
│   ├── services/                # business logic layer
│   │   ├── auth_service.py  user_service.py  project_service.py
│   │   ├── task_service.py  board_service.py  sprint_service.py
│   │   ├── comment_service.py  attachment_service.py  search_service.py
│   │   ├── notification_service.py  dashboard_service.py  audit_service.py
│   ├── repositories/            # data access layer
│   │   ├── base.py  user_repo.py  project_repo.py  task_repo.py
│   │   ├── board_repo.py  sprint_repo.py  comment_repo.py
│   │   ├── notification_repo.py  activity_repo.py  attachment_repo.py
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── base.py  user.py  role.py  project.py  team.py  board.py
│   │   ├── task.py  sprint.py  comment.py  attachment.py  label.py
│   │   ├── notification.py  activity_log.py  audit_log.py
│   │   ├── refresh_token.py  email_verification.py
│   ├── schemas/                 # Marshmallow request/response schemas
│   │   ├── auth.py  user.py  project.py  task.py  board.py  sprint.py
│   │   ├── comment.py  attachment.py  notification.py  search.py
│   ├── middleware/              # WSGI middlewares + before/after hooks
│   │   ├── request_context.py   # request-id, timing, JSON logging
│   │   ├── auth.py              # JWT decode → flask.g.current_user
│   │   ├── rate_limit.py
│   ├── security/                # password hashing, tokens, rate limiting config
│   │   ├── password.py  tokens.py  permissions.py  headers.py
│   ├── storage/                 # storage abstraction
│   │   ├── base.py  local_storage.py  minio_storage.py  factory.py
│   ├── utils/                   # decorators (require_permission), pagination, csv
│   │   ├── decorators.py  pagination.py  csv_export.py  validation.py
│   │   ├── errors.py            # exception hierarchy
│   │   └── logging_config.py    # structured JSON logging setup
│   └── constants.py             # enums: Role, TaskStatus, Priority, NotificationType
├── migrations/                  # Alembic
│   ├── versions/                # revision scripts
├── seeds/                       # seed data (admin user, roles, demo project)
│   ├── seed_roles.py  seed_demo.py
├── tests/
│   ├── conftest.py              # app fixture, test DB, factories
│   ├── unit/  (services, security, utils)
│   ├── integration/ (API endpoints, DB)
│   ├── factories.py             # factory-boy factories
├── wsgi.py                      # entrypoint (gunicorn/uWSGI)
├── requirements.txt  requirements-dev.txt
├── pyproject.toml / setup.cfg   # ruff, mypy, pytest config
├── Dockerfile
└── .env.example
```

### 3.2 Frontend (React 19 + Vite + TS)

```
frontend/
├── src/
│   ├── main.tsx                 # entry, providers (QueryClient, Router, Theme)
│   ├── app/
│   │   ├── router.tsx           # route table (lazy-loaded pages)
│   │   ├── providers.tsx
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives (button, input, dialog…)
│   │   ├── layout/              # AppLayout, Sidebar, Navbar, PageHeader, UserMenu
│   │   ├── data-display/        # DataTable, DataTableColumnHeader, Card, Badge,
│   │   │                        # Avatar, Tooltip, Timeline, StatCard, EmptyState
│   │   ├── forms/               # FormField, Input, Select, DatePicker,
│   │   │                        # RichTextEditor, FileUpload, Autocomplete
│   │   ├── feedback/            # Dialog, Drawer, Toast, ConfirmDialog, Alert,
│   │   │                        # Skeleton, ErrorBoundary, Spinner
│   │   ├── navigation/          # Pagination, Breadcrumb, Tabs
│   │   ├── search/              # SearchInput, FilterPanel, SavedFilters, ColumnFilter
│   │   ├── tasks/               # TaskCard, TaskRow, TaskDialog, BoardColumn
│   │   ├── board/               # KanbanBoard, DragDropLayer
│   │   ├── dashboard/           # KpiCard, BurndownChart, VelocityChart, CumulativeFlow
│   │   ├── notifications/       # NotificationBell, NotificationDropdown
│   │   ├── comments/            # CommentList, CommentEditor, MentionInput
│   │   └── projects/            # ProjectCard, ProjectMembers, TeamBadge
│   ├── pages/                   # route-level pages (see §9)
│   │   ├── auth/ login.tsx register.tsx forgot-password.tsx reset-password.tsx
│   │   ├── dashboard/dashboard.tsx
│   │   ├── projects/ project-list.tsx project-detail.tsx
│   │   ├── board/ board.tsx backlog.tsx sprint.tsx
│   │   ├── tasks/ task-detail.tsx task-create.tsx task-edit.tsx
│   │   ├── teams/ teams.tsx team-detail.tsx
│   │   ├── profile/ profile.tsx settings.tsx
│   │   ├── notifications/notifications.tsx
│   │   └── admin/ admin-panel.tsx
│   ├── hooks/                   # useDebounce, useAuth, usePermissions, useSocket…
│   ├── services/                # typed API clients (one per resource) + api client core
│   │   ├── api.ts               # axios/fetch wrapper: refresh on 401, request-id
│   │   ├── auth.ts  projects.ts  tasks.ts  boards.ts  sprints.ts  search.ts
│   ├── stores/                  # Zustand: ui-store (sidebar, theme), board-draft-store
│   ├── types/                   # shared TypeScript domain types + api types
│   ├── lib/                     # utils, formatters, constants, validators
│   │   ├── utils.ts  format.ts  constants.ts
│   ├── schemas/                 # Zod schemas mirroring backend validation
│   ├── tests/
│   │   ├── components/          # RTL component tests
│   │   ├── hooks/
│   │   └── e2e/                 # Playwright specs (critical flows)
│   ├── index.css                # Tailwind entry
├── public/
├── playwright.config.ts
├── vite.config.ts  tailwind.config.ts  tsconfig.json  eslint.config.js
├── Dockerfile  nginx.conf
└── package.json
```

### 3.3 Shared Types

A `shared/` or versioned `/openapi.json` artifact generated from the backend (flask-smorest OpenAPI) is committed and used to (a) validate backend responses in tests and (b) drive frontend types/validation parity. Frontend types are hand-maintained in `src/types/` and cross-checked by CI script that diffs against OpenAPI schemas to prevent drift.

---

## 4. Database Design

### 4.1 ERD

```
users ─┬─< user_roles >─┬─ roles ─< role_permissions >─┬─ permissions
       │                │                              │
       │                └──────────────────────────────┘
       ├─< refresh_tokens ── users
       ├─< email_verifications
       ├─< project_members >─┬─ projects ─< boards ─< columns
       │                     │             └─< tasks ─< task_assignees >─ users
       │                     │                        ├─< task_labels >─< labels
       │                     │                        ├─< comments >─ users
       │                     │                        ├─< attachments
       │                     │                        ├─< activity_log
       │                     │                        └─┬─< tasks (parent/child)
       │                     │< sprints ─┘
       │< team_members >─< teams
       ├─< notifications
       ├─< saved_filters
       └─< audit_log (actor)
```

### 4.2 Tables (full DDL-level specification)

Conventions for every table: `id BIGSERIAL PRIMARY KEY`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `deleted_at TIMESTAMPTZ NULL` (soft delete, filtered via `is_not_deleted()` query helper), audit columns `created_by`, `updated_by` where meaningful. Timestamps kept in UTC.

#### users
| Column | Type | Constraints |
|---|---|---|
| id | bigint PK | auto |
| email | varchar(255) | NOT NULL, UNIQUE (lowercase, index) |
| password_hash | varchar(255) | NOT NULL |
| first_name / last_name | varchar(100) | NOT NULL |
| avatar_key | varchar(255) | NULL (storage object key) |
| bio | text | NULL |
| is_active | boolean | NOT NULL DEFAULT true |
| is_email_verified | boolean | NOT NULL DEFAULT false |
| last_login_at | timestamptz | NULL |
| failed_login_count | smallint | DEFAULT 0 |
| locked_until | timestamptz | NULL |
| deleted_at | timestamptz | NULL |

Indexes: `uq_users_email` (unique), `ix_users_last_login_at`.

#### roles
| Column | Type | Constraints |
|---|---|---|
| id | smallint PK | |
| code | varchar(50) | UNIQUE ('admin','project_manager','team_lead','developer','viewer') |
| name | varchar(100) | NOT NULL |
| description | varchar(255) | NULL |

#### permissions
| Column | Type | Constraints |
|---|---|---|
| id | smallint PK | |
| code | varchar(100) | UNIQUE, e.g. `task.create`, `project.delete` |
| name / description | varchar | NOT NULL / NULL |

#### role_permissions (join)
`role_id FK→roles`, `permission_id FK→permissions`, PK (role_id, permission_id). Seeded at migration time (data migration), extensible in Admin UI.

#### user_roles (join: global platform roles)
`user_id FK→users`, `role_id FK→roles`, PK (user_id, role_id). A user may hold several global roles; `admin` implies everything (role hierarchy, §7).

#### projects
| Column | Type | Constraints |
|---|---|---|
| id | bigint PK | |
| key | varchar(10) | NOT NULL, UNIQUE ('PROJ') — used in task keys `PROJ-123` |
| name | varchar(150) | NOT NULL |
| description | text | NULL |
| owner_id | bigint FK→users | NOT NULL |
| status | enum('active','archived') | NOT NULL DEFAULT 'active' |
| start_date / end_date | date | NULL |
| deleted_at | timestamptz | NULL |

Indexes: `uq_projects_key`, `ix_projects_owner_id`.

#### project_members (join with role per project)
| Column | Type | Constraints |
|---|---|---|
| project_id | FK→projects | PK part |
| user_id | FK→users | PK part |
| role_id | FK→roles | NOT NULL (project-scoped role) |
| joined_at | timestamptz | DEFAULT now() |

Unique (project_id, user_id). CHECK: role_id NOT IN ('admin') enforced at service layer (platform role only).

#### teams
`id`, `name varchar(100) NOT NULL`, `description`, `project_id FK→projects NOT NULL` (teams belong to a project), `lead_id FK→users NULL`, `deleted_at`. Indexes: `ix_teams_project_id`.

#### team_members (join)
`team_id FK`, `user_id FK`, PK (team_id, user_id), `joined_at`.

#### sprints
| Column | Type | Constraints |
|---|---|---|
| id | bigint PK | |
| project_id | FK→projects | NOT NULL |
| name | varchar(100) | NOT NULL |
| goal | text | NULL |
| status | enum('planned','active','completed') | NOT NULL DEFAULT 'planned' |
| start_date / end_date | date | NULL |
| deleted_at | timestamptz | NULL |

Indexes: `ix_sprints_project_id_status`. CHECK: only one active sprint per project enforced at service layer (partial unique index `UNIQUE (project_id) WHERE status='active'` as belt-and-braces).

#### boards
| Column | Type | Constraints |
|---|---|---|
| id | bigint PK | |
| project_id | FK→projects | NOT NULL |
| name | varchar(100) | NOT NULL DEFAULT 'Board' |
| is_default | boolean | NOT NULL DEFAULT false |
| deleted_at | timestamptz | NULL |

Indexes: `ix_boards_project_id`. One default board per project (service-enforced).

#### columns
| Column | Type | Constraints |
|---|---|---|
| id | bigint PK | |
| board_id | FK→boards | NOT NULL |
| name | varchar(100) | NOT NULL |
| position | int | NOT NULL |
| wip_limit | smallint | NULL (optional Kanban WIP limit) |
| color | varchar(20) | NULL |
| deleted_at | timestamptz | NULL |

Indexes: `ix_columns_board_id`, UNIQUE (board_id, position).

#### tasks
| Column | Type | Constraints |
|---|---|---|
| id | bigint PK | |
| project_id | FK→projects | NOT NULL |
| key | varchar(20) | NOT NULL, UNIQUE (e.g. `PROJ-123`) |
| title | varchar(200) | NOT NULL |
| description | text | NULL (rich text HTML from editor, sanitized) |
| status | enum('todo','in_progress','in_review','done') | NOT NULL DEFAULT 'todo' |
| priority | enum('low','medium','high','urgent') | NOT NULL DEFAULT 'medium' |
| type | enum('task','bug','story','epic') | NOT NULL DEFAULT 'task' |
| story_points | numeric(4,1) | NULL, CHECK >= 0 |
| due_date | timestamptz | NULL |
| estimate_hours | numeric(6,2) | NULL CHECK >= 0 |
| column_id | FK→columns | NULL (position on board) |
| board_position | int | NULL |
| sprint_id | FK→sprints | NULL |
| parent_id | FK→tasks | NULL (sub-task hierarchy, self-FK) |
| creator_id / assignee_id | FK→users | NOT NULL / NULL |
| order_index | int | NOT NULL DEFAULT 0 |
| deleted_at | timestamptz | NULL |

Indexes: `uq_tasks_key`, `ix_tasks_project_id`, `ix_tasks_sprint_id`, `ix_tasks_column_id_position`, `ix_tasks_status`, `ix_tasks_assignee_id`, `ix_tasks_due_date`, composite `ix_tasks_project_status_priority`.

#### task_assignees (join — supports multi-assignee, optional beyond primary assignee)
`task_id FK`, `user_id FK`, PK (task_id, user_id).

#### labels
`id`, `project_id FK NOT NULL`, `name varchar(50) NOT NULL`, `color varchar(20)`, UNIQUE (project_id, name).

#### task_labels (join)
`task_id FK`, `label_id FK`, PK (task_id, label_id).

#### comments
| Column | Type | Constraints |
|---|---|---|
| id | bigint PK | |
| task_id | FK→tasks | NOT NULL |
| author_id | FK→users | NOT NULL |
| body | text | NOT NULL |
| parent_id | FK→comments | NULL (threaded replies) |
| mentions | jsonb | NULL (parsed @user ids) |
| edited_at | timestamptz | NULL |
| deleted_at | timestamptz | NULL |

Indexes: `ix_comments_task_id_created_at`, `ix_comments_author_id`.

#### attachments
| Column | Type | Constraints |
|---|---|---|
| id | bigint PK | |
| task_id | FK→tasks | NOT NULL |
| uploader_id | FK→users | NOT NULL |
| original_name | varchar(255) | NOT NULL |
| storage_key | varchar(255) | NOT NULL |
| content_type | varchar(100) | NOT NULL |
| size_bytes | bigint | NOT NULL CHECK >= 0 |
| thumbnail_key | varchar(255) | NULL |
| deleted_at | timestamptz | NULL |

Indexes: `ix_attachments_task_id`.

#### notifications
| Column | Type | Constraints |
|---|---|---|
| id | bigint PK | |
| user_id | FK→users | NOT NULL (recipient) |
| type | enum('task_assigned','mentioned','deadline_approaching','status_changed','team_invite','comment') | NOT NULL |
| title | varchar(255) | NOT NULL |
| body | text | NOT NULL |
| link | varchar(255) | NULL (frontend route, e.g. `/tasks/PROJ-123`) |
| is_read | boolean | NOT NULL DEFAULT false |
| is_archived | boolean | NOT NULL DEFAULT false |
| read_at | timestamptz | NULL |
| deleted_at | timestamptz | NULL |

Indexes: `ix_notifications_user_read_created` (composite for unread count), `ix_notifications_user_created`.

#### activity_log (user-visible timeline)
| Column | Type | Constraints |
|---|---|---|
| id | bigint PK | |
| project_id | FK | NOT NULL |
| actor_id | FK→users | NOT NULL |
| entity_type | varchar(50) | NOT NULL (task/comment/attachment…) |
| entity_id | bigint | NOT NULL |
| action | varchar(50) | NOT NULL (created/updated/moved/deleted…) |
| changes | jsonb | NULL (before/after diff for fields) |
| created_at | timestamptz | NOT NULL |

Indexes: `ix_activity_project_created`, `ix_activity_entity`.

#### audit_log (admin/security)
| Column | Type | Constraints |
|---|---|---|
| id | bigint PK | |
| actor_id | FK→users | NULL (anonymous) |
| action | varchar(100) | NOT NULL |
| resource_type / resource_id | varchar(50) / bigint | NOT NULL / NULL |
| ip_address | inet | NULL |
| user_agent | varchar(255) | NULL |
| request_id | varchar(64) | NULL |
| details | jsonb | NULL |
| created_at | timestamptz | NOT NULL |

Indexes: `ix_audit_created`, `ix_audit_actor`, `ix_audit_action`.

#### refresh_tokens
| Column | Type | Constraints |
|---|---|---|
| id | uuid PK | |
| user_id | FK→users | NOT NULL |
| token_hash | varchar(64) | NOT NULL UNIQUE (SHA-256 of token) |
| family_id | uuid | NOT NULL (rotation family) |
| expires_at | timestamptz | NOT NULL (7 days) |
| revoked_at | timestamptz | NULL |
| replaced_by | uuid FK self | NULL |
| ip / user_agent | varchar / varchar | NULL (context) |
| created_at | timestamptz | NOT NULL |

Indexes: `ix_refresh_user_expires`, `uq_refresh_token_hash`. Reuse of a revoked token revokes the whole family.

#### email_verifications
`id uuid PK`, `user_id FK NOT NULL`, `token_hash varchar(64) UNIQUE NOT NULL`, `expires_at NOT NULL (24 h)`, `verified_at NULL`, `created_at`.

#### saved_filters
`id`, `user_id FK NOT NULL`, `name varchar(100) NOT NULL`, `filter_json jsonb NOT NULL` (serialized filter criteria), `is_default boolean DEFAULT false`, `deleted_at`, UNIQUE (user_id, name).

### 4.3 Relationships & Normalization Notes

- All M:N relationships materialized as join tables with composite PKs (3NF).
- `tasks` self-references for subtasks; `comments` self-references for threading.
- Project-scoped vs platform-scoped roles are distinct (`project_members.role_id` vs `user_roles.role_id`), avoiding polymorphic-association anti-pattern.
- **Soft delete strategy:** `deleted_at` on core entities; repositories ship a `base` query filter; unique keys (email, task key, project key) may collide on delete → resolved by key regeneration (`PROJ` → `PROJ-1` or appending suffix) or hard-deleting only truly-gone rows via background cleanup job. Restore is a first-class service operation (undo support, §26).
- JSONB used only where shape is genuinely dynamic (audit details, filter JSON); core fields stay relational.

### 4.4 Migration Strategy

- Alembic revision-per-feature; every change is additive (new columns nullable, then backfill, then constraint) to keep zero-downtime path.
- Data migrations (role/permission seeds) live in Alembic `data` migrations.
- CI runs `alembic check` + apply on a fresh test DB.

---

## 5. API Design

### 5.1 Conventions

- Base path: `/api/v1` (versioned from day one — avoids future breakage).
- REST resources: nouns, plural; nested only for intrinsic ownership (`/tasks/{id}/comments`); actions as explicit sub-resources (`/auth/login`).
- Response envelope (stable):
```json
{ "data": { ... }, "meta": { "pagination": {...} }, "request_id": "..." }
```
- Error envelope:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": { "field": ["msg"] } }, "request_id": "..." }
```
- Status codes: `200` OK, `201` Created, `204` No Content (delete), `400` Bad Request, `401` Unauthenticated, `403` Forbidden, `404` Not Found, `409` Conflict, `422` Validation Error, `429` Too Many Requests, `500` Internal Error.
- **Pagination:** offset/limit for tables (`?page=1&page_size=25`, `meta.pagination.total`); cursor (`?cursor=<opaque>&limit=25`) for activity feeds and notifications to survive inserts/deletes.
- **Sorting:** `?sort=-created_at` (leading `-` for desc), whitelist of sortable columns per resource (reject anything else with 422).
- **Filtering:** `?status=done&priority=high,urgent&assignee_id=12&sprint_id=4&label_id=1&due_before=2026-08-01&due_after=...&q=text`. Whitelist per endpoint.
- Auth: all endpoints except `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/health` require valid access token.

### 5.2 Endpoints (per resource)

#### Auth
| Method | Endpoint | Auth | Body | Success | Errors |
|---|---|---|---|---|---|
| POST | `/auth/register` | ✗ | email, password, first_name, last_name | 201 user | 400, 409, 422 |
| POST | `/auth/login` | ✗ | email, password | 200 user+roles (cookies set) | 400, 401, 422, 429 |
| POST | `/auth/refresh` | refresh cookie | — | 200 (rotates both tokens) | 401 |
| POST | `/auth/logout` | ✓ | — | 204 | 401 |
| POST | `/auth/forgot-password` | ✗ | email | 204 (always 204 — no user enumeration) | 429 |
| POST | `/auth/reset-password` | token in body | token, new_password | 204 | 400, 422 |
| POST | `/auth/verify-email` | token | token | 200 | 400, 410 |

#### Users
| Method | Endpoint | Body | Success | Notes |
|---|---|---|---|---|
| GET | `/users/me` | — | 200 | current user + roles + permissions |
| PATCH | `/users/me` | first_name, last_name, avatar, bio | 200 | self-service |
| PUT | `/users/me/password` | current_password, new_password | 204 | |
| GET | `/users` | — | 200 list | Admin only |
| PATCH | `/users/{id}` | role_id, is_active | 200 | Admin only |
| DELETE | `/users/{id}` | — | 204 | Admin only (soft delete) |

#### Projects
| Method | Endpoint | Body | Success |
|---|---|---|---|
| GET | `/projects` | — | 200 (filter: mine, archived; sort; paginated) |
| POST | `/projects` | key, name, description | 201 |
| GET | `/projects/{id}` | — | 200 |
| PATCH | `/projects/{id}` | name, description, status | 200 |
| DELETE | `/projects/{id}` | — | 204 (soft delete) |
| GET | `/projects/{id}/members` | — | 200 |
| POST | `/projects/{id}/members` | user_id, role_id | 201 |
| DELETE | `/projects/{id}/members/{user_id}` | — | 204 |

#### Teams
`GET/POST /teams`, `GET/PATCH/DELETE /teams/{id}`, `POST /teams/{id}/members`, `DELETE /teams/{id}/members/{user_id}` — all project-scoped; create requires project manager+ on that project.

#### Boards & Columns
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/projects/{id}/boards` | list incl. columns with tasks summary counts |
| POST | `/boards` | project_id, name |
| PATCH / DELETE | `/boards/{id}` | |
| POST | `/boards/{id}/columns` | name, position, wip_limit |
| PATCH / DELETE | `/columns/{id}` | |
| PUT | `/columns/{id}/reorder` | ordered column ids |
| PUT | `/boards/{id}/tasks/reorder` | ordered task ids per column (bulk move endpoint used by drag-drop) |

#### Tasks
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/projects/{id}/tasks` | advanced filters, sort, pagination |
| POST | `/tasks` | project_id, title, type, priority, assignee_id(s), labels, sprint_id, story_points, due_date, description, parent_id |
| GET | `/tasks/{id}` | 200 with comments, attachments, assignees, labels, activity |
| PATCH | `/tasks/{id}` | partial update (PATCH semantics; returns full task) |
| DELETE | `/tasks/{id}` | 204 soft delete |
| POST | `/tasks/{id}/move` | column_id, board_position, sprint_id (used by drag-drop; single canonical mutation) |
| POST | `/tasks/{id}/duplicate` | 201 |
| POST | `/tasks/bulk` | actions: delete, move, assign, status, label — ids[] + payload (409 if any invalid) |
| GET | `/tasks/export.csv` | returns `text/csv` with Content-Disposition |
| GET | `/tasks/{id}/history` | activity timeline |

#### Sprints
`GET /projects/{id}/sprints`, `POST /sprints`, `GET/PATCH/DELETE /sprints/{id}`, `POST /sprints/{id}/start`, `POST /sprints/{id}/complete` (moves incomplete tasks back to backlog).

#### Comments
`GET /tasks/{id}/comments` (cursor paginated), `POST /tasks/{id}/comments` (body with mentions), `PATCH /comments/{id}`, `DELETE /comments/{id}`.

#### Labels
`GET/POST /projects/{id}/labels`, `PATCH/DELETE /labels/{id}`.

#### Attachments
`POST /tasks/{id}/attachments` (multipart), `GET /attachments/{id}/download` (stream/presigned), `GET /attachments/{id}/thumbnail`, `DELETE /attachments/{id}` (removes storage object + row).

#### Notifications
`GET /notifications?unread_only=true&cursor=…`, `GET /notifications/unread-count`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, `POST /notifications/{id}/archive`, `PATCH /notifications/preferences`.

#### Dashboard
`GET /dashboard` (role-aware aggregation), `GET /dashboard/velocity?project_id=`, `GET /dashboard/burndown?sprint_id=`, `GET /dashboard/cumulative-flow?project_id=`, `GET /dashboard/my-tasks`.

#### Search
`GET /search?q=…&type=task,project&project_id=…&filters=…&page=1` — global full-text search with `tsvector` (see §12).

#### Admin
`GET /admin/metrics`, `GET /admin/users`, `GET /admin/audit-logs?filters`, `GET /admin/roles` — Admin only.

#### System
`GET /health` (liveness: db, storage ping), `GET /health/ready` (readiness incl. Redis/MinIO).

---

## 6. Authentication

### 6.1 Strategy

- **Access token:** signed JWT (HS256/RS256; RS256 with keypair for prod), 15-minute lifetime, claims: `sub` (user id), `role_codes`, `permissions` (or a permission version hash), `jti`, `iat`, `exp`, `aud` ("pms-api"). Held in memory on the client (module variable), refreshed transparently.
- **Refresh token:** 256-bit random opaque string, stored **SHA-256 hashed** in `refresh_tokens` with 7-day expiry, **rotation on every use** (new token issued, old revoked, same `family_id`). Reuse of an already-revoked token ⇒ revoke entire family + alert (theft detection).
- **Cookie transport:** access + refresh set as cookies: `HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth` for refresh, `Path=/api` for access; `__Host-` prefix for hard-binding in prod (mitigates subdomain attacks).
- **Password hashing:** Argon2id (cost tuned ~50 ms) via `argon2-cffi`; bcrypt as fallback profile in config. Salt automatic. Rehash-on-login when parameters advance.
- **Session management:** server-side DB records enable revocation (logout, password change ⇒ revoke all families), and per-device listing/revoke in Settings.
- **Logout:** revokes current family + blacklists access `jti` in Redis until natural expiry.
- **Account lockout:** 5 failed logins ⇒ lock 15 min (Redis counter per email+IP); exponential backoff after; `failed_login_count` persisted.
- **Forgot password:** generate 30-min single-use token (hashed in DB), email link → reset form; token invalid after use; password change revokes all refresh tokens.
- **Email verification (optional abstraction):** `EmailVerificationProvider` interface — SMTP mailer in prod, console/file logger in dev; verification tokens hashed, 24 h expiry; unverified users can log in but see a verify banner (configurable).
- **Middleware:** `@require_auth` decorator populates `flask.g.current_user` (from JWT, DB lookup cached per request); `@require_permission("task.create")` chains authz (§7).

---

## 7. Authorization (RBAC)

### 7.1 Model

Two scopes combined with **AND** semantics:
1. **Platform roles** (`user_roles`): Admin (full), or standard users.
2. **Project roles** (`project_members.role_id`): Project Manager, Team Lead, Developer, Viewer per project.
A user with zero project memberships sees only projects where they are a member (or are a team member whose team belongs to the project).

### 7.2 Permissions Matrix (platform × project scopes)

Legend: C=Create, E=Edit, V=View, D=Delete, A=Admin.

| Resource | Admin | Proj. Manager | Team Lead | Developer | Viewer |
|---|---|---|---|---|---|
| Users | C E V D | V | V | V | V |
| Roles/Permissions | A | — | — | — | — |
| Projects | C E V D | C E V D | V | V | V |
| Project members | A | C E V D | V | V | V |
| Teams | A | C E V D | V | V | V |
| Boards/Columns | A | C E V D | C E V D | V | V |
| Sprints | A | C E V D | C E V D | V | V |
| Tasks | A | C E V D | C E V D | C E V | V |
| Comments | A | C E V D | C E V D | C E V | V |
| Attachments | A | C E V D | C E V D | C E V | V |
| Labels | A | C E V D | C E V D | C E V | V |
| Notifications (own) | C E V | C E V | C E V | C E V | C E V |
| Saved filters (own) | C E V D | C E V D | C E V D | C E V D | C E V D |

### 7.3 Ownership Rules

- Tasks/comments/attachments: creator retains delete rights even if project role is only Developer (`creator_id = user OR role >= team_lead`).
- Project deletion: Admin or project owner; requires project archived first (safety rule).
- Member removal: cannot remove project owner; cannot demote owner.
- Data scoping: all queries filtered by membership (`project_ids(user)`), enforced in repository layer as a mandatory scope — prevents "IDOR" via route injection.

### 7.4 Role Hierarchy & Extensibility

`admin > manager > team_lead > developer > viewer`; a permission check passes if the user's highest role for the resource satisfies the required level OR an explicit permission code (`task.create`) is granted via `role_permissions`. Future: fine-grained permission codes without code changes — the check engine reads the matrix from DB, services never hard-code role names (constant set in `constants.py` only for seed).

---

## 8. Validation Strategy

Layered defense — validate at every boundary:

| Layer | Tool | Responsibility |
|---|---|---|
| Frontend form | Zod + React Hook Form | instant UX feedback, input normalization |
| Frontend API | Zod (`api.safeParse`) | fail fast on contract drift, typed errors |
| Backend schema | Marshmallow (flask-smorest) | field types, required, length, formats → 422 with field-level details |
| Service layer | explicit business rules | uniqueness, state machines (can't complete a sprint with open tasks — configurable), permission rules, WIP limits |
| DB | constraints | NOT NULL, UNIQUE, CHECK (story_points >= 0, size_bytes >= 0), FKs, partial unique active sprint |
| File validation | server-side | magic-byte MIME check, ≤ 10 MB, image dimension limits, extension whitelist |
| Sanitization | bleach (server) / sanitize-html (client) | strip dangerous HTML from rich-text description and comment bodies |
| Injection | ORM parameterized queries | SQL injection structurally prevented; `text()` disabled outside audit tooling |
| XSS | React escaping + sanitized HTML + CSP | no `dangerouslySetInnerHTML` outside sanitizer wrapper |
| CSRF | SameSite=Lax cookies + double-submit custom header `X-Requested-With` check on mutating methods; CSRF not an issue for pure Bearer flows — we document the trade-off | |

Validation rules shared between frontend (Zod) and backend are kept in sync via a schema manifest checked in CI (OpenAPI diff), with explicit test asserting parity for: email format, password policy (min 8, 1 upper, 1 lower, 1 digit), title lengths, project key format `^[A-Z][A-Z0-9]{1,9}$`.

---

## 9. UI Pages

Every page lists: purpose, components, API calls, loading (skeleton), error, empty, permissions, responsive behavior.

| Page | Purpose / Components / API | States | Permissions / Responsive |
|---|---|---|---|
| **Login** | Auth form. `AuthForm`, `Input`, `Button`, `Toast`. `POST /auth/login`. | Skeleton: none (form). Error: invalid creds toast + inline. | Public. Centered card; stacks on mobile. |
| **Register** | `POST /auth/register` → email verify banner. | Inline field errors (422 mapped). | Public. |
| **Forgot Password** | Email form → always-success screen. `POST /auth/forgot-password`. | Submitted state; no enumeration. | Public. |
| **Dashboard** | Role-aware: KPI cards, burndown/velocity/cumulative charts (Recharts), My Tasks table, recent activity timeline. `GET /dashboard*`. | Skeleton: chart + card skeletons. Error: retry card. Empty: "No projects yet → create". | All authed; content varies by role. Charts → stacked cards on mobile. |
| **Project List** | `ProjectCard` grid, search input, filter (mine/archived), create dialog. `GET /projects`. | Card skeletons ×6. Error toast + retry. Empty: CTA to create. | All members (list = scoped by membership); create requires manager+. Grid 1/2/3 cols responsive. |
| **Project Detail** | Tabs: Overview / Board / Backlog / Sprints / Members / Settings. Header with key, members avatars, stats. `GET /projects/{id}`, members, sprints. | Page skeleton; tab skeletons. Empty states per tab. | Members view; mutations gated by project role. Tabs collapse to select on mobile. |
| **Board View** | `KanbanBoard`, `BoardColumn`, `TaskCard` drag-drop (dnd-kit), column WIP badges, add-column menu, filter panel (assignee/label/priority), quick-create task. `GET /projects/{id}/tasks?column=`, `PUT /boards/{id}/tasks/reorder`, `POST /tasks`. | Board skeleton (column silhouettes); per-column empty "drop tasks here". | Members view; drag+edit require developer+. Columns horizontally scrollable on mobile; drag replaced by "Move to…" menu on touch. |
| **Backlog View** | Task list grouped by status/epic, sprint quick-assign, bulk ops (multi-select, move to sprint). `GET /tasks?backlog=true`. | Table skeleton; empty backlog message. | View all; bulk ops require developer+. |
| **Sprint View** | Sprint header (progress bar, dates, goal), task list by status, velocity mini-chart, sprint actions (start/complete). `GET /sprints/{id}`, tasks. | Sprint skeleton; empty sprint CTA "Add from backlog". | Team lead+ can edit/start/complete; developers move their tasks. |
| **Task Detail** | Right-side details panel: description (rich text), details form (assignees, labels, sprint, priority, dates, story points), comments timeline (threaded, mentions), attachments grid, activity timeline. `GET /tasks/{id}`, `PATCH /tasks/{id}`, `POST comments`, `POST attachments`. | Task skeleton; comments skeleton; error boundary for attachment render. Empty: "No comments yet". | View all members; edit gate developer+; commenters can edit own comments. Drawer on mobile (slide-over). |
| **Task Create/Edit** | Full page or dialog: `TaskForm` (Zod), `Autocomplete` assignee, `LabelPicker`, `DatePicker`, `RichTextEditor`, `FileUpload`. `POST /tasks`, `PATCH /tasks/{id}`. | Submit spinner; field errors inline; network error banner (draft preserved in Zustand). | Developer+. |
| **Team Management** | Team list per project, member chips, add/remove dialogs, lead assignment. `GET/POST /teams…`. | Table skeletons; empty "create first team". | Manager+ on project; admin globally. |
| **User Profile** | Avatar upload, name/bio edit, change password, sessions list (revoke). `GET /users/me`, `PATCH`, `PUT password`, session endpoints. | Form skeletons; inline validation. | Self only. |
| **Settings** | Notification preferences, theme (light/dark/system), locale, saved filter management. `PATCH /notifications/preferences`. | Skeleton switches; optimistic toggles. | Self. |
| **Notifications** | Page + bell dropdown: filter unread/archive, mark read, bulk actions. `GET /notifications?cursor=`, `POST read-all`. | Skeleton list; empty state "You're all caught up". | Self. |
| **Search Results** | Global search results with type tabs (Tasks/Projects/Users), highlighted matches, filter chips, saved filters sidebar. `GET /search?q=`. | Skeleton rows; "No results for …" empty; debounce indicator. | Authed; scoped by membership. |
| **Admin Panel** | User table (activate/deactivate, roles), platform metrics, audit log viewer with filters, storage usage. `GET /admin/*`. | Table skeletons; empty "no log entries". | Admin only. |

---

## 10. Components

Component inventory with hierarchy and composition rules (shadcn/ui base + domain wrappers):

- **Layout:** `AppLayout` (sidebar + navbar + content outlet, route-level lazy wrapper), `Sidebar` (project nav, collapsed state persisted in Zustand), `Navbar` (breadcrumb, global search trigger, notification bell, user menu), `PageHeader` (title, actions slot, description).
- **Data display:** `DataTable<T>` (TanStack Table wrapper: sorting, column visibility, filters, virtualization hook, CSV export action), `DataTableColumnHeader`, `Card`/`CardHeader`/`CardContent`, `Badge` (status/priority/type with color maps), `Avatar` (initials/image), `Tooltip`, `Timeline` (activity log), `StatCard`, `EmptyState` (icon + title + description + CTA).
- **Forms:** `FormField` (label + error + description wrapper), `Input`, `Select`, `DatePicker`, `RichTextEditor` (TipTap, sanitized), `FileUpload` (drag-drop, validation, progress, thumbnail preview), `Autocomplete` (debounced user search), `LabelPicker`, `PriorityPicker`.
- **Feedback:** `Dialog`, `Drawer`, `Toast` (toast provider, success/error/info), `ConfirmDialog` (destructive confirmations), `Alert`, `Skeleton` primitives + `PageSkeleton`, `ErrorBoundary` (per-route + per-widget, fallback with retry), `Spinner`.
- **Navigation:** `Pagination` (offset) and `LoadMore` (cursor), `Breadcrumb`, `Tabs`.
- **Search:** `SearchInput` (debounced), `FilterPanel` (multi-criteria), `SavedFilters` (save/load/delete), `ColumnFilter` (per-column quick filter on board/table).
- **Board:** `KanbanBoard` (dnd-kit context), `BoardColumn` (wip badge, scroll container), `TaskCard` (draggable, quick actions, labels/avatars), `DragOverlay`.
- **Comments:** `CommentList`, `CommentItem` (threaded), `CommentEditor` (mention autocomplete).
- **Notifications:** `NotificationBell`, `NotificationDropdown` (unread badge, virtualized).
- **Dashboard:** `KpiCard`, `BurndownChart`, `VelocityChart`, `CumulativeFlowChart` (Recharts wrappers).

Design rules: all domain components consume only types from `src/types`; all API access through hooks (`useTasks`, `useBoard`…) that wrap TanStack Query; presentational components are pure and testable in isolation.

---

## 11. State Management

Four explicit state categories — each with its tool and rationale:

| State | Tool | Why | Examples |
|---|---|---|---|
| **Server state** | TanStack Query | caching, deduplication, background refetch, staleTime/gcTime tuning, optimistic updates, retries, pagination helpers — reimplementing this is where apps rot | tasks, projects, boards, comments, notifications, dashboard |
| **Client/UI state** | Zustand | tiny, selector-based, no boilerplate, works outside React (e.g., router loaders), devtools support | sidebar open, theme, board column draft widths, search input draft, "unsaved changes" flags |
| **Form state** | React Hook Form + Zod | uncontrolled inputs → minimal re-renders; schema-based errors; dirty tracking for "unsaved changes" guards | task form, filters, settings |
| **URL state** | React Router searchParams | shareable, back-button-correct, survives refresh; single source of truth for filters/pagination/tabs | `?status=&assignee=&page=`, board view, search query |

Rationale: TanStack Query replaces any need for a server-state store (Redux-style); Zustand replaces context-prop-drilling for ephemeral UI; URL state prevents duplication (never mirror URL filters in a store). Key TanStack settings: `staleTime 30 s` for list queries, `5 min` for static refs (labels/users), `gcTime 15 min`, optimistic mutation for drag-drop with rollback on error, and targeted `invalidateQueries` after mutations (`["tasks", projectId]`).

---

## 12. Search

### 12.1 Global Search (tasks + projects)

- Full-text search via PostgreSQL `tsvector` column (English config) maintained by triggers on `tasks.title/description/key` and `projects.name/description/key`; query rewritten with `websearch_to_tsquery` (handles quoting, AND/OR, prefix `*`).
- Ranking with `ts_rank` + recency factor; highlight snippets returned (`ts_headline`) for result previews.
- Debounced 300 ms input; requests cancelled on new keystroke (AbortController); results server-paginated (offset, page size 20); grouped tabs (Tasks | Projects | Users) with counts.
- Membership scoping: search never returns entities outside user's project set (joined filter mandatory).

### 12.2 Column/List Filtering

- Filter panel builds query object → URL state → `GET /projects/{id}/tasks?filters`.
- Supported filters: status, priority, type, assignee_id, label_id, sprint_id, due_before/due_after, created_before/after, search text, `only_my`, `only_unassigned`.
- Multi-column sorting: `sort=priority,-due_date` whitelisted.
- Saved filters: `POST /api/v1/filters` stores JSON; applies one click; default filter support; per-user.

### 12.3 Server-Side Pagination

Tables use offset pagination (total count shown); activity feeds/notifications use cursor (opaque base64 of `(created_at,id)`); sorting indexes: `ix_tasks_project_status_priority`, `ix_tasks_due_date` etc. cover the common permutations.

---

## 13. Dashboard

Role-based composition on `GET /dashboard` (single payload per role to minimize round trips, 60 s Redis cache):

| Role | KPIs | Charts | Extras |
|---|---|---|---|
| **Admin** | active users, projects, storage used, failed logins (7d), error rate | users/week signup, storage trend | recent audit events, system health |
| **Project Manager** | active sprints, avg cycle time, velocity trend, open vs done | burndown (active sprint), velocity (last 6 sprints), cumulative flow (per status by day) | upcoming deadlines (due ≤7d), recent activity, project status distribution |
| **Team Lead** | team workload, in-progress count, blocked/in-review, WIP vs limit | burndown per team, load per member (story points) | my team's task list |
| **Developer** | my open tasks, due this week, done this week, point balance | personal burndown, status pie | My Tasks quick table with deep links, recent mentions |

- Charts: Recharts (responsive containers, accessible ARIA roles, tooltips); data aggregated server-side (single SQL group-by queries, not row shipping).
- Quick actions: "Create task", "Start sprint", "Invite member" — gated by permissions.
- Loading: composed skeleton grid; error: per-widget ErrorBoundary retry; empty: onboarding checklist for first-time users.

---

## 14. File Upload

| Aspect | Design |
|---|---|
| Transport | `multipart/form-data`, single request; client-side progress via XHR/fetch reader; retry once on network failure |
| Client validation | type whitelist (images: jpeg/png/webp/gif; docs: pdf/docx/xlsx/pptx/txt/md/csv), ≤10 MB, dimension check via Image; images compressed client-side (canvas → WebP, max 2000 px long edge, quality 0.85) |
| Server validation | `python-magic` magic-byte sniff (not extension), size re-check, optional Pillow dimension/corruption check; 422 with field error on violation |
| Storage abstraction | `StorageProvider` interface: `put(key, stream)`, `get(key)`, `delete(key)`, `presign(key, ttl)`; implementations: `LocalStorage` (dev, `./data/uploads`, dir-hashed by day), `MinioStorage` (prod, private bucket, SSE-S3 encryption) |
| Thumbnails | Pillow-generated 200×200 cover thumbnails for images stored as `thumbnail_key`; served via `/attachments/{id}/thumbnail`; non-images get file-type icon |
| Access | download endpoint checks auth + project membership before streaming or presigning (15 min TTL); `Content-Disposition` sanitized filename; no public bucket |
| Delete | hard-delete from storage + soft-delete row; task deletion cascades cleanup via background job (Celery-less: thread-safe queue or simple background worker in prod) |
| Integrity | orphan sweeper: nightly job removes storage objects without attachment rows (and vice versa) |

---

## 15. Notifications

- **Trigger points** (service-layer events): task assigned, @mentioned in comment, deadline approaching (daily job: due within 24 h, unread, not yet notified — dedup key `notified:{task}:{user}:{type}:{date}`), status change on watched task, team invite, sprint start/end, comment on my task (opt-in).
- **In-app:** `NotificationBell` with unread badge (polled every 60 s when visible, and after every mutation response — avoids WebSocket complexity in v1; SSE is the documented upgrade path), dropdown with latest 20 + "view all", infinite scroll page with read/archive states.
- **Persistence:** `notifications` table (§4); writes are fire-and-forget async (background worker / queue in prod) so they never block the triggering request.
- **Email-ready abstraction:** `NotificationChannel` interface (`InAppChannel`, `EmailChannel`); `NotificationService.dispatch(type, recipients, payload)` fans out to registered channels; email channel is a no-op stub in dev, SMTP in prod; failures isolated (logged, never fail the source request).
- **Preferences:** per-user table `notification_preferences` (per-type on/off, email vs in-app); defaults sane; updated in Settings.
- **Unread count** cached in Redis (`n:{user_id}`), invalidated on mutation; 429-safe (no polling burst).

---

## 16. Logging

| Stream | Content | Where |
|---|---|---|
| **Application** | structured JSON: `ts, level, logger, msg, request_id, user_id, method, path, status, duration_ms, ip`; levels DEBUG/INFO/WARNING/ERROR | stdout (Docker collects), daily rotation in dev |
| **Audit** | `actor, action, resource_type, resource_id, before/after diff, ip, request_id` — written in same DB transaction as the mutation (no lost events) | `audit_log` table + `audit.log` file mirror |
| **Auth** | login success/failure (+reason), logout, refresh rotation, password reset, lockout | `auth.log` + table |
| **Security** | rate-limit hits, CSRF rejections, 403s, token-family reuse detection (WARN), failed file validation | `security.log` |
| **Activity (user-facing)** | human-readable timeline for UI (`"Jane moved PROJ-123 to In Progress"`) | `activity_log` table |
| **Errors** | full stack trace with request context, query params, request_id; ERROR-level alerting hook (console/HTTP sink) | `error.log` + telemetry |

Implementation: Python `logging` with a custom `JSONFormatter`; `before_request` creates request_id (`X-Request-ID` or UUID) stored on `flask.g` and echoed in responses; correlation id propagates to DB logs and frontend console warnings on 500s. Log redaction filter strips passwords/tokens (password fields, `Authorization`, `password_hash`) automatically.

---

## 17. Error Handling

### 17.1 Exception Hierarchy

```
AppException (base: status, code, message, details, request_id)
├── ValidationException        → 422 (field-level `details`)
├── AuthenticationException    → 401
├── AuthorizationException     → 403
├── NotFoundException          → 404
├── ConflictException          → 409
├── FileUploadException        → 422/400
├── RateLimitException         → 429
└── AppError (unknown)         → 500 (logged, generic message to client)
```

### 17.2 Centralization

- `register_error_handlers(app)` catches `AppException`, Marshmallow `ValidationError` (→422 with details), `HTTPException` (mapping), SQLAlchemy `IntegrityError` (→409, rollback), and generic `Exception` (→500 + stack trace log with request context).
- All handlers emit the uniform error envelope (§5.1) with `request_id`.
- Flask-Limiter exceptions → 429 with `Retry-After` header.
- 404 JSON for unknown routes (`{"error": {"code": "NOT_FOUND", ...}}`) — never HTML.

### 17.3 Graceful UI

- `ErrorBoundary` per route + per dashboard widget with "Try again".
- Toast for mutation errors (409 → "A task with this key already exists").
- Inline field errors from 422 details mapping to FormField.
- 401 → global interceptor: silent refresh once, else redirect to login with `redirect_to` query param.
- 403 → permission-denied toast + hide actions (permission checks render affordances).

---

## 18. Performance Optimization

| Area | Technique |
|---|---|
| **Pagination** | offset for tables (total counts), cursor for feeds; page size ≤ 50 default |
| **Optimistic updates** | drag-drop: reorder locally (Zustand draft), `PUT reorder` fire-and-forget, rollback + toast on failure; status toggles on board cards update instantly; comments append optimistically with "pending" state |
| **Lazy loading** | `React.lazy` + `Suspense` per route; rich text editor and charts code-split (they're heavy); board page chunks on-demand |
| **Memoization** | `React.memo` on TaskCard/BoardColumn/DataTable rows; `useMemo` for filter predicates and column defs; `useCallback` for handlers passed to lists |
| **Virtualization** | `@tanstack/react-virtual` for task tables (500+ rows) and notification lists; board columns scroll natively with `content-visibility: auto` |
| **Batching** | dashboard endpoint aggregates per role; task detail returns nested payload (comments+attachments+activity in one call); `n+1` eliminated by `joinedload`/`selectinload` |
| **Caching** | TanStack Query staleTime per query type; Redis for dashboard aggregates + board payload; conditional `ETag`/304 on GET /projects (last-modified from updated_at) |
| **DB indexes** | §4 composite indexes; `EXPLAIN ANALYZE` gates for board, search, dashboard queries |
| **Query optimization** | repository-scoped eager loading: board load = one query for columns + one `selectinload` for tasks+assignees+labels (never N+1); window functions for position gaps |
| **Asset delivery** | Nginx: gzip/brotli, immutable cache headers for hashed assets, HTTP/2; React 19 compiler passes where safe |

---

## 19. Security

### 19.1 OWASP Top 10 (2021) Coverage Map

| OWASP | Countermeasure in this project |
|---|---|
| A01 Broken Access Control | RBAC middleware on every route; mandatory membership scoping in repositories (IDOR-proof); ownership rules; test suite asserting 403s |
| A02 Cryptographic Failures | Argon2id password hashing; TLS-only; RS256 JWTs; SHA-256-hashed refresh tokens; secrets via env, never code |
| A03 Injection | SQLAlchemy parameterized queries only; `tsvector` sanitization; no raw SQL outside migrations; XSS sanitized (bleach) |
| A04 Insecure Design | threat model documented (§19.3); rate limits; token rotation; lockout; audit trail |
| A05 Security Misconfiguration | hardened headers (CSP, X-Frame-Options DENY, HSTS, nosniff, referrer-policy), env-specific configs, DEBUG off in prod |
| A06 Vulnerable Components | Dependabot + `pip-audit` + `npm audit` in CI; pinned deps with hashes (prod lockfiles); weekly update bot |
| A07 Identification/Auth Failures | login rate limit (5/min/IP, 10/15 min/account), account lockout, session revocation, MFA-ready design note |
| A08 Software Integrity | CI signature checks (checksum verify on base images), pinned base images, signed commits optional, SBOM generation |
| A09 Logging Failures | comprehensive audit/auth/security logs (§16), no sensitive data logged, alerts on anomaly |
| A10 SSRF | attachment URLs and any user-supplied URL validated against allowlists (scheme http/https, public IP blocklist); MinIO endpoint from trusted config only |

### 19.2 Additional Controls

- **Rate limiting (Flask-Limiter + Redis):** login/register/forgot-password (strict), all authed API (generous), attachment upload (size- and count-based).
- **CORS:** exact origin allowlist per env; credentials allowed only for trusted origins; no wildcard.
- **Secure headers:** CSP (`default-src 'self'`, `img-src 'self' data: blob: https://assets.example`, `object-src 'none'`), HSTS, CORP/COEP baseline.
- **File uploads:** magic-byte validation, size caps, upload to private bucket, randomized keys, never serve user HTML (Content-Type forced, X-Content-Type-Options).
- **Secrets:** `.env` gitignored, `.env.example` committed; prod secrets injected by CI secrets; rotation plan documented.
- **Backups:** Postgres nightly pg_dump to MinIO; retention 30 days; restore drill in staging.

### 19.3 Threat Model (summary)

Actors: anonymous attacker, low-priv user, insider, compromised token. Highest-risk assets: refresh tokens, audit integrity, project data, storage bucket. Mitigations prioritized: token rotation + reuse detection, DB-transactional audit writes, mandatory membership scoping, private bucket + presigned URLs.

---

## 20. Testing Strategy

### 20.1 Pyramid

| Layer | Tool | Scope | Target |
|---|---|---|---|
| Unit | pytest (backend) / Vitest+RTL (frontend) | services (business rules, permission engine), utils, validators, serializers, storage abstraction, security helpers | 80% backend lines |
| Integration | pytest + test PostgreSQL (per-test transaction rollback), factory-boy fixtures | every endpoint: happy path, validation 422s, authz 401/403, pagination, filters, soft delete, N+1 assertion guard | covers all routes |
| Component | React Testing Library + Vitest | page-level interactions with mocked API (`msw`), form validation, optimistic update rollback, empty/error states | 70% frontend |
| E2E | Playwright (chromium + webkit) | critical flows against full Docker Compose stack (test seed) | ~15 specs, must pass in CI |

### 20.2 Critical Flows (E2E)

1. Register → login → land on dashboard.
2. Create project → create task → appears on board.
3. Drag task across columns → persists after reload.
4. Search "PROJ" → finds task; filter by assignee.
5. Add comment with mention → recipient sees notification.
6. Create sprint → move backlog tasks → complete sprint.
7. Viewer attempts edit → action hidden + direct API call returns 403 (API-level test).
8. Refresh-token rotation: expired access → auto-refresh → request succeeds.

### 20.3 Guardrails

- N+1 detector test (SQLAlchemy event counts queries per hot endpoint).
- Migration tests: `alembic upgrade head` on fresh DB + seed smoke test.
- Schema parity test (OpenAPI vs TS types).
- Mutation: coverage thresholds enforced in CI; mutation testing on permission engine (`mutmut`, 80% killed).

---

## 21. CI/CD

### 21.1 GitHub Actions — Push / PR

```yaml
trigger: pull_request, push to main
jobs:
  backend:
    - ruff check + format + mypy (strict)
    - pytest (unit + integration) against service postgres/minio
    - alembic upgrade head on fresh DB + alembic check (no drift)
    - pip-audit (vulnerability gate)
  frontend:
    - eslint + tsc --noEmit
    - vitest run (unit/component with coverage)
    - build (vite build) — catches type/bundle errors
    - npm audit --production
  e2e:
    - docker compose up -d (test env) → playwright test (reuse built images)
  security:
    - dependency scan, secret scan (gitleaks), container scan (trivy) on built images
```

### 21.2 Merge to main → Deploy

- Tag `v*` or main push → build images (multi-arch), scan, push to registry with `SHA` + `latest` tags.
- Deploy: Docker Swarm/plain Compose on staging → smoke tests (health check + happy-path API probe) → promote to prod.
- Rollback: previous tagged image + `docker compose down/up` documented runbook; DB migrations are forward-only with additive policy, making rollback safe.
- Environments: `dev` (local compose, seeded demo data), `staging` (CI deploy, mirrors prod config), `prod` (CI deploy, real secrets, backups enabled).

---

## 22. Dockerization

### 22.1 Images

| Service | Dockerfile | Notes |
|---|---|---|
| **frontend** | multi-stage: `node:22-alpine` build (vite build) → `nginx:1.27-alpine` (static + SPA fallback, gzip, immutable caching) | non-root user, `nginx.conf` |
| **backend** | multi-stage: `python:3.12-slim` → install deps with hash-locked wheels → runtime image (no build tools), runs `gunicorn -w 4 -b :5000 wsgi:app`, healthcheck `wget /health` | non-root, read-only fs where possible |
| **postgres** | `postgres:16-alpine` | volume `pgdata`, init SQL for db/user, healthcheck `pg_isready` |
| **minio** | `minio/minio` + `minio/mc` init container (create buckets) | volume `miniodata` |
| **redis** | `redis:7-alpine` | `--appendonly yes`, volume `redisdata` |
| **nginx** (optional edge) | `nginx:1.27-alpine` | TLS termination, proxy `/api` → backend, static → frontend |

### 22.2 Docker Compose (dev + prod profiles)

```yaml
services:
  postgres:  ports 5432 (dev only)  volumes  networks: backend
  minio:     ports 9000/9001 (dev only)
  redis:     healthcheck: redis-cli ping
  backend:   depends_on: [postgres, minio, redis] (condition: service_healthy)
             env_file: .env   healthcheck: /api/v1/health
  frontend:  healthcheck: wget -qO- http://localhost/
  nginx:     ports 80/443   depends_on: [backend, frontend]
```

- Two networks: `frontend-net` (nginx ↔ frontend) and `backend-net` (backend ↔ db/redis/minio) — nginx is the only exposure point.
- Volumes: `pgdata`, `miniodata`, `uploads` (dev), `redisdata`.
- Health checks on every service; Compose `depends_on: service_healthy` chains; `restart: unless-stopped`.
- Secrets via env_file + Docker secrets in prod; `init` scripts for MinIO bucket + demo seed.

---

## 23. Documentation

| Artifact | Content |
|---|---|
| `README.md` | description, feature list, screenshots placeholder, tech stack badges, quick start (`docker compose up`), links to all docs |
| `docs/ARCHITECTURE.md` | system diagram (§2), data flow, deployment topology |
| `docs/adr/*.md` | ADR-001 Flask over Django/FastAPI; ADR-002 PostgreSQL + tsvector over Elasticsearch; ADR-003 TanStack Query over Redux; ADR-004 DB-backed rotating refresh tokens; ADR-005 MinIO over local FS; ADR-006 soft deletes; ADR-007 offset vs cursor pagination; ADR-008 SQLAlchemy Core vs ORM; ADR-009 cookies vs Authorization header |
| `docs/ERD.md` + `docs/ERD.png` | full ERD (Mermaid + rendered) |
| `docs/API.md` | OpenAPI (flask-smorest auto-generates `/api/v1/openapi.json`) + Swagger UI mounted in dev; Postman collection exported to `docs/postman/` |
| `docs/SETUP.md` | local dev with Compose, env var table, seed data, troubleshooting |
| `docs/DEPLOYMENT.md` | staging/prod topology, deploy + rollback runbook, backup/restore |
| `docs/CONTRIBUTING.md` | branch strategy, commit conventions, code review checklist, testing instructions |
| `docs/THREAT_MODEL.md` + `docs/SECURITY.md` | threat model, security policies, disclosure process |

---

## 24. Git Workflow

- **Trunk-based with feature branches:** `main` is always releasable; `feat/xyz`, `fix/xyz`, `docs/xyz`, `refactor/xyz`, `test/xyz`, `chore/xyz` branch from main; short-lived (< 2 days).
- **Conventional Commits:** `feat(auth): add refresh token rotation`, `fix(tasks): resolve N+1 on board load`, `docs(api): update attachment schema`, `refactor(services)`, `test(permissions)`, `chore(deps)`. Scoped by module.
- **PRs:** template with checklist (tests, migrations additive, OpenAPI updated, screenshots for UI), 1 approval minimum (2 for backend service changes), all CI gates green; squash-merge to keep main linear.
- **Releases:** semantic versioning `v1.0.0`; changelog auto-generated from conventional commits; release branch on demand for hotfixes.
- **Protected main:** no direct pushes, status checks required, PR review required, signed commits optional (org policy).
- **Hooks (pre-commit):** ruff, eslint, prettier, tsc quick-check, secret scanner.

---

## 25. Development Roadmap (12 Weeks)

| Week | Focus | Deliverables (definition of done) |
|---|---|---|
| 1 | **Setup & Auth** | repo scaffolding (monorepo: `frontend/`, `backend/`), Docker Compose, app factory, config, logging, JWT login/register/refresh/logout, cookie flow, login page |
| 2 | **DB & Migrations** | all models (§4) via Alembic, role/permission seeds, factory-boy fixtures, migration CI gate |
| 3 | **Projects/Teams CRUD** | services+repos+controllers for projects, teams, members; permission scaffolding; project list/detail pages |
| 4 | **Boards & Tasks CRUD** | boards, columns, tasks full CRUD + filters/pagination; task create/edit pages; validation parity tests |
| 5 | **Kanban Board UI** | drag-drop (dnd-kit), optimistic reorder, WIP badges, board filters, quick-create, responsive board |
| 6 | **Sprints & Backlog** | sprint lifecycle (start/complete), backlog view, sprint planning, velocity data foundation |
| 7 | **Comments & Attachments** | threaded comments + mentions, upload pipeline, thumbnails, presigned URLs, storage abstraction |
| 8 | **Search, Filters, Notifications** | tsvector search, saved filters, notification service + bell UI, preferences |
| 9 | **Dashboard & Analytics** | role dashboards, burndown/velocity/cumulative-flow charts, admin metrics |
| 10 | **RBAC & Security Hardening** | permission matrix enforcement pass, rate limits, headers, token reuse detection, audit log UI, lockout |
| 11 | **Testing & Performance** | coverage to targets, Playwright suite, N+1 audit, EXPLAIN gates, virtualization, memoization pass, Lighthouse 90+ |
| 12 | **CI/CD, Docker, Docs, Polish** | full GitHub Actions, trivy/dependabot, deployment docs, ADRs, OpenAPI polish, dark mode, keyboard shortcuts, CSV export, release `v1.0.0` |

**Risks & mitigations:** scope creep → backlog lock after week 6 (only polish); drag-drop cross-browser quirks → dnd-kit + fallback menu; tsvector perf → covered by indexes + EXPLAIN; notification fan-out scale → async worker in prod.

---

## 26. Resume-Worthy Advanced Features

| Feature | Why it demonstrates engineering skill |
|---|---|
| **Audit logging (transactional)** | integrity of history; architectural discipline (same tx as mutation) |
| **Activity timeline** | event-sourcing-flavored change diffing (jsonb before/after) |
| **Soft deletes + restore** | production reality: never destroy user data; exposes undo UX |
| **Optimistic UI drag-drop** | hardest UI engineering: local mutation, rollback, error recovery |
| **Server-side pagination (both styles)** | knowing *when* to use cursor vs offset |
| **Advanced filtering + saved filters** | URL-state sync, composable query objects, per-user persistence |
| **Debounced global search with tsvector** | real full-text search: ranking, highlighting, prefix search |
| **Keyboard shortcuts** | polish + accessibility thinking (e.g. `N` new task, `G G` board, `?` help) |
| **Dark mode** | theming architecture (CSS variables, persisted, system sync) |
| **CSV export** | streaming large exports, content-disposition, encoding edge cases |
| **Bulk operations + undo** | command/queue thinking, transactional batches, conflict handling |
| **Role-based dashboards** | role-driven feature design, server-side aggregation |
| **API versioning + health/readiness + request IDs** | production observability and contract discipline |
| **Structured JSON logging + correlation ids** | this is what real ops teams demand |
| **Repository + service layers** | testability, separation of concerns at scale |
| **Alembic zero-downtime migrations** | schema evolution without downtime |
| **OpenAPI-first parity (flask-smorest + TS checks)** | contract-first development |
| **Feature flags (design note)** | conditional rollout (e.g., beta board) without redeploy — flag provider interface with env-based impl |

---

## 27. Interview Preparation

### 27.1 Architecture
- **Why Flask over Django?** Lightweight control: we own layering (controllers/services/repos), fewer magic conventions, easy blueprint modularity, and our feature set (REST API + complex DB) doesn't need Django's batteries. Trade-off accepted: we add our own auth/admin tooling — mitigated by libraries (Flask-JWT-lib, flask-smorest) and our layered design. FastAPI alternative noted: we chose Marshmallow/Smorest for proven OpenAPI + ORM friendliness; the layering makes swapping presentation framework cheap.
- **Why PostgreSQL?** tsvector full-text search, JSONB (flexible diffs/filters), partial indexes, strong constraints, mature tooling (Alembic), easy replicas.
- **Why repository pattern?** Testability (mock repos in service tests), central query optimization (N+1 prevention lives in one place), and DB-agnostic services.

### 27.2 Database
- **Explain your ERD:** present the tables (§4), justify join tables, project-scoped vs platform roles, soft-delete strategy, and the tsvector + indexes story.
- **Why soft deletes?** Undo, auditability, reporting integrity; cost: query complexity (base filter), unique-key collisions — answered with regeneration strategy and cleanup jobs.
- **N+1 handling:** eager loading via `selectinload` for board load, repository-level discipline, and a query-count regression test.

### 27.3 React
- **TanStack Query over Redux:** server cache ≠ client state; dedup, refetch, optimistic updates, and background invalidation out of the box; Redux adds boilerplate for state that is really a cache.
- **Optimistic updates:** implement via `useMutation` + `onMutate` (snapshot) → rollback on error; drag-drop as local-first draft with server sync.
- **Server vs client state:** anything whose truth lives on the server (tasks, notifications) is server state; UI flags (sidebar, theme, drafts) are client state; filters/pagination live in URL.

### 27.4 Flask
- **Request lifecycle:** before_request (request-id, auth → flask.g) → routing → controller → service → repo → serialization → after_request (JSON log) → error handlers.
- **Middleware:** WSGI middleware for raw concerns (headers, TLS guard), decorators for auth/permission, Flask hooks for request context.
- **Error handling:** centralized `register_error_handlers`, exception hierarchy mapping to envelopes (§17).

### 27.5 SQLAlchemy
- **Session management:** scoped session per request, commit in service boundaries, rollback on error, `expire_on_commit=False` for serialization safety.
- **Eager loading:** `joinedload` (to-one) vs `selectinload` (collections), applied at repository layer.
- **Alembic:** autogenerate + manual review, additive-only changes, `alembic check` in CI.

### 27.6 System Design
- **Scale to 10K users:** stateless API + replicas, read replicas, Redis cache tiers, MinIO offload, async notifications, connection pooling (PgBouncer), pagination bounds. Show numbers (expected QPS from DAU estimates).
- **Caching strategy:** what we cache (dashboard aggregates, board payload, unread counts), TTLs, invalidation via mutation hooks — and what we deliberately don't cache (task mutations).

### 27.7 Performance
- **Board page optimization:** single-trip nested payload, `selectinload`, composite index on (project_id, column_id, position), memoized cards, virtualized tables, chart code-splitting, staleTime tuning, measured via EXPLAIN + React Profiler.

### 27.8 Security
- **XSS:** React escaping + sanitized rich text (bleach/sanitize-html) + CSP.
- **CSRF:** SameSite=Lax cookies + custom-header double-submit; explanation of why pure-Bearer flows don't need CSRF tokens.
- **SQL injection:** ORM parameterization; audit that no raw string interpolation reaches SQL.

### 27.9 Behavioral
- **Biggest challenge:** drag-drop consistency + optimistic rollback correctness under concurrent edits (version field on tasks → 409 conflict → refetch).
- **Trade-off decisions:** Flask vs FastAPI; cursor vs offset; DB-backed refresh tokens vs stateless JWT refresh (security > simplicity, at latency cost of one DB hit).
- **What would you do differently?** Introduce typed backend (Python type-checked boundaries), WebSockets earlier, and a proper queue (Redis Streams) for notifications from day one.

---

## 28. Evaluation

| Dimension | /10 | Justification |
|---|---|---|
| **Resume Strength** | 9 | Complete product with prod-grade concerns (auth, RBAC, audit, CI/CD, Docker) — directly mirrors Jira/Trello-class systems that employers know; every layer is demonstrable in interviews |
| **Backend Complexity** | 8.5 | Layered Flask monolith: authN/authZ, transactions, search, uploads, dashboards — hard enough to be impressive, not so exotic it becomes unmaintainable |
| **Frontend Complexity** | 8.5 | Drag-drop board, virtualized tables, optimistic updates, charts, theming, search UX — exercises the full React 19 + TanStack ecosystem |
| **Database Design** | 9 | 20+ normalized tables, join tables, partial indexes, tsvector, JSONB diffs, soft deletes — rich material for schema design questions |
| **Architecture** | 9 | Clean layering, storage/cache/channel abstractions, API versioning, request-id tracing — shows senior-level separation-of-concerns thinking |
| **Scalability** | 7.5 | Stateless API + read replicas + Redis + MinIO path documented; not sharded/multi-tenant — appropriate scope for this project size |
| **Security** | 8.5 | Full OWASP mapping, token rotation, lockout, audit, sanitization — rare completeness for a portfolio project |
| **Industry Relevance** | 9 | PM tools are ubiquitous; stack (React+Flask+Postgres) is hiring-familiar; practices match real team workflows |
| **Learning Value** | 9.5 | Every section forces a genuinely hard decision; depth spans UX to ops |
| **Interview Value** | 9.5 | Provides answers to all classic questions with concrete artifacts: ERD, ADRs, threat model, metrics, trade-offs |

**Overall: 8.8 / 10** — a flagship portfolio project that demonstrates full-stack seniority, production engineering discipline, and articulate trade-off reasoning.

---

*End of Implementation Plan — v1.0.0*
