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
      name: 'Indiera Alta Station',
      locationDesc: 'Weather station located in Indiera Alta Maricao, Puerto Rico.',
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
    },
     {
      id: 'IMARIC10',
      name: 'Maricao Station',
      locationDesc: 'Weather station located in Maricao, Puerto Rico.',
      latitude: 18.18,
      longitude: -66.99,
      wundergroundUrl: 'https://www.wunderground.com/dashboard/pws/IMARIC10'
    },
     {
      id: 'ICAROL53',
      name: 'Carolina Station',
      locationDesc: 'Weather station located in Carolina, Puerto Rico.',
      latitude: 18.39,
      longitude: -65.96,
      wundergroundUrl: 'https://www.wunderground.com/dashboard/pws/ICAROL53'
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
