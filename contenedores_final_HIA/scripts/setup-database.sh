#!/bin/bash

# Script para verificar que el cluster esté funcionando correctamente
# Este script solo verifica la conectividad, no crea tablas

echo "=== Verificación del Cluster PostgreSQL ==="
echo ""

# Función para verificar conexión
check_connection() {
    local host=$1
    local port=$2
    local description=$3
    
    echo "Verificando: $description"
    docker exec postgres-master psql -h $host -p $port -U postgres -d postgres -c "SELECT version();" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ $description - OK"
        return 0
    else
        echo "✗ $description - Error"
        return 1
    fi
}

# Esperar a que el cluster esté listo
echo "Esperando a que el cluster esté listo..."
sleep 15

echo "Verificando conectividad del cluster..."
echo ""

# Verificar conexiones HAProxy
check_connection "haproxy" "5432" "HAProxy Write (Master)"
check_connection "haproxy" "5433" "HAProxy Read (Réplicas)"
check_connection "haproxy" "5434" "HAProxy Mixed (Master + Réplicas)"

echo ""
echo "Verificando conexiones directas..."
check_connection "postgres-master" "5432" "Master Directo"
check_connection "postgres-replica1" "5432" "Réplica 1 Directa"
check_connection "postgres-replica2" "5432" "Réplica 2 Directa"

echo ""
echo "=== Cluster Listo ==="
echo ""
echo "🎯 Conexiones disponibles para tu cliente:"
echo ""
echo "HAProxy Write (Solo Master - Para Escritura):"
echo "  Host: localhost"
echo "  Puerto: 5432"
echo "  Usuario: postgres"
echo "  Contraseña: postgres123"
echo "  Base de datos: postgres"
echo ""
echo "HAProxy Read (Solo Réplicas - Para Lectura):"
echo "  Host: localhost"
echo "  Puerto: 5433"
echo "  Usuario: postgres"
echo "  Contraseña: postgres123"
echo "  Base de datos: postgres"
echo ""
echo "HAProxy Mixed (Master + Réplicas - Balanceado):"
echo "  Host: localhost"
echo "  Puerto: 5434"
echo "  Usuario: postgres"
echo "  Contraseña: postgres123"
echo "  Base de datos: postgres"
echo ""
echo "🌐 pgAdmin (Interfaz Web):"
echo "  URL: http://localhost:8080"
echo "  Usuario: admin@cluster.local"
echo "  Contraseña: admin123"
echo ""
echo "📊 Monitoreo:"
echo "  Grafana: http://localhost:3000 (admin/admin123)"
echo "  Prometheus: http://localhost:9090"
echo "  HAProxy Stats: http://localhost:5000/stats"
echo ""
echo "✅ El cluster está listo para que configures tus tablas desde el cliente."
