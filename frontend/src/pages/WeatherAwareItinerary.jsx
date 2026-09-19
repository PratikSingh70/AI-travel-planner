import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import WeatherIcon, { decodeWeatherCode } from "../components/WeatherIcon";
import "./WeatherAwareItinerary.css";

/* ─────────── Date helpers ─────────── */
const isoDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const todayISO = () => isoDate(new Date());
const addDaysISO = (iso, n) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return isoDate(d);
};
const weekdayShort = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
const monthDay = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

/* ─────────── Demo destinations ─────────── */
const DESTINATIONS = {
  kyoto: {
    name: "Kyoto, Japan",
    icon: "⛩️",
    lat: 35.0116,
    lon: 135.7681,
    activities: [
      { id: "k1", name: "Fushimi Inari shrine hike", type: "outdoor", hours: 3, emoji: "⛩️", sensitivity: 5, priority: 3 },
      { id: "k2", name: "Arashiyama bamboo grove", type: "outdoor", hours: 2, emoji: "🎋", sensitivity: 4, priority: 3 },
      { id: "k3", name: "Kinkaku-ji golden pavilion", type: "outdoor", hours: 1.5, emoji: "🏯", sensitivity: 3, priority: 3 },
      { id: "k4", name: "Traditional tea ceremony", type: "indoor", hours: 1.5, emoji: "🍵", sensitivity: 1, priority: 2 },
      { id: "k5", name: "Nishiki market food tour", type: "outdoor", hours: 2, emoji: "🍢", sensitivity: 2, priority: 2 },
      { id: "k6", name: "Kyoto National Museum", type: "indoor", hours: 2, emoji: "🏛️", sensitivity: 1, priority: 2 },
      { id: "k7", name: "Philosopher's Path walk", type: "outdoor", hours: 2, emoji: "🌸", sensitivity: 4, priority: 2 },
      { id: "k8", name: "Izakaya dinner in Pontocho", type: "indoor", hours: 2, emoji: "🍶", sensitivity: 1, priority: 3 },
      { id: "k9", name: "Gion evening stroll", type: "outdoor", hours: 1.5, emoji: "🏮", sensitivity: 3, priority: 2 },
    ],
  },
  paris: {
    name: "Paris, France",
    icon: "🗼",
    lat: 48.8566,
    lon: 2.3522,
    activities: [
      { id: "p1", name: "Eiffel Tower summit visit", type: "outdoor", hours: 3, emoji: "🗼", sensitivity: 4, priority: 3 },
      { id: "p2", name: "Louvre Museum tour", type: "indoor", hours: 3, emoji: "🖼️", sensitivity: 1, priority: 3 },
      { id: "p3", name: "Seine river walk", type: "outdoor", hours: 2, emoji: "🚶", sensitivity: 3, priority: 2 },
      { id: "p4", name: "Montmartre & Sacré-Cœur", type: "outdoor", hours: 2.5, emoji: "⛪", sensitivity: 4, priority: 3 },
      { id: "p5", name: "Catacombs underground tour", type: "indoor", hours: 2, emoji: "💀", sensitivity: 1, priority: 2 },
      { id: "p6", name: "Luxembourg Gardens picnic", type: "outdoor", hours: 2, emoji: "🥖", sensitivity: 5, priority: 2 },
      { id: "p7", name: "Café hopping in Le Marais", type: "indoor", hours: 2, emoji: "☕", sensitivity: 1, priority: 2 },
      { id: "p8", name: "Orsay Museum", type: "indoor", hours: 2.5, emoji: "🎨", sensitivity: 1, priority: 2 },
      { id: "p9", name: "Champs-Élysées & Arc de Triomphe", type: "outdoor", hours: 2, emoji: "🏛️", sensitivity: 3, priority: 3 },
    ],
  },
  bali: {
    name: "Bali, Indonesia",
    icon: "🏝️",
    lat: -8.4095,
    lon: 115.1889,
    activities: [
      { id: "b1", name: "Tegallalang rice terrace trek", type: "outdoor", hours: 3, emoji: "🌾", sensitivity: 5, priority: 3 },
      { id: "b2", name: "Uluwatu temple sunset", type: "outdoor", hours: 2.5, emoji: "🛕", sensitivity: 4, priority: 3 },
      { id: "b3", name: "Balinese cooking class", type: "indoor", hours: 3, emoji: "🍛", sensitivity: 1, priority: 2 },
      { id: "b4", name: "Ubud art market", type: "outdoor", hours: 2, emoji: "🎨", sensitivity: 2, priority: 2 },
      { id: "b5", name: "Traditional Balinese spa", type: "indoor", hours: 2, emoji: "💆", sensitivity: 1, priority: 3 },
      { id: "b6", name: "Mount Batur sunrise hike", type: "outdoor", hours: 5, emoji: "🌋", sensitivity: 5, priority: 3 },
      { id: "b7", name: "Seminyak beach day", type: "outdoor", hours: 4, emoji: "🏖️", sensitivity: 5, priority: 2 },
      { id: "b8", name: "Yoga & meditation session", type: "indoor", hours: 1.5, emoji: "🧘", sensitivity: 1, priority: 2 },
      { id: "b9", name: "Tirta Empul water temple", type: "outdoor", hours: 2, emoji: "💧", sensitivity: 3, priority: 2 },
    ],
  },
};

