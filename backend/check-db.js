const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'hris.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking database tables...\n');

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, tables) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log('Tables in database:');
  tables.forEach(t => console.log(`  - ${t.name}`));

  // Check if projects exists
  const hasProjects = tables.some(t => t.name === 'projects');
  console.log(`\nProjects table exists: ${hasProjects}`);

  if (!hasProjects) {
    console.log('\nProjects table not found. Run migrate-timesheets.js first.');
  } else {
    // Check projects structure
    db.all("PRAGMA table_info(projects)", [], (err, cols) => {
      if (err) {
        console.error('Error getting project columns:', err);
      } else {
        console.log('\nProjects table columns:');
        cols.forEach(c => console.log(`  - ${c.name} (${c.type})`));
      }

      // Check project count
      db.get("SELECT COUNT(*) as count FROM projects", [], (err, result) => {
        if (err) {
          console.error('Error counting projects:', err);
        } else {
          console.log(`\nNumber of projects: ${result.count}`);
        }
        db.close();
      });
    });
  }
});
