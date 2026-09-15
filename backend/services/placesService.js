// Find tourist attractions near a location using Overpass API (OpenStreetMap).
// Free, no API key. Please don't spam it — 1-2 requests per user action.

export const getTouristPlaces = async (lat, lng, radiusMeters = 15000) => {
  // Overpass QL query: find tourism-related POIs within radius
  const query = `
    [out:json][timeout:25];
    (
      node["tourism"~"attraction|museum|viewpoint|artwork|gallery|zoo|theme_park"](around:${radiusMeters},${lat},${lng});
      way["tourism"~"attraction|museum|viewpoint|artwork|gallery|zoo|theme_park"](around:${radiusMeters},${lat},${lng});
    );
    out center 30;
  `;

  const url = "https://overpass-api.de/api/interpreter";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "AI-Travel-Planner-MCA/1.0",
    },
    body: "data=" + encodeURIComponent(query),
  });

  if (!res.ok) throw new Error("Tourist places fetch failed");

  const data = await res.json();

  // Clean and format results
  const places = (data.elements || [])
    .map((el) => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      const name = el.tags?.name;
      if (!name || !lat || !lng) return null;

      return {
        id: el.id,
        name,
        lat,
        lng,
        type: el.tags?.tourism || "attraction",
        description:
          el.tags?.description ||
          el.tags?.["description:en"] ||
          el.tags?.wikipedia ||
          "",
        wikipedia: el.tags?.wikipedia || null,
      };
    })
    .filter(Boolean);

  // Deduplicate by name
  const seen = new Set();
  const unique = [];
  for (const p of places) {
    if (!seen.has(p.name)) {
      seen.add(p.name);
      unique.push(p);
    }
  }

  return unique.slice(0, 20); // max 20
};