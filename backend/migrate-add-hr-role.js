const fs = require('fs');
const path = require('path');

console.log('Backing up current database...');

const dbPath = path.join(__dirname, 'hris.db');
const backupPath = path.join(__dirname, `hris.db.backup.${Date.now()}`);

if (fs.existsSync(dbPath)) {
  fs.copyFileSync(dbPath, backupPath);
  console.log(`✅ Database backed up to: ${backupPath}`);
  
  // Delete the old database
  fs.unlinkSync(dbPath);
  console.log('✅ Old database removed');
} else {
  console.log('No existing database found');
}

console.log('\n📊 Database will be recreated when server starts...');
console.log('   The new database will include HR role support');
console.log('\n✅ Migration complete! Restart the backend server.\n');
