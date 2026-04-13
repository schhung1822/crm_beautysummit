import mysql, { Pool } from "mysql2/promise";

let pool: Pool | undefined;

export function getDB(): Pool {
  if (!pool) {
    const connectionLimit = Math.max(1, Number(process.env.DB_CONNECTION_LIMIT) || 30);
    const queueLimit = Number(process.env.DB_QUEUE_LIMIT) || 0;

    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit,
      queueLimit,
    });

    console.log("[db] mysql pool initialized", {
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
      connectionLimit,
      queueLimit,
    });
  }

  return pool;
}
