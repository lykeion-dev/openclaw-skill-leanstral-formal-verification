---
name: leanstral-formal-verification
description: >
  Formal verification using Lean 4 + Leanstral (labs-leanstral-2603) model.
  Use when: you need mathematical proof of code correctness, protocol verification,
  algorithm correctness, security property proofs, or any property that can be
  expressed as a logical theorem.
  Triggers: "formal proof", "formal verification", "Lean proof", "mathematical proof",
  "theorem proving", "Leanstral", "code verification", "correctness proof"
---

# Leanstral Formal Verification

A skill for formal verification using Lean 4 + Mathlib + the **Leanstral** model
(`labs-leanstral-2603`) from Mistral AI to mathematically prove code properties.

> **🔑 Requires a Mistral API key.** Set via the OpenClaw gateway configuration.
> The Leanstral model is available for **free** via Mistral's API as of 2026-05-17.
> Get a key at: https://console.mistral.ai/api-keys

## Prerequisites

Before using this skill, set up a Lean 4 project on the host:

1. Install [elan](https://github.com/leanprover/elan) (Lean version manager)
2. Create a Lean project: `lake new formal-verification`
3. Add Mathlib as a dependency in `lakefile.lean`
4. Run `lake build` once to build the Mathlib cache (~500MB, one-time cost)
5. Create a `verify.sh` script in the project root (see below)

### verify.sh template

```bash
#!/bin/bash
# verify.sh — compile and check a Lean 4 proof file
# Usage: bash verify.sh /path/to/proof.lean
set -e
export PATH="$HOME/.elan/bin:$PATH"
PROJECT_DIR="<your-lean-project-dir>"
cp "$1" "$PROJECT_DIR/Proof.lean"
cd "$PROJECT_DIR"
lake build
```

## When to use

**Use cases:**
- Proving that a code fix satisfies the intended properties
- Formal verification of security properties
- Proving the correctness of algorithms
- Verifying the safety of protocols
- Proving that multiple conditional branches are exhaustive
- Providing formal assurance that "this change does not break existing behavior"

**Do not use:**
- When simple unit tests are sufficient
- When you want to check runtime behavior (test by actually running it)
- For unprovable subjective properties (UX, design, etc.)

## Environment

### Host environment (for compilation)

| Item | Value |
|---|---|
| Lean version | 4.x (latest stable via elan) |
| Mathlib | `leanprover-community/mathlib4` |
| elan path | `~/.elan/bin/` |
| Project directory | `<your-lean-project-dir>` |
| `.lake` size | ~500MB (one-time Mathlib cache) |
| Verification script | `<your-lean-project-dir>/verify.sh` |

### Sub-agent configuration

Configure a sub-agent in your OpenClaw gateway with:

| Setting | Recommendation |
|---|---|
| Model | `labs-leanstral-2603` (Mistral) |
| Fallback models | Any capable reasoning models (e.g., Claude, GPT, DeepSeek) |
| Agent ID | `<your-leanstral-agent-id>` — any name you choose |

> The Leanstral model is specialized for Lean 4 theorem proving but can be prone to
> timeouts. Configuring multiple fallback models ensures the task completes even if
> the primary model is slow.

## How to use the verification script

```bash
export PATH="$HOME/.elan/bin:$PATH"
bash <lean-project-dir>/verify.sh /path/to/your-file.lean
```

Script behavior:
1. Copies the specified `.lean` file into the Lean project
2. Runs `lake build`
3. Success: `Build completed successfully (N jobs).`
4. Failure: Error message (line number + content) is output

## Verification flow

### Step 1: Identify the properties to be verified

Clearly state the properties to be proven in natural language. For example, when
verifying a code change that adds a new boolean flag `externalAbort` to prevent
compaction during user-initiated aborts:

- "When the user triggers an abort, compaction does not occur."
- "During an internal timeout, compaction occurs as before (unchanged)."
- "The flag only becomes true on user-initiated operations."

### Step 2: Build a formal model

Convert the natural language properties into Lean 4 types and theorems:

```lean
-- Model the relevant boolean conditions as variables
variable (timedOut compactDuring timeExecuting userAborted : Bool)

-- Condition BEFORE the change
def triggerOld : Bool := timedOut && !compactDuring && !timeExecuting

-- Condition AFTER the change (adds userAborted check)
def triggerNew : Bool := timedOut && !compactDuring && !timeExecuting && !userAborted
```

### Step 3: Write the theorems

Write theorems corresponding to each property:

```lean
-- Property 1: User abort always prevents the condition
theorem user_abort_prevents (h : userAborted = true) :
    triggerNew timedOut compactDuring timeExecuting userAborted = false := by
  simp [triggerNew, h]

-- Property 2: Internal timeout behavior is unchanged
theorem internal_timeout_unchanged (h : userAborted = false) :
    triggerNew timedOut compactDuring timeExecuting userAborted =
    triggerOld timedOut compactDuring timeExecuting := by
  simp [triggerNew, triggerOld, h]

-- Property 3: The change is meaningful (there is a case where it matters)
theorem change_is_meaningful :
    triggerOld true false false = true ∧
    triggerNew true false false true = false := by
  simp [triggerOld, triggerNew]
```

### Step 4: Compile and verify

```bash
bash <lean-project-dir>/verify.sh /path/to/FormalVerification.lean
```

- **Success**: `Build completed successfully` → Proof completed
- **Failure**: Read the error message and fix it → Recompile

### Step 5: Report the results

- List of proven theorems
- Compilation output (success message)
- Which real-world properties each theorem corresponds to

## Delegation to sub-agent

The main agent does not need to write Lean code. Delegate to the Leanstral sub-agent:

```
sessions_spawn:
  agentId: <your-leanstral-agent-id>
  task: |
    You are a Lean 4 formal verification expert.

    ## Context
    [Description of the verification target, the code change, and the
     properties that need to be proven]

    ## Environment
    Lean 4 is available on the HOST. To compile:
    ```bash
    export PATH="$HOME/.elan/bin:$PATH"
    bash <lean-project-dir>/verify.sh /workspace/your-file.lean
    ```

    ## Task
    1. Identify the properties to be verified
    2. Build a formal model in Lean 4
    3. Write and prove theorems
    4. Verify compilation using verify.sh (mandatory)
    5. If it fails, fix the error and recompile
    6. Report the final compilation output

    Save to: /workspace/FormalVerification.lean
```

## Important notes

### Host vs Sandbox

Lean must run on the **host**, not in the sub-agent's sandbox. The Mathlib
dependency tree is large (~500MB `.lake/`) and impractical to containerize.
Use `verify.sh` on the host; the sub-agent writes `.lean` files to `/workspace/`.

### Sub-agent sandbox

The sub-agent runs in a sandbox. The Lean compiler is not installed there, so
compile via the host's `verify.sh`. Files are saved in `/workspace/`, and
`verify.sh` copies them into the Lean project.

### Timeout countermeasures

The Leanstral model is prone to timeouts. Countermeasures:
- Clearly divide tasks (focus on one file)
- List the theorems to be proven in advance
- Read context files in advance (diffs, review notes, source code)
- Configure multiple fallback models

## Applications in other fields

### Use cases beyond code verification

| Field | Example |
|---|---|
| **Algorithms** | Correctness of sorting algorithms, proof of computational complexity |
| **Security** | Safety of authentication protocols, properties of access control |
| **Business logic** | Consistency of fee calculations, comprehensiveness of discount rules |
| **Data integrity** | Satisfaction of DB constraints, safety of migrations |
| **Protocols** | Deadlock-free state transitions, message ordering |
| **Mathematics** | Correctness of statistical calculations, equivalence of formula transformations |

### Application procedure

1. **Define the properties to be verified in natural language** — "If X, then Y must always hold"
2. **Build a formal model** — Model the subject using variables, types, and functions
3. **Write theorems** — Express properties using `theorem`
4. **Prove** — Write proofs in `by` blocks (`simp`, `tauto`, `cases`, `rw`, etc.)
5. **Compile and verify** — Lean checks the proof using `lake build`

### Basic proof tactics

| Tactic | Use |
|---|---|
| `simp` | Expand definitions and simplify |
| `tauto` | Automatic proof of propositional logic |
| `rw [h]` | Rewrite using assumption `h` |
| `cases` | Case analysis |
| `intro h` | Introduce implication |
| `rfl` | Trivial equality |
| `constructor` | Split a conjunction |

## Error handling

### Compilation errors

```
error: unknown identifier 'foo'
```
→ The definition does not exist. Define it with `def` or add an `import`.

```
error: type mismatch
```
→ Type mismatch. Check the variable type declaration.

```
error: tactic 'simp' failed
```
→ `simp` cannot prove it. Use more specific tactics (`cases`, `rw`).

### Sub-agent timeout

If Leanstral times out:
1. Respawn the same task (model fallback switches automatically)
2. Divide the task into smaller parts
3. Reduce the number of theorems to prove and proceed step by step
