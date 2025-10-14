import React, { useEffect, useState, useMemo } from 'react';
import { projectsService, employeeService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/Projects.css';

const defaultForm = {
  project_code: '',
  project_name: '',
  sponsor_donor: '',
  client_name: '',
  start_date: '',
  end_date: '',
  budget: '',
  status: 'active',
  department: '',
  manager_id: '',
};

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
];

const Projects = () => {
  const { user, isManager, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState(defaultForm);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [closeModalProject, setCloseModalProject] = useState(null);
  const [closeDate, setCloseDate] = useState('');

  const canManage = useMemo(() => isManager || isAdmin, [isManager, isAdmin]);

  useEffect(() => {
    if (!user) return;
    if (!canManage) {
      navigate('/');
      return;
    }

    const bootstrap = async () => {
      await Promise.all([loadProjects(), loadEmployees()]);
      setLoading(false);
    };

    bootstrap();
  }, [user, canManage, navigate]);

  const loadProjects = async () => {
    try {
      const { data } = await projectsService.getAll();
      setProjects(data || []);
    } catch (err) {
      console.error('Failed to load projects', err);
      setError('Unable to load projects.');
    }
  };

  const loadEmployees = async () => {
    try {
      const { data } = await employeeService.getAll();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load employees', err);
    }
  };

  const resetFeedback = () => {
    setMessage('');
    setError('');
  };

  const resetForm = () => {
    setFormData(defaultForm);
    setCurrentProjectId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.project_code.trim() || !formData.project_name.trim()) {
      setError('Project code and name are required.');
      return false;
    }

    if (!formData.sponsor_donor.trim()) {
      setError('Sponsor/Donor is required.');
      return false;
    }

    if (!formData.start_date || !formData.end_date) {
      setError('Start date and end date are required.');
      return false;
    }

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError('Invalid date format.');
      return false;
    }

    if (end < start) {
      setError('End date cannot be earlier than start date.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetFeedback();

    if (!validateForm()) return;

    setSaving(true);

    try {
      const payload = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        manager_id: formData.manager_id || null,
      };

      if (currentProjectId) {
        await projectsService.update(currentProjectId, payload);
        setMessage('Project updated successfully.');
      } else {
        await projectsService.create(payload);
        setMessage('Project created successfully.');
      }

      await loadProjects();
      resetForm();
    } catch (err) {
      console.error('Failed to save project', err);
      setError(err.response?.data?.error || 'Failed to save project.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (project) => {
    resetFeedback();
    setCurrentProjectId(project.id);
    setFormData({
      project_code: project.project_code || '',
      project_name: project.project_name || '',
      sponsor_donor: project.sponsor_donor || '',
      client_name: project.client_name || '',
      start_date: project.start_date ? project.start_date.substring(0, 10) : '',
      end_date: project.end_date ? project.end_date.substring(0, 10) : '',
      budget: project.budget !== null && project.budget !== undefined ? String(project.budget) : '',
      status: project.status || 'active',
      department: project.department || '',
      manager_id: project.manager_id ? String(project.manager_id) : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    resetForm();
    resetFeedback();
  };

  const openCloseModal = (project) => {
    setCloseModalProject(project);
    const defaultDate = project.end_date ? project.end_date.substring(0, 10) : new Date().toISOString().split('T')[0];
    setCloseDate(defaultDate);
    resetFeedback();
  };

  const handleCloseProject = async (e) => {
    e.preventDefault();
    if (!closeModalProject) return;

    try {
      await projectsService.close(closeModalProject.id, { end_date: closeDate });
      setMessage('Project closed successfully.');
      setCloseModalProject(null);
      setCloseDate('');
      await loadProjects();
    } catch (err) {
      console.error('Failed to close project', err);
      setError(err.response?.data?.error || 'Failed to close project.');
    }
  };

  const managerOptions = useMemo(() => {
    return employees.filter((emp) => emp.role === 'manager' || emp.role === 'admin');
  }, [employees]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="projects-page">
      <div className="page-header">
        <div className="header-content">
          <h1>📁 Project Portfolio</h1>
          <p className="subtitle">Track sponsor details, timelines, and status for every initiative.</p>
        </div>
      </div>

      <div className="projects-layout">
        <div className="project-form-card">
          <div className="card-header">
            <h2>{currentProjectId ? 'Update Project' : 'Create Project'}</h2>
            {currentProjectId && (
              <button className="btn btn-secondary" onClick={handleCancelEdit}>
                Cancel Edit
              </button>
            )}
          </div>

          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          <form className="project-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Project Code<span className="required">*</span></label>
                <input
                  type="text"
                  name="project_code"
                  value={formData.project_code}
                  onChange={handleChange}
                  placeholder="e.g. PROJ-001"
                  required
                />
              </div>

              <div className="form-group">
                <label>Project Name<span className="required">*</span></label>
                <input
                  type="text"
                  name="project_name"
                  value={formData.project_name}
                  onChange={handleChange}
                  placeholder="Project name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Sponsor / Donor<span className="required">*</span></label>
                <input
                  type="text"
                  name="sponsor_donor"
                  value={formData.sponsor_donor}
                  onChange={handleChange}
                  placeholder="USAID, Internal, etc."
                  required
                />
              </div>

              <div className="form-group">
                <label>Client / Implementer</label>
                <input
                  type="text"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  placeholder="Client or partner"
                />
              </div>

              <div className="form-group">
                <label>Start Date<span className="required">*</span></label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Date<span className="required">*</span></label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Budget (USD)</label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  placeholder="Optional budget"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Department"
                />
              </div>

              <div className="form-group">
                <label>Project Manager</label>
                <select name="manager_id" value={formData.manager_id} onChange={handleChange}>
                  <option value="">Unassigned</option>
                  {managerOptions.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.first_name} {manager.last_name} ({manager.department || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : currentProjectId ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>

        <div className="project-list-card">
          <div className="list-header">
            <h2>Active Projects</h2>
            <button className="btn btn-light" onClick={loadProjects}>
              Refresh
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No projects found</h3>
              <p>Create a project to get started.</p>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map((project) => (
                <div key={project.id} className={`project-card status-${project.status}`}>
                  <div className="project-card-header">
                    <div>
                      <h3>{project.project_name}</h3>
                      <p className="project-code">{project.project_code}</p>
                    </div>
                    <span className="status-pill">{project.status}</span>
                  </div>

                  <div className="project-meta">
                    <div>
                      <span className="meta-label">Sponsor / Donor</span>
                      <span className="meta-value">{project.sponsor_donor || '—'}</span>
                    </div>
                    <div>
                      <span className="meta-label">Client / Implementer</span>
                      <span className="meta-value">{project.client_name || '—'}</span>
                    </div>
                    <div>
                      <span className="meta-label">Timeline</span>
                      <span className="meta-value">
                        {project.start_date ? new Date(project.start_date).toLocaleDateString() : '—'}
                        {' '}–{' '}
                        {project.end_date ? new Date(project.end_date).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="meta-label">Budget</span>
                      <span className="meta-value">
                        {project.budget ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(project.budget) : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="meta-label">Department</span>
                      <span className="meta-value">{project.department || '—'}</span>
                    </div>
                    <div>
                      <span className="meta-label">Manager</span>
                      <span className="meta-value">{project.manager_name || 'Unassigned'}</span>
                    </div>
                  </div>

                  <div className="project-actions">
                    <button className="btn btn-secondary" onClick={() => handleEdit(project)}>
                      Edit Details
                    </button>
                    {project.status !== 'completed' && (
                      <button className="btn btn-warning" onClick={() => openCloseModal(project)}>
                        Close Project
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {closeModalProject && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <h3>Close Project</h3>
              <button className="modal-close" onClick={() => setCloseModalProject(null)}>×</button>
            </div>
            <form onSubmit={handleCloseProject} className="modal-body">
              <p>You're about to mark <strong>{closeModalProject.project_name}</strong> as completed.</p>
              <label>Final End Date</label>
              <input
                type="date"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                required
              />
              <div className="modal-actions">
                <button type="button" className="btn btn-light" onClick={() => setCloseModalProject(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-warning">
                  Confirm Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
