#!/usr/bin/env node

/**
 * File Upload and Resume Parsing Test Script
 * Tests file upload, download, text extraction, and resume parsing functionality
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001/api';
const TEST_USER = {
  email: 'filetest@example.com',
  password: 'TestPassword123!',
  firstName: 'File',
  lastName: 'Tester',
  role: 'student'
};

// Create axios instance with cookie support
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000
});

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

// Create a test PDF content (simple text-based PDF)
function createTestPDF() {
  // This is a minimal PDF structure with text content
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 750 Td
(John Doe Resume) Tj
0 -20 Td
(Computer Science Student) Tj
0 -20 Td
(Skills: JavaScript, Python, React, Node.js) Tj
0 -20 Td
(Education: Junior at University) Tj
0 -20 Td
(Goal: Become a full-stack developer) Tj
0 -20 Td
(Interests: Programming, Technology, Gaming) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000526 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
625
%%EOF`;

  return Buffer.from(pdfContent);
}

async function testFileUpload() {
  console.log('\n📁 Testing File Upload...');
  
  // Create test PDF
  const pdfBuffer = createTestPDF();
  
  // Create FormData
  const FormData = require('form-data');
  const formData = new FormData();
  formData.append('file', pdfBuffer, {
    filename: 'test-resume.pdf',
    contentType: 'application/pdf'
  });
  formData.append('purpose', 'resume');
  
  try {
    const response = await api.post('/files/upload', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log('✅ File uploaded successfully');
    console.log(`📄 File ID: ${response.data.file.id}`);
    console.log(`📝 Has extracted text: ${response.data.file.hasExtractedText}`);
    
    return response.data.file.id;
  } catch (error) {
    console.error('❌ File upload failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testFileList() {
  console.log('\n📋 Testing File List...');
  
  try {
    const response = await api.get(`/files/user/${userId}`);
    console.log(`✅ Retrieved ${response.data.files.length} files`);
    
    if (response.data.files.length > 0) {
      const file = response.data.files[0];
      console.log(`📄 First file: ${file.originalName} (${file.purpose})`);
    }
    
    return response.data.files;
  } catch (error) {
    console.error('❌ File list failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testFileDownload(fileId) {
  console.log('\n⬇️  Testing File Download...');
  
  try {
    const response = await api.get(`/files/${fileId}`, {
      responseType: 'arraybuffer'
    });
    
    console.log('✅ File downloaded successfully');
    console.log(`📊 File size: ${response.data.byteLength} bytes`);
    console.log(`📋 Content type: ${response.headers['content-type']}`);
    
    return true;
  } catch (error) {
    console.error('❌ File download failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testExtractedText(fileId) {
  console.log('\n📝 Testing Extracted Text...');
  
  try {
    const response = await api.get(`/files/${fileId}/text`);
    console.log('✅ Extracted text retrieved successfully');
    console.log(`📄 Text length: ${response.data.file.extractedText.length} characters`);
    console.log(`📝 Sample text: ${response.data.file.extractedText.substring(0, 100)}...`);
    
    return response.data.file.extractedText;
  } catch (error) {
    console.error('❌ Extract text failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testResumeParsing(fileId) {
  console.log('\n🧠 Testing Resume Parsing...');
  
  try {
    const response = await api.post(`/files/${fileId}/parse-resume`, {
      autoPopulate: true
    });
    
    console.log('✅ Resume parsed successfully');
    
    const { parsedData, autoPopulation } = response.data;
    
    console.log(`📊 Profile updates: ${Object.keys(parsedData.profile).length} fields`);
    console.log(`💪 Skills found: ${parsedData.skills.length}`);
    console.log(`🎯 Goals found: ${parsedData.goals.length}`);
    console.log(`❤️  Interests found: ${parsedData.interests.length}`);
    
    if (autoPopulation) {
      console.log(`🔄 Auto-population results:`);
      console.log(`   Profile updated: ${autoPopulation.profileUpdated}`);
      console.log(`   Skills added: ${autoPopulation.skillsAdded}`);
      console.log(`   Goals added: ${autoPopulation.goalsAdded}`);
      console.log(`   Interests added: ${autoPopulation.interestsAdded}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Resume parsing failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testFileFiltering() {
  console.log('\n🔍 Testing File Filtering...');
  
  try {
    // Test filtering by purpose
    const resumeResponse = await api.get(`/files/user/${userId}?purpose=resume`);
    console.log(`✅ Resume files: ${resumeResponse.data.files.length}`);
    
    // Test pagination
    const paginatedResponse = await api.get(`/files/user/${userId}?page=1&limit=5`);
    console.log(`✅ Paginated files: ${paginatedResponse.data.files.length}`);
    console.log(`📊 Total files: ${paginatedResponse.data.pagination.total}`);
    
    return true;
  } catch (error) {
    console.error('❌ File filtering failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testAccessControl() {
  console.log('\n🔒 Testing File Access Control...');
  
  try {
    // Try to access files of another user (should fail)
    await api.get('/files/user/999');
    console.log('⚠️  Access control test failed - should not be able to access other user files');
    return false;
  } catch (error) {
    if (error.response?.status === 403 || error.response?.status === 404) {
      console.log('✅ Access control working - correctly denied access to other user files');
      return true;
    } else {
      console.log('⚠️  Unexpected error in access control test:', error.response?.status);
      return false;
    }
  }
}

async function testInvalidFileUpload() {
  console.log('\n❌ Testing Invalid File Upload...');
  
  try {
    const FormData = require('form-data');
    const formData = new FormData();
    
    // Try to upload an invalid file type
    formData.append('file', Buffer.from('invalid content'), {
      filename: 'test.txt',
      contentType: 'text/plain'
    });
    formData.append('purpose', 'resume');
    
    await api.post('/files/upload', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log('⚠️  Invalid file upload test failed - should reject invalid file types');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Invalid file upload correctly rejected');
      return true;
    } else {
      console.log('⚠️  Unexpected error in invalid file test:', error.response?.status);
      return false;
    }
  }
}

async function cleanupTestFiles(fileIds) {
  console.log('\n🧹 Cleaning up test files...');
  
  for (const fileId of fileIds) {
    try {
      await api.delete(`/files/${fileId}`);
      console.log(`✅ Deleted file ${fileId}`);
    } catch (error) {
      console.log(`⚠️  Failed to delete file ${fileId}:`, error.message);
    }
  }
}

async function runFileTests() {
  console.log('🧪 Starting File Upload & Resume Parsing Tests');
  console.log('==============================================\n');

  const uploadedFiles = [];

  try {
    // Setup
    await setupTestUser();
    
    // Test file upload
    const fileId = await testFileUpload();
    uploadedFiles.push(fileId);
    
    // Test file operations
    await testFileList();
    await testFileDownload(fileId);
    await testExtractedText(fileId);
    await testResumeParsing(fileId);
    
    // Test filtering and access control
    await testFileFiltering();
    await testAccessControl();
    await testInvalidFileUpload();
    
    console.log('\n🎉 All file tests completed successfully!');
    
  } catch (error) {
    console.error('\n💥 File test failed:', error.response?.data || error.message);
    throw error;
  } finally {
    // Cleanup
    await cleanupTestFiles(uploadedFiles);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests if this script is executed directly
if (require.main === module) {
  runFileTests().catch(error => {
    console.error('💥 File test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runFileTests };
