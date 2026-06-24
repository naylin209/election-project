const { Pool } = require('pg');

const pool = new Pool({
  user: 'appuser',
  host: 'localhost',
  database: 'american_dream',
  password: 'student',
  port: 5432,
});

module.exports = pool;
