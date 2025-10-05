const express = require('express');
const { db } = require('../database');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all employees
router.get('/', verifyToken, (req, res) => {
  const query = `
    SELECT e.*, u.username, u.email, u.role,
           s.first_name as supervisor_first_name, 
           s.last_name as supervisor_last_name
    FROM employees e
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN employees s ON e.supervisor_id = s.id
    ORDER BY e.last_name, e.first_name
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get employee by ID
router.get('/:id', verifyToken, (req, res) => {
  const query = `
    SELECT e.*, u.username, u.email, u.role,
           s.first_name as supervisor_first_name, 
           s.last_name as supervisor_last_name
    FROM employees e
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN employees s ON e.supervisor_id = s.id
    WHERE e.id = ?
  `;

  db.get(query, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(row);
  });
});

// Create employee
router.post('/', verifyToken, isAdmin, (req, res) => {
  const {
    user_id, first_name, last_name, employee_id, department,
    position, supervisor_id, hire_date, salary
  } = req.body;

  if (!first_name || !last_name || !employee_id) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  const query = `
    INSERT INTO employees (user_id, first_name, last_name, employee_id, 
                          department, position, supervisor_id, hire_date, salary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [user_id, first_name, last_name, employee_id, department, position, supervisor_id, hire_date, salary],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id: this.lastID, message: 'Employee created successfully' });
    }
  );
});

// Update employee
router.put('/:id', verifyToken, isAdmin, (req, res) => {
  const {
    first_name, last_name, department, position,
    supervisor_id, salary, status
  } = req.body;

  const query = `
    UPDATE employees 
    SET first_name = ?, last_name = ?, department = ?, position = ?,
        supervisor_id = ?, salary = ?, status = ?
    WHERE id = ?
  `;

  db.run(
    query,
    [first_name, last_name, department, position, supervisor_id, salary, status, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      res.json({ message: 'Employee updated successfully' });
    }
  );
});

module.exports = router;