/* ─────────── Activity classifier for real trips ─────────── */
const OUTDOOR_KEYWORDS = [
  "hike", "trek", "walk", "stroll", "park", "garden", "beach", "mountain",
  "lake", "river", "viewpoint", "bridge", "terrace", "farm", "ruins",
  "monument", "statue", "square", "plaza", "outdoor", "bike", "cycling",
  "kayak", "boat", "cruise", "sunrise", "sunset", "waterfall", "island",
  "desert", "valley", "forest",
];
const INDOOR_KEYWORDS = [
  "museum", "gallery", "indoor", "restaurant", "cafe", "café", "coffee",
  "bar", "pub", "theater", "theatre", "cinema", "spa", "hammam",
  "cooking class", "workshop", "show", "concert", "aquarium", "mall",
  "shopping", "shop", "palace", "church", "cathedral", "temple", "shrine",
  "basilica", "castle",
];

function pickEmoji(text) {
  if (text.includes("museum")) return "🏛️";
  if (text.includes("park") || text.includes("garden")) return "🌳";
  if (text.includes("hike") || text.includes("trek")) return "🥾";
  if (text.includes("beach")) return "🏖️";
  if (text.includes("temple") || text.includes("shrine")) return "⛩️";
  if (text.includes("market")) return "🛍️";
  if (text.includes("restaurant") || text.includes("dinner") || text.includes("lunch")) return "🍽️";
  if (text.includes("cafe") || text.includes("café") || text.includes("coffee")) return "☕";
  if (text.includes("palace") || text.includes("castle")) return "🏰";
  if (text.includes("church") || text.includes("cathedral")) return "⛪";
  if (text.includes("bridge")) return "🌉";
  if (text.includes("waterfall")) return "💦";
  if (text.includes("mountain")) return "⛰️";
  if (text.includes("lake") || text.includes("river")) return "🏞️";
  if (text.includes("zoo")) return "🦁";
  if (text.includes("aquarium")) return "🐠";
  if (text.includes("shopping") || text.includes("shop")) return "🛍️";
  if (text.includes("show") || text.includes("concert")) return "🎭";
  if (text.includes("spa")) return "💆";
  return "📍";
}

