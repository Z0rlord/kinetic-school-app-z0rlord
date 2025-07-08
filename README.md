# Student Profile & Goal Tracking System

A comprehensive web application that helps educators track and understand their students' goals, interests, and skill levels through dynamic surveys and resume uploads.

## Project Status: 🚧 In Development

This project follows a **simplicity-first approach** as outlined in CLAUDE.md, focusing on core functionality with minimal complexity.

## Quick Start

### Prerequisites
- Node.js 18+
- MariaDB 10.11+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd kinetic-school-app-z0rlord
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Install frontend dependencies**
```bash
cd ../frontend
npm install
```

4. **Set up environment variables**
```bash
cd ../backend
cp .env.example .env
# Edit .env with your database credentials
```

5. **Set up database**
```bash
# Create database and run migrations (to be implemented)
npm run migrate
```

### Development

1. **Start backend server**
```bash
cd backend
npm run dev
```

2. **Start frontend development server**
```bash
cd frontend
npm run dev
```

3. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Project Overview

Core Requirements

1. Student Profile Management

Create, read, update, and delete student profiles
Store basic information (name, email, year/grade level, major/focus area)
Track academic and career goals (short-term and long-term)
Maintain a skills inventory with proficiency levels
Record interests and extracurricular activities

2. Dynamic Survey Tool

Design and deploy customizable surveys to collect student information
Support multiple question types (multiple choice, rating scales, text responses, checkboxes)
Allow teachers to create survey templates for different purposes (beginning of term, mid-term check-ins, project preferences)
Automatically populate student profiles with survey responses
Track survey completion rates and send reminders

3. Resume Upload & Parsing

Accept resume uploads in common formats (PDF, DOCX)
Extract relevant information from resumes using parsing techniques
Auto-populate skills and experience sections in student profiles
Store resumes securely with version history
Flag discrepancies between uploaded resumes and survey responses for review

4. Data Visualization Dashboard

Display class-wide statistics on goals, interests, and skills
Generate individual student summaries
Create visual representations (charts, graphs) of skill distributions
Show goal alignment across the class
Track progress over time with historical data

5. Search and Filter Capabilities

Search students by skills, interests, or goals
Filter students based on multiple criteria
Group students with similar profiles for project teams
Export filtered results for further analysis

Technical Constraints

Must be a web-based application accessible from modern browsers
Implement user authentication with role-based access (teacher vs. student views)
Ensure data privacy and security compliance
Mobile-responsive design
Include data export functionality (CSV/JSON)

Bonus Challenges

Implement an AI-powered recommendation system for matching students to opportunities
Add integration with learning management systems (LMS)
Create a student-facing portal where they can update their own information
Build automated reporting features for administrators
Implement real-time collaboration features for group goal setting

Deliverables

Functional web application with all core features
Database schema design document
Security assessment report

Evaluation Criteria

Functionality (40%): All core features work as specified
Code Quality (20%): Clean, maintainable, well-documented code
User Experience (20%): Intuitive interface and smooth workflows
Security & Privacy (10%): Proper data handling and access controls
Innovation (10%): Creative solutions and additional features

Learning Objectives
Through this project, students will:

Practice full-stack web development with AI assistance
Learn to structure complex data relationships
Implement file upload and processing functionality
Work with data visualization libraries
Consider privacy and security in educational technology
Experience the software development lifecycle from requirements to deployment

AI Assistant Usage Guidelines

Use AI coding assistants for brainstorming architecture and design patterns
Leverage AI for generating boilerplate code and repetitive tasks
Seek AI help for debugging and optimization suggestions
Document which parts of the code were AI-assisted vs. human-written
Reflect on the effectiveness of AI assistance in your final report

