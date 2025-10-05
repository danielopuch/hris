import React, { useEffect, useState } from 'react';
import { timesheetService, leaveService, appraisalService, payrollService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingTimesheets: 0,
    pendingLeave: 0,
    totalAppraisals: 0,
    recentPayroll: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [timesheets, leave, appraisals, payroll] = await Promise.all([
        timesheetService.getAll('pending'),
        leaveService.getAll(),
        appraisalService.getAll(),
        payrollService.getAll(),
      ]);

      setStats({
        pendingTimesheets: timesheets.data.length,
        pendingLeave: leave.data.filter(l => l.status === 'pending').length,
        totalAppraisals: appraisals.data.length,
        recentPayroll: payroll.data.length,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">Welcome, {user?.username}!</div>
        <div className="card-body">
          <p>Your role: <strong>{user?.role}</strong></p>
          <p>Manage your HR activities using the navigation menu above.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card" style={{ borderLeft: '4px solid #667eea' }}>
          <div className="dashboard-card-title">Pending Timesheets</div>
          <div className="dashboard-card-value">{stats.pendingTimesheets}</div>
        </div>

        <div className="dashboard-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="dashboard-card-title">Pending Leave Requests</div>
          <div className="dashboard-card-value">{stats.pendingLeave}</div>
        </div>

        <div className="dashboard-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="dashboard-card-title">Total Appraisals</div>
          <div className="dashboard-card-value">{stats.totalAppraisals}</div>
        </div>

        <div className="dashboard-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="dashboard-card-title">Payroll Records</div>
          <div className="dashboard-card-value">{stats.recentPayroll}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Quick Actions</div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="/timesheets" className="btn btn-primary">Submit Timesheet</a>
            <a href="/leave" className="btn btn-success">Request Leave</a>
            {user?.role !== 'employee' && (
              <>
                <a href="/appraisals" className="btn btn-secondary">Manage Appraisals</a>
                <a href="/payroll" className="btn btn-secondary">View Payroll</a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
