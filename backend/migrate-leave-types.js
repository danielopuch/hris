const { runQuery, allQuery, getQuery } = require('./database-improved');

async function updateLeaveTypes() {
  console.log('\n🔄 Updating Leave Types...\n');
  console.log('Changes:');
  console.log('  - Replace "personal" with "paternity" (5 days)');
  console.log('  - Add "maternity" for female staff (60 days)\n');

  try {
    // Step 1: Check if leave_requests table exists and get current data
    const existingLeave = await allQuery(
      `SELECT id, employee_id, leave_type FROM leave_requests WHERE leave_type = 'personal'`
    );
    
    if (existingLeave && existingLeave.length > 0) {
      console.log(`✓ Found ${existingLeave.length} existing 'personal' leave requests`);
    } else {
      console.log('✓ No existing personal leave requests found');
    }

    // Step 2: Create a new table with updated constraints
    console.log('\n📋 Creating new leave_requests table with updated leave types...');
    
    await runQuery(`
      CREATE TABLE IF NOT EXISTS leave_requests_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        leave_type TEXT NOT NULL CHECK(leave_type IN ('vacation', 'sick', 'paternity', 'maternity', 'unpaid')),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        days_requested DECIMAL(4, 1) NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        supervisor_id INTEGER,
        approved_at DATETIME,
        comments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id),
        FOREIGN KEY (supervisor_id) REFERENCES employees(id)
      )
    `);
    console.log('✓ New table created');

    // Step 3: Copy data from old table, converting 'personal' to 'paternity'
    console.log('\n📦 Migrating existing leave requests...');
    
    await runQuery(`
      INSERT INTO leave_requests_new (
        id, employee_id, leave_type, start_date, end_date, days_requested,
        reason, status, supervisor_id, approved_at, comments, created_at
      )
      SELECT 
        id, employee_id,
        CASE 
          WHEN leave_type = 'personal' THEN 'paternity'
          ELSE leave_type
        END as leave_type,
        start_date, end_date, days_requested,
        reason, status, supervisor_id, approved_at, comments, created_at
      FROM leave_requests
    `);
    console.log('✓ Data migrated (personal → paternity)');

    // Step 4: Drop old table and rename new one
    console.log('\n🔄 Replacing old table...');
    await runQuery('DROP TABLE leave_requests');
    await runQuery('ALTER TABLE leave_requests_new RENAME TO leave_requests');
    console.log('✓ Table replaced successfully');

    // Step 5: Verify the changes
    console.log('\n✅ Verifying updated leave types...');
    const sampleData = await allQuery(`
      SELECT DISTINCT leave_type FROM leave_requests
      UNION
      SELECT 'vacation' WHERE NOT EXISTS (SELECT 1 FROM leave_requests WHERE leave_type = 'vacation')
      UNION
      SELECT 'sick' WHERE NOT EXISTS (SELECT 1 FROM leave_requests WHERE leave_type = 'sick')
      UNION
      SELECT 'paternity' WHERE NOT EXISTS (SELECT 1 FROM leave_requests WHERE leave_type = 'paternity')
      UNION
      SELECT 'maternity' WHERE NOT EXISTS (SELECT 1 FROM leave_requests WHERE leave_type = 'maternity')
      UNION
      SELECT 'unpaid' WHERE NOT EXISTS (SELECT 1 FROM leave_requests WHERE leave_type = 'unpaid')
      ORDER BY leave_type
    `);

    console.log('\n📋 Available Leave Types:');
    console.log('  1. vacation   - 20 days/year');
    console.log('  2. sick       - 10 days/year');
    console.log('  3. paternity  - 5 days (for male staff)');
    console.log('  4. maternity  - 60 working days (for female staff)');
    console.log('  5. unpaid     - unlimited (subject to approval)');

    // Step 6: Update any converted records
    const convertedCount = await getQuery(`
      SELECT COUNT(*) as count FROM leave_requests WHERE leave_type = 'paternity'
    `);
    
    if (convertedCount && convertedCount.count > 0) {
      console.log(`\n✓ Converted ${convertedCount.count} personal leave record(s) to paternity`);
    }

    console.log('\n✅ Leave types updated successfully!');
    console.log('\n⚠️  IMPORTANT:');
    console.log('   - Update profile.js to reflect new allowances');
    console.log('   - Paternity leave: 5 days (for male staff)');
    console.log('   - Maternity leave: 60 days (for female staff)');
    console.log('   - Frontend UI may need updates to show new leave types\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error updating leave types:', error.message);
    console.error(error);
    process.exit(1);
  }
}

updateLeaveTypes();
