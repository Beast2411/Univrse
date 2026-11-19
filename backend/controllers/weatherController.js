const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const descriptions = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  56: 'Light freezing drizzle', 57: 'Dense freezing drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  66: 'Light freezing rain', 67: 'Heavy freezing rain', 71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
  77: 'Snow grains', 80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
  85: 'Slight snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
};
let cached = null;
let cachedAt = 0;
const CACHE_MS = 10 * 60 * 1000;

exports.get = asyncHandler(async (req, res) => {
  const latitude = Number(process.env.CAMPUS_LATITUDE);
  const longitude = Number(process.env.CAMPUS_LONGITUDE);
  if (!process.env.CAMPUS_LATITUDE || !process.env.CAMPUS_LONGITUDE || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    const error = new Error('Set CAMPUS_LATITUDE and CAMPUS_LONGITUDE in backend/.env to enable weather'); error.status = 503; throw error;
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    const error = new Error('Campus coordinates must use valid latitude and longitude ranges'); error.status = 503; throw error;
  }
  if (cached && Date.now() - cachedAt < CACHE_MS) return success(res, 200, 'Weather fetched', cached);
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m', timezone: 'auto' }).toString();
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  } catch (cause) {
    const error = new Error(cause.name === 'TimeoutError' ? 'Weather provider timed out' : 'Weather provider is unavailable'); error.status = 502; throw error;
  }
  if (!response.ok) { const error = new Error(`Weather provider returned HTTP ${response.status}`); error.status = 502; throw error; }
  let payload;
  try { payload = await response.json(); }
  catch { const error = new Error('Weather provider returned invalid JSON'); error.status = 502; throw error; }
  if (!payload.current || typeof payload.current.temperature_2m !== 'number') { const error = new Error('Weather provider returned an unexpected response'); error.status = 502; throw error; }
  const current = payload.current;
  cached = {
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature,
    condition: descriptions[current.weather_code] || 'Unknown',
    weatherCode: current.weather_code,
    windSpeed: current.wind_speed_10m,
    relativeHumidity: current.relative_humidity_2m,
    isDay: current.is_day === 1,
    observedAt: current.time,
    timezone: payload.timezone
  };
  cachedAt = Date.now();
  success(res, 200, 'Weather fetched', cached);
});
