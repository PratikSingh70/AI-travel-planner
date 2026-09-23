import { useEffect, useMemo, useRef, useState } from "react";

/* ============================================================
   WMO CODE TABLE
   ============================================================ */
const WMO = {
  0: { icon: "☀️", label: "Clear" },
  1: { icon: "🌤️", label: "Mainly clear" },
  2: { icon: "⛅", label: "Partly cloudy" },
  3: { icon: "☁️", label: "Overcast" },
  45: { icon: "🌫️", label: "Fog" },
  48: { icon: "🌫️", label: "Rime fog" },
  51: { icon: "🌦️", label: "Light drizzle" },
  53: { icon: "🌦️", label: "Drizzle" },
  55: { icon: "🌧️", label: "Dense drizzle" },
  61: { icon: "🌦️", label: "Light rain" },
  63: { icon: "🌧️", label: "Rain" },
  65: { icon: "🌧️", label: "Heavy rain" },
  71: { icon: "🌨️", label: "Light snow" },
  73: { icon: "🌨️", label: "Snow" },
  75: { icon: "❄️", label: "Heavy snow" },
  77: { icon: "❄️", label: "Snow grains" },
  80: { icon: "🌦️", label: "Showers" },
  81: { icon: "🌧️", label: "Showers" },
  82: { icon: "⛈️", label: "Violent showers" },
  85: { icon: "🌨️", label: "Snow showers" },
  86: { icon: "❄️", label: "Heavy snow" },
  95: { icon: "⛈️", label: "Thunderstorm" },
  96: { icon: "⛈️", label: "Storm + hail" },
  99: { icon: "⛈️", label: "Storm + hail" },
};
const describe = (c) => WMO[c] || { icon: "🌡️", label: "Unsettled" };

/* ============================================================
   HELPERS
   ============================================================ */
