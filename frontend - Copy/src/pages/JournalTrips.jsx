import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import "./JournalTrips.css";

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

const JournalTrips = () => {
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
    <div className="jt-root">
      <div className="jt-orb-1" />
      <div className="jt-orb-2" />

      <main className="jt-page">
        <header className="jt-header">
          <div className="jt-tag">
            <span className="jt-pulse" />
            Field Journal
          </div>
          <h1 className="jt-title">
            Trip <span>journals</span>
          </h1>
          <p className="jt-subtitle">
            Pick a trip to read its day-by-day journal. Toggle between zigzag
            and stream views, filter by category.
          </p>
        </header>

        {loading && (
          <div className="jt-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="jt-skeleton" />
            ))}
          </div>
        )}

        {!loading && trips.length === 0 && (
          <div className="jt-empty">
            <div className="jt-empty-icon">📓</div>
            <div className="jt-empty-title">No trips yet</div>
            <p className="jt-empty-text">
              Create a trip first, then come back to read its journal.
            </p>
            <Link to="/trips/new" className="jt-btn-primary">
              ✨ Create a trip
            </Link>
          </div>
        )}

        {!loading && trips.length > 0 && (
          <div className="jt-grid">
            {trips.map((trip) => {
              const days = daysBetween(trip.startDate, trip.endDate);
              const hasItinerary =
                Array.isArray(trip.itinerary) && trip.itinerary.length > 0;
              return (
                <Link
                  key={trip._id}
                  to={`/trips/${trip._id}/journal`}
                  className="jt-card"
                >
                  <div className="jt-card-thumb">
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
                  <div className="jt-card-name">{trip.destination}</div>
                  <div className="jt-card-meta">
                    {days} day{days === 1 ? "" : "s"}
                    {!hasItinerary && (
                      <span className="jt-card-warn"> · no itinerary yet</span>
                    )}
                  </div>
                  <div className="jt-card-cta">Open journal →</div>
                </Link>
              );
            })}
          </div>
        )}

        <footer className="jt-footer">
          <span>Two views · One journey</span>
          <span>AI Travel Planner © Journal</span>
        </footer>
      </main>
    </div>
  );
};

export default JournalTrips;