const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'hris.db');
const db = new sqlite3.Database(dbPath);

console.log('Starting payroll schema enhancement migration...\n');

db.serialize(() => {
  // Add new columns to payroll table
  const columns = [
    { name: 'month', type: 'INTEGER', check: 'CHECK(month >= 1 AND month <= 12)' },
    { name: 'year', type: 'INTEGER' },
    { name: 'base_salary', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'housing_allowance', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'transport_allowance', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'other_allowances', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'overtime_pay', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'bonuses', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'medical_reimbursement', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'other_non_taxable', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'taxable_pay', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'nssf_employee', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'nssf_employer', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'paye', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'lst', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'other_deductions', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'total_deductions', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'employer_total_cost', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'computation_date', type: 'DATETIME' },
    { name: 'payment_method', type: 'TEXT' },
    { name: 'payment_reference', type: 'TEXT' }
  ];

  columns.forEach(col => {
    const sql = `ALTER TABLE payroll ADD COLUMN ${col.name} ${col.type} ${col.check || ''}`;
    db.run(sql, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error(`Error adding column ${col.name}:`, err.message);
      } else if (!err) {
        console.log(`✓ Added column: ${col.name}`);
      }
    });
  });

  // Rename deductions to old_deductions (if exists)
  db.run(`ALTER TABLE payroll RENAME COLUMN deductions TO old_deductions`, (err) => {
    if (err && !err.message.includes('no such column')) {
      console.error('Error renaming deductions column:', err.message);
    } else if (!err) {
      console.log('✓ Renamed deductions to old_deductions');
    }
  });

  // Create payroll_history table for audit trail
  db.run(`
    CREATE TABLE IF NOT EXISTS payroll_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      old_status TEXT,
      new_status TEXT,
      changed_by INTEGER,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (payroll_id) REFERENCES payroll(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (changed_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating payroll_history table:', err);
    } else {
      console.log('✓ Created payroll_history table');
    }
  });

  // Create index on payroll for faster queries
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_payroll_employee_period 
    ON payroll(employee_id, month, year)
  `, (err) => {
    if (err) {
      console.error('Error creating index:', err);
    } else {
      console.log('✓ Created index on payroll (employee_id, month, year)');
    }
  });

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_payroll_status 
    ON payroll(status)
  `, (err) => {
    if (err) {
      console.error('Error creating status index:', err);
    } else {
      console.log('✓ Created index on payroll (status)');
    }
  });

  // Update existing payroll records with default month/year
  db.run(`
    UPDATE payroll 
    SET month = CAST(strftime('%m', created_at) AS INTEGER),
        year = CAST(strftime('%Y', created_at) AS INTEGER)
    WHERE month IS NULL AND created_at IS NOT NULL
  `, (err) => {
    if (err) {
      console.error('Error updating existing payroll records:', err);
    } else {
      console.log('✓ Updated existing payroll records with month/year');
    }
  });

  // Create payroll_settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS payroll_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating payroll_settings table:', err);
    } else {
      console.log('✓ Created payroll_settings table');
    }
  });

  // Insert default payroll settings
  const settings = [
    ['nssf_employee_rate', '0.05', 'NSSF Employee contribution rate (5%)'],
    ['nssf_employer_rate', '0.10', 'NSSF Employer contribution rate (10%)'],
    ['tax_free_allowance', '235000', 'Monthly tax-free allowance (UGX)'],
    ['housing_threshold', '0.15', 'Housing allowance taxable threshold (15%)'],
    ['lst_months', '7,8,9,10', 'Months when LST applies (July-October)'],
    ['lst_deduction_month', '8', 'Single LST deduction month (August)'],
    ['paye_band_1_max', '235000', 'PAYE Band 1 max (0% rate)'],
    ['paye_band_2_max', '335000', 'PAYE Band 2 max (10% rate)'],
    ['paye_band_3_max', '500000', 'PAYE Band 3 max (20% rate)'],
    ['paye_band_4_max', '3515000', 'PAYE Band 4 max (30% rate)'],
    ['lst_band_1_max', '2400000', 'LST Band 1 annual max (UGX 0/month)'],
    ['lst_band_2_max', '5000000', 'LST Band 2 annual max (UGX 5,000/month)'],
    ['lst_band_3_max', '10000000', 'LST Band 3 annual max (UGX 10,000/month)']
  ];

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO payroll_settings (setting_key, setting_value, description)
    VALUES (?, ?, ?)
  `);

  settings.forEach(([key, value, desc]) => {
    insertStmt.run(key, value, desc, (err) => {
      if (err) {
        console.error(`Error inserting setting ${key}:`, err);
      } else {
        console.log(`✓ Inserted setting: ${key}`);
      }
    });
  });

  insertStmt.finalize();
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err);
  } else {
    console.log('\n✅ Payroll schema enhancement completed successfully!');
    console.log('Database closed.');
  }
});
