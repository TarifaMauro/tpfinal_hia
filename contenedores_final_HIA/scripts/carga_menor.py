import psycopg2
from faker import Faker
import random
import uuid
import bcrypt
from datetime import datetime, timedelta

# Instalar dependencias (si no las tienes)
# pip install psycopg2-binary faker bcrypt

# Configuración de conexión
DB_HOST = 'localhost'
DB_PORT = 5435  # Puerto del pool mixed de HAProxy
DB_NAME = 'postgres'
DB_USER = 'postgres'
DB_PASS = 'postgres123'

# Cantidades (ajustadas a 100)
N_USUARIOS = 100
N_PRODUCTOS = 100

fake = Faker('es_ES')  # Usar datos en español

# Conexión
conn = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    dbname=DB_NAME,
    user=DB_USER,
    password=DB_PASS
)
cur = conn.cursor()

print("Conectado a la base de datos")

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
        
        # Commit periódico para no acumular en memoria
        if (i+1) % 50 == 0:
            conn.commit()
            print(f"Insertados {i+1} usuarios...")
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
        
        if (i+1) % 50 == 0:
            conn.commit()
            print(f"Insertados {i+1} productos...")
    except Exception as e:
        print(f"Error insertando producto {i+1}: {e}")
        conn.rollback()
        continue

conn.commit()
print(f"✓ Insertados {productos_insertados} productos")

cur.close()
conn.close()
print("\n" + "="*50)
print("Carga menor finalizada exitosamente!")
print("="*50)
print(f"Resumen:")
print(f"  - Usuarios insertados: {usuarios_insertados:,}")
print(f"  - Productos insertados: {productos_insertados:,}")
print(f"  - Categoría utilizada: Ropa")
print(f"\nNota: Todos los usuarios tienen la contraseña '{password_plain}'")