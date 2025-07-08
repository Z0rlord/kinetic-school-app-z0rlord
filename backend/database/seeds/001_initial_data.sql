-- Initial seed data for Student Profile & Goal Tracking System
-- This file contains sample data for development and testing

-- Sample admin user (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified) VALUES
('admin@school.edu', '$2b$12$LQv3c1yqBwEHFl5aBLloe.Az7YtYqP2tYIvdNTv0G7eUHEOVOe8Pu', 'System', 'Administrator', 'admin', TRUE);

-- Sample teacher users (password: teacher123)
INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified) VALUES
('john.smith@school.edu', '$2b$12$LQv3c1yqBwEHFl5aBLloe.Az7YtYqP2tYIvdNTv0G7eUHEOVOe8Pu', 'John', 'Smith', 'teacher', TRUE),
('sarah.johnson@school.edu', '$2b$12$LQv3c1yqBwEHFl5aBLloe.Az7YtYqP2tYIvdNTv0G7eUHEOVOe8Pu', 'Sarah', 'Johnson', 'teacher', TRUE);

-- Sample student users (password: student123)
INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified) VALUES
('alice.brown@student.edu', '$2b$12$LQv3c1yqBwEHFl5aBLloe.Az7YtYqP2tYIvdNTv0G7eUHEOVOe8Pu', 'Alice', 'Brown', 'student', TRUE),
('bob.wilson@student.edu', '$2b$12$LQv3c1yqBwEHFl5aBLloe.Az7YtYqP2tYIvdNTv0G7eUHEOVOe8Pu', 'Bob', 'Wilson', 'student', TRUE),
('carol.davis@student.edu', '$2b$12$LQv3c1yqBwEHFl5aBLloe.Az7YtYqP2tYIvdNTv0G7eUHEOVOe8Pu', 'Carol', 'Davis', 'student', TRUE),
('david.miller@student.edu', '$2b$12$LQv3c1yqBwEHFl5aBLloe.Az7YtYqP2tYIvdNTv0G7eUHEOVOe8Pu', 'David', 'Miller', 'student', TRUE);

-- Sample student profiles
INSERT INTO student_profiles (user_id, student_id, year_level, major_program, bio, profile_completion_percentage) VALUES
(4, 'STU001', 'junior', 'Computer Science', 'Passionate about web development and AI. Love working on open-source projects.', 75.00),
(5, 'STU002', 'sophomore', 'Business Administration', 'Interested in entrepreneurship and digital marketing. Active in student organizations.', 60.00),
(6, 'STU003', 'senior', 'Graphic Design', 'Creative designer with focus on UX/UI. Freelance experience in branding projects.', 85.00),
(7, 'STU004', 'freshman', 'Engineering', 'New to engineering but excited about robotics and automation. Quick learner.', 40.00);

-- Sample classes
INSERT INTO classes (teacher_id, class_name, class_code, description, semester, year, max_students) VALUES
(2, 'Web Development Fundamentals', 'WEB101', 'Introduction to HTML, CSS, JavaScript and modern web frameworks', 'Fall', 2024, 30),
(2, 'Advanced JavaScript', 'JS301', 'Deep dive into JavaScript, Node.js, and full-stack development', 'Fall', 2024, 25),
(3, 'Business Strategy', 'BUS201', 'Strategic planning and business model development', 'Fall', 2024, 40),
(3, 'Digital Marketing', 'MKT301', 'Modern digital marketing techniques and analytics', 'Fall', 2024, 35);

-- Sample class enrollments
INSERT INTO class_enrollments (class_id, student_id, enrollment_status) VALUES
(1, 4, 'enrolled'), -- Alice in Web Dev
(1, 5, 'enrolled'), -- Bob in Web Dev
(1, 7, 'enrolled'), -- David in Web Dev
(2, 4, 'enrolled'), -- Alice in Advanced JS
(3, 5, 'enrolled'), -- Bob in Business Strategy
(3, 6, 'enrolled'), -- Carol in Business Strategy
(4, 5, 'enrolled'), -- Bob in Digital Marketing
(4, 6, 'enrolled'); -- Carol in Digital Marketing

-- Sample goals
INSERT INTO goals (user_id, title, description, goal_type, category, priority, target_date) VALUES
(4, 'Learn React Framework', 'Master React.js for building modern web applications', 'short_term', 'academic', 'high', '2024-12-15'),
(4, 'Become Full-Stack Developer', 'Develop expertise in both frontend and backend technologies', 'long_term', 'career', 'high', '2025-06-01'),
(5, 'Start a Business', 'Launch my own e-commerce startup', 'long_term', 'career', 'high', '2025-12-01'),
(5, 'Improve Public Speaking', 'Get comfortable presenting to large audiences', 'short_term', 'personal', 'medium', '2024-11-30'),
(6, 'Build Design Portfolio', 'Create 10 professional design projects for portfolio', 'short_term', 'career', 'high', '2024-12-31'),
(7, 'Learn Programming', 'Get comfortable with at least one programming language', 'short_term', 'academic', 'high', '2024-12-01');

