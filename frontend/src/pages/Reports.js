import React, { useState, useEffect } from 'react';
import { reportsService, employeeService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Reports = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reportType, setReportType] = useState('timesheets');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [employees, setEmployees] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    employeeId: '',
    status: '',
    leaveType: '',
    projectCode: ''
  });

  useEffect(() => {
    // Only managers and admins can access reports
    if (user?.role === 'employee') {
      navigate('/');
      return;
    }
    
    loadEmployees();
  }, [user, navigate]);

  const loadEmployees = async () => {
    try {
      const response = await employeeService.getAll();
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      let response;
      const params = {};
      
      // Add filters to params
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.employeeId) params.employeeId = filters.employeeId;
      if (filters.status) params.status = filters.status;
      if (filters.leaveType) params.leaveType = filters.leaveType;
      if (filters.projectCode) params.projectCode = filters.projectCode;

      switch (reportType) {
        case 'timesheets':
          response = await reportsService.getTimesheets(params);
          break;
        case 'leave':
          response = await reportsService.getLeave(params);
          break;
        case 'payroll':
          response = await reportsService.getPayroll(params);
          break;
        case 'appraisals':
          response = await reportsService.getAppraisals(params);
          break;
        default:
          response = await reportsService.getTimesheets(params);
      }

      setReportData(response.data);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      employeeId: '',
      status: '',
      leaveType: '',
      projectCode: ''
    });
    setReportData(null);
  };

  const exportToCSV = () => {
    if (!reportData) return;

    let csvContent = '';
    let rows = [];

    switch (reportType) {
      case 'timesheets':
        csvContent = 'Date,Employee,Department,Hours,Project,Status,Description\n';
        rows = reportData.timesheets.map(t => 
          `${t.date},"${t.first_name} ${t.last_name}",${t.department},${t.hours_worked},${t.project_code || 'N/A'},${t.status},"${t.description || ''}"`
        );
        break;
      case 'leave':
        csvContent = 'Start Date,End Date,Employee,Department,Leave Type,Days,Status,Reason\n';
        rows = reportData.leaveRequests.map(l => 
          `${l.start_date},${l.end_date},"${l.first_name} ${l.last_name}",${l.department},${l.leave_type},${l.days_requested},${l.status},"${l.reason || ''}"`
        );
        break;
      case 'payroll':
        csvContent = 'Period Start,Period End,Employee,Department,Basic Salary,Allowances,Deductions,Gross Pay,Net Pay,Status\n';
        rows = reportData.payrollRecords.map(p => 
          `${p.pay_period_start},${p.pay_period_end},"${p.first_name} ${p.last_name}",${p.department},${p.basic_salary},${p.allowances},${p.deductions},${p.gross_pay},${p.net_pay},${p.status}`
        );
        break;
      case 'appraisals':
        csvContent = 'Review Period,Employee,Department,Performance Score,Status\n';
        rows = reportData.appraisals.map(a => 
          `${a.review_period},"${a.first_name} ${a.last_name}",${a.department},${a.performance_score},${a.status}`
        );
        break;
      default:
        return;
    }

    csvContent += rows.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="reports-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>📊 Advanced Reports</h1>
          <p className="subtitle">Generate comprehensive reports with custom filters</p>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="report-controls">
        <div className="report-type-selector">
          <h3>Select Report Type</h3>
          <div className="report-type-grid">
            <button
              className={`report-type-btn ${reportType === 'timesheets' ? 'active' : ''}`}
              onClick={() => { setReportType('timesheets'); setReportData(null); }}
            >
              <div className="type-icon">⏰</div>
              <div className="type-label">Timesheets</div>
            </button>
            <button
              className={`report-type-btn ${reportType === 'leave' ? 'active' : ''}`}
              onClick={() => { setReportType('leave'); setReportData(null); }}
            >
              <div className="type-icon">🏖️</div>
              <div className="type-label">Leave</div>
            </button>
            <button
              className={`report-type-btn ${reportType === 'payroll' ? 'active' : ''}`}
              onClick={() => { setReportType('payroll'); setReportData(null); }}
            >
              <div className="type-icon">💰</div>
              <div className="type-label">Payroll</div>
            </button>
            <button
              className={`report-type-btn ${reportType === 'appraisals' ? 'active' : ''}`}
              onClick={() => { setReportType('appraisals'); setReportData(null); }}
            >
              <div className="type-icon">📈</div>
              <div className="type-label">Appraisals</div>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="report-filters">
          <h3>Filters</h3>
          <div className="filters-grid">
            <div className="filter-item">
              <label htmlFor="startDate">Start Date</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="form-control"
              />
            </div>

            <div className="filter-item">
              <label htmlFor="endDate">End Date</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="form-control"
              />
            </div>

            <div className="filter-item">
              <label htmlFor="employeeId">Employee</label>
              <select
                id="employeeId"
                name="employeeId"
                value={filters.employeeId}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="form-control"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                {reportType === 'appraisals' && <option value="completed">Completed</option>}
                {reportType === 'payroll' && <option value="processed">Processed</option>}
              </select>
            </div>

            {reportType === 'leave' && (
              <div className="filter-item">
                <label htmlFor="leaveType">Leave Type</label>
                <select
                  id="leaveType"
                  name="leaveType"
                  value={filters.leaveType}
                  onChange={handleFilterChange}
                  className="form-control"
                >
                  <option value="">All Types</option>
                  <option value="Annual">Annual</option>
                  <option value="Sick">Sick</option>
                  <option value="Maternity">Maternity</option>
                  <option value="Paternity">Paternity</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>
            )}

            {reportType === 'timesheets' && (
              <div className="filter-item">
                <label htmlFor="projectCode">Project Code</label>
                <input
                  type="text"
                  id="projectCode"
                  name="projectCode"
                  value={filters.projectCode}
                  onChange={handleFilterChange}
                  className="form-control"
                  placeholder="Enter project code"
                />
              </div>
            )}
          </div>

          <div className="filter-actions">
            <button 
              onClick={generateReport}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Generating...' : '🔍 Generate Report'}
            </button>
            <button 
              onClick={clearFilters}
              className="btn btn-secondary"
            >
              🔄 Clear Filters
            </button>
            {reportData && (
              <button 
                onClick={exportToCSV}
                className="btn btn-success"
              >
                📥 Export to CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Report Results */}
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Generating report...</p>
        </div>
      )}

      {reportData && !loading && (
        <div className="report-results">
          {/* Summary Statistics */}
          <div className="report-summary">
            <h3>📈 Summary</h3>
            <div className="summary-grid">
              {reportType === 'timesheets' && reportData.summary && (
                <>
                  <div className="summary-card">
                    <div className="summary-label">Total Entries</div>
                    <div className="summary-value">{reportData.summary.totalEntries}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Total Hours</div>
                    <div className="summary-value">{reportData.summary.totalHours}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Approved Hours</div>
                    <div className="summary-value">{reportData.summary.approvedHours}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Pending Hours</div>
                    <div className="summary-value">{reportData.summary.pendingHours}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Avg Hours/Entry</div>
                    <div className="summary-value">{reportData.summary.averageHoursPerEntry}</div>
                  </div>
                </>
              )}

              {reportType === 'leave' && reportData.summary && (
                <>
                  <div className="summary-card">
                    <div className="summary-label">Total Requests</div>
                    <div className="summary-value">{reportData.summary.totalRequests}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Total Days</div>
                    <div className="summary-value">{reportData.summary.totalDays}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Approved Days</div>
                    <div className="summary-value">{reportData.summary.approvedDays}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Pending Days</div>
                    <div className="summary-value">{reportData.summary.pendingDays}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Avg Days/Request</div>
                    <div className="summary-value">{reportData.summary.averageDaysPerRequest}</div>
                  </div>
                </>
              )}

              {reportType === 'payroll' && reportData.summary && (
                <>
                  <div className="summary-card">
                    <div className="summary-label">Total Records</div>
                    <div className="summary-value">{reportData.summary.totalRecords}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Total Gross Pay</div>
                    <div className="summary-value">{formatCurrency(reportData.summary.totalGrossPay)}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Total Net Pay</div>
                    <div className="summary-value">{formatCurrency(reportData.summary.totalNetPay)}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Total Allowances</div>
                    <div className="summary-value">{formatCurrency(reportData.summary.totalAllowances)}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Total Deductions</div>
                    <div className="summary-value">{formatCurrency(reportData.summary.totalDeductions)}</div>
                  </div>
                </>
              )}

              {reportType === 'appraisals' && reportData.summary && (
                <>
                  <div className="summary-card">
                    <div className="summary-label">Total Reviews</div>
                    <div className="summary-value">{reportData.summary.totalReviews}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Average Score</div>
                    <div className="summary-value">{reportData.summary.averageScore}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Completed</div>
                    <div className="summary-value">{reportData.summary.completedReviews}</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-label">Pending</div>
                    <div className="summary-value">{reportData.summary.pendingReviews}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Charts/Analytics Section */}
          <div className="report-analytics">
            <div className="analytics-row">
              {/* By Employee Chart */}
              {reportData.byEmployee && reportData.byEmployee.length > 0 && (
                <div className="analytics-card">
                  <h4>📊 By Employee</h4>
                  <div className="chart-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Department</th>
                          {reportType === 'timesheets' && <><th>Hours</th><th>Entries</th></>}
                          {reportType === 'leave' && <><th>Days</th><th>Requests</th></>}
                          {reportType === 'payroll' && <><th>Gross Pay</th><th>Net Pay</th></>}
                          {reportType === 'appraisals' && <><th>Avg Score</th><th>Reviews</th></>}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.byEmployee.slice(0, 10).map((item, index) => (
                          <tr key={index}>
                            <td className="employee-name">{item.name}</td>
                            <td>{item.department}</td>
                            {reportType === 'timesheets' && (
                              <>
                                <td><strong>{item.totalHours}</strong></td>
                                <td>{item.entries}</td>
                              </>
                            )}
                            {reportType === 'leave' && (
                              <>
                                <td><strong>{item.totalDays}</strong></td>
                                <td>{item.requests}</td>
                              </>
                            )}
                            {reportType === 'payroll' && (
                              <>
                                <td><strong>{formatCurrency(item.totalGrossPay)}</strong></td>
                                <td>{formatCurrency(item.totalNetPay)}</td>
                              </>
                            )}
                            {reportType === 'appraisals' && (
                              <>
                                <td><strong>{item.averageScore}</strong></td>
                                <td>{item.reviews}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* By Project/Type/Status Chart */}
              {reportType === 'timesheets' && reportData.byProject && reportData.byProject.length > 0 && (
                <div className="analytics-card">
                  <h4>📦 By Project</h4>
                  <div className="chart-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Project Code</th>
                          <th>Total Hours</th>
                          <th>Entries</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.byProject.slice(0, 10).map((item, index) => (
                          <tr key={index}>
                            <td className="project-code">{item.projectCode}</td>
                            <td><strong>{item.totalHours}</strong></td>
                            <td>{item.entries}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportType === 'leave' && reportData.byLeaveType && reportData.byLeaveType.length > 0 && (
                <div className="analytics-card">
                  <h4>🏖️ By Leave Type</h4>
                  <div className="chart-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Leave Type</th>
                          <th>Total Days</th>
                          <th>Requests</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.byLeaveType.map((item, index) => (
                          <tr key={index}>
                            <td className="leave-type">{item.leaveType}</td>
                            <td><strong>{item.totalDays}</strong></td>
                            <td>{item.requests}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportType === 'appraisals' && reportData.byScoreRange && (
                <div className="analytics-card">
                  <h4>⭐ Performance Distribution</h4>
                  <div className="chart-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Score Range</th>
                          <th>Count</th>
                          <th>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="score-excellent">Excellent (9-10)</td>
                          <td><strong>{reportData.byScoreRange.excellent.count}</strong></td>
                          <td>{reportData.summary.totalReviews > 0 ? ((reportData.byScoreRange.excellent.count / reportData.summary.totalReviews) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr>
                          <td className="score-good">Good (7-8.9)</td>
                          <td><strong>{reportData.byScoreRange.good.count}</strong></td>
                          <td>{reportData.summary.totalReviews > 0 ? ((reportData.byScoreRange.good.count / reportData.summary.totalReviews) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr>
                          <td className="score-satisfactory">Satisfactory (5-6.9)</td>
                          <td><strong>{reportData.byScoreRange.satisfactory.count}</strong></td>
                          <td>{reportData.summary.totalReviews > 0 ? ((reportData.byScoreRange.satisfactory.count / reportData.summary.totalReviews) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr>
                          <td className="score-needs-improvement">Needs Improvement (&lt; 5)</td>
                          <td><strong>{reportData.byScoreRange.needsImprovement.count}</strong></td>
                          <td>{reportData.summary.totalReviews > 0 ? ((reportData.byScoreRange.needsImprovement.count / reportData.summary.totalReviews) * 100).toFixed(1) : 0}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Status Breakdown */}
            {reportData.byStatus && reportData.byStatus.length > 0 && (
              <div className="analytics-card full-width">
                <h4>📋 Status Breakdown</h4>
                <div className="status-breakdown">
                  {reportData.byStatus.map((item, index) => (
                    <div key={index} className="status-item">
                      <div 
                        className="status-badge-large"
                        style={{ backgroundColor: getStatusColor(item.status) }}
                      >
                        {item.status}
                      </div>
                      <div className="status-details">
                        <div className="status-count">{item.count} items</div>
                        {reportType === 'timesheets' && item.hours && (
                          <div className="status-metric">{item.hours} hours</div>
                        )}
                        {reportType === 'leave' && item.days && (
                          <div className="status-metric">{item.days} days</div>
                        )}
                        {reportType === 'payroll' && item.grossPay && (
                          <div className="status-metric">{formatCurrency(item.grossPay)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Detailed Data Table */}
          <div className="report-table-section">
            <h3>📋 Detailed Data</h3>
            <div className="table-container">
              {reportType === 'timesheets' && reportData.timesheets && (
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Hours</th>
                      <th>Project</th>
                      <th>Status</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.timesheets.map((item, index) => (
                      <tr key={index}>
                        <td>{formatDate(item.date)}</td>
                        <td>{item.first_name} {item.last_name}</td>
                        <td>{item.department}</td>
                        <td><strong>{item.hours_worked}</strong></td>
                        <td>{item.project_code || 'N/A'}</td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(item.status) }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="description-cell">{item.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === 'leave' && reportData.leaveRequests && (
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Leave Type</th>
                      <th>Days</th>
                      <th>Status</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.leaveRequests.map((item, index) => (
                      <tr key={index}>
                        <td>{formatDate(item.start_date)}</td>
                        <td>{formatDate(item.end_date)}</td>
                        <td>{item.first_name} {item.last_name}</td>
                        <td>{item.department}</td>
                        <td>{item.leave_type}</td>
                        <td><strong>{item.days_requested}</strong></td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(item.status) }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="description-cell">{item.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === 'payroll' && reportData.payrollRecords && (
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Period Start</th>
                      <th>Period End</th>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Basic Salary</th>
                      <th>Allowances</th>
                      <th>Deductions</th>
                      <th>Gross Pay</th>
                      <th>Net Pay</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.payrollRecords.map((item, index) => (
                      <tr key={index}>
                        <td>{formatDate(item.pay_period_start)}</td>
                        <td>{formatDate(item.pay_period_end)}</td>
                        <td>{item.first_name} {item.last_name}</td>
                        <td>{item.department}</td>
                        <td>{formatCurrency(item.basic_salary)}</td>
                        <td>{formatCurrency(item.allowances)}</td>
                        <td>{formatCurrency(item.deductions)}</td>
                        <td><strong>{formatCurrency(item.gross_pay)}</strong></td>
                        <td><strong>{formatCurrency(item.net_pay)}</strong></td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(item.status) }}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === 'appraisals' && reportData.appraisals && (
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Review Period</th>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Score</th>
                      <th>Strengths</th>
                      <th>Areas for Improvement</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.appraisals.map((item, index) => (
                      <tr key={index}>
                        <td>{item.review_period}</td>
                        <td>{item.first_name} {item.last_name}</td>
                        <td>{item.department}</td>
                        <td><strong>{item.performance_score}</strong></td>
                        <td className="description-cell">{item.strengths || '-'}</td>
                        <td className="description-cell">{item.areas_for_improvement || '-'}</td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(item.status) }}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && !reportData && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Report Generated</h3>
          <p>Select a report type, apply filters, and click "Generate Report" to view data.</p>
        </div>
      )}
    </div>
  );
};

export default Reports;
