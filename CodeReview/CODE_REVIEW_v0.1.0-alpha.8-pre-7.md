# CODE REVIEW — v0.1.0-alpha.8-pre-7

## FIX IMMEDIATELY

1. **Shadow commit is not isolated; it commits/pushes the current branch directly.**
   - **Impact:** High risk of unintended commits/pushes to user branch, directly conflicting with product promise.
   - **Evidence:** `src/modules/git/executor.rs:65-72` commits to `HEAD`; `src/modules/git/executor.rs:77` auto-pushes via `push_to_origin`.
   - **Contract mismatch:** README says “separate shadow branch without interfering” (`README.md:16`, `README.md:22`).

2. **Dangerous repo default (`"."`) can execute Git actions in the wrong repository.**
   - **Impact:** User can commit/push/pull/stage against app working directory when no repo is selected.
   - **Evidence:** Fallback path in `src/modules/ui_bridge/handlers.rs:31`; used by commands such as `stage_files` (`:82-84`), `commit_changes` (`:91-97`), `push_changes` (`:104-111`), `pull_changes` (`:115-121`), `commit_and_push` (`:128-136`), `list_remotes` (`:171-177`).

3. **Frontend HTML injection risk from Git-controlled file paths.**
   - **Impact:** A malicious filename can inject HTML/JS into UI (DOM XSS vector).
   - **Evidence:** unsanitized `file.path` inserted with `innerHTML` in `src/app/desktop/ts/modules/refreshFileList.ts:70-74` and `:101-104`.
   - **Fix direction:** Use DOM APIs (`textContent`, `createElement`) instead of templated `innerHTML` for dynamic file names.

## NEED FIX

1. **Blocking Git work runs on async paths without `spawn_blocking`.**
   - **Impact:** UI lag / event loop stalls on large repos.
   - **Evidence:** `run_shadow_commit` command directly calls executor in async context (`src/modules/ui_bridge/handlers.rs:41-43`); `stage_files` and `get_working_status` are also direct calls (`:82-84`, `:191`).
   - **Related:** watcher mutation loop performs multiple sync Git reads (`src/modules/operations/run_shadow_commit.rs:30`, `:45`, `:75`).

2. **Duplicate full status scan per mutation event.**
   - **Impact:** unnecessary I/O and CPU on each debounced file event.
   - **Evidence:** `history::get_working_status(repo_path)` called twice in `src/modules/operations/run_shadow_commit.rs:30` and `:45`.

3. **Unbounded mutation history growth in SQLite.**
   - **Impact:** `humangit_cache.db` can grow indefinitely over time.
   - **Evidence:** every mutation inserts into `shadow_history` (`src/modules/operations/run_shadow_commit.rs:137-140`), schema has no retention/cap (`src/modules/shared/utils/schema.sql:14-20`).

4. **Overlapping periodic refresh calls can pile up.**
   - **Impact:** concurrent `invoke("get_working_status")` calls, inconsistent UI state under slow repos.
   - **Evidence:** unconditional async `setInterval` every second in `src/app/desktop/ts/gui.ts:161-165` with no in-flight guard.

5. **Commit signature behavior is inconsistent across operations.**
   - **Impact:** mixed author identity depending on action path.
   - **Evidence:** `init_repo` hardcodes signature (`src/modules/operations/init.rs:42`), while other flows read Git config (e.g., `commit_and_push.rs:19-32`, `pull.rs:7-20`).

## NOT MATTER (LOW PRIORITY)

1. **Empty placeholder modules increase navigation noise.**
   - **Evidence:** `src/modules/operations/checkout.rs`, `src/modules/operations/fetch.rs`, `src/modules/repo/state.rs`, `src/modules/shared/errors.rs`, `src/modules/git/porcelain.rs` are empty.
   - **Note:** not a runtime bug, but creates maintenance ambiguity.

2. **Inconsistent language/comments/log wording across code paths.**
   - **Evidence:** mixed Chinese/English comments and logs in multiple modules (e.g., `watcher.rs`, `log.ts`, `db.rs`).
   - **Note:** mostly readability/maintainability concern.
