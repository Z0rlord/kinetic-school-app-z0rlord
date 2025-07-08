const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'student_profile_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Execute query with error handling
async function executeQuery(query, params = []) {
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Get a single record
async function findOne(query, params = []) {
  try {
    const results = await executeQuery(query, params);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    throw error;
  }
}

// Get multiple records
async function findMany(query, params = []) {
  try {
    const results = await executeQuery(query, params);
    return results;
  } catch (error) {
    throw error;
  }
}

// Insert record and return inserted ID
async function insertRecord(query, params = []) {
  try {
    const result = await executeQuery(query, params);
    return result.insertId;
  } catch (error) {
    throw error;
  }
}

// Update record and return affected rows
async function updateRecord(query, params = []) {
  try {
    const result = await executeQuery(query, params);
    return result.affectedRows;
  } catch (error) {
    throw error;
  }
}

// Delete record and return affected rows
async function deleteRecord(query, params = []) {
  try {
    const result = await executeQuery(query, params);
    return result.affectedRows;
  } catch (error) {
    throw error;
  }
}

// Transaction helper
async function executeTransaction(queries) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params } of queries) {
      const [result] = await connection.execute(query, params || []);
      results.push(result);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Close pool (for graceful shutdown)
async function closePool() {
  try {
    await pool.end();
    console.log('Database pool closed');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
}

module.exports = {
  pool,
  testConnection,
  executeQuery,
  findOne,
  findMany,
  insertRecord,
  updateRecord,
  deleteRecord,
  executeTransaction,
  closePool
};
