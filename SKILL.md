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

## About the Model

Leanstral is Mistral AI's first open-source code agent for Lean 4 (released March 2026).
It is specialized for theorem proving — it generates proofs, and Lean 4 verifies them
mechanically. When a proof passes, correctness is a mathematical fact, not a probability.

| Spec | Value |
|---|---|
| Architecture | Mixture of Experts (128 experts, 4 active per token) |
| Total parameters | 119B |
| Active parameters | 6.5B per token |
| Context length | 256K tokens |
| License | Apache 2.0 (open weights) |
| API model ID | `labs-leanstral-2603` |

### Why Leanstral beats general-purpose LLMs at proofs

General-purpose LLMs (GPT, Claude, etc.) write code and hope it works — they test
a few inputs but miss edge cases. Leanstral writes code and **proves it correct for
all inputs**. When Lean 4 accepts the proof, correctness is guaranteed mathematically.

### FLTEval Benchmarks

| Model | Cost ($) | Score |
|---|---|---|
| Claude Haiku | 184 | 23.0 |
| Claude Sonnet | 549 | 23.7 |
| Claude Opus 4.6 | 1,650 | 39.6 |
| **Leanstral pass@1** | **18** | **21.9** |
| **Leanstral pass@2** | **36** | **26.3** |
| **Leanstral pass@4** | **72** | **29.3** |
| **Leanstral pass@16** | **290** | **31.9** |

**Pass@16 beats Sonnet at 1/2 the cost, approaches Opus at 1/6 the cost.**

## Recommended Parameters

When configuring the Leanstral sub-agent in OpenClaw:

| Parameter | Recommended | Why |
|---|---|---|
| `temperature` | **1.0** | Diverse proof strategies. Lower values produce repetitive attempts. |
| `max_tokens` | **32000** | Proofs are verbose. Generous output budget avoids truncation. |
| `thinking` / `reasoning_effort` | **high** | Required for non-trivial proofs. Drop to `medium` only for simple boolean logic. |
| Context limit | ≤ 200K tokens | Model supports 256K, but 200K is safer. |
| `timeoutSeconds` | **600–1200** | Proof generation + compilation can take minutes. |

### Pass@N Strategy

Leanstral improves significantly with multiple attempts. If a proof fails on the
first try, re-run the task — the model explores different proof strategies each
time. **pass@2 adds +4.4 points to the score.** Configure fallback models in
OpenClaw to automatically retry with different reasoning paths.

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
- For I/O-heavy code (file systems, network, databases — Lean 4 is for pure functions)
- For entire large codebases — focus on the critical core, not 100% coverage

## Workflow Patterns

### Pattern 1: Verify an existing code fix
```
1. Write the code + specification in Lean 4
2. Ask Leanstral: "Prove this implementation satisfies the specification"
3. Lean 4 verifies the proof
4. Pass → correctness guaranteed. Fail → failure point is the bug location.
```

### Pattern 2: Spec-driven development
```
1. Write the specification in Lean 4 first (what "correct" means)
2. Ask Leanstral to generate both implementation AND proof
3. When the proof passes → development complete. No tests needed.
```

### Pattern 3: Root-cause a bug
```
1. Observe the bug's symptoms
2. Write the "correct behavior" specification in Lean 4
3. Attempt to prove the current implementation satisfies it
4. The point where the proof fails = the bug's root cause
5. Fix, then re-prove to confirm
```

### Pattern 4: Safe refactoring
```
1. Write the pre- and post-refactoring code
2. Define equivalence as a specification
3. Ask Leanstral to prove they are equivalent
4. Proof passes → refactoring is mathematically safe
```

### Pattern 5: State machine / concurrency verification
```
1. Model the state machine as an inductive proposition in Lean 4
2. Formulate properties: "no deadlocks", "no unreachable states", etc.
3. Ask Leanstral to prove them
→ Catches concurrency bugs exhaustively, not probabilistically
```

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

| Setting | Recommended |
|---|---|
| Model | `labs-leanstral-2603` (Mistral) |
| Temperature | 1.0 |
| Max tokens | 32000 |
| Thinking / reasoning | high |
| Timeout | 600–1200 seconds |
| Fallback models | Any capable reasoning models (Claude, GPT, DeepSeek) |
| Agent ID | `<your-leanstral-agent-id>` — any name you choose |

> The Leanstral model is specialized for Lean 4 theorem proving but can be prone to
> timeouts. With `temperature=1.0` and multiple fallback models, the pass@N strategy
> significantly increases the chance of a successful proof.

## Verification flow

### Step 1: Identify the properties to be verified

Clearly state the properties to be proven in natural language. For example, when
verifying a code change that adds a new boolean guard condition:

- "When the user cancels, the side effect does not fire."
- "During system-generated timeouts, the side effect fires as before (unchanged)."
- "The guard flag only becomes true on user-initiated operations."

### Step 2: Build a formal model

Convert the natural language properties into Lean 4 types and theorems:

```lean
-- Model the relevant boolean conditions as variables
variable (timedOut compactDuring timeExecuting userAborted : Bool)

-- Condition BEFORE the change
def triggerOld : Bool := timedOut && !compactDuring && !timeExecuting

-- Condition AFTER the change (adds userAborted guard)
def triggerNew : Bool := timedOut && !compactDuring && !timeExecuting && !userAborted
```

### Step 3: Write the theorems

Write theorems corresponding to each property:

