const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importData() {
  try {
    // Read the export file
    const exportPath = path.join(__dirname, '../export.json');

    if (!fs.existsSync(exportPath)) {
      console.error('Error: export.json not found!');
      console.log('Please place your export.json file in the backend directory');
      process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));

    console.log('📦 Importing data...');
    console.log(`  Users: ${data.users?.length || 0}`);
    console.log(`  Forecasts: ${data.forecasts?.length || 0}`);
    console.log(`  Scores: ${data.scores?.length || 0}`);

    // Import users first (they don't depend on anything)
    if (data.users && data.users.length > 0) {
      console.log('\n👥 Importing users...');
      for (const user of data.users) {
        try {
          await prisma.user.upsert({
            where: { email: user.email },
            update: {
              username: user.username,
              passwordHash: user.passwordHash,
              preferredLang: user.preferredLang,
              totalPoints: user.totalPoints
            },
            create: {
              email: user.email,
              username: user.username,
              passwordHash: user.passwordHash,
              preferredLang: user.preferredLang,
              totalPoints: user.totalPoints
            }
          });
          console.log(`  ✓ ${user.email}`);
        } catch (error) {
          console.log(`  ✗ ${user.email}: ${error.message}`);
        }
      }
    }

    // Get user ID mapping (local ID -> production ID)
    const userMapping = {};
    if (data.users && data.users.length > 0) {
      for (const localUser of data.users) {
        const prodUser = await prisma.user.findUnique({
          where: { email: localUser.email }
        });
        if (prodUser) {
          userMapping[localUser.id] = prodUser.id;
        }
      }
    }

    // Import forecasts
    if (data.forecasts && data.forecasts.length > 0) {
      console.log('\n🌤️  Importing forecasts...');
      for (const forecast of data.forecasts) {
        try {
          const prodUserId = userMapping[forecast.userId];
          if (!prodUserId) {
            console.log(`  ✗ Forecast ${forecast.id}: User not found`);
            continue;
          }

          await prisma.forecast.upsert({
            where: {
              userId_forecastDate: {
                userId: prodUserId,
                forecastDate: new Date(forecast.forecastDate)
              }
            },
            update: {
              maxTemp: forecast.maxTemp,
              minTemp: forecast.minTemp,
              windGust: forecast.windGust,
              precipRange: forecast.precipRange
            },
            create: {
              userId: prodUserId,
              stationId: forecast.stationId,
              forecastDate: new Date(forecast.forecastDate),
              maxTemp: forecast.maxTemp,
              minTemp: forecast.minTemp,
              windGust: forecast.windGust,
              precipRange: forecast.precipRange,
              submittedAt: new Date(forecast.submittedAt)
            }
          });
          console.log(`  ✓ Forecast for ${forecast.forecastDate}`);
        } catch (error) {
          console.log(`  ✗ Forecast ${forecast.id}: ${error.message}`);
        }
      }
    }

    // Import scores (if any)
    if (data.scores && data.scores.length > 0) {
      console.log('\n📊 Importing scores...');
      for (const score of data.scores) {
        try {
          const prodUserId = userMapping[score.userId];
          if (!prodUserId) {
            console.log(`  ✗ Score ${score.id}: User not found`);
            continue;
          }

          // Find the forecast in production
          const forecast = await prisma.forecast.findUnique({
            where: {
              userId_forecastDate: {
                userId: prodUserId,
                forecastDate: new Date(score.scoreDate)
              }
            }
          });

          if (!forecast) {
            console.log(`  ✗ Score ${score.id}: Forecast not found`);
            continue;
          }

          await prisma.score.upsert({
            where: { forecastId: forecast.id },
            update: {
              maxTempScore: score.maxTempScore,
              minTempScore: score.minTempScore,
              windGustScore: score.windGustScore,
              precipScore: score.precipScore,
              perfectBonus: score.perfectBonus,
              totalScore: score.totalScore
            },
            create: {
              userId: prodUserId,
              forecastId: forecast.id,
              readingId: score.readingId,
              scoreDate: new Date(score.scoreDate),
              maxTempScore: score.maxTempScore,
              minTempScore: score.minTempScore,
              windGustScore: score.windGustScore,
              precipScore: score.precipScore,
              perfectBonus: score.perfectBonus,
              totalScore: score.totalScore
            }
          });
          console.log(`  ✓ Score for ${score.scoreDate}`);
        } catch (error) {
          console.log(`  ✗ Score ${score.id}: ${error.message}`);
        }
      }
    }

    console.log('\n✅ Import complete!');

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importData();
