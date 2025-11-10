import subprocess
import time
import yaml
from skopt import gp_minimize
from skopt.space import Categorical, Integer
import sys

# Logging a archivo y consola
class TeeLogger:
    def __init__(self, filename):
        self.terminal = sys.stdout
        self.log = open(filename, "a", encoding="utf-8")
    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)
    def flush(self):
        self.terminal.flush()
        self.log.flush()
sys.stdout = TeeLogger("auto_tuning_patroni_ia.log")

# Configuración de conexión y Docker
import re

# Detecta el contenedor líder automáticamente
def get_leader_container():
    # Lista los contenedores que pueden ser nodos Patroni
    result = subprocess.run(["docker", "ps", "--format", "{{.Names}}"], capture_output=True, text=True)
    candidates = [name for name in result.stdout.splitlines() if name.startswith("postgres-")]
    for name in candidates:
        # Intenta ejecutar patronictl list en el contenedor
        cmd = [
            "docker", "exec", name,
            "/opt/patroni/bin/patronictl", "-c", "/etc/patroni.yml", "list"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0:
            # Busca la línea con 'Leader'
            for line in res.stdout.splitlines():
                if re.search(r'\|\s*' + re.escape(name) + r'\s*\|.*Leader', line):
                    print(f"[INFO] Nodo líder detectado: {name}")
                    return name
    print("[ERROR] No se pudo detectar el nodo líder automáticamente. Usando 'postgres-master' por defecto.")
    return "postgres-master"

CONTAINER_NAME = get_leader_container()
PATRONI_YML = "config/patroni-master.yml"
PG_USER = "postgres"
PG_DB = "postgres"

# Espacio de búsqueda para los parámetros
space = [
    Categorical(['128MB', '256MB', '512MB'], name='shared_buffers'),
    Categorical(['4MB', '8MB', '16MB'], name='work_mem'),
    Integer(50, 100, name='max_connections')
]


def edit_patroni_yml(shared_buffers, work_mem, max_connections):
    with open(PATRONI_YML, 'r') as f:
        data = yaml.safe_load(f)
    # Modifica los parámetros en la sección correcta, forzando valores simples
    params = data['postgresql']['parameters']
    params['shared_buffers'] = str(shared_buffers)
    params['work_mem'] = str(work_mem)
    params['max_connections'] = int(max_connections)
    # Limpia cualquier clave rara que haya quedado
    for k in list(params.keys()):
        if k not in ['shared_buffers', 'work_mem', 'max_connections', 'shared_preload_libraries', 'unix_socket_directories']:
            del params[k]
    with open(PATRONI_YML, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True)
    print(f"[YAML] Actualizado: shared_buffers={shared_buffers}, work_mem={work_mem}, max_connections={max_connections}")


def restart_container():
    subprocess.run(f"docker restart {CONTAINER_NAME}", shell=True)
    print("[INFO] Contenedor reiniciado. Esperando a que PostgreSQL esté disponible...")
    wait_for_postgres_ready(timeout=120)

def wait_for_postgres_ready(timeout=120, interval=5):
    """
    Espera activa a que PostgreSQL acepte conexiones usando psql dentro del contenedor.
    """
    start = time.time()
    while time.time() - start < timeout:
        cmd = [
            "docker", "exec", CONTAINER_NAME,
            "pg_isready", "-U", PG_USER, "-d", PG_DB
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if "accepting connections" in result.stdout:
            print("[INFO] PostgreSQL está listo para aceptar conexiones.")
            return True
        print("[WAIT] PostgreSQL no está listo, reintentando en {}s...".format(interval))
        time.sleep(interval)
    print("[ERROR] Timeout esperando a que PostgreSQL esté listo.")
    return False


def run_pgbench(clients=10, duration=30, retries=5, retry_wait=8):
    """
    Ejecuta pgbench con reintentos si falla la conexión o no hay TPS.
    """
    for attempt in range(1, retries+1):
        cmd = [
            "docker", "exec", CONTAINER_NAME,
            "pgbench", "-c", str(clients), "-T", str(duration), "-U", PG_USER, "-d", PG_DB
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        output = result.stdout + result.stderr
        tps = None
        for line in output.splitlines():
            if "tps =" in line:
                try:
                    tps = float(line.split('=')[1].split()[0])
                except Exception:
                    tps = None
        if tps and tps > 0:
            print(f"[INFO] pgbench exitoso en intento {attempt}. TPS: {tps}")
            return tps
        else:
            print(f"[WARN] pgbench falló o TPS=0 en intento {attempt}. Esperando {retry_wait}s y reintentando...")
            print("[DEBUG] Salida completa de pgbench:")
            print(output)
            time.sleep(retry_wait)
    print("[ERROR] pgbench falló tras varios intentos. Se devuelve TPS=0.")
    return 0

def objective(params):
    shared_buffers, work_mem, max_connections = params
    print(f"\nProbando: shared_buffers={shared_buffers}, work_mem={work_mem}, max_connections={max_connections}")
    edit_patroni_yml(shared_buffers, work_mem, max_connections)
    restart_container()
    tps = run_pgbench()
    print(f"TPS obtenido: {tps}")
    return -tps

def main():
    print("\n=== OPTIMIZACIÓN INTELIGENTE DE PARÁMETROS CON IA (PATRONI + YAML) ===\n")
    res = gp_minimize(objective, space, n_calls=10, random_state=42)
    print("\nMejor configuración encontrada:")
    print(f"  shared_buffers: {res.x[0]}")
    print(f"  work_mem: {res.x[1]}")
    print(f"  max_connections: {res.x[2]}")
    print(f"  Mejor TPS: {-res.fun}")

if __name__ == "__main__":
    main()
