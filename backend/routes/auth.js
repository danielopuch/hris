const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getQuery, runQuery } = require('../database-improved');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const user = await getQuery('SELECT * FROM users WHERE username = ? AND active = 1', [username]);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await runQuery('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    // Get employee details including first_name
    const employee = await getQuery(
      'SELECT first_name, last_name, id as employee_id FROM employees WHERE user_id = ?',
      [user.id]
    );

    // Check if user is a supervisor (has team members)
    const teamMembers = await getQuery(
      'SELECT COUNT(*) as count FROM employees WHERE supervisor_id = ?',
      [employee?.employee_id]
    );
    const isSupervisor = teamMembers && teamMembers.count > 0;

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        first_name: employee?.first_name || user.username,
        last_name: employee?.last_name || '',
        is_supervisor: isSupervisor
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Register (admin only in production, simplified for demo)
router.post('/register', async (req, res) => {
  const { username, password, email, role } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
    [username, hashedPassword, email, role || 'employee'],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Username or email already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }

      res.status(201).json({
        message: 'User registered successfully',
        userId: this.lastID
      });
    }
  );
});

module.exports = router;
