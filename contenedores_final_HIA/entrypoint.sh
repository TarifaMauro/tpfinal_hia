#!/bin/sh
set -e

DB_HOST=${DB_HOST:-haproxy}
DB_PORT=${DB_PORT:-5434}
DB_USER=${DB_USER:-postgres}

MAX_RETRIES=${MAX_RETRIES:-120}
RETRY=0

echo "Waiting for DB ${DB_HOST}:${DB_PORT} (protocol check)..."

# Use pg_isready if available (protocol-level); otherwise fallback to nc
if command -v pg_isready >/dev/null 2>&1; then
  while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; do
    RETRY=$((RETRY + 1))
    echo "DB check attempt ${RETRY}/${MAX_RETRIES}..."
    if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
      echo "Timeout reached waiting for ${DB_HOST}:${DB_PORT}" >&2
      exit 1
    fi
    sleep 2
  done
else
  while ! nc -z "$DB_HOST" "$DB_PORT"; do
    RETRY=$((RETRY + 1))
    echo "DB TCP check attempt ${RETRY}/${MAX_RETRIES}..."
    if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
      echo "Timeout reached waiting for ${DB_HOST}:${DB_PORT}" >&2
      exit 1
    fi
    sleep 2
  done
fi

echo "DB reachable, starting app"
exec node index.js
