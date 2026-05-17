#!/bin/bash
# Lean 4 verification script
# Usage: verify.sh <lean-file>
# Copies the lean file into the project and runs lake build
# Checks for proof holes (sorry, admit) before building.

export PATH="$HOME/.elan/bin:$PATH"

# Edit this to point to your Lean project directory
PROJECT_DIR="${LEAN_PROJECT_DIR:-$(cd "$(dirname "$0")/../lean-project" && pwd)}"

if [ -z "$1" ]; then
    echo "Usage: verify.sh <lean-file>"
    exit 1
fi

echo "=== Checking for proof holes ==="
HOLES=$(grep -n -E '\bsorry\b|\badmit\b' "$1" || true)
if [ -n "$HOLES" ]; then
    echo "❌ PROOF HOLES DETECTED. The following lines contain 'sorry' or 'admit':"
    echo "$HOLES"
    echo ""
    echo "These are placeholder proofs that Lean accepts without verification."
    echo "The file will build but the theorems are NOT proven."
    echo "Fix these before relying on any verification result."
    exit 1
fi
echo "✅ No proof holes found"

echo ""
echo "=== Compiling with lake build ==="
cp "$1" "$PROJECT_DIR/FormalVerification.lean"
cd "$PROJECT_DIR"
lake build 2>&1

BUILD_EXIT=$?
if [ $BUILD_EXIT -eq 0 ]; then
    echo ""
    echo "✅ Build successful — all theorems verified by Lean 4"
else
    echo ""
    echo "❌ Build failed (exit code $BUILD_EXIT) — see errors above"
fi
exit $BUILD_EXIT
