#!/bin/bash

# Script para instalar clientes adicionales de PostgreSQL
# Recomendaciones de clientes para trabajar con el cluster

echo "=== Instalación de Clientes PostgreSQL ==="
echo ""

# Detectar el sistema operativo
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
else
    OS="unknown"
fi

echo "Sistema operativo detectado: $OS"
echo ""

# Función para instalar en Linux
install_linux() {
    echo "=== Instalación en Linux ==="
    echo ""
    
    # Actualizar repositorios
    sudo apt update
    
    # Instalar PostgreSQL client
    echo "Instalando PostgreSQL client..."
    sudo apt install -y postgresql-client
    
    # Instalar herramientas adicionales
    echo "Instalando herramientas adicionales..."
    sudo apt install -y pgcli dbeaver-ce
    
    echo "✓ Clientes instalados en Linux"
}

# Función para instalar en macOS
install_macos() {
    echo "=== Instalación en macOS ==="
    echo ""
    
    # Verificar si Homebrew está instalado
    if ! command -v brew &> /dev/null; then
        echo "Instalando Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Instalar PostgreSQL client
    echo "Instalando PostgreSQL client..."
    brew install postgresql
    
    # Instalar herramientas adicionales
    echo "Instalando herramientas adicionales..."
    brew install pgcli
    brew install --cask dbeaver-ce
    
    echo "✓ Clientes instalados en macOS"
}

# Función para instalar en Windows
install_windows() {
    echo "=== Instalación en Windows ==="
    echo ""
    
    echo "Para Windows, se recomienda instalar:"
    echo "1. PostgreSQL client desde: https://www.postgresql.org/download/windows/"
    echo "2. pgAdmin desde: https://www.pgadmin.org/download/"
    echo "3. DBeaver desde: https://dbeaver.io/download/"
    echo "4. DataGrip (JetBrains) desde: https://www.jetbrains.com/datagrip/"
    echo ""
    echo "También puedes usar Chocolatey:"
    echo "choco install postgresql"
    echo "choco install dbeaver"
    echo "choco install pgcli"
}

# Función para mostrar opciones de clientes
show_client_options() {
    echo "=== Clientes Recomendados para PostgreSQL Cluster ==="
    echo ""
    
    echo "🥇 CLIENTES PRINCIPALES:"
    echo ""
    echo "1. pgAdmin (Web-based) - YA INCLUIDO EN EL CLUSTER"
    echo "   - URL: http://localhost:8080"
    echo "   - Usuario: admin@cluster.local"
    echo "   - Contraseña: admin123"
    echo "   - ✅ Pre-configurado con todos los servidores del cluster"
    echo ""
    
    echo "2. DBeaver (Desktop) - RECOMENDADO"
    echo "   - Multiplataforma"
    echo "   - Soporte completo para PostgreSQL"
    echo "   - Gestión de conexiones múltiples"
    echo "   - Descarga: https://dbeaver.io/download/"
    echo ""
    
    echo "3. DataGrip (JetBrains) - PROFESIONAL"
    echo "   - IDE completo para bases de datos"
    echo "   - Soporte avanzado para PostgreSQL"
    echo "   - Integración con Git"
    echo "   - Descarga: https://www.jetbrains.com/datagrip/"
    echo ""
    
    echo "🥈 CLIENTES ADICIONALES:"
    echo ""
    echo "4. pgcli (Terminal) - PARA DESARROLLADORES"
    echo "   - Terminal interactivo mejorado"
    echo "   - Autocompletado inteligente"
    echo "   - Sintaxis highlighting"
    echo "   - Instalación: pip install pgcli"
    echo ""
    
    echo "5. psql (Terminal) - NATIVO"
    echo "   - Cliente oficial de PostgreSQL"
    echo "   - Incluido con PostgreSQL"
    echo "   - Comando: psql -h localhost -p 5432 -U postgres -d postgres"
    echo ""
    
    echo "6. TablePlus (macOS/Windows) - ELEGANTE"
    echo "   - Interfaz moderna y limpia"
    echo "   - Soporte para múltiples bases de datos"
    echo "   - Descarga: https://tableplus.com/"
    echo ""
    
    echo "🔧 CONFIGURACIÓN DE CONEXIONES:"
    echo ""
    echo "Para cualquier cliente, usa estas conexiones:"
    echo ""
    echo "HAProxy Write (Solo Master):"
    echo "  Host: localhost"
    echo "  Puerto: 5432"
    echo "  Usuario: postgres"
    echo "  Contraseña: postgres123"
    echo "  Base de datos: postgres"
    echo ""
    echo "HAProxy Read (Solo Réplicas):"
    echo "  Host: localhost"
    echo "  Puerto: 5433"
    echo "  Usuario: postgres"
    echo "  Contraseña: postgres123"
    echo "  Base de datos: postgres"
    echo ""
    echo "HAProxy Mixed (Master + Réplicas):"
    echo "  Host: localhost"
    echo "  Puerto: 5434"
    echo "  Usuario: postgres"
    echo "  Contraseña: postgres123"
    echo "  Base de datos: postgres"
    echo ""
    echo "Conexiones Directas:"
    echo "  Master: localhost:5432"
    echo "  Réplica 1: localhost:5433"
    echo "  Réplica 2: localhost:5434"
    echo ""
}

