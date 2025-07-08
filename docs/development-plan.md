# Student Profile & Goal Tracking System - Development Plan

## Project Overview
Building a web-based application for educators to track student goals, interests, and skill levels through surveys and resume uploads, following the simplicity-first approach outlined in CLAUDE.md.

## Simplified Technology Stack (Following tech-stack.md recommendations)

### Frontend
- **React** with plain JavaScript (no TypeScript for simplicity)
- **Bootstrap** for styling (single CSS framework)
- **React Router v6** for navigation
- **Axios** for HTTP requests
- **Recharts** for data visualization

### Backend
- **Node.js with Express.js** (minimal middleware)
- **express-session** for authentication (simple session-based)
- **Multer** for file uploads
- **pdf-parse** and **mammoth** for resume parsing
- **bcrypt** for password hashing

### Database
- **MariaDB** with raw SQL queries (no ORM for simplicity)
- **Database BLOB storage** for files (as specified)

### Development Tools
- **npm** for package management
- **Jest** for testing
- **ESLint** and **Prettier** for code quality

## Development Phases

### Phase 1: Core MVP (Weeks 1-4)
- Basic authentication and user management
- Student profile creation and management
- File upload functionality
- Simple database operations

### Phase 2: Survey System (Weeks 5-7)
- Survey creation and management
- Survey response collection
- Basic data visualization

### Phase 3: Analytics & Enhancement (Weeks 8-10)
- Dashboard and reporting
- Search and filter functionality
- Testing and quality assurance

## Project Structure
```
kinetic-school-app/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── models/
│   │   └── utils/
│   ├── database/
│   │   └── migrations/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── utils/
│   │   └── styles/
│   └── package.json
├── docs/
│   ├── activity.md
│   └── api-documentation.md
└── README.md
```

## Key Features Implementation Order

1. **User Authentication** - Simple session-based auth
2. **Student Profiles** - CRUD operations with goals, skills, interests
3. **File Upload** - Resume upload with database storage
4. **Survey System** - Dynamic survey creation and responses
5. **Dashboard** - Basic analytics and visualization
6. **Search/Filter** - Student search and filtering capabilities

## Security Considerations
- Password hashing with bcrypt
- Session management with express-session
- Input validation and sanitization
- File upload restrictions (10MB limit, PDF/DOCX only)
- Role-based access control

## Database Schema Overview
- **users** - Authentication and basic user info
- **student_profiles** - Detailed student information
- **goals** - Student goals with priorities and dates
- **skills** - Skills inventory with proficiency levels
- **interests** - Student interests and activities
- **surveys** - Survey templates and metadata
- **survey_questions** - Individual survey questions
- **survey_responses** - Student responses to surveys
- **uploaded_files** - File storage with metadata

## Success Criteria
- All core features functional
- Responsive design working on modern browsers
- Basic security measures implemented
- Performance meets requirements (< 2 second response time)
- Code is clean, maintainable, and well-documented

## Next Steps
1. Set up project structure and initialize packages
2. Create database schema and connection
3. Implement authentication system
4. Build core API endpoints
5. Create React frontend with basic components
6. Implement file upload functionality
7. Add survey system
8. Create dashboard and analytics
9. Add search and filter capabilities
10. Testing and quality assurance
