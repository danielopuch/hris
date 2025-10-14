const express = require('express');
const { getQuery, runQuery, allQuery } = require('../database-improved');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Get current user's profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const employee = await getQuery(
      `SELECT e.*, u.username, u.email, u.role, u.last_login,
              s.first_name as supervisor_first_name, s.last_name as supervisor_last_name
       FROM employees e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN employees s ON e.supervisor_id = s.id
       WHERE e.user_id = ?`,
      [req.user.id]
    );

    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update current user's profile (self-service)
router.put('/me', verifyToken, async (req, res) => {
  try {
    const { first_name, last_name, department, position } = req.body;

    // Get current employee record
    const employee = await getQuery(
      'SELECT id FROM employees WHERE user_id = ?',
      [req.user.id]
    );

    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    // Update employee record
    await runQuery(
      `UPDATE employees 
       SET first_name = ?, last_name = ?, department = ?, position = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [first_name, last_name, department, position, employee.id]
    );

    // Get updated profile
    const updatedEmployee = await getQuery(
      `SELECT e.*, u.username, u.email, u.role
       FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE e.id = ?`,
      [employee.id]
    );

    res.json({
      message: 'Profile updated successfully',
      employee: updatedEmployee
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get leave balance for current user
router.get('/me/leave-balance', verifyToken, async (req, res) => {
  try {
    // Get employee ID
    const employee = await getQuery(
      'SELECT id FROM employees WHERE user_id = ?',
      [req.user.id]
    );

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get leave statistics
    const leaveStats = await allQuery(
      `SELECT 
         leave_type,
         COUNT(*) as total_requests,
         SUM(CASE WHEN status = 'approved' THEN days_requested ELSE 0 END) as days_used,
         SUM(CASE WHEN status = 'pending' THEN days_requested ELSE 0 END) as days_pending
       FROM leave_requests
       WHERE employee_id = ? 
         AND strftime('%Y', start_date) = strftime('%Y', 'now')
       GROUP BY leave_type`,
      [employee.id]
    );

    // Define leave allowances (can be moved to config later)
    const allowances = {
      vacation: 20,      // 20 days annual leave
      sick: 10,          // 10 days sick leave
      paternity: 5,      // 5 days paternity leave (male staff)
      maternity: 60,     // 60 working days maternity leave (female staff)
      unpaid: 999        // unlimited unpaid leave
    };

    // Calculate balances
    const balances = Object.keys(allowances).map(type => {
      const stats = leaveStats.find(s => s.leave_type === type) || {
        total_requests: 0,
        days_used: 0,
        days_pending: 0
      };

      return {
        leave_type: type,
        allowance: allowances[type],
        used: stats.days_used || 0,
        pending: stats.days_pending || 0,
        available: allowances[type] - (stats.days_used || 0) - (stats.days_pending || 0),
        total_requests: stats.total_requests || 0
      };
    });

    res.json({
      year: new Date().getFullYear(),
      balances: balances
    });
  } catch (error) {
    console.error('Error fetching leave balance:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pending approvals count for managers
router.get('/me/pending-approvals', verifyToken, async (req, res) => {
  try {
    // Only managers and admins can see pending approvals
    if (req.user.role === 'employee') {
      return res.json({
        timesheets: 0,
        leave: 0,
        appraisals: 0,
        total: 0
      });
    }

    // Get employee ID
    const employee = await getQuery(
      'SELECT id FROM employees WHERE user_id = ?',
      [req.user.id]
    );

    if (!employee) {
      return res.json({ timesheets: 0, leave: 0, appraisals: 0, total: 0 });
    }

    // Count pending timesheets
    const timesheets = await getQuery(
      `SELECT COUNT(*) as count FROM timesheets 
       WHERE supervisor_id = ? AND status = 'pending'`,
      [employee.id]
    );

    // Count pending leave requests
    const leave = await getQuery(
      `SELECT COUNT(*) as count FROM leave_requests 
       WHERE supervisor_id = ? AND status = 'pending'`,
      [employee.id]
    );

    // Count draft/submitted appraisals
    const appraisals = await getQuery(
      `SELECT COUNT(*) as count FROM appraisals 
       WHERE supervisor_id = ? AND status IN ('draft', 'submitted')`,
      [employee.id]
    );

    const counts = {
      timesheets: timesheets?.count || 0,
      leave: leave?.count || 0,
      appraisals: appraisals?.count || 0,
      total: (timesheets?.count || 0) + (leave?.count || 0) + (appraisals?.count || 0)
    };

    res.json(counts);
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent activity
router.get('/me/activity', verifyToken, async (req, res) => {
  try {
    const employee = await getQuery(
      'SELECT id FROM employees WHERE user_id = ?',
      [req.user.id]
    );

    if (!employee) {
      return res.json([]);
    }

    const activities = [];

    // Recent timesheets
    const timesheets = await allQuery(
      `SELECT 'timesheet' as type, date, status, created_at 
       FROM timesheets 
       WHERE employee_id = ? 
       ORDER BY created_at DESC LIMIT 5`,
      [employee.id]
    );
    activities.push(...timesheets);

    // Recent leave requests
    const leave = await allQuery(
      `SELECT 'leave' as type, start_date as date, status, created_at 
       FROM leave_requests 
       WHERE employee_id = ? 
       ORDER BY created_at DESC LIMIT 5`,
      [employee.id]
    );
    activities.push(...leave);

    // Sort by created_at
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(activities.slice(0, 10));
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;