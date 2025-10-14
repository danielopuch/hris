const express = require('express');
const { getQuery, runQuery, allQuery } = require('../database-improved');
const { verifyToken, isAdmin, isManagerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all holidays
router.get('/', verifyToken, async (req, res) => {
  try {
    const { year } = req.query;
    
    let query = 'SELECT * FROM holidays';
    const params = [];
    
    if (year) {
      query += ' WHERE strftime("%Y", date) = ?';
      params.push(year);
    }
    
    query += ' ORDER BY date ASC';
    
    const holidays = await allQuery(query, params);
    res.json(holidays || []);
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get holiday by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const holiday = await getQuery(
      'SELECT * FROM holidays WHERE id = ?',
      [req.params.id]
    );

    if (!holiday) {
      return res.status(404).json({ error: 'Holiday not found' });
    }

    res.json(holiday);
  } catch (error) {
    console.error('Error fetching holiday:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new holiday (Admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, date, is_recurring, description } = req.body;

    if (!name || !date) {
      return res.status(400).json({ error: 'Name and date are required' });
    }

    // Check if holiday already exists for this date
    const existing = await getQuery(
      'SELECT id FROM holidays WHERE date = ?',
      [date]
    );

    if (existing) {
      return res.status(400).json({ error: 'A holiday already exists for this date' });
    }

    const result = await runQuery(
      `INSERT INTO holidays (name, date, is_recurring, description)
       VALUES (?, ?, ?, ?)`,
      [name, date, is_recurring || 0, description || null]
    );

    const newHoliday = await getQuery(
      'SELECT * FROM holidays WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json({
      message: 'Holiday created successfully',
      holiday: newHoliday
    });
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update holiday (Admin only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, date, is_recurring, description } = req.body;

    const holiday = await getQuery(
      'SELECT * FROM holidays WHERE id = ?',
      [req.params.id]
    );

    if (!holiday) {
      return res.status(404).json({ error: 'Holiday not found' });
    }

    await runQuery(
      `UPDATE holidays 
       SET name = ?, date = ?, is_recurring = ?, description = ?
       WHERE id = ?`,
      [
        name || holiday.name,
        date || holiday.date,
        is_recurring !== undefined ? is_recurring : holiday.is_recurring,
        description !== undefined ? description : holiday.description,
        req.params.id
      ]
    );

    const updatedHoliday = await getQuery(
      'SELECT * FROM holidays WHERE id = ?',
      [req.params.id]
    );

    res.json({
      message: 'Holiday updated successfully',
      holiday: updatedHoliday
    });
  } catch (error) {
    console.error('Error updating holiday:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete holiday (Admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const holiday = await getQuery(
      'SELECT * FROM holidays WHERE id = ?',
      [req.params.id]
    );

    if (!holiday) {
      return res.status(404).json({ error: 'Holiday not found' });
    }

    await runQuery('DELETE FROM holidays WHERE id = ?', [req.params.id]);

    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get upcoming holidays
router.get('/upcoming', verifyToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const holidays = await allQuery(
      `SELECT * FROM holidays
       WHERE date >= date('now')
       AND date <= date('now', '+' || ? || ' days')
       ORDER BY date ASC`,
      [days]
    );

    res.json(holidays || []);
  } catch (error) {
    console.error('Error fetching upcoming holidays:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
