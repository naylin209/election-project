const bcrypt = require('bcrypt');
const userRepository = require('../repositories/userRepository');

async function login(email, password) {
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (user.status !== 'active') {
    throw new Error('User is not active');
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    throw new Error('Invalid credentials');
  }

  return {
    userId: user.user_id,
    role: user.role
  };
}

module.exports = { login };
