// Free, no API key needed. Uses Open-Meteo + Nominatim.

// Convert place name → { lat, lng, displayName }
export const geocode = async (place) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    place
  )}`;

  const res = await fetch(url, {
    headers: {
      // Nominatim requires a User-Agent
      "User-Agent": "AI-Travel-Planner-MCA-Project/1.0",
    },
  });

  if (!res.ok) throw new Error("Geocoding failed");

  const data = await res.json();
  if (!data.length) throw new Error(`Could not find location: ${place}`);

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
};

// Get current weather + 7-day forecast for a location
export const getWeather = async (lat, lng) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather fetch failed");

  return await res.json();
};