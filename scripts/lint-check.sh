#!/usr/bin/env bash
set -uo pipefail

CEILING_FILE="lint-ceiling.txt"

if [ ! -f "$CEILING_FILE" ]; then
  echo "ERROR: $CEILING_FILE not found"
  exit 1
fi

CEILING=$(tr -d '[:space:]' < "$CEILING_FILE")

if ! [[ "$CEILING" =~ ^[0-9]+$ ]]; then
  echo "ERROR: $CEILING_FILE contains non-numeric value: '$CEILING'"
  exit 1
fi

# Use JSON output for reliable parsing. Stderr goes to a temp file
# so config/plugin errors are visible on failure, not swallowed.
LINT_STDERR=$(mktemp)
LINT_JSON=$(npx eslint . --format json 2>"$LINT_STDERR" || true)

if [ -z "$LINT_JSON" ]; then
  echo "ERROR: ESLint produced no output. Stderr:"
  cat "$LINT_STDERR"
  rm -f "$LINT_STDERR"
  exit 1
fi
rm -f "$LINT_STDERR"

COUNT=$(echo "$LINT_JSON" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    try {
      const r=JSON.parse(d); let n=0; for(const f of r) n+=f.errorCount;
      process.stdout.write(String(n));
    } catch(e) {
      process.stderr.write('ERROR: Failed to parse ESLint JSON output\n');
      process.exit(1);
    }
  });
")

if [ -z "$COUNT" ] || ! [[ "$COUNT" =~ ^[0-9]+$ ]]; then
  echo "ERROR: Failed to extract numeric error count from ESLint output"
  exit 1
fi

echo "Lint errors: $COUNT / $CEILING ceiling"

if [ "$COUNT" -gt "$CEILING" ]; then
  echo "FAIL: $COUNT errors exceeds ceiling of $CEILING"
  exit 1
fi

if [ "$COUNT" -eq "0" ]; then
  echo "CLEAN: Zero lint errors!"
  if [ "$CEILING" -ne "0" ]; then
    echo "0" > "$CEILING_FILE"
    echo "Ratcheted ceiling to 0."
  fi
elif [ "$COUNT" -lt "$CEILING" ]; then
  echo "$COUNT" > "$CEILING_FILE"
  echo "PASS: Ratcheted ceiling from $CEILING to $COUNT."
else
  echo "PASS: At ceiling."
fi
