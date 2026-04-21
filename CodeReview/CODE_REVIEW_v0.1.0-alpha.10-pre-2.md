# Code Review — `v0.1.0-alpha.10-pre-2` (refresh)

## Verdict
**Ready after fixes.** The previously reported runtime reliability issues are now addressed in code.

## Findings

| Severity | Finding | Where | How to fix | Current status / evidence |
|---|---|---|---|---|
| **Medium** | Cached repository path restore accepted invalid paths | `src\modules\operations\open_folder.rs`, `src\app\desktop\ts\gui.ts`, `src\main.rs` | Validate candidate path before state/cache update; if restore fails, clear stale `last_repo_path` cache entry and register clear command in Tauri handler list. | **DONE**: path existence + directory checks in `update_repo_path` (`open_folder.rs:22-28`), new `clear_cached_repo_path` command (`open_folder.rs:74-88`) registered (`main.rs:92-96`), and restore flow clears bad cache (`gui.ts:232-240`). |
| **Medium** | Periodic refresh could overlap concurrent `refreshFileList()` calls | `src\app\desktop\ts\gui.ts` | Replace `setInterval(async ...)` with self-scheduling loop + in-flight guard so next cycle only starts after prior completion. | **DONE**: `refreshInFlight` guard + recursive `setTimeout` scheduler (`gui.ts:266-282`). |
| **Low** | Remote add invoke failure was swallowed in UI | `src\app\desktop\ts\modules\buttons\btnRemoteConfirm.ts` | Log caught invoke errors so transport/runtime failures are visible even if event emission fails. | **DONE**: catch now logs explicit error (`btnRemoteConfirm.ts:41-43`). |

## Positive notes

- Repo-path failure handling now self-heals stale cache on startup restore failure instead of repeatedly reusing an invalid path.
- Refresh scheduling now prevents backend call pileups when file-status queries are slow.
- Remote add path now preserves event-driven success flow while surfacing invoke-level failures.
