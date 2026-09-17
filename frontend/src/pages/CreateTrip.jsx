import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

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

  useEffect(() => {
    if (destination.length < 3) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(destination)}`,
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
        destination,
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
    <div className="min-h-screen bg-white py-12 px-6">
      {/* Loading toast */}
      {loading && (
        <div className="fixed bottom-6 right-6 bg-white border border-gray-200 rounded-2xl shadow-lg px-5 py-4 flex items-center gap-3 z-[60] animate-fade-in-up">
          <span className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-lime dot-bounce" />
            <span className="w-2 h-2 rounded-full bg-lime dot-bounce" />
            <span className="w-2 h-2 rounded-full bg-lime dot-bounce" />
          </span>
          <span className="text-sm font-semibold text-ink">
            Please wait... We are working on it...
          </span>
        </div>
      )}

      <div className="max-w-3xl mx-auto relative">
        <h1 className="text-3xl md:text-4xl font-extrabold text-ink">
          Tell us your travel preferences 🏕️🌴
        </h1>
        <p className="text-gray-500 mt-3 mb-12 max-w-xl">
          Just provide some basic information, and our trip planner will
          generate a customized itinerary based on your preferences.
        </p>

        {error && (
          <p className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-6 text-sm">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* ─────────────────────────────────────────── */}
          {/* DESTINATION — highest z-index so dropdown shows on top */}
          {/* ─────────────────────────────────────────── */}
          <div
            ref={suggestionsRef}
            className="relative"
            style={{ zIndex: 30 }}
          >
            <label className="block text-xl font-bold text-ink mb-4">
              What is destination of choice?
            </label>
            <input
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Select..."
              className="w-full border border-gray-200 rounded-lg px-4 py-3.5 text-ink placeholder-gray-400 focus:outline-none focus:border-ink transition bg-white"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div
                className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl max-h-72 overflow-y-auto"
                style={{ zIndex: 50 }}
              >
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDestination(s.name);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-b-0 text-ink"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────── */}
          {/* DAYS */}
          {/* ─────────────────────────────────────────── */}
          <div className="relative" style={{ zIndex: 10 }}>
            <label className="block text-xl font-bold text-ink mb-4">
              How many days are you planning your trip?
            </label>
            <input
              type="number"
              min="1"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="Ex.3"
              className="w-full border border-gray-200 rounded-lg px-4 py-3.5 text-ink placeholder-gray-400 focus:outline-none focus:border-ink transition bg-white"
            />
          </div>

          {/* ─────────────────────────────────────────── */}
          {/* BUDGET */}
          {/* ─────────────────────────────────────────── */}
          <div className="relative" style={{ zIndex: 10 }}>
            <label className="block text-xl font-bold text-ink mb-4">
              What is Your Budget?
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {BUDGET_OPTIONS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBudget(b.id)}
                  className={`text-left p-5 rounded-xl border-2 transition ${
                    budget === b.id
                      ? "border-ink bg-gray-50"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <div className="text-3xl mb-3">{b.icon}</div>
                  <div className="font-bold text-ink text-lg">{b.label}</div>
                  <div className="text-sm text-gray-500 mt-1">{b.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ─────────────────────────────────────────── */}
          {/* TRAVELERS */}
          {/* ─────────────────────────────────────────── */}
          <div className="relative" style={{ zIndex: 10 }}>
            <label className="block text-xl font-bold text-ink mb-4">
              Who do you plan on traveling with on your next adventure?
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TRAVELER_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTravelerType(t.id)}
                  className={`text-left p-5 rounded-xl border-2 transition ${
                    travelerType === t.id
                      ? "border-ink bg-gray-50"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <div className="text-3xl mb-3">{t.icon}</div>
                  <div className="font-bold text-ink text-lg">{t.label}</div>
                  <div className="text-sm text-gray-500 mt-1">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ─────────────────────────────────────────── */}
          {/* SUBMIT */}
          {/* ─────────────────────────────────────────── */}
          <div className="relative flex justify-end pt-4" style={{ zIndex: 5 }}>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3.5 rounded-lg bg-ink text-white font-bold hover:bg-black disabled:opacity-60 btn-press transition"
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