# PostgreSQL Cluster con Patroni y HAProxy

Cluster PostgreSQL de alta disponibilidad con failover automático, balanceamiento de carga y monitoreo.

## 🚀 Inicio Rápido

### 1. Levantar el Cluster
```bash
docker-compose up -d
```

### 2. Acceder a pgAdmin
- **URL**: http://localhost:8080
- **Email**: admin@example.com
- **Contraseña**: admin123

### 3. Importar Conexiones
1. En pgAdmin: **Tools → Import/Export Servers...**
2. Selecciona **Import Servers**
3. Navega a `var/lib/pgadmin/servers.json`
4. Haz clic en **Import**

### 4. Crear las Tablas
Conéctate a **"PostgreSQL Cluster - HAProxy Mixed"** y ejecuta:

```sql
-- 1. Tabla alumnos (entidad principal)
CREATE TABLE alumnos (
    id_alumno SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    fecha_nacimiento DATE,
    telefono VARCHAR(20),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla materias
CREATE TABLE materias (
    id_materia SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    creditos INTEGER NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT TRUE
);

-- 3. Tabla domicilios (relación 1:N con alumnos)
CREATE TABLE domicilios (
    id_domicilio SERIAL PRIMARY KEY,
    id_alumno INTEGER NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(20),
    pais VARCHAR(100) DEFAULT 'Argentina',
    es_principal BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno) ON DELETE CASCADE
);

-- 4. Tabla inscripciones (relación N:M entre alumnos y materias)
CREATE TABLE inscripciones (
    id_inscripcion SERIAL PRIMARY KEY,
    id_alumno INTEGER NOT NULL,
    id_materia INTEGER NOT NULL,
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'activa',
    FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
    FOREIGN KEY (id_materia) REFERENCES materias(id_materia) ON DELETE CASCADE,
    UNIQUE(id_alumno, id_materia)
);

-- 5. Tabla notas (relación 1:N con inscripciones)
CREATE TABLE notas (
    id_nota SERIAL PRIMARY KEY,
    id_inscripcion INTEGER NOT NULL,
    tipo_evaluacion VARCHAR(50) NOT NULL,
    calificacion DECIMAL(5,2) NOT NULL CHECK (calificacion >= 0 AND calificacion <= 10),
    fecha_evaluacion DATE NOT NULL,
    observaciones TEXT,
    FOREIGN KEY (id_inscripcion) REFERENCES inscripciones(id_inscripcion) ON DELETE CASCADE
);
```

## 🔑 Credenciales

| Servicio | URL | Usuario | Contraseña |
|----------|-----|---------|------------|
| **pgAdmin** | http://localhost:8080 | admin@example.com | admin123 |
| **Grafana** | http://localhost:3000 | admin | admin123 |
| **PostgreSQL** | Cualquier conexión | postgres | postgres123 |

## 🌐 Conexiones HAProxy

### ⚖️ HAProxy Mixed (Puerto 5434) - **RECOMENDADO**
- **Función**: Escritura y lectura balanceada
- **Ventaja**: Funciona automáticamente durante failover
- **Uso**: Para todo tipo de operaciones

### 📝 HAProxy Write (Puerto 5432)
- **Función**: Solo escritura (INSERT, UPDATE, DELETE, CREATE)
- **Limitación**: No funciona durante failover

### 📖 HAProxy Read (Puerto 5433)
- **Función**: Solo lectura (SELECT)
- **Ventaja**: Descarga el master

## 🧪 Prueba de Failover

### Simular Caída del Master
```bash
# 1. Detener el master
docker stop postgres-master

# 2. Esperar 30 segundos (failover automático)
# 3. Probar operaciones:
#    - HAProxy Mixed: ✅ Funciona
#    - HAProxy Write: ❌ No funciona
#    - HAProxy Read: ✅ Funciona

# 4. Restaurar master
docker start postgres-master
```

## 📊 Monitoreo

### En pgAdmin
1. Conéctate a cualquier servidor
2. Ve a **Dashboard → Replication**
3. Verás el estado de las réplicas

### En Terminal
```bash
# Estado del cluster
docker exec postgres-master /opt/patroni/bin/patronictl -c /etc/patroni.yml list

# Estadísticas HAProxy
curl http://localhost:5000/stats
```

## 🎯 Recomendaciones

- **Para desarrollo**: Usa **HAProxy Mixed (Puerto 5434)**
- **Para producción**: Usa **HAProxy Write (5432)** + **HAProxy Read (5433)**
- **Para simplicidad**: Solo **HAProxy Mixed (Puerto 5434)**

---

**Nota**: Este cluster está configurado para desarrollo y testing. Para producción, ajusta las configuraciones de seguridad según tus necesidades.