import React, { useEffect, useState } from 'react';
import { profileService } from '../services/api';

const ActivityFeed = ({ limit = 10, showTitle = true }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadActivity = async () => {
    try {
      const response = await profileService.getActivity();
      const data = response.data || [];
      setActivities(limit ? data.slice(0, limit) : data);
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'timesheet': return '⏰';
      case 'leave': return '🏖️';
      default: return '📄';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatActivityDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="activity-feed">
        {showTitle && <h3 className="activity-feed-title">Recent Activity</h3>}
        <div className="activity-loading">
          <div className="loading-spinner-small"></div>
          <p>Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      {showTitle && (
        <h3 className="activity-feed-title">
          <span className="title-icon">📋</span>
          Recent Activity
        </h3>
      )}

      {activities.length === 0 ? (
        <div className="activity-empty">
          <div className="empty-icon">📋</div>
          <p>No recent activity to display</p>
        </div>
      ) : (
        <div className="activity-timeline">
          {activities.map((activity, index) => (
            <div key={index} className="activity-timeline-item">
              <div className="activity-timeline-marker">
                <div 
                  className="activity-timeline-icon"
                  style={{ backgroundColor: getStatusColor(activity.status) }}
                >
                  {getActivityIcon(activity.type)}
                </div>
                {index < activities.length - 1 && (
                  <div className="activity-timeline-line"></div>
                )}
              </div>

              <div className="activity-timeline-content">
                <div className="activity-card">
                  <div className="activity-card-header">
                    <div className="activity-type-badge">
                      {activity.type === 'timesheet' ? 'Timesheet' : 'Leave Request'}
                    </div>
                    <div className="activity-time">
                      {formatDate(activity.created_at)}
                    </div>
                  </div>

                  <div className="activity-card-body">
                    {activity.type === 'timesheet' ? (
                      <>
                        <div className="activity-details">
                          <div className="activity-detail-item">
                            <span className="detail-icon">📅</span>
                            <span className="detail-text">
                              {formatActivityDate(activity.date)}
                            </span>
                          </div>
                          <div className="activity-detail-item">
                            <span className="detail-icon">⏱️</span>
                            <span className="detail-text">
                              {activity.hours_worked} hours
                            </span>
                          </div>
                          {activity.project_code && (
                            <div className="activity-detail-item">
                              <span className="detail-icon">🔖</span>
                              <span className="detail-text">
                                {activity.project_code}
                              </span>
                            </div>
                          )}
                        </div>
                        {activity.description && (
                          <p className="activity-description">
                            {activity.description}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="activity-details">
                          <div className="activity-detail-item">
                            <span className="detail-icon">🏖️</span>
                            <span className="detail-text">
                              {activity.leave_type}
                            </span>
                          </div>
                          <div className="activity-detail-item">
                            <span className="detail-icon">📅</span>
                            <span className="detail-text">
                              {formatActivityDate(activity.start_date)} - {formatActivityDate(activity.end_date)}
                            </span>
                          </div>
                          <div className="activity-detail-item">
                            <span className="detail-icon">📊</span>
                            <span className="detail-text">
                              {activity.days_requested} days
                            </span>
                          </div>
                        </div>
                        {activity.reason && (
                          <p className="activity-description">
                            {activity.reason}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="activity-card-footer">
                    <div 
                      className="activity-status-badge"
                      style={{ 
                        backgroundColor: getStatusColor(activity.status),
                        color: '#ffffff'
                      }}
                    >
                      {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
