const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
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
const { parseResume, autoPopulateProfile } = require('../utils/resumeParser');

const router = express.Router();

// Configure multer for memory storage (we'll store in database)
const storage = multer.memoryStorage();

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOCX, DOC, JPEG, PNG, and GIF files are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 1 // Only one file at a time
  }
});

// Helper function to extract text from files
async function extractTextFromFile(buffer, mimetype, originalName) {
  try {
    let extractedText = '';

    if (mimetype === 'application/pdf') {
      // Extract text from PDF
      const data = await pdfParse(buffer);
      extractedText = data.text;
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // Extract text from DOCX
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (mimetype === 'application/msword') {
      // DOC files are more complex to parse, for now just store filename
      extractedText = `Document: ${originalName}`;
    } else {
      // For images, just store filename
      extractedText = `Image: ${originalName}`;
    }

    return extractedText.trim();
  } catch (error) {
    console.error('Text extraction error:', error);
    return `File: ${originalName} (text extraction failed)`;
  }
}

// Helper function to calculate file hash
function calculateFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Upload file
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided',
        message: 'Please select a file to upload'
      });
    }

    const { purpose = 'other' } = req.body;
    const userId = req.user.id;
    const file = req.file;

    // Validate upload purpose
    const validPurposes = ['resume', 'profile_photo', 'survey_attachment', 'other'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({
        error: 'Invalid upload purpose',
        message: 'Purpose must be one of: resume, profile_photo, survey_attachment, other'
      });
    }

    // Calculate file hash to check for duplicates
    const fileHash = calculateFileHash(file.buffer);

    // Check if file already exists for this user
    const existingFile = await findOne(
      'SELECT id, file_name FROM uploaded_files WHERE user_id = ? AND file_hash = ?',
      [userId, fileHash]
    );

    if (existingFile) {
      return res.status(409).json({
        error: 'File already exists',
        message: `This file has already been uploaded as: ${existingFile.file_name}`
      });
    }

    // Extract text from file (for resumes and documents)
    let extractedText = null;
    if (purpose === 'resume' || file.mimetype.includes('pdf') || file.mimetype.includes('document')) {
      extractedText = await extractTextFromFile(file.buffer, file.mimetype, file.originalname);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const fileExtension = file.originalname.split('.').pop();
    const uniqueFileName = `${purpose}_${userId}_${timestamp}_${randomString}.${fileExtension}`;

    // Store file in database
    const fileId = await insertRecord(`
      INSERT INTO uploaded_files 
      (user_id, file_name, original_name, file_type, file_size, file_data, file_hash, 
       upload_purpose, extracted_text, processing_status, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      uniqueFileName,
      file.originalname,
      file.mimetype,
      file.size,
      file.buffer,
      fileHash,
      purpose,
      extractedText,
      'completed',
      JSON.stringify({
        uploadedAt: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      })
    ]);

    // If this is a profile photo, update the student profile
    if (purpose === 'profile_photo') {
      await updateRecord(
        'UPDATE student_profiles SET profile_photo_id = ? WHERE user_id = ?',
        [fileId, userId]
      );
    }

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: fileId,
        fileName: uniqueFileName,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        purpose: purpose,
        hasExtractedText: !!extractedText,
        uploadDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('File upload error:', error);

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'File too large',
          message: 'File size exceeds the maximum allowed limit'
        });
      }
    }

    res.status(500).json({
      error: 'Upload failed',
      message: 'Internal server error'
    });
  }
});

// Get user's files
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;
    const { purpose, page = 1, limit = 20 } = req.query;

    // Students can only view their own files
    if (requestingUser.role === 'student' && requestingUser.id !== parseInt(userId)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Students can only view their own files'
      });
    }

    // Build query with filters
    let query = `
      SELECT id, file_name, original_name, file_type, file_size, file_hash,
             upload_purpose, processing_status, upload_date, last_accessed,
             CASE WHEN extracted_text IS NOT NULL THEN TRUE ELSE FALSE END as has_extracted_text
      FROM uploaded_files 
      WHERE user_id = ?
    `;
    const params = [userId];

    if (purpose && ['resume', 'profile_photo', 'survey_attachment', 'other'].includes(purpose)) {
      query += ' AND upload_purpose = ?';
      params.push(purpose);
    }

    // Add ordering and pagination
    query += ' ORDER BY upload_date DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * limit;
    params.push(parseInt(limit), parseInt(offset));

    const files = await findMany(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM uploaded_files WHERE user_id = ?';
    const countParams = [userId];

    if (purpose && ['resume', 'profile_photo', 'survey_attachment', 'other'].includes(purpose)) {
      countQuery += ' AND upload_purpose = ?';
      countParams.push(purpose);
    }

    const [{ total }] = await findMany(countQuery, countParams);

    res.json({
      files: files.map(file => ({
        id: file.id,
        fileName: file.file_name,
        originalName: file.original_name,
        fileType: file.file_type,
        fileSize: file.file_size,
        fileHash: file.file_hash,
        purpose: file.upload_purpose,
        processingStatus: file.processing_status,
        hasExtractedText: file.has_extracted_text,
        uploadDate: file.upload_date,
        lastAccessed: file.last_accessed
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      error: 'Failed to fetch files',
      message: 'Internal server error'
    });
  }
});

// Download/view file
router.get('/:fileId', requireAuth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const requestingUser = req.user;

    // Get file info
    const file = await findOne(`
      SELECT id, user_id, file_name, original_name, file_type, file_size, 
             file_data, upload_purpose, processing_status
      FROM uploaded_files 
      WHERE id = ?
    `, [fileId]);

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    // Students can only access their own files
    if (requestingUser.role === 'student' && requestingUser.id !== file.user_id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own files'
      });
    }

    // Update last accessed timestamp
    await updateRecord(
      'UPDATE uploaded_files SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?',
      [fileId]
    );

    // Set appropriate headers
    res.set({
      'Content-Type': file.file_type,
      'Content-Length': file.file_size,
      'Content-Disposition': `inline; filename="${file.original_name}"`,
      'Cache-Control': 'private, max-age=3600'
    });

    // Send file data
    res.send(file.file_data);

  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({
      error: 'Download failed',
      message: 'Internal server error'
    });
  }
});

// Get extracted text from file
router.get('/:fileId/text', requireAuth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const requestingUser = req.user;

    // Get file info
    const file = await findOne(`
      SELECT id, user_id, original_name, extracted_text, upload_purpose
      FROM uploaded_files 
      WHERE id = ?
    `, [fileId]);

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    // Students can only access their own files
    if (requestingUser.role === 'student' && requestingUser.id !== file.user_id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own files'
      });
    }

    if (!file.extracted_text) {
      return res.status(404).json({
        error: 'No text available',
        message: 'No extracted text is available for this file'
      });
    }

    res.json({
      file: {
        id: file.id,
        originalName: file.original_name,
        purpose: file.upload_purpose,
        extractedText: file.extracted_text
      }
    });

  } catch (error) {
    console.error('Get extracted text error:', error);
    res.status(500).json({
      error: 'Failed to get extracted text',
      message: 'Internal server error'
    });
  }
});

// Delete file
router.delete('/:fileId', requireAuth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const requestingUser = req.user;

    // Get file info
    const file = await findOne(`
      SELECT id, user_id, original_name, upload_purpose
      FROM uploaded_files 
      WHERE id = ?
    `, [fileId]);

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    // Students can only delete their own files
    if (requestingUser.role === 'student' && requestingUser.id !== file.user_id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete your own files'
      });
    }

    // If this is a profile photo, remove reference from student profile
    if (file.upload_purpose === 'profile_photo') {
      await updateRecord(
        'UPDATE student_profiles SET profile_photo_id = NULL WHERE profile_photo_id = ?',
        [fileId]
      );
    }

    // Delete file
    await deleteRecord('DELETE FROM uploaded_files WHERE id = ?', [fileId]);

    res.json({
      message: 'File deleted successfully',
      deletedFile: {
        id: file.id,
        originalName: file.original_name,
        purpose: file.upload_purpose
      }
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      message: 'Internal server error'
    });
  }
});

// Parse resume and auto-populate profile
router.post('/:fileId/parse-resume', requireAuth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const requestingUser = req.user;
    const { autoPopulate = true } = req.body;

    // Get file info
    const file = await findOne(`
      SELECT id, user_id, original_name, extracted_text, upload_purpose
      FROM uploaded_files
      WHERE id = ? AND upload_purpose = 'resume'
    `, [fileId]);

    if (!file) {
      return res.status(404).json({
        error: 'Resume not found',
        message: 'The requested resume file does not exist'
      });
    }

    // Students can only parse their own resumes
    if (requestingUser.role === 'student' && requestingUser.id !== file.user_id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only parse your own resume'
      });
    }

    if (!file.extracted_text) {
      return res.status(400).json({
        error: 'No text available',
        message: 'No extracted text is available for this resume'
      });
    }

    // Parse resume
    const parsedData = parseResume(file.extracted_text);

    let populationResults = null;
    if (autoPopulate) {
      // Auto-populate profile
      populationResults = await autoPopulateProfile(file.user_id, parsedData);
    }

    res.json({
      message: 'Resume parsed successfully',
      file: {
        id: file.id,
        originalName: file.original_name
      },
      parsedData: {
        profile: parsedData.profile,
        skills: parsedData.skills.map(skill => ({
          name: skill.name,
          category: skill.category,
          proficiencyLevel: skill.proficiencyLevel
        })),
        goals: parsedData.goals.map(goal => ({
          title: goal.title,
          description: goal.description,
          type: goal.type,
          category: goal.category,
          priority: goal.priority
        })),
        interests: parsedData.interests.map(interest => ({
          name: interest.name,
          category: interest.category,
          level: interest.level
        })),
        contact: parsedData.contact
      },
      ...(populationResults && {
        autoPopulation: {
          profileUpdated: populationResults.profile,
          skillsAdded: populationResults.skills,
          goalsAdded: populationResults.goals,
          interestsAdded: populationResults.interests
        }
      })
    });

  } catch (error) {
    console.error('Resume parsing error:', error);
    res.status(500).json({
      error: 'Parsing failed',
      message: error.message || 'Internal server error'
    });
  }
});

module.exports = router;
