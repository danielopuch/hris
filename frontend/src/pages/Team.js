import React, { useEffect, useState } from 'react';
import { teamService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Team = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only managers and admins can access this page
    if (user?.role === 'employee') {
      navigate('/');
      return;
    }
    
    loadTeamData();
  }, [user, navigate]);

  const loadTeamData = async () => {
    try {
      const [membersRes, statsRes, activityRes] = await Promise.all([
        teamService.getMembers(),
        teamService.getStats(),
        teamService.getActivity(),
      ]);

      setTeamMembers(membersRes.data || []);
      setStats(statsRes.data);
      setActivity(activityRes.data || []);
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'inactive': return '#6b7280';
      case 'terminated': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'timesheet': return '⏰';
      case 'leave': return '🏖️';
      default: return '📄';
    }
  };

  const getActivityStatus = (item) => {
    if (item.status === 'pending') return 'pending';
    if (item.status === 'approved') return 'approved';
    if (item.status === 'rejected') return 'rejected';
    return 'unknown';
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading team dashboard...</p>
      </div>
    );
  }

  return (
    <div className="team-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>👥 Team Dashboard</h1>
          <p className="subtitle">Manage your team and track their activities</p>
        </div>
      </div>

      {/* Team Statistics */}
      {stats && (
        <div className="team-stats-grid">
          <div className="stat-card stat-primary">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-label">Total Team Members</div>
              <div className="stat-value">{stats.totalMembers}</div>
              <div className="stat-change">{stats.activeMembers} active</div>
            </div>
          </div>

          <div className="stat-card stat-warning">
            <div className="stat-icon">⏰</div>
            <div className="stat-content">
              <div className="stat-label">Pending Timesheets</div>
              <div className="stat-value">{stats.pendingTimesheets}</div>
              <div className="stat-change">Awaiting approval</div>
            </div>
          </div>

          <div className="stat-card stat-success">
            <div className="stat-icon">🏖️</div>
            <div className="stat-content">
              <div className="stat-label">Pending Leave</div>
              <div className="stat-value">{stats.pendingLeave}</div>
              <div className="stat-change">Requests pending</div>
            </div>
          </div>

          <div className="stat-card stat-purple">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-label">Pending Appraisals</div>
              <div className="stat-value">{stats.pendingAppraisals}</div>
              <div className="stat-change">Reviews needed</div>
            </div>
          </div>

          <div className="stat-card stat-info">
            <div className="stat-icon">🌴</div>
            <div className="stat-content">
              <div className="stat-label">On Leave Today</div>
              <div className="stat-value">{stats.onLeaveToday}</div>
              <div className="stat-change">Team members</div>
            </div>
          </div>

          <div className="stat-card stat-danger">
            <div className="stat-icon">🔔</div>
            <div className="stat-content">
              <div className="stat-label">Total Pending</div>
              <div className="stat-value">{stats.totalPending}</div>
              <div className="stat-change">Items to review</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="team-section">
        <h2 className="section-title">
          <span className="title-icon">⚡</span>
          Quick Actions
        </h2>
        <div className="action-grid">
          <button 
            className="action-card action-primary"
            onClick={() => navigate('/timesheets')}
          >
            <div className="action-icon">⏰</div>
            <h3>Review Timesheets</h3>
            <p>Approve pending timesheets</p>
            {stats && stats.pendingTimesheets > 0 && (
              <span className="action-badge">{stats.pendingTimesheets}</span>
            )}
          </button>

          <button 
            className="action-card action-success"
            onClick={() => navigate('/leave')}
          >
            <div className="action-icon">🏖️</div>
            <h3>Review Leave Requests</h3>
            <p>Approve or reject leave</p>
            {stats && stats.pendingLeave > 0 && (
              <span className="action-badge">{stats.pendingLeave}</span>
            )}
          </button>

          <button 
            className="action-card action-warning"
            onClick={() => navigate('/appraisals')}
          >
            <div className="action-icon">📊</div>
            <h3>Performance Reviews</h3>
            <p>Complete appraisals</p>
            {stats && stats.pendingAppraisals > 0 && (
              <span className="action-badge">{stats.pendingAppraisals}</span>
            )}
          </button>

          <button 
            className="action-card action-info"
            onClick={() => navigate('/employees')}
          >
            <div className="action-icon">👤</div>
            <h3>Team Directory</h3>
            <p>View all team members</p>
          </button>
        </div>
      </div>

      {/* Team Members */}
      <div className="team-section">
        <h2 className="section-title">
          <span className="title-icon">👥</span>
          Team Members ({teamMembers.length})
        </h2>

        {teamMembers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No team members</h3>
            <p>You don't have any team members reporting to you yet.</p>
          </div>
        ) : (
          <div className="team-members-grid">
            {teamMembers.map((member) => (
              <div key={member.id} className="member-card">
                <div className="member-header">
                  <div className="member-avatar">
                    {member.first_name?.charAt(0)}{member.last_name?.charAt(0)}
                  </div>
                  <div className="member-info">
                    <h3 className="member-name">
                      {member.first_name} {member.last_name}
                    </h3>
                    <p className="member-position">{member.position}</p>
                  </div>
                  <div 
                    className="member-status-badge"
                    style={{ backgroundColor: getStatusColor(member.status) }}
                  >
                    {member.status}
                  </div>
                </div>

                <div className="member-details">
                  <div className="detail-item">
                    <span className="detail-label">Employee ID:</span>
                    <span className="detail-value">{member.employee_id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Department:</span>
                    <span className="detail-value">{member.department}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{member.email || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Username:</span>
                    <span className="detail-value">{member.username}</span>
                  </div>
                  {member.last_login && (
                    <div className="detail-item">
                      <span className="detail-label">Last Login:</span>
                      <span className="detail-value">
                        {formatDate(member.last_login)} {formatTime(member.last_login)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="team-section">
        <h2 className="section-title">
          <span className="title-icon">📋</span>
          Recent Team Activity
        </h2>

        {activity.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No recent activity</h3>
            <p>No recent timesheet or leave activity from your team.</p>
          </div>
        ) : (
          <div className="activity-list">
            {activity.map((item, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">
                  {getActivityIcon(item.type)}
                </div>
                <div className="activity-content">
                  <div className="activity-header">
                    <span className="activity-name">
                      {item.first_name} {item.last_name}
                    </span>
                    <span className="activity-type">
                      {item.type === 'timesheet' ? 'Timesheet' : 'Leave Request'}
                    </span>
                  </div>
                  <div className="activity-details">
                    {item.type === 'timesheet' ? (
                      <>
                        <span>{formatDate(item.date)} • {item.hours_worked} hours</span>
                        {item.project_code && <span> • {item.project_code}</span>}
                      </>
                    ) : (
                      <>
                        <span>{item.leave_type} • {formatDate(item.start_date)} to {formatDate(item.end_date)}</span>
                        <span> • {item.days_requested} days</span>
                      </>
                    )}
                  </div>
                  {item.description && (
                    <p className="activity-description">{item.description}</p>
                  )}
                </div>
                <div className={`activity-status status-${getActivityStatus(item)}`}>
                  {item.status}
                </div>
                <div className="activity-time">
                  {formatTime(item.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Team;
