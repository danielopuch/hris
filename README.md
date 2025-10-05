# HRIS - Human Resource Information System

A comprehensive, intuitive Human Resource Information System built with React, Node.js, Express, and SQLite. Features a clean, modern UI/UX for managing all aspects of HR operations.

## Features

### Core Functionality
- **Authentication & Authorization** - Secure login with role-based access control (Admin, Manager, Employee)
- **Timesheet Tracking** - Employee time entry with supervisor approval workflow
- **Leave Management** - Request and approve vacation, sick leave, personal days, and unpaid leave
- **Performance Appraisals** - Comprehensive employee performance review system
- **Payroll Processing** - Track and manage employee compensation with detailed payroll records
- **Employee Management** - Complete employee directory with department and supervisor relationships

### User Roles
- **Admin** - Full system access, employee management, payroll processing
- **Manager** - Approve timesheets, leave requests, conduct appraisals
- **Employee** - Submit timesheets, request leave, view own records

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **SQLite3** - Lightweight SQL database
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing

### Frontend
- **React 18** - UI library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **CSS3** - Modern, responsive styling

## Project Structure

```
hris/
├── backend/
│   ├── middleware/
│   │   └── auth.js          # Authentication middleware
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   ├── employees.js     # Employee management
│   │   ├── timesheets.js    # Timesheet tracking
│   │   ├── leave.js         # Leave management
│   │   ├── appraisals.js    # Performance appraisals
│   │   └── payroll.js       # Payroll processing
│   ├── database.js          # Database schema and initialization
│   ├── server.js            # Express server setup
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Timesheets.js
│   │   │   ├── Leave.js
│   │   │   ├── Appraisals.js
│   │   │   └── Payroll.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── styles/
│   │   │   └── App.css
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Edit `.env` and set your configuration:
```env
PORT=5000
JWT_SECRET=your_secure_secret_key_here
NODE_ENV=development
```

5. Start the backend server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Edit `.env` if needed (default points to localhost:5000):
```env
REACT_APP_API_URL=http://localhost:5000/api
```

5. Start the React development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage

### Default Login Credentials

```
Username: admin
Password: admin123
Role: admin
```

### Getting Started

1. **Login** - Use the default admin credentials to access the system
2. **Dashboard** - View overview of pending approvals and system statistics
3. **Timesheets** - Submit time entries and track work hours
4. **Leave** - Request time off and manage leave balances
5. **Appraisals** - Conduct performance reviews (Manager/Admin only)
6. **Payroll** - Process and view payroll records (Admin only)

### Creating Additional Users

Use the `/api/auth/register` endpoint to create additional users:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john.doe",
    "password": "password123",
    "email": "john.doe@company.com",
    "role": "employee"
  }'
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create employee (Admin only)
- `PUT /api/employees/:id` - Update employee (Admin only)

### Timesheets
- `GET /api/timesheets` - Get all timesheets
- `POST /api/timesheets` - Create timesheet entry
- `PUT /api/timesheets/:id` - Update timesheet
- `PATCH /api/timesheets/:id/approve` - Approve/reject timesheet (Manager/Admin)
- `DELETE /api/timesheets/:id` - Delete timesheet

### Leave
- `GET /api/leave` - Get all leave requests
- `POST /api/leave` - Create leave request
- `PUT /api/leave/:id` - Update leave request
- `PATCH /api/leave/:id/approve` - Approve/reject leave (Manager/Admin)
- `DELETE /api/leave/:id` - Delete leave request

### Appraisals
- `GET /api/appraisals` - Get all appraisals
- `GET /api/appraisals/:id` - Get appraisal by ID
- `POST /api/appraisals` - Create appraisal (Manager/Admin)
- `PUT /api/appraisals/:id` - Update appraisal (Manager/Admin)
- `PATCH /api/appraisals/:id/complete` - Complete appraisal (Manager/Admin)

### Payroll
- `GET /api/payroll` - Get all payroll records
- `GET /api/payroll/employee/:employeeId` - Get payroll by employee
- `POST /api/payroll` - Create payroll record (Admin only)
- `PATCH /api/payroll/:id/status` - Update payroll status (Admin only)
- `DELETE /api/payroll/:id` - Delete payroll record (Admin only)

## Database Schema

The system uses SQLite with the following tables:
- **users** - Authentication and user roles
- **employees** - Employee information
- **timesheets** - Time tracking records
- **leave_requests** - Leave/vacation requests
- **appraisals** - Performance reviews
- **payroll** - Payroll records

## UI/UX Features

- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Modern Interface** - Clean, intuitive design with smooth animations
- **Color-Coded Status** - Visual badges for pending, approved, rejected states
- **Role-Based Navigation** - Menu items adapt to user permissions
- **Interactive Forms** - Easy data entry with validation
- **Dashboard Widgets** - Quick overview of key metrics

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Protected API endpoints
- Secure token storage

## Development

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production

Backend:
```bash
cd backend
npm start
```

Frontend:
```bash
cd frontend
npm run build
```

This creates an optimized production build in the `frontend/build` directory.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the CC0 1.0 Universal (CC0 1.0) Public Domain Dedication. See the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or contributions, please open an issue on the GitHub repository.
