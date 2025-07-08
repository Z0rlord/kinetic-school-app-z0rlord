import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children, requireRole = null, requireAuth = true }) {
  const { user, loading, initialized } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (!initialized || loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if authentication is required but user is not authenticated
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to dashboard if user is authenticated but trying to access auth pages
  if (!requireAuth && user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check role-based access
  if (requireRole && user) {
    const userRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
    if (!userRoles.includes(user.role)) {
      return (
        <div className="container mt-5">
          <div className="row justify-content-center">
            <div className="col-md-6">
              <div className="alert alert-danger text-center">
                <h4>Access Denied</h4>
                <p>You don't have permission to access this page.</p>
                <p>Required role: {userRoles.join(' or ')}</p>
                <p>Your role: {user.role}</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => window.history.back()}
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return children;
}

export default ProtectedRoute;
