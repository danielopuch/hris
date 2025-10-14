const { runQuery, allQuery } = require('./database-improved');

const holidays2025 = [
  {
    name: "New Year's Day",
    date: '2025-01-01',
    description: "Kicks off the year with celebrations—think family gatherings and fireworks. Fixed date."
  },
  {
    name: 'NRM Liberation Day',
    date: '2025-01-09',
    description: 'Marks the 1986 overthrow of the previous regime by the National Resistance Movement. Fixed.'
  },
  {
    name: "Heroes' Day",
    date: '2025-02-16',
    description: "Honors Ugandan heroes like national leaders and freedom fighters. Fixed, but if it falls on a weekend, it's often observed on Monday (check locally)."
  },
  {
    name: 'Good Friday',
    date: '2025-03-28',
    description: "Christian observance of Jesus' crucifixion—church services and reflection. Variable (Easter-dependent)."
  },
  {
    name: 'Easter Monday',
    date: '2025-03-31',
    description: 'The day after Easter Sunday, celebrating the resurrection. Variable.'
  },
  {
    name: 'Labour Day',
    date: '2025-05-01',
    description: "Celebrates workers' rights with parades and speeches. Fixed."
  },
  {
    name: "Martyrs' Day",
    date: '2025-05-14',
    description: 'Remembers the 1886 execution of Christian converts by King Mwanga. Fixed.'
  },
  {
    name: 'Eid al-Adha',
    date: '2025-07-01',
    description: "Islamic holiday marking Abraham's willingness to sacrifice—family feasts and charity. Variable (lunar calendar)."
  },
  {
    name: 'Independence Day',
    date: '2025-10-09',
    description: "Uganda's big one—celebrates freedom from British rule in 1962. Fixed."
  },
  {
    name: 'Immaculate Conception',
    date: '2025-12-08',
    description: "Catholic holy day honoring Mary's conception—masses and quiet reflection. Fixed."
  },
  {
    name: 'Christmas Day',
    date: '2025-12-25',
    description: 'The classic—gifts, turkey (or matooke), and carols for Christians worldwide. Fixed.'
  },
  {
    name: 'Boxing Day',
    date: '2025-12-26',
    description: 'A chill day after Christmas for more family time or sales. Fixed.'
  }
];

async function addHolidays() {
  try {
    console.log('🗓️  Adding 2025 Uganda Holidays...\n');
    
    // Delete existing 2025 holidays
    await runQuery('DELETE FROM holidays WHERE strftime("%Y", date) = "2025"');
    console.log('✓ Cleared existing 2025 holidays');
    
    // Add new holidays
    let added = 0;
    for (const holiday of holidays2025) {
      try {
        await runQuery(
          'INSERT INTO holidays (name, date, description, is_recurring) VALUES (?, ?, ?, 0)',
          [holiday.name, holiday.date, holiday.description]
        );
        console.log(`✓ Added: ${holiday.name} (${holiday.date})`);
        added++;
      } catch (error) {
        console.error(`✗ Failed to add ${holiday.name}:`, error.message);
      }
    }
    
    console.log(`\n✅ Successfully added ${added} holidays for 2025\n`);
    
    // Display all 2025 holidays
    const all2025 = await allQuery(
      'SELECT * FROM holidays WHERE strftime("%Y", date) = "2025" ORDER BY date'
    );
    
    console.log('📋 2025 Uganda Public Holidays:');
    console.log('═'.repeat(80));
    all2025.forEach(h => {
      const dateObj = new Date(h.date + 'T00:00:00');
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const monthDay = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      console.log(`${monthDay} (${dayName})`);
      console.log(`  ${h.name}`);
      console.log(`  ${h.description}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addHolidays();
