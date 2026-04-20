#!/usr/bin/env bash
# =============================================================================
# deploy-styles.sh
# Uploads kadence-child/style.css to the live VPS and flushes the WP cache.
#
# Usage:
#   bash deploy/deploy-styles.sh
#
# Requires: scp, ssh, WP-CLI on remote
# =============================================================================
set -euo pipefail

# ── Load .env ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "✗ .env not found at $ENV_FILE" >&2
  exit 1
fi

# Export only the variables we need (skip comments and blank lines)
set -o allexport
# shellcheck source=/dev/null
source "$ENV_FILE"
set +o allexport

# ── Validate required vars ─────────────────────────────────────────────────────
: "${REMOTE_SSH_USER:?Missing REMOTE_SSH_USER in .env}"
: "${REMOTE_SSH_IP:?Missing REMOTE_SSH_IP in .env}"
: "${REMOTE_PATH:?Missing REMOTE_PATH in .env}"
: "${WP_PATH:?Missing WP_PATH in .env}"

# ── Paths ─────────────────────────────────────────────────────────────────────
THEME_DIR_REL="wp-content/themes/kadence-child"
LOCAL_THEME="${SCRIPT_DIR}/../${THEME_DIR_REL}"
REMOTE_THEME="${REMOTE_PATH}/${THEME_DIR_REL}"
REMOTE_HOST="${REMOTE_SSH_USER}@${REMOTE_SSH_IP}"

# ── Preflight ─────────────────────────────────────────────────────────────────
if [[ ! -f "${LOCAL_THEME}/style.css" ]]; then
  echo "✗ Local file not found: ${LOCAL_THEME}/style.css" >&2
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  deploy-styles  →  ${REMOTE_HOST}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  source : ${LOCAL_THEME}/"
echo "  dest   : ${REMOTE_HOST}:${REMOTE_THEME}/"
echo ""

# ── Upload ────────────────────────────────────────────────────────────────────
echo "→ Uploading style.css..."
scp -o StrictHostKeyChecking=accept-new \
    "${LOCAL_THEME}/style.css" \
    "${REMOTE_HOST}:${REMOTE_THEME}/style.css"
echo "  ✓ style.css uploaded"

echo "→ Uploading functions.php..."
scp -o StrictHostKeyChecking=accept-new \
    "${LOCAL_THEME}/functions.php" \
    "${REMOTE_HOST}:${REMOTE_THEME}/functions.php"
echo "  ✓ functions.php uploaded"

if [[ -d "${LOCAL_THEME}/inc" ]]; then
  echo "→ Uploading inc/ directory..."
  ssh -o StrictHostKeyChecking=accept-new "${REMOTE_HOST}" "mkdir -p ${REMOTE_THEME}/inc"
  scp -o StrictHostKeyChecking=accept-new -r \
      "${LOCAL_THEME}/inc" \
      "${REMOTE_HOST}:${REMOTE_THEME}/"
  echo "  ✓ inc/ uploaded"
fi

# ── Flush cache on remote ─────────────────────────────────────────────────────
echo "→ Flushing WordPress cache on remote..."
ssh -o StrictHostKeyChecking=accept-new "${REMOTE_HOST}" bash <<ENDSSH
  set -e
  cd "${WP_PATH}"

  # Object cache
  wp cache flush --allow-root

  # WP Rocket (if installed)
  if wp plugin is-active wp-rocket --allow-root 2>/dev/null; then
    wp rocket clean --confirm --allow-root
    echo "  ✓ WP Rocket cache cleared"
  fi

  # W3 Total Cache (if installed)
  if wp plugin is-active w3-total-cache --allow-root 2>/dev/null; then
    wp w3-total-cache flush all --allow-root
    echo "  ✓ W3TC cache cleared"
  fi

  # LiteSpeed Cache (if installed)
  if wp plugin is-active litespeed-cache --allow-root 2>/dev/null; then
    wp litespeed-purge all --allow-root
    echo "  ✓ LiteSpeed cache cleared"
  fi

  echo "  ✓ Cache flush complete"
ENDSSH

echo ""
echo "✓ deploy-styles complete"
echo "  Live URL: ${LIVE_URL:-https://tokehaus.com}"
echo ""
