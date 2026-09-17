// backend/services/placesService.js
// Finds tourist attractions near a location using Overpass API (OpenStreetMap).
// Tries multiple mirrors, caches by location, and adds Pexels photos.

import { getPlaceImages } from "./imageService.js";

const cache = new Map(); // in-memory cache, keyed by rounded lat/lng

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

export const getTouristPlaces = async (lat, lng, radiusMeters = 15000) => {
  const cacheKey = `${lat.toFixed(1)},${lng.toFixed(1)},${radiusMeters}`;

  if (cache.has(cacheKey)) {
    console.log("Places cache hit:", cacheKey);
    return cache.get(cacheKey);
  }

  const query = `
    [out:json][timeout:25];
    (
      node["tourism"~"attraction|museum|viewpoint|artwork|gallery|zoo|theme_park"](around:${radiusMeters},${lat},${lng});
      way["tourism"~"attraction|museum|viewpoint|artwork|gallery|zoo|theme_park"](around:${radiusMeters},${lat},${lng});
    );
    out center 30;
  `;

  let rawPlaces = [];

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(mirror, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "AI-Travel-Planner-MCA/1.0",
        },
        body: "data=" + encodeURIComponent(query),
      });

      if (!res.ok) continue;

      const data = await res.json();

      rawPlaces = (data.elements || [])
        .map((el) => {
          const la = el.lat ?? el.center?.lat;
          const lo = el.lon ?? el.center?.lon;
          const name = el.tags?.name;
          if (!name || !la || !lo) return null;

          return {
            id: el.id,
            name,
            lat: la,
            lng: lo,
            type: el.tags?.tourism || "attraction",
            description: el.tags?.description || el.tags?.["description:en"] || "",
            image: null, // will be filled below
          };
        })
        .filter(Boolean);

      break; // stop trying mirrors if this one worked
    } catch (err) {
      console.error(`Places mirror failed (${mirror}):`, err.message);
    }
  }

  // Dedupe by name, take first 12
  const seen = new Set();
  const unique = [];
  for (const p of rawPlaces) {
    if (!seen.has(p.name)) {
      seen.add(p.name);
      unique.push(p);
      if (unique.length >= 12) break;
    }
  }

  // Fetch a Pexels photo for each place (in parallel, but with limit)
  const withImages = await Promise.all(
    unique.map(async (p) => {
      const imgs = await getPlaceImages(p.name, 1);
      return { ...p, image: imgs[0] || null };
    })
  );

  cache.set(cacheKey, withImages);
  return withImages;
};