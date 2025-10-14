const express = require('express');
const router = express.Router();
const { db, allQuery, getQuery, runQuery } = require('../database-improved');
const { verifyToken, isManagerOrAdmin } = require('../middleware/auth');

// Get all projects (all authenticated users can view)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, department } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT 
        p.*,
        e.first_name || ' ' || e.last_name as manager_name,
        (SELECT COUNT(*) FROM project_assignments WHERE project_id = p.id AND is_active = 1) as team_size
      FROM projects p
      LEFT JOIN employees e ON p.manager_id = e.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by status
    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    // Filter by department
    if (department) {
      query += ` AND p.department = ?`;
      params.push(department);
    }

    // Employees see only their assigned projects
    if (userRole === 'employee') {
      query += ` AND p.id IN (
        SELECT project_id FROM project_assignments 
        WHERE employee_id = (SELECT id FROM employees WHERE user_id = ?) 
        AND is_active = 1
      )`;
      params.push(userId);
    }

    query += ` ORDER BY p.status ASC, p.project_name ASC`;

    const projects = await allQuery(query, params);
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await getQuery(`
      SELECT 
        p.*,
        e.first_name || ' ' || e.last_name as manager_name
      FROM projects p
      LEFT JOIN employees e ON p.manager_id = e.id
      WHERE p.id = ?
    `, [id]);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get team members
    const team = await allQuery(`
      SELECT 
        pa.id,
        pa.role,
        pa.allocated_hours,
        pa.start_date,
        pa.end_date,
        e.first_name,
        e.last_name,
        e.employee_id,
        e.department,
        e.position
      FROM project_assignments pa
      JOIN employees e ON pa.employee_id = e.id
      WHERE pa.project_id = ? AND pa.is_active = 1
      ORDER BY e.last_name, e.first_name
    `, [id]);

    res.json({ ...project, team });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create new project (managers and admins only)
