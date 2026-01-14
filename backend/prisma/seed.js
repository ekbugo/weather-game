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
    },
    {
      id: 'IARECI42',
      name: 'Arecibo Station',
      locationDesc: 'Weather station located in Ar3cibo, Puerto Rico.',
      latitude: 18.47,
      longitude: -66.70,
      wundergroundUrl: 'https://www.wunderground.com/dashboard/pws/IARECI42'
    }
  ];

  for (const station of stations) {
    await prisma.station.upsert({
      where: { id: station.id },
      update: station,
      create: station
    });
  }

  console.log(`✅ Seeded ${stations.length} weather stations`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
