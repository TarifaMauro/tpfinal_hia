#!/bin/sh
set -e

DB_HOST=${DB_HOST:-haproxy}
DB_PORT=${DB_PORT:-5432}
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

echo "DB reachable"

# Iniciar el servidor Node.js en background para que cree las tablas
echo "Starting app (creando tablas si no existen)..."
cd /usr/src/app/backend
node index.js &
NODE_PID=$!

# Esperar a que Node.js cree las tablas antes de ejecutar el script de carga masiva
echo "Esperando a que el backend cree las tablas..."
sleep 10

# Ejecutar script de carga masiva si no hay registros (solo una vez)
if [ -f /usr/src/app/backend/scripts/carga_masiva.py ]; then
    echo "Verificando si es necesario ejecutar carga masiva..."
    # Usar PYTHONUNBUFFERED=1 y python3 -u para mostrar prints en tiempo real
    PYTHONUNBUFFERED=1 python3 -u /usr/src/app/backend/scripts/carga_masiva.py || echo "Advertencia: El script de carga masiva no se ejecutó o ya existen datos"
fi

# Esperar al proceso de Node.js (mantener el contenedor corriendo)
wait $NODE_PID
