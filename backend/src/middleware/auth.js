const bcrypt = require('bcrypt');
const { findOne } = require('../utils/database');

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  } else {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }

      // Get user from database
      const user = await findOne(
        'SELECT id, role FROM users WHERE id = ?',
        [req.session.userId]
      );

      if (!user) {
        return res.status(401).json({ 
          error: 'Invalid session',
          message: 'User not found'
        });
      }

      // Check if user has required role
      const userRoles = Array.isArray(roles) ? roles : [roles];
      if (!userRoles.includes(user.role)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: `Access denied. Required role: ${userRoles.join(' or ')}`
        });
      }

      // Add user info to request
      req.user = user;
      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      res.status(500).json({ 
        error: 'Authorization error',
        message: 'Internal server error'
      });
    }
  };
};

// Get current user middleware (adds user info to request if authenticated)
const getCurrentUser = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      const user = await findOne(
        `SELECT id, email, first_name, last_name, role, email_verified, last_login, created_at 
         FROM users WHERE id = ?`,
        [req.session.userId]
      );

      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    console.error('Get current user error:', error);
    next(); // Continue without user info
  }
};

// Password validation
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Hash password
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Email validation
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Rate limiting for login attempts
const loginAttempts = new Map();

const checkLoginAttempts = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, { count: 0, resetTime: now + windowMs });
  }

  const attempts = loginAttempts.get(ip);

  // Reset if window has passed
  if (now > attempts.resetTime) {
    attempts.count = 0;
    attempts.resetTime = now + windowMs;
  }

  // Check if too many attempts
  if (attempts.count >= maxAttempts) {
    const timeLeft = Math.ceil((attempts.resetTime - now) / 1000 / 60);
    return res.status(429).json({
      error: 'Too many login attempts',
      message: `Please try again in ${timeLeft} minutes`,
      retryAfter: timeLeft * 60
    });
  }

  next();
};

// Record failed login attempt
const recordFailedLogin = (req) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (loginAttempts.has(ip)) {
    loginAttempts.get(ip).count++;
  }
};

// Clear login attempts on successful login
const clearLoginAttempts = (req) => {
  const ip = req.ip || req.connection.remoteAddress;
  loginAttempts.delete(ip);
};

// Session cleanup middleware
const cleanupExpiredSessions = (req, res, next) => {
  // This would typically be handled by session store
  // For now, just continue
  next();
};

module.exports = {
  requireAuth,
  requireRole,
  getCurrentUser,
  validatePassword,
  hashPassword,
  comparePassword,
  validateEmail,
  checkLoginAttempts,
  recordFailedLogin,
  clearLoginAttempts,
  cleanupExpiredSessions
};
