import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import "./Trips.css";

const TIERS = [
  { key: "all", label: "All budgets" },
  { key: "cheap", label: "Cheap" },
  { key: "moderate", label: "Moderate" },
  { key: "luxury", label: "Luxury" },
];

const SORTS = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "az", label: "A → Z" },
  { key: "za", label: "Z → A" },
];

const CART_STORAGE_KEY = "aitp.selectedTrips";

/* ─────────── Helpers ─────────── */
function getBudgetTier(budget) {
  const n = Number(budget) || 0;
  if (n < 20000) return "cheap";
  if (n < 50000) return "moderate";
  return "luxury";
}

function tierLabel(key) {
  const found = TIERS.find((t) => t.key === key);
  return found ? found.label : key;
}

function daysBetween(a, b) {
  const start = new Date(a);
  const end = new Date(b);
  return Math.max(1, Math.round((end - start) / 86400000));
}

function relativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `${w} week${w === 1 ? "" : "s"} ago`;
  }
  if (days < 365) {
    const m = Math.floor(days / 30);
    return `${m} month${m === 1 ? "" : "s"} ago`;
  }
  const y = Math.floor(days / 365);
  return `${y} year${y === 1 ? "" : "s"} ago`;
}

/* Pick a nice emoji based on destination text */
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
  if (t.includes("cape town") || t.includes("africa")) return "🦁";
  if (t.includes("lisbon") || t.includes("portugal")) return "🚋";
  if (t.includes("bangkok") || t.includes("thai")) return "🛕";
  if (t.includes("dubai")) return "🌇";
  if (t.includes("barcelona") || t.includes("spain")) return "🎨";
  if (t.includes("santorini") || t.includes("greece")) return "🏖️";
  if (t.includes("hanoi") || t.includes("vietnam")) return "🍜";
  if (t.includes("sydney") || t.includes("australia")) return "🌉";
  if (t.includes("peru") || t.includes("machu")) return "🏔️";
  if (t.includes("zermatt") || t.includes("switzerland")) return "🏂";
  if (t.includes("india") || t.includes("delhi") || t.includes("mumbai")) return "🛕";
  if (t.includes("london")) return "🎡";
  if (t.includes("egypt") || t.includes("cairo")) return "🐫";
  return "✈️";
}

/* Extract a short country/region from destination string */
function extractCountry(destination) {
  if (!destination) return "";
  const parts = destination.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 1];
  return "";
}

/* ─────────── Skeleton grid ─────────── */
const SkeletonGrid = () => (
  <div className="tr-grid">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="tr-skeleton" />
    ))}
  </div>
);

