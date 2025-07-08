const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  findOne, 
  findMany, 
  insertRecord, 
  updateRecord, 
  deleteRecord,
  executeTransaction 
} = require('../utils/database');
const {
  requireAuth,
  requireRole,
  getCurrentUser
} = require('../middleware/auth');

const router = express.Router();

// Get student profile
router.get('/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;

    // Students can only view their own profile, teachers/admins can view any
    if (requestingUser.role === 'student' && requestingUser.id !== parseInt(userId)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Students can only view their own profile'
      });
    }

    // Get user and profile data
    const profile = await findOne(`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.role, u.created_at,
        sp.student_id, sp.year_level, sp.major_program, sp.bio, 
        sp.profile_completion_percentage, sp.contact_preferences,
        sp.created_at as profile_created_at, sp.updated_at as profile_updated_at
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE u.id = ? AND u.role = 'student'
    `, [userId]);

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found',
        message: 'Student profile does not exist'
      });
    }

    // Get goals
    const goals = await findMany(`
      SELECT id, title, description, goal_type, category, priority, status, 
             target_date, completion_date, progress_percentage, created_at, updated_at
      FROM goals 
      WHERE user_id = ? 
      ORDER BY priority DESC, created_at DESC
    `, [userId]);

    // Get skills
    const skills = await findMany(`
      SELECT id, skill_name, category, proficiency_level, proficiency_score,
             is_verified, date_acquired, last_updated, notes, created_at
      FROM skills 
      WHERE user_id = ? 
      ORDER BY category, skill_name
    `, [userId]);

    // Get interests
    const interests = await findMany(`
      SELECT id, interest_name, category, description, level_of_interest, created_at
      FROM interests 
      WHERE user_id = ? 
      ORDER BY level_of_interest DESC, category, interest_name
    `, [userId]);

    res.json({
      profile: {
        user: {
          id: profile.id,
          email: profile.email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          role: profile.role,
          createdAt: profile.created_at
        },
        studentProfile: {
          studentId: profile.student_id,
          yearLevel: profile.year_level,
          majorProgram: profile.major_program,
          bio: profile.bio,
          profileCompletion: profile.profile_completion_percentage,
          contactPreferences: profile.contact_preferences ? JSON.parse(profile.contact_preferences) : null,
          createdAt: profile.profile_created_at,
          updatedAt: profile.profile_updated_at
        },
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
        skills: skills.map(skill => ({
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
        })),
        interests: interests.map(interest => ({
          id: interest.id,
          name: interest.interest_name,
          category: interest.category,
          description: interest.description,
          level: interest.level_of_interest,
          createdAt: interest.created_at
        }))
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      message: 'Internal server error'
    });
  }
});

// Update student profile basic info
router.put('/:userId', requireAuth, [
  body('studentId')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Student ID must be less than 50 characters'),
  body('yearLevel')
    .optional()
    .isIn(['freshman', 'sophomore', 'junior', 'senior', 'graduate', 'other'])
    .withMessage('Invalid year level'),
  body('majorProgram')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Major/Program must be less than 200 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio must be less than 1000 characters'),
  body('contactPreferences')
    .optional()
    .isObject()
    .withMessage('Contact preferences must be an object')
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

    const { userId } = req.params;
    const requestingUser = req.user;
    const { studentId, yearLevel, majorProgram, bio, contactPreferences } = req.body;

    // Students can only update their own profile
    if (requestingUser.role === 'student' && requestingUser.id !== parseInt(userId)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Students can only update their own profile'
      });
    }

    // Check if profile exists
    const existingProfile = await findOne(
      'SELECT id FROM student_profiles WHERE user_id = ?',
      [userId]
    );

    if (!existingProfile) {
      return res.status(404).json({
        error: 'Profile not found',
        message: 'Student profile does not exist'
      });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (studentId !== undefined) {
      updates.push('student_id = ?');
      params.push(studentId);
    }

    if (yearLevel !== undefined) {
      updates.push('year_level = ?');
      params.push(yearLevel);
    }

    if (majorProgram !== undefined) {
      updates.push('major_program = ?');
      params.push(majorProgram);
    }

    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(bio);
    }

    if (contactPreferences !== undefined) {
      updates.push('contact_preferences = ?');
      params.push(JSON.stringify(contactPreferences));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No updates provided',
        message: 'At least one field must be provided for update'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId);

    // Execute update
    await updateRecord(
      `UPDATE student_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
      params
    );

    // Calculate and update profile completion
    await updateProfileCompletion(userId);

    // Get updated profile
    const updatedProfile = await findOne(`
      SELECT student_id, year_level, major_program, bio, 
             profile_completion_percentage, contact_preferences, updated_at
      FROM student_profiles WHERE user_id = ?
    `, [userId]);

    res.json({
      message: 'Profile updated successfully',
      profile: {
        studentId: updatedProfile.student_id,
        yearLevel: updatedProfile.year_level,
        majorProgram: updatedProfile.major_program,
        bio: updatedProfile.bio,
        profileCompletion: updatedProfile.profile_completion_percentage,
        contactPreferences: updatedProfile.contact_preferences ? JSON.parse(updatedProfile.contact_preferences) : null,
        updatedAt: updatedProfile.updated_at
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'Internal server error'
    });
  }
});

// Calculate profile completion percentage
async function updateProfileCompletion(userId) {
  try {
    // Get profile data
    const profile = await findOne(`
      SELECT student_id, year_level, major_program, bio
      FROM student_profiles WHERE user_id = ?
    `, [userId]);

    // Get counts
    const [goalCount] = await findMany('SELECT COUNT(*) as count FROM goals WHERE user_id = ?', [userId]);
    const [skillCount] = await findMany('SELECT COUNT(*) as count FROM skills WHERE user_id = ?', [userId]);
    const [interestCount] = await findMany('SELECT COUNT(*) as count FROM interests WHERE user_id = ?', [userId]);

    // Calculate completion percentage
    let completedFields = 0;
    const totalFields = 7; // studentId, yearLevel, majorProgram, bio, goals, skills, interests

    if (profile.student_id) completedFields++;
    if (profile.year_level) completedFields++;
    if (profile.major_program) completedFields++;
    if (profile.bio && profile.bio.length > 10) completedFields++;
    if (goalCount.count > 0) completedFields++;
    if (skillCount.count > 0) completedFields++;
    if (interestCount.count > 0) completedFields++;

    const completionPercentage = Math.round((completedFields / totalFields) * 100);

    // Update completion percentage
    await updateRecord(
      'UPDATE student_profiles SET profile_completion_percentage = ? WHERE user_id = ?',
      [completionPercentage, userId]
    );

    return completionPercentage;
  } catch (error) {
    console.error('Update profile completion error:', error);
    return 0;
  }
}

module.exports = router;