router.post('/', verifyToken, isManagerOrAdmin, async (req, res) => {
  try {
    const {
      project_code,
      project_name,
      description,
      sponsor_donor,
      client_name,
      start_date,
      end_date,
      budget,
      status,
      department,
      manager_id
    } = req.body;

    const sponsorDonorValue = sponsor_donor || client_name;

    // Validate required fields
    if (!project_code || !project_name) {
      return res.status(400).json({ error: 'Project code and name are required' });
    }

    if (!sponsorDonorValue) {
      return res.status(400).json({ error: 'Sponsor/Donor is required' });
    }

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (Number.isNaN(startDateObj.getTime()) || Number.isNaN(endDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid start or end date format' });
    }

    if (endDateObj < startDateObj) {
      return res.status(400).json({ error: 'End date cannot be earlier than start date' });
    }

    // Check for duplicate project code
    const existing = await getQuery('SELECT id FROM projects WHERE project_code = ?', [project_code]);
    if (existing) {
      return res.status(400).json({ error: 'Project code already exists' });
    }

    const result = await runQuery(`
      INSERT INTO projects (
        project_code, project_name, description, sponsor_donor,
        client_name, start_date, end_date, budget, status, department, manager_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      project_code,
      project_name,
      description || null,
      sponsorDonorValue,
      client_name || sponsorDonorValue,
      start_date,
      end_date,
      budget || null,
      status || 'active',
      department || null,
      manager_id || null
    ]);

    const newProject = await getQuery('SELECT * FROM projects WHERE id = ?', [result.lastID]);
    res.status(201).json(newProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project (managers and admins only)
router.put('/:id', verifyToken, isManagerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      project_code,
      project_name,
      description,
      sponsor_donor,
      client_name,
      start_date,
      end_date,
      budget,
      status,
      department,
      manager_id
    } = req.body;

    const sponsorDonorValue = sponsor_donor || client_name;

    // Check if project exists
    const existing = await getQuery('SELECT id FROM projects WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project_code || !project_name) {
      return res.status(400).json({ error: 'Project code and name are required' });
    }

    if (!sponsorDonorValue) {
      return res.status(400).json({ error: 'Sponsor/Donor is required' });
    }

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (Number.isNaN(startDateObj.getTime()) || Number.isNaN(endDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid start or end date format' });
    }

    if (endDateObj < startDateObj) {
      return res.status(400).json({ error: 'End date cannot be earlier than start date' });
    }

    await runQuery(`
      UPDATE projects SET
        project_code = ?,
        project_name = ?,
        description = ?,
        sponsor_donor = ?,
        client_name = ?,
        start_date = ?,
        end_date = ?,
        budget = ?,
        status = ?,
        department = ?,
        manager_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      project_code,
      project_name,
      description,
      sponsorDonorValue,
      client_name || sponsorDonorValue,
      start_date,
      end_date,
      budget,
      status,
      department,
      manager_id,
      id
    ]);

    const updated = await getQuery('SELECT * FROM projects WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Close project (managers and admins only)
router.post('/:id/close', verifyToken, isManagerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { end_date } = req.body;

    const project = await getQuery('SELECT * FROM projects WHERE id = ?', [id]);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const finalEndDate = end_date || project.end_date || new Date().toISOString().split('T')[0];
    const finalEndDateObj = new Date(finalEndDate);

    if (Number.isNaN(finalEndDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid end date format' });
    }

    const projectStartDate = project.start_date ? new Date(project.start_date) : null;
    if (projectStartDate && finalEndDateObj < projectStartDate) {
      return res.status(400).json({ error: 'End date cannot be earlier than start date' });
    }

    await runQuery(`
      UPDATE projects
      SET status = 'completed',
          end_date = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [finalEndDate, id]);

    const updatedProject = await getQuery('SELECT * FROM projects WHERE id = ?', [id]);
    res.json({ message: 'Project closed successfully', project: updatedProject });
  } catch (error) {
    console.error('Error closing project:', error);
    res.status(500).json({ error: 'Failed to close project' });
  }
});

// Delete project (admins only)
router.delete('/:id', verifyToken, isManagerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project has timesheets
    const timesheets = await getQuery('SELECT COUNT(*) as count FROM timesheets WHERE project_id = ?', [id]);
    if (timesheets.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete project with existing timesheet entries. Consider marking it as inactive instead.' 
      });
    }

    await runQuery('DELETE FROM project_assignments WHERE project_id = ?', [id]);
    await runQuery('DELETE FROM projects WHERE id = ?', [id]);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Assign employee to project (managers and admins only)
router.post('/:id/assign', verifyToken, isManagerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id, role, allocated_hours, start_date, end_date } = req.body;

    if (!employee_id) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    // Check if project exists
    const project = await getQuery('SELECT id FROM projects WHERE id = ?', [id]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if employee exists
    const employee = await getQuery('SELECT id FROM employees WHERE id = ?', [employee_id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check for existing active assignment
    const existing = await getQuery(`
      SELECT id FROM project_assignments 
      WHERE project_id = ? AND employee_id = ? AND is_active = 1
    `, [id, employee_id]);

    if (existing) {
      return res.status(400).json({ error: 'Employee is already assigned to this project' });
    }

    const result = await runQuery(`
      INSERT INTO project_assignments (
        project_id, employee_id, role, allocated_hours, start_date, end_date
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [id, employee_id, role || null, allocated_hours || null, start_date || null, end_date || null]);

    const assignment = await getQuery('SELECT * FROM project_assignments WHERE id = ?', [result.lastID]);
    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error assigning employee to project:', error);
    res.status(500).json({ error: 'Failed to assign employee' });
  }
});

// Remove employee from project (managers and admins only)
router.delete('/:id/assign/:assignmentId', verifyToken, isManagerOrAdmin, async (req, res) => {
  try {
    const { id, assignmentId } = req.params;

    await runQuery(`
      UPDATE project_assignments 
      SET is_active = 0, end_date = DATE('now'), updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND project_id = ?
    `, [assignmentId, id]);

    res.json({ message: 'Employee removed from project' });
  } catch (error) {
    console.error('Error removing employee from project:', error);
    res.status(500).json({ error: 'Failed to remove employee' });
  }
});

// Get employee's assigned projects
router.get('/employee/:employeeId', verifyToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Security check: employees can only view their own assignments
    if (userRole === 'employee') {
      const employee = await getQuery('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.id !== parseInt(employeeId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const projects = await allQuery(`
      SELECT 
        p.*,
        pa.role as assignment_role,
        pa.allocated_hours,
        pa.start_date as assignment_start,
        pa.end_date as assignment_end
      FROM project_assignments pa
      JOIN projects p ON pa.project_id = p.id
      WHERE pa.employee_id = ? AND pa.is_active = 1
      ORDER BY p.project_name
    `, [employeeId]);

    res.json(projects);
  } catch (error) {
    console.error('Error fetching employee projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

module.exports = router;
