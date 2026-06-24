const pool = require('../db');

async function findByEmail(email) {
  const result = await pool.query(
    'SELECT user_id, email, password_hash, role, status FROM "user" WHERE email = $1',
    [email]
  );

  return result.rows[0];
}

module.exports = { findByEmail };
