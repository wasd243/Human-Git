# Copilot Instructions for Human-Git

## Build, test, and lint commands

### Rust backend (repo root)
- Build/check used in CI:
  - `cargo check --all-targets --all-features`
  - `cargo build --verbose`
- Lint/format commands expected by PR template:
  - `cargo clippy`
  - `cargo fmt --check`
- Run all Rust tests:
  - `cargo test`
- Run a single Rust test:
  - `cargo test <test_name> -- --exact --nocapture`

### Desktop frontend (Vite app in `src/app/desktop`)
- Dev server:
  - `npm run dev --prefix src/app/desktop`
- Production build:
  - `npm run build --prefix src/app/desktop`

### Tauri app orchestration
- Start desktop app in dev mode from repo root:
  - `npm run dev`
  - (this maps to `npm run tauri dev --prefix src/app/desktop`)

## High-level architecture

Human-Git is a Tauri desktop app with:
1. **Rust backend** for Git operations, repository watching, and state/cache.
2. **TypeScript frontend** (Vite) for UI, log console, and user-triggered Git actions.
3. **Tauri event bridge** between backend and frontend.

### Backend structure (Rust)
- Entry: `src/main.rs`
  - Registers all Tauri commands from `modules::ui_bridge::handlers` plus folder commands in `operations::open_folder`.
  - Creates shared `AppState` (repo path, mutation totals, sync threshold state, SQLite pool).
  - Starts `watcher::run_daemon` on app setup.
- Watcher loop: `src/modules/watcher.rs`
  - Waits until a repo path is selected.
  - Builds ignore rules from repo `.gitignore` plus built-in defaults.
  - Watches recursively with `notify_debouncer_mini`.
  - Emits UI events (`log-event`, `git-mutation`, `files-changed`) and calls mutation processor.
- Mutation processor: `src/modules/operations/run_shadow_commit.rs`
  - Recomputes working status and diff stats.
  - Updates `AppState` counters and emits `git-mutation`.
  - Triggers automatic shadow commit when line delta threshold is reached (`delta >= 500`).
  - Persists mutation snapshots into SQLite `shadow_history`.
- Git operations:
  - Low-level shadow commit: `src/modules/git/executor.rs`
  - User-facing operations: `src/modules/operations/{add,commit,commit_and_push,push,init}.rs`
  - Diff/status/history queries: `src/modules/repo/{diff,history}.rs`
- Local cache DB:
  - Initialized from `src/modules/shared/utils/schema.sql` via `include_str!` in `utils/db.rs`.
  - Uses `rusqlite` + `r2d2_sqlite` pool, DB file at repo root: `humangit_cache.db`.

### Frontend structure (TypeScript)
- Main UI logic: `src/app/desktop/ts/gui.ts`
  - Uses `invoke(...)` to call Tauri commands (`run_shadow_commit`, `get_initial_stats`, `stage_files`, `commit_changes`, `commit_and_push`, `push_changes`, `git_init`, folder selection/update).
  - Listens to backend events (`log-event`, `git-mutation`, `files-changed`).
  - Refreshes visible file status and enables/disables quick deploy based on backend status.
- UI modules:
  - `ts/modules/log.ts` for prefixed log rendering and styling.
  - `ts/modules/background.ts` for animated background behavior.
  - `ts/modules/leftUI.ts` for shell/gear-triggered side panel behavior.

## Key conventions in this repo

- **Event-driven backend↔frontend contract is central.**
  - Backend emits `log-event`, `git-mutation`, `files-changed`.
  - Frontend should react to these events instead of duplicating Git state logic client-side.

- **Repo path is runtime-selectable, not fixed to current process directory.**
  - Commands resolve path from `AppState.current_repo_path` (fallback `"."` in handlers).
  - `update_repo_path` also clears in-memory counters and DB `shadow_history`.

- **Git reads include untracked files by default.**
  - Status/diff code consistently uses untracked + recursive options.

- **Heavy/blocking Git work is moved off async runtime threads.**
  - Tauri command handlers wrap blocking operations with `tokio::task::spawn_blocking` where needed.

- **Logging style uses explicit prefixes consumed by UI styling.**
  - Prefixes like `[SYSTEM]`, `[ERR]`, `[GIT]`, `[SUCCESS]`, `[EVENT]` are used across Rust and TS.

- **Shadow auto-sync policy is threshold-based, with loop-prevention window.**
  - Auto shadow commit triggers after large mutation deltas.
  - `ignore_events_until` suppresses watcher feedback loops right after sync.
