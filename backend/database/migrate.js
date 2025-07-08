const fs = require('fs').promises;
const path = require('path');
const { executeQuery, testConnection, closePool } = require('../src/utils/database');

// Migration tracking table
const MIGRATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS migrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    filename VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64) NOT NULL,
    INDEX idx_filename (filename)
);
`;

// Get list of migration files
async function getMigrationFiles() {
    const migrationsDir = path.join(__dirname, 'migrations');
    try {
        const files = await fs.readdir(migrationsDir);
        return files
            .filter(file => file.endsWith('.sql'))
            .sort(); // Ensure proper order
    } catch (error) {
        console.error('Error reading migrations directory:', error);
        return [];
    }
}

// Calculate file checksum
function calculateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
}

// Get executed migrations from database
async function getExecutedMigrations() {
    try {
        const migrations = await executeQuery('SELECT filename, checksum FROM migrations ORDER BY id');
        return migrations.reduce((acc, migration) => {
            acc[migration.filename] = migration.checksum;
            return acc;
        }, {});
    } catch (error) {
        // Table might not exist yet
        return {};
    }
}

// Execute a single migration file
async function executeMigration(filename) {
    const filePath = path.join(__dirname, 'migrations', filename);
    
    try {
        console.log(`📄 Reading migration: ${filename}`);
        const content = await fs.readFile(filePath, 'utf8');
        const checksum = calculateChecksum(content);
        
        // Split by semicolon and execute each statement
        const statements = content
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`🔄 Executing ${statements.length} statements from ${filename}`);
        
        for (const statement of statements) {
            if (statement.trim()) {
                await executeQuery(statement);
            }
        }
        
        // Record migration as executed
        await executeQuery(
            'INSERT INTO migrations (filename, checksum) VALUES (?, ?)',
            [filename, checksum]
        );
        
        console.log(`✅ Migration completed: ${filename}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Migration failed: ${filename}`, error);
        throw error;
    }
}

// Main migration function
async function runMigrations() {
    console.log('🚀 Starting database migrations...');
    
    try {
        // Test database connection
        const connected = await testConnection();
        if (!connected) {
            throw new Error('Database connection failed');
        }
        
        // Create migrations table if it doesn't exist
        await executeQuery(MIGRATION_TABLE_SQL);
        console.log('📋 Migration tracking table ready');
        
        // Get migration files and executed migrations
        const migrationFiles = await getMigrationFiles();
        const executedMigrations = await getExecutedMigrations();
        
        console.log(`📁 Found ${migrationFiles.length} migration files`);
        console.log(`✅ ${Object.keys(executedMigrations).length} migrations already executed`);
        
        // Execute pending migrations
        let executedCount = 0;
        for (const filename of migrationFiles) {
            if (!executedMigrations[filename]) {
                await executeMigration(filename);
                executedCount++;
            } else {
                console.log(`⏭️  Skipping already executed: ${filename}`);
            }
        }
        
        if (executedCount === 0) {
            console.log('✨ All migrations are up to date!');
        } else {
            console.log(`🎉 Successfully executed ${executedCount} new migrations`);
        }
        
    } catch (error) {
        console.error('💥 Migration process failed:', error);
        process.exit(1);
    }
}

// Rollback function (basic implementation)
async function rollbackMigration(filename) {
    console.log(`🔄 Rolling back migration: ${filename}`);
    
    try {
        // Remove from migrations table
        const result = await executeQuery(
            'DELETE FROM migrations WHERE filename = ?',
            [filename]
        );
        
        if (result.affectedRows > 0) {
            console.log(`✅ Rollback recorded for: ${filename}`);
            console.log('⚠️  Note: You may need to manually reverse database changes');
        } else {
            console.log(`⚠️  Migration not found in database: ${filename}`);
        }
        
    } catch (error) {
        console.error(`❌ Rollback failed: ${filename}`, error);
        throw error;
    }
}

// CLI interface
async function main() {
    const command = process.argv[2];
    const filename = process.argv[3];
    
    try {
        switch (command) {
            case 'up':
            case 'migrate':
                await runMigrations();
                break;
                
            case 'rollback':
                if (!filename) {
                    console.error('❌ Please specify a migration filename to rollback');
                    process.exit(1);
                }
                await rollbackMigration(filename);
                break;
                
            case 'status':
                const files = await getMigrationFiles();
                const executed = await getExecutedMigrations();
                
                console.log('\n📊 Migration Status:');
                console.log('==================');
                
                for (const file of files) {
                    const status = executed[file] ? '✅ Executed' : '⏳ Pending';
                    console.log(`${status} - ${file}`);
                }
                break;
                
            default:
                console.log(`
🗃️  Database Migration Tool

Usage:
  node migrate.js migrate     - Run all pending migrations
  node migrate.js up          - Alias for migrate
  node migrate.js status      - Show migration status
  node migrate.js rollback <filename> - Rollback specific migration

Examples:
  node migrate.js migrate
  node migrate.js status
  node migrate.js rollback 001_initial_schema.sql
                `);
        }
        
    } catch (error) {
        console.error('💥 Command failed:', error);
        process.exit(1);
    } finally {
        await closePool();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    runMigrations,
    rollbackMigration,
    getMigrationFiles,
    getExecutedMigrations
};
