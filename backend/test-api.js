#!/usr/bin/env node

/**
 * Comprehensive API test script for Student Profile System
 * Tests all major endpoints including profiles, goals, skills, and interests
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const TEST_USER = {
  email: 'apitest@example.com',
  password: 'TestPassword123!',
  firstName: 'API',
  lastName: 'Tester',
  role: 'student'
};

// Create axios instance with cookie support
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 10000
});

let authToken = null;
let userId = null;

async function setupTestUser() {
  console.log('🔧 Setting up test user...');
  
  try {
    // Try to register
    const registerResponse = await api.post('/auth/register', TEST_USER);
    console.log('✅ User registered successfully');
    
    // Verify email if token provided
    if (registerResponse.data.verificationToken) {
      await api.post('/auth/verify-email', {
        token: registerResponse.data.verificationToken
      });
      console.log('✅ Email verified');
    }
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('ℹ️  User already exists, continuing...');
    } else {
      throw error;
    }
  }

  // Login
  const loginResponse = await api.post('/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });
  
  userId = loginResponse.data.user.id;
  console.log(`✅ Logged in as user ${userId}`);
  return userId;
}

async function testProfileEndpoints() {
  console.log('\n📋 Testing Profile Endpoints...');
  
  // Get profile
  const profileResponse = await api.get(`/profiles/${userId}`);
  console.log('✅ Get profile successful');
  
  // Update profile
  const updateData = {
    studentId: 'TEST001',
    yearLevel: 'junior',
    majorProgram: 'Computer Science',
    bio: 'Test student for API testing',
    contactPreferences: {
      email: true,
      sms: false,
      notifications: true
    }
  };
  
  const updateResponse = await api.put(`/profiles/${userId}`, updateData);
  console.log('✅ Update profile successful');
  
  return updateResponse.data;
}

async function testGoalsEndpoints() {
  console.log('\n🎯 Testing Goals Endpoints...');
  
  // Create goal
  const goalData = {
    title: 'Learn API Testing',
    description: 'Master the art of API testing with automated scripts',
    goalType: 'short_term',
    category: 'academic',
    priority: 'high',
    targetDate: '2024-12-31'
  };
  
  const createResponse = await api.post('/goals', goalData);
  const goalId = createResponse.data.goal.id;
  console.log(`✅ Goal created with ID: ${goalId}`);
  
  // Get goals
  const goalsResponse = await api.get(`/goals/user/${userId}`);
  console.log(`✅ Retrieved ${goalsResponse.data.goals.length} goals`);
  
  // Update goal
  const updateData = {
    status: 'in_progress',
    progress: 50
  };
  
  await api.put(`/goals/${goalId}`, updateData);
  console.log('✅ Goal updated successfully');
  
  // Test goal filters
  const filteredResponse = await api.get(`/goals/user/${userId}?category=academic&status=in_progress`);
  console.log(`✅ Filtered goals: ${filteredResponse.data.goals.length} results`);
  
  return goalId;
}

async function testSkillsEndpoints() {
  console.log('\n💪 Testing Skills Endpoints...');
  
  // Create skill
  const skillData = {
    skillName: 'API Testing',
    category: 'technical',
    proficiencyLevel: 'intermediate',
    proficiencyScore: 3,
    dateAcquired: '2024-01-01',
    notes: 'Learned through hands-on practice'
  };
  
  const createResponse = await api.post('/skills', skillData);
  const skillId = createResponse.data.skill.id;
  console.log(`✅ Skill created with ID: ${skillId}`);
  
  // Get skills
  const skillsResponse = await api.get(`/skills/user/${userId}`);
  console.log(`✅ Retrieved ${skillsResponse.data.skills.length} skills`);
  
  // Update skill
  const updateData = {
    proficiencyLevel: 'advanced',
    proficiencyScore: 4,
    notes: 'Improved through extensive practice'
  };
  
  await api.put(`/skills/${skillId}`, updateData);
  console.log('✅ Skill updated successfully');
  
  // Test skill filters
  const filteredResponse = await api.get(`/skills/user/${userId}?category=technical&proficiencyLevel=advanced`);
  console.log(`✅ Filtered skills: ${filteredResponse.data.skills.length} results`);
  
  return skillId;
}

async function testInterestsEndpoints() {
  console.log('\n❤️  Testing Interests Endpoints...');
  
  // Create interest
  const interestData = {
    interestName: 'Software Testing',
    category: 'academic',
    description: 'Passionate about ensuring software quality through comprehensive testing',
    level: 'high'
  };
  
  const createResponse = await api.post('/interests', interestData);
  const interestId = createResponse.data.interest.id;
  console.log(`✅ Interest created with ID: ${interestId}`);
  
  // Get interests
  const interestsResponse = await api.get(`/interests/user/${userId}`);
  console.log(`✅ Retrieved ${interestsResponse.data.interests.length} interests`);
  
  // Update interest
  const updateData = {
    description: 'Deeply passionate about automated testing and quality assurance',
    level: 'high'
  };
  
  await api.put(`/interests/${interestId}`, updateData);
  console.log('✅ Interest updated successfully');
  
  // Test interest filters
  const filteredResponse = await api.get(`/interests/user/${userId}?category=academic&level=high`);
  console.log(`✅ Filtered interests: ${filteredResponse.data.interests.length} results`);
  
  return interestId;
}

async function testAccessControl() {
  console.log('\n🔒 Testing Access Control...');
  
  // Try to access another user's data (should fail)
  try {
    await api.get('/profiles/999');
    console.log('⚠️  Access control test failed - should not be able to access other user data');
  } catch (error) {
    if (error.response?.status === 403 || error.response?.status === 404) {
      console.log('✅ Access control working - correctly denied access to other user data');
    } else {
      console.log('⚠️  Unexpected error in access control test:', error.response?.status);
    }
  }
}

async function testValidation() {
  console.log('\n✅ Testing Input Validation...');
  
  // Test invalid goal data
  try {
    await api.post('/goals', {
      title: '', // Invalid: empty title
      goalType: 'invalid_type', // Invalid: wrong enum value
      category: 'academic',
      priority: 'high'
    });
    console.log('⚠️  Validation test failed - should reject invalid data');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Input validation working - correctly rejected invalid data');
    } else {
      console.log('⚠️  Unexpected error in validation test:', error.response?.status);
    }
  }
}

async function testPagination() {
  console.log('\n📄 Testing Pagination...');
  
  // Test goals pagination
  const page1 = await api.get(`/goals/user/${userId}?page=1&limit=2`);
  console.log(`✅ Page 1: ${page1.data.goals.length} goals, total: ${page1.data.pagination.total}`);
  
  // Test skills pagination
  const skillsPage = await api.get(`/skills/user/${userId}?page=1&limit=5`);
  console.log(`✅ Skills pagination: ${skillsPage.data.skills.length} skills`);
}

async function cleanupTestData(goalId, skillId, interestId) {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    if (goalId) {
      await api.delete(`/goals/${goalId}`);
      console.log('✅ Test goal deleted');
    }
    
    if (skillId) {
      await api.delete(`/skills/${skillId}`);
      console.log('✅ Test skill deleted');
    }
    
    if (interestId) {
      await api.delete(`/interests/${interestId}`);
      console.log('✅ Test interest deleted');
    }
  } catch (error) {
    console.log('⚠️  Some cleanup operations failed:', error.message);
  }
}

async function runAPITests() {
  console.log('🧪 Starting Comprehensive API Tests');
  console.log('===================================\n');

  let goalId, skillId, interestId;

  try {
    // Setup
    await setupTestUser();
    
    // Test all endpoints
    await testProfileEndpoints();
    goalId = await testGoalsEndpoints();
    skillId = await testSkillsEndpoints();
    interestId = await testInterestsEndpoints();
    
    // Test security and validation
    await testAccessControl();
    await testValidation();
    await testPagination();
    
    console.log('\n🎉 All API tests completed successfully!');
    
  } catch (error) {
    console.error('\n💥 API test failed:', error.response?.data || error.message);
    throw error;
  } finally {
    // Cleanup
    await cleanupTestData(goalId, skillId, interestId);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests if this script is executed directly
if (require.main === module) {
  runAPITests().catch(error => {
    console.error('💥 API test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runAPITests };
