// frontend/src/utils/coverArt.js
// Generates an AI image URL for a trip using Pollinations.ai (free, no key).

/**
 * Build a good image prompt from the trip data.
 * @param {Object} trip
 * @returns {string}
 */
function buildPrompt(trip) {
  const dest = trip.destination || "a beautiful destination";
  const interests = Array.isArray(trip.interests)
    ? trip.interests.filter(Boolean).slice(0, 3)
    : [];

  const parts = [
    `stunning travel photography of ${dest}`,
    interests.length ? interests.join(", ") : "",
    "golden hour lighting, vibrant colors, cinematic composition, high detail, 4k, professional shot",
  ];

  return parts.filter(Boolean).join(", ");
}

/**
 * Build the Pollinations URL.
 * Uses a seed so the image is deterministic per trip + regeneration count.
 * @param {Object} trip
 * @param {number} seed
 * @returns {string}
 */
export function buildCoverArtUrl(trip, seed = 1) {
  const prompt = buildPrompt(trip);
  const encoded = encodeURIComponent(prompt);
  const tripSeed =
    (trip._id || trip.destination || "trip")
      .split("")
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + seed * 1000;

  return (
    `https://image.pollinations.ai/prompt/${encoded}` +
    `?width=1200&height=630&nologo=true&seed=${tripSeed}`
  );
}

/**
 * Preload an image so we know it's ready before swapping the src.
 * @param {string} url
 * @returns {Promise<boolean>}
 */
export function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}