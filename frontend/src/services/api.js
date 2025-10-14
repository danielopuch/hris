import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth services
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
};

// Employee services
export const employeeService = {
  getAll: () => api.get('/employees'),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
};

// Timesheet services
export const timesheetService = {
  getAll: (params) => api.get('/timesheets', { params }),
  getById: (id) => api.get(`/timesheets/${id}`),
  create: (data) => api.post('/timesheets', data),
  update: (id, data) => api.put(`/timesheets/${id}`, data),
  approve: (id, data) => api.patch(`/timesheets/${id}/approve`, data),
  bulkApprove: (data) => api.post('/timesheets/bulk-approve', data),
  delete: (id) => api.delete(`/timesheets/${id}`),
  getDailySummary: (date, employeeId = null) => 
    api.get('/timesheets/daily-summary', { params: { date, employee_id: employeeId } }),
  getSettings: () => api.get('/timesheets/settings'),
};

// Leave services
export const leaveService = {
  getAll: () => api.get('/leave'),
  create: (data) => api.post('/leave', data),
  update: (id, data) => api.put(`/leave/${id}`, data),
  approve: (id, data) => api.patch(`/leave/${id}/approve`, data),
  delete: (id) => api.delete(`/leave/${id}`),
};

// Appraisal services
export const appraisalService = {
  getAll: () => api.get('/appraisals'),
  getById: (id) => api.get(`/appraisals/${id}`),
  create: (data) => api.post('/appraisals', data),
  update: (id, data) => api.put(`/appraisals/${id}`, data),
  complete: (id) => api.patch(`/appraisals/${id}/complete`),
};

// Payroll services
export const payrollService = {
  getAll: () => api.get('/payroll'),
  getByEmployee: (employeeId) => api.get(`/payroll/employee/${employeeId}`),
  create: (data) => api.post('/payroll', data),
  updateStatus: (id, data) => api.patch(`/payroll/${id}/status`, data),
  delete: (id) => api.delete(`/payroll/${id}`),
};

// Profile services
export const profileService = {
  getProfile: () => api.get('/profile/me'),
  updateProfile: (data) => api.put('/profile/me', data),
  getLeaveBalance: () => api.get('/profile/me/leave-balance'),
  getPendingApprovals: () => api.get('/profile/me/pending-approvals'),
  getActivity: () => api.get('/profile/me/activity'),
};

// Holidays services
export const holidaysService = {
  getAll: (year) => api.get('/holidays', { params: { year } }),
  getById: (id) => api.get(`/holidays/${id}`),
  create: (data) => api.post('/holidays', data),
  update: (id, data) => api.put(`/holidays/${id}`, data),
  delete: (id) => api.delete(`/holidays/${id}`),
  getUpcoming: (days = 30) => api.get('/holidays/upcoming', { params: { days } }),
};

// Team services
export const teamService = {
  getMembers: () => api.get('/team/members'),
  getStats: () => api.get('/team/stats'),
  getActivity: () => api.get('/team/activity'),
};

// Projects services
export const projectsService = {
  getAll: (search = '') => api.get('/projects', { params: { search } }),
  getById: (id) => api.get(`/projects/${id}`),
  getMyProjects: () => api.get('/projects/my-projects'),
  getProjectHours: (id) => api.get(`/projects/${id}/hours`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  close: (id, data = {}) => api.post(`/projects/${id}/close`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

// Reports services
export const reportsService = {
  getTimesheets: (params) => api.get('/reports/timesheets', { params }),
  getLeave: (params) => api.get('/reports/leave', { params }),
  getPayroll: (params) => api.get('/reports/payroll', { params }),
  getAppraisals: (params) => api.get('/reports/appraisals', { params }),
  getSummary: () => api.get('/reports/summary'),
};

export default api;
