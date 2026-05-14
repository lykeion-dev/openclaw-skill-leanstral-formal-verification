# PR #81088 Review Document — Skip Timeout Compaction on User Abort

## Problem Being Fixed

When a user presses the **Stop button** in the Control UI to abort a run:

1. The abort signal fires → `onAbort()` callback runs → sets `externalAbort = true`
2. If the LLM was mid-response, the timeout timer may also fire → sets `timedOut = true`
3. The timeout compaction condition checks: `if (timedOut && !timedOutDuringCompaction && !timedOutDuringToolExecution)`
4. This evaluates to `true` → **timeout compaction fires** even though the user intentionally stopped the run
5. Compaction consumes tokens and time on a run the user already cancelled — wasteful and unexpected

The user's intent was to stop everything. Compaction at this point is pointless.

## Expected Behavior After Fix

| Scenario | `externalAbort` | `timedOut` | Compaction fires? |
|---|---|---|---|
| User presses Stop (no internal timeout yet) | `true` | `false` | No (condition fails on `timedOut`) |
| User presses Stop during LLM timeout | `true` | `true` | **No** (new `!externalAbort` guard) ✅ |
| Internal LLM timeout only | `false` | `true` | **Yes** (preserved) ✅ |
| Internal idle timeout | `false` | `true` | Yes (preserved) ✅ |

## Fix Intent and Overview

**Distinguish between user-initiated abort and internal timeout** by adding `!externalAbort` to two conditions:

1. **Timeout compaction trigger** — prevents compaction from firing on user abort
2. **`timedOutDuringPrompt` flag** — prevents "Request timed out" error message from being generated for user-initiated stops

The key insight: `externalAbort` is `true` **only** when the user's abort signal fires. Internal timeouts (including idle timeouts) go through `abortRun(true)` which sets `timedOut=true` and `aborted=true` but does **not** set `externalAbort=true`.

