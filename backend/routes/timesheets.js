const express = require('express');
const { db } = require('../database');
const { verifyToken, isManagerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all timesheets (managers see their team's, employees see their own)
router.get('/', verifyToken, (req, res) => {
  let query = `
    SELECT t.*, 
           e.first_name, e.last_name, e.employee_id,
           s.first_name as supervisor_first_name, s.last_name as supervisor_last_name
    FROM timesheets t
    JOIN employees e ON t.employee_id = e.id
    LEFT JOIN employees s ON t.supervisor_id = s.id
  `;

  const params = [];

  // Filter by status if provided
  if (req.query.status) {
    query += ' WHERE t.status = ?';
    params.push(req.query.status);
  }

  query += ' ORDER BY t.date DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create timesheet entry
router.post('/', verifyToken, (req, res) => {
  const { employee_id, date, hours_worked, project_code, description } = req.body;

  if (!employee_id || !date || !hours_worked) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  const query = `
    INSERT INTO timesheets (employee_id, date, hours_worked, project_code, description)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(query, [employee_id, date, hours_worked, project_code, description], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ id: this.lastID, message: 'Timesheet entry created' });
  });
});

// Update timesheet entry
router.put('/:id', verifyToken, (req, res) => {
  const { hours_worked, project_code, description } = req.body;

  const query = `
    UPDATE timesheets 
    SET hours_worked = ?, project_code = ?, description = ?
    WHERE id = ? AND status = 'pending'
  `;

  db.run(query, [hours_worked, project_code, description, req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Timesheet not found or already approved' });
    }
    res.json({ message: 'Timesheet updated successfully' });
  });
});

// Approve/reject timesheet (manager/admin only)
router.patch('/:id/approve', verifyToken, isManagerOrAdmin, (req, res) => {
  const { status, comments } = req.body; // status: 'approved' or 'rejected'

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Get the supervisor's employee_id from their user_id
  db.get('SELECT id FROM employees WHERE user_id = ?', [req.user.id], (err, supervisor) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const query = `
      UPDATE timesheets 
      SET status = ?, supervisor_id = ?, comments = ?, approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(query, [status, supervisor?.id, comments, req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Timesheet not found' });
      }
      res.json({ message: `Timesheet ${status}` });
    });
  });
});

// Delete timesheet entry
router.delete('/:id', verifyToken, (req, res) => {
  db.run('DELETE FROM timesheets WHERE id = ? AND status = "pending"', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Timesheet not found or cannot be deleted' });
    }
    res.json({ message: 'Timesheet deleted successfully' });
  });
});

module.exports = router;
