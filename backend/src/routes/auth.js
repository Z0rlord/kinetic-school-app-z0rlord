const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const {
  findOne,
  insertRecord,
  updateRecord,
  executeQuery
} = require('../utils/database');
const {
  validatePassword,
  hashPassword,
  comparePassword,
  validateEmail,
  checkLoginAttempts,
  recordFailedLogin,
  clearLoginAttempts,
  requireAuth,
  getCurrentUser
} = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required and must be less than 100 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name is required and must be less than 100 characters'),
  body('role')
    .isIn(['student', 'teacher'])
    .withMessage('Role must be either student or teacher')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Register new user
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, firstName, lastName, role } = req.body;

    // Additional password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password validation failed',
        details: passwordValidation.errors
      });
    }

    // Check if user already exists
    const existingUser = await findOne(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email address already exists'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const userId = await insertRecord(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, email_verification_token)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email, passwordHash, firstName, lastName, role, emailVerificationToken]
    );

    // Create student profile if role is student
    if (role === 'student') {
      await insertRecord(
        'INSERT INTO student_profiles (user_id) VALUES (?)',
        [userId]
      );
    }

    // TODO: Send verification email
    console.log(`Email verification token for ${email}: ${emailVerificationToken}`);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: userId,
        email,
        firstName,
        lastName,
        role,
        emailVerified: false
      },
      // In development, return the verification token
      ...(process.env.NODE_ENV === 'development' && {
        verificationToken: emailVerificationToken
      })
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'Internal server error'
    });
  }
});

// Login user
router.post('/login', checkLoginAttempts, loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await findOne(
      `SELECT id, email, password_hash, first_name, last_name, role, email_verified
       FROM users WHERE email = ?`,
      [email]
    );

    if (!user) {
      recordFailedLogin(req);
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      recordFailedLogin(req);
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email address before logging in'
      });
    }

    // Clear failed login attempts
    clearLoginAttempts(req);

    // Update last login
    await updateRecord(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // Create session
    req.session.userId = user.id;
    req.session.userRole = user.role;

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        emailVerified: user.email_verified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Internal server error'
    });
  }
});

// Logout user
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        error: 'Logout failed',
        message: 'Internal server error'
      });
    }

    res.clearCookie('connect.sid'); // Default session cookie name
    res.json({
      message: 'Logout successful'
    });
  });
});

// Get current user
router.get('/me', getCurrentUser, (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Not authenticated',
      message: 'No active session found'
    });
  }

  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.first_name,
      lastName: req.user.last_name,
      role: req.user.role,
      emailVerified: req.user.email_verified,
      lastLogin: req.user.last_login,
      createdAt: req.user.created_at
    }
  });
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token required',
        message: 'Email verification token is required'
      });
    }

    // Find user with verification token
    const user = await findOne(
      'SELECT id, email FROM users WHERE email_verification_token = ?',
      [token]
    );

    if (!user) {
      return res.status(400).json({
        error: 'Invalid token',
        message: 'Email verification token is invalid or expired'
      });
    }

    // Update user as verified
    await updateRecord(
      `UPDATE users 
       SET email_verified = TRUE, email_verification_token = NULL 
       WHERE id = ?`,
      [user.id]
    );

    res.json({
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        emailVerified: true
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: 'Internal server error'
    });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    // Find user
    const user = await findOne(
      'SELECT id, email FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token
    await updateRecord(
      `UPDATE users
       SET password_reset_token = ?, password_reset_expires = ?
       WHERE id = ?`,
      [resetToken, resetExpires, user.id]
    );

    // TODO: Send password reset email
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent',
      // In development, return the reset token
      ...(process.env.NODE_ENV === 'development' && {
        resetToken
      })
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      error: 'Password reset failed',
      message: 'Internal server error'
    });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Reset token and new password are required'
      });
    }

    // Validate new password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password validation failed',
        details: passwordValidation.errors
      });
    }

    // Find user with valid reset token
    const user = await findOne(
      `SELECT id, email FROM users
       WHERE password_reset_token = ? AND password_reset_expires > NOW()`,
      [token]
    );

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired token',
        message: 'Password reset token is invalid or has expired'
      });
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update password and clear reset token
    await updateRecord(
      `UPDATE users
       SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL
       WHERE id = ?`,
      [passwordHash, user.id]
    );

    res.json({
      message: 'Password reset successful',
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      error: 'Password reset failed',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
