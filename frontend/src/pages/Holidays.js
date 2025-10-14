import React, { useEffect, useState } from 'react';
import { holidaysService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Holidays = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    is_recurring: false,
    description: '',
  });

  useEffect(() => {
    loadHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  const loadHolidays = async () => {
    try {
      const response = await holidaysService.getAll(selectedYear);
      setHolidays(response.data || []);
    } catch (error) {
      console.error('Error loading holidays:', error);
      setMessage({ type: 'error', text: 'Failed to load holidays' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      if (editingId) {
        await holidaysService.update(editingId, formData);
        setMessage({ type: 'success', text: 'Holiday updated successfully!' });
      } else {
        await holidaysService.create(formData);
        setMessage({ type: 'success', text: 'Holiday created successfully!' });
      }
      
      resetForm();
      await loadHolidays();
    } catch (error) {
      console.error('Error saving holiday:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to save holiday' 
      });
    }
  };

  const handleEdit = (holiday) => {
    setFormData({
      name: holiday.name,
      date: holiday.date,
      is_recurring: Boolean(holiday.is_recurring),
      description: holiday.description || '',
    });
    setEditingId(holiday.id);
    setShowForm(true);
    setMessage({ type: '', text: '' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) {
      return;
    }

    try {
      await holidaysService.delete(id);
      setMessage({ type: 'success', text: 'Holiday deleted successfully!' });
      await loadHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      setMessage({ type: 'error', text: 'Failed to delete holiday' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      date: '',
      is_recurring: false,
      description: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getMonthName = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long' });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const groupByMonth = (holidays) => {
    return holidays.reduce((acc, holiday) => {
      const month = getMonthName(holiday.date);
      if (!acc[month]) acc[month] = [];
      acc[month].push(holiday);
      return acc;
    }, {});
  };

  const getUpcomingHolidays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidays
      .filter(h => new Date(h.date) >= today)
      .slice(0, 5);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading holidays...</p>
      </div>
    );
  }

  const groupedHolidays = groupByMonth(holidays);
  const upcomingHolidays = getUpcomingHolidays();

  return (
    <div className="holidays-page">
      <div className="page-header">
        <div className="header-content">
          <h1>🗓️ Holiday Calendar</h1>
          <p className="subtitle">Public Holidays for {selectedYear}</p>
        </div>
        <div className="header-actions">
          <select 
            className="year-selector"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {[2024, 2025, 2026, 2027, 2028].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          {isAdmin && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? '❌ Cancel' : '➕ Add Holiday'}
            </button>
          )}
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="holidays-container">
        {/* Upcoming Holidays Widget */}
        {upcomingHolidays.length > 0 && (
          <div className="upcoming-holidays-widget">
            <h2>🎉 Upcoming Holidays</h2>
            <div className="upcoming-list">
              {upcomingHolidays.map(holiday => (
                <div key={holiday.id} className="upcoming-item">
                  <div className="upcoming-date">
                    <div className="date-day">
                      {new Date(holiday.date).getDate()}
                    </div>
                    <div className="date-month">
                      {new Date(holiday.date).toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  </div>
                  <div className="upcoming-info">
                    <div className="upcoming-name">{holiday.name}</div>
                    <div className="upcoming-weekday">
                      {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'long' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Holiday Form */}
        {isAdmin && showForm && (
          <div className="holiday-form-card">
            <h2>{editingId ? '✏️ Edit Holiday' : '➕ Add New Holiday'}</h2>
            <form onSubmit={handleSubmit} className="holiday-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Holiday Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="e.g., New Year's Day"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="date">Date *</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="form-input"
                  rows="3"
                  placeholder="Optional description..."
                />
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_recurring"
                    checked={formData.is_recurring}
                    onChange={handleChange}
                  />
                  <span>Recurring holiday (annual)</span>
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-success">
                  {editingId ? '💾 Update Holiday' : '➕ Create Holiday'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  ❌ Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Holidays by Month */}
        <div className="holidays-list">
          <h2>📅 All Holidays ({holidays.length})</h2>
          
          {holidays.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🗓️</div>
              <h3>No holidays scheduled</h3>
              <p>
                {isAdmin 
                  ? 'Click "Add Holiday" to create your first holiday.'
                  : 'No public holidays have been scheduled for this year.'}
              </p>
            </div>
          ) : (
            <div className="months-grid">
              {Object.entries(groupedHolidays).map(([month, monthHolidays]) => (
                <div key={month} className="month-card">
                  <h3 className="month-title">{month}</h3>
                  <div className="holiday-items">
                    {monthHolidays.map(holiday => (
                      <div key={holiday.id} className="holiday-item">
                        <div className="holiday-main">
                          <div className="holiday-date-badge">
                            <div className="badge-day">
                              {new Date(holiday.date).getDate()}
                            </div>
                            <div className="badge-weekday">
                              {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                          </div>
                          <div className="holiday-info">
                            <h4 className="holiday-name">
                              {holiday.name}
                              {holiday.is_recurring && (
                                <span className="recurring-badge">🔄 Annual</span>
                              )}
                            </h4>
                            {holiday.description && (
                              <p className="holiday-description">{holiday.description}</p>
                            )}
                            <p className="holiday-full-date">{formatDate(holiday.date)}</p>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="holiday-actions">
                            <button 
                              className="btn-icon btn-edit"
                              onClick={() => handleEdit(holiday)}
                              title="Edit holiday"
                            >
                              ✏️
                            </button>
                            <button 
                              className="btn-icon btn-delete"
                              onClick={() => handleDelete(holiday.id)}
                              title="Delete holiday"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Holidays;
