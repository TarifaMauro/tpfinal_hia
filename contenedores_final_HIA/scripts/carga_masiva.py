import psycopg2
from faker import Faker
import random
from datetime import datetime, timedelta

# Configuración de conexión
DB_HOST = 'localhost'
DB_PORT = 5432  # Usar HAProxy Mixed
DB_NAME = 'postgres'
DB_USER = 'postgres'
DB_PASS = 'postgres123'

# Cantidades
N_ALUMNOS = 200_000
N_MATERIAS = 100
N_INSCRIPCIONES = 2_000_000

fake = Faker()

# Conexión
conn = psycopg2.connect(
    host=DB_HOST,
    port=DB_PORT,
    dbname=DB_NAME,
    user=DB_USER,
    password=DB_PASS
)
cur = conn.cursor()

# Limpiar tablas antes de insertar datos masivos
cur.execute("DELETE FROM notas")
cur.execute("DELETE FROM inscripciones")
cur.execute("DELETE FROM domicilios")
cur.execute("DELETE FROM alumnos")
cur.execute("DELETE FROM materias")
conn.commit()

# Resetear secuencias para que los IDs comiencen desde 1
cur.execute("ALTER SEQUENCE notas_id_nota_seq RESTART WITH 1;")
cur.execute("ALTER SEQUENCE inscripciones_id_inscripcion_seq RESTART WITH 1;")
cur.execute("ALTER SEQUENCE domicilios_id_domicilio_seq RESTART WITH 1;")
cur.execute("ALTER SEQUENCE alumnos_id_alumno_seq RESTART WITH 1;")
cur.execute("ALTER SEQUENCE materias_id_materia_seq RESTART WITH 1;")
conn.commit()

# 1. Insertar materias
materias = []
for i in range(N_MATERIAS):
    codigo = f'MAT{i+1:03d}'
    nombre = f"Materia {i+1}"
    creditos = random.randint(2, 8)
    descripcion = fake.text(max_nb_chars=50)
    activa = random.choice([True, False])
    cur.execute("""
        INSERT INTO materias (codigo, nombre, creditos, descripcion, activa)
        VALUES (%s, %s, %s, %s, %s) RETURNING id_materia
    """, (codigo, nombre, creditos, descripcion, activa))
    materias.append(cur.fetchone()[0])
conn.commit()
print(f"Insertadas {N_MATERIAS} materias")

# 2. Insertar alumnos
alumnos = []
for i in range(N_ALUMNOS):
    nombre = fake.first_name()
    apellido = fake.last_name()
    email = fake.unique.email()
    fecha_nacimiento = fake.date_of_birth(minimum_age=18, maximum_age=30)
    telefono = fake.phone_number()[:20]
    cur.execute("""
        INSERT INTO alumnos (nombre, apellido, email, fecha_nacimiento, telefono)
        VALUES (%s, %s, %s, %s, %s) RETURNING id_alumno
    """, (nombre, apellido, email, fecha_nacimiento, telefono))
    alumnos.append(cur.fetchone()[0])
    if (i+1) % 10000 == 0:
        conn.commit()
        print(f"Insertados {i+1} alumnos")
conn.commit()
print(f"Insertados {N_ALUMNOS} alumnos")


# 3. Insertar domicilios (1-2 por alumno)
domicilios = []
for id_alumno in alumnos:
    for _ in range(random.randint(1, 2)):
        direccion = fake.street_address()
        ciudad = fake.city()
        codigo_postal = fake.postcode()
        pais = fake.country()
        es_principal = random.choice([True, False])
        cur.execute("""
            INSERT INTO domicilios (id_alumno, direccion, ciudad, codigo_postal, pais, es_principal)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id_domicilio
        """, (id_alumno, direccion, ciudad, codigo_postal, pais, es_principal))
        domicilios.append(cur.fetchone()[0])
    if id_alumno % 10000 == 0:
        conn.commit()
        print(f"Domicilios insertados para {id_alumno} alumnos")
conn.commit()
print(f"Insertados domicilios para todos los alumnos")

# 4. Insertar inscripciones
inscripciones = []
for i in range(N_INSCRIPCIONES):
    id_alumno = random.choice(alumnos)
    id_materia = random.choice(materias)
    fecha_inscripcion = fake.date_between(start_date='-2y', end_date='today')
    estado = random.choice(['activa', 'aprobada', 'reprobada', 'baja'])
    try:
        cur.execute("""
            INSERT INTO inscripciones (id_alumno, id_materia, fecha_inscripcion, estado)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING id_inscripcion
        """, (id_alumno, id_materia, fecha_inscripcion, estado))
        res = cur.fetchone()
        if res:
            inscripciones.append(res[0])
    except Exception as e:
        print(f"Error en inscripción {i}: {e}")
    if (i+1) % 10000 == 0:
        conn.commit()
        print(f"Insertadas {i+1} inscripciones")
conn.commit()
print(f"Insertadas {N_INSCRIPCIONES} inscripciones")

# 5. Insertar notas (1-3 por inscripción)
tipos_eval = ['Parcial', 'Final', 'TP', 'Recuperatorio']
for idx, id_inscripcion in enumerate(inscripciones):
    for _ in range(random.randint(1, 3)):
        tipo_evaluacion = random.choice(tipos_eval)
        calificacion = round(random.uniform(0, 10), 2)
        fecha_evaluacion = fake.date_between(start_date='-2y', end_date='today')
        observaciones = fake.sentence(nb_words=8)
        cur.execute("""
            INSERT INTO notas (id_inscripcion, tipo_evaluacion, calificacion, fecha_evaluacion, observaciones)
            VALUES (%s, %s, %s, %s, %s)
        """, (id_inscripcion, tipo_evaluacion, calificacion, fecha_evaluacion, observaciones))
    if (idx+1) % 10000 == 0:
        conn.commit()
        print(f"Notas insertadas para {idx+1} inscripciones")
conn.commit()
print("Insertadas notas para todas las inscripciones")

cur.close()
conn.close()
print("Carga masiva finalizada.")
