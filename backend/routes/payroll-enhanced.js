const express = require('express');
const router = express.Router();
const { getQuery, runQuery, allQuery } = require('../database-improved');
const { verifyToken, isAdmin } = require('../middleware/auth');

/**
 * UGANDA PAYROLL COMPUTATION SYSTEM
 * 
 * Tax Year: 2024/2025
 * PAYE Bands (Monthly):
 * - First UGX 235,000: 0%
 * - Next UGX 100,000 (235,001 - 335,000): 10%
 * - Next UGX 165,000 (335,001 - 500,000): 20%
 * - Next UGX 3,015,000 (500,001 - 3,515,000): 30%
 * - Above UGX 3,515,000: 40%
 * 
 * NSSF:
 * - Employee: 5% of gross
 * - Employer: 10% of gross
 * 
 * LST (Local Service Tax): July - October only
 * - Enforced single deduction in August
 * - Based on annual gross income bands
 */

// LST bands (annual gross income)
const LST_BANDS = [
  { min: 0, max: 2400000, monthly: 0 },
  { min: 2400001, max: 5000000, monthly: 5000 },
  { min: 5000001, max: 10000000, monthly: 10000 },
  { min: 10000001, max: Infinity, monthly: 20000 }
];

// PAYE tax bands (monthly taxable income)
const PAYE_BANDS = [
  { min: 0, max: 235000, rate: 0 },
  { min: 235001, max: 335000, rate: 0.10 },
  { min: 335001, max: 500000, rate: 0.20 },
  { min: 500001, max: 3515000, rate: 0.30 },
  { min: 3515001, max: Infinity, rate: 0.40 }
];

const NSSF_EMPLOYEE_RATE = 0.05;
const NSSF_EMPLOYER_RATE = 0.10;
const TAX_FREE_ALLOWANCE = 235000;
const HOUSING_TAXABLE_THRESHOLD = 0.15; // 15% threshold

/**
 * Calculate LST based on annual gross income
 */
function calculateLST(annualGross, month) {
  // LST only applies in July (7), August (8), September (9), October (10)
  // Single deduction in August (month 8)
  if (month !== 8) {
    return 0;
  }

  for (const band of LST_BANDS) {
    if (annualGross >= band.min && annualGross <= band.max) {
      return band.monthly;
    }
  }
  return 0;
}

/**
 * Calculate PAYE using progressive tax bands
 */
function calculatePAYE(taxableIncome) {
  let tax = 0;
  let remainingIncome = taxableIncome;

  for (let i = 0; i < PAYE_BANDS.length; i++) {
    const band = PAYE_BANDS[i];
    
    if (remainingIncome <= 0) break;

    let taxableInBand;
    if (i === PAYE_BANDS.length - 1) {
      // Last band - tax all remaining
      taxableInBand = remainingIncome;
    } else {
      const bandSize = band.max - band.min + 1;
      taxableInBand = Math.min(remainingIncome, bandSize);
    }

    tax += taxableInBand * band.rate;
    remainingIncome -= taxableInBand;
  }

  return Math.round(tax);
}

/**
 * Compute complete payroll for an employee
 */
