# Trabajo Final Backend (Postgres only)

Proyecto copiado y limpiado para usar únicamente PostgreSQL + Sequelize.

Instrucciones rápidas:

1. Copia `.env.example` a `.env` y ajusta `PG_URI` y `JWT_SECRET`.
2. Levanta Postgres (local o con `docker-compose up -d`).
3. Ejecuta `npm install`.
4. Ejecuta `npm run dev` o `node index.js`.
5. Poblar datos de prueba: `node seeds/seed.js`.
