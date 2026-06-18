const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'buildims',
  user:     process.env.DB_USER     || 'buildims',
  password: process.env.DB_PASSWORD,
  max:               20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
  query_timeout:     10000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle DB client', { error: err.message });
  process.exit(-1);
});

const query = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();

const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, getClient, withTransaction };