# Example: Verifying a Boolean Guard Addition

This directory contains a complete worked example of formal verification with
Lean 4 + Leanstral, demonstrating how to verify a common software engineering
pattern: adding a guard condition to prevent a side effect on user cancellation.

## Files

- **FormalVerification.lean** — Lean 4 proof (13 theorems, all verified)
- **PR_CONTEXT.md** — The scenario and verification tasks
- **PR_REVIEW.md** — Detailed review of the fix
- **VERIFICATION_REPORT.md** — Formal verification report

## The Pattern

Adding `&& !userAborted` to a condition that triggers a side effect, to prevent
the side effect from firing when the user has already requested cancellation.
This is a recurring pattern in server-side applications, job runners, and
interactive systems.

## How to Use

1. Read `PR_CONTEXT.md` for the problem statement
2. Study `FormalVerification.lean` for the proofs
3. See `PR_REVIEW.md` for the review approach
4. Check `VERIFICATION_REPORT.md` for the final verification results

Use this as a template for your own verification tasks — adapt the boolean
variables, theorems, and proof tactics to match your specific code change.
