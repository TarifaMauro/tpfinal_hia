#!/bin/bash

# Script para configurar y levantar el cluster PostgreSQL con Patroni

echo "=== PostgreSQL Cluster Setup Script ==="
echo "Este script configurará un cluster PostgreSQL con alta disponibilidad"
echo ""

# Verificar que Docker y Docker Compose estén instalados
if ! command -v docker &> /dev/null; then
    echo "Error: Docker no está instalado. Por favor instala Docker primero."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose no está instalado. Por favor instala Docker Compose primero."
    exit 1
fi

echo "✓ Docker y Docker Compose están instalados"

# Crear directorios necesarios
echo "Creando directorios necesarios..."
mkdir -p data/postgres-master
mkdir -p data/postgres-replica1
mkdir -p data/postgres-replica2
mkdir -p data/etcd1
mkdir -p data/etcd2
mkdir -p data/etcd3
mkdir -p data/prometheus
mkdir -p data/grafana

echo "✓ Directorios creados"

# Dar permisos a los scripts
chmod +x scripts/*.sh

echo "✓ Scripts configurados con permisos de ejecución"

echo ""
echo "=== Iniciando servicios ==="
echo "Esto puede tomar varios minutos en la primera ejecución..."

# Levantar los servicios
docker-compose up -d

echo ""
echo "=== Verificando estado de los servicios ==="

# Esperar a que los servicios estén listos
echo "Esperando a que los servicios estén listos..."
sleep 30

# Verificar estado de los contenedores
echo "Estado de los contenedores:"
docker-compose ps

echo ""
echo "=== Información de conexión ==="
echo "PostgreSQL Master: localhost:5432"
echo "PostgreSQL Replica 1: localhost:5433"
echo "PostgreSQL Replica 2: localhost:5434"
echo "HAProxy (Write): localhost:5435"
echo "HAProxy (Read): localhost:5436"
echo "HAProxy Stats: http://localhost:5000/stats"
echo "Grafana: http://localhost:3000 (admin/admin123)"
echo "Prometheus: http://localhost:9090"

echo ""
echo "=== Comandos útiles ==="
echo "Ver logs: docker-compose logs -f [servicio]"
echo "Parar cluster: docker-compose down"
echo "Reiniciar cluster: docker-compose restart"
echo "Ver estado: docker-compose ps"

echo ""
echo "=== Cluster configurado exitosamente ==="
echo "El cluster PostgreSQL con Patroni está listo para usar."
echo "La alta disponibilidad y el failover automático están configurados."