function classifyActivity(activity, dayIndex, actIndex) {
  const title = (activity.title || activity.name || "").toLowerCase();
  const desc = (activity.description || "").toLowerCase();
  const text = `${title} ${desc}`;

  let type = "outdoor";
  let sensitivity = 3;

  const isOutdoor = OUTDOOR_KEYWORDS.some((k) => text.includes(k));
  const isIndoor = INDOOR_KEYWORDS.some((k) => text.includes(k));

  if (isOutdoor) {
    type = "outdoor";
    if (/hike|trek|beach|kayak|boat|cruise|sunrise|sunset|mountain|viewpoint|waterfall/.test(text)) {
      sensitivity = 5;
    } else if (/walk|stroll|park|garden|bridge|bike|cycling|outdoor/.test(text)) {
      sensitivity = 4;
    } else {
      sensitivity = 3;
    }
  } else if (isIndoor) {
    type = "indoor";
    sensitivity = 1;
  }

  return {
    id: activity._id || `${dayIndex}-${actIndex}`,
    name: activity.title || activity.name || "Activity",
    type,
    hours: 2,
    emoji: pickEmoji(text),
    sensitivity,
    priority: 2,
    originalDay: dayIndex,
    time: activity.time,
    cost: activity.cost,
    description: activity.description,
  };
}

function classifyTripActivities(itinerary) {
  const out = [];
  (itinerary || []).forEach((day, dayIdx) => {
    (day.activities || []).forEach((act, actIdx) => {
      out.push(classifyActivity(act, dayIdx, actIdx));
    });
  });
  return out;
}

/* ─────────── Forecast fetch ─────────── */
async function fetchForecast(lat, lon, startISO, days) {
  const endISO = addDaysISO(startISO, days - 1);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max` +
    `&timezone=auto&start_date=${startISO}&end_date=${endISO}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);
  const data = await res.json();
  const d = data.daily;
  return d.time.map((iso, i) => ({
    date: iso,
    code: d.weather_code[i],
    max: Math.round(d.temperature_2m_max[i]),
    min: Math.round(d.temperature_2m_min[i]),
    rain: d.precipitation_probability_max?.[i] ?? 0,
    wind: Math.round(d.wind_speed_10m_max?.[i] ?? 0),
    live: true,
  }));
}

function simulateForecast(placeName, startISO, days) {
  let seed = 7;
  for (const ch of placeName) seed = (seed * 31 + ch.charCodeAt(0)) % 233280;
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const codes = [0, 1, 2, 3, 45, 51, 61, 71, 80, 95];
  const out = [];
  for (let i = 0; i < days; i++) {
    const base = 8 + rng() * 20;
    const code = codes[Math.floor(rng() * codes.length)];
    out.push({
      date: addDaysISO(startISO, i),
      code,
      max: Math.round(base + 5),
      min: Math.round(base - 5),
      rain: Math.round(rng() * 100),
      wind: Math.round(rng() * 35),
      live: false,
    });
  }
  return out;
}

