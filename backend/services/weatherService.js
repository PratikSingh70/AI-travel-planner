// backend/services/weatherService.js
// Uses Open-Meteo + Nominatim (both free, no API key required).
// Nominatim is tried FIRST because it handles states/regions correctly.

const USER_AGENT =
  "AI-Travel-Planner-MCA/1.0 (https://github.com/PratikSingh70/AI-travel-planner)";

const geoCache = new Map();
const GEO_TTL = 30 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────
// NOMINATIM (OpenStreetMap) — Primary
// ─────────────────────────────────────────────────────────────
const geocodeNominatim = async (place) => {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?format=json&limit=5&addressdetails=1` +
    `&q=${encodeURIComponent(place)}`;

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data) || !data.length) {
    throw new Error("Nominatim: no results");
  }

  const best = data[0];

  return {
    lat: parseFloat(best.lat),
    lng: parseFloat(best.lon),
    displayName: best.display_name,
    type: best.type,
    importance: parseFloat(best.importance) || 0,
    source: "nominatim",
  };
};

// ─────────────────────────────────────────────────────────────
// OPEN-METEO geocoding — Fallback
// ─────────────────────────────────────────────────────────────
const geocodeOpenMeteo = async (place) => {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(place)}&count=1&language=en&format=json`;

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Open-Meteo geocoding ${res.status}`);

  const data = await res.json();
  if (!data.results?.length) throw new Error("Open-Meteo: no results");

  const r = data.results[0];

  return {
    lat: r.latitude,
    lng: r.longitude,
    displayName: `${r.name}${r.country ? ", " + r.country : ""}`,
    type: r.feature_code || null,
    importance: r.population || 0,
    source: "open-meteo",
  };
};

// ─────────────────────────────────────────────────────────────
// Query variants
// ─────────────────────────────────────────────────────────────
const buildVariants = (place) => {
  const parts = place
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const candidates = [
    place,
    parts.slice(0, 3).join(", "),
    parts.slice(0, 2).join(", "),
    parts[0],
    parts.slice(-2).join(", "),
  ].filter(Boolean);

  return [...new Set(candidates)];
};

// ─────────────────────────────────────────────────────────────
// Try both providers; pick highest importance
// ─────────────────────────────────────────────────────────────
const geocodeAny = async (place) => {
  const variants = buildVariants(place);
  let lastError;

  for (const variant of variants) {
    const results = [];

    try {
      const r = await geocodeNominatim(variant);
      results.push(r);
    } catch (err) {
      lastError = err;
    }

    try {
      const r = await geocodeOpenMeteo(variant);
      results.push(r);
    } catch (err) {
      lastError = err;
    }

    await sleep(300);

    if (!results.length) continue;

    results.sort((a, b) => (b.importance || 0) - (a.importance || 0));
    const best = results[0];

    if (
      typeof best.lat === "number" &&
      typeof best.lng === "number" &&
      !Number.isNaN(best.lat) &&
      !Number.isNaN(best.lng)
    ) {
      return best;
    }
  }

  throw new Error(
    `Could not geocode "${place}". Last error: ${lastError?.message || "Unknown"}`
  );
};

// ─────────────────────────────────────────────────────────────
// Public — cached geocode
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Weather fetch
// ─────────────────────────────────────────────────────────────
export const getWeather = async (lat, lng) => {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=7`;

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  return await res.json();
};