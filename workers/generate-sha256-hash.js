// Generate SHA-256 hash for admin password
import { createHash } from 'crypto';

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

const password = 'admin123';
const hash = hashPassword(password);
console.log('Password:', password);
console.log('SHA-256 hash:', hash);
console.log('\nSQL command to update:');
console.log(`UPDATE users SET hashed_password = '${hash}' WHERE email = 'admin@cyberbros.lab';`);
