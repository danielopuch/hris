const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'hris.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema
const initDatabase = () => {
  db.serialize(() => {
    // Users table for authentication
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'employee')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Employees table
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
      days_requested DECIMAL(4, 1) NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      supervisor_id INTEGER,
      approved_at DATETIME,
      comments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (supervisor_id) REFERENCES employees(id)
    )`);

    // Appraisals table
    db.run(`CREATE TABLE IF NOT EXISTS appraisals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      review_period TEXT NOT NULL,
      performance_rating INTEGER CHECK(performance_rating BETWEEN 1 AND 5),
      goals_achieved TEXT,
      strengths TEXT,
      areas_for_improvement TEXT,
      comments TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'completed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (reviewer_id) REFERENCES employees(id)
    )`);

    // Payroll table
    db.run(`CREATE TABLE IF NOT EXISTS payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      pay_period_start DATE NOT NULL,
      pay_period_end DATE NOT NULL,
      regular_hours DECIMAL(6, 2),
      overtime_hours DECIMAL(6, 2),
      gross_pay DECIMAL(10, 2) NOT NULL,
      deductions DECIMAL(10, 2) DEFAULT 0,
      net_pay DECIMAL(10, 2) NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processed', 'paid')),
      payment_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )`);

    // Create default admin user
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(
      `INSERT OR IGNORE INTO users (username, password, email, role) 
       VALUES (?, ?, ?, ?)`,
      ['admin', adminPassword, 'admin@hris.com', 'admin']
    );

    console.log('Database initialized successfully');
  });
};

module.exports = { db, initDatabase };