function computePayroll(payrollData, month = new Date().getMonth() + 1) {
  const {
    base_salary,
    housing_allowance = 0,
    transport_allowance = 0,
    other_allowances = 0,
    overtime_pay = 0,
    bonuses = 0,
    medical_reimbursement = 0, // Non-taxable
    other_non_taxable = 0
  } = payrollData;

  // 1. Calculate Gross Pay (exclude non-taxable items)
  const gross_pay = parseFloat(base_salary) + 
                    parseFloat(housing_allowance) + 
                    parseFloat(transport_allowance) + 
                    parseFloat(other_allowances) + 
                    parseFloat(overtime_pay) + 
                    parseFloat(bonuses);

  // 2. Calculate NSSF Employee Contribution (5%)
  const nssf_employee = Math.round(gross_pay * NSSF_EMPLOYEE_RATE);

  // 3. Calculate Taxable Pay
  let taxable_pay = gross_pay - nssf_employee - TAX_FREE_ALLOWANCE;

  // Check if housing allowance exceeds 15% threshold
  const other_income = gross_pay - housing_allowance;
  const housing_threshold = other_income * HOUSING_TAXABLE_THRESHOLD;
  
  if (housing_allowance > housing_threshold) {
    // Add excess housing back as taxable
    const excess_housing = housing_allowance - housing_threshold;
    taxable_pay += excess_housing;
  }

  // Ensure taxable pay is not negative
  taxable_pay = Math.max(0, taxable_pay);

  // 4. Calculate PAYE
  const paye = calculatePAYE(taxable_pay);

  // 5. Calculate LST (only in August)
  const annual_gross = gross_pay * 12;
  const lst = calculateLST(annual_gross, month);

  // 6. Calculate Net Pay
  const total_deductions = nssf_employee + paye + lst;
  const net_pay = gross_pay - total_deductions;

  // 7. Calculate Employer Costs
  const nssf_employer = Math.round(gross_pay * NSSF_EMPLOYER_RATE);
  const employer_total_cost = gross_pay + nssf_employer;

  return {
    // Income components
    base_salary: parseFloat(base_salary),
    housing_allowance: parseFloat(housing_allowance),
    transport_allowance: parseFloat(transport_allowance),
    other_allowances: parseFloat(other_allowances),
    overtime_pay: parseFloat(overtime_pay),
    bonuses: parseFloat(bonuses),
    medical_reimbursement: parseFloat(medical_reimbursement),
    other_non_taxable: parseFloat(other_non_taxable),
    
    // Calculated totals
    gross_pay: Math.round(gross_pay),
    taxable_pay: Math.round(taxable_pay),
    
    // Deductions
    nssf_employee: Math.round(nssf_employee),
    paye: Math.round(paye),
    lst: Math.round(lst),
    total_deductions: Math.round(total_deductions),
    
    // Net pay
    net_pay: Math.round(net_pay),
    
    // Employer costs
    nssf_employer: Math.round(nssf_employer),
    employer_total_cost: Math.round(employer_total_cost),
    
    // Metadata
    computation_date: new Date().toISOString(),
    month: month,
    annual_gross: Math.round(annual_gross)
  };
}

// Get all payroll records
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, month, year, employee_id } = req.query;
    
    let query = `
      SELECT p.*, 
             e.first_name, e.last_name, e.employee_id as emp_code, e.department,
             e.position
      FROM payroll p
      JOIN employees e ON p.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    if (month) {
      query += ` AND p.month = ?`;
      params.push(month);
    }

    if (year) {
      query += ` AND p.year = ?`;
      params.push(year);
    }

    if (employee_id) {
      query += ` AND p.employee_id = ?`;
      params.push(employee_id);
    }

    query += ` ORDER BY p.year DESC, p.month DESC, p.created_at DESC`;

    const payrolls = await allQuery(query, params);
    res.json(payrolls);
  } catch (error) {
    console.error('Error fetching payroll:', error);
    res.status(500).json({ error: 'Failed to fetch payroll records' });
  }
});

// Get payroll by employee
router.get('/employee/:employeeId', verifyToken, async (req, res) => {
  try {
    const query = `
      SELECT p.*, 
             e.first_name, e.last_name, e.employee_id as emp_code, e.department
      FROM payroll p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.employee_id = ?
      ORDER BY p.year DESC, p.month DESC
    `;

    const payrolls = await allQuery(query, [req.params.employeeId]);
    res.json(payrolls);
  } catch (error) {
    console.error('Error fetching employee payroll:', error);
    res.status(500).json({ error: 'Failed to fetch employee payroll' });
  }
});

// Get single payroll record
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const query = `
      SELECT p.*, 
             e.first_name, e.last_name, e.employee_id as emp_code, e.department,
             e.position, e.hire_date
      FROM payroll p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.id = ?
    `;

    const payroll = await getQuery(query, [req.params.id]);
    
    if (!payroll) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    res.json(payroll);
  } catch (error) {
    console.error('Error fetching payroll:', error);
    res.status(500).json({ error: 'Failed to fetch payroll record' });
  }
});

// Compute payroll (preview calculation without saving)
router.post('/compute', verifyToken, isAdmin, (req, res) => {
  try {
    const { month } = req.body;
    const computation = computePayroll(req.body, month);
    res.json({
      message: 'Payroll computed successfully',
      computation
    });
  } catch (error) {
    console.error('Error computing payroll:', error);
    res.status(500).json({ error: 'Failed to compute payroll' });
  }
});

// Create payroll record (admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const {
      employee_id,
      month,
      year,
      base_salary,
      housing_allowance = 0,
      transport_allowance = 0,
      other_allowances = 0,
      overtime_pay = 0,
      bonuses = 0,
      medical_reimbursement = 0,
      other_non_taxable = 0,
      other_deductions = 0
    } = req.body;

    if (!employee_id || !month || !year || !base_salary) {
      return res.status(400).json({ error: 'Required fields: employee_id, month, year, base_salary' });
    }

    // Check if payroll already exists for this employee/month/year
    const existing = await getQuery(
      'SELECT id FROM payroll WHERE employee_id = ? AND month = ? AND year = ?',
      [employee_id, month, year]
    );

    if (existing) {
      return res.status(400).json({ 
        error: 'Payroll already exists for this employee in this period',
        existingId: existing.id
      });
    }

    // Compute payroll
    const computation = computePayroll({
      base_salary,
      housing_allowance,
      transport_allowance,
      other_allowances,
      overtime_pay,
      bonuses,
      medical_reimbursement,
      other_non_taxable
    }, month);

    // Apply any additional other deductions
    const final_net_pay = computation.net_pay - parseFloat(other_deductions || 0);
    const final_total_deductions = computation.total_deductions + parseFloat(other_deductions || 0);

    // Insert payroll record
    const result = await runQuery(`
      INSERT INTO payroll (
        employee_id, month, year,
        base_salary, housing_allowance, transport_allowance, other_allowances,
        overtime_pay, bonuses, medical_reimbursement, other_non_taxable,
        gross_pay, taxable_pay,
        nssf_employee, paye, lst, other_deductions, total_deductions,
        net_pay,
        nssf_employer, employer_total_cost,
        status, computation_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      employee_id, month, year,
      computation.base_salary,
      computation.housing_allowance,
      computation.transport_allowance,
      computation.other_allowances,
      computation.overtime_pay,
      computation.bonuses,
      computation.medical_reimbursement,
      computation.other_non_taxable,
      computation.gross_pay,
      computation.taxable_pay,
      computation.nssf_employee,
      computation.paye,
      computation.lst,
      other_deductions || 0,
      final_total_deductions,
      final_net_pay,
      computation.nssf_employer,
      computation.employer_total_cost,
      'pending',
      computation.computation_date
    ]);

    const newPayroll = await getQuery('SELECT * FROM payroll WHERE id = ?', [result.lastID]);

    res.status(201).json({
      message: 'Payroll record created successfully',
      payroll: newPayroll,
      computation
    });
  } catch (error) {
    console.error('Error creating payroll:', error);
    res.status(500).json({ error: 'Failed to create payroll record' });
  }
});

