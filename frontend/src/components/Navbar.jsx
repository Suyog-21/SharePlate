import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Leaf, LogOut, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="nav-brand">
          SharePlate
        </Link>
        <div className="nav-links">
          {!user ? (
            <>
              <Link to="/login" className="btn btn-outline">Login</Link>
              <Link to="/register" className="btn btn-primary">Sign Up</Link>
            </>
          ) : (
            <>
              {user.role === 'restaurant' && <Link to="/restaurant" className="nav-link">Dashboard</Link>}
              {user.role === 'ngo' && <Link to="/ngo" className="nav-link">Dashboard</Link>}
              {user.role === 'admin' && <Link to="/admin" className="nav-link">Admin Panel</Link>}
              
              <div className="flex items-center gap-4 ml-4">
                <span className="flex items-center gap-2 text-sm text-secondary">
                  <User size={16} />
                  {user.name}
                </span>
                <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', gap: '0.25rem' }}>
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
