# Quick Start Guide

Get the HRIS system running in 5 minutes!

## Prerequisites

- Node.js (v14 or higher)
- npm

## Installation

### 1. Clone and Setup Backend

```bash
cd backend
npm install
cp .env.example .env
npm start
```

The backend will start on http://localhost:5000

### 2. Setup Frontend (in a new terminal)

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

The frontend will start on http://localhost:3000

## Default Login

- **Username:** admin
- **Password:** admin123
- **Role:** admin

## Quick Tour

1. **Dashboard** - Overview of pending items and quick actions
2. **Timesheets** - Submit and approve time entries
3. **Leave** - Request and manage leave/vacation
4. **Appraisals** - Conduct performance reviews (Manager/Admin)
5. **Payroll** - Process employee compensation (Admin)

## Testing the System

### Create a Test Employee

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john.doe",
    "password": "password123",
    "email": "john@example.com",
    "role": "employee"
  }'
```

### Submit a Timesheet

1. Click "Timesheets" in the navigation
2. Click "New Timesheet"
3. Fill in the form and submit
4. As a manager/admin, you can approve/reject

### Request Leave

1. Click "Leave" in the navigation
2. Click "New Leave Request"
3. Select dates and leave type
4. Submit for approval

## Features at a Glance

✅ User authentication with JWT  
✅ Role-based access control  
✅ Timesheet tracking & approval  
✅ Leave management  
✅ Performance appraisals  
✅ Payroll processing  
✅ Responsive, modern UI  
✅ RESTful API  

## Troubleshooting

**Backend won't start?**
- Make sure port 5000 is available
- Check that all dependencies installed: `npm install`

**Frontend won't start?**
- Make sure port 3000 is available
- Verify backend is running on port 5000
- Check `.env` file points to correct API URL

**Can't login?**
- Use credentials: admin / admin123
- Check backend console for errors
- Verify database was initialized (look for hris.db file)

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore the API endpoints
- Customize the styling in `frontend/src/styles/App.css`
- Add more features to meet your needs

## Support

For issues or questions, please check the main [README.md](README.md) or open an issue on GitHub.
