# Code Review — `v0.1.0-alpha.10-pre-2`

## Verdict
**Needs changes before release.** The overall structure is solid, but a few runtime behaviors can still cause noisy failures or hidden operational errors.

## Findings

| Severity   | Finding                                                           | Evidence                                                                                                                                                                                          | Why it matters                                                                                                                | Recommendation                                                                                                                    |
|------------|-------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| **Medium** | **Cached repository path is restored without path validation**    | `src\app\desktop\ts\gui.ts:225-237` restores cached path and immediately calls `update_repo_path`; `src\modules\operations\open_folder.rs:14-48` only validates non-empty string and persists it. | If the folder was moved/deleted, startup repeatedly points watcher/state at an invalid path and causes recurring error noise. | Validate existence/readability in `update_repo_path` before accepting/persisting, and clear bad cache entries when restore fails. |
| **Medium** | **Periodic file refresh can overlap concurrent backend calls**    | `src\app\desktop\ts\gui.ts:260-264` uses `setInterval(async ...)` every second with no in-flight guard.                                                                                           | Slow `refreshFileList()` calls can stack and create avoidable load/jitter from concurrent `get_working_status` invokes.       | Add an in-flight lock or replace with self-scheduling `setTimeout` that waits for prior refresh completion.                       |
| **Low**    | **Remote add flow swallows invoke failures that are not emitted** | `src\app\desktop\ts\modules\buttons.ts:812-818` catches and ignores all exceptions from `invoke("add_remote_origin")`.                                                                            | Transport/runtime invoke failures can be completely silent if backend emit does not fire, making troubleshooting difficult.   | Log the caught error (or rethrow to shared handler) while still keeping event-driven success/error messaging.                     |

## Positive notes

- Remote URL validation is now appropriately permissive for common Git URL formats (`src\app\desktop\ts\modules\buttons.ts:88-101`).
- Quick deploy now requires a non-empty message and delegates commit creation through Git CLI, reducing accidental low-quality commit behavior (`src\modules\operations\commit.rs:60-67`).
- Blocking Git operations continue to be routed through `spawn_blocking` in Tauri handlers (`src\modules\ui_bridge\handlers.rs`).
