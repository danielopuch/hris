import React, { useEffect, useState } from 'react';
import { payrollService, employeeService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Payroll = () => {
  const { isAdmin } = useAuth();
  const [payroll, setPayroll] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    pay_period_start: '',
    pay_period_end: '',
    regular_hours: '',
    overtime_hours: '',
    gross_pay: '',
    deductions: '',
    net_pay: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [payrollRes, employeesRes] = await Promise.all([
        payrollService.getAll(),
        employeeService.getAll(),
      ]);
      setPayroll(payrollRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-calculate net pay
      if (name === 'gross_pay' || name === 'deductions') {
        const gross = parseFloat(updated.gross_pay) || 0;
        const deduct = parseFloat(updated.deductions) || 0;
        updated.net_pay = (gross - deduct).toFixed(2);
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await payrollService.create(formData);
      setShowForm(false);
      setFormData({
        employee_id: '',
        pay_period_start: '',
        pay_period_end: '',
        regular_hours: '',
        overtime_hours: '',
        gross_pay: '',
        deductions: '',
        net_pay: '',
      });
      loadData();
    } catch (error) {
      alert('Error creating payroll: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Payroll Management</span>
          {isAdmin && (
            <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
              {showForm ? 'Cancel' : 'New Payroll Entry'}
            </button>
          )}
        </div>

        {showForm && isAdmin && (
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
                <label className="form-label">Pay Period Start</label>
                <input
                  type="date"
                  name="pay_period_start"
                  className="form-input"
                  value={formData.pay_period_start}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pay Period End</label>
                <input
                  type="date"
                  name="pay_period_end"
                  className="form-input"
                  value={formData.pay_period_end}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Regular Hours</label>
                <input
                  type="number"
                  step="0.01"
                  name="regular_hours"
                  className="form-input"
                  value={formData.regular_hours}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Overtime Hours</label>
                <input
                  type="number"
                  step="0.01"
                  name="overtime_hours"
                  className="form-input"
                  value={formData.overtime_hours}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gross Pay</label>
                <input
                  type="number"
                  step="0.01"
                  name="gross_pay"
                  className="form-input"
                  value={formData.gross_pay}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Deductions</label>
                <input
                  type="number"
                  step="0.01"
                  name="deductions"
                  className="form-input"
                  value={formData.deductions}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Net Pay</label>
                <input
                  type="number"
                  step="0.01"
                  name="net_pay"
                  className="form-input"
                  value={formData.net_pay}
                  readOnly
                  style={{ backgroundColor: '#f3f4f6' }}
                />
              </div>

              <button type="submit" className="btn btn-primary">Create Payroll Entry</button>
            </form>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">Payroll Records</div>
        <div className="card-body">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Period</th>
                <th>Regular Hours</th>
                <th>OT Hours</th>
                <th>Gross Pay</th>
                <th>Deductions</th>
                <th>Net Pay</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map(record => (
                <tr key={record.id}>
                  <td>{record.first_name} {record.last_name}</td>
                  <td>
                    {new Date(record.pay_period_start).toLocaleDateString()} - 
                    {new Date(record.pay_period_end).toLocaleDateString()}
                  </td>
                  <td>{record.regular_hours || 'N/A'}</td>
                  <td>{record.overtime_hours || 'N/A'}</td>
                  <td>{formatCurrency(record.gross_pay)}</td>
                  <td>{formatCurrency(record.deductions)}</td>
                  <td><strong>{formatCurrency(record.net_pay)}</strong></td>
                  <td>
                    <span className={`badge badge-${record.status === 'paid' ? 'approved' : 'pending'}`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Payroll;
