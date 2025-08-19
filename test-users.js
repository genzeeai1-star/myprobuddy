import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';

async function testUsersLoading() {
  const filePath = path.join(process.cwd(), 'data', 'users.csv');
  
  console.log('Testing users.csv loading...');
  console.log('File path:', filePath);
  console.log('File exists:', fs.existsSync(filePath));
  
  if (!fs.existsSync(filePath)) {
    console.log('Users file does not exist!');
    return;
  }
  
  const results = [];
  
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    
    stream
      .pipe(csvParser({ headers: true }))
      .on('data', (row) => {
        console.log('Raw row:', row);
        results.push(row);
      })
      .on('end', () => {
        console.log('All users loaded:', results.length);
        console.log('Users:', results);
        resolve(results);
      })
      .on('error', (error) => {
        console.error('Error reading CSV:', error);
        reject(error);
      });
  });
}

testUsersLoading().catch(console.error);
