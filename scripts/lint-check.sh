#!/usr/bin/env bash
set -uo pipefail

CEILING_FILE="lint-ceiling.txt"

if [ ! -f "$CEILING_FILE" ]; then
  echo "ERROR: $CEILING_FILE not found"
  exit 1
fi

CEILING=$(tr -d '[:space:]' < "$CEILING_FILE")

# Use JSON output for reliable parsing (immune to locale/format changes)
LINT_JSON=$(npx eslint . --format json 2>/dev/null || true)
COUNT=$(echo "$LINT_JSON" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    const r=JSON.parse(d); let n=0; for(const f of r) n+=f.errorCount;
    process.stdout.write(String(n));
  });
")

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
