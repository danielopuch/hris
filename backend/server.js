require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./database');

// Initialize routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const timesheetRoutes = require('./routes/timesheets');
const leaveRoutes = require('./routes/leave');
const appraisalRoutes = require('./routes/appraisals');
const payrollRoutes = require('./routes/payroll');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
initDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/appraisals', appraisalRoutes);
app.use('/api/payroll', payrollRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'HRIS API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`HRIS Backend running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
