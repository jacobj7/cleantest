import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
});

type QueryResult = Record<string, unknown>;

async function query(text: string, params?: unknown[]): Promise<QueryResult[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export const prisma = {
  generation: {
    findMany: async (opts?: { where?: Record<string, unknown>; orderBy?: Record<string, string>; take?: number; skip?: number }) => {
      let sql = "SELECT * FROM generations";
      const params: unknown[] = [];
      if (opts?.where) {
        const clauses = Object.entries(opts.where).map(([k, v], i) => {
          params.push(v);
          return `${k} = $${i + 1}`;
        });
        if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
      }
      if (opts?.orderBy) {
        const [col, dir] = Object.entries(opts.orderBy)[0];
        sql += ` ORDER BY ${col} ${dir === "desc" ? "DESC" : "ASC"}`;
      }
      if (opts?.take) sql += ` LIMIT ${opts.take}`;
      if (opts?.skip) sql += ` OFFSET ${opts.skip}`;
      return query(sql, params);
    },
    findUnique: async (opts: { where: { id: string } }) => {
      const rows = await query("SELECT * FROM generations WHERE id = $1", [opts.where.id]);
      return rows[0] ?? null;
    },
    count: async (opts?: { where?: Record<string, unknown> }) => {
      let sql = "SELECT COUNT(*) FROM generations";
      const params: unknown[] = [];
      if (opts?.where) {
        const clauses = Object.entries(opts.where).map(([k, v], i) => {
          params.push(v);
          return `${k} = $${i + 1}`;
        });
        if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
      }
      const rows = await query(sql, params);
      return Number((rows[0] as { count: string }).count);
    },
  },
};

export default prisma;
