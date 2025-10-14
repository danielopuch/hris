# HRIS v2.0 - Demo Credentials & Quick Start

## 🔐 Demo Accounts

### Admin Account
- **Username:** `admin`
- **Password:** `HrisAdmin2024!`
- **Role:** Administrator
- **Access:** Full system access, employee management, payroll processing

### Manager Account - Martin Howera
- **Username:** `mhowera`
- **Password:** `Martin2024!`
- **Role:** Manager (Country Director)
- **Department:** GHSC-PSM
- **Access:** Approve timesheets, leave requests, conduct appraisals

### Employee Account - Daniel Opuch
- **Username:** `dopuch`
- **Password:** `Daniel2024!`
- **Role:** Employee (Systems Support Manager)
- **Department:** GHSC-PSM
- **Project:** GHSC-PSM
- **Supervisor:** Martin Howera
- **Access:** Submit timesheets, request leave, view own records

## 🚀 Quick Start

### Prerequisites
- Node.js v14 or higher
- npm

### Installation & Running

1. **Clone the repository:**
   ```bash
   git clone https://github.com/danielopuch/hris.git
   cd hris
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   npm start
   ```
   Backend will run on: http://localhost:5000

3. **Frontend Setup (new terminal):**
   ```bash
   cd frontend
   npm install
   npm start
   ```
   Frontend will run on: http://localhost:3000

4. **Login:**
   - Open http://localhost:3000
   - Use any of the demo credentials above
   - Click "Use Demo Credentials" button on login page

## ✨ New Features in v2.0

### Enhanced UI/UX
- Modern login page with split-screen design
- Real-time clock and greeting messages
- Gradient themes and smooth animations
- Responsive design for mobile/tablet/desktop
- Professional icon set throughout the application

### Improved Dashboard
- Live statistics and metrics
- Quick action cards with hover effects
- Activity overview with status tracking
- Role-based dashboard content
- Real-time data updates

### Security Enhancements
- Stronger password hashing (bcrypt 12 rounds)
- Session management with JWT
- Role-based access control
- Secure API endpoints
- Password visibility toggle

### Database Improvements
- MySQL-ready architecture
- Enhanced SQLite schema
- Better indexing for performance
- Proper foreign key relationships
- Automated demo data creation

## 📋 Features by Role

### Admin Features
- ✅ Full employee management
- ✅ Payroll processing
- ✅ System configuration
- ✅ All manager features
- ✅ All employee features

### Manager Features
- ✅ Approve/reject timesheets
- ✅ Approve/reject leave requests
- ✅ Conduct performance appraisals
- ✅ View team directory
- ✅ All employee features

### Employee Features
- ✅ Submit timesheets
- ✅ Request leave
- ✅ View personal records
- ✅ Check leave balance
- ✅ View payroll history

## 🗄️ Database Information

### Current Setup
- **Type:** SQLite (improved schema)
- **Location:** `backend/hris.db`
- **MySQL Ready:** Yes (configuration in `.env`)

### MySQL Migration (Optional)
To use MySQL instead of SQLite:
1. Install MySQL Server
2. Create database: `hris_db`
3. Update `.env` file:
   ```
   DB_TYPE=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=hris_db
   ```
4. Install MySQL driver: `npm install mysql2`
5. Restart backend server

## 🎨 UI/UX Highlights

### Login Page
- Split-screen design with branding
- Feature highlights
- One-click demo credentials
- Password visibility toggle
- Loading states
- Error handling with visual feedback

### Dashboard
- Personalized greeting
- Real-time statistics
- Quick action cards
- Activity overview
- Responsive grid layout
- Professional color scheme

### Overall Design
- Consistent gradient themes
- Smooth transitions and animations
- Modern card-based layout
- Icon-enhanced navigation
- Mobile-first responsive design

## 🔧 Technical Stack

### Backend
- Node.js & Express.js
- SQLite3 (MySQL-ready)
- JWT Authentication
- bcryptjs (12 rounds)
- RESTful API design

### Frontend
- React 18
- React Router v6
- Axios for API calls
- Modern CSS3 with animations
- Responsive design

## 📞 Support

For issues or questions:
- Check the main README.md
- Review QUICKSTART.md
- Contact system administrator

## 🎯 Next Steps

1. Explore the dashboard
2. Try submitting a timesheet
3. Request leave
4. Test manager approval workflows (if manager/admin)
5. Review employee directory
6. Check payroll records (if admin)

---

**Version:** 2.0  
**Last Updated:** October 5, 2025  
**Organization:** GHSC-PSM
