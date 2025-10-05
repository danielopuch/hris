import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isManager } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        HRIS
      </Link>
      {user && (
        <div className="navbar-menu">
          <Link to="/" className="nav-link">Dashboard</Link>
          <Link to="/timesheets" className="nav-link">Timesheets</Link>
          <Link to="/leave" className="nav-link">Leave</Link>
          {isManager && (
            <>
              <Link to="/appraisals" className="nav-link">Appraisals</Link>
              <Link to="/payroll" className="nav-link">Payroll</Link>
            </>
          )}
          <span className="nav-link" style={{ cursor: 'default' }}>
            {user.username} ({user.role})
          </span>
          <button onClick={handleLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