-- Sample skills
INSERT INTO skills (user_id, skill_name, category, proficiency_level, proficiency_score, date_acquired) VALUES
(4, 'JavaScript', 'technical', 'intermediate', 3, '2023-09-01'),
(4, 'HTML/CSS', 'technical', 'advanced', 4, '2023-06-01'),
(4, 'React', 'technical', 'beginner', 2, '2024-08-01'),
(4, 'Problem Solving', 'soft', 'advanced', 4, '2023-01-01'),
(5, 'Microsoft Excel', 'tools_software', 'intermediate', 3, '2023-05-01'),
(5, 'Public Speaking', 'soft', 'beginner', 2, '2024-01-01'),
(5, 'Marketing Strategy', 'soft', 'intermediate', 3, '2024-03-01'),
(6, 'Adobe Photoshop', 'tools_software', 'advanced', 4, '2022-09-01'),
(6, 'UI/UX Design', 'technical', 'intermediate', 3, '2023-02-01'),
(6, 'Creativity', 'soft', 'expert', 5, '2020-01-01'),
(7, 'Mathematics', 'technical', 'intermediate', 3, '2023-01-01'),
(7, 'Team Collaboration', 'soft', 'intermediate', 3, '2024-01-01');

-- Sample interests
INSERT INTO interests (user_id, interest_name, category, description, level_of_interest) VALUES
(4, 'Artificial Intelligence', 'academic', 'Fascinated by machine learning and AI applications', 'high'),
(4, 'Open Source Projects', 'hobby', 'Contributing to open source software projects', 'high'),
(4, 'Gaming', 'hobby', 'Video games and game development', 'medium'),
(5, 'Entrepreneurship', 'industry', 'Starting and running businesses', 'high'),
(5, 'Social Media Marketing', 'academic', 'Digital marketing through social platforms', 'high'),
(5, 'Networking Events', 'extracurricular', 'Professional networking and meetups', 'medium'),
(6, 'Digital Art', 'hobby', 'Creating digital illustrations and designs', 'high'),
(6, 'Photography', 'hobby', 'Portrait and landscape photography', 'medium'),
(6, 'User Experience', 'academic', 'Designing intuitive user interfaces', 'high'),
(7, 'Robotics', 'academic', 'Building and programming robots', 'high'),
(7, 'Mathematics', 'academic', 'Advanced mathematics and problem solving', 'medium'),
(7, 'Sports', 'extracurricular', 'Basketball and soccer', 'medium');

-- Sample survey templates
INSERT INTO surveys (created_by, title, description, survey_type, status, is_template, template_name) VALUES
(2, 'Beginning of Term Assessment', 'Initial student assessment to understand goals and interests', 'beginning_term', 'active', TRUE, 'Beginning of Term'),
(2, 'Mid-Term Check-in', 'Progress assessment and goal adjustment survey', 'mid_term', 'draft', TRUE, 'Mid-Term Check-in'),
(3, 'Project Team Preferences', 'Survey to understand student preferences for group projects', 'project_preferences', 'active', TRUE, 'Project Preferences');

-- Sample survey questions for Beginning of Term Assessment
INSERT INTO survey_questions (survey_id, question_text, question_type, question_order, is_required, options) VALUES
(1, 'What is your primary academic goal for this semester?', 'long_text', 1, TRUE, NULL),
(1, 'How would you rate your current skill level in this subject?', 'rating_scale', 2, TRUE, '{"scale": "1-5", "labels": {"1": "Beginner", "5": "Expert"}}'),
(1, 'Which learning style works best for you?', 'multiple_choice', 3, TRUE, '{"options": ["Visual", "Auditory", "Kinesthetic", "Reading/Writing"]}'),
(1, 'What topics are you most interested in exploring?', 'multiple_select', 4, FALSE, '{"options": ["Web Development", "Data Science", "Mobile Apps", "AI/ML", "Cybersecurity", "Other"]}'),
(1, 'Do you have any prior experience in this field?', 'yes_no', 5, TRUE, NULL);

-- Sample survey questions for Project Preferences
INSERT INTO survey_questions (survey_id, question_text, question_type, question_order, is_required, options) VALUES
(3, 'What type of project would you prefer to work on?', 'multiple_choice', 1, TRUE, '{"options": ["Web Application", "Mobile App", "Data Analysis", "Research Project", "Creative Design"]}'),
(3, 'How many team members would you prefer?', 'multiple_choice', 2, TRUE, '{"options": ["2-3 people", "4-5 people", "6+ people", "Work alone"]}'),
(3, 'What role would you like to take in a team project?', 'multiple_select', 3, FALSE, '{"options": ["Project Manager", "Developer", "Designer", "Researcher", "Presenter", "Quality Assurance"]}'),
(3, 'Rate your comfort level with different technologies', 'rating_scale', 4, TRUE, '{"scale": "1-5", "technologies": ["HTML/CSS", "JavaScript", "Python", "Databases", "Design Tools"]}');
