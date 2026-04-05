#!/usr/bin/env bash
#
# verify-all.sh — Batch-compile all ArdCore .ino sketches
#
# Requires arduino-cli with the AVR core installed.
#
# Install on macOS:
#   brew install arduino-cli
#   arduino-cli core install arduino:avr
#
# Usage:
#   ./scripts/verify-all.sh            # compile all sketches
#   ./scripts/verify-all.sh --verbose  # show compiler output on failure
#
# Sketches listed in scripts/verify-ignore.txt (one path per line,
# relative to repo root) are skipped. Use this for known-broken
# legacy sketches that you don't intend to fix.
#
# Exit code: 0 if all non-ignored sketches compile, 1 if any fail.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOARD="arduino:avr:nano"
IGNORE_FILE="$REPO_ROOT/scripts/verify-ignore.txt"
VERBOSE=false

if [[ "${1:-}" == "--verbose" ]]; then
  VERBOSE=true
fi

# Check arduino-cli is installed
if ! command -v arduino-cli &>/dev/null; then
  echo "ERROR: arduino-cli not found."
  echo "Install: brew install arduino-cli && arduino-cli core install arduino:avr"
  exit 1
fi

# Check AVR core is installed
if ! arduino-cli core list 2>/dev/null | grep -q "arduino:avr"; then
  echo "ERROR: arduino:avr core not installed."
  echo "Install: arduino-cli core install arduino:avr"
  exit 1
fi

# Load ignore list (one path per line, newline-separated string)
IGNORED=""
if [[ -f "$IGNORE_FILE" ]]; then
  while IFS= read -r line; do
    # skip comments and blank lines
    [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
    IGNORED="${IGNORED}${line}"$'\n'
  done < "$IGNORE_FILE"
fi

# Check if a path is in the ignore list
is_ignored() {
  echo "$IGNORED" | grep -qxF "$1"
}

# Find all .ino files
PASS=0
FAIL=0
SKIP=0
FAILED_LIST=()

echo "══════════════════════════════════════════════════════"
echo "  ArdCore Sketch Compiler — board: $BOARD"
echo "══════════════════════════════════════════════════════"
echo ""

while IFS= read -r sketch; do
  # Get path relative to repo root
  rel_path="${sketch#$REPO_ROOT/}"

  # Check ignore list
  if is_ignored "$rel_path"; then
    echo "  SKIP  $rel_path"
    SKIP=$((SKIP + 1))
    continue
  fi

  # The sketch directory (arduino-cli needs the directory, not the file)
  sketch_dir="$(dirname "$sketch")"

  # Compile
  if output=$(arduino-cli compile --fqbn "$BOARD" "$sketch_dir" 2>&1); then
    echo "  PASS  $rel_path"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $rel_path"
    FAIL=$((FAIL + 1))
    FAILED_LIST+=("$rel_path")
    if $VERBOSE; then
      echo "$output" | sed 's/^/        /'
      echo ""
    fi
  fi
done < <(find "$REPO_ROOT" -name "*.ino" -not -path "*/.git/*" | sort)

# Summary
echo ""
echo "══════════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed, $SKIP skipped"
echo "══════════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "  Failed sketches:"
  for f in "${FAILED_LIST[@]}"; do
    echo "    - $f"
  done
  echo ""
  echo "  Add paths to scripts/verify-ignore.txt to skip known-broken sketches."
  echo "  Run with --verbose to see compiler errors."
  exit 1
fi

exit 0
