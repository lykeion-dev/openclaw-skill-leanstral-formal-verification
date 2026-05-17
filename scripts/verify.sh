#!/bin/bash
# Lean 4 verification script
# Usage: verify.sh <lean-file>
# Copies the lean file into the project and runs lake build

export PATH="$HOME/.elan/bin:$PATH"

# Edit this to point to your Lean project directory
PROJECT_DIR="${LEAN_PROJECT_DIR:-$(cd "$(dirname "$0")/../lean-project" && pwd)}"

if [ -z "$1" ]; then
    echo "Usage: verify.sh <lean-file>"
    exit 1
fi

cp "$1" "$PROJECT_DIR/FormalVerification.lean"
cd "$PROJECT_DIR"
lake build 2>&1
