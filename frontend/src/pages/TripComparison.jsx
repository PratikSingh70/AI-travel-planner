import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/Skeleton";
import "./TripComparison.css";

function daysBetween(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
}

function getStats(trip) {
  if (!trip) return null;
  const days = daysBetween(trip.startDate, trip.endDate);
  const activities = (trip.itinerary || []).reduce(
    (sum, day) => sum + (day.activities?.length || 0),
    0
  );
  const hotels = (trip.hotels || []).length;
  const travellers = trip.travellers || 1;
  const costPerDay = Math.round((trip.budget || 0) / days);
  const costPerPerson = Math.round((trip.budget || 0) / travellers);
  const costPerActivity =
    activities > 0 ? Math.round((trip.budget || 0) / activities) : 0;
  return {
    days,
    activities,
    hotels,
    travellers,
    costPerDay,
    costPerPerson,
    costPerActivity,
  };
}

const TripComparison = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tripAId, setTripAId] = useState("");
  const [tripBId, setTripBId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/trips");
        if (cancelled) return;
        const list = res.data || [];
        setTrips(list);
        if (list.length >= 1) setTripAId(list[0]._id);
        if (list.length >= 2) setTripBId(list[1]._id);
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

  const tripA = useMemo(
    () => trips.find((t) => t._id === tripAId) || null,
    [trips, tripAId]
  );
  const tripB = useMemo(
    () => trips.find((t) => t._id === tripBId) || null,
    [trips, tripBId]
  );

  const statsA = useMemo(() => getStats(tripA), [tripA]);
  const statsB = useMemo(() => getStats(tripB), [tripB]);

  const swap = () => {
    setTripAId(tripBId);
    setTripBId(tripAId);
  };

  if (loading) {
    return (
      <div className="cmp-root">
        <div className="cmp-orb-1" />
        <div className="cmp-orb-2" />
        <main className="cmp-page">
          <Skeleton variant="rectangular" width="100%" height={200} rounded="24px" />
          <div style={{ marginTop: 24 }}>
            <Skeleton variant="rectangular" width="100%" height={400} rounded="20px" />
          </div>
        </main>
      </div>
    );
  }

  if (trips.length < 2) {
    return (
      <div className="cmp-root">
        <div className="cmp-orb-1" />
        <div className="cmp-orb-2" />
        <main className="cmp-page">
          <div className="cmp-empty">
            <div className="cmp-empty-icon">⚖️</div>
            <div className="cmp-empty-title">Not enough trips to compare</div>
            <p className="cmp-empty-text">
              You need at least <strong>2 trips</strong> to use comparison.
              Create another trip to get started.
            </p>
            <Link to="/trips/new" className="cmp-btn-primary">
              ✨ Create a trip
            </Link>
          </div>
        </main>
      </div>
    );
  }

  /* ─── Row helper — key is unique per row ─── */
  const compareRow = (label, key, better = "lower", format = (v) => v) => {
    const a = statsA?.[key];
    const b = statsB?.[key];
    let aWins = false;
    let bWins = false;
    if (a != null && b != null && a !== b && better !== "neutral") {
      if (better === "lower") {
        aWins = a < b;
        bWins = b < a;
      } else {
        aWins = a > b;
        bWins = b > a;
      }
    }
    return (
      <div className="cmp-row" key={`row-${key}-${label}`}>
        <div className="cmp-row-label">{label}</div>
        <div className={`cmp-row-val ${aWins ? "win" : ""}`}>
          {a != null ? format(a) : "—"}
        </div>
        <div className={`cmp-row-val ${bWins ? "win" : ""}`}>
          {b != null ? format(b) : "—"}
        </div>
      </div>
    );
  };

  return (
    <div className="cmp-root">
      <div className="cmp-orb-1" />
      <div className="cmp-orb-2" />

      <main className="cmp-page">
        <header className="cmp-header">
          <div className="cmp-tag">
            <span className="cmp-pulse" />
            Side-by-side
          </div>
          <h1 className="cmp-title">
            Compare your <span>trips</span>
          </h1>
          <p className="cmp-subtitle">
            Pick two trips and see how they stack up on budget, days, cost per
            person, and activity count. Winning stats are highlighted in lime.
          </p>
        </header>

        {/* Selection bar */}
        <div className="cmp-select">
          <div className="cmp-select-col">
            <label className="cmp-select-label">Trip A</label>
            <select
              value={tripAId}
              onChange={(e) => setTripAId(e.target.value)}
              className="cmp-select-input"
            >
              {trips.map((t) => (
                <option key={`a-${t._id}`} value={t._id}>
                  {t.destination}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="cmp-swap"
            onClick={swap}
            aria-label="Swap trips"
          >
            ⇄
          </button>

          <div className="cmp-select-col">
            <label className="cmp-select-label">Trip B</label>
            <select
              value={tripBId}
              onChange={(e) => setTripBId(e.target.value)}
              className="cmp-select-input"
            >
              {trips.map((t) => (
                <option key={`b-${t._id}`} value={t._id}>
                  {t.destination}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Trip cards */}
        <div className="cmp-grid">
          <div className="cmp-card">
            <div className="cmp-card-thumb">
              {tripA.image ? (
                <img src={tripA.image} alt={tripA.destination} />
              ) : (
                <span className="cmp-card-emoji">🌍</span>
              )}
            </div>
            <h2 className="cmp-card-name">{tripA.destination}</h2>
            <Link to={`/trips/${tripA._id}`} className="cmp-card-link">
              View trip →
            </Link>
          </div>

          <div className="cmp-card">
            <div className="cmp-card-thumb">
              {tripB.image ? (
                <img src={tripB.image} alt={tripB.destination} />
              ) : (
                <span className="cmp-card-emoji">🌍</span>
              )}
            </div>
            <h2 className="cmp-card-name">{tripB.destination}</h2>
            <Link to={`/trips/${tripB._id}`} className="cmp-card-link">
              View trip →
            </Link>
          </div>
        </div>

        {/* Comparison table — 7 unique rows, no duplicates */}
        <div className="cmp-table">
          <div className="cmp-row cmp-row-head" key="row-head">
            <div className="cmp-row-label">Metric</div>
            <div className="cmp-row-val">{tripA.destination}</div>
            <div className="cmp-row-val">{tripB.destination}</div>
          </div>

          {compareRow("Duration", "days", "neutral", (v) => `${v} days`)}
          {compareRow(
            "Budget per Day",
            "costPerDay",
            "lower",
            (v) => `₹${v.toLocaleString("en-IN")}`
          )}
          {compareRow(
            "Cost per Person",
            "costPerPerson",
            "lower",
            (v) => `₹${v.toLocaleString("en-IN")}`
          )}
          {compareRow("Travellers", "travellers", "neutral", (v) => `${v}`)}
          {compareRow(
            "Activities Planned",
            "activities",
            "higher",
            (v) => `${v} activities`
          )}
          {compareRow(
            "Hotels Suggested",
            "hotels",
            "higher",
            (v) => `${v} hotels`
          )}
          {compareRow(
            "Cost per Activity",
            "costPerActivity",
            "lower",
            (v) => (v ? `₹${v.toLocaleString("en-IN")}` : "—")
          )}
        </div>

        <div className="cmp-summary">
          <p>
            <strong style={{ color: "#a3e635" }}>Green</strong> = winning value
            in that row. Neutral rows have no winner.
          </p>
        </div>
      </main>
    </div>
  );
};

export default TripComparison;