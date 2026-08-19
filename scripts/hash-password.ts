import bcrypt from 'bcryptjs';

/**
 * Generate a bcrypt hash for the admin password.
 *
 *   npm run admin:hash "your-strong-password"
 *
 * Store the printed value in Doppler as ADMIN_PASSWORD_HASH.
 */
async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error('Usage: npm run admin:hash "your-strong-password"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Please choose a password of at least 8 characters.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  console.log('\nADMIN_PASSWORD_HASH="' + hash + '"\n');
}

main();
