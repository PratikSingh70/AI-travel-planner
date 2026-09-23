// backend/services/imageService.js
// Uses Pexels API (free) to fetch real destination photos.

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_URL = "https://api.pexels.com/v1/search";

// Cache results in memory for 24h
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const getDestinationImage = async (destination) => {
  if (!PEXELS_API_KEY) {
    console.warn("PEXELS_API_KEY not set in .env");
    return null;
  }

  const cacheKey = `dest:${destination.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.url;
  }

  try {
    const url = `${PEXELS_URL}?query=${encodeURIComponent(
      destination + " travel landscape"
    )}&per_page=1&orientation=landscape`;

    const res = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
    });

    if (!res.ok) throw new Error(`Pexels returned ${res.status}`);

    const data = await res.json();
    const imageUrl = data.photos?.[0]?.src?.large2x || data.photos?.[0]?.src?.large || null;

    if (imageUrl) {
      cache.set(cacheKey, { url: imageUrl, time: Date.now() });
    }

    return imageUrl;
  } catch (err) {
    console.error("Pexels image error:", err.message);
    return null;
  }
};

// Get multiple images for a place (for hotel/attraction cards)
export const getPlaceImages = async (query, count = 1) => {
  if (!PEXELS_API_KEY) return [];

  const cacheKey = `place:${query.toLowerCase()}:${count}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.urls;
  }

  try {
    const url = `${PEXELS_URL}?query=${encodeURIComponent(
      query
    )}&per_page=${count}&orientation=landscape`;

    const res = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
    });

    if (!res.ok) throw new Error(`Pexels returned ${res.status}`);

    const data = await res.json();
    const urls = (data.photos || []).map((p) => p.src.large || p.src.medium);

    cache.set(cacheKey, { urls, time: Date.now() });
    return urls;
  } catch (err) {
    console.error("Pexels images error:", err.message);
    return [];
  }
};