/* ─────────── Main page ─────────── */
const Trips = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [tier, setTier] = useState(searchParams.get("tier") || "all");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");

  const [selected, setSelected] = useState(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, text: "", icon: "✓" });
  const [badgeBump, setBadgeBump] = useState(false);

  const searchRef = useRef(null);
  const toastTimerRef = useRef(null);

  /* Fetch trips */
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

  /* Persist cart */
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(selected));
    } catch {}
  }, [selected]);

  /* Sync URL */
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (tier !== "all") params.set("tier", tier);
    if (sort !== "newest") params.set("sort", sort);
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tier, sort]);

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        if (drawerOpen) setDrawerOpen(false);
        else if (document.activeElement === searchRef.current) {
          setQuery("");
          searchRef.current?.blur();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  /* Toast */
  const showToast = (text, icon = "✓") => {
    setToast({ show: true, text, icon });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 1800);
  };

  /* Selection toggle */
  const toggleTrip = (id) => {
    setSelected((prev) => {
      const isSel = prev.includes(id);
      if (isSel) {
        showToast("Removed from selection", "×");
        return prev.filter((x) => x !== id);
      }
      showToast("Added to selection", "✓");
      return [...prev, id];
    });
    setBadgeBump(true);
    setTimeout(() => setBadgeBump(false), 300);
  };

  const clearCart = () => {
    if (selected.length === 0) return;
    setSelected([]);
    showToast("Selection cleared", "🗑️");
  };

  /* Visible trips */
  const visibleTrips = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = trips.filter((t) => {
      const dest = (t.destination || "").toLowerCase();
      const matchQ = !q || dest.includes(q);
      const matchTier = tier === "all" || getBudgetTier(t.budget) === tier;
      return matchQ && matchTier;
    });

    return filtered.slice().sort((a, b) => {
      switch (sort) {
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "az":
          return (a.destination || "").localeCompare(b.destination || "");
        case "za":
          return (b.destination || "").localeCompare(a.destination || "");
        case "newest":
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
  }, [trips, query, tier, sort]);

  const selectedTrips = useMemo(
    () =>
      selected
        .map((id) => trips.find((t) => t._id === id))
        .filter(Boolean),
    [selected, trips]
  );

  const totalDays = useMemo(
    () =>
      selectedTrips.reduce(
        (sum, t) => sum + daysBetween(t.startDate, t.endDate),
        0
      ),
    [selectedTrips]
  );

  const hasFilters = query.trim() || tier !== "all" || sort !== "newest";

  /* Handlers */
  const clearAllFilters = () => {
    setQuery("");
    setTier("all");
    setSort("newest");
    searchRef.current?.focus();
  };

  const handleCardClick = (id) => {
    navigate(`/trips/${id}`);
  };

  const handleCardKeyDown = (e, id) => {
    if (e.key === "Enter" || e.key === " ") {
      if (e.target !== e.currentTarget) return;
      e.preventDefault();
      handleCardClick(id);
    }
  };

  const buildPlan = () => {
    const names = selectedTrips.map((t) => t.destination).join(", ");
    showToast(`Building plan for ${names}`, "✨");
    setDrawerOpen(false);
  };

  return (
    <div className="tr-root">
      <div className="tr-orb-1" />
      <div className="tr-orb-2" />

      <main className="tr-page">
        <header className="tr-header">
          <div className="tr-header-row">
            <div>
              <div className="tr-tag">
                <span className="tr-pulse" />
                {trips.length} trip{trips.length === 1 ? "" : "s"} saved
              </div>
              <h1 className="tr-title">
                My <span>Trips</span>
              </h1>
              <p className="tr-subtitle">
                Search, filter, and sort your trips. Tap{" "}
                <strong>＋ Select</strong> on any card to add it to your
                selection — the cart keeps your picks even after a refresh.
              </p>
            </div>

            <button
              className={`tr-cart-btn ${selected.length > 0 ? "has-items" : ""}`}
              onClick={() => setDrawerOpen(true)}
              type="button"
              aria-label="Open selected trips"
            >
              <span>🛒</span>
              <span>Selected</span>
              <span className={`tr-cart-badge ${badgeBump ? "bump" : ""}`}>
                {selected.length}
              </span>
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="tr-filter-panel">
          <div className="tr-filter-grid">
            <label className="tr-field">
              <span className="tr-label">Search destinations</span>
              <span className="tr-input-wrap">
                <span className="tr-field-icon">🔍</span>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder='Try "Japan", "Paris", "Bali"…'
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {!query && <span className="tr-kbd">/</span>}
                {query && (
                  <button
                    type="button"
                    className="tr-clear"
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </span>
            </label>

            <label className="tr-field">
              <span className="tr-label">Budget tier</span>
              <span className="tr-input-wrap">
                <span className="tr-field-icon">💰</span>
                <select value={tier} onChange={(e) => setTier(e.target.value)}>
                  {TIERS.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </span>
            </label>

            <label className="tr-field">
              <span className="tr-label">Sort by</span>
              <span className="tr-input-wrap">
                <span className="tr-field-icon">↕️</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          </div>
        </div>

        {/* Active pills */}
        {hasFilters && (
          <div className="tr-active-bar visible">
            <span className="tr-active-label">Active</span>
            {query.trim() && (
              <span className="tr-pill">
                "{query.trim()}"
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Remove search"
                >
                  ×
                </button>
              </span>
            )}
            {tier !== "all" && (
              <span className="tr-pill">
                {tierLabel(tier)}
                <button
                  type="button"
                  onClick={() => setTier("all")}
                  aria-label="Remove tier"
                >
                  ×
                </button>
              </span>
            )}
            {sort !== "newest" && (
              <span className="tr-pill">
                {SORTS.find((s) => s.key === sort)?.label}
                <button
                  type="button"
                  onClick={() => setSort("newest")}
                  aria-label="Reset sort"
                >
                  ×
                </button>
              </span>
            )}
            <button
              type="button"
              className="tr-clear-all"
              onClick={clearAllFilters}
            >
              Clear all
            </button>
          </div>
        )}

        {/* Results count */}
        {!loading && trips.length > 0 && (
          <p className="tr-results">
            Showing <strong>{visibleTrips.length}</strong> of{" "}
            <strong>{trips.length}</strong> trips
            {query.trim() && (
              <>
                {" "}
                matching <em>"{query.trim()}"</em>
              </>
            )}
            {tier !== "all" && (
              <>
                {" "}
                in the <em>{tierLabel(tier)}</em> tier
              </>
            )}
          </p>
        )}

        {/* Grid / states */}
        {loading && <SkeletonGrid />}

        {!loading && trips.length === 0 && (
          <div className="tr-empty">
            <div className="tr-empty-icon">🗺️</div>
            <div className="tr-empty-title">No trips yet</div>
            <p className="tr-empty-text">
              Start planning your first adventure and let AI craft the perfect
              itinerary for you.
            </p>
            <Link to="/trips/new" className="tr-btn-primary">
              ✨ Create your first trip
            </Link>
          </div>
        )}

        {!loading && trips.length > 0 && visibleTrips.length === 0 && (
          <div className="tr-empty">
            <div className="tr-empty-icon">🔍</div>
            <div className="tr-empty-title">No trips match your filters</div>
            <p className="tr-empty-text">
              Try a different search term, switch the budget tier, or clear
              everything to see all trips again.
            </p>
            <button
              className="tr-btn-primary"
              onClick={clearAllFilters}
              type="button"
            >
              ✨ Clear all filters
            </button>
          </div>
        )}

        {!loading && visibleTrips.length > 0 && (
          <div className="tr-grid">
            {visibleTrips.map((trip, i) => {
              const tier = getBudgetTier(trip.budget);
              const days = daysBetween(trip.startDate, trip.endDate);
              const isSel = selected.includes(trip._id);
              const country = extractCountry(trip.destination);
              const emoji = pickEmoji(trip.destination);

              return (
                <article
                  key={trip._id}
                  className={`tr-card tier-${tier} ${isSel ? "selected" : ""}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                  tabIndex={0}
                  onClick={() => handleCardClick(trip._id)}
                  onKeyDown={(e) => handleCardKeyDown(e, trip._id)}
                >
                  <div className="tr-card-top">
                    <div className="tr-card-thumb">
                      {trip.image ? (
                        <img
                          src={trip.image}
                          alt={trip.destination}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        emoji
                      )}
                    </div>
                    <div className="tr-card-top-right">
                      <span className={`tr-tier tier-${tier}`}>
                        {tierLabel(tier)}
                      </span>
                      <button
                        type="button"
                        className={`tr-select ${isSel ? "selected" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTrip(trip._id);
                        }}
                        aria-pressed={isSel}
                      >
                        {isSel ? (
                          <>
                            <span>✓</span> Selected
                          </>
                        ) : (
                          <>
                            <span>＋</span> Select
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="tr-name">{trip.destination}</h3>
                    {country && <p className="tr-country">{country}</p>}
                  </div>

                  <div className="tr-meta">
                    <span className="days">{days} days</span>
                    <span className="sep">·</span>
                    <span className="created">{relativeTime(trip.createdAt)}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer
          style={{
            marginTop: 60,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            fontSize: "0.75rem",
            color: "var(--tr-dim)",
            fontWeight: 600,
          }}
        >
          <span>Filters sync to the URL · Selections saved locally</span>
          <span>AI Travel Planner © My Trips</span>
        </footer>
      </main>

      {/* Overlay */}
      <div
        className={`tr-overlay ${drawerOpen ? "open" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Drawer */}
      <aside className={`tr-drawer ${drawerOpen ? "open" : ""}`}>
        <div className="tr-drawer-head">
          <div className="tr-drawer-title">
            🛒 Selected <span>({selected.length})</span>
          </div>
          <button
            className="tr-drawer-close"
            onClick={() => setDrawerOpen(false)}
            type="button"
            aria-label="Close drawer"
          >
            ×
          </button>
        </div>

        <div className="tr-drawer-summary">
          <div className="tr-summary-stat">
            <div className="tr-summary-label">Trips</div>
            <div className="tr-summary-value">
              {selected.length}
              <span>selected</span>
            </div>
          </div>
          <div className="tr-summary-stat">
            <div className="tr-summary-label">Total days</div>
            <div className="tr-summary-value accent">
              {totalDays}
              <span>days</span>
            </div>
          </div>
        </div>

        <div className="tr-drawer-body">
          {selectedTrips.length === 0 ? (
            <div className="tr-cart-empty">
              <div className="tr-cart-empty-icon">🛒</div>
              <div className="tr-cart-empty-title">Nothing selected yet</div>
              <p className="tr-cart-empty-text">
                Tap <strong>＋ Select</strong> on any trip card to add it here.
                Your picks are saved locally.
              </p>
            </div>
          ) : (
            selectedTrips.map((trip) => {
              const tier = getBudgetTier(trip.budget);
              const days = daysBetween(trip.startDate, trip.endDate);
              const emoji = pickEmoji(trip.destination);
              return (
                <div
                  key={trip._id}
                  className={`tr-cart-item tier-${tier}`}
                >
                  <div className="tr-cart-item-thumb">
                    {trip.image ? (
                      <img
                        src={trip.image}
                        alt={trip.destination}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      emoji
                    )}
                  </div>
                  <div className="tr-cart-item-body">
                    <div className="tr-cart-item-name">
                      {trip.destination}
                    </div>
                    <div className="tr-cart-item-meta">{days} days</div>
                  </div>
                  <button
                    type="button"
                    className="tr-cart-item-remove"
                    onClick={() => toggleTrip(trip._id)}
                    aria-label={`Remove ${trip.destination}`}
                  >
                    ×
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="tr-drawer-foot">
          <div className="tr-drawer-actions">
            <button
              className="tr-btn-cart-primary"
              type="button"
              disabled={selectedTrips.length === 0}
              onClick={buildPlan}
            >
              ✨ Build itinerary
            </button>
            <button
              className="tr-btn-cart-ghost"
              type="button"
              onClick={clearCart}
            >
              Clear
            </button>
          </div>
        </div>
      </aside>

      {/* Toast */}
      <div className={`tr-toast ${toast.show ? "show" : ""}`}>
        <span>{toast.icon}</span>
        <span>{toast.text}</span>
      </div>
    </div>
  );
};

export default Trips;