import React, { useEffect, useState } from 'react';
import { timesheetService, employeeService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Timesheets = () => {
  const { isManager } = useAuth();
  const [timesheets, setTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    hours_worked: '',
    project_code: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [timesheetsRes, employeesRes] = await Promise.all([
        timesheetService.getAll(),
        employeeService.getAll(),
      ]);
      setTimesheets(timesheetsRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await timesheetService.create(formData);
      setShowForm(false);
      setFormData({
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        hours_worked: '',
        project_code: '',
        description: '',
      });
      loadData();
    } catch (error) {
      alert('Error creating timesheet: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const handleApprove = async (id, status) => {
    try {
      await timesheetService.approve(id, { status });
      loadData();
    } catch (error) {
      alert('Error updating timesheet: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Timesheet Management</span>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Cancel' : 'New Timesheet'}
          </button>
        </div>

        {showForm && (
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Employee</label>
                <select
                  name="employee_id"
                  className="form-select"
                  value={formData.employee_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  name="date"
                  className="form-input"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hours Worked</label>
                <input
                  type="number"
                  step="0.25"
                  name="hours_worked"
                  className="form-input"
                  value={formData.hours_worked}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Project Code</label>
                <input
                  type="text"
                  name="project_code"
                  className="form-input"
                  value={formData.project_code}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="form-textarea"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              <button type="submit" className="btn btn-primary">Submit Timesheet</button>
            </form>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">All Timesheets</div>
        <div className="card-body">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Hours</th>
                <th>Project</th>
                <th>Status</th>
                {isManager && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {timesheets.map(ts => (
                <tr key={ts.id}>
                  <td>{ts.first_name} {ts.last_name}</td>
                  <td>{ts.date}</td>
                  <td>{ts.hours_worked}</td>
                  <td>{ts.project_code || 'N/A'}</td>
                  <td>
                    <span className={`badge badge-${ts.status}`}>
                      {ts.status}
                    </span>
                  </td>
                  {isManager && (
                    <td>
                      {ts.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(ts.id, 'approved')}
                            className="btn btn-success"
                            style={{ marginRight: '0.5rem', padding: '0.3rem 0.8rem' }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleApprove(ts.id, 'rejected')}
                            className="btn btn-danger"
                            style={{ padding: '0.3rem 0.8rem' }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Timesheets;
