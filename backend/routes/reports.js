const express = require('express');
const router = express.Router();
const db = require('../database-improved');
const { verifyToken, isManagerOrAdmin } = require('../middleware/auth');

// All reports routes require manager or admin role
router.use(verifyToken, isManagerOrAdmin);

// Get timesheet report with filters
router.get('/timesheets', async (req, res) => {
  try {
    const { startDate, endDate, employeeId, status, projectCode } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT 
        t.id,
        t.date,
        t.hours_worked,
        t.project_code,
        t.description,
        t.status,
        t.created_at,
        t.updated_at,
        e.employee_id,
        e.first_name,
        e.last_name,
        e.department,
        e.position
      FROM timesheets t
      JOIN employees e ON t.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    // If not admin, only show own team's data
    if (userRole === 'manager') {
      query += ` AND e.supervisor_id = ?`;
      params.push(userId);
    }

    if (startDate) {
      query += ` AND t.date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND t.date <= ?`;
      params.push(endDate);
    }

    if (employeeId) {
      query += ` AND t.employee_id = ?`;
      params.push(employeeId);
    }

    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    if (projectCode) {
      query += ` AND t.project_code LIKE ?`;
      params.push(`%${projectCode}%`);
    }

    query += ` ORDER BY t.date DESC, t.created_at DESC`;

    const timesheets = await db.all(query, params);

    // Calculate summary statistics
    const totalHours = timesheets.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
    const approvedHours = timesheets
      .filter(t => t.status === 'approved')
      .reduce((sum, t) => sum + (t.hours_worked || 0), 0);
    const pendingHours = timesheets
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + (t.hours_worked || 0), 0);

    // Group by employee
    const byEmployee = timesheets.reduce((acc, t) => {
      const key = t.employee_id;
      if (!acc[key]) {
        acc[key] = {
          employeeId: t.employee_id,
          name: `${t.first_name} ${t.last_name}`,
          department: t.department,
          position: t.position,
          totalHours: 0,
          entries: 0
        };
      }
      acc[key].totalHours += t.hours_worked || 0;
      acc[key].entries += 1;
      return acc;
    }, {});

    // Group by project
    const byProject = timesheets.reduce((acc, t) => {
      const key = t.project_code || 'No Project';
      if (!acc[key]) {
        acc[key] = {
          projectCode: key,
          totalHours: 0,
          entries: 0
        };
      }
      acc[key].totalHours += t.hours_worked || 0;
      acc[key].entries += 1;
      return acc;
    }, {});

    // Group by status
    const byStatus = timesheets.reduce((acc, t) => {
      const key = t.status;
      if (!acc[key]) {
        acc[key] = { status: key, count: 0, hours: 0 };
      }
      acc[key].count += 1;
      acc[key].hours += t.hours_worked || 0;
      return acc;
    }, {});

    res.json({
      timesheets,
      summary: {
        totalEntries: timesheets.length,
        totalHours,
        approvedHours,
        pendingHours,
        averageHoursPerEntry: timesheets.length > 0 ? (totalHours / timesheets.length).toFixed(2) : 0
      },
      byEmployee: Object.values(byEmployee),
      byProject: Object.values(byProject),
      byStatus: Object.values(byStatus)
    });
  } catch (error) {
    console.error('Error generating timesheet report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Get leave report with filters
router.get('/leave', async (req, res) => {
  try {
    const { startDate, endDate, employeeId, leaveType, status } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT 
        l.id,
        l.start_date,
        l.end_date,
        l.leave_type,
        l.reason,
        l.status,
        l.days_requested,
        l.created_at,
        l.updated_at,
        e.employee_id,
        e.first_name,
        e.last_name,
        e.department,
        e.position
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    // If not admin, only show own team's data
    if (userRole === 'manager') {
      query += ` AND e.supervisor_id = ?`;
      params.push(userId);
    }

    if (startDate) {
      query += ` AND l.start_date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND l.end_date <= ?`;
      params.push(endDate);
    }

    if (employeeId) {
      query += ` AND l.employee_id = ?`;
      params.push(employeeId);
    }

    if (leaveType) {
      query += ` AND l.leave_type = ?`;
      params.push(leaveType);
    }

    if (status) {
      query += ` AND l.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY l.start_date DESC, l.created_at DESC`;

    const leaveRequests = await db.all(query, params);

    // Calculate summary statistics
    const totalDays = leaveRequests.reduce((sum, l) => sum + (l.days_requested || 0), 0);
    const approvedDays = leaveRequests
      .filter(l => l.status === 'approved')
      .reduce((sum, l) => sum + (l.days_requested || 0), 0);
    const pendingDays = leaveRequests
      .filter(l => l.status === 'pending')
      .reduce((sum, l) => sum + (l.days_requested || 0), 0);

    // Group by employee
    const byEmployee = leaveRequests.reduce((acc, l) => {
      const key = l.employee_id;
      if (!acc[key]) {
        acc[key] = {
          employeeId: l.employee_id,
          name: `${l.first_name} ${l.last_name}`,
          department: l.department,
          position: l.position,
          totalDays: 0,
          requests: 0
        };
      }
      acc[key].totalDays += l.days_requested || 0;
      acc[key].requests += 1;
      return acc;
    }, {});

    // Group by leave type
    const byLeaveType = leaveRequests.reduce((acc, l) => {
      const key = l.leave_type;
      if (!acc[key]) {
        acc[key] = {
          leaveType: key,
          totalDays: 0,
          requests: 0
        };
      }
      acc[key].totalDays += l.days_requested || 0;
      acc[key].requests += 1;
      return acc;
    }, {});

    // Group by status
    const byStatus = leaveRequests.reduce((acc, l) => {
      const key = l.status;
      if (!acc[key]) {
        acc[key] = { status: key, count: 0, days: 0 };
      }
      acc[key].count += 1;
      acc[key].days += l.days_requested || 0;
      return acc;
    }, {});

    res.json({
      leaveRequests,
      summary: {
        totalRequests: leaveRequests.length,
        totalDays,
        approvedDays,
        pendingDays,
        averageDaysPerRequest: leaveRequests.length > 0 ? (totalDays / leaveRequests.length).toFixed(2) : 0
      },
      byEmployee: Object.values(byEmployee),
      byLeaveType: Object.values(byLeaveType),
      byStatus: Object.values(byStatus)
    });
  } catch (error) {
    console.error('Error generating leave report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Get payroll report with filters
router.get('/payroll', async (req, res) => {
  try {
    const { startDate, endDate, employeeId, status } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT 
        p.id,
        p.pay_period_start,
        p.pay_period_end,
        p.basic_salary,
        p.allowances,
        p.deductions,
        p.gross_pay,
        p.net_pay,
        p.status,
        p.created_at,
        p.updated_at,
        e.employee_id,
        e.first_name,
        e.last_name,
        e.department,
        e.position
      FROM payroll p
      JOIN employees e ON p.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    // If not admin, only show own team's data
    if (userRole === 'manager') {
      query += ` AND e.supervisor_id = ?`;
      params.push(userId);
    }

    if (startDate) {
      query += ` AND p.pay_period_start >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND p.pay_period_end <= ?`;
      params.push(endDate);
    }

    if (employeeId) {
      query += ` AND p.employee_id = ?`;
      params.push(employeeId);
    }

    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY p.pay_period_start DESC, p.created_at DESC`;

    const payrollRecords = await db.all(query, params);

    // Calculate summary statistics
    const totalGrossPay = payrollRecords.reduce((sum, p) => sum + (parseFloat(p.gross_pay) || 0), 0);
    const totalNetPay = payrollRecords.reduce((sum, p) => sum + (parseFloat(p.net_pay) || 0), 0);
    const totalAllowances = payrollRecords.reduce((sum, p) => sum + (parseFloat(p.allowances) || 0), 0);
    const totalDeductions = payrollRecords.reduce((sum, p) => sum + (parseFloat(p.deductions) || 0), 0);

    // Group by employee
    const byEmployee = payrollRecords.reduce((acc, p) => {
      const key = p.employee_id;
      if (!acc[key]) {
        acc[key] = {
          employeeId: p.employee_id,
          name: `${p.first_name} ${p.last_name}`,
          department: p.department,
          position: p.position,
          totalGrossPay: 0,
          totalNetPay: 0,
          records: 0
        };
      }
      acc[key].totalGrossPay += parseFloat(p.gross_pay) || 0;
      acc[key].totalNetPay += parseFloat(p.net_pay) || 0;
      acc[key].records += 1;
      return acc;
    }, {});

    // Group by status
    const byStatus = payrollRecords.reduce((acc, p) => {
      const key = p.status;
      if (!acc[key]) {
        acc[key] = { status: key, count: 0, grossPay: 0, netPay: 0 };
      }
      acc[key].count += 1;
      acc[key].grossPay += parseFloat(p.gross_pay) || 0;
      acc[key].netPay += parseFloat(p.net_pay) || 0;
      return acc;
    }, {});

    res.json({
      payrollRecords,
      summary: {
        totalRecords: payrollRecords.length,
        totalGrossPay: totalGrossPay.toFixed(2),
        totalNetPay: totalNetPay.toFixed(2),
        totalAllowances: totalAllowances.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
        averageGrossPay: payrollRecords.length > 0 ? (totalGrossPay / payrollRecords.length).toFixed(2) : 0,
        averageNetPay: payrollRecords.length > 0 ? (totalNetPay / payrollRecords.length).toFixed(2) : 0
      },
      byEmployee: Object.values(byEmployee).map(e => ({
        ...e,
        totalGrossPay: e.totalGrossPay.toFixed(2),
        totalNetPay: e.totalNetPay.toFixed(2)
      })),
      byStatus: Object.values(byStatus).map(s => ({
        ...s,
        grossPay: s.grossPay.toFixed(2),
        netPay: s.netPay.toFixed(2)
      }))
    });
  } catch (error) {
    console.error('Error generating payroll report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Get appraisal report with filters
router.get('/appraisals', async (req, res) => {
  try {
    const { startDate, endDate, employeeId, status } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT 
        a.id,
        a.review_period,
        a.performance_score,
        a.strengths,
        a.areas_for_improvement,
        a.goals,
        a.reviewer_comments,
        a.status,
        a.created_at,
        a.updated_at,
        e.employee_id,
        e.first_name,
        e.last_name,
        e.department,
        e.position
      FROM appraisals a
      JOIN employees e ON a.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    // If not admin, only show own team's data
    if (userRole === 'manager') {
      query += ` AND e.supervisor_id = ?`;
      params.push(userId);
    }

    if (startDate) {
      query += ` AND a.review_period >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND a.review_period <= ?`;
      params.push(endDate);
    }

    if (employeeId) {
      query += ` AND a.employee_id = ?`;
      params.push(employeeId);
    }

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY a.review_period DESC, a.created_at DESC`;

    const appraisals = await db.all(query, params);

    // Calculate summary statistics
    const totalScore = appraisals.reduce((sum, a) => sum + (parseFloat(a.performance_score) || 0), 0);
    const averageScore = appraisals.length > 0 ? (totalScore / appraisals.length).toFixed(2) : 0;

    // Group by employee
    const byEmployee = appraisals.reduce((acc, a) => {
      const key = a.employee_id;
      if (!acc[key]) {
        acc[key] = {
          employeeId: a.employee_id,
          name: `${a.first_name} ${a.last_name}`,
          department: a.department,
          position: a.position,
          averageScore: 0,
          totalScore: 0,
          reviews: 0
        };
      }
      acc[key].totalScore += parseFloat(a.performance_score) || 0;
      acc[key].reviews += 1;
      return acc;
    }, {});

    // Calculate average for each employee
    Object.values(byEmployee).forEach(emp => {
      emp.averageScore = emp.reviews > 0 ? (emp.totalScore / emp.reviews).toFixed(2) : 0;
    });

    // Group by score ranges
    const scoreRanges = {
      excellent: { range: '9-10', count: 0 },
      good: { range: '7-8.9', count: 0 },
      satisfactory: { range: '5-6.9', count: 0 },
      needsImprovement: { range: '0-4.9', count: 0 }
    };

    appraisals.forEach(a => {
      const score = parseFloat(a.performance_score) || 0;
      if (score >= 9) scoreRanges.excellent.count++;
      else if (score >= 7) scoreRanges.good.count++;
      else if (score >= 5) scoreRanges.satisfactory.count++;
      else scoreRanges.needsImprovement.count++;
    });

    // Group by status
    const byStatus = appraisals.reduce((acc, a) => {
      const key = a.status;
      if (!acc[key]) {
        acc[key] = { status: key, count: 0 };
      }
      acc[key].count += 1;
      return acc;
    }, {});

    res.json({
      appraisals,
      summary: {
        totalReviews: appraisals.length,
        averageScore,
        completedReviews: appraisals.filter(a => a.status === 'completed').length,
        pendingReviews: appraisals.filter(a => a.status === 'pending').length
      },
      byEmployee: Object.values(byEmployee),
      byScoreRange: scoreRanges,
      byStatus: Object.values(byStatus)
    });
  } catch (error) {
    console.error('Error generating appraisal report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Get dashboard summary report
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const supervisorFilter = userRole === 'manager' ? `AND e.supervisor_id = ${userId}` : '';

    // Get counts for all major entities
    const [
      totalEmployees,
      activeEmployees,
      pendingTimesheets,
      pendingLeave,
      pendingAppraisals,
      totalPayroll
    ] = await Promise.all([
      db.get(`SELECT COUNT(*) as count FROM employees WHERE 1=1 ${supervisorFilter}`),
      db.get(`SELECT COUNT(*) as count FROM employees WHERE status = 'active' ${supervisorFilter}`),
      db.get(`SELECT COUNT(*) as count FROM timesheets t JOIN employees e ON t.employee_id = e.id WHERE t.status = 'pending' ${supervisorFilter}`),
      db.get(`SELECT COUNT(*) as count FROM leave_requests l JOIN employees e ON l.employee_id = e.id WHERE l.status = 'pending' ${supervisorFilter}`),
      db.get(`SELECT COUNT(*) as count FROM appraisals a JOIN employees e ON a.employee_id = e.id WHERE a.status = 'pending' ${supervisorFilter}`),
      db.get(`SELECT COUNT(*) as count FROM payroll p JOIN employees e ON p.employee_id = e.id WHERE 1=1 ${supervisorFilter}`)
    ]);

    res.json({
      employees: {
        total: totalEmployees.count,
        active: activeEmployees.count,
        inactive: totalEmployees.count - activeEmployees.count
      },
      pendingItems: {
        timesheets: pendingTimesheets.count,
        leave: pendingLeave.count,
        appraisals: pendingAppraisals.count,
        total: pendingTimesheets.count + pendingLeave.count + pendingAppraisals.count
      },
      payroll: {
        totalRecords: totalPayroll.count
      }
    });
  } catch (error) {
    console.error('Error generating summary report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
