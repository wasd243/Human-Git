# CODE REVIEW — v0.1.0-alpha.11-pre-1

## Scope

Review based on the current code shared in chat (Tauri + Rust backend + desktop TS frontend).

---

## Executive Summary

The codebase is generally modular and readable, but there are several correctness and maintainability issues:

- **2 clear logic bugs** (one no-op pattern duplicated in UI handlers, one logging color mismatch).
- **Several medium-severity UX/robustness issues** (event listener lifecycle, inconsistent labeling, duplicated wiring risk).
- **A few low-severity cleanliness issues** (unused/legacy modules and suspicious no-op references).

---

## Findings

## 1) No-op function references in button handlers (likely bug / leftover code)

**Severity:** High  
**Files:**
- `src\app\desktop\ts\modules\buttons\btnPullAction.ts`
- `src\app\desktop\ts\modules\buttons\btnRemoteAction.ts`

### Problem

Both files contain statements like:

- `setFetchPruneConfirmOverlayVisible;`

This is just a **reference to a function**, not a call. It has no effect at runtime and strongly suggests unfinished or accidental code.

### Why it matters

- Indicates dead logic and possible missing behavior.
- Misleads future maintenance (looks like overlay coordination is intended but never executed).

### Suggested fix

- Remove these no-op references if not needed.
- If intended, replace with real invocations, e.g.:
  - `setFetchPruneConfirmOverlayVisible(fetchPruneConfirmOverlay, false);`
  - or whatever behavior is expected in those click flows.

---

## 2) Log color key mismatch prevents magenta color rendering

**Severity:** Medium  
**Files:**
- `src\modules\shared\utils\color.rs`
- Callers: `process_mutation.rs`, `watcher.rs`

### Problem

`log_color` accepts `"mag"` in the match arm:

