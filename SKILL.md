---
name: leanstral-formal-verification
description: >
  Formal verification using Lean 4 + Leanstral (labs-leanstral-2603) model.
  Use when: you need mathematical proof of code correctness, protocol verification,
  algorithm correctness, security property proofs, or any property that can be
  expressed as a logical theorem.
  Triggers: "形式証明", "formal verification", "Lean証明", "mathematical proof",
  "theorem proving", "Leanstral", "コード検証", "correctness proof"
---

# Leanstral Formal Verification

Lean 4 + Mathlib + Leanstralモデルを使った形式証明のスキル。コードの性質を数学的に証明する。

## いつ使うか

**使う場面:**
- コードの修正が意図した性質を満たすことの証明
- セキュリティプロパティの形式的検証
- アルゴリズムの正しさの証明
- プロトコルの安全性検証
- 複数の条件分岐が網羅的であることの証明
- 「この変更は既存の動作を壊さない」ことの形式的保証

**使わない場面:**
- 単なるユニットテストで十分な場合
- 実行時の振る舞いを確認したい場合（実際に動かして確認）
- 証明不可能な主観的性質（UX、デザイン等）

## 環境

### ホスト環境（コンパイル用）

| 項目 | 値 |
|---|---|
| Lean バージョン | 4.29.1 (`leanprover/lean4:v4.29.1`) |
| Mathlib | `leanprover-community/mathlib4` v4.29.1 |
| elan パス | `~/.elan/bin/` |
| プロジェクト | `/tmp/lean-pr81088/` |
| `.lake` サイズ | ~579MB（Mathlibキャッシュ含む） |
| 検証スクリプト | `/tmp/lean-pr81088/verify.sh` |

### サブエージェント

| 項目 | 値 |
|---|---|
| エージェントID | `free-leanstral-code-verifier-agentic` |
| モデル | `labs-leanstral-2603` (Mistral) |
| フォールバック | `MiniMax-M2.7`, `MiniMax-M2.5`, `mimo-v2.5-pro` |

### サンドボックス

| 項目 | 値 |
|---|---|
| イメージ | `openclaw-sandbox:bookworm-slim` |
| 再ビルド方法 | `docker build -t openclaw-sandbox:bookworm-slim /tmp/sandbox-build/` |

## 検証スクリプトの使い方

```bash
export PATH="$HOME/.elan/bin:$PATH"
bash /tmp/lean-pr81088/verify.sh /path/to/your-file.lean
```

スクリプトの動作:
1. 指定された `.lean` ファイルを `/tmp/lean-pr81088/PR81088/PR81088.lean` にコピー
2. `lake build` を実行
3. 成功時: `Build completed successfully (N jobs).`
4. 失敗時: エラーメッセージ（行番号 + 内容）が出力される

## 検証フロー

### ステップ1: 検証対象の性質を特定する

証明したい性質を自然文で明確にする:
- 「ユーザーがStopを押したとき、コンパクションは発生しない」
- 「内部タイムアウト時は、コンパクションが従来通り発生する」
- 「externalAbortがtrueになるのは、ユーザーのStop操作のみ」

### ステップ2: 形式モデルを構築する

自然文の性質をLean 4の型・定理に変換する:

```lean
-- 変数定義（ブールフラグをモデル化）
variable (T C E A : Bool)
-- T = timedOut, C = timedOutDuringCompaction, E = timedOutDuringToolExecution, A = externalAbort

-- 変更前の条件
def compactionTriggerOld : Bool := T && !C && !E

-- 変更後の条件
def compactionTriggerNew : Bool := T && !C && !E && !A
```

### ステップ3: 定理を記述する

各性質に対応する定理を書く:

```lean
-- 定理1: ユーザーAbort時は常にコンパクションを防止
theorem compaction_user_abort_prevents (hA : A = true) :
    compactionTriggerNew T C E A = false := by
  simp [compactionTriggerNew, hA]

-- 定理2: 内部タイムアウトは従来通り
theorem compaction_internal_preserved (hA : A = false) :
    compactionTriggerNew T C E A = compactionTriggerOld T C E := by
  simp [compactionTriggerNew, compactionTriggerOld, hA]

-- 定理3: 修正に意味がある（old=true, new=false となるケースが存在）
theorem compaction_fix_matters :
    compactionTriggerOld true false false = true ∧
    compactionTriggerNew true false false true = false := by
  simp [compactionTriggerOld, compactionTriggerNew]
```

### ステップ4: コンパイル・検証

```bash
bash /tmp/lean-pr81088/verify.sh /path/to/FormalVerification.lean
```

- **成功**: `Build completed successfully` → 証明完了
- **失敗**: エラーメッセージを読んで修正 → 再コンパイル

### ステップ5: 結果を報告する

- 証明された定理の一覧
- コンパイル出力（成功メッセージ）
- 各定理が現実のどの性質に対応するか

## サブエージェントへの委任

メインエージェントがLeanコードを書く必要はない。Leanstralサブエージェントに委任する:

```
sessions_spawn:
  agentId: free-leanstral-code-verifier-agentic
  task: |
    You are a Lean 4 formal verification expert.

    ## Context
    [検証対象の説明、PRの内容、変更箇所]

    ## Environment
    Lean 4 is available on the HOST. To compile:
    ```bash
    export PATH="$HOME/.elan/bin:$PATH"
    bash /tmp/lean-pr81088/verify.sh /workspace/your-file.lean
    ```

    ## Task
    1. 検証対象の性質を特定
    2. Lean 4の形式モデルを構築
    3. 定理を記述・証明
    4. verify.shでコンパイル検証（必須）
    5. 失敗したらエラー修正→再コンパイル
    6. 最終的なコンパイル出力を報告

    Save to: /workspace/FormalVerification.lean
```

## 重要な注意点

### Dockerは使わない

`.lake` ディレクトリが579MBあり、Dockerイメージ化は非現実的。ホストの `elan` を直接使用する。

### サブエージェントのsandbox

サブエージェントはsandbox内で実行される。Leanコンパイラはsandboxにインストールされていないため、ホストの `verify.sh` を使う。ファイルは `/workspace/` に保存し、`verify.sh` がプロジェクト内にコピーする。

### タイムアウト対策

Leanstralモデルはタイムアウトしやすい。以下の対策:
- タスクを明確に分割する（1つのファイルに集中）
- 証明すべき定理を事前に列挙しておく
- コンテキストファイルを事前に読んでおく（diff, PR_REVIEW, source code）
- フォールバックモデルが複数設定されている

## 他の分野への応用

### コード検証以外での使用例

| 分野 | 例 |
|---|---|
| **アルゴリズム** | ソートアルゴリズムの正しさ、計算量の証明 |
| **セキュリティ** | 認証プロトコルの安全性、アクセス制御の性質 |
| **ビジネスロジック** | 料金計算の整合性、割引ルールの網羅性 |
| **データ整合性** | DB制約の充足、マイグレーションの安全性 |
| **プロトコル** | 状態遷移のデッドロックフリー、メッセージ順序 |
| **数学** | 統計計算の正しさ、数式変形の等価性 |

### 応用の手順

1. **検証対象の性質を自然文で定義** — 「Xの場合、必ずYが成り立つ」
2. **形式モデルを構築** — 変数・型・関数で対象をモデル化
3. **定理を記述** — 性質を `theorem` で表現
4. **証明** — `by` ブロックで証明を書く（`simp`, `tauto`, `cases`, `rw` 等）
5. **コンパイル検証** — `lake build` でLeanが証明をチェック

### 証明タクティクスの基本

| タクティクス | 用途 |
|---|---|
| `simp` | 定義を展開して簡約 |
| `tauto` | 命題論理の自動証明 |
| `rw [h]` | 仮定 `h` で書き換え |
| `cases` | 場合分け |
| `intro h` | 含意の導入 |
| `rfl` | 自明な等式 |
| `constructor` | 連言の分割 |

## エラーハンドリング

### コンパイルエラー

```
error: unknown identifier 'foo'
```
→ 定義が存在しない。`def` で定義するか、`import` を追加。

```
error: type mismatch
```
→ 型の不一致。変数の型宣言を確認。

```
error: tactic 'simp' failed
```
→ `simp` で証明できない。より具体的なタクティクス（`cases`, `rw`）を使用。

### サブエージェントタイムアウト

Leanstralがタイムアウトした場合:
1. 同じタスクを再spawn（モデルフォールバックが自動で切り替わる）
2. タスクを小さく分割する
3. 証明すべき定理を減らして段階的に進める

## 参照ファイル

- 実例: `/tmp/lean-pr81088/PR81088/FormalVerification.lean`（PR #81088の13定理）
- 検証レポート: `projects/pr-81088-verification/VERIFICATION_REPORT.md`
- PR diff: `subagents/free-leanstral-code-verifier-agentic/pr-81088.diff`
- PRレビュー: `projects/pr-81088-verification/PR_REVIEW.md`
