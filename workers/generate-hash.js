import bcrypt from 'bcryptjs';

const password = 'admin123';
const hash = await bcrypt.hash(password, 10);
console.log('Password hash:', hash);
console.log('\nSQL command to update:');
console.log(`UPDATE users SET hashed_password = '${hash}' WHERE email = 'admin@cyberbros.lab';`);
