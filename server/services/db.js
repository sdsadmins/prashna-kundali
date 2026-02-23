/**
 * Neon Postgres connection utility for serverless environments
 */
const { neon } = require('@neondatabase/serverless');

let sql = null;

function getDb() {
  if (sql) return sql;

  const uri = process.env.DATABASE_URL;
  if (!uri) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  sql = neon(uri);
  return sql;
}

async function initDb() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS calculations (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      timestamp TEXT,
      question TEXT,
      options JSONB,
      location JSONB,
      data JSONB
    )
  `;
}

async function saveCalculation(calcData) {
  const sql = getDb();
  const { timestamp, question, options, location, ...rest } = calcData;
  await sql`
    INSERT INTO calculations (timestamp, question, options, location, data)
    VALUES (${timestamp}, ${question}, ${JSON.stringify(options)}, ${JSON.stringify(location)}, ${JSON.stringify(rest)})
  `;
}

async function getCalculations(page = 1, limit = 20) {
  const sql = getDb();
  const offset = (page - 1) * limit;

  const [countResult, rows] = await Promise.all([
    sql`SELECT COUNT(*) as total FROM calculations`,
    sql`SELECT id, created_at, timestamp, question, options, location,
         data->'calculation'->'answerOption' as answer_option,
         data->'calculation'->'answerExplanation' as answer_explanation,
         data->'lagnaInfo'->'sign' as lagna_sign
         FROM calculations ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
  ]);

  return {
    calculations: rows,
    total: parseInt(countResult[0].total),
    page,
    pages: Math.ceil(parseInt(countResult[0].total) / limit),
  };
}

async function getCalculationById(id) {
  const sql = getDb();
  const rows = await sql`SELECT * FROM calculations WHERE id = ${id}`;
  return rows[0] || null;
}

module.exports = { initDb, saveCalculation, getCalculations, getCalculationById };
