/**
 * Import Weather Readings Script
 *
 * Reads JSON files from the data directory and imports them into the database.
 * JSON files should be named: {STATION_ID}_{YYYY-MM-DD}.json
 *
 * Usage: npm run import-readings
 * Or: node scripts/importReadings.js [optional: specific file path]
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { processStationReading } = require('../src/services/scoringService');

const prisma = new PrismaClient();

// Directory containing JSON files
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

/**
 * Parse filename to extract station ID and date
 * Expected format: STATIONID_YYYY-MM-DD.json
 */
function parseFilename(filename) {
  const match = filename.match(/^([A-Z0-9]+)_(\d{4}-\d{2}-\d{2})\.json$/);
  if (!match) {
    return null;
  }
  return {
    stationId: match[1],
    date: match[2]
  };
}

/**
 * Import a single JSON file
 */
async function importFile(filePath) {
  const filename = path.basename(filePath);
  const parsed = parseFilename(filename);

  if (!parsed) {
    console.log(`⚠️  Skipping ${filename} - invalid filename format`);
    return { success: false, reason: 'invalid filename' };
  }

  const { stationId, date } = parsed;

  // Check if station exists
  const station = await prisma.station.findUnique({
    where: { id: stationId }
  });

  if (!station) {
    console.log(`⚠️  Skipping ${filename} - station ${stationId} not found`);
    return { success: false, reason: 'station not found' };
  }

  // Check if reading already exists
  const existingReading = await prisma.stationReading.findUnique({
    where: {
      stationId_readingDate: {
        stationId,
        readingDate: new Date(date)
      }
    }
  });

  if (existingReading) {
    console.log(`⏭️  Skipping ${filename} - reading already exists`);
    return { success: false, reason: 'already exists' };
  }

  // Read and parse JSON
  let rawData;
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    rawData = JSON.parse(fileContent);
  } catch (err) {
    console.log(`❌ Error reading ${filename}: ${err.message}`);
    return { success: false, reason: 'file read error' };
  }

  // Validate required fields
  if (
    typeof rawData.MaxTemp !== 'number' ||
    typeof rawData.MinTemp !== 'number' ||
    typeof rawData.MaxGust !== 'number' ||
    typeof rawData.SumPrec !== 'number'
  ) {
    console.log(`❌ Invalid data in ${filename} - missing or invalid fields`);
    return { success: false, reason: 'invalid data' };
  }

  // Process the reading
  const processed = processStationReading(rawData);

  // Insert into database
  try {
    await prisma.stationReading.create({
      data: {
        stationId,
        readingDate: new Date(date),
        ...processed
      }
    });
    console.log(`✅ Imported ${filename}`);
    return { success: true, stationId, date };
  } catch (err) {
    console.log(`❌ Database error for ${filename}: ${err.message}`);
    return { success: false, reason: 'database error' };
  }
}

/**
 * Import all JSON files from the data directory
 */
async function importAll() {
  console.log(`\n📂 Reading files from: ${DATA_DIR}\n`);

  if (!fs.existsSync(DATA_DIR)) {
    console.log(`❌ Data directory not found: ${DATA_DIR}`);
    console.log('Create it and add your weather station JSON files.');
    return;
  }

  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.log('No JSON files found in data directory.');
    return;
  }

  console.log(`Found ${files.length} JSON file(s)\n`);

  const results = {
    success: 0,
    skipped: 0,
    errors: 0
  };

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const result = await importFile(filePath);

    if (result.success) {
      results.success++;
    } else if (result.reason === 'already exists') {
      results.skipped++;
    } else {
      results.errors++;
    }
  }

  console.log('\n📊 Import Summary:');
  console.log(`   ✅ Imported: ${results.success}`);
  console.log(`   ⏭️  Skipped:  ${results.skipped}`);
  console.log(`   ❌ Errors:   ${results.errors}`);
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  try {
    if (args.length > 0) {
      // Import specific file
      const filePath = args[0];
      if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found: ${filePath}`);
        process.exit(1);
      }
      await importFile(filePath);
    } else {
      // Import all files from data directory
      await importAll();
    }
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
