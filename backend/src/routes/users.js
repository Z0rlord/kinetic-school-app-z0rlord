const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  findOne, 
  findMany, 
  updateRecord, 
  deleteRecord 
} = require('../utils/database');
const {
  requireAuth,
  requireRole,
  getCurrentUser,
  validatePassword,
  hashPassword
} = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, 
             u.email_verified, u.last_login, u.created_at,
             sp.student_id, sp.year_level, sp.major_program
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE 1=1
    `;
    const params = [];

    // Filter by role
    if (role && ['student', 'teacher', 'admin'].includes(role)) {
      query += ' AND u.role = ?';
      params.push(role);
    }

    // Search by name or email
    if (search) {
      query += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Add ordering and pagination
    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const users = await findMany(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM users u WHERE 1=1';
    const countParams = [];

    if (role && ['student', 'teacher', 'admin'].includes(role)) {
      countQuery += ' AND u.role = ?';
      countParams.push(role);
    }

    if (search) {
      countQuery += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const [{ total }] = await findMany(countQuery, countParams);

    res.json({
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        emailVerified: user.email_verified,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        ...(user.role === 'student' && {
          studentProfile: {
            studentId: user.student_id,
            yearLevel: user.year_level,
            majorProgram: user.major_program
          }
        })
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: 'Internal server error'
    });
  }
});

// Get user by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;

    // Users can only view their own profile unless they're admin
    if (requestingUser.role !== 'admin' && requestingUser.id !== parseInt(id)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own profile'
      });
    }

    const user = await findOne(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, 
             u.email_verified, u.last_login, u.created_at,
             sp.student_id, sp.year_level, sp.major_program, sp.bio,
             sp.profile_completion_percentage
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE u.id = ?
    `, [id]);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        emailVerified: user.email_verified,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        ...(user.role === 'student' && {
          studentProfile: {
            studentId: user.student_id,
            yearLevel: user.year_level,
            majorProgram: user.major_program,
            bio: user.bio,
            profileCompletion: user.profile_completion_percentage
          }
        })
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      message: 'Internal server error'
    });
  }
});

// Update user profile
router.put('/:id', requireAuth, [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be 1-100 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be 1-100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const requestingUser = req.user;
    const { firstName, lastName, email } = req.body;

    // Users can only update their own profile unless they're admin
    if (requestingUser.role !== 'admin' && requestingUser.id !== parseInt(id)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your own profile'
      });
    }

    // Check if user exists
    const user = await findOne('SELECT id, email FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    // Check if email is already taken (if email is being updated)
    if (email && email !== user.email) {
      const existingUser = await findOne(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );

      if (existingUser) {
        return res.status(409).json({
          error: 'Email already taken',
          message: 'Another user is already using this email address'
        });
      }
    }

    // Build update query
    const updates = [];
    const params = [];

    if (firstName !== undefined) {
      updates.push('first_name = ?');
      params.push(firstName);
    }

    if (lastName !== undefined) {
      updates.push('last_name = ?');
      params.push(lastName);
    }

    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
      // Reset email verification if email changed
      if (email !== user.email) {
        updates.push('email_verified = FALSE');
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No updates provided',
        message: 'At least one field must be provided for update'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    // Execute update
    await updateRecord(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated user
    const updatedUser = await findOne(`
      SELECT id, email, first_name, last_name, role, email_verified, updated_at
      FROM users WHERE id = ?
    `, [id]);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        role: updatedUser.role,
        emailVerified: updatedUser.email_verified,
        updatedAt: updatedUser.updated_at
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Failed to update user',
      message: 'Internal server error'
    });
  }
});

// Change password
router.put('/:id/password', requireAuth, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const requestingUser = req.user;
    const { currentPassword, newPassword } = req.body;

    // Users can only change their own password
    if (requestingUser.id !== parseInt(id)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only change your own password'
      });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password validation failed',
        details: passwordValidation.errors
      });
    }

    // Get user with current password hash
    const user = await findOne(
      'SELECT id, password_hash FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    // Verify current password
    const { comparePassword } = require('../middleware/auth');
    const isValidPassword = await comparePassword(currentPassword, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid current password',
        message: 'The current password you provided is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await updateRecord(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, id]
    );

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      message: 'Internal server error'
    });
  }
});

// Delete user (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await findOne('SELECT id, email FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    // Delete user (cascade will handle related records)
    await deleteRecord('DELETE FROM users WHERE id = ?', [id]);

    res.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
