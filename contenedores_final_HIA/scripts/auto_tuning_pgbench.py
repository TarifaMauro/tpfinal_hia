import subprocess
import time
import os

# Configuración de conexión y Docker
CONTAINER_NAME = "postgres-master"
CONF_PATH = "/var/lib/postgresql/data/postgresql.conf"
PG_USER = "postgres"
PG_DB = "postgres"
PG_PORT = 5432
PG_HOST = "localhost"
PG_PASS = "postgres123"

# Parámetros y valores a probar
PARAMS = {
    "shared_buffers": ["128MB", "256MB", "512MB"],
    "work_mem": ["4MB", "8MB", "16MB"],
    "max_connections": [50, 100]
}

def edit_postgresql_conf(param, value):
    sed_cmd = f"sed -i '/^{param}/d' {CONF_PATH} && echo \"{param} = '{value}'\" >> {CONF_PATH}"
    subprocess.run(f"docker exec {CONTAINER_NAME} bash -c \"{sed_cmd}\"", shell=True)

def restart_container():
    subprocess.run(f"docker restart {CONTAINER_NAME}", shell=True)
    # Espera a que el contenedor esté listo
    time.sleep(10)

def run_pgbench(clients=10, duration=30):
    env = os.environ.copy()
    env["PGPASSWORD"] = PG_PASS
    cmd = [
        "pgbench", "-h", PG_HOST, "-p", str(PG_PORT), "-U", PG_USER, "-d", PG_DB,
        "-c", str(clients), "-T", str(duration)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    output = result.stdout
    tps = None
    latency = None
    for line in output.splitlines():
        if "tps =" in line:
            tps = float(line.split('=')[1].split()[0])
        if "latency average" in line:
            latency = float(line.split('=')[1].split()[0])
    return tps, latency, output

def main():
    results = []
    for shared_buffers in PARAMS["shared_buffers"]:
        for work_mem in PARAMS["work_mem"]:
            for max_conn in PARAMS["max_connections"]:
                print(f"\nProbando configuración: shared_buffers={shared_buffers}, work_mem={work_mem}, max_connections={max_conn}")
                edit_postgresql_conf("shared_buffers", shared_buffers)
                edit_postgresql_conf("work_mem", work_mem)
                edit_postgresql_conf("max_connections", max_conn)
                restart_container()
                tps, latency, output = run_pgbench()
                print(f"TPS: {tps}, Latencia: {latency} ms")
                results.append({
                    "shared_buffers": shared_buffers,
                    "work_mem": work_mem,
                    "max_connections": max_conn,
                    "tps": tps,
                    "latency": latency,
                    "output": output
                })
    # Muestra un resumen
    print("\nResumen de resultados:")
    for r in results:
        print(f"{r['shared_buffers']}, {r['work_mem']}, {r['max_connections']} => TPS: {r['tps']}, Latencia: {r['latency']} ms")
    # Guarda los resultados
    with open("tuning_results.txt", "w") as f:
        for r in results:
            f.write(str(r) + "\n")

if __name__ == "__main__":
    main()
