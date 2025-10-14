const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'hris.db');
const db = new sqlite3.Database(dbPath);

async function addNewEmployees() {
  try {
    console.log('Starting to add new employees...\n');

    // Get Daniel Opuch's employee ID (supervisor)
    const danielEmployeeId = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM employees WHERE employee_id = ?`,
        ['EMP003'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.id : null);
        }
      );
    });

    if (!danielEmployeeId) {
      console.error('Error: Daniel Opuch not found in database!');
      return;
    }

    console.log(`Found Daniel Opuch with employee ID: ${danielEmployeeId}\n`);

    // 1. Create Juliet Kisamba (Human Resource Manager)
    console.log('Creating Juliet Kisamba...');
    const julietPassword = await bcrypt.hash('Juliet@2024!', 12);
    
    const julietUserId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (username, password, email, role, active) 
         VALUES (?, ?, ?, ?, ?)`,
        ['jkisamba', julietPassword, 'juliet.kisamba@ghsc-psm.org', 'manager', 1],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO employees (user_id, first_name, last_name, employee_id, department, position, hire_date, salary, status, supervisor_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [julietUserId, 'Juliet', 'Kisamba', 'EMP004', 'Human Resources', 'Human Resource Manager', '2022-01-15', 95000.00, 'active', null],
        function(err) {
          if (err) reject(err);
          else {
            console.log(`✓ Juliet Kisamba created with user ID: ${julietUserId}`);
            console.log('  Username: jkisamba | Password: Juliet@2024!\n');
            resolve();
          }
        }
      );
    });

    // 2. Create Bismark Mairura (ERP Consultant)
    console.log('Creating Bismark Mairura...');
    const bismarkPassword = await bcrypt.hash('Bismark@2024!', 12);
    
    const bismarkUserId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (username, password, email, role, active) 
         VALUES (?, ?, ?, ?, ?)`,
        ['bmairura', bismarkPassword, 'bismark.mairura@ghsc-psm.org', 'employee', 1],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO employees (user_id, first_name, last_name, employee_id, department, position, hire_date, salary, status, supervisor_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [bismarkUserId, 'Bismark', 'Mairura', 'EMP005', 'GHSC-PSM', 'ERP Consultant', '2023-03-01', 75000.00, 'active', danielEmployeeId],
        function(err) {
          if (err) reject(err);
          else {
            console.log(`✓ Bismark Mairura created with user ID: ${bismarkUserId}`);
            console.log('  Username: bmairura | Password: Bismark@2024!\n');
            resolve();
          }
        }
      );
    });

    // 3. Create Stephen Waligo (ERP Consultant)
    console.log('Creating Stephen Waligo...');
    const stephenPassword = await bcrypt.hash('Stephen@2024!', 12);
    
    const stephenUserId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (username, password, email, role, active) 
         VALUES (?, ?, ?, ?, ?)`,
        ['swaligo', stephenPassword, 'stephen.waligo@ghsc-psm.org', 'employee', 1],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO employees (user_id, first_name, last_name, employee_id, department, position, hire_date, salary, status, supervisor_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [stephenUserId, 'Stephen', 'Waligo', 'EMP006', 'GHSC-PSM', 'ERP Consultant', '2023-04-15', 75000.00, 'active', danielEmployeeId],
        function(err) {
          if (err) reject(err);
          else {
            console.log(`✓ Stephen Waligo created with user ID: ${stephenUserId}`);
            console.log('  Username: swaligo | Password: Stephen@2024!\n');
            resolve();
          }
        }
      );
    });

    // 4. Create Antony Mboya (ERP Consultant)
    console.log('Creating Antony Mboya...');
    const antonyPassword = await bcrypt.hash('Antony@2024!', 12);
    
    const antonyUserId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (username, password, email, role, active) 
         VALUES (?, ?, ?, ?, ?)`,
        ['amboya', antonyPassword, 'antony.mboya@ghsc-psm.org', 'employee', 1],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO employees (user_id, first_name, last_name, employee_id, department, position, hire_date, salary, status, supervisor_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [antonyUserId, 'Antony', 'Mboya', 'EMP007', 'GHSC-PSM', 'ERP Consultant', '2023-05-01', 75000.00, 'active', danielEmployeeId],
        function(err) {
          if (err) reject(err);
          else {
            console.log(`✓ Antony Mboya created with user ID: ${antonyUserId}`);
            console.log('  Username: amboya | Password: Antony@2024!\n');
            resolve();
          }
        }
      );
    });

    console.log('═══════════════════════════════════════════════════');
    console.log('✓ All employees created successfully!');
    console.log('═══════════════════════════════════════════════════');
    console.log('Summary of new login credentials:');
    console.log('');
    console.log('1. Juliet Kisamba (Human Resource Manager)');
    console.log('   Username: jkisamba | Password: Juliet@2024!');
    console.log('');
    console.log('2. Bismark Mairura (ERP Consultant)');
    console.log('   Username: bmairura | Password: Bismark@2024!');
    console.log('');
    console.log('3. Stephen Waligo (ERP Consultant)');
    console.log('   Username: swaligo | Password: Stephen@2024!');
    console.log('');
    console.log('4. Antony Mboya (ERP Consultant)');
    console.log('   Username: amboya | Password: Antony@2024!');
    console.log('═══════════════════════════════════════════════════');

  } catch (error) {
    console.error('Error adding employees:', error);
  } finally {
    db.close();
  }
}

// Run the script
addNewEmployees();
