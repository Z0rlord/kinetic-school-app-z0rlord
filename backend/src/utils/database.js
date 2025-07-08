const mysql = require('mysql2/promise');
const { vaultClient } = require('./vault');
require('dotenv').config();

let pool = null;

// Initialize database connection with Vault support
async function initializeDatabase() {
  try {
    // Get database configuration (with Vault fallback)
    const dbConfig = await vaultClient.getDatabaseConfig();

    const poolConfig = {
      host: dbConfig.host || 'localhost',
      port: parseInt(dbConfig.port) || 3306,
      user: dbConfig.user || 'root',
      password: dbConfig.password || '',
      database: dbConfig.database || 'student_profile_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      acquireTimeout: 60000,
      timeout: 60000,
      charset: 'utf8mb4'
    };

    // Create connection pool
    pool = mysql.createPool(poolConfig);

    console.log('🔗 Database pool initialized');
    return pool;

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Get or create pool
async function getPool() {
  if (!pool) {
    await initializeDatabase();
  }
  return pool;
}

// Test database connection
async function testConnection() {
  try {
    const currentPool = await getPool();
    const connection = await currentPool.getConnection();
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
    const currentPool = await getPool();
    const [results] = await currentPool.execute(query, params);
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
  const currentPool = await getPool();
  const connection = await currentPool.getConnection();

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
  initializeDatabase,
  getPool,
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
