#!/bin/bash

LOG_FILE="/var/log/nginx/access.log"
BLOCK_FILE="/etc/nginx/conf.d/blocked_ips.conf"

echo "  Iniciando Guardian Anti-DDoS..."

# Monitorear el log en tiempo real
tail -n 0 -F "$LOG_FILE" | while read line; do
    
    # Si encontramos un error 503 (Límite excedido)
    if echo "$line" | grep -q " 503 "; then
        
        # Extraer la IP (es el primer dato del log)
        IP=$(echo "$line" | awk '{print $1}')
        
        # Si la IP no está bloqueada aún...
        if ! grep -q "deny $IP;" "$BLOCK_FILE"; then
            echo " ATAQUE DETECTADO: IP $IP excedió el límite."
            
            # Bloquear
            echo "deny $IP;" >> "$BLOCK_FILE"
            
            # Recargar Nginx
            nginx -s reload
            
            echo " IP $IP bloqueada exitosamente."
        fi
    fi
done