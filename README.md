# Scaffold

<p align="center">
  <img src="docs/assets/certificate-best-project.jpeg" alt="Certificate — 1st Runner-Up Best Project" width="780" style="border-radius:12px; border:1px solid #e5e7eb;"/>
</p>

<p align="center">
  <strong>🏆 1st Runner-Up — Best Project Award</strong> &nbsp;·&nbsp; CSE 3100 · Web Programming Laboratory<br/>
  <em>Real-time, all-in-one developer workspace — workspaces → projects → Kanban + Infinite Canvas + discussions + wiki + GitHub Apps sync</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-11-FF2D20?logo=laravel&logoColor=white" alt="Laravel 11"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19"/>
  <img src="https://img.shields.io/badge/Inertia-3-9553E9?logo=inertia&logoColor=white" alt="Inertia 3"/>
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind 4"/>
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite 5"/>
  <img src="https://img.shields.io/badge/Postgres-Neon-336791?logo=postgresql&logoColor=white" alt="Neon Postgres"/>
  <img src="https://img.shields.io/badge/Reverb-WebSockets-F59E0B" alt="Reverb"/>
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/GitHub%20Apps-JWT%20RS256-181717?logo=github&logoColor=white" alt="GitHub Apps"/>
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT"/>
</p>

<p align="center">
  <a href="https://scaffold-yd4i.onrender.com"><strong>🌐 Live Demo — scaffold-yd4i.onrender.com</strong></a> &nbsp;·&nbsp;
  <a href="https://github.com/narukami00/Scaffold">GitHub — narukami00/Scaffold</a> &nbsp;·&nbsp;
  <a href="docs/lab-report/SCAFFOLD_LAB_REPORT.pdf">Lab Report (PDF)</a> &nbsp;·&nbsp;
  <a href="docs/SCAFFOLD_WALKTHROUGH.md">Full Walkthrough</a> &nbsp;·&nbsp;
  <a href="docs/assets/INDEX.md">Asset Index</a>
</p>

> **Why Scaffold?** Teams need more than a task list. Scaffold bundles workspace isolation, project hubs, drag-and-drop Kanban, infinite-canvas dependency graphs, Reddit-style threaded discussions, markdown wiki, and bidirectional GitHub Issue sync — all live-updated via Reverb presence channels, deployed as a single Docker container on Render.

---

## Table of Contents