/* ─────────── Optimizer ─────────── */
function optimizeItinerary(activities, days, slotsPerDay) {
  const preferred = activities.map((a, i) => ({
    ...a,
    originalDay: a.originalDay ?? i % days.length,
  }));

  const outdoor = preferred
    .filter((a) => a.type === "outdoor")
    .sort((a, b) => b.sensitivity - a.sensitivity || b.priority - a.priority);
  const indoor = preferred
    .filter((a) => a.type === "indoor")
    .sort((a, b) => b.priority - a.priority);

  const slots = days.map(() => slotsPerDay);
  const assignment = days.map(() => []);
  const changes = [];

  for (const act of outdoor) {
    let bestDay = -1;
    let bestScore = Infinity;
    for (let d = 0; d < days.length; d++) {
      if (slots[d] <= 0) continue;
      const score = days[d].rain * (act.sensitivity / 5) - slots[d] * 4;
      if (score < bestScore) {
        bestScore = score;
        bestDay = d;
      }
    }
    if (bestDay < 0) continue;

    if (bestDay !== act.originalDay) {
      changes.push({
        id: act.id,
        activity: act.name,
        from: act.originalDay,
        to: bestDay,
        kind: "outdoor",
        reason: `${days[bestDay].rain}% rain vs ${
          days[act.originalDay]?.rain ?? "?"
        }% on the original day · sensitivity ${act.sensitivity}/5`,
      });
    }
    assignment[bestDay].push({ ...act, moved: bestDay !== act.originalDay });
    slots[bestDay]--;
  }

  for (const act of indoor) {
    let bestDay = -1;
    let bestScore = -Infinity;
    for (let d = 0; d < days.length; d++) {
      if (slots[d] <= 0) continue;
      const score = days[d].rain - slots[d] * 2;
      if (score > bestScore) {
        bestScore = score;
        bestDay = d;
      }
    }
    if (bestDay < 0) continue;

    if (bestDay !== act.originalDay) {
      changes.push({
        id: act.id,
        activity: act.name,
        from: act.originalDay,
        to: bestDay,
        kind: "indoor",
        reason: `indoor activity placed on the ${days[bestDay].rain}% rain day, freeing a dry day for outdoor plans`,
      });
    }
    assignment[bestDay].push({ ...act, moved: bestDay !== act.originalDay });
    slots[bestDay]--;
  }

  return { assignment, changes };
}

function naiveItinerary(activities, days, slotsPerDay) {
  const slots = days.map(() => slotsPerDay);
  const assignment = days.map(() => []);
  activities.forEach((a) => {
    const day = a.originalDay ?? 0;
    if (slots[day] > 0) {
      assignment[day].push(a);
      slots[day]--;
    }
  });
  return assignment;
}

/* ─────────── Sub-components ─────────── */
function WeatherDay({ day, isToday }) {
  const wx = decodeWeatherCode(day.code);
  const rainy = day.rain >= 50;
  const dry = day.rain < 20;
  return (
    <div className={`wai-weather-day ${rainy ? "rainy" : dry ? "dry" : ""}`}>
      {isToday && <span className="wai-weather-day-badge">TODAY</span>}
      {!isToday && rainy && <span className="wai-weather-day-badge">WET</span>}
      {!isToday && dry && <span className="wai-weather-day-badge">DRY</span>}
      <div className="wai-weather-day-label">{weekdayShort(day.date)}</div>
      <div className="wai-weather-day-date">{monthDay(day.date)}</div>
      <div className="wai-weather-day-icon">
        <WeatherIcon type={wx.type} size={48} />
      </div>
      <div className="wai-weather-day-temp">
        {day.max}°<span>/{day.min}°</span>
      </div>
      <div className={`wai-weather-day-rain ${rainy ? "warn" : ""}`}>
        ☔ {day.rain}%
      </div>
    </div>
  );
}

function ActivityCard({ activity }) {
  const tag = activity.type === "outdoor" ? "wai-tag-outdoor" : "wai-tag-indoor";
  return (
    <div className={`wai-activity-card ${activity.type} ${activity.moved ? "moved" : ""}`}>
      <div className="wai-activity-emoji">{activity.emoji}</div>
      <div className="wai-activity-body">
        <div className="wai-activity-name">{activity.name}</div>
        <div className="wai-activity-meta">
          <span className={`wai-tag ${tag}`}>
            {activity.type === "outdoor" ? "OUTDOOR" : "INDOOR"}
          </span>
          <span className="wai-tag wai-tag-priority">{activity.hours}h</span>
        </div>
      </div>
    </div>
  );
}

