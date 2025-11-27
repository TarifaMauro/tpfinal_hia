import subprocess
import time
import yaml
from skopt import gp_minimize
from skopt.space import Categorical, Integer
import sys
import argparse
import json
import datetime
from datetime import timezone
import numpy as np
import os

# Logging a archivo y consola
class TeeLogger:
    def __init__(self, filename):
        self.terminal = sys.stdout
        # Abre el archivo de logs en modo escritura, sobrescribiendo si existe
        self.log = open(filename, "w", encoding="utf-8")
    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)
    def flush(self):
        self.terminal.flush()
        self.log.flush()
sys.stdout = TeeLogger("auto_tuning_patroni_ia.log")

# Configuración de conexión y Docker
import re
import shutil


# Detecta el contenedor líder automáticamente usando el endpoint REST de Patroni
def get_leader_container():
    result = subprocess.run(["docker", "ps", "--format", "{{.Names}}"], capture_output=True, text=True)
    candidates = [name for name in result.stdout.splitlines() if name.startswith("postgres")]
    for name in candidates:
        # Intenta obtener el estado desde Patroni REST dentro del contenedor
        cmd = ["docker", "exec", name, "curl", "-s", "http://127.0.0.1:8008/patroni"]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0 and res.stdout.strip():
            try:
                info = json.loads(res.stdout)
                role = info.get("role") or info.get("state")
                if role and role.lower() == "leader":
                    print(f"[INFO] Nodo líder detectado via REST: {name}")
                    return name
            except Exception:
                # Fallback a patronictl si el JSON no es legible
                pass
    # Fallback: intenta con patronictl como antes
    for name in candidates:
        cmd = [
            "docker", "exec", name,
            "/opt/patroni/bin/patronictl", "-c", "/etc/patroni.yml", "list"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0:
            for line in res.stdout.splitlines():
                if re.search(r"\|\s*" + re.escape(name) + r"\s*\|.*Leader", line):
                    print(f"[INFO] Nodo líder detectado via patronictl: {name}")
                    return name
    print("[WARN] No se pudo detectar el nodo líder automáticamente. Usando 'postgres-master' por defecto.")
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


def write_patroni_yml_if_commit(shared_buffers, work_mem, max_connections, commit=False, container_name=None):
    """
    Si commit=True escribe el YAML, si no solo muestra lo que haría.
    """
    if not commit:
        print("[DRY-RUN] Se habría actualizado el YAML con:")
        print(f"    shared_buffers={shared_buffers}, work_mem={work_mem}, max_connections={max_connections}")
        return

    # commit=True -> detectamos líder (si no se pasó) y aplicamos vía Patroni REST o fallback in-container
    if container_name is None:
        container_name = get_leader_container()

    print(f"[INFO] Aplicando configuración sobre líder detectado: {container_name}")

    # Check herramientas en el contenedor líder antes de aplicar
    missing = check_container_tools(container_name)
    if missing:
        print(f"[WARN] Faltan herramientas en {container_name}: {missing}. Se intentará fallback cuando sea posible.")

    print("[INFO] Intentando aplicar configuración vía Patroni REST dentro del contenedor líder...")
    try:
        ok = apply_config_via_patroni_rest(shared_buffers, work_mem, max_connections, container_name)
        if ok:
            print("[OK] Configuración aplicada via REST.")
            return
        else:
            print("[WARN] REST no aplicó la configuración, se intentará editar el YAML dentro del contenedor (fallback).")
    except Exception as e:
        print(f"[ERROR] Error al intentar aplicar vía REST: {e}")

    # Fallback: editar el YAML dentro del contenedor líder y recargar
    try:
        backup = backup_container_patroni_yml(container_name)
        print(f"[INFO] Backup del patroni.yml guardado en: {backup}")
        # almacenar última ruta de backup en variable global para posible rollback
        global LAST_BACKUP_PATH
        LAST_BACKUP_PATH = backup
    except Exception as e:
        print(f"[WARN] No se pudo crear backup del YAML dentro del contenedor: {e}")

    applied = apply_config_in_container(container_name, shared_buffers, work_mem, max_connections)
    if applied:
        print("[OK] Configuración aplicada dentro del contenedor (fallback).")
    else:
        print("[ERROR] No se pudo aplicar la configuración dentro del contenedor.")


def check_container_tools(container_name):
    """Comprueba si el contenedor líder tiene herramientas necesarias: curl, python, patronictl."""
    tools = {'curl': False, 'python': False, 'patronictl': False}
    # check curl
    res = subprocess.run(["docker", "exec", container_name, "which", "curl"], capture_output=True)
    if res.returncode == 0:
        tools['curl'] = True
    res = subprocess.run(["docker", "exec", container_name, "which", "python"], capture_output=True)
    if res.returncode == 0:
        tools['python'] = True
    res = subprocess.run(["docker", "exec", container_name, "which", "/opt/patroni/bin/patronictl"], capture_output=True)
    if res.returncode == 0:
        tools['patronictl'] = True
    missing = [k for k, v in tools.items() if not v]
    return missing


def check_pgbench_present(mode, client_container=None):
    if mode == 'container':
        # Si no se especifica client_container, intenta auto-detectar uno que tenga pgbench
        if not client_container:
            detected = detect_pgbench_container()
            if detected:
                return True, detected
            return False, 'no client container specified and none auto-detected with pgbench'
        res = subprocess.run(["docker", "exec", client_container, "which", "pgbench"], capture_output=True)
        return (res.returncode == 0, 'pgbench not found in client container' if res.returncode != 0 else '')
    else:
        # local
        if shutil.which('pgbench'):
            return True, ''
        return False, 'pgbench not found on host'


def detect_pgbench_container():
    """Busca entre los contenedores postgres existentes uno que tenga pgbench instalado.
    Devuelve el nombre del contenedor o None si no encuentra ninguno.
    """
    result = subprocess.run(["docker", "ps", "--format", "{{.Names}}"], capture_output=True, text=True)
    candidates = [name for name in result.stdout.splitlines() if name.startswith('postgres')]
    for name in candidates:
        try:
            res = subprocess.run(["docker", "exec", name, "which", "pgbench"], capture_output=True, text=True)
            if res.returncode == 0 and res.stdout.strip():
                print(f"[INFO] Encontrado contenedor con pgbench: {name}")
                return name
        except Exception:
            continue
    return None


def detect_replica_containers():
    result = subprocess.run(["docker", "ps", "--format", "{{.Names}}"], capture_output=True, text=True)
    candidates = [name for name in result.stdout.splitlines() if name.startswith('postgres-replica')]
    return candidates


def check_replication_lag(max_lag_seconds=5):
    """Check lag in seconds on replicas; returns (ok, details)"""
    replicas = detect_replica_containers()
    details = {}
    for r in replicas:
        cmd = ["docker", "exec", r, "psql", "-U", "postgres", "-t", "-c", "SELECT EXTRACT(EPOCH FROM (now() - coalesce(pg_last_xact_replay_timestamp(), now())));"]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            details[r] = {'error': res.stderr.strip()}
            continue
        try:
            val = float(res.stdout.strip() or 0.0)
        except Exception:
            val = 0.0
        details[r] = {'lag_seconds': val}
        if val > float(max_lag_seconds):
            return False, details
    return True, details


def restore_backup_in_container(container_name, backup_path=None):
    """Restaura backup YAML (local) dentro del contenedor y recarga Patroni. Devuelve True si ok."""
    if not backup_path:
        global LAST_BACKUP_PATH
        backup_path = globals().get('LAST_BACKUP_PATH')
    if not backup_path or not os.path.exists(backup_path):
        print("[ERROR] No hay backup disponible para restaurar.")
        return False
    path = detect_patroni_yml_path(container_name)
    # copiar archivo al contenedor
    res = subprocess.run(["docker", "cp", backup_path, f"{container_name}:{path}"], capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[ERROR] docker cp falló: {res.stderr}")
        return False
    # intentar recargar
    cmd_reload = ["docker", "exec", container_name, "/opt/patroni/bin/patronictl", "-c", path, "reload"]
    res2 = subprocess.run(cmd_reload, capture_output=True, text=True)
    if res2.returncode == 0:
        print("[INFO] patronictl reload ejecutado con éxito tras restaurar backup.")
        return True
    # supervisorctl
    res3 = subprocess.run(["docker", "exec", container_name, "supervisorctl", "restart", "patroni"], capture_output=True, text=True)
    if res3.returncode == 0:
        print("[INFO] supervisorctl restart patroni ejecutado con éxito tras restaurar backup.")
        return True
    # reiniciar contenedor
    res4 = subprocess.run(["docker", "restart", container_name], capture_output=True, text=True)
    if res4.returncode == 0:
        print("[INFO] Contenedor reiniciado tras restaurar backup.")
        wait_for_postgres_ready(timeout=120)
        return True
    print("[ERROR] No se pudo restaurar o recargar Patroni tras restaurar backup.")
    return False


def detect_patroni_yml_path(container_name):
    cmd = ["docker", "exec", container_name, "bash", "-lc",
           "if [ -f /etc/patroni.yml ]; then echo /etc/patroni.yml; elif [ -f /etc/patroni/patroni.yml ]; then echo /etc/patroni/patroni.yml; fi"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    path = res.stdout.strip()
    return path if path else "/etc/patroni.yml"


def run_pgbench_init(mode='local', client_container=None, haproxy_host='haproxy', haproxy_port=5434):
    """Ejecuta `pgbench -i` para inicializar las tablas necesarias en la base de datos.
    Retorna True si la inicialización fue exitosa.
    """
    print(f"[INFO] Intentando inicializar la base de datos para pgbench (mode={mode})...")
    if mode == 'container' and client_container:
        safe_pwd = globals().get('GLOBAL_PG_PASSWORD', os.environ.get('PGPASSWORD', ''))
        cmd = [
            "docker", "exec", client_container,
            "bash", "-lc",
            f"PGPASSWORD=\'{safe_pwd}\' pgbench -i -h {haproxy_host} -p {haproxy_port} -U {PG_USER} -d {PG_DB}"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
    else:
        env = os.environ.copy()
        env['PGPASSWORD'] = globals().get('GLOBAL_PG_PASSWORD', env.get('PGPASSWORD', ''))
        cmd = ["pgbench", "-i", "-h", haproxy_host, "-p", str(haproxy_port), "-U", PG_USER, "-d", PG_DB]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, env=env)
        except FileNotFoundError:
            print("[ERROR] pgbench no encontrado en host para inicializar.")
            return False

    output = (res.stdout or '') + (res.stderr or '')
    if res.returncode == 0:
        print("[OK] Inicialización pgbench completada.")
        return True
    else:
        print("[ERROR] Falló pgbench -i. Salida:")
        print(output)
        return False


def backup_container_patroni_yml(container_name):
    """Copia el patroni.yml del contenedor al host (cwd) y devuelve la ruta local."""
    path = detect_patroni_yml_path(container_name)
    ts = datetime.datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    outname = f"patroni_backup_{container_name}_{ts}.yml"
    cmd = ["docker", "exec", container_name, "cat", path]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"No se pudo leer {path} en {container_name}: {res.stderr}")
    with open(outname, 'w', encoding='utf-8') as fh:
        fh.write(res.stdout)
    return os.path.abspath(outname)


def apply_config_via_patroni_rest(shared_buffers, work_mem, max_connections, container_name=None):
    """Intenta aplicar parámetros llamando al endpoint REST de Patroni dentro del leader.
    Devuelve True si parece funcionar (returncode 0), False en caso contrario.
    """
    payload = {
        'postgresql': {
            'parameters': {
                'shared_buffers': str(shared_buffers),
                'work_mem': str(work_mem),
                'max_connections': int(max_connections)
            }
        }
    }
    data = json.dumps(payload)
    if container_name is None:
        container_name = CONTAINER_NAME
    cmd = ["docker", "exec", container_name, "curl", "-s", "-X", "POST", "-H", "Content-Type: application/json", "-d", data, "http://127.0.0.1:8008/config"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        return True
    return False


def apply_config_in_container(container_name, shared_buffers, work_mem, max_connections):
    """Fallback: editar el YAML dentro del contenedor usando python embebido y luego recargar/reiniciar patroni.
    Devuelve True si alguno de los intentos de recarga/restart fue exitoso.
    """
    path = detect_patroni_yml_path(container_name)
    # Python snippet para modificar el YAML dentro del contenedor
    py = f"""import yaml
p='{path}'
d=yaml.safe_load(open(p))
if 'postgresql' not in d:
    d['postgresql'] = {{}}
if 'parameters' not in d['postgresql']:
    d['postgresql']['parameters'] = {{}}
d['postgresql']['parameters']['shared_buffers']='{shared_buffers}'
d['postgresql']['parameters']['work_mem']='{work_mem}'
d['postgresql']['parameters']['max_connections']={int(max_connections)}
open(p,'w').write(yaml.dump(d))
print('ok')
"""
    cmd = ["docker", "exec", container_name, "bash", "-lc", f"python - <<'PY'\n{py}\nPY"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[ERROR] Falló modificación YAML in-container: {res.stderr}")
        return False

    # Intentar recargar con patronictl
    cmd_reload = ["docker", "exec", container_name, "/opt/patroni/bin/patronictl", "-c", path, "reload"]
    res2 = subprocess.run(cmd_reload, capture_output=True, text=True)
    if res2.returncode == 0:
        print("[INFO] patronictl reload ejecutado con éxito.")
        return True

    # Intentar supervisorctl
    cmd_sup = ["docker", "exec", container_name, "supervisorctl", "restart", "patroni"]
    res3 = subprocess.run(cmd_sup, capture_output=True, text=True)
    if res3.returncode == 0:
        print("[INFO] supervisorctl restart patroni ejecutado con éxito.")
        return True

    # Último recurso: reiniciar el contenedor
    cmd_restart = ["docker", "restart", container_name]
    res4 = subprocess.run(cmd_restart, capture_output=True, text=True)
    if res4.returncode == 0:
        print("[INFO] Contenedor reiniciado como último recurso.")
        wait_for_postgres_ready(timeout=120)
        return True

    print("[ERROR] No se pudo recargar o reiniciar Patroni en el contenedor.")
    return False


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


def run_pgbench(clients=10, duration=30, retries=5, retry_wait=8,
                mode='local', client_container=None, haproxy_host='haproxy', haproxy_port=5434):
    """
    Ejecuta pgbench con reintentos si falla la conexión o no hay TPS.
    """
    for attempt in range(1, retries+1):
        if mode == 'container' and client_container:
            # Ensure password is passed via environment inside the container
            safe_pwd = globals().get('GLOBAL_PG_PASSWORD', os.environ.get('PGPASSWORD', ''))
            # Use bash -lc so we can set PGPASSWORD for the pgbench invocation
            cmd = [
                "docker", "exec", client_container,
                "bash", "-lc",
                f"PGPASSWORD=\'{safe_pwd}\' pgbench -h {haproxy_host} -p {haproxy_port} -c {clients} -T {duration} -U {PG_USER} -d {PG_DB}"
            ]
        else:
            # modo local: ejecuta pgbench en el host (debe estar instalado)
            # Pass PGPASSWORD in the environment for local runs
            env = os.environ.copy()
            env['PGPASSWORD'] = globals().get('GLOBAL_PG_PASSWORD', env.get('PGPASSWORD', ''))
            cmd = [
                "pgbench", "-h", haproxy_host, "-p", str(haproxy_port), "-c", str(clients), "-T", str(duration), "-U", PG_USER, "-d", PG_DB
            ]
        try:
            if mode == 'local':
                result = subprocess.run(cmd, capture_output=True, text=True, env=env)
            else:
                result = subprocess.run(cmd, capture_output=True, text=True)
        except FileNotFoundError:
            print(f"[ERROR] pgbench no encontrado en modo {mode}. Comando: {' '.join(cmd)}")
            return 0
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
            # Detectar si pgbench no fue inicializado (falta de tablas)
            if 'Perhaps you need to do initialization' in output or 'pgbench_branches' in output:
                print(f"[WARN] pgbench falló o TPS=0 en intento {attempt}. Mensaje de inicialización detectado.")
                print("[DEBUG] Salida completa de pgbench:")
                print(output)
                if globals().get('GLOBAL_AUTO_INIT'):
                    print('[INFO] --auto-init activado: intentando inicializar la base con pgbench -i')
                    ok_init = run_pgbench_init(mode=mode, client_container=client_container, haproxy_host=haproxy_host, haproxy_port=haproxy_port)
                    if ok_init:
                        print('[INFO] Inicialización completada, reintentando pgbench de inmediato...')
                        time.sleep(2)
                        continue
                    else:
                        print('[ERROR] Falló la inicialización automática. Abortando pgbench.')
                        return 0
                else:
                    print('[ERROR] pgbench no está inicializado. Ejecuta manualmente:')
                    print(f"  pgbench -i -h {haproxy_host} -p {haproxy_port} -U {PG_USER} -d {PG_DB}")
                    print("  O vuelve a ejecutar el script con --auto-init para que intente inicializar automáticamente (esto modifica la BD).")
                    return 0
            print(f"[WARN] pgbench falló o TPS=0 en intento {attempt}. Esperando {retry_wait}s y reintentando...")
            print("[DEBUG] Salida completa de pgbench:")
            print(output)
            time.sleep(retry_wait)
    print("[ERROR] pgbench falló tras varios intentos. Se devuelve TPS=0.")
    return 0


def _convert_for_json(obj):
    """Recursively convert common non-JSON types to native Python types.
    - numpy scalars/arrays -> native int/float/list
    - datetime -> ISO string
    """
    # dict
    if isinstance(obj, dict):
        return { _convert_for_json(k): _convert_for_json(v) for k, v in obj.items() }
    # list/tuple
    if isinstance(obj, list):
        return [ _convert_for_json(v) for v in obj ]
    if isinstance(obj, tuple):
        return tuple(_convert_for_json(v) for v in obj)
    # numpy scalar
    if isinstance(obj, np.generic):
        try:
            return obj.item()
        except Exception:
            return int(obj)
    # numpy array
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    # datetime
    if isinstance(obj, datetime.datetime):
        try:
            return obj.astimezone(timezone.utc).isoformat()
        except Exception:
            return obj.isoformat()
    # fallback: basic types (str,int,float,bool,None) will pass through
    return obj

def objective(params):
    shared_buffers, work_mem, max_connections = params
    print(f"\nProbando: shared_buffers={shared_buffers}, work_mem={work_mem}, max_connections={max_connections}")
    # Re-detectar líder si se solicitó
    if globals().get('GLOBAL_RECHECK_LEADER_EACH_ITER'):
        leader = get_leader_container()
    else:
        leader = CONTAINER_NAME

    # Escritura del YAML (solo si --commit). Pasamos el líder detectado
    write_patroni_yml_if_commit(shared_buffers, work_mem, max_connections, commit=GLOBAL_COMMIT, container_name=leader)

    if GLOBAL_COMMIT:
        restart_container()
    else:
        print("[INFO] No se reiniciará el contenedor en modo dry-run.")

    # Medir TPS tras aplicar
    tps = run_pgbench(mode=GLOBAL_MODE, client_container=GLOBAL_CLIENT_CONTAINER,
                     haproxy_host=GLOBAL_HAPROXY_HOST, haproxy_port=GLOBAL_HAPROXY_PORT)
    print(f"TPS obtenido: {tps}")

    # Chequear replicación/lag
    lag_ok, lag_details = check_replication_lag(GLOBAL_MAX_LAG_SECONDS)

    # Decidir rollback si es necesario (si hicimos commit y tenemos baseline)
    rollback_done = False
    reason = None
    baseline = globals().get('BASELINE_TPS')
    if GLOBAL_COMMIT and baseline is not None:
        try:
            drop_percent = 0.0
            if baseline > 0:
                drop_percent = (baseline - tps) / baseline * 100.0
            if drop_percent > float(GLOBAL_ROLLBACK_THRESHOLD_PERCENT):
                reason = f"TPS drop {drop_percent:.1f}% > {GLOBAL_ROLLBACK_THRESHOLD_PERCENT}%"
            if not lag_ok:
                reason = (reason + '; ' if reason else '') + f"replication lag exceeded: {lag_details}"
        except Exception as e:
            reason = f"error evaluating rollback: {e}"

        if reason:
            print(f"[WARN] Condición de rollback detectada: {reason}. Intentando restaurar backup...")
            ok = restore_backup_in_container(leader)
            if ok:
                rollback_done = True
                print("[INFO] Rollback aplicado con éxito.")
            else:
                print("[ERROR] Falló intento de rollback.")

    # Registrar evaluación en memoria para el JSON final
    eval_record = {
        'params': [shared_buffers, work_mem, int(max_connections)],
        'tps': tps,
        'leader': leader,
        'lag_ok': lag_ok,
        'lag_details': lag_details,
        'rollback': rollback_done,
        'rollback_reason': reason,
        'backup_path': globals().get('LAST_BACKUP_PATH')
    }
    try:
        global EVALS
        EVALS.append(eval_record)
    except Exception:
        pass

    return -tps

def main():
    parser = argparse.ArgumentParser(description="Autotuning Patroni (modo seguro, soporte dry-run)")
    parser.add_argument("--n-calls", type=int, default=8, help="Número de evaluaciones para el optimizador")
    parser.add_argument("--dry-run", action="store_true", help="No aplicar cambios ni reiniciar contenedores")
    parser.add_argument("--commit", action="store_true", help="Aplica cambios (escribe YAML y reinicia) ")
    parser.add_argument("--mode", choices=['local', 'container'], default='local', help="Dónde ejecutar pgbench")
    parser.add_argument("--client-container", type=str, default=None, help="Nombre del contenedor cliente para ejecutar pgbench si mode=container")
    parser.add_argument("--haproxy-host", type=str, default='haproxy', help="Host HAProxy para pgbench (por defecto 'haproxy')")
    parser.add_argument("--haproxy-port", type=int, default=5434, help="Puerto HAProxy para pgbench")
    parser.add_argument("--rollback-threshold-percent", type=float, default=10.0, help="% de caída de TPS que activa rollback (default 10)")
    parser.add_argument("--max-lag-seconds", type=float, default=5.0, help="Segundos máximos de lag permitidos antes de rollback (default 5s)")
    parser.add_argument("--recheck-leader-each-iter", action='store_true', help="Re-detectar líder antes de cada intento (recomendado)")
    parser.add_argument("--pg-password", type=str, default=os.environ.get('PGPASSWORD', 'postgres123'), help="Contraseña para conectar a Postgres (usada por pgbench). Si no se indica, usa PGPASSWORD env o 'postgres123'.")
    parser.add_argument("--auto-init", action='store_true', help="Si se detecta que pgbench no está inicializado en la BD, ejecutar 'pgbench -i' automáticamente (modifica la BD).")
    parser.add_argument("--overwrite-results", action='store_true', help="(deprecated) kept for compatibility; no longer required.")
    parser.add_argument("--timestamp", action='store_true', help="Si se activa, los archivos de resultado incluirán un timestamp (comportamiento antiguo). Por defecto se usan nombres fijos.")
    args = parser.parse_args()

    # Establecer variables globales usadas en objective
    global GLOBAL_COMMIT, GLOBAL_MODE, GLOBAL_CLIENT_CONTAINER, GLOBAL_HAPROXY_HOST, GLOBAL_HAPROXY_PORT
    global GLOBAL_ROLLBACK_THRESHOLD_PERCENT, GLOBAL_MAX_LAG_SECONDS, GLOBAL_RECHECK_LEADER_EACH_ITER
    global BASELINE_TPS, EVALS
    GLOBAL_COMMIT = bool(args.commit and not args.dry_run)
    GLOBAL_MODE = args.mode
    GLOBAL_CLIENT_CONTAINER = args.client_container
    GLOBAL_HAPROXY_HOST = args.haproxy_host
    GLOBAL_HAPROXY_PORT = args.haproxy_port
    global GLOBAL_PG_PASSWORD
    GLOBAL_PG_PASSWORD = args.pg_password
    GLOBAL_ROLLBACK_THRESHOLD_PERCENT = args.rollback_threshold_percent
    GLOBAL_MAX_LAG_SECONDS = args.max_lag_seconds
    GLOBAL_RECHECK_LEADER_EACH_ITER = bool(args.recheck_leader_each_iter)
    global GLOBAL_AUTO_INIT
    GLOBAL_AUTO_INIT = bool(args.auto_init)
    global GLOBAL_OVERWRITE_RESULTS
    GLOBAL_OVERWRITE_RESULTS = bool(args.overwrite_results)
    global GLOBAL_USE_TIMESTAMP
    GLOBAL_USE_TIMESTAMP = bool(args.timestamp)
    BASELINE_TPS = None
    EVALS = []

    print("\n=== OPTIMIZACIÓN INTELIGENTE DE PARÁMETROS CON IA (PATRONI) ===\n")
    print(f"Modo: {GLOBAL_MODE} | dry-run: {args.dry_run} | commit: {GLOBAL_COMMIT} | n_calls: {args.n_calls}")

    # Verificar que pgbench está disponible en el modo elegido
    ok_pgbench, msg = check_pgbench_present(GLOBAL_MODE, GLOBAL_CLIENT_CONTAINER)
    if not ok_pgbench:
        print(f"[ERROR] pgbench no disponible: {msg}. Abortando.")
        return
    # Si se auto-detectó un contenedor con pgbench, 'msg' contendrá el nombre del contenedor
    if GLOBAL_MODE == 'container' and not GLOBAL_CLIENT_CONTAINER and ok_pgbench and msg:
        # msg may carry the detected container name
        GLOBAL_CLIENT_CONTAINER = msg
        print(f"[INFO] Usando contenedor detectado para pgbench: {GLOBAL_CLIENT_CONTAINER}")

    # Medir baseline (TPS actual) antes de cualquier cambio
    print("[INFO] Midiendo baseline (TPS actual) antes de cambios...")
    try:
        BASELINE_TPS = run_pgbench(mode=GLOBAL_MODE, client_container=GLOBAL_CLIENT_CONTAINER,
                                  haproxy_host=GLOBAL_HAPROXY_HOST, haproxy_port=GLOBAL_HAPROXY_PORT)
        print(f"[INFO] Baseline TPS: {BASELINE_TPS}")
    except Exception as e:
        print(f"[WARN] No se pudo medir baseline: {e}")

    # gp_minimize requires n_calls >= n_random_starts (default 10). Allow small n_calls by setting
    # n_random_starts to at most args.n_calls (and capped to 5 to keep some randomness).
    n_random_starts = min(5, max(0, args.n_calls))
    res = gp_minimize(objective, space, n_calls=args.n_calls, n_random_starts=n_random_starts, random_state=42)

    timestamp = datetime.datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    out = {
        'timestamp': timestamp,
        'best': {
            'shared_buffers': res.x[0],
            'work_mem': res.x[1],
            'max_connections': int(res.x[2]),
            'tps': -res.fun
        },
        'all': []
    }
    # Añadir baseline y path del ultimo backup si existen
    try:
        out['baseline_tps'] = globals().get('BASELINE_TPS')
        out['last_backup_path'] = globals().get('LAST_BACKUP_PATH')
    except Exception:
        pass
    # Registrar todas las evaluaciones que llevamos en EVALS
    try:
        out['all'] = EVALS
    except Exception:
        pass

    # By default write to fixed filenames so multiple runs don't create new timestamped files.
    # Set --timestamp to restore the old behavior (create new timestamped files).
    if GLOBAL_USE_TIMESTAMP:
        out_path = f"results_autotune_{timestamp}.json"
    else:
        out_path = "results_autotune.json"
    try:
        safe_out = _convert_for_json(out)
        with open(out_path, 'w', encoding='utf-8') as fh:
            json.dump(safe_out, fh, indent=2, ensure_ascii=False)
    except TypeError:
        # Fallback: coerce unknown objects to str
        with open(out_path, 'w', encoding='utf-8') as fh:
            json.dump(out, fh, indent=2, ensure_ascii=False, default=str)

    # Additionally write a human-readable summary text file including key logs
    if GLOBAL_USE_TIMESTAMP:
        summary_path = f"results_autotune_{timestamp}.txt"
    else:
        summary_path = "results_autotune.txt"
    try:
        with open(summary_path, 'w', encoding='utf-8') as sf:
            sf.write(f"Autotuning run summary\n")
            sf.write(f"Timestamp (UTC): {timestamp}\n")
            sf.write(f"Mode: {GLOBAL_MODE} | dry-run: {args.dry_run} | commit: {GLOBAL_COMMIT} | n_calls: {args.n_calls}\n\n")
            sf.write("Best configuration:\n")
            sf.write(f"  shared_buffers: {res.x[0]}\n")
            sf.write(f"  work_mem: {res.x[1]}\n")
            sf.write(f"  max_connections: {res.x[2]}\n")
            sf.write(f"  Mejor TPS: {-res.fun}\n\n")
            sf.write("All evaluated configurations (params -> TPS):\n")
            try:
                for row in out['all']:
                    score = row.get('tps', row.get('score'))
                    sf.write(f"  {row.get('params')} -> {score}\n")
            except Exception:
                sf.write("  (no detailed iteration data available)\n")
            sf.write('\n')
            sf.write(f"JSON results file: {out_path}\n")
            sf.write(f"Combined log file: auto_tuning_patroni_ia.log\n\n")
            # Append last lines of the combined log for quick context
            try:
                with open('auto_tuning_patroni_ia.log', 'r', encoding='utf-8') as lf:
                    lines = lf.readlines()
                    sf.write('--- Last 200 lines from auto_tuning_patroni_ia.log ---\n')
                    for ln in lines[-200:]:
                        sf.write(ln)
            except Exception as e:
                sf.write(f"(No se pudo leer auto_tuning_patroni_ia.log: {e})\n")
    except Exception as e:
        print(f"[WARN] No se pudo escribir el resumen de texto: {e}")
    else:
        print(f"[INFO] Resumen en texto guardado en: {summary_path}")

    print("\nMejor configuración encontrada:")
    print(f"  shared_buffers: {res.x[0]}")
    print(f"  work_mem: {res.x[1]}")
    print(f"  max_connections: {res.x[2]}")
    print(f"  Mejor TPS: {-res.fun}")
    print(f"Resultados guardados en: {out_path}")

if __name__ == "__main__":
    main()
