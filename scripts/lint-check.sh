#!/usr/bin/env bash
set -euo pipefail

CEILING_FILE="lint-ceiling.txt"

if [ ! -f "$CEILING_FILE" ]; then
  echo "ERROR: $CEILING_FILE not found"
  exit 1
fi

CEILING=$(tr -d '[:space:]' < "$CEILING_FILE")
LINT_OUTPUT=$(npx eslint . 2>&1 || true)
COUNT=$(echo "$LINT_OUTPUT" | grep -o '✖ [0-9]*' | grep -o '[0-9]*' || echo "0")

echo "Lint errors: $COUNT / $CEILING ceiling"

if [ "$COUNT" -gt "$CEILING" ]; then
  echo "FAIL: $COUNT errors exceeds ceiling of $CEILING"
  exit 1
fi

if [ "$COUNT" -eq "0" ]; then
  echo "CLEAN: Zero lint errors!"
elif [ "$COUNT" -lt "$CEILING" ]; then
  echo "PASS: Under ceiling. Consider lowering to $COUNT."
else
  echo "PASS: At ceiling."
fi
