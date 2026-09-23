import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import WeatherIcon, { decodeWeatherCode } from "../components/WeatherIcon";
import "./WeatherTrips.css";

function pickEmoji(destination) {
  const t = (destination || "").toLowerCase();
  if (t.includes("bali") || t.includes("beach")) return "🏝️";
  if (t.includes("tokyo") || t.includes("japan")) return "🗼";
  if (t.includes("kyoto")) return "⛩️";
  if (t.includes("new york") || t.includes("nyc")) return "🗽";
  if (t.includes("paris") || t.includes("france")) return "🥐";
  if (t.includes("rome") || t.includes("italy")) return "🏛️";
  if (t.includes("iceland") || t.includes("reyk")) return "🌋";
  if (t.includes("marrakech") || t.includes("morocco")) return "🕌";
  if (t.includes("dubai")) return "🌇";
  if (t.includes("london")) return "🎡";
  if (t.includes("india") || t.includes("goa") || t.includes("delhi")) return "🛕";
  return "✈️";
}

function daysBetween(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
}

const WeatherTrips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/trips");
        if (!cancelled) setTrips(res.data || []);
      } catch {
        if (!cancelled) setTrips([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="wt-root">
      <div className="wt-orb-1" />
      <div className="wt-orb-2" />

      <main className="wt-page">
        <header className="wt-header">
          <div className="wt-tag">
            <span className="wt-pulse" />
            Smart Weather Plan
          </div>
          <h1 className="wt-title">
            Weather for your <span>trips</span>
          </h1>
          <p className="wt-subtitle">
            Pick a trip to see its live weather and how outdoor plans can be
            moved to sunny days.
          </p>
        </header>

        {loading && (
          <div className="wt-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="wt-skeleton" />
            ))}
          </div>
        )}

        {!loading && trips.length === 0 && (
          <div className="wt-empty">
            <div className="wt-empty-icon">🌤️</div>
            <div className="wt-empty-title">No trips yet</div>
            <p className="wt-empty-text">
              Create a trip first, then come back here to see its weather plan.
            </p>
            <Link to="/trips/new" className="wt-btn-primary">
              ✨ Create a trip
            </Link>
          </div>
        )}

        {!loading && trips.length > 0 && (
          <div className="wt-grid">
            {trips.map((trip) => {
              const days = daysBetween(trip.startDate, trip.endDate);
              return (
                <Link
                  key={trip._id}
                  to={`/trips/${trip._id}/weather-itinerary`}
                  className="wt-card"
                >
                  <div className="wt-card-thumb">
                    {trip.image ? (
                      <img
                        src={trip.image}
                        alt={trip.destination}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      pickEmoji(trip.destination)
                    )}
                  </div>
                  <div className="wt-card-name">{trip.destination}</div>
                  <div className="wt-card-meta">
                    {days} day{days === 1 ? "" : "s"}
                  </div>
                  <div className="wt-card-cta">
                    View weather plan →
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <footer className="wt-footer">
          <span>Live data from Open-Meteo</span>
          <span>AI Travel Planner © Weather</span>
        </footer>
      </main>
    </div>
  );
};

export default WeatherTrips;