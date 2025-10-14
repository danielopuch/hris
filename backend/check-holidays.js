const { allQuery } = require('./database-improved');

async function checkHolidays() {
  try {
    const holidays = await allQuery(
      'SELECT id, name, date, description FROM holidays WHERE strftime("%Y", date) = "2025" ORDER BY date'
    );
    
    console.log('\n✅ 2025 Uganda Public Holidays (' + holidays.length + ' total):\n');
    
    holidays.forEach(h => {
      const dateObj = new Date(h.date + 'T00:00:00');
      const formatted = dateObj.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      });
      console.log(`📅 ${formatted} - ${h.name}`);
    });
    
    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkHolidays();
