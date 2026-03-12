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

let dbInitialized = false;

async function initDb() {
  if (dbInitialized) return;
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
  dbInitialized = true;
}

async function saveCalculation(calcData) {
  const sql = getDb();
  const { timestamp, question, options, location, ...rest } = calcData;
  await sql`
    INSERT INTO calculations (timestamp, question, options, location, data)
    VALUES (${timestamp}, ${question}, ${options ? JSON.stringify(options) : null}, ${JSON.stringify(location || {})}, ${JSON.stringify(rest)})
  `;
}

async function getCalculations(page = 1, limit = 20, modeFilter = null) {
  const sql = getDb();
  const offset = (page - 1) * limit;

  if (modeFilter) {
    const [countResult, rows] = await Promise.all([
      sql`SELECT COUNT(*) as total FROM calculations WHERE data->>'mode' = ${modeFilter}`,
      sql`SELECT id, created_at, timestamp, question, options, location,
           data->>'mode' as mode,
           data->'calculation'->'answerOption' as answer_option,
           data->'calculation'->'answerExplanation' as answer_explanation,
           data->'lagnaInfo'->'sign' as lagna_sign,
           data->>'questionCategory' as question_category,
           data->>'kpQuestionType' as kp_question_type,
           data->'yesNo'->>'verdict' as kp_verdict,
           data->'subEntry'->>'number' as horary_number
           FROM calculations WHERE data->>'mode' = ${modeFilter} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    ]);
    return {
      calculations: rows,
      total: parseInt(countResult[0].total),
      page,
      pages: Math.ceil(parseInt(countResult[0].total) / limit),
    };
  }

  const [countResult, rows] = await Promise.all([
    sql`SELECT COUNT(*) as total FROM calculations`,
    sql`SELECT id, created_at, timestamp, question, options, location,
         data->>'mode' as mode,
         data->'calculation'->'answerOption' as answer_option,
         data->'calculation'->'answerExplanation' as answer_explanation,
         data->'lagnaInfo'->'sign' as lagna_sign,
         data->>'questionCategory' as question_category,
         data->>'kpQuestionType' as kp_question_type,
         data->'yesNo'->>'verdict' as kp_verdict,
         data->'subEntry'->>'number' as horary_number
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

async function deleteCalculation(id) {
  const sql = getDb();
  await sql`DELETE FROM calculations WHERE id = ${id}`;
}

module.exports = { initDb, saveCalculation, getCalculations, getCalculationById, deleteCalculation };
