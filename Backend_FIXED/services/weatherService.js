// backend/services/weatherService.js
// Uses Open-Meteo + Nominatim (both free, no API key required).

const USER_AGENT =
  "AI-Travel-Planner-MCA/1.0 (https://github.com/PratikSingh70/AI-travel-planner)";

const geoCache = new Map();
const GEO_TTL = 30 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Try Open-Meteo first (more lenient), then Nominatim.
const geocodeOpenMeteo = async (place) => {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    place
  )}&count=1&language=en&format=json`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Open-Meteo geocoding ${res.status}`);
  const data = await res.json();
  if (!data.results?.length) throw new Error("Open-Meteo: no results");
  const r = data.results[0];
  return {
    lat: r.latitude,
    lng: r.longitude,
    displayName: `${r.name}${r.country ? ", " + r.country : ""}`,
  };
};

const geocodeNominatim = async (place) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    place
  )}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  if (!data.length) throw new Error("Nominatim: no results");
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
};

// Try multiple shortened variants of the input
const geocodeAny = async (place) => {
  const parts = place
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const variants = [
    place,
    parts.slice(0, 3).join(", "),
    parts.slice(0, 2).join(", "),
    parts[0],
    parts.slice(-2).join(", "),
  ].filter(Boolean);

  const providers = [geocodeOpenMeteo, geocodeNominatim];
  let lastError;

  for (const variant of variants) {
    for (const provider of providers) {
      try {
        return await provider(variant);
      } catch (err) {
        lastError = err;
        if (provider === geocodeNominatim) await sleep(300);
      }
    }
  }

  throw new Error(
    `Could not geocode "${place}". Last error: ${lastError?.message}`
  );
};

export const geocode = async (place) => {
  const key = place.toLowerCase().trim();
  const cached = geoCache.get(key);
  if (cached && Date.now() - cached.time < GEO_TTL) {
    return cached.value;
  }

  const result = await geocodeAny(place);
  geoCache.set(key, { value: result, time: Date.now() });
  return result;
};

export const getWeather = async (lat, lng) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  return await res.json();
};