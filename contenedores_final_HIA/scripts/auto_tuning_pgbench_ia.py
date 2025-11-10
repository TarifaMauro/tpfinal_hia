
import subprocess
import time
from skopt import gp_minimize
from skopt.space import Categorical, Integer

# Configuración de conexión y Docker
CONTAINER_NAME = "postgres-master" 
CONF_PATH = "/var/lib/postgresql/data/pgdata/postgresql.base.conf"
PG_USER = "postgres"
PG_DB = "postgres"

# Espacio de búsqueda para los parámetros
space = [
    Categorical(['128MB', '256MB', '512MB'], name='shared_buffers'),
    Categorical(['4MB', '8MB', '16MB'], name='work_mem'),
    Integer(50, 100, name='max_connections')
]

def edit_postgresql_conf(param, value):
    sed_cmd = f"sed -i '/^{param}/d' {CONF_PATH} && echo \"{param} = '{value}'\" >> {CONF_PATH}"
    subprocess.run(f"docker exec {CONTAINER_NAME} bash -c \"{sed_cmd}\"", shell=True)

def restart_container():
    subprocess.run(f"docker restart {CONTAINER_NAME}", shell=True)
    time.sleep(20)

def run_pgbench(clients=10, duration=30):
    cmd = [
        "docker", "exec", CONTAINER_NAME,
        "pgbench", "-c", str(clients), "-T", str(duration), "-U", PG_USER, "-d", PG_DB
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    output = result.stdout
    tps = None
    for line in output.splitlines():
        if "tps =" in line:
            tps = float(line.split('=')[1].split()[0])
    if not tps:
        print("\n[DEBUG] Salida completa de pgbench:")
        print(output)
    return tps if tps else 0

def apply_config(shared_buffers, work_mem, max_connections):
    edit_postgresql_conf("shared_buffers", shared_buffers)
    edit_postgresql_conf("work_mem", work_mem)
    edit_postgresql_conf("max_connections", max_connections)
    restart_container()

def objective(params):
    shared_buffers, work_mem, max_connections = params
    print(f"\nProbando: shared_buffers={shared_buffers}, work_mem={work_mem}, max_connections={max_connections}")
    apply_config(shared_buffers, work_mem, max_connections)
    tps = run_pgbench()
    print(f"TPS obtenido: {tps}")
    return -tps

def main():
    print("\n=== OPTIMIZACIÓN INTELIGENTE DE PARÁMETROS CON IA (BAYESIAN OPTIMIZATION) ===\n")
    res = gp_minimize(objective, space, n_calls=10, random_state=42)
    print("\nMejor configuración encontrada:")
    print(f"  shared_buffers: {res.x[0]}")
    print(f"  work_mem: {res.x[1]}")
    print(f"  max_connections: {res.x[2]}")
    print(f"  Mejor TPS: {-res.fun}")

if __name__ == "__main__":
    main()
