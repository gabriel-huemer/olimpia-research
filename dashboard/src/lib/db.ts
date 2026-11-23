import { Pool, PoolClient } from "pg";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      pool = new Pool({
        connectionString,
        connectionTimeoutMillis: 2500,
        max: 10,
      });
    } else {
      pool = new Pool({
        host: process.env.OTO_DB_HOST || "127.0.0.1",
        port: Number(process.env.OTO_DB_PORT || 5432),
        database: process.env.OTO_DB_NAME || "oto",
        user: process.env.OTO_DB_USER || "oto_web",
        password: process.env.OTO_DB_PASSWORD || "",
        connectionTimeoutMillis: 2500,
        max: 10,
      });
    }

    pool.on("connect", (client) => {
      client.query("SET search_path = oto, public;").catch(() => {});
    });
  }
  return pool;
}

export async function isDatabaseAvailable(): Promise<boolean> {
  if (!process.env.DATABASE_URL && !process.env.OTO_DB_PASSWORD) {
    return false;
  }
  try {
    const db = getDbPool();
    const res = await db.query("SELECT 1 FROM oto.uf LIMIT 1");
    return (res.rowCount ?? 0) >= 0;
  } catch {
    return false;
  }
}

/**
 * Executa uma transação no banco PostgreSQL definindo app.usuario_id (e opcionalmente app.dispositivo_id)
 * para que a trigger fn_auditar() registre o autor no log_auditoria conforme RF15 / README do oto-db.
 */
export async function withAuditTransaction<T>(
  usuarioId: string | null,
  fn: (client: PoolClient) => Promise<T>,
  dispositivoId?: string | null
): Promise<T> {
  const db = getDbPool();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL search_path = oto, public");
    if (usuarioId) {
      await client.query("SELECT set_config('app.usuario_id', $1, true)", [usuarioId]);
    }
    if (dispositivoId) {
      await client.query("SELECT set_config('app.dispositivo_id', $1, true)", [dispositivoId]);
    }
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Pool do papel oto_mobile: usado SOMENTE pela API de sincronização do app (menor privilégio).
// Pode ler a estrutura do formulário e inserir pesquisas/respostas, mas não vê e-mails/senhas,
// dashboards nem auditoria (ver oto-db/db/migrations/V003__permissoes.sql).
// ---------------------------------------------------------------------------
let mobilePool: Pool | null = null;

export function getMobilePool(): Pool {
  if (!mobilePool) {
    const url = process.env.OTO_MOBILE_DATABASE_URL;
    mobilePool = url
      ? new Pool({ connectionString: url, connectionTimeoutMillis: 2500, max: 10 })
      : new Pool({
          host: process.env.OTO_DB_HOST || "127.0.0.1",
          port: Number(process.env.OTO_DB_PORT || 5432),
          database: process.env.OTO_DB_NAME || "oto",
          user: "oto_mobile",
          password: process.env.OTO_MOBILE_PASSWORD || "",
          connectionTimeoutMillis: 2500,
          max: 10,
        });
    mobilePool.on("connect", (client) => {
      client.query("SET search_path = oto, public;").catch(() => {});
    });
  }
  return mobilePool;
}

/** Transação em um pool qualquer, informando o autor para a trigger de auditoria (RF15). */
export async function withTransaction<T>(
  db: Pool,
  usuarioId: string | null,
  fn: (client: PoolClient) => Promise<T>,
  dispositivoId?: string | null
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL search_path = oto, public");
    if (usuarioId) await client.query("SELECT set_config('app.usuario_id', $1, true)", [usuarioId]);
    if (dispositivoId) await client.query("SELECT set_config('app.dispositivo_id', $1, true)", [dispositivoId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
