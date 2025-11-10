#!/bin/bash

# Script para probar el cluster PostgreSQL

echo "=== PostgreSQL Cluster Test Script ==="
echo ""

# Función para probar conexión
test_connection() {
    local host=$1
    local port=$2
    local description=$3
    
    echo "Probando conexión a $description ($host:$port)..."
    
    if timeout 10 bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
        echo "✓ $description está disponible"
        return 0
    else
        echo "✗ $description no está disponible"
        return 1
    fi
}

# Función para probar consulta SQL
test_sql() {
    local host=$1
    local port=$2
    local description=$3
    
    echo "Probando consulta SQL en $description..."
    
    if docker exec postgres-master psql -h $host -p $port -U postgres -d postgres -c "SELECT version();" >/dev/null 2>&1; then
        echo "✓ Consulta SQL exitosa en $description"
        return 0
    else
        echo "✗ Error en consulta SQL en $description"
        return 1
    fi
}

echo "=== Verificando conectividad ==="
test_connection "localhost" "5432" "PostgreSQL Master"
test_connection "localhost" "5433" "PostgreSQL Replica 1"
test_connection "localhost" "5434" "PostgreSQL Replica 2"
test_connection "localhost" "5435" "HAProxy Write"
test_connection "localhost" "5436" "HAProxy Read"
test_connection "localhost" "5000" "HAProxy Stats"
test_connection "localhost" "3000" "Grafana"
test_connection "localhost" "9090" "Prometheus"

echo ""
echo "=== Verificando consultas SQL ==="
test_sql "localhost" "5432" "Master"
test_sql "localhost" "5433" "Replica 1"
test_sql "localhost" "5434" "Replica 2"

echo ""
echo "=== Verificando estado de Patroni ==="
echo "Estado del cluster Patroni:"
docker exec postgres-master patronictl -c /etc/patroni.yml list

echo ""
echo "=== Verificando replicación ==="
echo "Estado de replicación:"
docker exec postgres-master psql -U postgres -d postgres -c "SELECT client_addr, state, sync_state FROM pg_stat_replication;"

echo ""
echo "=== Verificando HAProxy ==="
echo "Estadísticas de HAProxy:"
curl -s http://localhost:5000/stats | grep -E "(postgres|UP|DOWN)"

echo ""
echo "=== Test completado ==="
echo "Revisa los resultados arriba para verificar que todo esté funcionando correctamente."
