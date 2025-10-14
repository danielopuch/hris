const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hris_db',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_MAX) || 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  charset: 'utf8mb4'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database schema for MySQL
const initDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    
    try {
      // Create database if it doesn't exist
      await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await connection.execute(`USE ${dbConfig.database}`);

      // Users table for authentication
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          role ENUM('admin', 'manager', 'employee') NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_username (username),
          INDEX idx_email (email)
        ) ENGINE=InnoDB
      `);

      // Employees table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS employees (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT UNIQUE,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          employee_id VARCHAR(50) UNIQUE NOT NULL,
          department VARCHAR(255),
          position VARCHAR(255),
          supervisor_id INT,
          hire_date DATE,
          salary DECIMAL(12, 2),
          status ENUM('active', 'inactive', 'terminated') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (supervisor_id) REFERENCES employees(id) ON DELETE SET NULL,
          INDEX idx_employee_id (employee_id),
          INDEX idx_department (department),
          INDEX idx_status (status)
        ) ENGINE=InnoDB
      `);

      // Timesheets table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS timesheets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          employee_id INT NOT NULL,
          date DATE NOT NULL,
          hours_worked DECIMAL(4, 2) NOT NULL,
          project_code VARCHAR(100),
          description TEXT,
          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
          supervisor_id INT,
          approved_at TIMESTAMP NULL,
          comments TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
          FOREIGN KEY (supervisor_id) REFERENCES employees(id) ON DELETE SET NULL,
          INDEX idx_employee_date (employee_id, date),
          INDEX idx_status (status),
          INDEX idx_date (date)
        ) ENGINE=InnoDB
      `);

      // Leave requests table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS leave_requests (
          id INT AUTO_INCREMENT PRIMARY KEY,
          employee_id INT NOT NULL,
          leave_type ENUM('vacation', 'sick', 'personal', 'unpaid') NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          days_requested DECIMAL(3, 1) NOT NULL,
          reason TEXT,
          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
          supervisor_id INT,
          approved_at TIMESTAMP NULL,
          comments TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
          FOREIGN KEY (supervisor_id) REFERENCES employees(id) ON DELETE SET NULL,
          INDEX idx_employee_dates (employee_id, start_date, end_date),
          INDEX idx_status (status),
          INDEX idx_leave_type (leave_type)
        ) ENGINE=InnoDB
      `);

      // Appraisals table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS appraisals (
          id INT AUTO_INCREMENT PRIMARY KEY,
          employee_id INT NOT NULL,
          supervisor_id INT NOT NULL,
          review_period VARCHAR(50) NOT NULL,
          goals_met TEXT,
          achievements TEXT,
          areas_improvement TEXT,
          overall_rating ENUM('excellent', 'good', 'satisfactory', 'needs_improvement', 'unsatisfactory') NOT NULL,
          comments TEXT,
          status ENUM('draft', 'submitted', 'reviewed', 'final') DEFAULT 'draft',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
          FOREIGN KEY (supervisor_id) REFERENCES employees(id) ON DELETE RESTRICT,
          INDEX idx_employee_period (employee_id, review_period),
          INDEX idx_status (status),
          INDEX idx_rating (overall_rating)
        ) ENGINE=InnoDB
      `);

      // Payroll table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS payroll (
          id INT AUTO_INCREMENT PRIMARY KEY,
          employee_id INT NOT NULL,
          pay_period_start DATE NOT NULL,
          pay_period_end DATE NOT NULL,
          gross_pay DECIMAL(12, 2) NOT NULL,
          tax_deductions DECIMAL(12, 2) DEFAULT 0,
          other_deductions DECIMAL(12, 2) DEFAULT 0,
          net_pay DECIMAL(12, 2) NOT NULL,
          status ENUM('pending', 'processed', 'paid') DEFAULT 'pending',
          payment_date DATE NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
          INDEX idx_employee_period (employee_id, pay_period_start, pay_period_end),
          INDEX idx_status (status),
          INDEX idx_payment_date (payment_date)
        ) ENGINE=InnoDB
      `);

      // Create default admin user with stronger password
      const adminPassword = await bcrypt.hash('HrisAdmin2024!', 12);
      await connection.execute(
        `INSERT IGNORE INTO users (username, password, email, role) 
         VALUES (?, ?, ?, ?)`,
        ['admin', adminPassword, 'admin@hris.com', 'admin']
      );

      // Create a sample employee record for the admin
      const [adminUser] = await connection.execute(
        'SELECT id FROM users WHERE username = ?', 
        ['admin']
      );
      
      if (adminUser.length > 0) {
        await connection.execute(
          `INSERT IGNORE INTO employees (user_id, first_name, last_name, employee_id, department, position, hire_date, salary) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [adminUser[0].id, 'System', 'Administrator', 'EMP001', 'IT', 'System Administrator', '2024-01-01', 75000.00]
        );
      }

      console.log('MySQL Database initialized successfully');
      console.log('Admin credentials: admin / HrisAdmin2024!');
      
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Database query helper functions
const executeQuery = async (sql, params = []) => {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

const getConnection = async () => {
  return await pool.getConnection();
};

module.exports = { 
  pool, 
  initDatabase, 
  executeQuery, 
  getConnection 
};