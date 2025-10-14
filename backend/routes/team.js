const express = require('express');
const { getQuery, allQuery } = require('../database-improved');
const { verifyToken, isManagerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get team members (for managers/admins)
router.get('/members', verifyToken, isManagerOrAdmin, async (req, res) => {
  try {
    const manager = await getQuery(
      'SELECT id FROM employees WHERE user_id = ?',
      [req.user.id]
    );

    if (!manager) {
      return res.status(404).json({ error: 'Manager profile not found' });
    }

    //Get team members reporting to this manager
    const teamMembers = await allQuery(
      `SELECT e.*, u.username, u.email, u.role, u.last_login
       FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE e.supervisor_id = ?
       ORDER BY e.last_name, e.first_name`,
      [manager.id]
    );

    res.json(teamMembers || []);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get team statistics
router.get('/stats', verifyToken, isManagerOrAdmin, async (req, res) => {
  try {
    const manager = await getQuery(
      'SELECT id FROM employees WHERE user_id = ?',
      [req.user.id]
    );

    if (!manager) {
      return res.status(404).json({ error: 'Manager profile not found' });
    }

    // Total team members
    const teamCount = await getQuery(
      'SELECT COUNT(*) as count FROM employees WHERE supervisor_id = ?',
      [manager.id]
    );

    // Pending timesheets
    const pendingTimesheets = await getQuery(
      `SELECT COUNT(*) as count FROM timesheets 
       WHERE supervisor_id = ? AND status = 'pending'`,
      [manager.id]
    );

    // Pending leave requests
    const pendingLeave = await getQuery(
      `SELECT COUNT(*) as count FROM leave_requests 
       WHERE supervisor_id = ? AND status = 'pending'`,
      [manager.id]
    );

    // Pending appraisals
    const pendingAppraisals = await getQuery(
      `SELECT COUNT(*) as count FROM appraisals 
       WHERE supervisor_id = ? AND status IN ('draft', 'submitted')`,
      [manager.id]
    );

    // Team on leave today
    const onLeaveToday = await getQuery(
      `SELECT COUNT(DISTINCT lr.employee_id) as count 
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       WHERE e.supervisor_id = ? 
       AND lr.status = 'approved'
       AND date('now') BETWEEN lr.start_date AND lr.end_date`,
      [manager.id]
    );

    // Active team members
    const activeMembers = await getQuery(
      `SELECT COUNT(*) as count FROM employees 
       WHERE supervisor_id = ? AND status = 'active'`,
      [manager.id]
    );

    res.json({
      totalMembers: teamCount?.count || 0,
      activeMembers: activeMembers?.count || 0,
      onLeaveToday: onLeaveToday?.count || 0,
      pendingTimesheets: pendingTimesheets?.count || 0,
      pendingLeave: pendingLeave?.count || 0,
      pendingAppraisals: pendingAppraisals?.count || 0,
      totalPending: (pendingTimesheets?.count || 0) + (pendingLeave?.count || 0) + (pendingAppraisals?.count || 0)
    });
  } catch (error) {
    console.error('Error fetching team stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent team activity
router.get('/activity', verifyToken, isManagerOrAdmin, async (req, res) => {
  try {
    const manager = await getQuery(
      'SELECT id FROM employees WHERE user_id = ?',
      [req.user.id]
    );

    if (!manager) {
      return res.status(404).json({ error: 'Manager profile not found' });
    }

    // Get recent timesheets
    const recentTimesheets = await allQuery(
      `SELECT t.*, e.first_name, e.last_name, 'timesheet' as type
       FROM timesheets t
       JOIN employees e ON t.employee_id = e.id
       WHERE t.supervisor_id = ?
       ORDER BY t.created_at DESC
       LIMIT 5`,
      [manager.id]
    );

    // Get recent leave requests
    const recentLeave = await allQuery(
      `SELECT lr.*, e.first_name, e.last_name, 'leave' as type
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       WHERE lr.supervisor_id = ?
       ORDER BY lr.created_at DESC
       LIMIT 5`,
      [manager.id]
    );

    // Combine and sort by date
    const allActivity = [...(recentTimesheets || []), ...(recentLeave || [])]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    res.json(allActivity);
  } catch (error) {
    console.error('Error fetching team activity:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
