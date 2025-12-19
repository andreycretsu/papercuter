#!/usr/bin/env node

/**
 * Generate a bcrypt password hash for use with NextAuth.js
 *
 * Usage:
 *   node scripts/generate-password-hash.js <password>
 *
 * Example:
 *   node scripts/generate-password-hash.js mypassword123
 */

const bcrypt = require('bcrypt');

const password = process.argv[2];

if (!password) {
  console.error('Error: Please provide a password');
  console.log('Usage: node scripts/generate-password-hash.js <password>');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log('\nPassword hash generated:');
console.log(hash);
console.log('\nAdd this to your .env.local file:');
console.log(`PAPERCUTS_PASSWORD_HASH=${hash}`);
