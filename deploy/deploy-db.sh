#!/usr/bin/env bash
# =============================================================================
# deploy-db.sh
# Exports the local WordPress DB, sanitizes line endings (CRLF→LF),
# runs search-replace (tokehaus.local → tokehaus.com), SCPs the SQL to
# the VPS, imports it, and flushes the WP cache.
#
# Usage:
#   bash deploy/deploy-db.sh
#
# ⚠️  WARNING: This overwrites the LIVE database. Always confirm the prompt.
#
# Requires: scp, ssh, WP-CLI on remote, mysqldump (Local by Flywheel path in .env)
# =============================================================================
set -euo pipefail

# ── Load .env ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "✗ .env not found at $ENV_FILE" >&2
  exit 1
fi

set -o allexport
# shellcheck source=/dev/null
source "$ENV_FILE"
set +o allexport

# ── Validate required vars ─────────────────────────────────────────────────────
: "${REMOTE_SSH_USER:?Missing REMOTE_SSH_USER in .env}"
: "${REMOTE_SSH_IP:?Missing REMOTE_SSH_IP in .env}"
: "${REMOTE_PATH:?Missing REMOTE_PATH in .env}"
: "${WP_PATH:?Missing WP_PATH in .env}"
: "${DB_NAME:?Missing DB_NAME in .env}"
: "${LOCAL_URL:?Missing LOCAL_URL in .env}"
: "${LIVE_URL:?Missing LIVE_URL in .env}"
: "${LOCAL_MYSQL_HOST:?Missing LOCAL_MYSQL_HOST in .env}"
: "${LOCAL_MYSQL_PORT:?Missing LOCAL_MYSQL_PORT in .env}"
: "${LOCAL_MYSQL_USER:?Missing LOCAL_MYSQL_USER in .env}"
: "${LOCAL_MYSQL_PASS:?Missing LOCAL_MYSQL_PASS in .env}"
: "${LOCAL_DB_NAME:?Missing LOCAL_DB_NAME in .env}"
: "${LOCAL_MYSQLDUMP_BIN:?Missing LOCAL_MYSQLDUMP_BIN in .env}"

REMOTE_HOST="${REMOTE_SSH_USER}@${REMOTE_SSH_IP}"
TMP_DIR="${SCRIPT_DIR}/tmp"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
EXPORT_FILE="${TMP_DIR}/deploy_${TIMESTAMP}.sql"

mkdir -p "$TMP_DIR"

# ── Safety confirmation ────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  deploy-db  →  ${REMOTE_HOST}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  local DB  : ${LOCAL_DB_NAME} (port ${LOCAL_MYSQL_PORT})"
echo "  remote DB : ${DB_NAME} on ${REMOTE_SSH_IP}"
echo "  replace   : ${LOCAL_URL}  →  ${LIVE_URL}"
echo ""
echo "  ⚠️  This will OVERWRITE the live database."
echo ""
read -r -p "  Type 'yes' to continue: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "  Aborted."
  exit 0
fi
echo ""

# ── Step 1: Export local DB ───────────────────────────────────────────────────
echo "→ [1/5] Exporting local database..."

"$LOCAL_MYSQLDUMP_BIN" \
  --default-character-set=utf8mb4 \
  -h "${LOCAL_MYSQL_HOST}" \
  -P "${LOCAL_MYSQL_PORT}" \
  -u "${LOCAL_MYSQL_USER}" \
  -p"${LOCAL_MYSQL_PASS}" \
  --single-transaction \
  --routines \
  --triggers \
  --hex-blob \
  "${LOCAL_DB_NAME}" \
  > "$EXPORT_FILE"

echo "  ✓ Exported to $EXPORT_FILE ($(du -h "$EXPORT_FILE" | cut -f1))"

# ── Step 2: Sanitize CRLF → LF ───────────────────────────────────────────────
echo "→ [2/5] Sanitizing line endings (CRLF → LF)..."
# Use tr to strip carriage returns — works on all platforms
tr -d '\r' < "$EXPORT_FILE" > "${EXPORT_FILE}.lf"
mv "${EXPORT_FILE}.lf" "$EXPORT_FILE"
echo "  ✓ Line endings normalized"

# ── Step 3: Search-replace URLs in SQL ───────────────────────────────────────
echo "→ [3/5] Replacing ${LOCAL_URL} → ${LIVE_URL} in SQL..."

# Escape for sed: replace / with \/
LOCAL_ESCAPED="${LOCAL_URL//\//\\/}"
LIVE_ESCAPED="${LIVE_URL//\//\\/}"

sed -i "s/${LOCAL_ESCAPED}/${LIVE_ESCAPED}/g" "$EXPORT_FILE"

# Count replacements
REPLACE_COUNT=$(grep -oc "${LIVE_URL//\//\\/}" "$EXPORT_FILE" || true)
echo "  ✓ ~${REPLACE_COUNT} occurrences replaced in SQL"

# ── Step 4: Upload to VPS ─────────────────────────────────────────────────────
echo "→ [4/5] Uploading SQL to VPS..."
REMOTE_SQL="/tmp/deploy_${TIMESTAMP}.sql"
scp -o StrictHostKeyChecking=accept-new \
    "$EXPORT_FILE" \
    "${REMOTE_HOST}:${REMOTE_SQL}"
echo "  ✓ Uploaded to ${REMOTE_HOST}:${REMOTE_SQL}"

# ── Step 5: Import on remote + flush ─────────────────────────────────────────
echo "→ [5/5] Importing on remote and flushing cache..."
ssh -o StrictHostKeyChecking=accept-new "${REMOTE_HOST}" bash <<ENDSSH
  set -e
  cd "${WP_PATH}"

  echo "  Dropping and importing database..."
  wp db import "${REMOTE_SQL}" --allow-root

  echo "  Running WP-CLI search-replace for any residual local references..."
  wp search-replace "${LOCAL_URL}" "${LIVE_URL}" \
    --all-tables \
    --allow-root \
    --report-changed-only

  # Also catch http:// variant of live URL if LIVE_URL is https://
  LIVE_HTTP="${LIVE_URL/https:\/\//http:\/\/}"
  wp search-replace "\$LIVE_HTTP" "${LIVE_URL}" \
    --all-tables \
    --allow-root \
    --report-changed-only 2>/dev/null || true

  echo "  Flushing cache..."
  wp cache flush --allow-root

  if wp plugin is-active wp-rocket --allow-root 2>/dev/null; then
    wp rocket clean --confirm --allow-root
  fi

  # Clean up temp SQL
  rm -f "${REMOTE_SQL}"
  echo "  ✓ Temp SQL removed"

  echo "  ✓ Import complete"
ENDSSH

# ── Cleanup local tmp ─────────────────────────────────────────────────────────
rm -f "$EXPORT_FILE"
echo "  ✓ Local temp file removed"

echo ""
echo "✓ deploy-db complete"
echo "  Live site: ${LIVE_URL}"
echo ""
