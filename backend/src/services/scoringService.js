/**
 * Scoring Service for Hurricane Forecast Competition
 * Implements all scoring rules from the competition document
 */

/**
 * Calculate score for max temperature prediction
 * @param {number} forecast - User's forecast (whole number °F)
 * @param {number} actual - Actual reading (rounded to whole number °F)
 * @returns {number} Score 0-5
 */
function calculateMaxTempScore(forecast, actual) {
  const diff = Math.abs(forecast - actual);
  if (diff === 0) return 5;
  if (diff === 1) return 4;
  if (diff === 2) return 3;
  if (diff === 3) return 2;
  if (diff === 4) return 1;
  return 0;
}

/**
 * Calculate score for min temperature prediction
 * Same rules as max temp
 */
function calculateMinTempScore(forecast, actual) {
  return calculateMaxTempScore(forecast, actual);
}

/**
 * Calculate score for wind gust prediction
 * @param {number} forecast - User's forecast (mph)
 * @param {number} actual - Actual max gust (mph)
 * @returns {number} Score 0-5
 */
function calculateWindGustScore(forecast, actual) {
  const diff = Math.abs(forecast - Math.round(actual));
  if (diff === 0) return 5;
  if (diff <= 2) return 4;
  if (diff <= 5) return 3;
  if (diff <= 9) return 2;
  if (diff <= 14) return 1;
  return 0;
}

/**
 * Convert precipitation inches to range number (1-7)
 * @param {number} inches - Total precipitation in inches
 * @returns {number} Range 1-7
 */
function getPrecipRange(inches) {
  if (inches <= 0.10) return 1;
  if (inches <= 0.25) return 2;
  if (inches <= 0.50) return 3;
  if (inches <= 1.00) return 4;
  if (inches <= 1.50) return 5;
  if (inches <= 2.50) return 6;
  return 7;
}

/**
 * Get human-readable precipitation range description
 * @param {number} range - Range number 1-7
 * @returns {object} Range description with min and max inches
 */
function getPrecipRangeDescription(range) {
  const ranges = {
    1: { min: 0.00, max: 0.10, label: '0.00" - 0.10"' },
    2: { min: 0.11, max: 0.25, label: '0.11" - 0.25"' },
    3: { min: 0.26, max: 0.50, label: '0.26" - 0.50"' },
    4: { min: 0.51, max: 1.00, label: '0.51" - 1.00"' },
    5: { min: 1.01, max: 1.50, label: '1.01" - 1.50"' },
    6: { min: 1.51, max: 2.50, label: '1.51" - 2.50"' },
    7: { min: 2.51, max: Infinity, label: '2.51" or more' }
  };
  return ranges[range] || ranges[1];
}

/**
 * Calculate score for precipitation range prediction
 * @param {number} forecastRange - User's forecast range (1-7)
 * @param {number} actualRange - Actual range (1-7)
 * @returns {number} Score 0-5
 */
function calculatePrecipScore(forecastRange, actualRange) {
  const diff = Math.abs(forecastRange - actualRange);
  if (diff === 0) return 5;
  if (diff === 1) return 4;
  if (diff === 2) return 3;
  if (diff === 3) return 2;
  if (diff === 4) return 1;
  return 0;
}

/**
 * Round temperature to nearest whole number (standard rounding)
 * @param {number} temp - Temperature value
 * @returns {number} Rounded temperature
 */
function roundTemperature(temp) {
  return Math.round(temp);
}

/**
 * Calculate complete score for a forecast vs actual reading
 * @param {object} forecast - User's forecast
 * @param {object} reading - Station reading
 * @returns {object} Detailed score breakdown
 */
function calculateTotalScore(forecast, reading) {
  const maxTempScore = calculateMaxTempScore(
    forecast.maxTemp,
    reading.maxTempRounded
  );

  const minTempScore = calculateMinTempScore(
    forecast.minTemp,
    reading.minTempRounded
  );

  const windGustScore = calculateWindGustScore(
    forecast.windGust,
    Number(reading.windGustMax)
  );

  const precipScore = calculatePrecipScore(
    forecast.precipRange,
    reading.precipRange
  );

  // Perfect forecast bonus: +5 if all parameters are perfect
  const isPerfect = maxTempScore === 5 &&
                    minTempScore === 5 &&
                    windGustScore === 5 &&
                    precipScore === 5;

  const perfectBonus = isPerfect ? 5 : 0;

  const totalScore = maxTempScore + minTempScore + windGustScore + precipScore + perfectBonus;

  return {
    maxTempScore,
    minTempScore,
    windGustScore,
    precipScore,
    perfectBonus,
    totalScore,
    isPerfect,
    breakdown: {
      maxTemp: {
        forecast: forecast.maxTemp,
        actual: reading.maxTempRounded,
        diff: Math.abs(forecast.maxTemp - reading.maxTempRounded),
        score: maxTempScore
      },
      minTemp: {
        forecast: forecast.minTemp,
        actual: reading.minTempRounded,
        diff: Math.abs(forecast.minTemp - reading.minTempRounded),
        score: minTempScore
      },
      windGust: {
        forecast: forecast.windGust,
        actual: Math.round(Number(reading.windGustMax)),
        diff: Math.abs(forecast.windGust - Math.round(Number(reading.windGustMax))),
        score: windGustScore
      },
      precip: {
        forecastRange: forecast.precipRange,
        actualRange: reading.precipRange,
        actualInches: Number(reading.precipTotal),
        rangeDiff: Math.abs(forecast.precipRange - reading.precipRange),
        score: precipScore
      }
    }
  };
}

/**
 * Process a raw station reading from JSON file
 * @param {object} rawData - Raw JSON data from weather station
 * @returns {object} Processed reading ready for database
 */
function processStationReading(rawData) {
  const maxTempRounded = roundTemperature(rawData.MaxTemp);
  const minTempRounded = roundTemperature(rawData.MinTemp);
  const precipRange = getPrecipRange(rawData.SumPrec);

  return {
    maxTempRaw: rawData.MaxTemp,
    maxTempRounded,
    minTempRaw: rawData.MinTemp,
    minTempRounded,
    windGustMax: rawData.MaxGust,
    precipTotal: rawData.SumPrec,
    precipRange
  };
}

module.exports = {
  calculateMaxTempScore,
  calculateMinTempScore,
  calculateWindGustScore,
  calculatePrecipScore,
  getPrecipRange,
  getPrecipRangeDescription,
  roundTemperature,
  calculateTotalScore,
  processStationReading
};
