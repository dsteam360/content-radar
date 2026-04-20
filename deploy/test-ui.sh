#!/usr/bin/env bash
# =============================================================================
# test-ui.sh
# Runs the Playwright test suite against the local WordPress instance.
#
# Usage:
#   bash deploy/test-ui.sh              # all tests
#   bash deploy/test-ui.sh --headed     # show browser window
#   bash deploy/test-ui.sh --ui         # Playwright interactive UI
#   PWTEST_GREP="hero" bash deploy/test-ui.sh  # filter by test name
#
# Requires: Node.js, @playwright/test installed in project root
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/.."

# ── Load .env for LOCAL_URL reference ─────────────────────────────────────────
ENV_FILE="${PROJECT_ROOT}/.env"
if [[ -f "$ENV_FILE" ]]; then
  set -o allexport
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +o allexport
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  test-ui  →  Playwright"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  target : ${LOCAL_URL:-http://tokehaus.local}"
echo "  suite  : tests/homepage.spec.js"
echo ""

cd "$PROJECT_ROOT"

# Pass all args through to playwright (--headed, --ui, etc.)
npx playwright test tests/homepage.spec.js \
  --reporter=list \
  "$@"

EXIT_CODE=$?

echo ""
if [[ $EXIT_CODE -eq 0 ]]; then
  echo "✓ All tests passed"
else
  echo "✗ Tests failed (exit $EXIT_CODE)"
  echo "  Run with --headed to debug visually"
fi
echo ""

exit $EXIT_CODE
