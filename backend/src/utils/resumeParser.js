/**
 * Resume Parser Utility
 * Extracts structured information from resume text to auto-populate student profiles
 */

const { insertRecord, findOne } = require('./database');

// Common skill keywords organized by category
const SKILL_KEYWORDS = {
  technical: [
    // Programming Languages
    'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift',
    'kotlin', 'typescript', 'scala', 'r', 'matlab', 'sql', 'html', 'css',
    
    // Frameworks & Libraries
    'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
    'laravel', 'rails', 'bootstrap', 'jquery', 'redux', 'next.js', 'nuxt.js',
    
    // Databases
    'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle', 'mariadb',
    'elasticsearch', 'cassandra', 'dynamodb',
    
    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'github',
    'gitlab', 'bitbucket', 'terraform', 'ansible', 'vagrant', 'linux', 'unix',
    
    // Other Technical
    'api', 'rest', 'graphql', 'microservices', 'agile', 'scrum', 'ci/cd',
    'machine learning', 'artificial intelligence', 'data science', 'blockchain'
  ],
  
  tools_software: [
    'microsoft office', 'excel', 'word', 'powerpoint', 'outlook', 'teams',
    'slack', 'jira', 'confluence', 'trello', 'asana', 'notion',
    'photoshop', 'illustrator', 'figma', 'sketch', 'canva',
    'tableau', 'power bi', 'google analytics', 'salesforce'
  ],
  
  soft: [
    'leadership', 'communication', 'teamwork', 'problem solving', 'critical thinking',
    'project management', 'time management', 'organization', 'creativity',
    'adaptability', 'collaboration', 'presentation', 'negotiation',
    'customer service', 'analytical thinking', 'attention to detail'
  ],
  
  language: [
    'english', 'spanish', 'french', 'german', 'chinese', 'japanese', 'korean',
    'italian', 'portuguese', 'russian', 'arabic', 'hindi', 'mandarin'
  ]
};

// Education level keywords
const EDUCATION_KEYWORDS = {
  'freshman': ['freshman', 'first year', '1st year'],
  'sophomore': ['sophomore', 'second year', '2nd year'],
  'junior': ['junior', 'third year', '3rd year'],
  'senior': ['senior', 'fourth year', '4th year', 'final year'],
  'graduate': ['graduate', 'masters', 'master\'s', 'phd', 'doctorate', 'postgraduate']
};

// Major/program keywords
const MAJOR_KEYWORDS = [
  'computer science', 'software engineering', 'information technology',
  'business administration', 'marketing', 'finance', 'accounting',
  'mechanical engineering', 'electrical engineering', 'civil engineering',
  'psychology', 'biology', 'chemistry', 'physics', 'mathematics',
  'graphic design', 'art', 'english', 'communications', 'journalism',
  'economics', 'political science', 'sociology', 'anthropology',
  'nursing', 'medicine', 'pharmacy', 'dentistry', 'veterinary'
];

/**
 * Extract skills from resume text
 */
function extractSkills(text) {
  const foundSkills = [];
  const lowerText = text.toLowerCase();
  
  for (const [category, skills] of Object.entries(SKILL_KEYWORDS)) {
    for (const skill of skills) {
      if (lowerText.includes(skill.toLowerCase())) {
        foundSkills.push({
          name: skill,
          category: category,
          proficiencyLevel: 'intermediate' // Default level
        });
      }
    }
  }
  
  // Remove duplicates
  const uniqueSkills = foundSkills.filter((skill, index, self) =>
    index === self.findIndex(s => s.name.toLowerCase() === skill.name.toLowerCase())
  );
  
  return uniqueSkills.slice(0, 20); // Limit to 20 skills
}

/**
 * Extract education level from resume text
 */
function extractEducationLevel(text) {
  const lowerText = text.toLowerCase();
  
  for (const [level, keywords] of Object.entries(EDUCATION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return level;
      }
    }
  }
  
  return null;
}

/**
 * Extract major/program from resume text
 */
function extractMajor(text) {
  const lowerText = text.toLowerCase();
  
  for (const major of MAJOR_KEYWORDS) {
    if (lowerText.includes(major.toLowerCase())) {
      return major.charAt(0).toUpperCase() + major.slice(1);
    }
  }
  
  return null;
}

/**
 * Extract contact information from resume text
 */
function extractContactInfo(text) {
  const contact = {};
  
  // Extract email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailRegex);
  if (emails && emails.length > 0) {
    contact.email = emails[0];
  }
  
  // Extract phone number
  const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  const phones = text.match(phoneRegex);
  if (phones && phones.length > 0) {
    contact.phone = phones[0];
  }
  
  return contact;
}

/**
 * Extract potential goals from resume text
 */
