const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'hris.db');
const db = new sqlite3.Database(dbPath);

console.log('Starting timesheet settings and project assignments migration...');

db.serialize(() => {
  // Create timesheet_settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS timesheet_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating timesheet_settings table:', err);
    } else {
      console.log('✓ Created timesheet_settings table');
    }
  });

  // Insert default settings
  const settings = [
    ['daily_hour_cap', '9', 'Maximum hours allowed per day'],
    ['min_increment', '0.25', 'Minimum hour increment (15 minutes)'],
    ['require_project', '1', 'Require project selection (1=yes, 0=no)'],
    ['block_holiday_entry', '1', 'Block timesheet entry on public holidays (1=yes, 0=no)'],
    ['block_leave_entry', '1', 'Block timesheet entry on approved leave days (1=yes, 0=no)'],
    ['allow_overtime', '1', 'Allow overtime entries (1=yes, 0=no)'],
    ['max_overtime_per_day', '3', 'Maximum overtime hours per day'],
    ['require_location', '0', 'Require location field (1=yes, 0=no)']
  ];

  const insertSettingStmt = db.prepare(`
    INSERT OR IGNORE INTO timesheet_settings (setting_key, setting_value, description)
    VALUES (?, ?, ?)
  `);

  settings.forEach(([key, value, desc]) => {
    insertSettingStmt.run(key, value, desc, (err) => {
      if (err) {
        console.error(`Error inserting setting ${key}:`, err);
      } else {
        console.log(`✓ Inserted setting: ${key} = ${value}`);
      }
    });
  });

  insertSettingStmt.finalize();

  // Create project_assignments table
  db.run(`
    CREATE TABLE IF NOT EXISTS project_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      role TEXT,
      is_active INTEGER DEFAULT 1,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      removed_at DATETIME,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      UNIQUE(project_id, employee_id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating project_assignments table:', err);
    } else {
      console.log('✓ Created project_assignments table');
    }
  });

  // Assign all employees to all projects for now (can be refined later)
  db.all('SELECT id FROM employees', [], (err, employees) => {
    if (err) {
      console.error('Error fetching employees:', err);
      return;
    }

    db.all('SELECT id FROM projects', [], (err, projects) => {
      if (err) {
        console.error('Error fetching projects:', err);
        return;
      }

      const assignStmt = db.prepare(`
        INSERT OR IGNORE INTO project_assignments (project_id, employee_id, role, is_active)
        VALUES (?, ?, 'Team Member', 1)
      `);

      employees.forEach(emp => {
        projects.forEach(proj => {
          assignStmt.run(proj.id, emp.id, (err) => {
            if (err) {
              console.error(`Error assigning employee ${emp.id} to project ${proj.id}:`, err);
            }
          });
        });
      });

      assignStmt.finalize(() => {
        console.log(`✓ Assigned ${employees.length} employees to ${projects.length} projects`);
      });
    });
  });

  // Add additional columns to timesheets if they don't exist
  db.run(`ALTER TABLE timesheets ADD COLUMN is_overtime INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding is_overtime column:', err);
    } else if (!err) {
      console.log('✓ Added is_overtime column to timesheets');
    }
  });

  db.run(`ALTER TABLE timesheets ADD COLUMN submitted_at DATETIME`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding submitted_at column:', err);
    } else if (!err) {
      console.log('✓ Added submitted_at column to timesheets');
    }
  });

  db.run(`ALTER TABLE timesheets ADD COLUMN rejection_reason TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding rejection_reason column:', err);
    } else if (!err) {
      console.log('✓ Added rejection_reason column to timesheets');
    }
  });

  // Add project_name column to projects for easier queries
  db.run(`ALTER TABLE projects ADD COLUMN project_name TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding project_name column:', err);
    } else if (!err) {
      console.log('✓ Added project_name column to projects');
      
      // Copy name to project_name
      db.run(`UPDATE projects SET project_name = name WHERE project_name IS NULL`, (err) => {
        if (err) {
          console.error('Error updating project_name:', err);
        } else {
          console.log('✓ Updated project_name values');
        }
      });
    }
  });

  // Add project_code column to projects
  db.run(`ALTER TABLE projects ADD COLUMN project_code TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding project_code column:', err);
    } else if (!err) {
      console.log('✓ Added project_code column to projects');
      
      // Copy code to project_code
      db.run(`UPDATE projects SET project_code = code WHERE project_code IS NULL`, (err) => {
        if (err) {
          console.error('Error updating project_code:', err);
        } else {
          console.log('✓ Updated project_code values');
        }
      });
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err);
  } else {
    console.log('\n✓ Migration completed successfully!');
    console.log('Database closed.');
  }
});
