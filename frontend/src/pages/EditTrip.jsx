import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../api/axios";

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

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);

  // Load existing trip
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
      } catch (err) {
        setError(err.response?.data?.message || "Could not load trip");
      } finally {
        setLoading(false);
      }
    };
    loadTrip();
  }, [id]);

  // Destination autocomplete
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!destination || !startDate || !endDate || !budget || !travellers) {
      return setError("Please fill all fields");
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return setError("End date must be after start date");
    }

    try {
      setSaving(true);
      await api.put(`/trips/${id}`, {
        destination: shortenAddress(destination) || destination,
        startDate,
        endDate,
        budget: Number(budget),
        travellers: Number(travellers),
      });
      // ─── NEW: navigate with autoGen flag so TripDetail regenerates AI ───
      navigate(`/trips/${id}?autoGen=1`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not update trip");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full border border-gray-200 rounded-lg px-4 py-3.5 text-ink placeholder-gray-400 bg-white focus:outline-none focus:border-forest transition";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12 px-6">
      <div className="max-w-3xl mx-auto relative">
        <Link
          to={`/trips/${id}`}
          className="text-sm text-gray-500 hover:text-ink transition"
        >
          ← Back to trip
        </Link>

        <h1 className="mt-6 text-3xl md:text-4xl font-extrabold text-ink">
          Edit your trip ✏️
        </h1>
        <p className="text-gray-500 mt-3 mb-12 max-w-xl">
          Update the details of your trip. The itinerary stays the same.
        </p>

        {error && (
          <p className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-6 text-sm">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* DESTINATION */}
          <div ref={suggestionsRef} className="relative" style={{ zIndex: 30 }}>
            <label className="block text-xl font-bold text-ink mb-4">
              Destination
            </label>
            <input
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Select..."
              className={inputClass}
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
                      setDestination(shortenAddress(s.name));
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

          {/* DATES */}
          <div className="relative" style={{ zIndex: 10 }}>
            <label className="block text-xl font-bold text-ink mb-4">
              Trip dates
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-2">
                  Start date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-2">
                  End date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* BUDGET + TRAVELLERS */}
          <div
            className="relative grid grid-cols-1 md:grid-cols-2 gap-4"
            style={{ zIndex: 10 }}
          >
            <div>
              <label className="block text-xl font-bold text-ink mb-4">
                Budget (INR)
              </label>
              <input
                type="number"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="25000"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xl font-bold text-ink mb-4">
                Travellers
              </label>
              <input
                type="number"
                min="1"
                value={travellers}
                onChange={(e) => setTravellers(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div
            className="relative flex justify-end gap-3 pt-4"
            style={{ zIndex: 5 }}
          >
            <Link
              to={`/trips/${id}`}
              className="px-6 py-3.5 rounded-lg border border-gray-200 text-ink font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3.5 rounded-lg bg-lime text-forest font-bold hover:bg-lime-dark disabled:opacity-60 btn-press transition shadow-[0_6px_20px_-8px_rgba(168,216,74,0.8)]"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTrip;