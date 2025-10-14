const express = require('express');
const router = express.Router();
const { allQuery, getQuery, runQuery } = require('../database-improved');
const { verifyToken, isManagerOrAdmin } = require('../middleware/auth');

// Helper function to get timesheet settings
const getSettings = async () => {
  const settings = await allQuery('SELECT setting_key, setting_value FROM timesheet_settings');
  return settings.reduce((acc, s) => {
    acc[s.setting_key] = s.setting_value;
    return acc;
  }, {});
};

// Helper function to validate hours increment
const validateIncrement = (hours, minIncrement) => {
  const increment = parseFloat(minIncrement);
  const remainder = hours % increment;
  return Math.abs(remainder) < 0.001 || Math.abs(remainder - increment) < 0.001;
};

// Helper function to check daily hour total
const getDailyHours = async (employeeId, date, excludeId = null) => {
  let query = `
    SELECT COALESCE(SUM(hours_worked), 0) as total
    FROM timesheets
    WHERE employee_id = ? AND date = ? AND status != 'rejected'
  `;
  const params = [employeeId, date];

  if (excludeId) {
    query += ` AND id != ?`;
    params.push(excludeId);
  }

  const result = await getQuery(query, params);
  return parseFloat(result.total) || 0;
};

// Helper function to check if date is a holiday
const isHoliday = async (date) => {
  const result = await getQuery(
    'SELECT COUNT(*) as count FROM holidays WHERE date = ? AND is_active = 1',
    [date]
  );
  return result.count > 0;
};

// Helper function to check if employee is on leave
const isOnLeave = async (employeeId, date) => {
  const result = await getQuery(`
    SELECT COUNT(*) as count FROM leave_requests
    WHERE employee_id = ? AND status = 'approved'
    AND ? BETWEEN start_date AND end_date
  `, [employeeId, date]);
  return result.count > 0;
};

