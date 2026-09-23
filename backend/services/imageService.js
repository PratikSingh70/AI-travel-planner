// backend/services/imageService.js
// Multi-source destination & attraction images with fallback:
//   1. Pexels    — reliable, high-quality stock photos
//   2. Pixabay   — huge library, no attribution required
//   3. Openverse — vast collection of openly-licensed works
//
// Returns URL strings (drop-in compatible with existing callers).

const PEXELS_URL = "https://api.pexels.com/v1/search";
const PIXABAY_URL = "https://pixabay.com/api/";
const OPENVERSE_URL = "https://api.openverse.org/v1/images/";

const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ─────────────────────────────────────────────────────────────
// Lazy key lookups (so .env is always loaded before use)
// ─────────────────────────────────────────────────────────────
const getPexelsKey = () => process.env.PEXELS_API_KEY || null;
const getPixabayKey = () => process.env.PIXABAY_API_KEY || null;

// ─────────────────────────────────────────────────────────────
// PEXELS SEARCH
// ─────────────────────────────────────────────────────────────
const searchPexels = async (query, count = 5) => {
  const key = getPexelsKey();
  if (!key) return [];

  try {
    const url = `${PEXELS_URL}?query=${encodeURIComponent(query)}&per_page=${Math.min(count, 80)}&orientation=landscape`;
    const res = await fetch(url, { headers: { Authorization: key } });

    if (!res.ok) throw new Error(`Pexels returned ${res.status}`);
    const data = await res.json();

    return (data.photos || []).map((photo) => ({
      url: photo.src?.large2x || photo.src?.large || photo.src?.original,
      source: 'pexels',
      photographer: photo.photographer || '',
    })).filter((p) => p.url);
  } catch (err) {
    console.error(`Pexels search failed (${query}):`, err.message);
    return [];
  }
};

// ─────────────────────────────────────────────────────────────
// PIXABAY SEARCH
// ─────────────────────────────────────────────────────────────
const searchPixabay = async (query, count = 5) => {
  const key = getPixabayKey();
  if (!key) return [];

  try {
    const url = `${PIXABAY_URL}?key=${key}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=${Math.min(count, 50)}&safesearch=true`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`Pixabay returned ${res.status}`);
    const data = await res.json();

    return (data.hits || []).map((photo) => ({
      url: photo.largeImageURL || photo.webformatURL,
      source: 'pixabay',
      photographer: photo.user || '',
    })).filter((p) => p.url);
  } catch (err) {
    console.error(`Pixabay search failed (${query}):`, err.message);
    return [];
  }
};

// ─────────────────────────────────────────────────────────────
// OPENVERSE SEARCH (No API Key Required)
// ─────────────────────────────────────────────────────────────
const searchOpenverse = async (query, count = 5) => {
  try {
    const url = `${OPENVERSE_URL}?q=${encodeURIComponent(query)}&page_size=${Math.min(count, 20)}&license_type=commercial`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`Openverse returned ${res.status}`);
    const data = await res.json();

    return (data.results || []).map((item) => ({
      url: item.url,
      source: 'openverse',
      photographer: item.creator || '',
    })).filter((p) => p.url);
  } catch (err) {
    console.error(`Openverse search failed (${query}):`, err.message);
    return [];
  }
};

// ─────────────────────────────────────────────────────────────
// Dedupe by URL
// ─────────────────────────────────────────────────────────────
const removeDuplicates = (images) => {
  const seen = new Set();
  return images.filter((img) => {
    if (!img?.url || seen.has(img.url)) return false;
    seen.add(img.url);
    return true;
  });
};

// ─────────────────────────────────────────────────────────────
// SOURCE CHAIN — tries Pexels → Pixabay → Openverse
// ─────────────────────────────────────────────────────────────
const searchAllSources = async (query, count = 5) => {
  // 1. Pexels (reliable, high quality)
  let images = await searchPexels(query, count);

  // 2. Pixabay (fill remaining slots)
  if (images.length < count) {
    const fromPixabay = await searchPixabay(query, count);
    images.push(...fromPixabay);
  }

  // 3. Openverse (fill remaining slots)
  if (images.length < count) {
    const fromOpenverse = await searchOpenverse(query, count);
    images.push(...fromOpenverse);
  }

  return removeDuplicates(images).slice(0, count);
};

// ─────────────────────────────────────────────────────────────
// DESTINATION HERO IMAGE — returns a single URL string (or null)
// ─────────────────────────────────────────────────────────────
export const getDestinationImage = async (destination) => {
  if (!destination) return null;

  const cacheKey = `destination:${destination.toLowerCase().trim()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  const queries = [
    `${destination} travel`,
    `${destination} tourism`,
    `${destination} landscape`,
  ];

  let images = [];
  for (const q of queries) {
    const results = await searchAllSources(q, 5);
    images.push(...results);
    if (images.length >= 8) break;
  }

  images = removeDuplicates(images);

  if (!images.length) {
    console.warn(`No destination images found for ${destination}`);
    return null;
  }

  const heroUrl = images[0].url;
  cache.set(cacheKey, { data: heroUrl, time: Date.now() });
  return heroUrl;
};

// ─────────────────────────────────────────────────────────────
// MULTIPLE DESTINATION IMAGES — returns URL string array
// ─────────────────────────────────────────────────────────────
export const getDestinationImages = async (destination, count = 8) => {
  if (!destination) return [];

  const cacheKey = `destination-gallery:${destination.toLowerCase().trim()}:${count}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;

  const queries = [
    `${destination} travel`,
    `${destination} tourism`,
    `${destination} nature`,
    `${destination} city`,
  ];

  let images = [];
  for (const q of queries) {
    const results = await searchAllSources(q, 5);
    images.push(...results);
    if (images.length >= count * 2) break;
  }

  const urls = removeDuplicates(images).slice(0, count).map((img) => img.url);
  cache.set(cacheKey, { data: urls, time: Date.now() });
  return urls;
};

// ─────────────────────────────────────────────────────────────
// PLACE / ATTRACTION IMAGES — returns URL string array
// ─────────────────────────────────────────────────────────────
export const getPlaceImages = async (query, count = 3) => {
  if (!query) return [];

  const cacheKey = `place:${query.toLowerCase().trim()}:${count}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;

  const searches = [query, `${query} landmark`];

  let images = [];
  for (const s of searches) {
    const results = await searchAllSources(s, count);
    images.push(...results);
    if (images.length >= count * 2) break;
  }

  const urls = removeDuplicates(images).slice(0, count).map((img) => img.url);
  cache.set(cacheKey, { data: urls, time: Date.now() });
  return urls;
};