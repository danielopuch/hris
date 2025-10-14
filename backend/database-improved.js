const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'hris.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema with improved security
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        // Users table for authentication
        db.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          role TEXT DEFAULT 'employee' CHECK(role IN ('employee', 'manager', 'admin', 'hr')),
          active INTEGER DEFAULT 1,
          last_login DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Projects table
        db.run(`CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_code TEXT UNIQUE NOT NULL,
          project_name TEXT NOT NULL,
          description TEXT,
          sponsor_donor TEXT,
          client_name TEXT,
          start_date DATE,
          end_date DATE,
          budget DECIMAL(12, 2),
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'on-hold', 'cancelled')),
          department TEXT,
          manager_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (manager_id) REFERENCES employees(id)
        )`);
        // Employees table

        db.all(`PRAGMA table_info(projects)`, [], (err, projectColumns) => {
          if (err) {
            console.error('Error inspecting projects table:', err);
          } else {
            const projectColumnNames = projectColumns.map((c) => c.name);

            if (!projectColumnNames.includes('sponsor_donor')) {
              db.run(`ALTER TABLE projects ADD COLUMN sponsor_donor TEXT`, (alterErr) => {
                if (alterErr) {
                  console.error('Error adding sponsor_donor column to projects:', alterErr);
                } else {
                  db.run(`UPDATE projects SET sponsor_donor = COALESCE(client_name, 'Unknown Sponsor/Donor') WHERE sponsor_donor IS NULL`);
                  console.log('✓ Added sponsor_donor column to projects');
                }
              });
            }

            if (!projectColumnNames.includes('start_date') || !projectColumnNames.includes('end_date')) {
              console.warn('⚠ Projects table missing start_date or end_date columns. Please run migrations to ensure compliance.');
            }
          }
        });
        db.run(`CREATE TABLE IF NOT EXISTS employees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          employee_id TEXT UNIQUE NOT NULL,
          department TEXT,
          position TEXT,
          supervisor_id INTEGER,
          hire_date DATE,
          salary DECIMAL(10, 2),
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'terminated')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (supervisor_id) REFERENCES employees(id)
        )`);

        // Timesheets table
        db.run(`CREATE TABLE IF NOT EXISTS timesheets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id INTEGER NOT NULL,
          date DATE NOT NULL,
          hours_worked DECIMAL(4, 2) NOT NULL,
          project_code TEXT,
          description TEXT,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
          supervisor_id INTEGER,
          approved_at DATETIME,
          comments TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (employee_id) REFERENCES employees(id),
          FOREIGN KEY (supervisor_id) REFERENCES employees(id)
        )`);

        // Leave requests table
        db.run(`CREATE TABLE IF NOT EXISTS leave_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id INTEGER NOT NULL,
          leave_type TEXT NOT NULL CHECK(leave_type IN ('vacation', 'sick', 'personal', 'unpaid')),
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          days_requested DECIMAL(3, 1) NOT NULL,
          reason TEXT,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
          supervisor_id INTEGER,
          approved_at DATETIME,
          comments TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (employee_id) REFERENCES employees(id),
          FOREIGN KEY (supervisor_id) REFERENCES employees(id)
        )`);

        // Appraisals table
        db.run(`CREATE TABLE IF NOT EXISTS appraisals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id INTEGER NOT NULL,
          supervisor_id INTEGER NOT NULL,
          review_period TEXT NOT NULL,
          goals_met TEXT,
          achievements TEXT,
          areas_improvement TEXT,
          overall_rating TEXT NOT NULL CHECK(overall_rating IN ('excellent', 'good', 'satisfactory', 'needs_improvement', 'unsatisfactory')),
          comments TEXT,
          status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'reviewed', 'final')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (employee_id) REFERENCES employees(id),
          FOREIGN KEY (supervisor_id) REFERENCES employees(id)
        )`);

        // Payroll table
        db.run(`CREATE TABLE IF NOT EXISTS payroll (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id INTEGER NOT NULL,
          pay_period_start DATE NOT NULL,
          pay_period_end DATE NOT NULL,
          gross_pay DECIMAL(10, 2) NOT NULL,
          tax_deductions DECIMAL(10, 2) DEFAULT 0,
          other_deductions DECIMAL(10, 2) DEFAULT 0,
          net_pay DECIMAL(10, 2) NOT NULL,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processed', 'paid')),
          payment_date DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (employee_id) REFERENCES employees(id)
        )`);

        // Holidays table for public holidays
        db.run(`CREATE TABLE IF NOT EXISTS holidays (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          date DATE NOT NULL UNIQUE,
          is_recurring INTEGER DEFAULT 0,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date)`);

        // Clear existing users and create demo users
        db.run(`DELETE FROM users`, async (err) => {
          if (err) {
            console.error('Error clearing users:', err);
          }

          try {
            // Create admin user
            const adminPassword = await bcrypt.hash('HrisAdmin2024!', 12);
            
            db.run(
              `INSERT INTO users (username, password, email, role, active) 
               VALUES (?, ?, ?, ?, ?)`,
              ['admin', adminPassword, 'admin@hris.com', 'admin', 1],
              async function(err) {
                if (err) {
                  console.error('Error creating admin user:', err);
                  reject(err);
                  return;
                }
                
                const adminUserId = this.lastID;
                console.log('Admin user created with ID:', adminUserId);
                
                // Create Martin Howera (Country Director - Supervisor)
                const martinPassword = await bcrypt.hash('Martin2024!', 12);
                db.run(
                  `INSERT INTO users (username, password, email, role, active) 
                   VALUES (?, ?, ?, ?, ?)`,
                  ['mhowera', martinPassword, 'martin.howera@ghsc-psm.org', 'manager', 1],
                  async function(err) {
                    if (err) {
                      console.error('Error creating Martin user:', err);
                      return;
                    }
                    
                    const martinUserId = this.lastID;
                    console.log('Martin Howera user created with ID:', martinUserId);
                    
                    // Create Daniel Opuch (Systems Support Manager)
                    const danielPassword = await bcrypt.hash('Daniel2024!', 12);
                    db.run(
                      `INSERT INTO users (username, password, email, role, active) 
                       VALUES (?, ?, ?, ?, ?)`,
                      ['dopuch', danielPassword, 'daniel.opuch@ghsc-psm.org', 'employee', 1],
                      function(err) {
                        if (err) {
                          console.error('Error creating Daniel user:', err);
                          return;
                        }
                        
                        const danielUserId = this.lastID;
                        console.log('Daniel Opuch user created with ID:', danielUserId);
                        
                        // Create employee records
                        // Admin employee record
                        db.run(
                          `INSERT OR REPLACE INTO employees (user_id, first_name, last_name, employee_id, department, position, hire_date, salary, status) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                          [adminUserId, 'System', 'Administrator', 'EMP001', 'IT', 'System Administrator', '2024-01-01', 75000.00, 'active']
                        );
                        
                        // Martin Howera employee record
                        db.run(
                          `INSERT OR REPLACE INTO employees (user_id, first_name, last_name, employee_id, department, position, hire_date, salary, status, supervisor_id) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                          [martinUserId, 'Martin', 'Howera', 'EMP002', 'GHSC-PSM', 'Country Director', '2020-03-15', 125000.00, 'active', null],
                          function(err) {
                            if (err) {
                              console.error('Error creating Martin employee:', err);
                              return;
                            }
                            
                            const martinEmployeeId = this.lastID;
                            
                            // Daniel Opuch employee record (reports to Martin)
                            db.run(
                              `INSERT OR REPLACE INTO employees (user_id, first_name, last_name, employee_id, department, position, hire_date, salary, status, supervisor_id) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                              [danielUserId, 'Daniel', 'Opuch', 'EMP003', 'GHSC-PSM', 'Systems Support Manager', '2021-06-01', 85000.00, 'active', martinEmployeeId],
                              (err) => {
                                if (err) {
                                  console.error('Error creating Daniel employee:', err);
                                }
                              }
                            );
                          }
                        );
                        
                        console.log('Database initialized successfully');
                        console.log('═══════════════════════════════════════════════════');
                        console.log('🔐 DEMO CREDENTIALS:');
                        console.log('   Admin:');
                        console.log('     Username: admin | Password: HrisAdmin2024!');
                        console.log('   Martin Howera (Country Director):');
                        console.log('     Username: mhowera | Password: Martin2024!');
                        console.log('   Daniel Opuch (Systems Support Manager):');
                        console.log('     Username: dopuch | Password: Daniel2024!');
                        console.log('═══════════════════════════════════════════════════');
                        resolve();
                      }
                    );
                  }
                );
              }
            );
          } catch (error) {
            console.error('Error creating users:', error);
            reject(error);
          }
        });

      } catch (error) {
        console.error('Database initialization error:', error);
        reject(error);
      }
    });
  });
};

// Database query helpers
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = { 
  db, 
  initDatabase, 
  runQuery, 
  getQuery, 
  allQuery 
};