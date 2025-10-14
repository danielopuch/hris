const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'hris_secret_key_change_in_production';

// Verify JWT token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Check if user is manager or admin
const isManagerOrAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Manager or admin access required' });
  }
  next();
};

// Check if user is HR, manager or admin
const isHRManagerOrAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'hr') {
    return res.status(403).json({ error: 'HR, Manager or Admin access required' });
  }
  next();
};

module.exports = { verifyToken, isAdmin, isManagerOrAdmin, isHRManagerOrAdmin, JWT_SECRET };