function extractGoals(text) {
  const goals = [];
  const lowerText = text.toLowerCase();
  
  // Look for objective/goal sections
  const objectiveRegex = /(objective|goal|career objective|professional objective)[:\s]+(.*?)(?=\n\n|\n[A-Z]|$)/gi;
  const matches = text.match(objectiveRegex);
  
  if (matches) {
    for (const match of matches) {
      const goalText = match.replace(/(objective|goal|career objective|professional objective)[:\s]+/gi, '').trim();
      if (goalText.length > 10 && goalText.length < 500) {
        goals.push({
          title: goalText.length > 100 ? goalText.substring(0, 100) + '...' : goalText,
          description: goalText,
          type: 'long_term',
          category: 'career',
          priority: 'high'
        });
      }
    }
  }
  
  // Default career goal if none found
  if (goals.length === 0) {
    goals.push({
      title: 'Advance my career in my field of study',
      description: 'Develop professional skills and gain experience in my chosen field',
      type: 'long_term',
      category: 'career',
      priority: 'medium'
    });
  }
  
  return goals.slice(0, 3); // Limit to 3 goals
}

/**
 * Extract interests from resume text
 */
function extractInterests(text) {
  const interests = [];
  const lowerText = text.toLowerCase();
  
  // Common interest keywords
  const interestKeywords = {
    'academic': ['research', 'learning', 'studying', 'education', 'academic'],
    'hobby': ['reading', 'writing', 'photography', 'music', 'art', 'cooking', 'gaming', 'sports'],
    'extracurricular': ['volunteer', 'community service', 'club', 'organization', 'leadership'],
    'industry': ['technology', 'business', 'healthcare', 'finance', 'marketing', 'design']
  };
  
  for (const [category, keywords] of Object.entries(interestKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        interests.push({
          name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          category: category,
          level: 'medium'
        });
      }
    }
  }
  
  // Remove duplicates
  const uniqueInterests = interests.filter((interest, index, self) =>
    index === self.findIndex(i => i.name.toLowerCase() === interest.name.toLowerCase())
  );
  
  return uniqueInterests.slice(0, 10); // Limit to 10 interests
}

/**
 * Parse resume and extract structured data
 */
function parseResume(resumeText) {
  if (!resumeText || resumeText.trim().length < 50) {
    throw new Error('Resume text is too short or empty');
  }
  
  const parsedData = {
    profile: {},
    skills: extractSkills(resumeText),
    goals: extractGoals(resumeText),
    interests: extractInterests(resumeText),
    contact: extractContactInfo(resumeText)
  };
  
  // Extract education level
  const educationLevel = extractEducationLevel(resumeText);
  if (educationLevel) {
    parsedData.profile.yearLevel = educationLevel;
  }
  
  // Extract major
  const major = extractMajor(resumeText);
  if (major) {
    parsedData.profile.majorProgram = major;
  }
  
  return parsedData;
}

/**
 * Auto-populate student profile from parsed resume data
 */
async function autoPopulateProfile(userId, parsedData) {
  const results = {
    profile: false,
    skills: 0,
    goals: 0,
    interests: 0
  };
  
  try {
    // Update student profile if data available
    if (parsedData.profile && Object.keys(parsedData.profile).length > 0) {
      const updates = [];
      const params = [];
      
      if (parsedData.profile.yearLevel) {
        updates.push('year_level = ?');
        params.push(parsedData.profile.yearLevel);
      }
      
      if (parsedData.profile.majorProgram) {
        updates.push('major_program = ?');
        params.push(parsedData.profile.majorProgram);
      }
      
      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(userId);
        
        const { updateRecord } = require('./database');
        await updateRecord(
          `UPDATE student_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
          params
        );
        results.profile = true;
      }
    }
    
    // Add skills (avoid duplicates)
    for (const skill of parsedData.skills) {
      const existing = await findOne(
        'SELECT id FROM skills WHERE user_id = ? AND skill_name = ?',
        [userId, skill.name]
      );
      
      if (!existing) {
        await insertRecord(
          'INSERT INTO skills (user_id, skill_name, category, proficiency_level) VALUES (?, ?, ?, ?)',
          [userId, skill.name, skill.category, skill.proficiencyLevel]
        );
        results.skills++;
      }
    }
    
    // Add goals (avoid duplicates)
    for (const goal of parsedData.goals) {
      const existing = await findOne(
        'SELECT id FROM goals WHERE user_id = ? AND title = ?',
        [userId, goal.title]
      );
      
      if (!existing) {
        await insertRecord(
          'INSERT INTO goals (user_id, title, description, goal_type, category, priority) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, goal.title, goal.description, goal.type, goal.category, goal.priority]
        );
        results.goals++;
      }
    }
    
    // Add interests (avoid duplicates)
    for (const interest of parsedData.interests) {
      const existing = await findOne(
        'SELECT id FROM interests WHERE user_id = ? AND interest_name = ?',
        [userId, interest.name]
      );
      
      if (!existing) {
        await insertRecord(
          'INSERT INTO interests (user_id, interest_name, category, level_of_interest) VALUES (?, ?, ?, ?)',
          [userId, interest.name, interest.category, interest.level]
        );
        results.interests++;
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('Auto-populate profile error:', error);
    throw error;
  }
}

module.exports = {
  parseResume,
  autoPopulateProfile,
  extractSkills,
  extractEducationLevel,
  extractMajor,
  extractContactInfo,
  extractGoals,
  extractInterests
};
