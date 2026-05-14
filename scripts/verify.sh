#!/bin/bash
# Lean 4 verification script for PR #81088
# Usage: verify.sh <lean-file>
# Copies the lean file into the project and runs lake build

export PATH="$HOME/.elan/bin:$PATH"
cd /tmp/lean-pr81088

if [ -z "$1" ]; then
    echo "Usage: verify.sh <lean-file>"
    exit 1
fi

cp "$1" PR81088/PR81088.lean
lake build 2>&1
