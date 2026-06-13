const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required')
}

const ssl =
  process.env.PGSSL === 'require'
    ? { rejectUnauthorized: false }
    : false

const pool = new Pool({
  connectionString,
  ssl,
})

async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  await pool.query(schema)
}

async function query(text, params) {
  return pool.query(text, params)
}

module.exports = { pool, initDb, query }
