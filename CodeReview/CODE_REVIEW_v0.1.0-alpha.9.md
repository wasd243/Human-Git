# CODE REVIEW — v0.1.0-alpha.9

## FIX IMMIDIATELY

1. **[COMPLETED] `fetch` operation is missing authentication callbacks, so fetch can fail on private remotes while push/pull work.**
   - **Impact:** Core Git flow is inconsistent; users may be blocked from syncing in authenticated repositories.
   - **Evidence:** Fixed in `src/modules/operations/fetch.rs:21-39` by adding `RemoteCallbacks` credentials and wiring with `fetch_options.remote_callbacks(callbacks)`.

2. **[COMPLETED] File watcher and mutation paths silently fall back to `"."` when repository path cannot be converted to UTF-8.**
   - **Impact:** Git operations can run against the wrong repository path in edge cases, producing incorrect status/logs.
   - **Evidence:** Fixed in `src/modules/watcher.rs:42`, `:79`, `:95`, `:109`, `:136`, `:194`, `:237` by using `to_string_lossy().to_string()` (`current_dir_str` / `watcher_dir_str`) and passing those values instead of fallback `"."`.

## NEED FIX

1. **Blocking Git calls are still executed directly in async Tauri handlers.**
   - **Impact:** UI responsiveness can degrade on large repositories.
   - **Evidence:** `src/modules/ui_bridge/handlers.rs:73` (`add::stage_files`) and `:190` (`history::get_working_status`) run without `tokio::task::spawn_blocking`.

2. **Commit author/committer is hardcoded and ignores repository/user Git identity.**
   - **Impact:** Commit attribution is inaccurate and inconsistent with user environment.
   - **Evidence:** `Signature::now("HumanGit", "humangit@system.local")` in `src/modules/operations/commit.rs:11`, `init.rs:42`, `commit_and_push.rs:78`, `pull.rs:109`.

3. **[Update later]Periodic file list refresh can overlap and queue concurrent invokes.**
   - **Impact:** Unnecessary backend load and occasional UI state jitter under slow repositories.
   - **Evidence:** `src/app/desktop/ts/gui.ts:194-198` uses `setInterval(async () => await refreshFileList(), 1000)` with no in-flight guard.

4. **`process_mutation` swallows status-read failures and returns success-shaped result.**
   - **Impact:** Mutation processing can silently skip real updates while outer loop sees no error.
   - **Evidence:** `src/modules/operations/process_mutation.rs:29-38` logs error then `return Ok(())`.

## NOT MATTER

1. **Several declared modules are still empty placeholders.**
   - **Impact:** No runtime issue, but adds maintenance noise.
   - **Evidence:** `src/modules/operations/checkout.rs`, `src/modules/repo/state.rs`, `src/modules/shared/errors.rs`, `src/modules/git/porcelain.rs`.

2. **Comment language/style is mixed across files (English + Chinese + legacy wording).**
   - **Impact:** Readability/consistency issue only.
   - **Evidence:** e.g. `src/app/desktop/ts/modules/background.ts` comments and mixed wording patterns across Rust/TS files.