```lean
-- Property 1: User abort always prevents the condition
theorem user_abort_prevents (h : userAborted = true) :
    triggerNew timedOut compactDuring timeExecuting userAborted = false := by
  simp [triggerNew, h]

-- Property 2: System timeout behavior is unchanged
theorem internal_timeout_unchanged (h : userAborted = false) :
    triggerNew timedOut compactDuring timeExecuting userAborted =
    triggerOld timedOut compactDuring timeExecuting := by
  simp [triggerNew, triggerOld, h]

-- Property 3: The change is meaningful (witness where old=true, new=false)
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
- **Failure**: Read the error message → Give the error back to Leanstral → Recompile

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
    5. If it fails, read the error, fix the proof, and recompile
    6. Report the final compilation output

    Save to: /workspace/FormalVerification.lean
```

## Prompt Strategy

When instructing Leanstral, always provide:

```
[Context]
- Lean 4 version in use
- Dependencies (Mathlib, specific modules)
- The code/specification to verify

[Instruction]
- What property to prove
- Optional: suggested tactics or approach
- Any constraints (e.g., "only use simp and tauto")
```

### Concrete Example: Algorithm Correctness

```lean
-- Define the specification FIRST
def sorted_correct (arr : Array Nat) : Prop :=
  ∀ i j, i < j → j < arr.size → arr[i]! ≤ arr[j]!

-- Ask Leanstral: "Prove that bubbleSort satisfies sorted_correct"
def bubbleSort (arr : Array Nat) : Array Nat := by
  sorry -- implementation

theorem bubbleSort_correct (arr : Array Nat) :
  sorted_correct (bubbleSort arr) := by
  sorry -- Leanstral generates this proof
```

## Best Practices

### ✅ DO

1. **Write the specification first.** Define "correct" before implementing.
2. **Prove in small steps.** Break large theorems into lemmas.
3. **Set reasoning_effort="high".** Essential for non-trivial proofs.
4. **Use pass@N.** If the first attempt fails, re-run — each attempt explores different strategies.
5. **Feed Lean errors back to Leanstral.** The error message tells exactly what failed.
6. **Leverage Mathlib.** Use existing proven lemmas — don't re-prove everything from scratch.
7. **Keep examples small and focused.** One property per verification task.

### ❌ DON'T

1. **Use for I/O-heavy code.** Lean 4 is for pure functions. File I/O, networking, databases are impractical to formalize.
2. **Formalize an entire large codebase.** Pick the critical 5% — the core logic that must never be wrong.
3. **Confuse "proof passes" with "spec is correct."** Lean verifies that the implementation matches the spec. The spec's correctness is a human judgment.
4. **Use Leanstral for general tasks.** It's specialized for Lean 4 proofs — not for Python web apps, general chat, or code generation in other languages.
5. **Trust proofs blindly.** Lean's verification is trustworthy, but rare hallucinations (non-existent theorems/tactics) are caught by the compiler.

## Important Notes

### Host vs Sandbox

Lean must run on the **host**, not in the sub-agent's sandbox. The Mathlib
dependency tree is large (~500MB `.lake/`) and impractical to containerize.
Use `verify.sh` on the host; the sub-agent writes `.lean` files to `/workspace/`.

### Sub-agent sandbox

The sub-agent runs in a sandbox. The Lean compiler is not installed there, so
compile via the host's `verify.sh`. Files are saved in `/workspace/`, and
`verify.sh` copies them into the Lean project.

### Timeout countermeasures

The Leanstral model can time out on complex proofs. Countermeasures:
- Clearly divide tasks (focus on one file, one property at a time)
- List the theorems to be proven in advance
- Read context files in advance (diffs, review notes, source code)
- Configure multiple fallback models (pass@N effect)
- Set generous timeout (600–1200s) for proof generation + compilation

## Applications in Other Fields

| Field | Example |
|---|---|
| **Algorithms** | Correctness of sorting/searching, proof of computational complexity |
| **Security** | Safety of authentication protocols, access control properties |
| **Business logic** | Consistency of fee calculations, exhaustiveness of discount rules |
| **Data integrity** | Satisfaction of DB constraints, safety of schema migrations |
| **Protocols** | Deadlock-free state transitions, message ordering guarantees |
| **Mathematics** | Correctness of statistical calculations, equivalence of formula transformations |
| **State machines** | No unreachable states, all transitions defined, invariant preservation |
| **Refactoring** | Pre/post equivalence proofs, behavioral preservation guarantees |

### Application procedure

1. **Define the property in natural language** — "If X, then Y must always hold"
2. **Build a formal model** — Variables, types, functions that model the system
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

## Limitations

| Limitation | Detail |
|---|---|
| **Lean 4 only** | Does not support Coq, Isabelle, Agda, or other proof assistants |
| **I/O-poor** | File systems, networking, databases cannot be formalized practically |
| **Learning curve** | Requires understanding of Lean 4's tactic language |
| **Not for full codebases** | Formalizing an entire project is impractical — focus on critical core |
| **Proof length** | Complex proofs can be very long and may exceed context |
| **Hallucinations** | Rarely generates non-existent theorems/tactics — Lean catches these |

## Error Handling

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
1. Re-spawn the same task — the model will try different strategies (pass@N)
2. Model fallbacks configured in OpenClaw switch automatically
3. Divide the task into smaller lemmas
4. Reduce the number of theorems and proceed incrementally

## Reference Links

- **Leanstral blog**: https://mistral.ai/news/leanstral
- **Model (HuggingFace)**: https://huggingface.co/mistralai/Leanstral-2603
- **API docs**: https://docs.mistral.ai/models/leanstral-26-03
- **Lean 4**: https://github.com/leanprover/lean4
- **Mathlib**: https://github.com/leanprover-community/mathlib4
- **Lean AI leaderboard**: https://lean-lang.org/eval/
