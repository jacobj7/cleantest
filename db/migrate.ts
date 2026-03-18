import { pool } from "./index";

const CREATE_GENERATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    input_code TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'javascript',
    framework TEXT NOT NULL DEFAULT 'jest',
    description TEXT,
    generated_tests TEXT NOT NULL,
    quality_score NUMERIC(3,1),
    quality_feedback TEXT,
    model_used TEXT,
    tokens_used INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(CREATE_GENERATIONS_TABLE);
    await client.query("COMMIT");
    console.log("Migration completed successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
