const { allQuery } = require('./database-improved');

async function displayLeaveTypes() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║         STAFF LEAVE ENTITLEMENTS - HRIS SYSTEM                ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const leaveTypes = [
      {
        type: 'vacation',
        name: '🏖️  Vacation Leave (Annual Leave)',
        entitlement: '20 days per year',
        description: 'Paid time off for rest, relaxation, holidays, and personal activities',
        examples: ['Family vacation', 'Holiday travel', 'Wedding attendance', 'Personal time off']
      },
      {
        type: 'sick',
        name: '🤒 Sick Leave',
        entitlement: '10 days per year',
        description: 'Paid time off for illness or medical appointments',
        examples: ['Flu or cold', 'Medical appointments', 'Recovery from surgery', 'Short-term illness']
      },
      {
        type: 'personal',
        name: '👤 Personal Leave',
        entitlement: '5 days per year',
        description: 'Paid time off for personal matters and family responsibilities',
        examples: ['Family emergencies', 'Caring for sick family', 'Important appointments', 'House emergencies']
      },
      {
        type: 'unpaid',
        name: '💼 Unpaid Leave',
        entitlement: 'Unlimited (subject to approval)',
        description: 'Leave without pay for extended absences when paid leave is exhausted',
        examples: ['Extended travel', 'Sabbatical', 'Career break', 'Educational pursuits']
      }
    ];

    leaveTypes.forEach((leave, index) => {
      console.log(`${index + 1}. ${leave.name}`);
      console.log(`   Entitlement: ${leave.entitlement}`);
      console.log(`   Description: ${leave.description}`);
      console.log(`   Examples: ${leave.examples.join(', ')}`);
      console.log('');
    });

    console.log('─'.repeat(65));
    console.log('TOTAL ANNUAL ENTITLEMENT: 35 paid days + unlimited unpaid');
    console.log('─'.repeat(65));
    console.log('');

    // Check if there are any leave requests in the system
    const totalRequests = await allQuery(
      'SELECT COUNT(*) as count FROM leave_requests'
    );
    
    const requestsByType = await allQuery(
      `SELECT 
        leave_type,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM leave_requests
      GROUP BY leave_type
      ORDER BY total DESC`
    );

    if (requestsByType && requestsByType.length > 0) {
      console.log('📊 CURRENT LEAVE STATISTICS:\n');
      console.log('Leave Type    | Total | Approved | Pending | Rejected');
      console.log('─'.repeat(65));
      
      requestsByType.forEach(stat => {
        const typeName = stat.leave_type.padEnd(13);
        const total = String(stat.total).padStart(5);
        const approved = String(stat.approved).padStart(8);
        const pending = String(stat.pending).padStart(7);
        const rejected = String(stat.rejected).padStart(8);
        console.log(`${typeName} | ${total} | ${approved} | ${pending} | ${rejected}`);
      });
      console.log('');
    }

    console.log('✅ Full documentation available in: LEAVE_ENTITLEMENTS.md');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

displayLeaveTypes();
