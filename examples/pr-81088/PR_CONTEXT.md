# Example Verification Scenario — Adding a Guard Condition

> This is an illustrative example showing how to use Lean 4 formal verification
> on a real-world code change. The scenario is abstracted from an actual bug fix.

## Problem Being Fixed

A system has a mechanism that triggers a side effect (e.g., compaction, retry,
cleanup) when a timeout occurs. However, there is a bug: when the **user
cancels an operation**, the timeout-driven side effect still fires. The user's
intent was to stop — triggering the side effect is wasteful and unexpected.

## The Fix (Abstract Pattern)

```typescript
// BEFORE:
if (timedOut && !alreadyCompacting && !executingTool) {
    triggerSideEffect(); // side effect fires even on user cancel
}

// AFTER:
if (timedOut && !alreadyCompacting && !executingTool && !userAborted) {
    triggerSideEffect(); // side effect skipped when user cancelled
}
```

The fix adds `&& !userAborted` to the guard condition. The key requirement:
`userAborted` is `true` **only** when the user explicitly cancels, never during
system-generated timeouts.

## What Needs Verification

1. **Correctness**: Does `&& !userAborted` correctly prevent the side effect on user cancel?
2. **No regressions**: Does the side effect still fire for system-generated timeouts?
3. **Exclusivity**: Is `userAborted` set to `true` exclusively for user actions?
4. **Meaningfulness**: Is there a concrete scenario where the fix actually changes behavior?

## Formal Model (in Lean 4)

The properties above are modeled as boolean variables:
- `timedOut`: the timeout condition occurred
- `compactDuring` / `executingTool`: other conditions that suppress the side effect
- `userAborted`: the user explicitly cancelled

See `FormalVerification.lean` for the complete proof (13 theorems).

## Expected Behavior After Fix

| Scenario | `userAborted` | `timedOut` | Side effect? |
|---|---|---|---|
| User cancels (no timeout) | `true` | `false` | No (fails on `timedOut`) |
| User cancels during timeout | `true` | `true` | **No** (new guard) ✅ |
| System timeout only | `false` | `true` | **Yes** (preserved) ✅ |
| Normal completion | `false` | `false` | No (fails on `timedOut`) |

## How to Use This Example

1. Read the scenario above to understand the pattern being verified
2. Study `FormalVerification.lean` to see the Lean 4 proofs
3. Adapt the pattern to your own code changes:
   - Identify the boolean conditions in your code
   - Model them as Lean variables
   - Express your properties as theorems
   - Prove them using `simp`, `tauto`, `cases`, etc.