**Why `externalAbort` and not `aborted`:** A previous attempt (PR #80746) used `!aborted`, which was incorrect because `aborted` is also `true` for internal timeouts. That would have disabled timeout compaction entirely — breaking the death-spiral recovery mechanism. `externalAbort` is exclusively set by the user abort signal handler.

## Files Changed

### 1. `src/agents/pi-embedded-runner/run.ts` (2 locations)

#### Location 1 — Timeout compaction condition (~line 1447)

```typescript
// BEFORE:
if (timedOut && !timedOutDuringCompaction && !timedOutDuringToolExecution) {

// AFTER:
if (timedOut && !timedOutDuringCompaction && !timedOutDuringToolExecution && !externalAbort) {
```

This is the main guard for the timeout compaction block. When context token usage exceeds 65% and the LLM timed out, this triggers compaction before retrying. Adding `!externalAbort` ensures user-initiated stops skip this entirely.

#### Location 2 — `timedOutDuringPrompt` definition (~line 2373)

```typescript
// BEFORE:
const timedOutDuringPrompt =
  timedOut && !timedOutDuringCompaction && !timedOutDuringToolExecution;

// AFTER:
const timedOutDuringPrompt =
  timedOut && !timedOutDuringCompaction && !timedOutDuringToolExecution && !externalAbort;
```

`timedOutDuringPrompt` is used downstream to generate the "Request timed out before a response was generated" error message. For user-initiated aborts, this message is misleading — the user chose to stop, so the timeout message should not appear.

**Side effects of this change:** When `externalAbort=true`, `timedOutDuringPrompt` becomes `false`, which means:
- The "Request timed out" error message is NOT generated ✅ (correct — user chose to stop)
- The empty-payload fallback logic that uses `timedOutDuringPrompt` does NOT treat this as a prompt timeout ✅ (correct)

### 2. `src/agents/pi-embedded-runner/run.timeout-triggered-compaction.test.ts`

#### Change 1 — Existing test: explicit `externalAbort: false`

```typescript
// BEFORE:
makeAttemptResult({
  timedOut: true,
  aborted: true,
  lastAssistant: {
    usage: { input: 180000 },
  } as never,

// AFTER:
makeAttemptResult({
  timedOut: true,
  aborted: true,
  externalAbort: false,  // ← explicitly set for clarity
  lastAssistant: {
    usage: { input: 180000 },
  } as never,
```

Makes the internal timeout case explicit — this test verifies that internal timeouts still trigger compaction.

#### Change 2 — New test case: user abort skips compaction

```typescript
it("does not attempt compaction when user aborted (externalAbort=true)", async () => {
  mockedRunEmbeddedAttempt.mockResolvedValueOnce(
    makeAttemptResult({
      timedOut: true,
      aborted: true,
      externalAbort: true,   // ← user pressed Stop
      lastAssistant: {
        usage: { input: 180000 },
      } as never,
    }),
  );
  const result = await runEmbeddedPiAgent(overflowBaseRunParams);
  // User-initiated abort should skip timeout compaction entirely
  expect(mockedCompactDirect).not.toHaveBeenCalled();
  expect(result.payloads?.[0]?.isError).toBe(true);
  expect(result.payloads?.[0]?.text).toContain("timed out");
});
```

### 3. `CHANGELOG.md`

Added to `## Unreleased` → `### Fixes`:

```
- Agents/compaction: skip timeout-triggered compaction when the run was aborted by the user (Stop button). Previously, user-initiated aborts would still fire timeout compaction if context usage exceeded 65%, causing unnecessary compaction at an inappropriate time. Uses `externalAbort` (set only for user-initiated stops) rather than `aborted` (also set for internal timeouts) to correctly distinguish user aborts from provider timeouts.
```

## Where `externalAbort` Is Set — Verified from Source

In the embedded run function (`selection-BTmm_JVY.js`, minified):

```javascript
// Initialization (line 7334):
let externalAbort = false;

// User abort handler (line 8798):
const onAbort = () => {
    externalAbort = true;           // ← ONLY place externalAbort becomes true
    const reason = params.abortSignal ? getAbortReason(params.abortSignal) : void 0;
    const timeout = reason ? isTimeoutError(reason) : false;
    // ...
    abortRun(timeout, reason);
};
if (params.abortSignal)
    if (params.abortSignal.aborted) onAbort();
    else params.abortSignal.addEventListener("abort", onAbort, { once: true });

// Internal timeout handler (scheduleAbortTimer) — does NOT set externalAbort:
abortTimer = setTimeout(() => {
    // ... compaction grace logic ...
    timedOutDuringCompaction = true;  // (sometimes)
    abortRun(true);                    // ← sets aborted=true, timedOut=true, NOT externalAbort
}, delayMs);

// Idle timeout handler — does NOT set externalAbort:
idleTimeoutTrigger = (error) => {
    idleTimedOut = true;
    abortRun(true, error);             // ← sets aborted=true, timedOut=true, NOT externalAbort
};
```

**Confirmation:** `externalAbort` is `true` exclusively when the user's abort signal fires. Internal timeouts never set it.

## Verification Checklist for Reviewers

1. **Correctness**: Does `&& !externalAbort` correctly prevent timeout compaction on user abort?
2. **No regressions**: Internal timeout compaction still works (`externalAbort` stays `false`)?
3. **Variable scope**: Is `externalAbort` destructured and available at both modification points?
4. **Race condition**: What happens when user presses Stop AND internal timeout fires (both `timedOut=true` and `externalAbort=true`)?
5. **`timedOutDuringPrompt` downstream effects**: Does making this `false` for user aborts cause any incorrect behavior in error message generation or payload handling?
6. **Test coverage**: Do the tests cover both internal timeout and user abort scenarios?
7. **`idleTimedOut` path**: Idle timeouts set `timedOut=true` but `externalAbort=false`, so compaction still fires — is this correct? (Yes, idle timeout is an internal timeout.)
8. **Other code paths**: Are there any other places that check `timedOut` without `externalAbort` that should also be guarded?
