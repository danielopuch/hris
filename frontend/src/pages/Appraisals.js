import React, { useEffect, useState } from 'react';
import { appraisalService, employeeService } from '../services/api';

const Appraisals = () => {
  const [appraisals, setAppraisals] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    review_period: '',
    performance_rating: '',
    goals_achieved: '',
    strengths: '',
    areas_for_improvement: '',
    comments: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appraisalsRes, employeesRes] = await Promise.all([
        appraisalService.getAll(),
        employeeService.getAll(),
      ]);
      setAppraisals(appraisalsRes.data);
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
      await appraisalService.create(formData);
      setShowForm(false);
      setFormData({
        employee_id: '',
        review_period: '',
        performance_rating: '',
        goals_achieved: '',
        strengths: '',
        areas_for_improvement: '',
        comments: '',
      });
      loadData();
    } catch (error) {
      alert('Error creating appraisal: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Performance Appraisals</span>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Cancel' : 'New Appraisal'}
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
                <label className="form-label">Review Period</label>
                <input
                  type="text"
                  name="review_period"
                  className="form-input"
                  placeholder="e.g., Q1 2024"
                  value={formData.review_period}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Performance Rating (1-5)</label>
                <select
                  name="performance_rating"
                  className="form-select"
                  value={formData.performance_rating}
                  onChange={handleChange}
                >
                  <option value="">Select Rating</option>
                  <option value="1">1 - Needs Improvement</option>
                  <option value="2">2 - Below Expectations</option>
                  <option value="3">3 - Meets Expectations</option>
                  <option value="4">4 - Exceeds Expectations</option>
                  <option value="5">5 - Outstanding</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Goals Achieved</label>
                <textarea
                  name="goals_achieved"
                  className="form-textarea"
                  value={formData.goals_achieved}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Strengths</label>
                <textarea
                  name="strengths"
                  className="form-textarea"
                  value={formData.strengths}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Areas for Improvement</label>
                <textarea
                  name="areas_for_improvement"
                  className="form-textarea"
                  value={formData.areas_for_improvement}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Additional Comments</label>
                <textarea
                  name="comments"
                  className="form-textarea"
                  value={formData.comments}
                  onChange={handleChange}
                />
              </div>

              <button type="submit" className="btn btn-primary">Create Appraisal</button>
            </form>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">All Appraisals</div>
        <div className="card-body">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Period</th>
                <th>Rating</th>
                <th>Reviewer</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {appraisals.map(appraisal => (
                <tr key={appraisal.id}>
                  <td>{appraisal.first_name} {appraisal.last_name}</td>
                  <td>{appraisal.review_period}</td>
                  <td>{appraisal.performance_rating ? `${appraisal.performance_rating}/5` : 'N/A'}</td>
                  <td>{appraisal.reviewer_first_name} {appraisal.reviewer_last_name}</td>
                  <td>
                    <span className={`badge badge-${appraisal.status === 'completed' ? 'completed' : 'pending'}`}>
                      {appraisal.status}
                    </span>
                  </td>
                  <td>{new Date(appraisal.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Appraisals;
