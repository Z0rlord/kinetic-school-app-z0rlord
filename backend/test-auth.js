#!/usr/bin/env node

/**
 * Simple authentication system test script
 * This script tests the basic authentication endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  role: 'student'
};

// Create axios instance with cookie support
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 10000
});

async function testHealthCheck() {
  console.log('🏥 Testing health check...');
  try {
    const response = await api.get('/health');
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testRegistration() {
  console.log('📝 Testing user registration...');
  try {
    const response = await api.post('/auth/register', TEST_USER);
    console.log('✅ Registration successful:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('ℹ️  User already exists, continuing...');
      return { user: TEST_USER };
    }
    console.error('❌ Registration failed:', error.response?.data || error.message);
    return null;
  }
}

async function testEmailVerification(verificationToken) {
  if (!verificationToken) {
    console.log('⚠️  No verification token provided, skipping email verification');
    return true;
  }

  console.log('📧 Testing email verification...');
  try {
    const response = await api.post('/auth/verify-email', {
      token: verificationToken
    });
    console.log('✅ Email verification successful:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Email verification failed:', error.response?.data || error.message);
    return false;
  }
}

async function testLogin() {
  console.log('🔐 Testing login...');
  try {
    const response = await api.post('/auth/login', {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    console.log('✅ Login successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetCurrentUser() {
  console.log('👤 Testing get current user...');
  try {
    const response = await api.get('/auth/me');
    console.log('✅ Get current user successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Get current user failed:', error.response?.data || error.message);
    return null;
  }
}

async function testGetUsers() {
  console.log('👥 Testing get users (should fail for non-admin)...');
  try {
    const response = await api.get('/users');
    console.log('⚠️  Get users unexpectedly succeeded:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('✅ Get users correctly denied for non-admin user');
      return true;
    }
    console.error('❌ Get users failed with unexpected error:', error.response?.data || error.message);
    return false;
  }
}

async function testUpdateProfile(userId) {
  console.log('✏️  Testing profile update...');
  try {
    const response = await api.put(`/users/${userId}`, {
      firstName: 'Updated',
      lastName: 'Name'
    });
    console.log('✅ Profile update successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Profile update failed:', error.response?.data || error.message);
    return null;
  }
}

async function testPasswordChange(userId) {
  console.log('🔑 Testing password change...');
  try {
    const response = await api.put(`/users/${userId}/password`, {
      currentPassword: TEST_USER.password,
      newPassword: 'NewTestPassword123!'
    });
    console.log('✅ Password change successful:', response.data);
    
    // Update test user password for future tests
    TEST_USER.password = 'NewTestPassword123!';
    return true;
  } catch (error) {
    console.error('❌ Password change failed:', error.response?.data || error.message);
    return false;
  }
}

async function testLogout() {
  console.log('🚪 Testing logout...');
  try {
    const response = await api.post('/auth/logout');
    console.log('✅ Logout successful:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Logout failed:', error.response?.data || error.message);
    return false;
  }
}

async function testProtectedEndpointAfterLogout() {
  console.log('🔒 Testing protected endpoint after logout...');
  try {
    const response = await api.get('/auth/me');
    console.log('⚠️  Protected endpoint unexpectedly accessible after logout');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Protected endpoint correctly denied after logout');
      return true;
    }
    console.error('❌ Protected endpoint failed with unexpected error:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting Authentication System Tests');
  console.log('=====================================\n');

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'User Registration', fn: testRegistration },
    { name: 'Login', fn: testLogin },
    { name: 'Get Current User', fn: testGetCurrentUser },
    { name: 'Get Users (Access Control)', fn: testGetUsers },
    { name: 'Logout', fn: testLogout },
    { name: 'Protected Endpoint After Logout', fn: testProtectedEndpointAfterLogout }
  ];

  let registrationData = null;
  let loginData = null;

  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    results.total++;

    try {
      let result;
      
      if (test.name === 'User Registration') {
        result = await test.fn();
        registrationData = result;
      } else if (test.name === 'Email Verification' && registrationData) {
        result = await testEmailVerification(registrationData.verificationToken);
      } else if (test.name === 'Login') {
        result = await test.fn();
        loginData = result;
      } else if (test.name === 'Update Profile' && loginData) {
        result = await testUpdateProfile(loginData.user.id);
      } else if (test.name === 'Password Change' && loginData) {
        result = await testPasswordChange(loginData.user.id);
      } else {
        result = await test.fn();
      }

      if (result) {
        results.passed++;
        console.log(`✅ ${test.name} PASSED`);
      } else {
        results.failed++;
        console.log(`❌ ${test.name} FAILED`);
      }
    } catch (error) {
      results.failed++;
      console.log(`❌ ${test.name} FAILED:`, error.message);
    }
  }

  console.log('\n=====================================');
  console.log('🧪 Test Results Summary');
  console.log('=====================================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total: ${results.total}`);
  console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Authentication system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the server logs and fix any issues.');
  }

  process.exit(results.failed === 0 ? 0 : 1);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
