const express = require('express');
const { db } = require('../database');
const { verifyToken, isManagerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all leave requests
router.get('/', verifyToken, (req, res) => {
  const query = `
    SELECT l.*, 
           e.first_name, e.last_name, e.employee_id,
           s.first_name as supervisor_first_name, s.last_name as supervisor_last_name
    FROM leave_requests l
    JOIN employees e ON l.employee_id = e.id
    LEFT JOIN employees s ON l.supervisor_id = s.id
    ORDER BY l.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create leave request
router.post('/', verifyToken, (req, res) => {
  const { employee_id, leave_type, start_date, end_date, days_requested, reason } = req.body;

  if (!employee_id || !leave_type || !start_date || !end_date || !days_requested) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  const query = `
    INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, days_requested, reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [employee_id, leave_type, start_date, end_date, days_requested, reason], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ id: this.lastID, message: 'Leave request created' });
  });
});

// Update leave request (only if pending)
router.put('/:id', verifyToken, (req, res) => {
  const { leave_type, start_date, end_date, days_requested, reason } = req.body;

  const query = `
    UPDATE leave_requests 
    SET leave_type = ?, start_date = ?, end_date = ?, days_requested = ?, reason = ?
    WHERE id = ? AND status = 'pending'
  `;

  db.run(query, [leave_type, start_date, end_date, days_requested, reason, req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Leave request not found or already processed' });
    }
    res.json({ message: 'Leave request updated' });
  });
});

// Approve/reject leave request (manager/admin only)
router.patch('/:id/approve', verifyToken, isManagerOrAdmin, (req, res) => {
  const { status, comments } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.get('SELECT id FROM employees WHERE user_id = ?', [req.user.id], (err, supervisor) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const query = `
      UPDATE leave_requests 
      SET status = ?, supervisor_id = ?, comments = ?, approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(query, [status, supervisor?.id, comments, req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Leave request not found' });
      }
      res.json({ message: `Leave request ${status}` });
    });
  });
});

// Delete leave request
router.delete('/:id', verifyToken, (req, res) => {
  db.run('DELETE FROM leave_requests WHERE id = ? AND status = "pending"', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Leave request not found or cannot be deleted' });
    }
    res.json({ message: 'Leave request deleted' });
  });
});

module.exports = router;