function DayColumn({ day, index, activities, isToday }) {
  const wx = decodeWeatherCode(day.code);
  const rainy = day.rain >= 50;
  return (
    <div className={`wai-day-col ${rainy ? "rainy" : ""} ${isToday ? "today" : ""}`}>
      <div className="wai-day-col-head">
        <div className="wai-day-col-head-left">
          <div className="wai-day-col-name">
            Day {index + 1} · {weekdayShort(day.date)}
          </div>
          <div className="wai-day-col-date">{monthDay(day.date)}</div>
        </div>
        <div className="wai-day-col-wx">
          <WeatherIcon type={wx.type} size={26} />
          <span className="wai-pct">{day.rain}%</span>
        </div>
      </div>
      <div className="wai-activity-list">
        {activities.length === 0 ? (
          <div className="wai-day-col-empty">Free day — nothing scheduled</div>
        ) : (
          activities.map((a) => <ActivityCard key={a.id} activity={a} />)
        )}
      </div>
    </div>
  );
}

/* ─────────── Main page ─────────── */
const WeatherAwareItinerary = () => {
  const { id } = useParams();
  const isRealTrip = Boolean(id);

  const [destinationKey, setDestinationKey] = useState("kyoto");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return isoDate(d);
  });

  const [trip, setTrip] = useState(null);
  const [tripLoading, setTripLoading] = useState(isRealTrip);
  const [tripError, setTripError] = useState("");

  const [mode, setMode] = useState("optimized");
  const [state, setState] = useState({ status: "idle" });

  useEffect(() => {
    if (!isRealTrip) return;
    let cancelled = false;
    (async () => {
      setTripLoading(true);
      setTripError("");
      try {
        const res = await api.get(`/trips/${id}`);
        if (cancelled) return;
        setTrip(res.data);
      } catch (err) {
        if (!cancelled)
          setTripError(err.response?.data?.message || "Failed to load trip");
      } finally {
        if (!cancelled) setTripLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isRealTrip]);

  const destination = useMemo(() => {
    if (isRealTrip) {
      if (!trip) return null;
      const activities = classifyTripActivities(trip.itinerary || []);
      return {
        name: trip.destination,
        icon: "🌤️",
        activities,
        startDate: isoDate(new Date(trip.startDate)),
        endDate: isoDate(new Date(trip.endDate)),
      };
    }
    const d = DESTINATIONS[destinationKey];
    return {
      name: d.name,
      icon: d.icon,
      lat: d.lat,
      lon: d.lon,
      activities: d.activities,
      startDate,
      endDate: addDaysISO(startDate, 6),
    };
  }, [isRealTrip, trip, destinationKey, startDate]);

  useEffect(() => {
    if (!destination) return;
    let cancelled = false;

    (async () => {
      setState({ status: "loading" });
      try {
        let lat = destination.lat;
        let lon = destination.lon;

        if (isRealTrip && (!lat || !lon)) {
          const wRes = await api.get(`/trips/${id}/weather`);
          lat = wRes.data?.location?.lat;
          lon = wRes.data?.location?.lng;
        }

        const sISO = destination.startDate;
        const eISO = destination.endDate;
        const dayCount = Math.max(
          1,
          Math.round((new Date(eISO) - new Date(sISO)) / 86400000) + 1
        );
        const capped = Math.min(dayCount, 14);

        if (!lat || !lon) throw new Error("No location for this trip");

        const days = await fetchForecast(lat, lon, sISO, capped);
        if (cancelled) return;
        setState({ status: "ready", days, mode: "live" });
      } catch (err) {
        if (cancelled) return;
        const dayCount = Math.max(
          1,
          Math.round(
            (new Date(destination.endDate) - new Date(destination.startDate)) /
              86400000
          ) + 1
        );
        const capped = Math.min(dayCount, 14);
        const days = simulateForecast(
          destination.name,
          destination.startDate,
          capped
        );
        setState({ status: "ready", days, mode: "simulated" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [destination, isRealTrip, id]);

  const itinerary = useMemo(() => {
    if (state.status !== "ready" || !destination) return null;
    const acts = destination.activities;
    const slotsPerDay = Math.max(
      2,
      Math.ceil(acts.length / state.days.length) + 1
    );

    if (mode === "naive") {
      return {
        assignment: naiveItinerary(acts, state.days, slotsPerDay),
        changes: [],
      };
    }
    return optimizeItinerary(acts, state.days, slotsPerDay);
  }, [state, mode, destination]);

  const stats = useMemo(() => {
    if (state.status !== "ready" || !itinerary || !destination) return null;
    const days = state.days;
    const acts = destination.activities;
    const slotsPerDay = Math.max(2, Math.ceil(acts.length / days.length) + 1);

    const scoreAssignment = (assignment) => {
      let penalty = 0;
      let outdoorPlaced = 0;
      assignment.forEach((actsArr, d) => {
        actsArr.forEach((a) => {
          if (a.type === "outdoor") {
            penalty += days[d].rain * (a.sensitivity / 5);
            outdoorPlaced++;
          }
        });
      });
      return { penalty: Math.round(penalty), outdoorPlaced };
    };

    const optimized = scoreAssignment(itinerary.assignment);
    const naive = scoreAssignment(naiveItinerary(acts, days, slotsPerDay));

    const maxPenalty = naive.penalty || 1;
    const improvement = Math.max(
      0,
      Math.min(1, 1 - optimized.penalty / maxPenalty)
    );

    return {
      naivePenalty: naive.penalty,
      optPenalty: optimized.penalty,
      improvement,
      movedCount: itinerary.changes.length,
      rainyDays: days.filter((d) => d.rain >= 50).length,
      dryDays: days.filter((d) => d.rain < 20).length,
    };
  }, [state, itinerary, destination]);

  const avgRain =
    state.status === "ready"
      ? Math.round(state.days.reduce((s, d) => s + d.rain, 0) / state.days.length)
      : 0;

  const today = todayISO();

  if (isRealTrip && tripLoading) {
    return (
      <div className="wai-root">
        <div className="wai-orb-1" />
        <div className="wai-orb-2" />
        <main className="wai-page">
          <div className="wai-skeleton" style={{ height: 220, marginBottom: 28 }} />
          <div className="wai-weather-strip">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="wai-skeleton" style={{ minHeight: 180 }} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (isRealTrip && tripError) {
    return (
      <div className="wai-root">
        <div className="wai-orb-1" />
        <div className="wai-orb-2" />
        <main className="wai-page">
          <Link
            to={`/trips/${id}`}
            style={{
              color: "#888",
              marginBottom: 20,
              display: "inline-block",
              textDecoration: "none",
            }}
          >
            ← Back to trip
          </Link>
          <div className="wai-panel">
            <div className="wai-panel-label">Error</div>
            <div className="wai-stat-value">{tripError}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="wai-root">
      <div className="wai-orb-1" />
      <div className="wai-orb-2" />

      <main className="wai-page">
        {isRealTrip && (
          <Link
            to={`/trips/${id}`}
            style={{
              color: "#888",
              marginBottom: 24,
              display: "inline-block",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            ← Back to trip
          </Link>
        )}

        <header className="wai-header">
          <div className="wai-tag">
            <span className="wai-pulse" />
            {isRealTrip ? "Your trip · Smart Weather" : "⭐⭐⭐⭐⭐ · Smart Weather"}
          </div>
          <h1 className="wai-title">
            Smart Weather <span>Plan</span>
          </h1>
          <p className="wai-subtitle">
            {isRealTrip
              ? `Live weather for ${destination?.name || "your trip"}. We move outdoor plans to sunny days and keep indoor plans for rainy days.`
              : "See how we move outdoor activities to sunny days and put indoor activities on rainy days."}
          </p>
        </header>

        {!isRealTrip && destination && (
          <div className="wai-control-panel">
            <div className="wai-field-grid">
              <div className="wai-field">
                <label className="wai-field-label">Destination</label>
                <div className="wai-field-input">
                  <span className="wai-field-icon">📍</span>
                  <select
                    value={destinationKey}
                    onChange={(e) => setDestinationKey(e.target.value)}
                  >
                    {Object.entries(DESTINATIONS).map(([key, d]) => (
                      <option key={key} value={key}>
                        {d.icon} {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="wai-field">
                <label className="wai-field-label">Trip start</label>
                <div className="wai-field-input">
                  <span className="wai-field-icon">📅</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="wai-field">
                <label className="wai-field-label">Trip length</label>
                <div className="wai-field-input">
                  <span className="wai-field-icon">⏱️</span>
                  <input type="text" value="7 days" readOnly />
                </div>
              </div>
              <button
                className="wai-btn-primary"
                onClick={() => setMode("optimized")}
                disabled={state.status !== "ready"}
              >
                <span>✨</span>
                Re-optimize
              </button>
            </div>
          </div>
        )}

        {isRealTrip && destination && (
          <div className="wai-control-panel">
            <div
              className="wai-field-grid"
              style={{ gridTemplateColumns: "2fr 1fr 1fr" }}
            >
              <div className="wai-field">
                <label className="wai-field-label">Destination</label>
                <div className="wai-field-input">
                  <span className="wai-field-icon">📍</span>
                  <input type="text" value={destination.name} readOnly />
                </div>
              </div>
              <div className="wai-field">
                <label className="wai-field-label">Start</label>
                <div className="wai-field-input">
                  <span className="wai-field-icon">📅</span>
                  <input
                    type="text"
                    value={monthDay(destination.startDate)}
                    readOnly
                  />
                </div>
              </div>
              <div className="wai-field">
                <label className="wai-field-label">End</label>
                <div className="wai-field-input">
                  <span className="wai-field-icon">🏁</span>
                  <input
                    type="text"
                    value={monthDay(destination.endDate)}
                    readOnly
                  />
                </div>
              </div>
            </div>
            <div className="wai-mode-toggle">
              <span className="wai-mode-toggle-label">Plan mode</span>
              <button
                className={`wai-mode-btn ${mode === "optimized" ? "active" : ""}`}
                onClick={() => setMode("optimized")}
              >
                ✨ Smart Weather
              </button>
              <button
                className={`wai-mode-btn ${mode === "naive" ? "active" : ""}`}
                onClick={() => setMode("naive")}
              >
                🗓️ Original order
              </button>
            </div>
          </div>
        )}

        {state.status === "ready" && (
          <div
            className={`wai-status-banner ${
              state.mode === "simulated" ? "baseline" : ""
            }`}
          >
            <span className="wai-dot" />
            <span>
              {state.mode === "live" ? (
                <>
                  Live weather loaded for <strong>{destination?.name}</strong> ·{" "}
                  {state.days.length} days · avg rain {avgRain}%
                </>
              ) : (
                <>
                  Live data unavailable — showing estimate for{" "}
                  <strong>{destination?.name}</strong>
                </>
              )}
            </span>
          </div>
        )}
        {state.status === "loading" && (
          <div className="wai-status-banner">
            <span className="wai-dot" />
            <span>Checking weather and adjusting your plan…</span>
          </div>
        )}

        {state.status === "ready" && (
          <>
            <div className="wai-section-head">
              <h2 className="wai-section-title">
                Trip <span>Weather</span>
              </h2>
              <span className="wai-section-hint">
                {stats?.dryDays} sunny · {stats?.rainyDays} rainy
              </span>
            </div>
            <div className="wai-weather-strip">
              {state.days.map((day) => (
                <WeatherDay
                  key={day.date}
                  day={day}
                  isToday={day.date === today}
                />
              ))}
            </div>
          </>
        )}

        {state.status === "loading" && (
          <div className="wai-weather-strip">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="wai-skeleton"
                style={{ minHeight: 180 }}
              />
            ))}
          </div>
        )}

        {state.status === "ready" && itinerary && stats && destination && (
          <>
            <div className="wai-section-head">
              <h2 className="wai-section-title">
                {mode === "optimized" ? (
                  <>
                    Smart Weather <span>Plan</span>
                  </>
                ) : (
                  <>
                    Original <span>Plan</span>
                  </>
                )}
              </h2>
              <span className="wai-section-hint">
                {mode === "optimized"
                  ? `${stats.movedCount} activit${
                      stats.movedCount === 1 ? "y" : "ies"
                    } moved`
                  : "Original order"}
              </span>
            </div>

            <div className="wai-itinerary-grid">
              {state.days.map((day, i) => (
                <DayColumn
                  key={day.date}
                  day={day}
                  index={i}
                  activities={itinerary.assignment[i]}
                  isToday={day.date === today}
                />
              ))}
            </div>

            <div className="wai-legend">
              <div className="wai-legend-item">
                <span className="wai-legend-dot outdoor" />
                Outdoor activity — placed on sunny days
              </div>
              <div className="wai-legend-item">
                <span className="wai-legend-dot indoor" />
                Indoor activity — placed on rainy days
              </div>
              <div className="wai-legend-item">
                <span className="wai-legend-dot rainy" />
                Rainy day (50% or more rain)
              </div>
            </div>

            <div className="wai-ai-panel">
              <div className="wai-panel">
                <div className="wai-panel-label">
                  <span className="wai-badge">AI</span> What We Changed
                </div>
                <div className="wai-stat-row">
                  <div className="wai-stat">
                    <div className="wai-stat-label">Rain Risk</div>
                    <div
                      className={`wai-stat-value ${
                        stats.optPenalty < stats.naivePenalty ? "good" : ""
                      }`}
                    >
                      {stats.optPenalty}
                      <span>vs {stats.naivePenalty}</span>
                    </div>
                    <div className="wai-stat-sub">
                      Lower is better — how much rain risk we removed
                    </div>
                  </div>
                  <div className="wai-stat">
                    <div className="wai-stat-label">Activities Moved</div>
                    <div className="wai-stat-value good">
                      {stats.movedCount}
                      <span>/ {destination.activities.length}</span>
                    </div>
                    <div className="wai-stat-sub">
                      {stats.movedCount === 0
                        ? "Already good — no changes needed"
                        : "Moved to better days"}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div className="wai-panel-label" style={{ marginBottom: 6 }}>
                    Improvement
                  </div>
                  <div className="wai-score-bar">
                    <div
                      className="wai-score-fill"
                      style={{
                        width: `${Math.round(stats.improvement * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="wai-stat-sub" style={{ marginTop: 8 }}>
                    {Math.round(stats.improvement * 100)}% less rain on outdoor
                    activities
                    {stats.improvement > 0.5 && " — much better than before"}
                  </div>
                </div>
              </div>

              <div className="wai-panel">
                <div className="wai-panel-label">
                  <span className="wai-badge">LIST</span> Activity Changes
                </div>
                {itinerary.changes.length === 0 ? (
                  <div className="wai-change-empty">
                    {mode === "optimized"
                      ? "🎉 Nothing to change — outdoor plans already land on sunny days."
                      : "Tap Smart Weather to see the changes."}
                  </div>
                ) : (
                  <div className="wai-changes-list">
                    {itinerary.changes.map((c, idx) => (
                      <div className="wai-change-row" key={c.id + idx}>
                        <span className="wai-change-arrow">→</span>
                        <div>
                          <div className="wai-change-text">
                            <strong>{c.activity}</strong> moved from{" "}
                            <strong>Day {c.from + 1}</strong> to{" "}
                            <strong>Day {c.to + 1}</strong>
                          </div>
                          <div className="wai-change-reason">{c.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <footer className="wai-footer">
          <span>Live weather data · Smart scheduling</span>
          <span>AI Travel Planner © Smart Weather Plan</span>
        </footer>
      </main>
    </div>
  );
};

export default WeatherAwareItinerary;