// Update payroll record (admin only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if payroll exists
    const existing = await getQuery('SELECT * FROM payroll WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    // Don't allow updating paid payroll
    if (existing.status === 'paid') {
      return res.status(400).json({ error: 'Cannot update paid payroll' });
    }

    const {
      base_salary,
      housing_allowance = 0,
      transport_allowance = 0,
      other_allowances = 0,
      overtime_pay = 0,
      bonuses = 0,
      medical_reimbursement = 0,
      other_non_taxable = 0,
      other_deductions = 0
    } = req.body;

    // Recompute payroll
    const computation = computePayroll({
      base_salary: base_salary || existing.base_salary,
      housing_allowance,
      transport_allowance,
      other_allowances,
      overtime_pay,
      bonuses,
      medical_reimbursement,
      other_non_taxable
    }, existing.month);

    const final_net_pay = computation.net_pay - parseFloat(other_deductions || 0);
    const final_total_deductions = computation.total_deductions + parseFloat(other_deductions || 0);

    // Update payroll record
    await runQuery(`
      UPDATE payroll SET
        base_salary = ?,
        housing_allowance = ?,
        transport_allowance = ?,
        other_allowances = ?,
        overtime_pay = ?,
        bonuses = ?,
        medical_reimbursement = ?,
        other_non_taxable = ?,
        gross_pay = ?,
        taxable_pay = ?,
        nssf_employee = ?,
        paye = ?,
        lst = ?,
        other_deductions = ?,
        total_deductions = ?,
        net_pay = ?,
        nssf_employer = ?,
        employer_total_cost = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      computation.base_salary,
      computation.housing_allowance,
      computation.transport_allowance,
      computation.other_allowances,
      computation.overtime_pay,
      computation.bonuses,
      computation.medical_reimbursement,
      computation.other_non_taxable,
      computation.gross_pay,
      computation.taxable_pay,
      computation.nssf_employee,
      computation.paye,
      computation.lst,
      other_deductions || 0,
      final_total_deductions,
      final_net_pay,
      computation.nssf_employer,
      computation.employer_total_cost,
      id
    ]);

    const updated = await getQuery('SELECT * FROM payroll WHERE id = ?', [id]);

    res.json({
      message: 'Payroll updated successfully',
      payroll: updated,
      computation
    });
  } catch (error) {
    console.error('Error updating payroll:', error);
    res.status(500).json({ error: 'Failed to update payroll' });
  }
});

// Update payroll status (admin only)
router.patch('/:id/status', verifyToken, isAdmin, async (req, res) => {
  try {
    const { status, payment_date, payment_method, payment_reference } = req.body;

    if (!['pending', 'approved', 'paid', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateFields = ['status = ?'];
    const params = [status];

    if (payment_date) {
      updateFields.push('payment_date = ?');
      params.push(payment_date);
    }

    if (payment_method) {
      updateFields.push('payment_method = ?');
      params.push(payment_method);
    }

    if (payment_reference) {
      updateFields.push('payment_reference = ?');
      params.push(payment_reference);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    await runQuery(
      `UPDATE payroll SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await getQuery('SELECT * FROM payroll WHERE id = ?', [req.params.id]);
    
    if (!updated) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    res.json({
      message: `Payroll ${status} successfully`,
      payroll: updated
    });
  } catch (error) {
    console.error('Error updating payroll status:', error);
    res.status(500).json({ error: 'Failed to update payroll status' });
  }
});

