import React, { useEffect, useState } from 'react';
import { leaveService, employeeService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Leave = () => {
  const { isManager } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    leave_type: 'vacation',
    start_date: '',
    end_date: '',
    days_requested: '',
    reason: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [leaveRes, employeesRes] = await Promise.all([
        leaveService.getAll(),
        employeeService.getAll(),
      ]);
      setLeaveRequests(leaveRes.data);
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
      await leaveService.create(formData);
      setShowForm(false);
      setFormData({
        employee_id: '',
        leave_type: 'vacation',
        start_date: '',
        end_date: '',
        days_requested: '',
        reason: '',
      });
      loadData();
    } catch (error) {
      alert('Error creating leave request: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const handleApprove = async (id, status) => {
    try {
      await leaveService.approve(id, { status });
      loadData();
    } catch (error) {
      alert('Error updating leave request: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Leave Management</span>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Cancel' : 'New Leave Request'}
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
                <label className="form-label">Leave Type</label>
                <select
                  name="leave_type"
                  className="form-select"
                  value={formData.leave_type}
                  onChange={handleChange}
                  required
                >
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  className="form-input"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  name="end_date"
                  className="form-input"
                  value={formData.end_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Days Requested</label>
                <input
                  type="number"
                  step="0.5"
                  name="days_requested"
                  className="form-input"
                  value={formData.days_requested}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea
                  name="reason"
                  className="form-textarea"
                  value={formData.reason}
                  onChange={handleChange}
                />
              </div>

              <button type="submit" className="btn btn-primary">Submit Request</button>
            </form>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">Leave Requests</div>
        <div className="card-body">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Days</th>
                <th>Status</th>
                {isManager && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {leaveRequests.map(leave => (
                <tr key={leave.id}>
                  <td>{leave.first_name} {leave.last_name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{leave.leave_type}</td>
                  <td>{leave.start_date}</td>
                  <td>{leave.end_date}</td>
                  <td>{leave.days_requested}</td>
                  <td>
                    <span className={`badge badge-${leave.status}`}>
                      {leave.status}
                    </span>
                  </td>
                  {isManager && (
                    <td>
                      {leave.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(leave.id, 'approved')}
                            className="btn btn-success"
                            style={{ marginRight: '0.5rem', padding: '0.3rem 0.8rem' }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleApprove(leave.id, 'rejected')}
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

export default Leave;
