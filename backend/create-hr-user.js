const bcrypt = require('bcryptjs');
const { db, runQuery, getQuery } = require('./database-improved');

async function createHRUser() {
  try {
    console.log('Creating HR user...');

    // Check if user already exists
    const existingUser = await getQuery('SELECT id FROM users WHERE username = ?', ['jkisamba']);
    if (existingUser) {
      console.log('HR user jkisamba already exists with ID:', existingUser.id);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('Juliet2024!', 10);

    // Create user
    const userResult = await runQuery(
      `INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)`,
      ['jkisamba', hashedPassword, 'jkisamba@ugandaaid.org', 'hr']
    );

    console.log('User created with ID:', userResult.lastID);

    // Create employee record
    const empResult = await runQuery(
      `INSERT INTO employees (
        user_id, employee_number, first_name, last_name, 
        email, phone, date_of_birth, hire_date, 
        position, department, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userResult.lastID,
        'EMP-HR-001',
        'Juliet',
        'Kisamba',
        'jkisamba@ugandaaid.org',
        '+256-700-000-004',
        '1985-08-15',
        '2020-03-01',
        'HR Manager',
        'Human Resources',
        'active'
      ]
    );

    console.log('Employee record created with ID:', empResult.lastID);
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ HR User Created Successfully!');
    console.log('   Username: jkisamba');
    console.log('   Password: Juliet2024!');
    console.log('   Role: hr');
    console.log('   Name: Juliet Kisamba');
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('Error creating HR user:', error);
    process.exit(1);
  }
}

createHRUser();
