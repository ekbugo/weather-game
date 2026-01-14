const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Seed the 4 weather stations
  const stations = [
    {
      id: 'ICAYEY43',
      name: 'Cayey Station',
      locationDesc: 'Weather station located in Cayey, Puerto Rico.',
      latitude: 18.11,
      longitude: -66.16,
      wundergroundUrl: 'https://www.wunderground.com/dashboard/pws/ICAYEY43'
    },
    {
      id: 'IAGUAD73',
      name: 'Aguadilla Station',
      locationDesc: 'Weather station located in Aguadilla, Puerto Rico.',
      latitude: 18.42,
      longitude: -67.15,
      wundergroundUrl: 'https://www.wunderground.com/dashboard/pws/IAGUAD73'
    },
    {
      id: 'IMAYAG30',
      name: 'Mayagüez Station',
      locationDesc: 'Weather station located in Mayagüez, Puerto Rico.',
      latitude: 18.20,
      longitude: -67.13,
      wundergroundUrl: 'https://www.wunderground.com/dashboard/pws/IMAYAG30'
    },
    {
      id: 'ICABOR73',
      name: 'Cabo Rojo Station',
      locationDesc: 'Weather station located in Cabo Rojo, Puerto Rico.',
      latitude: 18.08,
      longitude: -67.14,
      wundergroundUrl: 'https://www.wunderground.com/dashboard/pws/ICABOR73'
    },
    {
      id: 'IMARIC13',
      name: 'Maricao Station',
      locationDesc: 'Weather station located in Maricao, Puerto Rico.',
      latitude: 18.15,
      longitude: -66.88,
      wundergroundUrl: 'https://www.wunderground.com/dashboard/pws/IMARIC13'
    },
    {
      id: 'IVEGAB17',
      name: 'Vega Baja Station',
      locationDesc: 'Weather station located in Vega Baja, Puerto Rico.',
      latitude: 18.45,
      longitude: -66.38,
      wundergroundUrl: 'https://www.wunderground.com/dashboard/pws/IVEGAB17'
    },
    {
      id: 'ICULEB6',
      name: 'Culebra Station',
      locationDesc: 'Weather station located in Culebra, Puerto Rico.',
      latitude: 18.31,
      longitude: -65.30,
      wundergroundUrl: 'https://www.wunderground.com/dashboard/pws/ICULEB6'
    },
    {
      id: 'IPONCE128',
      name: 'Ponce Station',
      locationDesc: 'Weather station located in Ponce, Puerto Rico.',
      latitude: 17.98,
      longitude: -66.66,
      wundergroundUrl: 'https://www.wunderground.com/dashboard/pws/IPONCE128'
    },
    {
      id: 'IARECI36',
      name: 'Arecibo Station',
      locationDesc: 'Weather station located in Arecibo, Puerto Rico.',
      latitude: 18.46,
      longitude: -66.74,
      wundergroundUrl: 'https://www.wunderground.com/dashboard/pws/IARECI36'
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

  // Create weekly schedules for current week and next 3 weeks
  const today = new Date();
  const dayOfWeek = today.getDay();
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  currentMonday.setHours(0, 0, 0, 0);

  // Rotate through stations for each week
  const stationRotation = ['IMAYAG30', 'ICAYEY43', 'IAGUAD73', 'ICABOR73'];

  for (let week = 0; week < 4; week++) {
    const monday = new Date(currentMonday);
    monday.setDate(currentMonday.getDate() + (week * 7));

    const stationId = stationRotation[week % stationRotation.length];
    const announcedAt = new Date(monday.getTime() - 3 * 24 * 60 * 60 * 1000); // Previous Friday

    await prisma.weeklySchedule.upsert({
      where: {
        stationId_weekStart: {
          stationId,
          weekStart: monday
        }
      },
      update: {},
      create: {
        stationId,
        weekStart: monday,
        announcedAt
      }
    });

    console.log(`✅ Seeded schedule for week of ${monday.toISOString().split('T')[0]}: ${stationId}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