# Función para crear archivos de configuración
create_config_files() {
    echo "=== Creando archivos de configuración ==="
    echo ""
    
    # Crear archivo .pgpass
    echo "Creando archivo .pgpass para autenticación automática..."
    cat > ~/.pgpass << EOF
localhost:5432:postgres:postgres:postgres123
localhost:5433:postgres:postgres:postgres123
localhost:5434:postgres:postgres:postgres123
localhost:5432:mi_aplicacion:postgres:postgres123
localhost:5433:mi_aplicacion:postgres:postgres123
localhost:5434:mi_aplicacion:postgres:postgres123
EOF
    chmod 600 ~/.pgpass
    echo "✓ Archivo .pgpass creado"
    
    # Crear archivo de configuración para DBeaver
    echo "Creando configuración para DBeaver..."
    mkdir -p ~/.dbeaver/connections
    cat > ~/.dbeaver/connections/postgres-cluster.json << EOF
{
  "connections": [
    {
      "name": "PostgreSQL Cluster - Write",
      "host": "localhost",
      "port": 5432,
      "database": "postgres",
      "username": "postgres",
      "password": "postgres123",
      "driver": "postgresql"
    },
    {
      "name": "PostgreSQL Cluster - Read",
      "host": "localhost",
      "port": 5433,
      "database": "postgres",
      "username": "postgres",
      "password": "postgres123",
      "driver": "postgresql"
    },
    {
      "name": "PostgreSQL Cluster - Mixed",
      "host": "localhost",
      "port": 5434,
      "database": "postgres",
      "username": "postgres",
      "password": "postgres123",
      "driver": "postgresql"
    }
  ]
}
EOF
    echo "✓ Configuración de DBeaver creada"
    
    echo ""
    echo "✓ Archivos de configuración creados"
}

# Ejecutar según el sistema operativo
case $OS in
    "linux")
        install_linux
        ;;
    "macos")
        install_macos
        ;;
    "windows")
        install_windows
        ;;
    *)
        echo "Sistema operativo no reconocido"
        ;;
esac

# Mostrar opciones de clientes
show_client_options

# Crear archivos de configuración
create_config_files

echo ""
echo "=== Instalación Completada ==="
echo ""
echo "Próximos pasos:"
echo "1. Levantar el cluster: docker-compose up -d"
echo "2. Configurar la base de datos: ./scripts/setup-database.sh"
echo "3. Acceder a pgAdmin: http://localhost:8080"
echo "4. Instalar tu cliente preferido"
echo ""
echo "¡Tu cluster PostgreSQL está listo para usar!"
