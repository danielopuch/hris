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
  getAll: (status) => api.get('/timesheets', { params: { status } }),
  create: (data) => api.post('/timesheets', data),
  update: (id, data) => api.put(`/timesheets/${id}`, data),
  approve: (id, data) => api.patch(`/timesheets/${id}/approve`, data),
  delete: (id) => api.delete(`/timesheets/${id}`),
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

export default api;
