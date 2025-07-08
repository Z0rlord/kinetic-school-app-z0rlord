const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  findOne, 
  findMany, 
  insertRecord, 
  updateRecord, 
  deleteRecord 
} = require('../utils/database');
const {
  requireAuth
} = require('../middleware/auth');

const router = express.Router();

// Get interests for a user
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;
    const { category, level, page = 1, limit = 50 } = req.query;

    // Students can only view their own interests
    if (requestingUser.role === 'student' && requestingUser.id !== parseInt(userId)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Students can only view their own interests'
      });
    }

    // Build query with filters
    let query = `
      SELECT id, interest_name, category, description, level_of_interest, created_at, updated_at
      FROM interests 
      WHERE user_id = ?
    `;
    const params = [userId];

    if (category && ['academic', 'extracurricular', 'hobby', 'industry', 'learning_style', 'other'].includes(category)) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (level && ['low', 'medium', 'high'].includes(level)) {
      query += ' AND level_of_interest = ?';
      params.push(level);
    }

    // Add ordering and pagination
    query += ' ORDER BY level_of_interest DESC, category, interest_name LIMIT ? OFFSET ?';
    const offset = (page - 1) * limit;
    params.push(parseInt(limit), parseInt(offset));

    const interests = await findMany(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM interests WHERE user_id = ?';
    const countParams = [userId];

    if (category && ['academic', 'extracurricular', 'hobby', 'industry', 'learning_style', 'other'].includes(category)) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }

    if (level && ['low', 'medium', 'high'].includes(level)) {
      countQuery += ' AND level_of_interest = ?';
      countParams.push(level);
    }

    const [{ total }] = await findMany(countQuery, countParams);

    res.json({
      interests: interests.map(interest => ({
        id: interest.id,
        name: interest.interest_name,
        category: interest.category,
        description: interest.description,
        level: interest.level_of_interest,
        createdAt: interest.created_at,
        updatedAt: interest.updated_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get interests error:', error);
    res.status(500).json({
      error: 'Failed to fetch interests',
      message: 'Internal server error'
    });
  }
});

// Create new interest
router.post('/', requireAuth, [
  body('interestName')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Interest name is required and must be less than 200 characters'),
  body('category')
    .isIn(['academic', 'extracurricular', 'hobby', 'industry', 'learning_style', 'other'])
    .withMessage('Category must be academic, extracurricular, hobby, industry, learning_style, or other'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('level')
    .isIn(['low', 'medium', 'high'])
    .withMessage('Level must be low, medium, or high')
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

    const { interestName, category, description, level } = req.body;
    const userId = req.user.id;

    // Check if interest already exists for this user
    const existingInterest = await findOne(
      'SELECT id FROM interests WHERE user_id = ? AND interest_name = ?',
      [userId, interestName]
    );

    if (existingInterest) {
      return res.status(409).json({
        error: 'Interest already exists',
        message: 'You have already added this interest to your profile'
      });
    }

    // Create interest
    const interestId = await insertRecord(`
      INSERT INTO interests (user_id, interest_name, category, description, level_of_interest)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, interestName, category, description || null, level]);

    // Get created interest
    const interest = await findOne(`
      SELECT id, interest_name, category, description, level_of_interest, created_at, updated_at
      FROM interests WHERE id = ?
    `, [interestId]);

    res.status(201).json({
      message: 'Interest added successfully',
      interest: {
        id: interest.id,
        name: interest.interest_name,
        category: interest.category,
        description: interest.description,
        level: interest.level_of_interest,
        createdAt: interest.created_at,
        updatedAt: interest.updated_at
      }
    });

  } catch (error) {
    console.error('Create interest error:', error);
    res.status(500).json({
      error: 'Failed to create interest',
      message: 'Internal server error'
    });
  }
});

// Update interest
router.put('/:interestId', requireAuth, [
  body('interestName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Interest name must be less than 200 characters'),
  body('category')
    .optional()
    .isIn(['academic', 'extracurricular', 'hobby', 'industry', 'learning_style', 'other'])
    .withMessage('Category must be academic, extracurricular, hobby, industry, learning_style, or other'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('level')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Level must be low, medium, or high')
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

    const { interestId } = req.params;
    const requestingUser = req.user;
    const { interestName, category, description, level } = req.body;

    // Check if interest exists and user owns it
    const interest = await findOne('SELECT user_id, interest_name FROM interests WHERE id = ?', [interestId]);
    if (!interest) {
      return res.status(404).json({
        error: 'Interest not found',
        message: 'The requested interest does not exist'
      });
    }

    // Students can only update their own interests
    if (requestingUser.role === 'student' && requestingUser.id !== interest.user_id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your own interests'
      });
    }

    // Check for duplicate interest name if updating name
    if (interestName && interestName !== interest.interest_name) {
      const existingInterest = await findOne(
        'SELECT id FROM interests WHERE user_id = ? AND interest_name = ? AND id != ?',
        [interest.user_id, interestName, interestId]
      );

      if (existingInterest) {
        return res.status(409).json({
          error: 'Interest name already exists',
          message: 'You already have an interest with this name'
        });
      }
    }

    // Build update query
    const updates = [];
    const params = [];

    if (interestName !== undefined) {
      updates.push('interest_name = ?');
      params.push(interestName);
    }

    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (level !== undefined) {
      updates.push('level_of_interest = ?');
      params.push(level);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No updates provided',
        message: 'At least one field must be provided for update'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(interestId);

    // Execute update
    await updateRecord(
      `UPDATE interests SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated interest
    const updatedInterest = await findOne(`
      SELECT id, interest_name, category, description, level_of_interest, created_at, updated_at
      FROM interests WHERE id = ?
    `, [interestId]);

    res.json({
      message: 'Interest updated successfully',
      interest: {
        id: updatedInterest.id,
        name: updatedInterest.interest_name,
        category: updatedInterest.category,
        description: updatedInterest.description,
        level: updatedInterest.level_of_interest,
        createdAt: updatedInterest.created_at,
        updatedAt: updatedInterest.updated_at
      }
    });

  } catch (error) {
    console.error('Update interest error:', error);
    res.status(500).json({
      error: 'Failed to update interest',
      message: 'Internal server error'
    });
  }
});

// Delete interest
router.delete('/:interestId', requireAuth, async (req, res) => {
  try {
    const { interestId } = req.params;
    const requestingUser = req.user;

    // Check if interest exists and user owns it
    const interest = await findOne('SELECT user_id, interest_name FROM interests WHERE id = ?', [interestId]);
    if (!interest) {
      return res.status(404).json({
        error: 'Interest not found',
        message: 'The requested interest does not exist'
      });
    }

    // Students can only delete their own interests
    if (requestingUser.role === 'student' && requestingUser.id !== interest.user_id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete your own interests'
      });
    }

    // Delete interest
    await deleteRecord('DELETE FROM interests WHERE id = ?', [interestId]);

    res.json({
      message: 'Interest deleted successfully',
      deletedInterest: {
        id: parseInt(interestId),
        name: interest.interest_name
      }
    });

  } catch (error) {
    console.error('Delete interest error:', error);
    res.status(500).json({
      error: 'Failed to delete interest',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
