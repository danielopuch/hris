import React, { useEffect, useState } from 'react';
import { timesheetService, leaveService, appraisalService, payrollService, profileService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ActivityFeed from '../components/ActivityFeed';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingTimesheets: 0,
    pendingLeave: 0,
    totalAppraisals: 0,
    recentPayroll: 0,
    approvedTimesheets: 0,
    approvedLeave: 0,
  });
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadDashboardData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [timesheets, leave, appraisals, payroll, balance, approvals] = await Promise.all([
        timesheetService.getAll('pending'),
        leaveService.getAll(),
        appraisalService.getAll(),
        payrollService.getAll(),
        profileService.getLeaveBalance().catch(() => ({ data: null })),
        profileService.getPendingApprovals().catch(() => ({ data: null })),
      ]);

      setStats({
        pendingTimesheets: timesheets.data.length,
        pendingLeave: leave.data.filter(l => l.status === 'pending').length,
        totalAppraisals: appraisals.data.length,
        recentPayroll: payroll.data.length,
        approvedTimesheets: timesheets.data.filter(t => t.status === 'approved').length || 0,
        approvedLeave: leave.data.filter(l => l.status === 'approved').length,
      });

      setLeaveBalance(balance.data);
      setPendingApprovals(approvals.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return '👑';
      case 'manager': return '👔';
      case 'employee': return '👤';
      default: return '👤';
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="modern-dashboard">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            {getGreeting()}, {user?.first_name || user?.username}! {getRoleIcon(user?.role)}
          </h1>
          <p className="hero-subtitle">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' • '}
            {currentTime.toLocaleTimeString('en-US')}
          </p>
          <div className="hero-badge">
            <span className="role-badge">{user?.role?.toUpperCase()}</span>
            {user?.is_supervisor && <span className="role-badge supervisor-badge">SUPERVISOR</span>}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card stat-primary">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <div className="stat-label">Pending Timesheets</div>
            <div className="stat-value">{stats.pendingTimesheets}</div>
            <div className="stat-change">Requires attention</div>
          </div>
        </div>

        <div className="stat-card stat-success">
          <div className="stat-icon">🏖️</div>
          <div className="stat-content">
            <div className="stat-label">Leave Requests</div>
            <div className="stat-value">{stats.pendingLeave}</div>
            <div className="stat-change">Awaiting approval</div>
          </div>
        </div>

        <div className="stat-card stat-warning">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Performance Reviews</div>
            <div className="stat-value">{stats.totalAppraisals}</div>
            <div className="stat-change">Total appraisals</div>
          </div>
        </div>

        <div className="stat-card stat-purple">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Payroll Records</div>
            <div className="stat-value">{stats.recentPayroll}</div>
            <div className="stat-change">This period</div>
          </div>
        </div>
      </div>

      {/* Leave Balance Section */}
      {leaveBalance && (
        <div className="dashboard-section">
          <h2 className="section-title">
            <span className="title-icon">🏖️</span>
            Leave Balance
          </h2>
          <div className="leave-balance-grid">
            <div className="balance-card balance-vacation">
              <div className="balance-icon">🌴</div>
              <div className="balance-content">
                <div className="balance-label">Vacation Days</div>
                <div className="balance-value">{leaveBalance.vacation?.remaining || 0}</div>
                <div className="balance-details">
                  <span>{leaveBalance.vacation?.used || 0} used</span>
                  <span className="separator">•</span>
                  <span>{leaveBalance.vacation?.total || 0} total</span>
                </div>
              </div>
            </div>

            <div className="balance-card balance-sick">
              <div className="balance-icon">🏥</div>
              <div className="balance-content">
                <div className="balance-label">Sick Days</div>
                <div className="balance-value">{leaveBalance.sick?.remaining || 0}</div>
                <div className="balance-details">
                  <span>{leaveBalance.sick?.used || 0} used</span>
                  <span className="separator">•</span>
                  <span>{leaveBalance.sick?.total || 0} total</span>
                </div>
              </div>
            </div>

            <div className="balance-card balance-personal">
              <div className="balance-icon">🎯</div>
              <div className="balance-content">
                <div className="balance-label">Personal Days</div>
                <div className="balance-value">{leaveBalance.personal?.remaining || 0}</div>
                <div className="balance-details">
                  <span>{leaveBalance.personal?.used || 0} used</span>
                  <span className="separator">•</span>
                  <span>{leaveBalance.personal?.total || 0} total</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manager Pending Approvals */}
      {pendingApprovals && pendingApprovals.total > 0 && (
        <div className="dashboard-section">
          <h2 className="section-title">
            <span className="title-icon">🔔</span>
            Pending Approvals
          </h2>
          <div className="approvals-grid">
            {pendingApprovals.timesheets > 0 && (
              <div className="approval-card">
                <div className="approval-icon">⏰</div>
                <div className="approval-content">
                  <div className="approval-count">{pendingApprovals.timesheets}</div>
                  <div className="approval-label">Timesheet{pendingApprovals.timesheets !== 1 ? 's' : ''}</div>
                </div>
                <a href="/timesheets" className="approval-action">Review →</a>
              </div>
            )}
            {pendingApprovals.leave > 0 && (
              <div className="approval-card">
                <div className="approval-icon">🏖️</div>
                <div className="approval-content">
                  <div className="approval-count">{pendingApprovals.leave}</div>
                  <div className="approval-label">Leave Request{pendingApprovals.leave !== 1 ? 's' : ''}</div>
                </div>
                <a href="/leave" className="approval-action">Review →</a>
              </div>
            )}
            {pendingApprovals.appraisals > 0 && (
              <div className="approval-card">
                <div className="approval-icon">📊</div>
                <div className="approval-content">
                  <div className="approval-count">{pendingApprovals.appraisals}</div>
                  <div className="approval-label">Appraisal{pendingApprovals.appraisals !== 1 ? 's' : ''}</div>
                </div>
                <a href="/appraisals" className="approval-action">Review →</a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h2 className="section-title">
          <span className="title-icon">⚡</span>
          Quick Actions
        </h2>
        <div className="action-grid">
          <a href="/timesheets" className="action-card action-primary">
            <div className="action-icon">📝</div>
            <h3>Submit Timesheet</h3>
            <p>Record your work hours</p>
          </a>

          <a href="/leave" className="action-card action-success">
            <div className="action-icon">🌴</div>
            <h3>Request Leave</h3>
            <p>Plan your time off</p>
          </a>

          {user?.role !== 'employee' && (
            <>
              <a href="/appraisals" className="action-card action-warning">
                <div className="action-icon">📈</div>
                <h3>Performance Reviews</h3>
                <p>Evaluate team members</p>
              </a>

              <a href="/employees" className="action-card action-info">
                <div className="action-icon">👥</div>
                <h3>Team Directory</h3>
                <p>Manage employees</p>
              </a>
            </>
          )}

          {user?.role === 'admin' && (
            <a href="/payroll" className="action-card action-purple">
              <div className="action-icon">💳</div>
              <h3>Payroll</h3>
              <p>Process payments</p>
            </a>
          )}
        </div>
      </div>

      {/* Activity Overview */}
      <div className="dashboard-section">
        <h2 className="section-title">
          <span className="title-icon">📊</span>
          Activity Overview
        </h2>
        <div className="overview-grid">
          <div className="overview-card">
            <div className="overview-header">
              <h3>Timesheet Status</h3>
              <span className="overview-badge badge-primary">{stats.pendingTimesheets + stats.approvedTimesheets} Total</span>
            </div>
            <div className="overview-stats">
              <div className="overview-stat">
                <span className="stat-dot stat-pending"></span>
                <span>Pending: {stats.pendingTimesheets}</span>
              </div>
              <div className="overview-stat">
                <span className="stat-dot stat-approved"></span>
                <span>Approved: {stats.approvedTimesheets}</span>
              </div>
            </div>
          </div>

          <div className="overview-card">
            <div className="overview-header">
              <h3>Leave Management</h3>
              <span className="overview-badge badge-success">{stats.pendingLeave + stats.approvedLeave} Total</span>
            </div>
            <div className="overview-stats">
              <div className="overview-stat">
                <span className="stat-dot stat-pending"></span>
                <span>Pending: {stats.pendingLeave}</span>
              </div>
              <div className="overview-stat">
                <span className="stat-dot stat-approved"></span>
                <span>Approved: {stats.approvedLeave}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-section">
        <ActivityFeed limit={5} showTitle={true} />
      </div>

      {/* System Info */}
      <div className="dashboard-footer">
        <div className="system-info">
          <span className="info-item">🌐 HRIS v2.0</span>
          <span className="info-separator">•</span>
          <span className="info-item">🔒 Secure Connection</span>
          <span className="info-separator">•</span>
          <span className="info-item">📍 GHSC-PSM</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
