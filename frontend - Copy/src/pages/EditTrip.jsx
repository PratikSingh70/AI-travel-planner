import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../api/axios";
import "./EditTrip.css";

const shortenAddress = (displayName) => {
  if (!displayName) return "";
  const parts = displayName.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 3) return parts.join(", ");
  const first = parts[0];
  const country = parts[parts.length - 1];
  const region = parts[parts.length - 2];
  const cleanRegion = /^\d+$/.test(region) ? parts[parts.length - 3] : region;
  return [first, cleanRegion, country].filter(Boolean).join(", ");
};

const EditTrip = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [travellers, setTravellers] = useState(1);
  const [spotsCount, setSpotsCount] = useState(5);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    const loadTrip = async () => {
      try {
        const res = await api.get(`/trips/${id}`);
        const t = res.data;
        setDestination(t.destination || "");
        setStartDate(t.startDate ? t.startDate.split("T")[0] : "");
        setEndDate(t.endDate ? t.endDate.split("T")[0] : "");
        setBudget(t.budget ? String(t.budget) : "");
        setTravellers(t.travellers || 1);
        setSpotsCount(t.spotsCount || 5);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load trip");
      } finally {
        setLoading(false);
      }
    };
    loadTrip();
  }, [id]);

  useEffect(() => {
    if (destination.length < 3) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
            destination
          )}`,
          { headers: { "User-Agent": "AI-Travel-Planner/1.0" } }
        );
        const data = await res.json();
        setSuggestions(data.map((d) => ({ name: d.display_name })));
      } catch {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [destination]);

  useEffect(() => {
    const handler = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!destination || !startDate || !endDate || !budget || !travellers) {
      return setError("Please fill all fields");
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return setError("End date must be after start date");
    }
    if (spotsCount < 1 || spotsCount > 50) {
      return setError("Places count must be between 1 and 50");
    }

    try {
      setSaving(true);
      await api.put(`/trips/${id}`, {
        destination: shortenAddress(destination) || destination,
        startDate,
        endDate,
        budget: Number(budget),
        travellers: Number(travellers),
        spotsCount: Number(spotsCount),
      });
      navigate(`/trips/${id}?autoGen=1`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not update trip");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="et-loading">
        <div className="et-spinner" />
      </div>
    );
  }

  return (
    <div className="et-root">
      <div className="et-orb-1" />
      <div className="et-orb-2" />

      <div className="et-page">
        <Link to={`/trips/${id}`} className="et-back">
          ← Back to trip
        </Link>

        <h1 className="et-title">
          Edit your <span>trip</span> 
        </h1>
        <p className="et-subtitle">
          Update the details of your trip. Saving will regenerate the AI
          itinerary with your new preferences.
        </p>

        {error && <p className="et-error">{error}</p>}

        <form onSubmit={handleSubmit} className="et-form">
          {/* Destination */}
          <div ref={suggestionsRef} className="et-field" style={{ zIndex: 30 }}>
            <label className="et-label">Destination</label>
            <input
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search a city..."
              className="et-input"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="et-suggestions">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDestination(shortenAddress(s.name));
                      setShowSuggestions(false);
                    }}
                    className="et-suggestion"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="et-field" style={{ zIndex: 10 }}>
            <label className="et-label">Trip dates</label>
            <div className="et-row">
              <div>
                <span className="et-sublabel">Start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="et-input"
                />
              </div>
              <div>
                <span className="et-sublabel">End date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="et-input"
                />
              </div>
            </div>
          </div>

          {/* Places count */}
          <div className="et-field" style={{ zIndex: 10 }}>
            <label className="et-label">
              How many places do you want to visit?
            </label>
            <p className="et-hint">
              Total distinct spots within your destination. For example, 5 cities
              across Rajasthan, or 8 must-see spots in Tokyo.
            </p>

            <div className="et-chips">
              {[3, 5, 7, 10, 15].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSpotsCount(n)}
                  className={`et-chip ${spotsCount === n ? "active" : ""}`}
                >
                  {n} places
                </button>
              ))}
            </div>

            <div className="et-spots-row">
              <input
                type="number"
                min="1"
                max="50"
                value={spotsCount}
                onChange={(e) => setSpotsCount(Number(e.target.value) || 1)}
                className="et-input et-spots-input"
              />
              <span className="et-spots-hint">places (custom — 1 to 50)</span>
            </div>
          </div>

          {/* Budget + travellers */}
          <div className="et-field" style={{ zIndex: 10 }}>
            <div className="et-row">
              <div>
                <label className="et-label">Budget (INR)</label>
                <input
                  type="number"
                  min="0"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="25000"
                  className="et-input"
                />
              </div>
              <div>
                <label className="et-label">Travellers</label>
                <input
                  type="number"
                  min="1"
                  value={travellers}
                  onChange={(e) => setTravellers(e.target.value)}
                  className="et-input"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="et-actions">
            <Link to={`/trips/${id}`} className="et-btn et-btn-ghost">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="et-btn et-btn-primary"
            >
              {saving ? "Saving..." : "Save & Regenerate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTrip;