const express = require('express');
const { db } = require('../database');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all payroll records
router.get('/', verifyToken, (req, res) => {
  const query = `
    SELECT p.*, 
           e.first_name, e.last_name, e.employee_id, e.department
    FROM payroll p
    JOIN employees e ON p.employee_id = e.id
    ORDER BY p.pay_period_end DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get payroll by employee
router.get('/employee/:employeeId', verifyToken, (req, res) => {
  const query = `
    SELECT p.*, 
           e.first_name, e.last_name, e.employee_id, e.department
    FROM payroll p
    JOIN employees e ON p.employee_id = e.id
    WHERE p.employee_id = ?
    ORDER BY p.pay_period_end DESC
  `;

  db.all(query, [req.params.employeeId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create payroll record (admin only)
router.post('/', verifyToken, isAdmin, (req, res) => {
  const {
    employee_id, pay_period_start, pay_period_end,
    regular_hours, overtime_hours, gross_pay, deductions, net_pay
  } = req.body;

  if (!employee_id || !pay_period_start || !pay_period_end || !gross_pay || !net_pay) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  const query = `
    INSERT INTO payroll (employee_id, pay_period_start, pay_period_end,
                        regular_hours, overtime_hours, gross_pay, deductions, net_pay)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [employee_id, pay_period_start, pay_period_end, regular_hours, overtime_hours, gross_pay, deductions, net_pay],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id: this.lastID, message: 'Payroll record created' });
    }
  );
});

// Update payroll status (admin only)
router.patch('/:id/status', verifyToken, isAdmin, (req, res) => {
  const { status, payment_date } = req.body;

  if (!['pending', 'processed', 'paid'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const query = `
    UPDATE payroll 
    SET status = ?, payment_date = ?
    WHERE id = ?
  `;

  db.run(query, [status, payment_date, req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }
    res.json({ message: 'Payroll status updated' });
  });
});

// Delete payroll record (admin only)
router.delete('/:id', verifyToken, isAdmin, (req, res) => {
  db.run('DELETE FROM payroll WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }
    res.json({ message: 'Payroll record deleted' });
  });
});

module.exports = router;
