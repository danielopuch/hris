const express = require('express');
const { db } = require('../database');
const { verifyToken, isManagerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all appraisals
router.get('/', verifyToken, (req, res) => {
  const query = `
    SELECT a.*, 
           e.first_name, e.last_name, e.employee_id,
           r.first_name as reviewer_first_name, r.last_name as reviewer_last_name
    FROM appraisals a
    JOIN employees e ON a.employee_id = e.id
    JOIN employees r ON a.reviewer_id = r.id
    ORDER BY a.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get appraisal by ID
router.get('/:id', verifyToken, (req, res) => {
  const query = `
    SELECT a.*, 
           e.first_name, e.last_name, e.employee_id,
           r.first_name as reviewer_first_name, r.last_name as reviewer_last_name
    FROM appraisals a
    JOIN employees e ON a.employee_id = e.id
    JOIN employees r ON a.reviewer_id = r.id
    WHERE a.id = ?
  `;

  db.get(query, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Appraisal not found' });
    }
    res.json(row);
  });
});

// Create appraisal (manager/admin only)
router.post('/', verifyToken, isManagerOrAdmin, (req, res) => {
  const {
    employee_id, review_period, performance_rating,
    goals_achieved, strengths, areas_for_improvement, comments
  } = req.body;

  if (!employee_id || !review_period) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  db.get('SELECT id FROM employees WHERE user_id = ?', [req.user.id], (err, reviewer) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const query = `
      INSERT INTO appraisals (employee_id, reviewer_id, review_period, performance_rating,
                             goals_achieved, strengths, areas_for_improvement, comments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      query,
      [employee_id, reviewer?.id, review_period, performance_rating, goals_achieved, strengths, areas_for_improvement, comments],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ id: this.lastID, message: 'Appraisal created' });
      }
    );
  });
});

// Update appraisal
router.put('/:id', verifyToken, isManagerOrAdmin, (req, res) => {
  const {
    performance_rating, goals_achieved, strengths,
    areas_for_improvement, comments, status
  } = req.body;

  const query = `
    UPDATE appraisals 
    SET performance_rating = ?, goals_achieved = ?, strengths = ?,
        areas_for_improvement = ?, comments = ?, status = ?
    WHERE id = ?
  `;

  db.run(
    query,
    [performance_rating, goals_achieved, strengths, areas_for_improvement, comments, status, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Appraisal not found' });
      }
      res.json({ message: 'Appraisal updated' });
    }
  );
});

// Complete appraisal
router.patch('/:id/complete', verifyToken, isManagerOrAdmin, (req, res) => {
  const query = `
    UPDATE appraisals 
    SET status = 'completed', completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Appraisal not found' });
    }
    res.json({ message: 'Appraisal completed' });
  });
});

module.exports = router;
