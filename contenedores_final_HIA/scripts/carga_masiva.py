import os
import sys
import psycopg2
from faker import Faker
import random
import uuid
import bcrypt
from datetime import datetime, timedelta
import time

# Configurar salida sin buffering para ver prints en tiempo real
sys.stdout.reconfigure(line_buffering=True) if hasattr(sys.stdout, 'reconfigure') else None

# Instalar dependencias (si no las tienes)
# pip install psycopg2-binary faker bcrypt

# Configuración de conexión (usa variables de entorno o valores por defecto)
DB_HOST = os.getenv('DB_HOST', 'haproxy')
DB_PORT = int(os.getenv('DB_PORT', '5432'))  # Puerto de HAProxy (write)
DB_NAME = os.getenv('DB_NAME', 'postgres')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASS = os.getenv('DB_PASSWORD', 'postgres123')

# Cantidades
N_USUARIOS = 500_000
N_PRODUCTOS = 500_000

fake = Faker('es_ES')  # Usar datos en español

# Función para esperar a que la base de datos esté disponible
def wait_for_db(max_retries=30, retry_delay=2):
    """Espera a que la base de datos esté disponible"""
    for i in range(max_retries):
        try:
            conn = psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                dbname=DB_NAME,
                user=DB_USER,
                password=DB_PASS,
                connect_timeout=5
            )
            conn.close()
            return True
        except psycopg2.OperationalError:
            if i < max_retries - 1:
                print(f"Esperando a la base de datos... (intento {i+1}/{max_retries})")
                time.sleep(retry_delay)
            else:
                return False
    return False

# Función para esperar a que las tablas existan
def wait_for_tables(max_retries=60, retry_delay=2):
    """Espera a que las tablas users y products existan"""
    for i in range(max_retries):
        try:
            conn = psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                dbname=DB_NAME,
                user=DB_USER,
                password=DB_PASS,
                connect_timeout=5
            )
            cur = conn.cursor()
            # Verificar si las tablas existen
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'users'
                )
            """)
            users_exists = cur.fetchone()[0]
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'products'
                )
            """)
            products_exists = cur.fetchone()[0]
            cur.close()
            conn.close()
            
            if users_exists and products_exists:
                return True
            else:
                if i < max_retries - 1:
                    print(f"Esperando a que las tablas se creen... (intento {i+1}/{max_retries})")
                    time.sleep(retry_delay)
                else:
                    return False
        except psycopg2.Error:
            if i < max_retries - 1:
                print(f"Esperando a que las tablas se creen... (intento {i+1}/{max_retries})")
                time.sleep(retry_delay)
            else:
                return False
    return False

# Esperar a que la base de datos esté disponible
print("Esperando a que la base de datos esté disponible...")
if not wait_for_db():
    print("ERROR: No se pudo conectar a la base de datos después de varios intentos")
    exit(1)

print("Base de datos disponible. Esperando a que las tablas se creen...")
# Esperar a que las tablas existan (el backend las crea con Sequelize)
if not wait_for_tables():
    print("ERROR: Las tablas no se crearon después de varios intentos")
    print("  Asegúrate de que el backend haya iniciado correctamente.")
    exit(1)

print("✓ Las tablas están disponibles")

# Conexión
print("Conectando a la base de datos...")
conn = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    dbname=DB_NAME,
    user=DB_USER,
    password=DB_PASS
)
cur = conn.cursor()

print("Conectado a la base de datos")

# Verificar si ya existen registros
print("\nVerificando si ya existen registros en la base de datos...")
try:
    cur.execute("SELECT COUNT(*) FROM users")
    count_usuarios = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM products")
    count_productos = cur.fetchone()[0]
    
    if count_usuarios > 0 or count_productos > 0:
        print(f"✓ Ya existen registros en la base de datos:")
        print(f"  - Usuarios: {count_usuarios:,}")
        print(f"  - Productos: {count_productos:,}")
        print("  No se ejecutará la carga masiva.")
        cur.close()
        conn.close()
        exit(0)
    
    print("✓ No se encontraron registros. Iniciando carga masiva...")
except psycopg2.Error as e:
    print(f"ERROR: Error al verificar registros: {e}")
    cur.close()
    conn.close()
    exit(1)

# 0. Crear usuario admin si no existe (siempre se ejecuta, independientemente de la carga masiva)
print("\nVerificando si existe el usuario 'admin'...")
cur.execute("SELECT id, username FROM users WHERE username = 'admin'")
admin_user = cur.fetchone()

