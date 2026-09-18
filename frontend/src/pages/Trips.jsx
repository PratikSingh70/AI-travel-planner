import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/Skeleton";

const BUDGET_FILTERS = [
  { id: "all", label: "All", icon: "🌐" },
  { id: "cheap", label: "Cheap", icon: "💵" },
  { id: "moderate", label: "Moderate", icon: "💰" },
  { id: "luxury", label: "Luxury", icon: "💎" },
];

const SORT_OPTIONS = [
  { id: "recent", label: "Recently created" },
  { id: "startDate", label: "Trip date (soonest)" },
  { id: "budget-high", label: "Budget: high → low" },
  { id: "budget-low", label: "Budget: low → high" },
  { id: "destination", label: "Destination (A–Z)" },
];

const getBudgetTier = (budget) => {
  if (budget < 20000) return "cheap";
  if (budget < 50000) return "moderate";
  return "luxury";
};

const TripsSkeleton = () => (
  <div className="min-h-screen bg-white py-12 px-6">
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <Skeleton variant="rectangular" width={220} height={44} rounded="12px" />
          <div style={{ marginTop: 12 }}>
            <Skeleton variant="text" width={140} height={14} />
          </div>
        </div>
        <Skeleton variant="rectangular" width={130} height={42} rounded="9999px" />
      </div>
      <Skeleton variant="rectangular" width="100%" height={56} rounded="16px" />
      <div className="flex gap-2 mt-4 flex-wrap">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" width={110} height={40} rounded="9999px" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
        {[...Array(6)].map((_, i) => (
          <div key={i}>
            <Skeleton
              variant="rectangular"
              width="100%"
              style={{ aspectRatio: "4 / 3" }}
              rounded="16px"
            />
            <div style={{ marginTop: 16 }}>
              <Skeleton variant="rectangular" width="70%" height={22} rounded="6px" />
            </div>
            <div style={{ marginTop: 10 }}>
              <Skeleton variant="text" width="55%" height={14} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Trips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [budgetFilter, setBudgetFilter] = useState("all");
  const [sort, setSort] = useState("recent");

  useEffect(() => {
    api
      .get("/trips")
      .then((r) => setTrips(r.data))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c = { all: trips.length, cheap: 0, moderate: 0, luxury: 0 };
    trips.forEach((t) => {
      c[getBudgetTier(t.budget)]++;
    });
    return c;
  }, [trips]);

  const totalBudget = useMemo(
    () => trips.reduce((sum, t) => sum + (Number(t.budget) || 0), 0),
    [trips]
  );

  const upcomingCount = useMemo(
    () => trips.filter((t) => new Date(t.startDate) > new Date()).length,
    [trips]
  );

  const visibleTrips = useMemo(() => {
    let list = [...trips];
    if (budgetFilter !== "all") {
      list = list.filter((t) => getBudgetTier(t.budget) === budgetFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => t.destination?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      switch (sort) {
        case "startDate":
          return new Date(a.startDate) - new Date(b.startDate);
        case "budget-high":
          return b.budget - a.budget;
        case "budget-low":
          return a.budget - b.budget;
        case "destination":
          return (a.destination || "").localeCompare(b.destination || "");
        case "recent":
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
    return list;
  }, [trips, search, budgetFilter, sort]);

  const clearFilters = () => {
    setSearch("");
    setBudgetFilter("all");
    setSort("recent");
  };

  const hasFilters = search.trim() || budgetFilter !== "all" || sort !== "recent";

  if (loading) return <TripsSkeleton />;

  return (
    <div className="min-h-screen bg-white py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* ═══════════ HERO HEADER ═══════════ */}
        <div className="relative mb-8 animate-fade-in-up">
          <div className="flex items-start gap-5">
            <div className="hidden md:block w-1.5 bg-lime rounded-full self-stretch min-h-[80px]" />

            <div className="flex-1 flex flex-wrap justify-between items-end gap-4">
              <div>
                <div className="inline-flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-lime-dark">
                    Your travel collection
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-ink leading-tight">
                  My Trips
                </h1>
                <p className="text-gray-500 mt-2 text-sm">
                  {visibleTrips.length} of {trips.length} trip
                  {trips.length === 1 ? "" : "s"}
                  {hasFilters && " (filtered)"}
                </p>
              </div>

              <Link
                to="/trips/new"
                className="px-6 py-3 rounded-full bg-lime text-forest font-bold hover:bg-lime-dark btn-press transition shadow-[0_6px_20px_-8px_rgba(168,216,74,0.8)] inline-flex items-center gap-2"
              >
                <span className="text-lg leading-none">+</span> New Trip
              </Link>
            </div>
          </div>
        </div>

        {/* ═══════════ STATS HIGHLIGHT BAR — COMPACT ═══════════ */}
        {trips.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8 animate-fade-in-up delay-100">
            <div className="bg-lime-light border border-lime/30 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-lime flex items-center justify-center text-forest text-sm flex-shrink-0">
                🗺️
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-forest/70 uppercase tracking-wider font-bold leading-tight">
                  Total Trips
                </p>
                <p className="text-lg font-extrabold text-forest leading-tight">
                  {trips.length}
                </p>
              </div>
            </div>

            <div className="bg-white border-2 border-forest rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center text-lime text-sm flex-shrink-0">
                💰
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold leading-tight">
                  Planned Budget
                </p>
                <p className="text-lg font-extrabold text-ink leading-tight truncate">
                  ₹{totalBudget.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-lime-light flex items-center justify-center text-lime-dark text-sm flex-shrink-0">
                📅
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold leading-tight">
                  Upcoming
                </p>
                <p className="text-lg font-extrabold text-ink leading-tight">
                  {upcomingCount}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ SEARCH & FILTERS ═══════════ */}
        {trips.length > 0 && (
          <div className="mb-8 space-y-4 animate-fade-in-up delay-200">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                🔍
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by destination..."
                className="w-full border-2 border-gray-200 rounded-2xl pl-10 pr-10 py-3.5 text-ink placeholder-gray-400 bg-white focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs hover:bg-lime hover:text-forest transition"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">
                Budget
              </span>
              {BUDGET_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setBudgetFilter(f.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold transition ${
                    budgetFilter === f.id
                      ? "border-lime bg-lime text-forest shadow-[0_4px_12px_-4px_rgba(168,216,74,0.8)]"
                      : "border-gray-200 text-ink hover:border-lime hover:bg-lime-light"
                  }`}
                >
                  <span>{f.icon}</span>
                  {f.label}
                  <span
                    className={`text-xs ml-0.5 ${
                      budgetFilter === f.id ? "opacity-80" : "text-gray-400"
                    }`}
                  >
                    {counts[f.id] || 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Sort
                </span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-ink bg-white focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/30 transition"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-lime-dark font-semibold transition"
                >
                  ✕ Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ EMPTY STATE — no trips ═══════════ */}
        {trips.length === 0 && (
          <div className="text-center py-24 bg-lime-light/50 border-2 border-dashed border-lime/40 rounded-3xl animate-fade-in-up">
            <p className="text-6xl mb-4">🗺️</p>
            <h3 className="text-2xl font-extrabold text-ink mb-2">
              No trips yet
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Start planning your first adventure and let AI craft the perfect
              itinerary for you.
            </p>
            <Link
              to="/trips/new"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-lime text-forest font-bold hover:bg-lime-dark btn-press transition shadow-[0_8px_24px_-8px_rgba(168,216,74,0.9)]"
            >
              ✨ Create Your First Trip
            </Link>
          </div>
        )}

        {/* ═══════════ EMPTY STATE — no filter matches ═══════════ */}
        {trips.length > 0 && visibleTrips.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-3xl animate-fade-in-up">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-ink font-bold mb-2">No trips match your filters</p>
            <p className="text-gray-500 text-sm mb-6">
              Try a different search or clear the filters.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-2.5 rounded-full bg-lime text-forest text-sm font-bold hover:bg-lime-dark btn-press transition"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* ═══════════ TRIP GRID ═══════════ */}
        {visibleTrips.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleTrips.map((trip, i) => {
              const days = Math.max(
                1,
                Math.round(
                  (new Date(trip.endDate) - new Date(trip.startDate)) /
                    (1000 * 60 * 60 * 24)
                )
              );
              const tier = getBudgetTier(trip.budget);
              const budgetLabel =
                tier === "cheap"
                  ? "Cheap"
                  : tier === "moderate"
                  ? "Moderate"
                  : "Luxury";

              const tierStyle =
                tier === "cheap"
                  ? "bg-lime-light text-forest border-lime/40"
                  : tier === "moderate"
                  ? "bg-forest text-lime border-forest"
                  : "bg-ink text-white border-ink";

              const imgUrl =
                trip.image ||
                `https://picsum.photos/seed/${encodeURIComponent(
                  trip.destination
                )}/600/450`;

              return (
                <Link
                  key={trip._id}
                  to={`/trips/${trip._id}`}
                  className="block group card-hover animate-fade-in-up bg-white border-2 border-gray-100 hover:border-lime rounded-2xl overflow-hidden transition-colors"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                    <img
                      src={imgUrl}
                      alt={trip.destination}
                      className="w-full h-full object-cover img-zoom"
                      onError={(e) => {
                        e.target.src = `https://picsum.photos/seed/${encodeURIComponent(
                          trip.destination
                        )}/600/450`;
                      }}
                    />
                    <span
                      className={`absolute top-3 right-3 text-xs px-3 py-1 rounded-full font-bold border ${tierStyle}`}
                    >
                      {budgetLabel}
                    </span>
                  </div>

                  <div className="p-4">
                    <h3 className="font-extrabold text-ink text-lg leading-tight group-hover:text-lime-dark transition-colors">
                      {trip.destination}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                      <span>📅 {days}D</span>
                      <span>·</span>
                      <span>👥 {trip.travellers}</span>
                    </div>
                    <p className="text-sm font-bold text-ink mt-3">
                      ₹{(trip.budget || 0).toLocaleString()}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Trips;