- [Awards](#-awards)
- [Screenshots at a Glance](#-screenshots-at-a-glance)
- [Architecture](#-architecture)
- [Features](#-features)
  - [Auth & Account Recovery](#auth--account-recovery)
  - [Workspace & Invitations](#workspace--invitations)
  - [Projects](#projects)
  - [Tasks — Kanban & Infinite Canvas](#tasks--kanban--infinite-canvas)
  - [Discussions — Threads, Replies, Reactions](#discussions--threads-replies-reactions)
  - [Wiki](#wiki)
  - [GitHub Apps — Bidirectional Sync](#github-apps--bidirectional-sync)
  - [Real-time Collaboration](#real-time-collaboration)
  - [Notifications & Activity](#notifications--activity)
  - [Profiles, Avatars, Search](#profiles-avatars-search)
- [Data Model](#-data-model)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Asset Catalog](#-asset-catalog)
- [Documentation](#-documentation)
- [Roadmap & Known Gaps](#-roadmap--known-gaps)
- [License](#-license)

---

## 🏆 Awards

| Award | Certificate | Details |
|---|---|---|
| **1st Runner-Up — Best Project** | [`certificate-best-project.jpeg`](docs/assets/certificate-best-project.jpeg) | CSE 3100 Web Programming Lab · Scaffold (ex-DevSpace) recognized for full-stack integration: Laravel + Inertia React, real-time, GitHub Apps, hosted deployment |

<p align="center">
  <img src="docs/assets/certificate-best-project.jpeg" alt="Certificate detail" width="420" style="border-radius:10px;"/>
  <br/>
  <em>“Cirtificate Best Project” — 1st Runner-Up. The stitched account-creation screenshot below is also award-demo material.</em>
</p>

---

## 📸 Screenshots at a Glance

> All screenshots live in [`docs/assets/`](docs/assets/) — deduplicated by SHA-256 (50 files), semantically named. The account-creation screen was two fragments vertically stitched via PIL into `ui-account-creation.png` (1920×1311); individual parts retained as `ui-account-creation-part-a/b.png`.

### Auth — Login & Account Creation

| Login | Account creation (stitched, 1920×1311) |
|---|---|
| <img src="docs/assets/ui-auth-login.png" width="380" alt="Login"/> | <img src="docs/assets/ui-account-creation.png" width="380" alt="Account creation stitched"/> |
| `ui-auth-login.png` — session auth, CSRF, throttle | `ui-account-creation.png` ← `part-a (1919×393)` + `part-b (1920×918)` via `PIL.Image` vertical join, max-width padding + white flatten |

### Workspace & Project

| Workspace dashboard | Project dashboard |
|---|---|
| <img src="docs/assets/ui-workspace-dashboard.png" width="380" alt="Workspace"/> | <img src="docs/assets/ui-project-dashboard.png" width="380" alt="Project"/> |
| `ui-workspace-dashboard.png` — 12-color member palette, slug URLs | `ui-project-dashboard.png` — hub for tasks/threads/wiki/GitHub |

### Tasks — Kanban, Detail, Infinite Canvas

| Kanban board | Filters | Task detail (Atom) | Labels |
|---|---|---|---|
| <img src="docs/assets/ui-kanban-board.png" width="180" alt="Kanban"/> | <img src="docs/assets/ui-kanban-filters.png" width="180" alt="Filters"/> | <img src="docs/assets/ui-atom-task-detail.png" width="180" alt="Task detail"/> | <img src="docs/assets/ui-atom-task-labels.png" width="180" alt="Labels"/> |

| Infinite Canvas — Dependency Flow (`@xyflow/react`, BFS cycle guard) |
|---|
| <img src="docs/assets/ui-infinite-canvas.png" width="700" alt="Infinite Canvas"/> |
| `ui-infinite-canvas.png` (1637×835) — self-ref many-to-many `task_dependencies`, recursive revert on done→undone |

### Discussions & Wiki

| Threads overview | Thread detail (nested replies) | Wiki |
|---|---|---|
| <img src="docs/assets/ui-threads-overview.png" width="220" alt="Threads"/> | <img src="docs/assets/ui-thread-detail.png" width="220" alt="Thread detail"/> | <img src="docs/assets/ui-wiki.png" width="220" alt="Wiki"/> |
| `ui-threads-overview.png` | `ui-thread-detail.png` — `CommentTree`, definitive answer | `ui-wiki.png` — `react-markdown` + `remark-gfm` |

### GitHub Apps & Webhooks

| GitHub integration | Repo link | Issue sync | Webhook deliveries |
|---|---|---|---|
| <img src="docs/assets/ui-github-integration.png" width="170" alt="GitHub integration"/> | <img src="docs/assets/ui-github-repo-link.png" width="170" alt="Repo link"/> | <img src="docs/assets/ui-github-sync.png" width="170" alt="Sync"/> | <img src="docs/assets/ui-webhook-deliveries.png" width="170" alt="Webhooks"/> |
| `ui-github-integration.png` — JWT RS256 → install token 55 min cache | `ui-github-repo-link.png` | `ui-github-sync.png` — `last_synced_hash` loop guard | `ui-webhook-deliveries.png` — HMAC verified |

### Real-time, Activity, Notifications

| Presence | Task live update | Collaboration (2 clients) | Notifications |
|---|---|---|---|
| <img src="docs/assets/ui-realtime-presence.png" width="170" alt="Presence"/> | <img src="docs/assets/ui-realtime-task-update.png" width="170" alt="Task update"/> | <img src="docs/assets/ui-realtime-collaboration.png" width="170" alt="Collab"/> | <img src="docs/assets/ui-notifications-panel.png" width="170" alt="Notifications"/> |

| Activity feed | Timeline | Commit history |
|---|---|---|
| <img src="docs/assets/ui-activity-feed.png" width="220" alt="Activity"/> | <img src="docs/assets/ui-activity-timeline.png" width="220" alt="Timeline"/> | <img src="docs/assets/ui-commit-history.png" width="220" alt="Commits"/> |

### Profiles & Search

| Profile | Stats | Avatar editor | Search |
|---|---|---|---|
| <img src="docs/assets/ui-profile-overview.png" width="180" alt="Profile"/> | <img src="docs/assets/ui-profile-stats.png" width="180" alt="Stats"/> | <img src="docs/assets/ui-avatar-editor.png" width="180" alt="Avatar"/> | <img src="docs/assets/ui-search.png" width="180" alt="Search"/> |
| <img src="docs/assets/ui-search-results.png" width="380" alt="Search results"/> | | | |

### Deployment & Tests

| Render dashboard | Hosted app | PHPUnit output |
|---|---|---|
| <img src="docs/assets/ui-deployment-render.png" width="220" alt="Render"/> | <img src="docs/assets/ui-hosted-application.png" width="220" alt="Hosted"/> | <img src="docs/assets/ui-tests-output.png" width="220" alt="Tests"/> |

---

## 🏗 Architecture

### High-level

<p align="center">
  <img src="docs/assets/diagram-arch-high-level.png" alt="High-level architecture" width="720"/>
  <br/><em>Fig — Browser → Apache :80 → Laravel 11 → Neon Postgres + Reverb :8080 (WSS via /app) → GitHub Apps API</em>
</p>

```
Browser (React 19 + Inertia 3, Tailwind 4, Vite 5)
  │ HTTPS / Inertia props
  ▼
Apache :80 (DocumentRoot public/, mod_proxy + proxy_wstunnel)
  ├─► Laravel 11 (routes, validation, Eloquent, queues, events, broadcasting)
  │      ├─► Neon Postgres (PgBouncer, emulated prepares, PostgresConnection bool fix)
  │      ├─► queue:work (database driver, jobs table) ─► ProcessGitHubWebhookJob, SyncOutboundGitHubIssueJob
  │      └─► schedule:work ─► github:sync-outbound every 5 min ─► GitHub REST
  └─► Reverb :8080 (Pusher protocol) ◄─WSS /app + /apps REST◄─► Echo + pusher-js
        │
GitHub Apps API ─JWT RS256 (firebase/php-jwt, 55 min cache)─► Laravel ── webhooks ─► POST /webhooks/github (HMAC SHA256)
```

More diagrams: `diagram-hosting-topology.png` (Docker internals), `diagram-docker-container.png` (`php:8.2-apache` + `a2enmod` + `composer install`), `diagram-apache-vhost.png` (`ProxyPass /app ws://…`, `/apps http://…`), `diagram-frontend-bootstrap.png` (`app.jsx` → `bootstrap.js` → `echo.js`), `diagram-reverb-config.png` (servers/apps/ping/scaling), `diagram-database-drivers.png` (`pgsql`/`mysql`/`sqlite`/`sqlsrv`), `diagram-queue-scheduler.png`, `diagram-broadcast-channels.png` (`project.{id}`, `task.{id}`, `presence-thread.{id}`, `App.Models.User.{id}`), `diagram-security-layers.png`.

### Why these choices

| Choice | Reason |
|---|---|
| **Laravel 11** | Eloquent, queues, broadcasting, route/model binding for nested `workspaces.projects.tasks` |
| **Inertia 3** | No separate REST layer — `Inertia::render('Page', $props)` for reads, props carry Eloquent |
| **React 19 + Vite 5** | Modern components, HMR, `import.meta.glob` lazy pages, `public/build` served by Apache |
| **Tailwind 4** | `@theme` in CSS, no `tailwind.config.js`, utility on-demand |
| **Reverb** | First-party Pusher-protocol WS, auth via `routes/channels.php`, no SaaS |
| **Neon Postgres** | Serverless, branching, free-tier, but needs `ATTR_EMULATE_PREPARES` + bool re-encode + `$withinTransaction=false` |
| **GitHub Apps** | Per-installation tokens (1h, cached 55m), repository-level scopes, webhook secrets |
| **Single Docker** | One Render service runs Apache + queue + scheduler + Reverb via `docker/start.sh` trap |

**Frontend bootstrap** (`diagram-frontend-bootstrap.png`): `resources/css/app.css` + `resources/js/app.jsx` via Vite → `createInertiaApp({ resolve: pages/**/*.jsx })` → `createRoot` → `bootstrap.js` (axios + `X-Requested-With`) → `echo.js` (`broadcaster: reverb`, `VITE_REVERB_APP_KEY`, `forceTLS`).

---

## ✨ Features

### Auth & Account Recovery
- Session auth (no SPA tokens), `auth`/`guest`/`throttle` middleware, CSRF, `HandleInertiaRequests` shares `auth.user`
- Recovery: `RecoveryController` — email → question → reset; answer normalized (`trim`, `lower`, collapse spaces) before `Hash::make`; `throttle:5,1` on find/verify/reset
- Screens: `ui-auth-login.png`, `ui-account-creation.png` (stitched from `part-a` + `part-b` via `PIL`)

### Workspace & Invitations
- `Workspace` (slug UNIQUE, `owner_id→users CASCADE`), many-to-many `workspace_members (UNIQUE(workspace,color))`, `role member`, 12-color palette, `joined_at`
- `WorkspaceInvitation` (token UNIQUE, `status pending|accepted|declined`, `inviter_id`, `expires_at`) — accept via token URL, notifications on invite
- Owner: `#f59e0b` amber; member defaults `#3b82f6`/`#6366f1`/`#14b8a6` per channel
- `ui-workspace-dashboard.png`

### Projects
- `projects (workspace_id CASCADE, UNIQUE(workspace,slug), git_repo_path vestigial)` — hub for all features; `ProjectController` + `resources/js/pages/Project/*`
- `ui-project-dashboard.png`, `arch-system-overview.png`

### Tasks — Kanban + Infinite Canvas
- `tasks` (assignee SET NULL, `status backlog|in_progress|in_review|done`, `priority low|medium|high|urgent`, `x_pos/y_pos` for canvas, `checklist JSON`, `due_date`)
- Kanban: `@hello-pangea/dnd` drag across status columns, client board state + Inertia refresh, labels via `label_task` pivot (`ui-kanban-board.png`, `ui-kanban-filters.png`, `ui-atom-task-labels.png`)
- Detail: `TaskController` validation + `TaskObserver` side-effects, `TaskComment`, `TaskAttachment` (model exists; controller missing — see concerns), `ui-atom-task-detail.png`
- Dependencies: `task_dependencies (UNIQUE(task,depends_on))` many-to-many; server BFS traversal + `cycleDetection.js` client mirror; recursive revert if a `done` prerequisite moves; Flow view `ui-infinite-canvas.png` via `@xyflow/react`

### Discussions — Threads, Replies, Reactions
- `threads (tags text, is_pinned, edited_at)` + `thread_replies (parent_id self-ref, is_definitive, is_deleted soft-delete)` — arbitrary depth via recursive `CommentTree`
- `reactions` polymorphic (`reactable_* morphs INDEXED`, `UNIQUE(user,reactable,emoji)`) on threads/replies/task_comments/tasks; `media` polymorphic (`mediable_* nullableMorphs`)
- Events: `ThreadCreated/Updated/Deleted`, `ThreadReplyCreated/Updated/Deleted`, `ReplyMarkedDefinitive`, `ReactionToggled` on `PrivateChannel("project.{id}")`
- Presence: `presence-thread.{threadId}` (teal `#14b8a6` for members)
- `ui-threads-overview.png`, `ui-thread-detail.png`

### Wiki
- `wikis (project_id CASCADE, user_id SET NULL, UNIQUE(project,slug))` — title→slug, `content` longText; `WikiController` CRUD; markdown `react-markdown`+`remark-gfm`+`rehype-raw/sanitize` + `highlight.js`
- Events `WikiCreated/Updated` on `project.{id}`
- `ui-wiki.png`

### GitHub Apps — Bidirectional Sync
- **Outbound:** `GitHubTokenService` mints RS256 JWT from App private key (`firebase/php-jwt`), exchanges for installation token, caches 55 min. `github_installations (github_installation_id UNIQUE, account_login/type)`, `github_repositories (project_id UNIQUE, github_repo_id, full_name, default_branch, html_url)`, `github_issues (task_id UNIQUE, last_synced_hash, needs_sync, synced_at)`, marker comment links issue↔task. Queue `SyncOutboundGitHubIssueJob` + `schedule:work` every 5 min.
- **Inbound:** `POST /webhooks/github` — verify `X-Hub-Signature-256: sha256=hmac(body, WEBHOOK_SECRET)`, reject missing/mismatched headers, dedup `github_webhook_deliveries (delivery_id PK string)` on `X-GitHub-Delivery`, dispatch `ProcessGitHubWebhookJob` (issues/push/commits/branches/PRs → task/activity). `github_branches`, `github_pull_requests` (state/head/base, is_draft) fed to activity.
- `ui-github-integration.png`, `ui-github-repo-link.png`, `ui-github-sync.png`, `ui-webhook-deliveries.png`, `ui-commit-history.png`

### Real-time Collaboration
- **Server:** `config/reverb.php` — `0.0.0.0:8080`, one app `allowed_origins=*`, `ping_interval 60`, `activity_timeout 30`, `accept_client_events_from=members`, TLS at Apache, `REDIS_URL` for scaling (disabled)
- **Client:** `resources/js/echo.js` (`reverb` broadcaster, `VITE_REVERB_APP_KEY/Host/Port/Scheme`), `window.Pusher = Pusher`, `enabledTransports: [ws,wss]`
- **Channels:** `routes/channels.php` — `App.Models.User.{id}` private (self only); `project.{projectId}` private; `task.{taskId}` presence (owner `#f59e0b` vs member `#6366f1` + `joined_at`); `presence-thread.{threadId}` presence (owner `#f59e0b` vs `#14b8a6`); all walk entity→workspace and check `owner_id` or `members()->find(userId)`
- **Events (21, all `ShouldBroadcastNow`):** `TaskUpdated` (on `project.{project_id}` + `task.{id}` with assignee/labels/dependencies/git), `TaskDeleted/Locked/Unlocked/ControlTransferred`, `CommentPosted`, `ReactionToggled`, `Thread*`, `ThreadReply*`, `ReplyMarkedDefinitive`, `Wiki*`, `GitHubActivityUpdated`, `NotificationReceived`. Client whisper `request-control` for editor baton.
- `ui-realtime-presence.png`, `ui-realtime-task-update.png`, `ui-realtime-collaboration.png`

### Notifications & Activity
- `notifications (user_id CASCADE, type, notifiable morph, data JSON, read_at)` — `Notifier` helper centralizes create + broadcast, `NotificationReceived` on `App.Models.User.{id}`, mark-read syncs panel. `NotificationPanel.jsx`, `resources/js/pages/Project/Activity.jsx` aggregates project+GitHub activity.
- `ui-notifications-panel.png`, `ui-activity-feed.png`, `ui-activity-timeline.png`

### Profiles, Avatars, Search
- `users (title/bio/avatar_path TEXT after widening migration, recovery_question/answer hashed)`, stats computed from tasks/wikis/threads scoped to workspace memberships
- Avatar: remote URL validated (`AvatarUrl::isValid`) or upload → GD `center-crop 300×300 PNG` if `ext-gd`, old local file `unlink` safely; `is_deleted`/`edited_at` on replies/threads preserve children
- `media` polymorphic for attachments
- Search: `SearchController` workspace-scoped, `ui-search.png` + `ui-search-results.png`
- `ui-profile-overview.png`, `ui-profile-stats.png`, `ui-avatar-editor.png`

---

## 🗃 Data Model

<p align="center">
  <img src="docs/assets/er-diagram.png" alt="ER Diagram" width="720" style="border-radius:8px;"/>
  <br/><em>ER — 20 models, polymorphic `*able` pairs, self-refs, GitHub mirror. Full schema: <code>db-schema.png</code> (2795×2780)</em>
</p>
<p align="center">
  <img src="docs/assets/db-schema.png" alt="DB Schema — large" width="720"/>
</p>

**Domain maps:**

<p align="center">
  <img src="docs/assets/diagram-er-domain-map.png" alt="ER domain map" width="720"/>
  <br/>
  <img src="docs/assets/diagram-db-schema-overview.png" alt="DB schema overview" width="720"/>
</p>

**30 migrations** (chronological):

`users/password_reset_tokens/sessions` → `cache/cache_locks` → `jobs/job_batches/failed_jobs` → `workspaces` → `workspace_members (UNIQUE(ws,user), color)` → `workspace_invitations (token UNIQUE, status)` → `projects (UNIQUE(ws,slug))` → `tasks (status enum, blocked_by_id self-FK → dropped for pivot)` → `task_comments` → `labels (+ down bug swaps label_task)` → `label_task (UNIQUE)` → `task_dependencies (UNIQUE(task,depends_on))` → `drop blocked_by_id` → `workspace_members.color` → `task_attachments` → `tasks.checklist JSON` → `notifications` → `workspace_invitations.inviter_id/status` → `media (nullableMorphs INDEXED)` → `threads (no FK, tagged)` → `reactions (morphs INDEXED, UNIQUE)` → `thread_replies (self-ref parent_id, is_definitive)` → `wikis (UNIQUE(project,slug))` → `projects.git_* vestigial` → `threads.tags` → `users title/bio/avatar_path` → `github_installations/repositories/issues/pull_requests/branches/webhook_deliveries` → `users recovery_question/answer` → `threads.edited_at + thread_replies.is_deleted/edited_at` → `widen users.avatar_path to TEXT`

**Neon/PgBouncer fixes:**
- `config/database.php` — `pgsql` `PDO::ATTR_EMULATE_PREPARES => true` (avoid `cached plan must not change result type`)
- `app/Database/PostgresConnection.php` — `prepareBindings` re-encodes `bool→'true'/'false'` under emulated prepares; registered in `AppServiceProvider` via `Connection::resolverFor('pgsql', ...)`
- Every migration `public $withinTransaction = false;` — DDL outside transaction

**Cascades:** see `docs/PROJECT_SUMMARY.md §3` for full map. Notably `workspaces→projects→tasks→{comments,attachments,github_issues,dependencies}` all CASCADE; `threads` cascade app-layer via `Thread::booted()`.

---

## 🧰 Tech Stack

| Layer | Tech | Notes |
|---|---|---|
| Backend | PHP 8.2 · Laravel 11 | routes, controllers, Eloquent, jobs, events, `encrypt` |
| Frontend | React 19 | components, pages, layouts, hooks |
| Bridge | Inertia 3 | `Inertia::render`, `Link`/`useForm`/`router`, shared props |
| Style | Tailwind 4 | `@tailwindcss/vite`, utilities, responsive |
| Build | Vite 5 (+ `@vitejs/plugin-react`, `laravel-vite-plugin`) | `resources/js/app.jsx` + `resources/css/app.css`, alias `@` |
| DB | Neon Postgres (serverless, PgBouncer) + MySQL (XAMPP local) + SQLite (tests) | `database` pool, `PostgresConnection` |
| Real-time | Reverb 1.0 + Echo 2.3 + Pusher 8.5 + pusher-php-server 7.2 | presence/private channels |
| GitHub | Apps API + JWT RS256 (`firebase/php-jwt 7`) | webhook HMAC, installation tokens |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-raw/sanitize` + `highlight.js` | wiki/code blocks |
| UX | `@hello-pangea/dnd`, `@xyflow/react`, `date-fns`, `lucide-react`, `axios` | Kanban, flow, icons |
| Infra | Docker (`php:8.2-apache`, `gd`/`zip`/`pq`), Render, Neon | `docker/start.sh`, `000-default.conf` |
| Test | PHPUnit 10.5 + Faker + Pint | feature tests |

<details>
<summary><strong>composer.json / package.json</strong></summary>

```jsonc
// composer runtime
"php": "^8.2", "laravel/framework": "^11.0", "inertiajs/inertia-laravel": "*",
"laravel/reverb": "^1.0", "pusher/pusher-php-server": "^7.2", "firebase/php-jwt": "^7.0"

// npm runtime (note: laravel-echo/pusher-js/axios are in devDeps but used at runtime — move to dependencies)
"@inertiajs/react": "^3.0.2", "@hello-pangea/dnd": "^18.0.1", "@xyflow/react": "^12.10.2",
"tailwindcss": "^4.2.2", "react": "^19.2.4", "react-markdown": "^10.1.0", "date-fns": "^4.1.0"
```
</details>

---

## 📁 Project Structure

```
devspace/
├─ app/
│  ├─ Database/PostgresConnection.php     # bool re-encode
│  ├─ Events/                            # 21 ShouldBroadcastNow events
│  ├─ Http/Controllers/                  # 18 controllers (Auth, Workspace, Project, Task, Thread, Wiki, GitHub*, ...)
│  ├─ Jobs/                              # ProcessGitHubWebhookJob, SyncOutboundGitHubIssueJob
│  ├─ Models/                            # 20 models (User, Workspace, Project, Task, Thread, Wiki, GitHub*)
│  ├─ Services/GitHubTokenService.php    # JWT → 55 min install token
│  ├─ Support/AvatarUrl.php              # remote URL + GD 300×300 crop
│  └─ Helpers/Notifier.php
├─ config/                               # database (pgsql/mysql/sqlite), reverb, broadcasting, services (github 4 keys)
├─ database/migrations/                  # 30 incl. 3 Laravel defaults, all $withinTransaction=false
├─ resources/
│  ├─ js/
│  │  ├─ app.jsx, bootstrap.js, echo.js
│  │  ├─ pages/{Auth, Workspace, Project, ...}  # 17 pages
│  │  ├─ components/ (25), layouts/, utils/{cycleDetection, taskDependencies}
│  │  └─ css/app.css (@tailwind)
│  └─ css/
├─ routes/{web.php, channels.php, console.php}
├─ bootstrap/app.php                      # middleware stack (auth, guest, throttle, HandleInertiaRequests)
├─ docker/{start.sh, 000-default.conf}   # single-container orchestration
├─ Dockerfile, vite.config.js
├─ docs/
│  ├─ assets/                             # 50 semantically named files + INDEX.md (this README's images)
│  │  └─ diagrams/                        # 13 Mermaid PNG + 13 MMD sources
│  ├─ lab-report/{SCAFFOLD_LAB_REPORT.{md,pdf,docx}, assets/{er-diagram.png,...}, cirtificate_best_project.jpeg}
│  ├─ SCAFFOLD_WALKTHROUGH.{md,docx}
│  └─ PROJECT_SUMMARY.md
└─ tests/Feature/                         # 13 feature tests (Auth, Workspace, Task, Thread, Wiki, GitHub, etc.)
```

---

## 🚀 Quick Start

### Prerequisites
- PHP 8.2+, Composer, Node 18+, Git
- MySQL (XAMPP) locally **or** Postgres (Neon) for hosted-like dev; GD extension for avatar cropping

### 1. Clone & install
```bash
git clone https://github.com/narukami00/Scaffold.git devspace
cd devspace
composer install
npm install          # note: echo/pusher/axios are devDeps; npm ci --omit=dev will break — move to dependencies if you harden
cp .env.example .env
php artisan key:generate
```

### 2. Configure `.env`
```env
APP_NAME=Scaffold
APP_URL=http://localhost:8000
DB_CONNECTION=mysql          # or pgsql for Neon/Postgres
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=scaffold
DB_USERNAME=root
DB_PASSWORD=

BROADCAST_CONNECTION=reverb
REVERB_APP_KEY=local-key
REVERB_APP_SECRET=local-secret
REVERB_APP_ID=1
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"

# GitHub App (optional — needed for repo linking)
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=        # base64 or PEM with \n
GITHUB_WEBHOOK_SECRET=
GITHUB_CLIENT_ID=
```

For Neon/PgBouncer add in `config/database.php` already wired: `pgsql` driver auto uses `PDO::ATTR_EMULATE_PREPARES` + `PostgresConnection`. Set `DB_SSLMODE=require` etc.

### 3. Migrate & build
```bash
php artisan migrate          # all migrations $withinTransaction=false — safe for PgBouncer
php artisan storage:link
npm run build                # writes public/build/ (committed fallback) — Dockerfile does NOT run npm ci
```

### 4. Run (dev)
```bash
php artisan serve &                    # http://localhost:8000
php artisan reverb:start --host=127.0.0.1 --port=8080 &
php artisan queue:work --sleep=3 --tries=3 &
php artisan schedule:work &
npm run dev                            # Vite HMR
```

Or single container:
```bash
docker build -t scaffold .
docker run -p 80:80 --env-file .env scaffold   # docker/start.sh does migrate + queue + scheduler + reverb + apache
```

### 5. Test
```bash
php artisan test            # PHPUnit 10.5, SQLite :memory:, HTTP/queue fakes
```

---

## ⚙ Configuration

- **Vite** (`vite.config.js`): `tailwind()` + `laravel({ input: ['resources/css/app.css','resources/js/app.jsx'] })` + `react()`, `resolve.alias.@`
- **Reverb** (`config/reverb.php`): `servers.reverb` bind `0.0.0.0:8080`, `apps` single app with `ping_interval 60`, `activity_timeout 30`, `max_request_size 10_000`
- **Database** (`config/database.php`): 5 connections; `pgsql` sets `ATTR_EMULATE_PREPARES` when `pdo_pgsql` loaded
- **Broadcasting** (`config/broadcasting.php`): default `BROADCAST_CONNECTION`, pusher/reverb/ably/log/null
- **Services** (`config/services.php`): `github { app_id, private_key, webhook_secret, client_id }`
- **Echo** (`resources/js/echo.js`): `broadcaster: reverb`, `key: VITE_REVERB_APP_KEY`, `wsHost/VITE_REVERB_HOST||hostname`, `forceTLS: VITE_REVERB_SCHEME===https`

---

## ☁ Deployment

**Render (production) + Neon (serverless Postgres) — single Docker**

`Dockerfile`:
```dockerfile
FROM php:8.2-apache
RUN apt-get install -y git curl libpng-dev libonig-dev libxml2-dev zip unzip libpq-dev libzip-dev libfreetype6-dev libjpeg62-turbo-dev
RUN docker-php-ext-install pdo pdo_pgsql pgsql gd zip bcmath opcache pcntl
RUN a2enmod rewrite proxy proxy_http proxy_wstunnel
COPY docker/000-default.conf /etc/apache2/sites-available/000-default.conf
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
COPY . .
RUN composer install --no-interaction --optimize-autoloader --no-dev
RUN chown -R www-data:www-data /var/www/html
EXPOSE 80
CMD ["/var/www/html/docker/start.sh"]
```

`docker/start.sh`:
```sh
#!/bin/sh
set -e
php artisan migrate --force
php artisan storage:link >/dev/null 2>&1 || true
php artisan queue:work --sleep=3 --tries=3 --timeout=90 &
php artisan schedule:work &
php artisan reverb:start --host=127.0.0.1 --port=8080 &
trap 'kill "$QUEUE_PID" "$SCHEDULE_PID" "$REVERB_PID" 2>/dev/null || true' TERM INT EXIT
apache2-foreground
```

`docker/000-default.conf`:
```apache
ProxyPass /app  ws://127.0.0.1:8080/app
ProxyPassReverse /app ws://127.0.0.1:8080/app
ProxyPass /apps http://127.0.0.1:8080/apps
ProxyPassReverse /apps http://127.0.0.1:8080/apps
```

- `public/build/` is **committed** (Dockerfile never runs `npm ci`/`vite build`) — rebuild locally after `VITE_*` changes.
- Secrets via Render env vars (never in frontend bundle except `VITE_REVERB_APP_KEY` baked at `vite build` time).

---

## 🧪 Testing

- `phpunit.xml` — `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`, `QUEUE_CONNECTION=sync` faked, `BROADCAST_DRIVER=log`
- Coverage: `AuthRedirectTest`, `PasswordRecoveryTest`, `WorkspaceTest`, `ProjectDeletionTest`, `TaskTest` (cycle BFS + recursive revert), `LabelTest`, `ThreadTest`, `WikiTest`, `GitHubIntegrationTest`, `GitSyncTest`, `ProfileTest`, `ResourceLockTest`
- Run: `php artisan test --filter TaskTest` · `vendor/bin/phpunit`

*No Vitest/Jest/E2E yet — React interactions + multi-client WS need manual or future Playwright/Cypress.*

---

## 🗂 Asset Catalog

All `docs/assets/` files are **SHA-256 deduplicated** — original `word/media/image*.png` names replaced by semantic names. See [`docs/assets/INDEX.md`](docs/assets/INDEX.md) for dims, hashes, sources.

| Category | Files | Example |
|---|---|---|
| Certificate | 1 | `certificate-best-project.jpeg` (1200×1012, hero) |
| Data model | 3 | `er-diagram.png`, `db-schema.png`, `arch-system-overview.png` |
| Auth | 4 incl. stitched | `ui-auth-login.png`, `ui-account-creation.png` ← `part-a` + `part-b` (PIL vertical join, 1920×1311) + parts retained |
| Workspace/Project | 2 | `ui-workspace-dashboard.png`, `ui-project-dashboard.png` |
| Tasks | 7 | `ui-kanban-board.png`, `ui-kanban-filters.png`, `ui-atom-task-detail.png`, `ui-atom-task-labels.png`, `ui-infinite-canvas.png` |
| Discussions/Wiki | 3 | `ui-threads-overview.png`, `ui-thread-detail.png`, `ui-wiki.png` |
| GitHub | 4 | `ui-github-integration.png`, `ui-github-repo-link.png`, `ui-github-sync.png`, `ui-webhook-deliveries.png` |
| Real-time/Activity | 7 | `ui-realtime-*`, `ui-notifications-panel.png`, `ui-activity-*`, `ui-commit-history.png` |
| Profiles/Search | 6 | `ui-profile-overview.png`, `ui-profile-stats.png`, `ui-avatar-editor.png`, `ui-search*.png` |
| Deployment/Tests | 3 | `ui-deployment-render.png`, `ui-hosted-application.png`, `ui-tests-output.png` |
| Architecture diagrams | 13 | `diagram-arch-high-level.png` … `diagram-security-layers.png` (Mermaid) |

Dedup: 63 extracted → 49 unique hashes → +1 stitched = 50 files + 13 diagram sources + 13 MMD in `diagrams/`.

---

## 📚 Documentation

- **Lab report (Markdown → DOCX → PDF):** `docs/lab-report/SCAFFOLD_LAB_REPORT.{md,docx,pdf}` — feature-oriented, with figure placeholders now backed by real `docs/assets/` screenshots + ER/schema
- **Comprehensive walkthrough:** `docs/SCAFFOLD_WALKTHROUGH.{md,docx}` + Mermaid PNGs `docs/assets/diagrams/diagram-*.png` (13)
- **Asset index:** `docs/assets/INDEX.md` — dims, sizes, SHA-12, sources, naming convention, usage
- **Project summary:** `docs/PROJECT_SUMMARY.md` — one-sentence journey, architecture, 30-migration inventory, Reverb/Echo/channel, tests, concerns

---

## 🛠 Roadmap & Known Gaps

From `docs/codebase/CONCERNS.md` + walkthrough Part XVII:

- `TaskAttachmentController` imported in `routes/web.php:10` but file missing (model `TaskAttachment` orphaned)
- `laravel-echo`, `pusher-js`, `axios` in `devDependencies` though runtime — `npm ci --omit=dev` breaks prod; move to `dependencies`
- `labels`/`label_task` `down()` swapped (`labels` drops `label_task` and vice-versa) — rollback leaves dangling pivot
- `threads`, `thread_replies`, `reactions`, `sessions.user_id` use `unsignedBigInteger` without `constrained()` — app-layer FK only
- `projects.git_repo_path / git_last_synced_commit` vestigial (pre-GitHub-App)
- `allowed_origins=['*']` + secrets in committed `public/build` — tighten for prod, re-build after `VITE_*` changes
- No frontend component tests / E2E / WS multi-client automation

PRs welcome.

---

<p align="center">
  <strong>Scaffold</strong> — the shortest path to a shippable developer workspace.<br/>
  <em>“The best code is the code never written — the best workspace is the one your team actually lives in.”</em><br/>
  <a href="https://scaffold-yd4i.onrender.com">scaffold-yd4i.onrender.com</a> · <a href="docs/assets/certificate-best-project.jpeg">🏆 Certificate</a>
</p>
