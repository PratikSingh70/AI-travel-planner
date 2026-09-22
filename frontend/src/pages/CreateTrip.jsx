import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./CreateTrip.css";

const shortenAddress = (displayName) => {
  if (!displayName) return "";
  const parts = displayName
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 3) return parts.join(", ");

  const first = parts[0];
  const country = parts[parts.length - 1];
  const region = parts[parts.length - 2];
  const cleanRegion = /^\d+$/.test(region) ? parts[parts.length - 3] : region;
  return [first, cleanRegion, country].filter(Boolean).join(", ");
};

const BUDGET_OPTIONS = [
  { id: "cheap", icon: "💵", label: "Cheap", desc: "Stay conscious of costs", budget: 15000 },
  { id: "moderate", icon: "💰", label: "Moderate", desc: "Keep cost on the average side", budget: 30000 },
  { id: "luxury", icon: "💎", label: "Luxury", desc: "Don't worry about cost", budget: 80000 },
];

const TRAVELER_OPTIONS = [
  { id: "solo", icon: "✈️", label: "Just Me", desc: "A sole traveler in exploration", count: 1 },
  { id: "couple", icon: "🥂", label: "A Couple", desc: "Two travelers in tandem", count: 2 },
  { id: "family", icon: "🏠", label: "Family", desc: "A group of fun-loving adventurers", count: 4 },
  { id: "friends", icon: "⛵", label: "Friends", desc: "A bunch of thrill-seekers", count: 5 },
];

const CreateTrip = () => {
  const navigate = useNavigate();
  const [destination, setDestination] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [days, setDays] = useState("");
  const [budget, setBudget] = useState("");
  const [travelerType, setTravelerType] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestionsRef = useRef(null);
  const daysRef = useRef(null);
  const budgetRef = useRef(null);
  const travelersRef = useRef(null);
  const submitRef = useRef(null);

  // Fetch destination suggestions
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

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Helper: scroll + focus
  const focusNext = (ref) => {
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => el.focus?.(), 250);
  };

  // ── Enter in destination → pick first suggestion, then go to days ──
  const handleDestinationKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    if (suggestions.length > 0) {
      setDestination(shortenAddress(suggestions[0].name));
      setSuggestions([]);
      setShowSuggestions(false);
    } else {
      setShowSuggestions(false);
    }

    // Move focus to days
    focusNext(daysRef);
  };

  // ── Enter in days → go to budget ──
  const handleDaysKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    focusNext(budgetRef);
  };

  // ── Enter on budget option → pick + go to travelers ──
  const handleBudgetKeyDown = (e, id) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setBudget(id);
      focusNext(travelersRef);
    }
  };

  // ── Enter on traveler option → pick + go to submit ──
  const handleTravelerKeyDown = (e, id) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setTravelerType(id);
      focusNext(submitRef);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!destination || !days || !budget || !travelerType) {
      return setError("Please fill all fields");
    }
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + Number(days));
    const selectedBudget = BUDGET_OPTIONS.find((b) => b.id === budget);
    const selectedTraveler = TRAVELER_OPTIONS.find((t) => t.id === travelerType);

    try {
      setLoading(true);
      const res = await api.post("/trips", {
        destination: shortenAddress(destination) || destination,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        budget: selectedBudget.budget,
        travellers: selectedTraveler.count,
        interests: [],
      });
      navigate(`/trips/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create trip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ct-root">
      <div className="ct-orb-1" />
      <div className="ct-orb-2" />

      {loading && (
        <div className="ct-toast">
          <span className="ct-toast-dots">
            <span className="ct-toast-dot" />
            <span className="ct-toast-dot" />
            <span className="ct-toast-dot" />
          </span>
          <span className="ct-toast-text">
            Please wait... We are working on it...
          </span>
        </div>
      )}

      <div className="ct-page">
        <div className="ct-tag">
          <span className="ct-pulse" />
          AI Trip Planner
        </div>

        <h1 className="ct-title">
          Tell us your travel <span>preferences</span> 🏝️
        </h1>
        <p className="ct-subtitle">
          Just provide some basic information, and our trip planner will
          generate a customized itinerary based on your preferences.
        </p>

        {error && <p className="ct-error">{error}</p>}

        <form onSubmit={handleSubmit} className="ct-form">
          {/* DESTINATION */}
          <div ref={suggestionsRef} className="ct-field" style={{ zIndex: 30 }}>
            <label className="ct-label">
              What is destination of choice?
            </label>
            <input
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleDestinationKeyDown}
              placeholder="Search a city — try Paris, Tokyo, Bali…"
              className="ct-input"
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="ct-suggestions">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDestination(shortenAddress(s.name));
                      setSuggestions([]);
                      setShowSuggestions(false);
                      focusNext(daysRef);
                    }}
                    className="ct-suggestion"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DAYS */}
          <div className="ct-field" style={{ zIndex: 10 }}>
            <label className="ct-label">
              How many days are you planning your trip?
            </label>
            <input
              ref={daysRef}
              type="number"
              min="1"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              onKeyDown={handleDaysKeyDown}
              placeholder="Ex. 3"
              className="ct-input"
            />
          </div>

          {/* BUDGET */}
          <div className="ct-field" style={{ zIndex: 10 }} ref={budgetRef} tabIndex={-1}>
            <label className="ct-label">What is Your Budget?</label>
            <div className="ct-options-grid">
              {BUDGET_OPTIONS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setBudget(b.id);
                    focusNext(travelersRef);
                  }}
                  onKeyDown={(e) => handleBudgetKeyDown(e, b.id)}
                  className={`ct-option ${budget === b.id ? "ct-selected" : ""}`}
                >
                  <div className="ct-option-icon">{b.icon}</div>
                  <div className="ct-option-title">{b.label}</div>
                  <div className="ct-option-desc">{b.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* TRAVELERS */}
          <div className="ct-field" style={{ zIndex: 10 }} ref={travelersRef} tabIndex={-1}>
            <label className="ct-label">
              Who do you plan on traveling with on your next adventure?
            </label>
            <div className="ct-options-grid">
              {TRAVELER_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTravelerType(t.id);
                    focusNext(submitRef);
                  }}
                  onKeyDown={(e) => handleTravelerKeyDown(e, t.id)}
                  className={`ct-option ${travelerType === t.id ? "ct-selected" : ""}`}
                >
                  <div className="ct-option-icon">{t.icon}</div>
                  <div className="ct-option-title">{t.label}</div>
                  <div className="ct-option-desc">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* SUBMIT */}
          <div className="ct-actions" style={{ zIndex: 5 }}>
            <button
              ref={submitRef}
              type="submit"
              disabled={loading}
              className="ct-submit"
            >
              {loading ? "Generating..." : "Generate Trip"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTrip;