import bcrypt from 'bcrypt';

// Test password hashing and verification
async function testPassword() {
  const password = 'admin123'; // This should be the password
  const hashedPassword = '$2b$10$RDdAPmA7Q2s1jYMEARmv4.6aOh6rOPBM2wGCxOUA22wRF6pZE2MNK';
  
  console.log('Testing password verification...');
  console.log('Password:', password);
  console.log('Hashed:', hashedPassword);
  
  const isValid = await bcrypt.compare(password, hashedPassword);
  console.log('Is valid:', isValid);
  
  // Test with wrong password
  const wrongPassword = 'wrongpassword';
  const isWrongValid = await bcrypt.compare(wrongPassword, hashedPassword);
  console.log('Wrong password valid:', isWrongValid);
}

testPassword().catch(console.error);