// GET /api/timesheets/day-summary/:employeeId/:date - Get summary for a specific day
router.get('/day-summary/:employeeId/:date', verifyToken, async (req, res) => {
  try {
    const { employeeId, date } = req.params;
    const empId = parseInt(employeeId);

    // Check authorization
    if (req.user.role === 'employee') {
      const employee = await getQuery('SELECT user_id FROM employees WHERE id = ?', [empId]);
      if (!employee || employee.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const settings = await getSettings();
    const dailyCap = parseFloat(settings.daily_hour_cap || 9);
    const totalHours = await getDailyHours(empId, date);
    const isHol = await isHoliday(date);
    const isLeave = await isOnLeave(empId, date);

    // Get entries for the day - FIXED: Use project_code instead of project_id
    const entries = await allQuery(`
      SELECT 
        t.*,
        p.project_code,
        p.project_name
      FROM timesheets t
      LEFT JOIN projects p ON t.project_code = p.project_code
      WHERE t.employee_id = ? AND t.date = ?
      ORDER BY t.created_at ASC
    `, [empId, date]);

    res.json({
      date,
      totalHours,
      remainingHours: Math.max(0, dailyCap - totalHours),
      dailyCap,
      entries,
      isHoliday: isHol,
      isOnLeave: isLeave,
      canAddMore: totalHours < dailyCap && !isHol && !isLeave
    });
  } catch (error) {
    console.error('Error getting day summary:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// GET /api/timesheets - Get all timesheets with filters and role-based access
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, start_date, end_date, employee_id, project_code } = req.query;

    let query = `
      SELECT 
        t.*,
        e.first_name,
        e.last_name,
        e.employee_number,
        p.project_code,
        p.project_name
      FROM timesheets t
      INNER JOIN employees e ON t.employee_id = e.id
      LEFT JOIN projects p ON t.project_code = p.project_code
      WHERE 1=1
    `;

    const params = [];

    // Role-based filtering - FIXED FOR SECURITY
    if (req.user.role === 'employee') {
      // Employees only see their own timesheets
      query += ` AND e.user_id = ?`;
      params.push(req.user.id);
    } else if (req.user.role === 'manager') {
      // Managers see their team's timesheets + their own
      const manager = await getQuery('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
      if (manager) {
        query += ` AND (e.supervisor_id = ? OR e.user_id = ?)`;
        params.push(manager.id, req.user.id);
      }
    }
    // Admins and HR see all timesheets (no additional filter)

    // Additional filters
    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    if (start_date) {
      query += ` AND t.date >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND t.date <= ?`;
      params.push(end_date);
    }

    if (employee_id) {
      query += ` AND t.employee_id = ?`;
      params.push(employee_id);
    }

    if (project_code) {
      query += ` AND t.project_code = ?`;
      params.push(project_code);
    }

    query += ` ORDER BY t.date DESC, t.created_at DESC`;

    const timesheets = await allQuery(query, params);
    res.json(timesheets);
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// GET /api/timesheets/pending - Get pending timesheets for approval
router.get('/pending', verifyToken, isManagerOrAdmin, async (req, res) => {
  try {
    let query = `
      SELECT 
        t.*,
        e.first_name,
        e.last_name,
        p.project_code,
        p.project_name
      FROM timesheets t
      INNER JOIN employees e ON t.employee_id = e.id
      LEFT JOIN projects p ON t.project_code = p.project_code
      WHERE t.status = 'pending'
    `;

    const params = [];

    // Managers only see their team's pending timesheets
    if (req.user.role === 'manager') {
      const manager = await getQuery('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
      if (manager) {
        query += ` AND e.supervisor_id = ?`;
        params.push(manager.id);
      }
    }

    query += ` ORDER BY t.date DESC`;

    const pendingTimesheets = await allQuery(query, params);
    res.json(pendingTimesheets);
  } catch (error) {
    console.error('Error fetching pending timesheets:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// GET /api/timesheets/:id - Get single timesheet
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const timesheet = await getQuery(`
      SELECT 
        t.*,
        e.first_name,
        e.last_name,
        e.employee_number,
        p.project_code,
        p.project_name,
        s.first_name as supervisor_first_name,
        s.last_name as supervisor_last_name
      FROM timesheets t
      INNER JOIN employees e ON t.employee_id = e.id
      LEFT JOIN projects p ON t.project_code = p.project_code
      LEFT JOIN employees s ON t.supervisor_id = s.id
      WHERE t.id = ?
    `, [req.params.id]);

    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    // Check authorization
    if (req.user.role === 'employee') {
      const employee = await getQuery('SELECT user_id FROM employees WHERE id = ?', [timesheet.employee_id]);
      if (!employee || employee.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(timesheet);
  } catch (error) {
    console.error('Error fetching timesheet:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// POST /api/timesheets - Create new timesheet entry
router.post('/', verifyToken, async (req, res) => {
  try {
    const { employee_id, date, hours_worked, project_code, description } = req.body;

    // Validation
    if (!employee_id || !date || !hours_worked) {
      return res.status(400).json({ error: 'Missing required fields: employee_id, date, hours_worked' });
    }

    // Check authorization - employees can only create their own timesheets
    if (req.user.role === 'employee') {
      const employee = await getQuery('SELECT user_id FROM employees WHERE id = ?', [employee_id]);
      if (!employee || employee.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only create timesheets for yourself' });
      }
    }

    const settings = await getSettings();
    const dailyCap = parseFloat(settings.daily_hour_cap || 9);

    // Check daily hour cap
    const currentTotal = await getDailyHours(employee_id, date);
    if (currentTotal + parseFloat(hours_worked) > dailyCap) {
      return res.status(400).json({ 
        error: `Adding ${hours_worked} hours would exceed the daily cap of ${dailyCap} hours. Current total: ${currentTotal}` 
      });
    }

    // Check if date is a holiday
    const isHol = await isHoliday(date);
    if (isHol) {
      return res.status(400).json({ error: 'Cannot submit timesheet for a public holiday' });
    }

    // Check if employee is on leave
    const isLeave = await isOnLeave(employee_id, date);
    if (isLeave) {
      return res.status(400).json({ error: 'Cannot submit timesheet while on approved leave' });
    }

    // Insert timesheet
    const result = await runQuery(`
      INSERT INTO timesheets (employee_id, date, hours_worked, project_code, description, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `, [employee_id, date, hours_worked, project_code, description]);

    res.status(201).json({
      id: result.lastID,
      message: 'Timesheet entry created successfully',
      timesheet: {
        id: result.lastID,
        employee_id,
        date,
        hours_worked,
        project_code,
        description,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error creating timesheet:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// PUT /api/timesheets/:id - Update timesheet entry
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { hours_worked, project_code, description } = req.body;
    const timesheetId = req.params.id;

    // Get existing timesheet
    const timesheet = await getQuery('SELECT * FROM timesheets WHERE id = ?', [timesheetId]);
    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    // Only pending timesheets can be edited
    if (timesheet.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending timesheets can be edited' });
    }

    // Check authorization
    if (req.user.role === 'employee') {
      const employee = await getQuery('SELECT user_id FROM employees WHERE id = ?', [timesheet.employee_id]);
      if (!employee || employee.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Build update query
    const updates = [];
    const params = [];

    if (hours_worked !== undefined) {
      updates.push('hours_worked = ?');
      params.push(hours_worked);
    }

    if (project_code !== undefined) {
      updates.push('project_code = ?');
      params.push(project_code);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(timesheetId);

    await runQuery(`
      UPDATE timesheets 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);

    res.json({ message: 'Timesheet updated successfully' });
  } catch (error) {
    console.error('Error updating timesheet:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// DELETE /api/timesheets/:id - Delete timesheet entry
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const timesheetId = req.params.id;

    // Get existing timesheet
    const timesheet = await getQuery('SELECT * FROM timesheets WHERE id = ?', [timesheetId]);
    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    // Only pending timesheets can be deleted
    if (timesheet.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending timesheets can be deleted' });
    }

    // Check authorization
    if (req.user.role === 'employee') {
      const employee = await getQuery('SELECT user_id FROM employees WHERE id = ?', [timesheet.employee_id]);
      if (!employee || employee.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    await runQuery('DELETE FROM timesheets WHERE id = ?', [timesheetId]);

    res.json({ message: 'Timesheet deleted successfully' });
  } catch (error) {
    console.error('Error deleting timesheet:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// PATCH /api/timesheets/:id/approve - Approve or reject timesheet
router.patch('/:id/approve', verifyToken, isManagerOrAdmin, async (req, res) => {
  try {
    const { status, comments } = req.body;
    const timesheetId = req.params.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either "approved" or "rejected"' });
    }

    // Get timesheet
    const timesheet = await getQuery(`
      SELECT t.*, e.supervisor_id 
      FROM timesheets t
      INNER JOIN employees e ON t.employee_id = e.id
      WHERE t.id = ?
    `, [timesheetId]);

    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    if (timesheet.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending timesheets can be approved or rejected' });
    }

    // Get approver's employee record
    const approver = await getQuery('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
    
    // Managers can only approve their team's timesheets
    if (req.user.role === 'manager') {
      if (!approver || timesheet.supervisor_id !== approver.id) {
        return res.status(403).json({ error: 'You can only approve timesheets for your team members' });
      }
    }

    await runQuery(`
      UPDATE timesheets 
      SET status = ?, 
          supervisor_id = ?, 
          comments = ?, 
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, approver?.id, comments, timesheetId]);

    res.json({ message: `Timesheet ${status} successfully` });
  } catch (error) {
    console.error('Error approving/rejecting timesheet:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;
