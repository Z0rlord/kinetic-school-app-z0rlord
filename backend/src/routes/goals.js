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
  requireAuth,
  requireRole
} = require('../middleware/auth');

const router = express.Router();

// Get goals for a user
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;
    const { type, category, status, page = 1, limit = 20 } = req.query;

    // Students can only view their own goals
    if (requestingUser.role === 'student' && requestingUser.id !== parseInt(userId)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Students can only view their own goals'
      });
    }

    // Build query with filters
    let query = `
      SELECT id, title, description, goal_type, category, priority, status,
             target_date, completion_date, progress_percentage, created_at, updated_at
      FROM goals 
      WHERE user_id = ?
    `;
    const params = [userId];

    if (type && ['short_term', 'long_term'].includes(type)) {
      query += ' AND goal_type = ?';
      params.push(type);
    }

    if (category && ['academic', 'personal', 'career', 'other'].includes(category)) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (status && ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'].includes(status)) {
      query += ' AND status = ?';
      params.push(status);
    }

    // Add ordering and pagination
    query += ' ORDER BY priority DESC, created_at DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * limit;
    params.push(parseInt(limit), parseInt(offset));

    const goals = await findMany(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM goals WHERE user_id = ?';
    const countParams = [userId];

    if (type && ['short_term', 'long_term'].includes(type)) {
      countQuery += ' AND goal_type = ?';
      countParams.push(type);
    }

    if (category && ['academic', 'personal', 'career', 'other'].includes(category)) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }

    if (status && ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'].includes(status)) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const [{ total }] = await findMany(countQuery, countParams);

    res.json({
      goals: goals.map(goal => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        type: goal.goal_type,
        category: goal.category,
        priority: goal.priority,
        status: goal.status,
        targetDate: goal.target_date,
        completionDate: goal.completion_date,
        progress: goal.progress_percentage,
        createdAt: goal.created_at,
        updatedAt: goal.updated_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({
      error: 'Failed to fetch goals',
      message: 'Internal server error'
    });
  }
});

// Create new goal
router.post('/', requireAuth, [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title is required and must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('goalType')
    .isIn(['short_term', 'long_term'])
    .withMessage('Goal type must be either short_term or long_term'),
  body('category')
    .isIn(['academic', 'personal', 'career', 'other'])
    .withMessage('Category must be academic, personal, career, or other'),
  body('priority')
    .isIn(['high', 'medium', 'low'])
    .withMessage('Priority must be high, medium, or low'),
  body('targetDate')
    .optional()
    .isISO8601()
    .withMessage('Target date must be a valid date')
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

    const { title, description, goalType, category, priority, targetDate } = req.body;
    const userId = req.user.id;

    // Create goal
    const goalId = await insertRecord(`
      INSERT INTO goals (user_id, title, description, goal_type, category, priority, target_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userId, title, description, goalType, category, priority, targetDate || null]);

    // Get created goal
    const goal = await findOne(`
      SELECT id, title, description, goal_type, category, priority, status,
             target_date, completion_date, progress_percentage, created_at, updated_at
      FROM goals WHERE id = ?
    `, [goalId]);

    res.status(201).json({
      message: 'Goal created successfully',
      goal: {
        id: goal.id,
        title: goal.title,
        description: goal.description,
        type: goal.goal_type,
        category: goal.category,
        priority: goal.priority,
        status: goal.status,
        targetDate: goal.target_date,
        completionDate: goal.completion_date,
        progress: goal.progress_percentage,
        createdAt: goal.created_at,
        updatedAt: goal.updated_at
      }
    });

  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({
      error: 'Failed to create goal',
      message: 'Internal server error'
    });
  }
});

// Update goal
router.put('/:goalId', requireAuth, [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('goalType')
    .optional()
    .isIn(['short_term', 'long_term'])
    .withMessage('Goal type must be either short_term or long_term'),
  body('category')
    .optional()
    .isIn(['academic', 'personal', 'career', 'other'])
    .withMessage('Category must be academic, personal, career, or other'),
  body('priority')
    .optional()
    .isIn(['high', 'medium', 'low'])
    .withMessage('Priority must be high, medium, or low'),
  body('status')
    .optional()
    .isIn(['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'])
    .withMessage('Invalid status'),
  body('progress')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100'),
  body('targetDate')
    .optional()
    .isISO8601()
    .withMessage('Target date must be a valid date'),
  body('completionDate')
    .optional()
    .isISO8601()
    .withMessage('Completion date must be a valid date')
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

    const { goalId } = req.params;
    const requestingUser = req.user;
    const { title, description, goalType, category, priority, status, progress, targetDate, completionDate } = req.body;

    // Check if goal exists and user owns it
    const goal = await findOne('SELECT user_id FROM goals WHERE id = ?', [goalId]);
    if (!goal) {
      return res.status(404).json({
        error: 'Goal not found',
        message: 'The requested goal does not exist'
      });
    }

    // Students can only update their own goals
    if (requestingUser.role === 'student' && requestingUser.id !== goal.user_id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your own goals'
      });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (goalType !== undefined) {
      updates.push('goal_type = ?');
      params.push(goalType);
    }

    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }

    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
      
      // Auto-set completion date if status is completed
      if (status === 'completed' && !completionDate) {
        updates.push('completion_date = CURRENT_DATE');
      }
    }

    if (progress !== undefined) {
      updates.push('progress_percentage = ?');
      params.push(progress);
    }

    if (targetDate !== undefined) {
      updates.push('target_date = ?');
      params.push(targetDate);
    }

    if (completionDate !== undefined) {
      updates.push('completion_date = ?');
      params.push(completionDate);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No updates provided',
        message: 'At least one field must be provided for update'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(goalId);

    // Execute update
    await updateRecord(
      `UPDATE goals SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated goal
    const updatedGoal = await findOne(`
      SELECT id, title, description, goal_type, category, priority, status,
             target_date, completion_date, progress_percentage, created_at, updated_at
      FROM goals WHERE id = ?
    `, [goalId]);

    res.json({
      message: 'Goal updated successfully',
      goal: {
        id: updatedGoal.id,
        title: updatedGoal.title,
        description: updatedGoal.description,
        type: updatedGoal.goal_type,
        category: updatedGoal.category,
        priority: updatedGoal.priority,
        status: updatedGoal.status,
        targetDate: updatedGoal.target_date,
        completionDate: updatedGoal.completion_date,
        progress: updatedGoal.progress_percentage,
        createdAt: updatedGoal.created_at,
        updatedAt: updatedGoal.updated_at
      }
    });

  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({
      error: 'Failed to update goal',
      message: 'Internal server error'
    });
  }
});

// Delete goal
router.delete('/:goalId', requireAuth, async (req, res) => {
  try {
    const { goalId } = req.params;
    const requestingUser = req.user;

    // Check if goal exists and user owns it
    const goal = await findOne('SELECT user_id, title FROM goals WHERE id = ?', [goalId]);
    if (!goal) {
      return res.status(404).json({
        error: 'Goal not found',
        message: 'The requested goal does not exist'
      });
    }

    // Students can only delete their own goals
    if (requestingUser.role === 'student' && requestingUser.id !== goal.user_id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete your own goals'
      });
    }

    // Delete goal
    await deleteRecord('DELETE FROM goals WHERE id = ?', [goalId]);

    res.json({
      message: 'Goal deleted successfully',
      deletedGoal: {
        id: parseInt(goalId),
        title: goal.title
      }
    });

  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({
      error: 'Failed to delete goal',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
