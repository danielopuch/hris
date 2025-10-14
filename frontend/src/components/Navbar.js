import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <Link to="/" className="brand-link">
          HRIS
        </Link>
      </div>
      {user && (
        <>
          <div className="sidebar-menu">
            <Link 
              to="/" 
              className={`sidebar-link ${isActive('/') ? 'active' : ''}`}
            >
              <span className="link-icon">📊</span>
              <span className="link-text">Dashboard</span>
            </Link>
            <Link 
              to="/timesheets" 
              className={`sidebar-link ${isActive('/timesheets') ? 'active' : ''}`}
            >
              <span className="link-icon">⏰</span>
              <span className="link-text">Timesheets</span>
            </Link>
            <Link 
              to="/leave" 
              className={`sidebar-link ${isActive('/leave') ? 'active' : ''}`}
            >
              <span className="link-icon">🏖️</span>
              <span className="link-text">Leave</span>
            </Link>
            <Link 
              to="/holidays" 
              className={`sidebar-link ${isActive('/holidays') ? 'active' : ''}`}
            >
              <span className="link-icon">🎉</span>
              <span className="link-text">Holidays</span>
            </Link>
            {isManager && (
              <>
                <Link 
                  to="/team" 
                  className={`sidebar-link ${isActive('/team') ? 'active' : ''}`}
                >
                  <span className="link-icon">👥</span>
                  <span className="link-text">Team</span>
                </Link>
                <Link 
                  to="/staff" 
                  className={`sidebar-link ${isActive('/staff') ? 'active' : ''}`}
                >
                  <span className="link-icon">👨‍💼</span>
                  <span className="link-text">Staff</span>
                </Link>
                <Link 
                  to="/projects" 
                  className={`sidebar-link ${isActive('/projects') ? 'active' : ''}`}
                >
                  <span className="link-icon">📁</span>
                  <span className="link-text">Projects</span>
                </Link>
                <Link 
                  to="/reports" 
                  className={`sidebar-link ${isActive('/reports') ? 'active' : ''}`}
                >
                  <span className="link-icon">📈</span>
                  <span className="link-text">Reports</span>
                </Link>
                <Link 
                  to="/appraisals" 
                  className={`sidebar-link ${isActive('/appraisals') ? 'active' : ''}`}
                >
                  <span className="link-icon">⭐</span>
                  <span className="link-text">Appraisals</span>
                </Link>
                <Link 
                  to="/payroll" 
                  className={`sidebar-link ${isActive('/payroll') ? 'active' : ''}`}
                >
                  <span className="link-icon">💰</span>
                  <span className="link-text">Payroll</span>
                </Link>
              </>
            )}
          </div>
          <div className="sidebar-footer">
            <div className="user-info">
              <span className="user-icon">👤</span>
              <div className="user-details">
                <div className="user-name">{user.username}</div>
                <div className="user-role">{user.role}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="btn btn-logout">
              Logout
            </button>
          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;
