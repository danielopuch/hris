import React, { useState, useEffect } from 'react';
import { employeeService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/StaffManagement.css';

const StaffManagement = () => {
  const { user, isHR, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  useEffect(() => {
    if (!user) return;
    if (!isHR && !isAdmin) {
      navigate('/');
      return;
    }
    loadStaff();
  }, [user, isHR, isAdmin, navigate]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const response = await employeeService.getAll();
      setStaff(response.data || []);
    } catch (err) {
      console.error('Failed to load staff:', err);
      setError('Unable to load staff list.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee({
      ...employee,
      supervisor_id: employee.supervisor_id || ''
    });
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setEditingEmployee(null);
    setError('');
    setSuccess('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditingEmployee(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await employeeService.update(editingEmployee.id, {
        first_name: editingEmployee.first_name,
        last_name: editingEmployee.last_name,
        department: editingEmployee.department,
        position: editingEmployee.position,
        supervisor_id: editingEmployee.supervisor_id || null,
        salary: editingEmployee.salary,
        status: editingEmployee.status
      });

      setSuccess(`${editingEmployee.first_name} ${editingEmployee.last_name} updated successfully!`);
      setEditingEmployee(null);
      await loadStaff();
    } catch (err) {
      console.error('Failed to update employee:', err);
      setError(err.response?.data?.error || 'Failed to update employee.');
    }
  };

  const departments = [...new Set(staff.map(s => s.department).filter(Boolean))];
  
  const filteredStaff = staff.filter(employee => {
    const matchesSearch = 
      !searchTerm ||
      `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = !filterDepartment || employee.department === filterDepartment;
    
    return matchesSearch && matchesDepartment;
  });

  const potentialSupervisors = staff.filter(s => 
    s.id !== editingEmployee?.id && 
    (s.role === 'manager' || s.role === 'admin' || s.position?.toLowerCase().includes('manager') || s.position?.toLowerCase().includes('director'))
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading staff...</p>
      </div>
    );
  }

  return (
    <div className="staff-management-page">
      <div className="page-header">
        <div className="header-content">
          <h1>👥 Staff Management</h1>
          <p className="subtitle">Manage employee details and supervisor assignments</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="staff-controls">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search by name, ID, or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="filter-select"
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        <button className="btn btn-light" onClick={loadStaff}>
          🔄 Refresh
        </button>
      </div>

      <div className="staff-stats">
        <div className="stat-item">
          <span className="stat-number">{filteredStaff.length}</span>
          <span className="stat-label">Staff Members</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{filteredStaff.filter(s => s.status === 'active').length}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{departments.length}</span>
          <span className="stat-label">Departments</span>
        </div>
      </div>

      {editingEmployee && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Employee: {editingEmployee.first_name} {editingEmployee.last_name}</h3>
              <button className="modal-close" onClick={handleCancelEdit}>×</button>
            </div>
            <form onSubmit={handleSave} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={editingEmployee.first_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={editingEmployee.last_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    name="department"
                    value={editingEmployee.department || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <input
                    type="text"
                    name="position"
                    value={editingEmployee.position || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Supervisor</label>
                  <select
                    name="supervisor_id"
                    value={editingEmployee.supervisor_id || ''}
                    onChange={handleInputChange}
                  >
                    <option value="">No Supervisor</option>
                    {potentialSupervisors.map(sup => (
                      <option key={sup.id} value={sup.id}>
                        {sup.first_name} {sup.last_name} ({sup.position})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={editingEmployee.status}
                    onChange={handleInputChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-light" onClick={handleCancelEdit}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="staff-table-container">
        <table className="staff-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Position</th>
              <th>Supervisor</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-message">
                  No staff members found
                </td>
              </tr>
            ) : (
              filteredStaff.map(employee => (
                <tr key={employee.id}>
                  <td className="employee-id">{employee.employee_id}</td>
                  <td className="employee-name">
                    <div>
                      <strong>{employee.first_name} {employee.last_name}</strong>
                      {employee.role && <span className="role-tag">{employee.role}</span>}
                    </div>
                  </td>
                  <td>{employee.department || '—'}</td>
                  <td>{employee.position || '—'}</td>
                  <td>
                    {employee.supervisor_first_name ? (
                      `${employee.supervisor_first_name} ${employee.supervisor_last_name}`
                    ) : (
                      <span className="no-supervisor">Not assigned</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge status-${employee.status}`}>
                      {employee.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => handleEdit(employee)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffManagement;
