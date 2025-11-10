
import threading
import psycopg2
import time

# Configuración de conexión igual a carga_masiva.py
DB_HOST = 'localhost'
DB_PORT = 5432
DB_NAME = 'postgres'
DB_USER = 'postgres'
DB_PASS = 'postgres123'


def transaccion_1():
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        cur = conn.cursor()
        conn.autocommit = False
        print("Transacción 1: BEGIN")
        cur.execute("BEGIN;")
        for i in range(1, 50001):
            print(f"Transacción 1: UPDATE id_alumno={i}")
            cur.execute(f"UPDATE alumnos SET nombre = 'A' WHERE id_alumno = {i};")
            time.sleep(0.01)
        time.sleep(10)  # Espera más larga para que la otra transacción cruce locks
        for i in range(50000, 0, -1):
            print(f"Transacción 1: UPDATE id_alumno={i}")
            cur.execute(f"UPDATE alumnos SET nombre = 'A' WHERE id_alumno = {i};")
            time.sleep(0.01)
        conn.commit()
        print("Transacción 1: COMMIT")
    except Exception as e:
        print("Transacción 1: ERROR:", e)
        if conn:
            conn.rollback()
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def transaccion_2():
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        cur = conn.cursor()
        conn.autocommit = False
        print("Transacción 2: BEGIN")
        cur.execute("BEGIN;")
        for i in range(50000, 0, -1):
            print(f"Transacción 2: UPDATE id_alumno={i}")
            cur.execute(f"UPDATE alumnos SET nombre = 'B' WHERE id_alumno = {i};")
            time.sleep(0.01)
        time.sleep(10)  # Espera más larga para que la otra transacción cruce locks
        for i in range(1, 50001):
            print(f"Transacción 2: UPDATE id_alumno={i}")
            cur.execute(f"UPDATE alumnos SET nombre = 'B' WHERE id_alumno = {i};")
            time.sleep(0.01)
        conn.commit()
        print("Transacción 2: COMMIT")
    except Exception as e:
        print("Transacción 2: ERROR:", e)
        if conn:
            conn.rollback()
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    t1 = threading.Thread(target=transaccion_1)
    t2 = threading.Thread(target=transaccion_2)

    t1.start()
    t2.start()

    t1.join()
    t2.join()
