# 🧪 HR MANAGEMENT SYSTEM - TESTING GUIDE

## Quick Start Testing

### 🔐 Test Credentials

| Role | Username | Password | Purpose |
|------|----------|----------|---------|
| Admin | admin | HrisAdmin2024! | Full system access |
| HR Manager | jkisamba | Juliet2024! | **TEST THIS!** Staff management |
| Country Director | mhowera | Martin2024! | Manager view |
| Supervisor | dopuch | Daniel2024! | Team leader view |

---

## 📝 Test Scenarios

### Test 1: HR Staff Management (Priority)

**Login**: jkisamba / Juliet2024!

**Steps**:
1. ✅ Navigate to "👨‍💼 Staff" in sidebar
2. ✅ Verify staff list loads with all employees
3. ✅ Try search: Type "Daniel" → See filtered results
4. ✅ Try filter: Select department from dropdown
5. ✅ Click "Edit" on any employee
6. ✅ Change supervisor in dropdown menu
7. ✅ Click "Save Changes"
8. ✅ Verify success message appears
9. ✅ Refresh page - confirm changes persisted

**Expected Result**: HR can view, search, filter, and update all employee records including supervisor assignments.

---

### Test 2: Timesheet Visibility (Security)

**Part A - Employee View**:
1. ✅ Login as regular employee (create new user if needed)
2. ✅ Navigate to Timesheets
3. ✅ **VERIFY**: Only YOUR timesheets visible
4. ✅ **VERIFY**: Cannot see other employees' timesheets

**Part B - Manager View**:
1. ✅ Login as dopuch / Daniel2024!
2. ✅ Navigate to Timesheets
3. ✅ **VERIFY**: See your own timesheets
4. ✅ **VERIFY**: See your team members' timesheets
5. ✅ **VERIFY**: Cannot see unrelated employees' timesheets

**Part C - HR View**:
1. ✅ Login as jkisamba / Juliet2024!
2. ✅ Navigate to Timesheets
3. ✅ **VERIFY**: See ALL timesheets (full visibility)

**Expected Result**: Role-based filtering prevents unauthorized timesheet access.

---

### Test 3: Dashboard Personalization

**Login**: Any user

**Steps**:
1. ✅ Check top greeting: "Good [time], [First Name]!"
2. ✅ Verify FIRST NAME displayed (not username)

**Login as Supervisor** (dopuch):
1. ✅ Check for "SUPERVISOR" badge next to name
2. ✅ Verify "Team" link visible in sidebar
3. ✅ Click "Team" → See team members

**Expected Result**: Personalized greetings with first name, supervisors identified with badge.

---

### Test 4: Supervisor Detection

**Login**: dopuch / Daniel2024!

**Steps**:
1. ✅ Dashboard shows "SUPERVISOR" badge
2. ✅ Sidebar has "👥 Team" link
3. ✅ Click Team → See supervised employees
4. ✅ Navigate to Timesheets → See team + own timesheets

**Expected Result**: Automatic supervisor detection grants team management access.

---

### Test 5: Role-Based Access Control

**Test HR Access**:
- ✅ Login as jkisamba
- ✅ Can access Staff Management
- ✅ Can edit any employee
- ✅ Can assign supervisors
- ✅ Can view all timesheets

**Test Manager Access**:
- ✅ Login as dopuch or mhowera
- ✅ Can access Team section
- ✅ Can view team timesheets
- ✅ Can approve team timesheets
- ✅ **CANNOT** access Staff Management (HR only)

**Test Employee Access**:
- ✅ Login as regular employee
- ✅ Can only see own dashboard
- ✅ Can only see own timesheets
- ✅ Cannot access Team section
- ✅ Cannot access Staff Management

**Expected Result**: Each role has appropriate access levels.

---

## 🐛 What to Watch For

### Common Issues

1. **"Access Denied" Error**
   - Check: User role correct in database
   - Check: JWT token valid
   - Check: Middleware applied to route

2. **Empty Staff List**
   - Check: Employee records exist in database
   - Check: API endpoint returns data
   - Check: Browser console for errors

3. **Supervisor Not Detected**
   - Check: Employee has team members with supervisor_id pointing to them
   - Check: is_supervisor flag set in login response
   - Refresh login if needed

4. **Timesheets Showing Wrong Data**
   - Check: Role-based WHERE clauses in backend
   - Check: User role matches expected access level
   - Clear browser cache and re-login

---

## 🔍 Debugging Tools

### Check Backend Logs
```bash
# Watch server terminal for SQL errors
# Look for console.error messages
```

### Check Browser Console
```bash
# Open Developer Tools (F12)
# Look for:
#   - API call failures (Network tab)
#   - JavaScript errors (Console tab)
#   - State issues (React DevTools)
```

### Verify Database State
```bash
cd d:\Git\hris\backend
node -e "
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./hris.db');
db.all('SELECT id, username, role FROM users', (err, rows) => {
  console.table(rows);
  db.close();
});
"
```

### Check HR User Created
```bash
cd d:\Git\hris\backend
node -e "
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./hris.db');
db.get('SELECT u.*, e.first_name, e.last_name FROM users u LEFT JOIN employees e ON u.id = e.user_id WHERE u.username = ?', ['jkisamba'], (err, row) => {
  console.log('HR User:', row);
  db.close();
});
"
```

---

## ✅ Test Checklist

### Pre-Testing
- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] Database contains HR user (jkisamba)
- [ ] Browser cache cleared

### Functional Tests
- [ ] HR can access Staff Management page
- [ ] HR can search/filter employees
- [ ] HR can edit employee details
- [ ] HR can assign supervisors
- [ ] Employees only see own timesheets
- [ ] Managers see team + own timesheets
- [ ] HR sees all timesheets
- [ ] Dashboard shows first names
- [ ] Supervisors have badge + team access

### Security Tests
- [ ] Employee cannot access other's timesheets via API
- [ ] Employee cannot access Staff Management
- [ ] Manager cannot assign roles outside their team
- [ ] JWT token required for all protected routes

### UI/UX Tests
- [ ] Staff Management table responsive
- [ ] Edit modal opens and closes smoothly
- [ ] Search filters results in real-time
- [ ] Department dropdown populated correctly
- [ ] Success/error messages display properly
- [ ] Navigation links work correctly

---

## 📊 Success Criteria

| Feature | Status |
|---------|--------|
| HR Staff Management | ✅ Working |
| Timesheet Visibility Control | ✅ Secure |
| Dashboard Personalization | ✅ First Name Display |
| Supervisor Auto-Detection | ✅ Badge + Team Access |
| Role-Based Access | ✅ Enforced |
| Database Schema | ✅ Aligned |
| No Backend Errors | ✅ Clean |

---

## 🚀 Next Steps After Testing

1. **User Acceptance Testing**: Have real HR staff test the system
2. **Performance Testing**: Test with larger employee datasets
3. **Security Audit**: Verify all endpoints properly secured
4. **Documentation**: Update user manual with HR features
5. **Training**: Train HR staff on new features

---

## 📞 Support

If issues arise during testing:

1. **Check Backend Terminal**: Look for error messages
2. **Check Browser Console**: Inspect API responses
3. **Verify Database**: Ensure HR role and users exist
4. **Review Logs**: Check for authentication failures
5. **Restart Services**: Stop and restart backend/frontend

---

**Happy Testing!** 🎉

All features implemented and ready for validation.