// Bulk generate payroll for all employees
router.post('/bulk-generate', verifyToken, isAdmin, async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    // Get all active employees
    const employees = await allQuery(
      'SELECT id, salary as base_salary FROM employees WHERE status = ?',
      ['active']
    );

    if (employees.length === 0) {
      return res.status(404).json({ error: 'No active employees found' });
    }

    const results = [];
    const errors = [];

    for (const employee of employees) {
      try {
        // Check if payroll already exists
        const existing = await getQuery(
          'SELECT id FROM payroll WHERE employee_id = ? AND month = ? AND year = ?',
          [employee.id, month, year]
        );

        if (existing) {
          errors.push({
            employee_id: employee.id,
            error: 'Payroll already exists'
          });
          continue;
        }

        // Compute and create payroll
        const computation = computePayroll({
          base_salary: employee.base_salary || 0,
          housing_allowance: 0,
          transport_allowance: 0,
          other_allowances: 0,
          overtime_pay: 0,
          bonuses: 0
        }, month);

        const result = await runQuery(`
          INSERT INTO payroll (
            employee_id, month, year,
            base_salary, gross_pay, taxable_pay,
            nssf_employee, paye, lst, total_deductions,
            net_pay, nssf_employer, employer_total_cost,
            status, computation_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          employee.id, month, year,
          computation.base_salary,
          computation.gross_pay,
          computation.taxable_pay,
          computation.nssf_employee,
          computation.paye,
          computation.lst,
          computation.total_deductions,
          computation.net_pay,
          computation.nssf_employer,
          computation.employer_total_cost,
          'pending',
          computation.computation_date
        ]);

        results.push({
          employee_id: employee.id,
          payroll_id: result.lastID,
          net_pay: computation.net_pay
        });
      } catch (error) {
        errors.push({
          employee_id: employee.id,
          error: error.message
        });
      }
    }

    res.json({
      message: `Bulk payroll generation completed`,
      summary: {
        total: employees.length,
        success: results.length,
        failed: errors.length
      },
      results,
      errors
    });
  } catch (error) {
    console.error('Error generating bulk payroll:', error);
    res.status(500).json({ error: 'Failed to generate bulk payroll' });
  }
});

// Delete payroll record (admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const payroll = await getQuery('SELECT status FROM payroll WHERE id = ?', [req.params.id]);
    
    if (!payroll) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    // Don't allow deleting paid payroll
    if (payroll.status === 'paid') {
      return res.status(400).json({ error: 'Cannot delete paid payroll' });
    }

    await runQuery('DELETE FROM payroll WHERE id = ?', [req.params.id]);
    
    res.json({ message: 'Payroll record deleted successfully' });
  } catch (error) {
    console.error('Error deleting payroll:', error);
    res.status(500).json({ error: 'Failed to delete payroll' });
  }
});

// Get payroll summary/statistics
router.get('/stats/summary', verifyToken, isAdmin, async (req, res) => {
  try {
    const { month, year } = req.query;

    let whereClause = '';
    const params = [];

    if (month && year) {
      whereClause = 'WHERE month = ? AND year = ?';
      params.push(month, year);
    }

    const summary = await getQuery(`
      SELECT 
        COUNT(*) as total_records,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
        SUM(gross_pay) as total_gross,
        SUM(net_pay) as total_net,
        SUM(paye) as total_paye,
        SUM(nssf_employee) as total_nssf_employee,
        SUM(nssf_employer) as total_nssf_employer,
        SUM(lst) as total_lst,
        SUM(employer_total_cost) as total_employer_cost
      FROM payroll
      ${whereClause}
    `, params);

    res.json(summary);
  } catch (error) {
    console.error('Error fetching payroll summary:', error);
    res.status(500).json({ error: 'Failed to fetch payroll summary' });
  }
});

module.exports = router;

