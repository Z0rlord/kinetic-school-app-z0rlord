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

// Get skills for a user
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;
    const { category, proficiencyLevel, verified, page = 1, limit = 50 } = req.query;

    // Students can only view their own skills
    if (requestingUser.role === 'student' && requestingUser.id !== parseInt(userId)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Students can only view their own skills'
      });
    }

    // Build query with filters
    let query = `
      SELECT id, skill_name, category, proficiency_level, proficiency_score,
             is_verified, verified_by, date_acquired, last_updated, notes, created_at
      FROM skills 
      WHERE user_id = ?
    `;
    const params = [userId];

    if (category && ['technical', 'soft', 'language', 'tools_software', 'other'].includes(category)) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (proficiencyLevel && ['beginner', 'intermediate', 'advanced', 'expert'].includes(proficiencyLevel)) {
      query += ' AND proficiency_level = ?';
      params.push(proficiencyLevel);
    }

    if (verified !== undefined) {
      query += ' AND is_verified = ?';
      params.push(verified === 'true');
    }

    // Add ordering and pagination
    query += ' ORDER BY category, skill_name LIMIT ? OFFSET ?';
    const offset = (page - 1) * limit;
    params.push(parseInt(limit), parseInt(offset));

    const skills = await findMany(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM skills WHERE user_id = ?';
    const countParams = [userId];

    if (category && ['technical', 'soft', 'language', 'tools_software', 'other'].includes(category)) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }

    if (proficiencyLevel && ['beginner', 'intermediate', 'advanced', 'expert'].includes(proficiencyLevel)) {
      countQuery += ' AND proficiency_level = ?';
      countParams.push(proficiencyLevel);
    }

    if (verified !== undefined) {
      countQuery += ' AND is_verified = ?';
      countParams.push(verified === 'true');
    }

    const [{ total }] = await findMany(countQuery, countParams);

    res.json({
      skills: skills.map(skill => ({
        id: skill.id,
        name: skill.skill_name,
        category: skill.category,
        proficiencyLevel: skill.proficiency_level,
        proficiencyScore: skill.proficiency_score,
        isVerified: skill.is_verified,
        verifiedBy: skill.verified_by,
        dateAcquired: skill.date_acquired,
        lastUpdated: skill.last_updated,
        notes: skill.notes,
        createdAt: skill.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({
      error: 'Failed to fetch skills',
      message: 'Internal server error'
    });
  }
});

// Create new skill
router.post('/', requireAuth, [
  body('skillName')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Skill name is required and must be less than 200 characters'),
  body('category')
    .isIn(['technical', 'soft', 'language', 'tools_software', 'other'])
    .withMessage('Category must be technical, soft, language, tools_software, or other'),
  body('proficiencyLevel')
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Proficiency level must be beginner, intermediate, advanced, or expert'),
  body('proficiencyScore')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Proficiency score must be between 1 and 5'),
  body('dateAcquired')
    .optional()
    .isISO8601()
    .withMessage('Date acquired must be a valid date'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
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

    const { skillName, category, proficiencyLevel, proficiencyScore, dateAcquired, notes } = req.body;
    const userId = req.user.id;

    // Check if skill already exists for this user
    const existingSkill = await findOne(
      'SELECT id FROM skills WHERE user_id = ? AND skill_name = ?',
      [userId, skillName]
    );

    if (existingSkill) {
      return res.status(409).json({
        error: 'Skill already exists',
        message: 'You have already added this skill to your profile'
      });
    }

    // Create skill
    const skillId = await insertRecord(`
      INSERT INTO skills (user_id, skill_name, category, proficiency_level, proficiency_score, date_acquired, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [userId, skillName, category, proficiencyLevel, proficiencyScore || null, dateAcquired || null, notes || null]);

    // Get created skill
    const skill = await findOne(`
      SELECT id, skill_name, category, proficiency_level, proficiency_score,
             is_verified, date_acquired, last_updated, notes, created_at
      FROM skills WHERE id = ?
    `, [skillId]);

    res.status(201).json({
      message: 'Skill added successfully',
      skill: {
        id: skill.id,
        name: skill.skill_name,
        category: skill.category,
        proficiencyLevel: skill.proficiency_level,
        proficiencyScore: skill.proficiency_score,
        isVerified: skill.is_verified,
        dateAcquired: skill.date_acquired,
        lastUpdated: skill.last_updated,
        notes: skill.notes,
        createdAt: skill.created_at
      }
    });

  } catch (error) {
    console.error('Create skill error:', error);
    res.status(500).json({
      error: 'Failed to create skill',
      message: 'Internal server error'
    });
  }
});

// Update skill
router.put('/:skillId', requireAuth, [
  body('skillName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Skill name must be less than 200 characters'),
  body('category')
    .optional()
    .isIn(['technical', 'soft', 'language', 'tools_software', 'other'])
    .withMessage('Category must be technical, soft, language, tools_software, or other'),
  body('proficiencyLevel')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Proficiency level must be beginner, intermediate, advanced, or expert'),
  body('proficiencyScore')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Proficiency score must be between 1 and 5'),
  body('dateAcquired')
    .optional()
    .isISO8601()
    .withMessage('Date acquired must be a valid date'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
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

    const { skillId } = req.params;
    const requestingUser = req.user;
    const { skillName, category, proficiencyLevel, proficiencyScore, dateAcquired, notes } = req.body;

    // Check if skill exists and user owns it
    const skill = await findOne('SELECT user_id, skill_name FROM skills WHERE id = ?', [skillId]);
    if (!skill) {
      return res.status(404).json({
        error: 'Skill not found',
        message: 'The requested skill does not exist'
      });
    }

    // Students can only update their own skills
    if (requestingUser.role === 'student' && requestingUser.id !== skill.user_id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your own skills'
      });
    }

    // Check for duplicate skill name if updating name
    if (skillName && skillName !== skill.skill_name) {
      const existingSkill = await findOne(
        'SELECT id FROM skills WHERE user_id = ? AND skill_name = ? AND id != ?',
        [skill.user_id, skillName, skillId]
      );

      if (existingSkill) {
        return res.status(409).json({
          error: 'Skill name already exists',
          message: 'You already have a skill with this name'
        });
      }
    }

    // Build update query
    const updates = [];
    const params = [];

    if (skillName !== undefined) {
      updates.push('skill_name = ?');
      params.push(skillName);
    }

    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }

    if (proficiencyLevel !== undefined) {
      updates.push('proficiency_level = ?');
      params.push(proficiencyLevel);
    }

    if (proficiencyScore !== undefined) {
      updates.push('proficiency_score = ?');
      params.push(proficiencyScore);
    }

    if (dateAcquired !== undefined) {
      updates.push('date_acquired = ?');
      params.push(dateAcquired);
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No updates provided',
        message: 'At least one field must be provided for update'
      });
    }

    updates.push('last_updated = CURRENT_DATE');
    params.push(skillId);

    // Execute update
    await updateRecord(
      `UPDATE skills SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated skill
    const updatedSkill = await findOne(`
      SELECT id, skill_name, category, proficiency_level, proficiency_score,
             is_verified, date_acquired, last_updated, notes, created_at
      FROM skills WHERE id = ?
    `, [skillId]);

    res.json({
      message: 'Skill updated successfully',
      skill: {
        id: updatedSkill.id,
        name: updatedSkill.skill_name,
        category: updatedSkill.category,
        proficiencyLevel: updatedSkill.proficiency_level,
        proficiencyScore: updatedSkill.proficiency_score,
        isVerified: updatedSkill.is_verified,
        dateAcquired: updatedSkill.date_acquired,
        lastUpdated: updatedSkill.last_updated,
        notes: updatedSkill.notes,
        createdAt: updatedSkill.created_at
      }
    });

  } catch (error) {
    console.error('Update skill error:', error);
    res.status(500).json({
      error: 'Failed to update skill',
      message: 'Internal server error'
    });
  }
});

// Delete skill
router.delete('/:skillId', requireAuth, async (req, res) => {
  try {
    const { skillId } = req.params;
    const requestingUser = req.user;

    // Check if skill exists and user owns it
    const skill = await findOne('SELECT user_id, skill_name FROM skills WHERE id = ?', [skillId]);
    if (!skill) {
      return res.status(404).json({
        error: 'Skill not found',
        message: 'The requested skill does not exist'
      });
    }

    // Students can only delete their own skills
    if (requestingUser.role === 'student' && requestingUser.id !== skill.user_id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete your own skills'
      });
    }

    // Delete skill
    await deleteRecord('DELETE FROM skills WHERE id = ?', [skillId]);

    res.json({
      message: 'Skill deleted successfully',
      deletedSkill: {
        id: parseInt(skillId),
        name: skill.skill_name
      }
    });

  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({
      error: 'Failed to delete skill',
      message: 'Internal server error'
    });
  }
});

// Verify skill (teachers/admins only)
router.put('/:skillId/verify', requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { skillId } = req.params;
    const verifyingUser = req.user;

    // Check if skill exists
    const skill = await findOne('SELECT id, skill_name, user_id FROM skills WHERE id = ?', [skillId]);
    if (!skill) {
      return res.status(404).json({
        error: 'Skill not found',
        message: 'The requested skill does not exist'
      });
    }

    // Update skill verification
    await updateRecord(
      'UPDATE skills SET is_verified = TRUE, verified_by = ? WHERE id = ?',
      [verifyingUser.id, skillId]
    );

    res.json({
      message: 'Skill verified successfully',
      skill: {
        id: skill.id,
        name: skill.skill_name,
        isVerified: true,
        verifiedBy: verifyingUser.id
      }
    });

  } catch (error) {
    console.error('Verify skill error:', error);
    res.status(500).json({
      error: 'Failed to verify skill',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
