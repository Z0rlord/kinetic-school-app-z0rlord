-- Survey System Tables - Questions, Responses, and File Storage
-- Part 2 of initial schema

-- Survey questions - Individual questions within surveys
CREATE TABLE survey_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    survey_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('multiple_choice', 'multiple_select', 'rating_scale', 'short_text', 'long_text', 'yes_no', 'date', 'time') NOT NULL,
    question_order INT NOT NULL DEFAULT 1,
    is_required BOOLEAN DEFAULT FALSE,
    options JSON NULL, -- For multiple choice, rating scales, etc.
    validation_rules JSON NULL, -- Min/max length, regex patterns, etc.
    conditional_logic JSON NULL, -- Show/hide based on other answers
    help_text TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    INDEX idx_survey_id (survey_id),
    INDEX idx_question_type (question_type),
    INDEX idx_question_order (question_order)
);

-- Survey responses - User responses to surveys
CREATE TABLE survey_responses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    survey_id INT NOT NULL,
    user_id INT NULL, -- NULL for anonymous responses
    session_id VARCHAR(255) NULL, -- For anonymous tracking
    status ENUM('in_progress', 'completed', 'abandoned') DEFAULT 'in_progress',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    metadata JSON NULL,
    
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_survey_id (survey_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_completed_at (completed_at)
);

-- Survey answers - Individual answers to questions
CREATE TABLE survey_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    response_id INT NOT NULL,
    question_id INT NOT NULL,
    answer_text TEXT NULL,
    answer_number DECIMAL(10,2) NULL,
    answer_date DATE NULL,
    answer_time TIME NULL,
    answer_json JSON NULL, -- For complex answers (multiple selections, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (response_id) REFERENCES survey_responses(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES survey_questions(id) ON DELETE CASCADE,
    INDEX idx_response_id (response_id),
    INDEX idx_question_id (question_id),
    UNIQUE KEY unique_response_question (response_id, question_id)
);

-- Uploaded files - File storage with metadata (BLOB storage as specified)
CREATE TABLE uploaded_files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    file_data LONGBLOB NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    upload_purpose ENUM('resume', 'profile_photo', 'survey_attachment', 'other') NOT NULL,
    processing_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    extracted_text LONGTEXT NULL, -- For resume parsing
    metadata JSON NULL, -- Additional file metadata
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_file_type (file_type),
    INDEX idx_file_hash (file_hash),
    INDEX idx_upload_purpose (upload_purpose),
    INDEX idx_processing_status (processing_status),
    INDEX idx_upload_date (upload_date)
);

-- Classes/Groups - For organizing students (teachers can create classes)
CREATE TABLE classes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id INT NOT NULL,
    class_name VARCHAR(255) NOT NULL,
    class_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT NULL,
    semester VARCHAR(50) NULL,
    year INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    max_students INT NULL,
    settings JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_class_code (class_code),
    INDEX idx_is_active (is_active),
    INDEX idx_year_semester (year, semester)
);

-- Class enrollments - Many-to-many relationship between students and classes
CREATE TABLE class_enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_id INT NOT NULL,
    student_id INT NOT NULL,
    enrollment_status ENUM('enrolled', 'dropped', 'completed') DEFAULT 'enrolled',
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completion_date TIMESTAMP NULL,
    final_grade VARCHAR(10) NULL,
    
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_class_id (class_id),
    INDEX idx_student_id (student_id),
    INDEX idx_enrollment_status (enrollment_status),
    UNIQUE KEY unique_class_student (class_id, student_id)
);

-- Survey assignments - Assign surveys to specific classes or students
CREATE TABLE survey_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    survey_id INT NOT NULL,
    class_id INT NULL,
    student_id INT NULL,
    assigned_by INT NOT NULL,
    due_date TIMESTAMP NULL,
    is_mandatory BOOLEAN DEFAULT FALSE,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_survey_id (survey_id),
    INDEX idx_class_id (class_id),
    INDEX idx_student_id (student_id),
    INDEX idx_assigned_by (assigned_by),
    INDEX idx_due_date (due_date)
);

-- Update student_profiles to reference profile photo
ALTER TABLE student_profiles 
ADD CONSTRAINT fk_profile_photo 
FOREIGN KEY (profile_photo_id) REFERENCES uploaded_files(id) ON DELETE SET NULL;
