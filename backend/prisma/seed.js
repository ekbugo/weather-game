const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Seed the 4 weather stations
  const stations = [
    {
      id: 'ICAYEY43',
      name: 'Cayey Station',
      locationDesc: 'Weather station located in Cayey, Puerto Rico. Mountainous region with cooler temperatures.',
      latitude: 18.1119,
      longitude: -66.1660,
      wundergroundUrl: 'https://www.wunderground.com/dashboard/pws/ICAYEY43'
    },
    {
      id: 'IAGUAD73',
      name: 'Aguadilla Station',
      locationDesc: 'Weather station located in Aguadilla, Puerto Rico. Coastal area in the northwest.',
      latitude: 18.4274,
      longitude: -67.1541,
      wundergroundUrl: 'https://www.wunderground.com/dashboard/pws/IAGUAD73'
    },
    {
      id: 'IMAYAG30',
      name: 'Mayagüez Station',
      locationDesc: 'Weather station located in Mayagüez, Puerto Rico. Western coastal city.',
      latitude: 18.2013,
      longitude: -67.1397,
      wundergroundUrl: 'https://www.wunderground.com/dashboard/pws/IMAYAG30'
    },
    {
      id: 'ICABOR73',
      name: 'Cabo Rojo Station',
      locationDesc: 'Weather station located in Cabo Rojo, Puerto Rico. Southwestern coastal area.',
      latitude: 18.0866,
      longitude: -67.1457,
      wundergroundUrl: 'https://www.wunderground.com/dashboard/pws/ICABOR73'
    }
  ];

  for (const station of stations) {
    await prisma.station.upsert({
      where: { id: station.id },
      update: station,
      create: station
    });
  }

  console.log('✅ Seeded 4 weather stations');

  // Create an example weekly schedule (current week)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  await prisma.weeklySchedule.upsert({
    where: {
      stationId_weekStart: {
        stationId: 'IMAYAG30',
        weekStart: monday
      }
    },
    update: {},
    create: {
      stationId: 'IMAYAG30',
      weekStart: monday,
      announcedAt: new Date(monday.getTime() - 3 * 24 * 60 * 60 * 1000) // Previous Friday
    }
  });

  console.log('✅ Seeded weekly schedule');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
