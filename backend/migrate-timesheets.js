const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'hris.db');
const db = new sqlite3.Database(dbPath);

// Migration to enhance timesheet functionality
const migrateDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        console.log('Starting database migration for advanced timesheets...');

        // Create projects table
        db.run(`CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_code TEXT UNIQUE NOT NULL,
          project_name TEXT NOT NULL,
          description TEXT,
          sponsor_donor TEXT NOT NULL,
          client_name TEXT,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          budget DECIMAL(12, 2),
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'on-hold', 'cancelled')),
          department TEXT,
          manager_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (manager_id) REFERENCES employees(id)
        )`);
        console.log('✓ Projects table created');

        db.all(`PRAGMA table_info(projects)`, [], (err, projectColumns) => {
          if (err) {
            console.error('Error checking projects table:', err);
            reject(err);
            return;
          }

          const projectColumnNames = projectColumns.map((c) => c.name);

          if (!projectColumnNames.includes('sponsor_donor')) {
            db.run(`ALTER TABLE projects ADD COLUMN sponsor_donor TEXT`, (alterErr) => {
              if (alterErr) {
                console.error('Error adding sponsor_donor column:', alterErr);
              } else {
                db.run(`UPDATE projects SET sponsor_donor = COALESCE(client_name, 'Unknown Sponsor/Donor') WHERE sponsor_donor IS NULL`);
                console.log('✓ Added sponsor_donor column to projects');
              }
            });
          }

          if (!projectColumnNames.includes('start_date')) {
            db.run(`ALTER TABLE projects ADD COLUMN start_date DATE`, (alterErr) => {
              if (alterErr) {
                console.error('Error adding start_date column to projects:', alterErr);
              } else {
                console.log('✓ Added start_date column to projects');
              }
            });
          }

          if (!projectColumnNames.includes('end_date')) {
            db.run(`ALTER TABLE projects ADD COLUMN end_date DATE`, (alterErr) => {
              if (alterErr) {
                console.error('Error adding end_date column to projects:', alterErr);
              } else {
                console.log('✓ Added end_date column to projects');
              }
            });
          }
        });

        // Create project assignments table
        db.run(`CREATE TABLE IF NOT EXISTS project_assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          employee_id INTEGER NOT NULL,
          role TEXT,
          allocated_hours DECIMAL(6, 2),
          start_date DATE,
          end_date DATE,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id),
          FOREIGN KEY (employee_id) REFERENCES employees(id),
          UNIQUE(project_id, employee_id, start_date)
        )`);
        console.log('✓ Project assignments table created');

        // Create work types table for configuration
        db.run(`CREATE TABLE IF NOT EXISTS work_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type_name TEXT UNIQUE NOT NULL,
          description TEXT,
          is_overtime INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('✓ Work types table created');

        // Add default work types
        const workTypes = [
          ['Regular', 'Standard working hours', 0, 1],
          ['Overtime', 'Hours beyond regular schedule', 1, 1],
          ['Remote', 'Work from home/remote location', 0, 1],
          ['On-site', 'Work at client location', 0, 1],
          ['Meeting', 'Meetings and discussions', 0, 1]
        ];

        const insertWorkType = db.prepare(`INSERT OR IGNORE INTO work_types (type_name, description, is_overtime, is_active) VALUES (?, ?, ?, ?)`);
        workTypes.forEach(wt => insertWorkType.run(wt));
        insertWorkType.finalize();
        console.log('✓ Default work types inserted');

        // Create timesheet settings table
        db.run(`CREATE TABLE IF NOT EXISTS timesheet_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          setting_key TEXT UNIQUE NOT NULL,
          setting_value TEXT NOT NULL,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('✓ Timesheet settings table created');

        // Add default settings
        const settings = [
          ['daily_hour_cap', '9.0', 'Maximum hours allowed per day'],
          ['min_increment', '0.25', 'Minimum time increment (15 minutes)'],
          ['require_project', '1', 'Require project selection (1=yes, 0=no)'],
          ['block_holiday_entry', '1', 'Block timesheet entry on holidays'],
          ['block_leave_entry', '1', 'Block timesheet entry on approved leave days'],
          ['auto_submit_weekly', '0', 'Auto-submit timesheets at end of week'],
          ['reminder_enabled', '1', 'Enable daily timesheet reminders']
        ];

        const insertSetting = db.prepare(`INSERT OR IGNORE INTO timesheet_settings (setting_key, setting_value, description) VALUES (?, ?, ?)`);
        settings.forEach(s => insertSetting.run(s));
        insertSetting.finalize();
        console.log('✓ Default settings inserted');

        // Check if timesheets table needs columns added
        db.all(`PRAGMA table_info(timesheets)`, [], (err, columns) => {
          if (err) {
            console.error('Error checking timesheets table:', err);
            reject(err);
            return;
          }

          const columnNames = columns.map(c => c.name);

          // Add new columns if they don't exist
          if (!columnNames.includes('work_type')) {
            db.run(`ALTER TABLE timesheets ADD COLUMN work_type TEXT DEFAULT 'Regular'`);
            console.log('✓ Added work_type column to timesheets');
          }

          if (!columnNames.includes('location')) {
            db.run(`ALTER TABLE timesheets ADD COLUMN location TEXT`);
            console.log('✓ Added location column to timesheets');
          }

          if (!columnNames.includes('project_id')) {
            db.run(`ALTER TABLE timesheets ADD COLUMN project_id INTEGER REFERENCES projects(id)`);
            console.log('✓ Added project_id column to timesheets');
          }

          if (!columnNames.includes('is_overtime')) {
            db.run(`ALTER TABLE timesheets ADD COLUMN is_overtime INTEGER DEFAULT 0`);
            console.log('✓ Added is_overtime column to timesheets');
          }

          if (!columnNames.includes('submitted_at')) {
            db.run(`ALTER TABLE timesheets ADD COLUMN submitted_at DATETIME`);
            console.log('✓ Added submitted_at column to timesheets');
          }

          if (!columnNames.includes('rejection_reason')) {
            db.run(`ALTER TABLE timesheets ADD COLUMN rejection_reason TEXT`);
            console.log('✓ Added rejection_reason column to timesheets');
          }
        });

        // Create indexes for better query performance
        db.run(`CREATE INDEX IF NOT EXISTS idx_timesheets_date ON timesheets(date)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_timesheets_employee_date ON timesheets(employee_id, date)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_timesheets_project ON timesheets(project_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_project_assignments_employee ON project_assignments(employee_id)`);
        console.log('✓ Indexes created');

        // Insert sample projects for testing
        const sampleProjects = [
          ['PROJ-001', 'GHSC-PSM Core Operations', 'Primary project for core PSM operations', 'USAID', 'USAID', '2024-01-01', '2025-12-31', 500000.0, 'active', 'GHSC-PSM'],
          ['PROJ-002', 'HRIS System Development', 'Development of the internal HRIS system', 'Internal', 'Internal', '2024-06-01', '2025-03-31', 150000.0, 'active', 'IT'],
          ['PROJ-003', 'Malaria Prevention Campaign', 'Malaria prevention and treatment program', 'PMI', 'PMI', '2024-01-01', '2024-12-31', 300000.0, 'active', 'Programs'],
          ['PROJ-004', 'Supply Chain Optimization', 'Optimize supply chain for medical commodities', 'USAID', 'USAID', '2024-04-01', '2025-06-30', 250000.0, 'active', 'Supply Chain'],
          ['PROJ-005', 'Staff Training Program', 'Quarterly staff training and development', 'Internal', 'Internal', '2024-01-01', '2025-12-31', 50000.0, 'active', 'HR']
        ];

        const insertProject = db.prepare(`INSERT OR IGNORE INTO projects (
          project_code, project_name, description, sponsor_donor, client_name,
          start_date, end_date, budget, status, department
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        sampleProjects.forEach(p => insertProject.run(p));
        insertProject.finalize();
        console.log('✓ Sample projects inserted');

        // Update existing timesheets to link with projects where project_code exists
        db.run(`
          UPDATE timesheets 
          SET project_id = (
            SELECT id FROM projects 
            WHERE projects.project_code = timesheets.project_code 
            LIMIT 1
          )
          WHERE project_code IS NOT NULL 
          AND project_id IS NULL
        `);
        console.log('✓ Linked existing timesheets to projects');

        console.log('═══════════════════════════════════════════════════');
        console.log('✅ Database migration completed successfully!');
        console.log('═══════════════════════════════════════════════════');
        
        resolve();
      } catch (error) {
        console.error('Migration error:', error);
        reject(error);
      }
    });
  });
};

// Run migration
migrateDatabase()
  .then(() => {
    console.log('Migration script completed. You can now restart the server.');
    db.close();
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    db.close();
    process.exit(1);
  });
