#!/bin/bash
set -e

# Crear usuario de replicación
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'replicator';
    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO replicator;
EOSQL

# Crear directorio de archivos WAL
mkdir -p /var/lib/postgresql/archive
chown postgres:postgres /var/lib/postgresql/archive

echo "Master initialization completed"
