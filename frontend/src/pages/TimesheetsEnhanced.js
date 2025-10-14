import React, { useState, useEffect } from 'react';
import { timesheetService, projectsService } from '../services/api';
import '../styles/App.css';
import '../styles/TimesheetsEnhanced.css';

const TimesheetsEnhanced = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [settings, setSettings] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailySummary, setDailySummary] = useState(null);
  const [currentWeek, setCurrentWeek] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    hours_worked: '',
    project_id: '',
    work_type: 'Regular',
    description: '',
    location: '',
    is_overtime: false
  });

  // Filter state
  const [filter, setFilter] = useState({
    status: '',
    start_date: '',
    end_date: '',
    project_id: ''
  });

  useEffect(() => {
    loadSettings();
    loadProjects();
    loadMyProjects();
    loadTimesheets();
    generateWeek(new Date());
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadDailySummary(selectedDate);
    }
    // eslint-disable-next-line
  }, [selectedDate]);

  const loadSettings = async () => {
    try {
      const response = await timesheetService.getSettings();
      setSettings(response.data);
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectsService.getAll();
      setProjects(response.data);
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  const loadMyProjects = async () => {
    try {
      const response = await projectsService.getMyProjects();
      setMyProjects(response.data);
    } catch (err) {
      console.error('Error loading my projects:', err);
    }
  };

  const loadTimesheets = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter.status) params.status = filter.status;
      if (filter.start_date) params.start_date = filter.start_date;
      if (filter.end_date) params.end_date = filter.end_date;
      if (filter.project_id) params.project_id = filter.project_id;

      const response = await timesheetService.getAll(params);
      setTimesheets(response.data);
    } catch (err) {
      setError('Failed to load timesheets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDailySummary = async (date) => {
    try {
      const response = await timesheetService.getDailySummary(date);
      setDailySummary(response.data);
    } catch (err) {
      console.error('Error loading daily summary:', err);
    }
  };

  const generateWeek = (date) => {
    const week = [];
    const current = new Date(date);
    const day = current.getDay();
    const diff = current.getDate() - day;
    const sunday = new Date(current.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      week.push({
        date: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: d.getDate(),
        isToday: d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
      });
    }
    setCurrentWeek(week);
  };

  const handlePreviousWeek = () => {
    const firstDay = new Date(currentWeek[0].date);
    firstDay.setDate(firstDay.getDate() - 7);
    generateWeek(firstDay);
  };

  const handleNextWeek = () => {
    const firstDay = new Date(currentWeek[0].date);
    firstDay.setDate(firstDay.getDate() + 7);
    generateWeek(firstDay);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleHoursChange = (increment) => {
    const current = parseFloat(formData.hours_worked) || 0;
    const minIncrement = parseFloat(settings.min_increment || 0.25);
    const newValue = Math.max(0, Math.min(9, current + increment * minIncrement));
    setFormData(prev => ({ ...prev, hours_worked: newValue.toFixed(2) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const dataToSubmit = {
        ...formData,
        hours_worked: parseFloat(formData.hours_worked),
        is_overtime: formData.is_overtime ? 1 : 0
      };

      await timesheetService.create(dataToSubmit);
      setSuccess('Timesheet entry created successfully!');
      
      // Reset form
      setFormData({
        date: selectedDate,
        hours_worked: '',
        project_id: '',
        work_type: 'Regular',
        description: '',
        location: '',
        is_overtime: false
      });

      // Reload data
      loadTimesheets();
      loadDailySummary(selectedDate);
      loadMyProjects();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create timesheet entry');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this timesheet entry?')) {
      return;
    }

    try {
      await timesheetService.delete(id);
      setSuccess('Timesheet entry deleted');
      loadTimesheets();
      loadDailySummary(selectedDate);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete timesheet');
      console.error(err);
    }
  };

  const getProgressBarColor = () => {
    if (!dailySummary) return 'progress-green';
    const percentage = (dailySummary.totalHours / dailySummary.dailyCap) * 100;
    if (percentage >= 100) return 'progress-red';
    if (percentage >= 77.78) return 'progress-yellow';
    return 'progress-green';
  };

  const getProgressBarWidth = () => {
    if (!dailySummary) return '0%';
    const percentage = Math.min(100, (dailySummary.totalHours / dailySummary.dailyCap) * 100);
    return `${percentage}%`;
  };

  return (
    <div className="timesheets-container">
      <div className="timesheets-header">
        <h1>⏰ Timesheets</h1>
        <p>Log your daily work hours and track progress</p>
      </div>

      {error && (
        <div className="alert-message alert-error">
          <svg style={{width: '24px', height: '24px', flexShrink: 0}} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert-message alert-success">
          <svg style={{width: '24px', height: '24px', flexShrink: 0}} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {/* Weekly Calendar */}
      <div className="weekly-calendar">
        <div className="week-navigation">
          <button
            onClick={handlePreviousWeek}
            className="week-nav-btn"
          >
            ← Previous
          </button>
          <h2 className="week-title">
            {currentWeek.length > 0 && `Week of ${new Date(currentWeek[0].date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
          </h2>
          <button
            onClick={handleNextWeek}
            className="week-nav-btn"
          >
            Next →
          </button>
        </div>

        <div className="week-grid">
          {currentWeek.map((day) => (
            <div
              key={day.date}
              onClick={() => setSelectedDate(day.date)}
              className={`day-card ${
                day.isToday
                  ? 'day-card-today'
                  : selectedDate === day.date
                  ? 'day-card-selected'
                  : 'day-card-default'
              }`}
            >
              <div className="day-name">{day.dayName}</div>
              <div className="day-number">{day.dayNumber}</div>
              {day.isToday && (
                <div className="day-badge">Today</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Daily Summary & Entry Form */}
      <div className="summary-form-grid">
        {/* Daily Summary */}
        <div className="card-modern">
          <h3 className="card-header-modern">
            📊 Daily Summary - {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>

          {dailySummary && (
            <>
              <div className="progress-section">
                <div className="progress-info">
                  <span className="progress-label">Hours Used</span>
                  <span className="progress-value">
                    {dailySummary.totalHours.toFixed(2)} / {dailySummary.dailyCap} hours
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className={`progress-bar ${getProgressBarColor()}`}
                    style={{ width: getProgressBarWidth() }}
                  ></div>
                </div>
              </div>

              {dailySummary.isHoliday && (
                <div className="info-box info-box-holiday">
                  <span style={{fontSize: '1.5rem'}}>🎉</span>
                  <p><strong>Public Holiday:</strong> This is a public holiday</p>
                </div>
              )}

              {dailySummary.isOnLeave && (
                <div className="info-box info-box-leave">
                  <span style={{fontSize: '1.5rem'}}>📅</span>
                  <p><strong>On Leave:</strong> You are on approved leave</p>
                </div>
              )}

              {dailySummary.entries.length > 0 && (
                <div className="entries-list">
                  <h4 className="entries-header">📝 Today's Entries</h4>
                  <div>
                    {dailySummary.entries.map((entry) => (
                      <div key={entry.id} className="entry-item">
                        <div className="entry-info">
                          <div className="entry-project">
                            {entry.project_name || entry.project_code || 'No Project'}
                          </div>
                          <div className="entry-details">
                            {entry.hours_worked} hours • {entry.work_type}
                            {entry.status && (
                              <span className={`status-badge status-${entry.status}`}>
                                {entry.status}
                              </span>
                            )}
                          </div>
                        </div>
                        {entry.status === 'pending' && (
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="delete-btn"
                            title="Delete entry"
                          >
                            <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dailySummary.remainingHours > 0 && dailySummary.canAddMore && (
                <div className="mt-4 text-center text-sm text-gray-600">
                  ✨ You can add <span className="font-semibold">{dailySummary.remainingHours.toFixed(2)} more hours</span> today
                </div>
              )}
            </>
          )}
        </div>

        {/* Entry Form */}
        <div className="card-modern">
          <h3 className="card-header-modern">➕ Add Timesheet Entry</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group-modern">
              <label className="form-label-modern">
                📅 Date <span className="required">*</span>
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={(e) => {
                  handleInputChange(e);
                  setSelectedDate(e.target.value);
                }}
                className="form-input-modern"
                required
              />
            </div>

            <div className="form-group-modern">
              <label className="form-label-modern">
                📁 Project <span className="required">*</span>
              </label>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleInputChange}
                className="form-select-modern"
                required
              >
                <option value="">Select a project...</option>
                {myProjects.length > 0 && (
                  <optgroup label="Recent Projects">
                    {myProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.project_code} - {project.project_name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {projects.length > 0 && (
                  <optgroup label="All Projects">
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.code} - {project.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="form-group-modern">
              <label className="form-label-modern">
                ⏱️ Hours Worked <span className="required">*</span>
              </label>
              <div className="hours-control">
                <button
                  type="button"
                  onClick={() => handleHoursChange(-1)}
                  className="hours-btn"
                  disabled={!formData.hours_worked || parseFloat(formData.hours_worked) <= 0}
                >
                  −
                </button>
                <input
                  type="number"
                  name="hours_worked"
                  value={formData.hours_worked}
                  onChange={handleInputChange}
                  step={settings.min_increment || "0.25"}
                  min="0"
                  max={settings.daily_hour_cap || "9"}
                  className="form-input-modern hours-input"
                  placeholder="0.00"
                  required
                />
                <button
                  type="button"
                  onClick={() => handleHoursChange(1)}
                  className="hours-btn"
                  disabled={dailySummary && parseFloat(formData.hours_worked || 0) + dailySummary.totalHours >= dailySummary.dailyCap}
                >
                  +
                </button>
              </div>
              <p style={{fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem'}}>
                Increments of {settings.min_increment || 0.25} hours ({(parseFloat(settings.min_increment || 0.25) * 60)} minutes)
              </p>
            </div>

            <div className="form-group-modern">
              <label className="form-label-modern">
                💼 Work Type
              </label>
              <div className="radio-group">
                {['Regular', 'Overtime', 'Remote'].map((type) => (
                  <label key={type} className="radio-label">
                    <input
                      type="radio"
                      name="work_type"
                      value={type}
                      checked={formData.work_type === type}
                      onChange={handleInputChange}
                      className="radio-input"
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group-modern">
              <label className="form-label-modern">
                📍 Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="form-input-modern"
                placeholder="Office, Home, Field, etc."
              />
            </div>

            <div className="form-group-modern">
              <label className="form-label-modern">
                📝 Description / Notes
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                maxLength="200"
                className="form-textarea-modern"
                placeholder="Brief description of work done..."
              ></textarea>
              <p style={{fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem'}}>
                {formData.description.length}/200 characters
              </p>
            </div>

            <div>
              <label htmlFor="is_overtime" className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_overtime"
                  checked={formData.is_overtime}
                  onChange={handleInputChange}
                  className="checkbox-input"
                  id="is_overtime"
                />
                ⏰ Mark as overtime
              </label>
            </div>

            <button
              type="submit"
              disabled={dailySummary && !dailySummary.canAddMore}
              className="submit-btn"
            >
              {dailySummary && !dailySummary.canAddMore ? '⚠️ Daily Limit Reached' : '✅ Submit Timesheet Entry'}
            </button>
          </form>
        </div>
      </div>

      {/* Filters & Timesheet List */}
      <div className="card-modern">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
          <h3 className="card-header-modern" style={{marginBottom: 0, paddingBottom: 0, borderBottom: 'none'}}>📋 Your Timesheets</h3>
          <button
            onClick={loadTimesheets}
            className="refresh-btn"
          >
            <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="filter-grid">
          <div>
            <label className="form-label-modern">📋 Status</label>
            <select
              value={filter.status}
              onChange={(e) => {
                setFilter({ ...filter, status: e.target.value });
                setTimeout(loadTimesheets, 100);
              }}
              className="form-select-modern"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="form-label-modern">📅 Start Date</label>
            <input
              type="date"
              value={filter.start_date}
              onChange={(e) => {
                setFilter({ ...filter, start_date: e.target.value });
                setTimeout(loadTimesheets, 100);
              }}
              className="form-input-modern"
            />
          </div>

          <div>
            <label className="form-label-modern">📅 End Date</label>
            <input
              type="date"
              value={filter.end_date}
              onChange={(e) => {
                setFilter({ ...filter, end_date: e.target.value });
                setTimeout(loadTimesheets, 100);
              }}
              className="form-input-modern"
            />
          </div>

          <div>
            <label className="form-label-modern">📁 Project</label>
            <select
              value={filter.project_id}
              onChange={(e) => {
                setFilter({ ...filter, project_id: e.target.value });
                setTimeout(loadTimesheets, 100);
              }}
              className="form-select-modern"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timesheets Table */}
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p className="loading-text">Loading timesheets...</p>
          </div>
        ) : timesheets.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="empty-text">No timesheets found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Hours</th>
                  <th>Work Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {timesheets.map((timesheet) => (
                  <tr key={timesheet.id}>
                    <td>
                      {new Date(timesheet.date).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{fontWeight: 600}}>{timesheet.project_name || timesheet.project_code || 'N/A'}</div>
                      {timesheet.description && (
                        <div style={{fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem'}}>{timesheet.description}</div>
                      )}
                    </td>
                    <td>
                      {timesheet.hours_worked} hrs
                      {timesheet.is_overtime === 1 && (
                        <span className="ml-2 text-xs text-orange-600">(OT)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {timesheet.work_type || 'Regular'}
                    </td>
                    <td>
                      <span className={`status-badge status-${timesheet.status}`}>
                        {timesheet.status}
                      </span>
                    </td>
                    <td>
                      {timesheet.status === 'pending' && (
                        <button
                          onClick={() => handleDelete(timesheet.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimesheetsEnhanced;
