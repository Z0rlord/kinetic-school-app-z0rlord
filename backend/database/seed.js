const fs = require('fs').promises;
const path = require('path');
const { executeQuery, testConnection, closePool } = require('../src/utils/database');

// Get list of seed files
async function getSeedFiles() {
    const seedsDir = path.join(__dirname, 'seeds');
    try {
        const files = await fs.readdir(seedsDir);
        return files
            .filter(file => file.endsWith('.sql'))
            .sort(); // Ensure proper order
    } catch (error) {
        console.error('Error reading seeds directory:', error);
        return [];
    }
}

// Execute a single seed file
async function executeSeed(filename) {
    const filePath = path.join(__dirname, 'seeds', filename);
    
    try {
        console.log(`🌱 Reading seed file: ${filename}`);
        const content = await fs.readFile(filePath, 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = content
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`🔄 Executing ${statements.length} statements from ${filename}`);
        
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await executeQuery(statement);
                } catch (error) {
                    // Log but continue - some inserts might fail due to duplicates
                    if (!error.message.includes('Duplicate entry')) {
                        console.warn(`⚠️  Statement failed: ${error.message}`);
                    }
                }
            }
        }
        
        console.log(`✅ Seed completed: ${filename}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Seed failed: ${filename}`, error);
        throw error;
    }
}

// Main seeding function
async function runSeeds() {
    console.log('🌱 Starting database seeding...');
    
    try {
        // Test database connection
        const connected = await testConnection();
        if (!connected) {
            throw new Error('Database connection failed');
        }
        
        // Get seed files
        const seedFiles = await getSeedFiles();
        console.log(`📁 Found ${seedFiles.length} seed files`);
        
        // Execute all seed files
        for (const filename of seedFiles) {
            await executeSeed(filename);
        }
        
        console.log(`🎉 Successfully executed ${seedFiles.length} seed files`);
        
        // Show summary of seeded data
        await showSeedSummary();
        
    } catch (error) {
        console.error('💥 Seeding process failed:', error);
        process.exit(1);
    }
}

// Show summary of seeded data
async function showSeedSummary() {
    try {
        console.log('\n📊 Seeded Data Summary:');
        console.log('=====================');
        
        const userCount = await executeQuery('SELECT COUNT(*) as count FROM users');
        console.log(`👥 Users: ${userCount[0].count}`);
        
        const profileCount = await executeQuery('SELECT COUNT(*) as count FROM student_profiles');
        console.log(`📋 Student Profiles: ${profileCount[0].count}`);
        
        const classCount = await executeQuery('SELECT COUNT(*) as count FROM classes');
        console.log(`🏫 Classes: ${classCount[0].count}`);
        
        const goalCount = await executeQuery('SELECT COUNT(*) as count FROM goals');
        console.log(`🎯 Goals: ${goalCount[0].count}`);
        
        const skillCount = await executeQuery('SELECT COUNT(*) as count FROM skills');
        console.log(`💪 Skills: ${skillCount[0].count}`);
        
        const interestCount = await executeQuery('SELECT COUNT(*) as count FROM interests');
        console.log(`❤️  Interests: ${interestCount[0].count}`);
        
        const surveyCount = await executeQuery('SELECT COUNT(*) as count FROM surveys');
        console.log(`📝 Surveys: ${surveyCount[0].count}`);
        
        const questionCount = await executeQuery('SELECT COUNT(*) as count FROM survey_questions');
        console.log(`❓ Survey Questions: ${questionCount[0].count}`);
        
        console.log('\n🔐 Sample Login Credentials:');
        console.log('============================');
        console.log('Admin: admin@school.edu / admin123');
        console.log('Teacher: john.smith@school.edu / teacher123');
        console.log('Student: alice.brown@student.edu / student123');
        
    } catch (error) {
        console.warn('⚠️  Could not generate summary:', error.message);
    }
}

// Clear all data (for development)
async function clearData() {
    console.log('🗑️  Clearing all data...');
    
    const tables = [
        'survey_assignments',
        'class_enrollments', 
        'survey_answers',
        'survey_responses',
        'survey_questions',
        'surveys',
        'uploaded_files',
        'classes',
        'interests',
        'skills',
        'goals',
        'student_profiles',
        'users',
        'migrations'
    ];
    
    try {
        // Disable foreign key checks
        await executeQuery('SET FOREIGN_KEY_CHECKS = 0');
        
        for (const table of tables) {
            try {
                await executeQuery(`DELETE FROM ${table}`);
                await executeQuery(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
                console.log(`🗑️  Cleared table: ${table}`);
            } catch (error) {
                console.warn(`⚠️  Could not clear table ${table}:`, error.message);
            }
        }
        
        // Re-enable foreign key checks
        await executeQuery('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('✅ All data cleared');
        
    } catch (error) {
        console.error('❌ Clear data failed:', error);
        throw error;
    }
}

// CLI interface
async function main() {
    const command = process.argv[2];
    
    try {
        switch (command) {
            case 'run':
            case 'seed':
                await runSeeds();
                break;
                
            case 'clear':
                const confirm = process.argv[3];
                if (confirm !== '--confirm') {
                    console.log('⚠️  This will delete ALL data from the database!');
                    console.log('Use: node seed.js clear --confirm');
                    process.exit(1);
                }
                await clearData();
                break;
                
            case 'reset':
                const confirmReset = process.argv[3];
                if (confirmReset !== '--confirm') {
                    console.log('⚠️  This will delete ALL data and re-seed the database!');
                    console.log('Use: node seed.js reset --confirm');
                    process.exit(1);
                }
                await clearData();
                await runSeeds();
                break;
                
            default:
                console.log(`
🌱 Database Seeder Tool

Usage:
  node seed.js seed           - Run all seed files
  node seed.js run            - Alias for seed
  node seed.js clear --confirm - Clear all data (DESTRUCTIVE!)
  node seed.js reset --confirm - Clear and re-seed (DESTRUCTIVE!)

Examples:
  node seed.js seed
  node seed.js clear --confirm
  node seed.js reset --confirm
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
    runSeeds,
    clearData,
    getSeedFiles,
    executeSeed
};
