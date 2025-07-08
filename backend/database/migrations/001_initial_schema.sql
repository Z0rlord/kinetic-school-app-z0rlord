-- Student Profile & Goal Tracking System - Initial Database Schema
-- MariaDB 10.11+ compatible
-- Created: 2025-01-08

-- Enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Users table - Core authentication and user management
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('student', 'teacher', 'admin') NOT NULL DEFAULT 'student',
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255) NULL,
    password_reset_token VARCHAR(255) NULL,
    password_reset_expires TIMESTAMP NULL,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_email_verification (email_verification_token),
    INDEX idx_password_reset (password_reset_token)
);

-- Student profiles - Extended information for students
CREATE TABLE student_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    student_id VARCHAR(50) NULL,
    year_level ENUM('freshman', 'sophomore', 'junior', 'senior', 'graduate', 'other') NULL,
    major_program VARCHAR(200) NULL,
    bio TEXT NULL,
    profile_photo_id INT NULL,
    contact_preferences JSON NULL,
    profile_completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_student_id (student_id),
    INDEX idx_year_level (year_level)
);

-- Goals - Student goals with priorities and tracking
CREATE TABLE goals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    goal_type ENUM('short_term', 'long_term') NOT NULL,
    category ENUM('academic', 'personal', 'career', 'other') NOT NULL DEFAULT 'academic',
    priority ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium',
    status ENUM('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled') DEFAULT 'not_started',
    target_date DATE NULL,
    completion_date DATE NULL,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_goal_type (goal_type),
    INDEX idx_category (category),
    INDEX idx_priority (priority),
    INDEX idx_status (status),
    INDEX idx_target_date (target_date)
);

-- Skills - Skills inventory with proficiency levels
CREATE TABLE skills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    skill_name VARCHAR(200) NOT NULL,
    category ENUM('technical', 'soft', 'language', 'tools_software', 'other') NOT NULL,
    proficiency_level ENUM('beginner', 'intermediate', 'advanced', 'expert') NOT NULL,
    proficiency_score INT CHECK (proficiency_score >= 1 AND proficiency_score <= 5) NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by INT NULL,
    date_acquired DATE NULL,
    last_updated DATE DEFAULT (CURRENT_DATE),
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_category (category),
    INDEX idx_proficiency_level (proficiency_level),
    INDEX idx_skill_name (skill_name),
    INDEX idx_is_verified (is_verified)
);

-- Interests - Student interests and activities
CREATE TABLE interests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    interest_name VARCHAR(200) NOT NULL,
    category ENUM('academic', 'extracurricular', 'hobby', 'industry', 'learning_style', 'other') NOT NULL,
    description TEXT NULL,
    level_of_interest ENUM('low', 'medium', 'high') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_category (category),
    INDEX idx_level_of_interest (level_of_interest)
);

-- Surveys - Survey templates and metadata
CREATE TABLE surveys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    created_by INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    survey_type ENUM('beginning_term', 'mid_term', 'end_term', 'project_preferences', 'custom') NOT NULL,
    status ENUM('draft', 'active', 'closed', 'archived') DEFAULT 'draft',
    is_template BOOLEAN DEFAULT FALSE,
    template_name VARCHAR(255) NULL,
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    max_responses INT NULL,
    allow_anonymous BOOLEAN DEFAULT FALSE,
    require_login BOOLEAN DEFAULT TRUE,
    settings JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_created_by (created_by),
    INDEX idx_status (status),
    INDEX idx_survey_type (survey_type),
    INDEX idx_is_template (is_template),
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date)
);