const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmtShort = (iso) =>
  fromISO(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const mean = (arr) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

/* ============================================================
   AI-STYLE TIP GENERATOR (based on weather)
   ============================================================ */
function generateTip(day) {
  const label = describe(day.code).label.toLowerCase();
  if (day.pop >= 60) {
    return "⚠️ High rain chance — best for indoor museums, cafés, and shopping districts.";
  }
  if (day.pop >= 40) {
    return "Carry an umbrella — mix indoor and outdoor stops today.";
  }
  if (day.max >= 32) {
    return "☀️ Hot day — plan outdoor activities early morning, stay hydrated.";
  }
  if (day.max <= 5) {
    return "❄️ Cold day — dress warm, ideal for scenic walks and hot drinks.";
  }
  if (label.includes("clear") || label.includes("sunny")) {
    return "Perfect weather for outdoor sightseeing, photography, and walking tours.";
  }
  return "Comfortable weather — a great day to explore the destination.";
}

/* ============================================================
   COMPONENT
   ============================================================ */
const WeatherSlider = ({ lat, lng, startDate, endDate }) => {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState("C");
  const [filter, setFilter] = useState("all");
  const [activeDay, setActiveDay] = useState(1);
  const [motionOn, setMotionOn] = useState(false);
  const [progress, setProgress] = useState(6);

  const trackRef = useRef(null);
  const motionRef = useRef(null);
  const dragRef = useRef({ dragging: false, startX: 0, startLeft: 0 });

  /* ---------- Fetch data ---------- */
  useEffect(() => {
    if (!lat || !lng || !startDate || !endDate) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const sISO = toISO(new Date(startDate));
        const eISO = toISO(new Date(endDate));
        const days =
          Math.round((fromISO(eISO) - fromISO(sISO)) / 86400000) + 1;

        // Cap at 30 days for the slider
        const totalDays = Math.min(days, 30);

        // ── Live 16-day fetch ──
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", lat);
        url.searchParams.set("longitude", lng);
        url.searchParams.set(
          "daily",
          "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
        );
        url.searchParams.set("timezone", "auto");
        url.searchParams.set("forecast_days", "16");

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Forecast failed");
        const daily = (await res.json())?.daily;
        if (!daily?.time?.length) throw new Error("No forecast data");

        const liveRows = daily.time.map((date, i) => ({
          date,
          code: daily.weather_code?.[i] ?? 0,
          max: daily.temperature_2m_max?.[i] ?? null,
          min: daily.temperature_2m_min?.[i] ?? null,
          pop: daily.precipitation_probability_max?.[i] ?? 0,
          source: "live",
        }));

        // ── Climate tail (days 17–30) ──
        // Fetch same calendar window from 3 prior years
        const climateRows = [];
        if (totalDays > 16) {
          const climateStart = new Date(sISO);
          climateStart.setDate(climateStart.getDate() + 16);
          const climateEnd = new Date(sISO);
          climateEnd.setDate(climateEnd.getDate() + totalDays - 1);

          const thisYear = new Date().getFullYear();
          const years = [thisYear - 1, thisYear - 2, thisYear - 3];

          const perYear = await Promise.all(
            years.map(async (y) => {
              const cs = new Date(
                y,
                climateStart.getMonth(),
                climateStart.getDate()
              );
              const ce = new Date(
                y,
                climateEnd.getMonth(),
                climateEnd.getDate()
              );
              const cu = new URL(
                "https://archive-api.open-meteo.com/v1/archive"
              );
              cu.searchParams.set("latitude", lat);
              cu.searchParams.set("longitude", lng);
              cu.searchParams.set("start_date", toISO(cs));
              cu.searchParams.set("end_date", toISO(ce));
              cu.searchParams.set(
                "daily",
                "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum"
              );
              cu.searchParams.set("timezone", "auto");
              try {
                const r = await fetch(cu.toString());
                if (!r.ok) return null;
                const j = await r.json();
                const d = j?.daily;
                if (!d?.time?.length) return null;
                return d.time.map((date, i) => ({
                  code: d.weather_code?.[i] ?? 0,
                  max: d.temperature_2m_max?.[i] ?? null,
                  min: d.temperature_2m_min?.[i] ?? null,
                  precip: d.precipitation_sum?.[i] ?? null,
                }));
              } catch {
                return null;
              }
            })
          );

          const validYears = perYear.filter(Boolean);
          if (validYears.length) {
            const spine = validYears[0];
            spine.forEach((_, i) => {
              const maxes = validYears.map((y) => y[i]?.max).filter((v) => v != null);
              const mins = validYears.map((y) => y[i]?.min).filter((v) => v != null);
              const codes = validYears.map((y) => y[i]?.code).filter((v) => v != null);
              const precips = validYears.map((y) => y[i]?.precip).filter((v) => v != null);

              // mode for weather code
              const freq = new Map();
              codes.forEach((c) => freq.set(c, (freq.get(c) || 0) + 1));
              let dom = codes[0] ?? 0;
              let best = -1;
              for (const [c, n] of freq) if (n > best) { best = n; dom = c; }

              const rainy = precips.filter((p) => p > 1).length;
              const pop = precips.length ? Math.round((rainy / precips.length) * 100) : 0;

              const dateObj = new Date(sISO);
              dateObj.setDate(dateObj.getDate() + 16 + i);

              climateRows.push({
                date: toISO(dateObj),
                code: dom,
                max: mean(maxes),
                min: mean(mins),
                pop,
                source: "climate",
              });
            });
          }
        }

        const combined = [...liveRows.slice(0, 16), ...climateRows].slice(0, totalDays);
        if (!cancelled) setSeries(combined);
      } catch (err) {
        console.error("[WeatherSlider]", err);
        if (!cancelled) setError("Couldn't load the weather forecast.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [lat, lng, startDate, endDate]);

  /* ---------- Temperature conversion ---------- */
  const temp = (c) => {
    if (c === null || c === undefined) return "–";
    if (unit === "F") return `${Math.round((c * 9) / 5 + 32)}°F`;
    return `${c}°C`;
  };
  const tempShort = (c) => {
    if (c === null || c === undefined) return "–";
    if (unit === "F") return `${Math.round((c * 9) / 5 + 32)}°`;
    return `${c}°`;
  };

  /* ---------- Filtered series ---------- */
  const visible = useMemo(() => {
    if (filter === "clear") return series.filter((d) => d.pop < 20);
    if (filter === "rain") return series.filter((d) => d.pop >= 50);
    return series;
  }, [series, filter]);

  /* ---------- Auto-scroll ---------- */
  useEffect(() => {
    if (motionOn) {
      motionRef.current = setInterval(() => {
        const track = trackRef.current;
        if (!track) return;
        if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
          track.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          track.scrollBy({ left: 165, behavior: "smooth" });
        }
      }, 1800);
    } else if (motionRef.current) {
      clearInterval(motionRef.current);
      motionRef.current = null;
    }
    return () => {
      if (motionRef.current) clearInterval(motionRef.current);
    };
  }, [motionOn]);

  /* ---------- Progress bar on scroll ---------- */
  const updateProgress = () => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    if (max <= 0) return setProgress(100);
    const pct = (track.scrollLeft / max) * 100;
    setProgress(Math.max(6, Math.min(100, pct)));
  };

  /* ---------- Drag to scroll ---------- */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onDown = (e) => {
      dragRef.current.dragging = true;
      dragRef.current.startX = e.pageX - track.offsetLeft;
      dragRef.current.startLeft = track.scrollLeft;
    };
    const onLeave = () => (dragRef.current.dragging = false);
    const onUp = () => (dragRef.current.dragging = false);
    const onMove = (e) => {
      if (!dragRef.current.dragging) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const walk = (x - dragRef.current.startX) * 1.5;
      track.scrollLeft = dragRef.current.startLeft - walk;
    };

    track.addEventListener("mousedown", onDown);
    track.addEventListener("mouseleave", onLeave);
    track.addEventListener("mouseup", onUp);
    track.addEventListener("mousemove", onMove);
    track.addEventListener("scroll", updateProgress);

    return () => {
      track.removeEventListener("mousedown", onDown);
      track.removeEventListener("mouseleave", onLeave);
      track.removeEventListener("mouseup", onUp);
      track.removeEventListener("mousemove", onMove);
      track.removeEventListener("scroll", updateProgress);
    };
  }, [visible]);

  /* ---------- Card 3D tilt ---------- */
  const handleMove = (e, el) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `perspective(600px) rotateX(${-y * 0.1}deg) rotateY(${x * 0.1}deg) translateY(-8px) scale(1.04)`;
  };
  const handleLeave = (el) => {
    el.style.transform = "";
  };

  /* ---------- Arrows ---------- */
  const slide = (dir) => {
    const track = trackRef.current;
    if (track) track.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  /* ---------- Active day data ---------- */
  const activeData = series.find(
    (d, i) => i + 1 === activeDay
  ) || series[0] || null;

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <section className="mt-16">
        <h2 className="text-2xl font-extrabold text-ink mb-6">
          Trip Weather Outlook
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-44 rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-16">
        <h2 className="text-2xl font-extrabold text-ink mb-6">
          Trip Weather Outlook
        </h2>
        <p className="text-sm text-gray-500">{error}</p>
      </section>
    );
  }

  if (!series.length) return null;

  return (
    <section className="mt-16 ws-wrapper">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="ws-header">
        <div>
          <div className="ws-brand-tag">
            <span className="ws-pulse-dot"></span>
            AI Live Weather Engine
          </div>
          <h2 className="ws-title">
            {series.length}-Day <span>Forecast Motion</span>
          </h2>
          <p className="ws-subtitle">
            Horizontal scroll with live Open-Meteo + seasonal climate fallback.
          </p>
        </div>

        <div className="ws-controls">
          <button
            className="ws-btn"
            onClick={() => setUnit(unit === "C" ? "F" : "C")}
          >
            Unit: °{unit}
          </button>
          <button
            className={`ws-btn ${motionOn ? "active" : ""}`}
            onClick={() => setMotionOn((v) => !v)}
          >
            <span>{motionOn ? "⏸" : "▶"}</span>
            <span>{motionOn ? "Pause" : "Auto-Scroll"}</span>
          </button>
          <div className="ws-nav-arrows">
            <button
              className="ws-arrow-btn"
              onClick={() => slide(-1)}
              aria-label="Previous"
            >
              ◀
            </button>
            <button
              className="ws-arrow-btn"
              onClick={() => slide(1)}
              aria-label="Next"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════ FILTERS ═══════════ */}
      <div className="ws-filters">
        <button
          className={`ws-chip ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All {series.length} Days
        </button>
        <button
          className={`ws-chip ${filter === "clear" ? "active" : ""}`}
          onClick={() => setFilter("clear")}
        >
          ☀️ Clear Skies (&lt;20% Rain)
        </button>
        <button
          className={`ws-chip ${filter === "rain" ? "active" : ""}`}
          onClick={() => setFilter("rain")}
        >
          🌧️ Plan B Days (≥50% Rain)
        </button>
      </div>

      {/* ═══════════ TRACK ═══════════ */}
      <div className="ws-track-wrapper">
        <div className="ws-edge-left" />
        <div className="ws-edge-right" />
        <div className="ws-track" ref={trackRef}>
          {visible.map((d, idx) => {
            const dayNum = series.indexOf(d) + 1;
            const w = describe(d.code);
            const isLive = d.source === "live";
            const isRainy = d.pop >= 50;
            const isActive = dayNum === activeDay;

            return (
              <div
                key={d.date}
                className={`ws-card ${isActive ? "active" : ""}`}
                onClick={() => setActiveDay(dayNum)}
                onMouseMove={(e) => handleMove(e, e.currentTarget)}
                onMouseLeave={(e) => handleLeave(e.currentTarget)}
              >
                <div className="ws-card-header">
                  <span className="ws-card-day">Day {dayNum}</span>
                  <span
                    className={`ws-card-badge ${
                      isLive ? "ws-badge-live" : "ws-badge-climate"
                    }`}
                  >
                    {isLive ? "Live" : "Climate"}
                  </span>
                </div>

                <div className="ws-card-icon-area">
                  <span className="ws-card-icon">{w.icon}</span>
                  <div className="ws-card-date">{fmtShort(d.date)}</div>
                </div>

                <div className="ws-card-stats">
                  <div>
                    <span className="ws-temp-high">{tempShort(d.max)}</span>
                    <span className="ws-temp-low">{tempShort(d.min)}</span>
                  </div>
                  <span
                    className={`ws-rain-stat ${
                      isRainy ? "ws-rain-warning" : "ws-rain-safe"
                    }`}
                  >
                    {d.pop}%
                  </span>
                </div>

                {isRainy && <div className="ws-plan-b">⚡ Plan B</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════ PROGRESS ═══════════ */}
      <div className="ws-progress">
        <div
          className="ws-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ═══════════ INSPECTOR ═══════════ */}
      {activeData && (
        <div className="ws-inspector">
          <div className="ws-inspector-left">
            <div className="ws-inspector-icon">
              {describe(activeData.code).icon}
            </div>
            <div className="ws-inspector-info">
              <div className="ws-inspector-title">
                <span>
                  Day {activeDay}: {fmtShort(activeData.date)} —{" "}
                  {describe(activeData.code).label}
                </span>
                <span
                  className={`ws-inspector-risk ${
                    activeData.pop >= 50 ? "rainy" : ""
                  }`}
                >
                  {activeData.pop >= 50 ? "🌧️" : "☀️"} {activeData.pop}% Rain
                  Risk
                </span>
              </div>
              <div className="ws-inspector-sub">
                High: {temp(activeData.max)} • Low: {temp(activeData.min)} •
                Source:{" "}
                {activeData.source === "live"
                  ? "Open-Meteo 16-Day Forecast"
                  : "Historical Climate Model"}
              </div>
            </div>
          </div>

          <div className="ws-inspector-ai">
            <span className="ws-ai-badge">AI Plan</span>
            <span>{generateTip(activeData)}</span>
          </div>
        </div>
      )}
    </section>
  );
};

export default WeatherSlider;