if not admin_user:
    print("Creando usuario 'admin'...")
    admin_id = str(uuid.uuid4())
    admin_password_plain = 'admin123'
    admin_password_hash = bcrypt.hashpw(admin_password_plain.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')
    
    try:
        cur.execute("""
            INSERT INTO users (id, username, password, email, nombres, apellido, rol, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (admin_id, 'admin', admin_password_hash, 'admin@example.com', 'Administrador', 'Sistema', 'admin'))
        conn.commit()
        print(f"✓ Usuario 'admin' creado exitosamente")
        print(f"  - Username: admin")
        print(f"  - Contraseña: {admin_password_plain}")
        print(f"  - Rol: admin")
    except Exception as e:
        print(f"⚠ Error al crear usuario admin: {e}")
        conn.rollback()
else:
    print(f"✓ Usuario 'admin' ya existe (ID: {admin_user[0]})")

# 1. Obtener o crear la categoría "Ropa"
print("Obteniendo categoría 'Ropa'...")
cur.execute("SELECT id, nombre FROM categories WHERE nombre = 'Ropa'")
categoria_ropa = cur.fetchone()

if not categoria_ropa:
    print("No existe la categoría 'Ropa'. Creándola...")
    categoria_id = str(uuid.uuid4())
    cur.execute("""
        INSERT INTO categories (id, nombre, descripcion, created_at, updated_at)
        VALUES (%s, %s, %s, NOW(), NOW())
    """, (categoria_id, 'Ropa', 'Categoría de ropa y vestimenta'))
    conn.commit()
    print("Categoría 'Ropa' creada exitosamente")
    categoria_id_ropa = categoria_id
else:
    categoria_id_ropa = str(categoria_ropa[0])
    print(f"Categoría 'Ropa' encontrada (ID: {categoria_id_ropa})")

# 2. Insertar usuarios
print(f"\nIniciando inserción de {N_USUARIOS} usuarios...")
roles = ['cliente', 'admin']
# Contraseña común para todos los usuarios de prueba (hasheada una sola vez)
password_plain = 'password123'
print("Generando hash de contraseña (esto puede tardar unos segundos)...")
password_hash = bcrypt.hashpw(password_plain.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')
print("Hash generado. Iniciando inserción...")

usuarios_insertados = 0
for i in range(N_USUARIOS):
    try:
        user_id = str(uuid.uuid4())
        username = fake.unique.user_name()[:50]  # Limitar longitud
        email = fake.unique.email()
        nombres = fake.first_name()
        apellido = fake.last_name()
        rol = random.choice(roles) if random.random() > 0.99 else 'cliente'  # 1% admin, 99% cliente
        
        cur.execute("""
            INSERT INTO users (id, username, password, email, nombres, apellido, rol, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (user_id, username, password_hash, email, nombres, apellido, rol))
        
        usuarios_insertados += 1
        
        if (i+1) % 10000 == 0:
            conn.commit()
            print(f"Insertados {i+1} usuarios...")
            sys.stdout.flush()
    except Exception as e:
        print(f"Error insertando usuario {i+1}: {e}")
        conn.rollback()
        continue

conn.commit()
print(f"✓ Insertados {usuarios_insertados} usuarios")
print(f"  Contraseña para todos: {password_plain}")

# 3. Insertar productos (solo ropa)
print(f"\nIniciando inserción de {N_PRODUCTOS} productos de ropa...")
colores = ['Rojo', 'Azul', 'Verde', 'Negro', 'Blanco', 'Gris', 'Amarillo', 'Rosa', 'Morado', 'Naranja', 'Beige', 'Marrón']
tipos_producto = [
    'Remera', 'Pantalón', 'Camisa', 'Zapatillas', 'Buzo', 'Campera',
    'Gorra', 'Mochila', 'Short', 'Pollera', 'Vestido', 'Sweater',
    'Chaleco', 'Medias', 'Ropa Interior', 'Traje de Baño', 'Guantes', 'Bufanda'
]

productos_insertados = 0
for i in range(N_PRODUCTOS):
    try:
        product_id = str(uuid.uuid4())
        tipo = random.choice(tipos_producto)
        nombre = f"{tipo} {fake.word().capitalize()} {random.randint(100, 9999)}"
        descripcion = fake.text(max_nb_chars=500)
        precio = round(random.uniform(500, 50000), 2)
        color = random.choice(colores)
        
        cur.execute("""
            INSERT INTO products (id, nombre, descripcion, precio, color, categoria_id, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (product_id, nombre, descripcion, precio, color, categoria_id_ropa))
        
        productos_insertados += 1
        
        if (i+1) % 10000 == 0:
            conn.commit()
            print(f"Insertados {i+1} productos...")
            sys.stdout.flush()
    except Exception as e:
        print(f"Error insertando producto {i+1}: {e}")
        conn.rollback()
        continue

conn.commit()
print(f"✓ Insertados {productos_insertados} productos")

print("\n" + "="*50)
print("Carga masiva finalizada exitosamente!")
print("="*50)
print(f"Resumen:")
print(f"  - Usuarios insertados: {usuarios_insertados:,}")
print(f"  - Productos insertados: {productos_insertados:,}")
print(f"  - Categoría utilizada: Ropa")
print(f"\nNota: Todos los usuarios tienen la contraseña '{password_plain}'")
print(f"      Usuario admin: username='admin', password='admin123'")

cur.close()
conn.close()
