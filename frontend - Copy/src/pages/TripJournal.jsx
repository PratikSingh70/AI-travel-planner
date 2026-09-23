import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import "./TripJournal.css";

/* ─────────── Demo data (Japan trip) ─────────── */
const DEMO_ENTRIES = [
  { type: "destination", day: 1, time: "Morning", title: "Tokyo", emoji: "🗼",
    desc: "Arrive at Narita, transfer to Shinjuku, and settle in for four nights in the capital.",
    chips: ["4 nights", "Shinjuku base"] },
  { type: "hotel", day: 1, time: "Afternoon", title: "Park Hyatt Tokyo", emoji: "🏨",
    desc: "High-rise above Shinjuku with Mount Fuji views on clear days. Walking distance to the metro.",
    chips: ["Shinjuku", "4 nights"] },
  { type: "activity", day: 2, time: "Morning", title: "Tsukiji Outer Market", emoji: "🍣",
    desc: "Fresh sushi, tamagoyaki, and matcha from the stalls that never left after the market moved.",
    chips: ["Food", "2 hrs"] },
  { type: "activity", day: 2, time: "Afternoon", title: "Senso-ji & Asakusa", emoji: "⛩️",
    desc: "Tokyo's oldest temple, the Nakamise shopping street, and a slow walk along the Sumida.",
    chips: ["Culture", "3 hrs"] },
  { type: "activity", day: 3, time: "All day", title: "Shibuya, Harajuku & Omotesando", emoji: "🛍️",
    desc: "The scramble crossing, Takeshita Street, and the tree-lined avenue of flagship boutiques.",
    chips: ["Shopping", "Full day"] },
  { type: "transport", day: 5, time: "Morning", title: "Tokyo → Hakone", emoji: "🚄",
    desc: "Shinkansen to Odawara, then the Tozan Railway up into the mountains.",
    chips: ["90 min", "Shinkansen"] },
  { type: "destination", day: 5, time: "Midday", title: "Hakone", emoji: "🌋",
    desc: "An onsen town inside the Fuji-Hakone-Izu National Park. Two nights of hot springs and mountain air.",
    chips: ["2 nights", "Onsen"] },
  { type: "hotel", day: 5, time: "Afternoon", title: "Gora Kadan Ryokan", emoji: "♨️",
    desc: "A traditional ryokan with private onsen, kaiseki dinner, and tatami rooms overlooking the valley.",
    chips: ["Ryokan", "2 nights"] },
  { type: "activity", day: 6, time: "All day", title: "Lake Ashi & Owakudani", emoji: "🚡",
    desc: "Pirate ship across Lake Ashi, ropeway over the volcanic valley, black eggs at the summit.",
    chips: ["Outdoor", "Full day"] },
  { type: "transport", day: 7, time: "Morning", title: "Hakone → Kyoto", emoji: "🚄",
    desc: "Back down to Odawara, then a two-hour shinkansen ride west to Kyoto Station.",
    chips: ["2 hrs", "Reserved seats"] },
  { type: "destination", day: 7, time: "Afternoon", title: "Kyoto", emoji: "⛩️",
    desc: "Japan's former capital — 1,600 temples, 400 shrines, and the country's most refined food culture.",
    chips: ["3 nights", "Old capital"] },
  { type: "hotel", day: 7, time: "Evening", title: "The Ritz-Carlton Kyoto", emoji: "🏨",
    desc: "Riverside property on the Kamogawa with a quiet garden courtyard and modern-Japanese rooms.",
    chips: ["Kamogawa", "3 nights"] },
  { type: "activity", day: 8, time: "Dawn", title: "Fushimi Inari at Sunrise", emoji: "⛩️",
    desc: "Ten thousand vermilion torii gates up Mount Inari, blissfully empty before seven a.m.",
    chips: ["Hike", "3 hrs"] },
  { type: "activity", day: 8, time: "Afternoon", title: "Arashiyama Bamboo Grove", emoji: "🎋",
    desc: "The famous path through the bamboo, plus the monkey park and Togetsukyo Bridge.",
    chips: ["Nature", "Half day"] },
  { type: "activity", day: 9, time: "All day", title: "Gion & Kiyomizu-dera", emoji: "🍵",
    desc: "Morning at the hillside temple, afternoon tea ceremony, evening walk through Gion's lantern-lit lanes.",
    chips: ["Culture", "Full day"] },
  { type: "transport", day: 10, time: "Morning", title: "Kyoto → Osaka", emoji: "🚄",
    desc: "A fifteen-minute shinkansen hop — barely enough time to finish a station bento.",
    chips: ["15 min", "Short hop"] },
  { type: "destination", day: 10, time: "Midday", title: "Osaka", emoji: "🏯",
    desc: "Japan's kitchen and nightlife capital. Two nights of street food, neon, and Dotonbori chaos.",
    chips: ["2 nights", "Street food"] },
  { type: "hotel", day: 10, time: "Afternoon", title: "Conrad Osaka", emoji: "🏨",
    desc: "Skyline views from Nakanoshima, walkable to Umeda and a short metro to Dotonbori.",
    chips: ["Nakanoshima", "2 nights"] },
  { type: "activity", day: 11, time: "Evening", title: "Dotonbori Food Crawl", emoji: "🍢",
    desc: "Takoyaki, okonomiyaki, kushikatsu, and the Glico running man. Come hungry.",
    chips: ["Food", "4 hrs"] },
  { type: "transport", day: 12, time: "Morning", title: "Osaka → Kansai Airport", emoji: "🚆",
    desc: "The Nankai Rapi:t express to KIX — forty minutes through Osaka's southern suburbs.",
    chips: ["40 min", "Airport"] }
];

const CATEGORY_LABELS = {
  destination: "City",
  hotel: "Stay",
  activity: "Activity",
  transport: "Transit"
};

const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);

function daysBetween(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
}

/* ─────────── Transform a real trip into journal entries ─────────── */
function tripToEntries(trip) {
  if (!trip) return [];

  const entries = [];
  const startISO = trip.startDate
    ? new Date(trip.startDate).toISOString().slice(0, 10)
    : "";

  // Hero
  entries.push({
    type: "destination",
    day: 1,
    time: "Arrival",
    title: trip.destination,
    emoji: "📍",
    desc: `${daysBetween(trip.startDate, trip.endDate)}-day trip starting ${new Date(
      trip.startDate
    ).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}.`,
    chips: [
      `${trip.travellers || 1} traveller${trip.travellers > 1 ? "s" : ""}`,
      `₹ ${(trip.budget || 0).toLocaleString()}`,
    ],
  });

  // Hotels
  if (Array.isArray(trip.hotels)) {
    trip.hotels.forEach((h) => {
      entries.push({
        type: "hotel",
        day: 1,
        time: "Stay",
        title: h.name || "Hotel",
        emoji: "🏨",
        desc: h.address || "Accommodation for your trip.",
        chips: [
          h.rating ? `⭐ ${h.rating}` : null,
          h.price || null,
        ].filter(Boolean),
      });
    });
  }

  // Days + activities
  if (Array.isArray(trip.itinerary)) {
    trip.itinerary.forEach((day) => {
      (day.activities || []).forEach((act) => {
        const title = act.title || "Activity";
        const lower = title.toLowerCase();
        const desc = (act.description || "").toLowerCase();
        const text = `${lower} ${desc}`;

        // Detect transport
        const isTransport = /→|->|train|flight|drive|taxi|transfer|travel|shinkansen|airport|metro|bus/i.test(
          text
        );

        // Detect indoor/outdoor for emoji
        let emoji = "📍";
        if (isTransport) emoji = "🚆";
        else if (/museum|gallery/.test(text)) emoji = "🏛️";
        else if (/beach/.test(text)) emoji = "🏖️";
        else if (/temple|shrine/.test(text)) emoji = "⛩️";
        else if (/park|garden|nature/.test(text)) emoji = "🌳";
        else if (/hike|trek/.test(text)) emoji = "🥾";
        else if (/food|restaurant|dinner|lunch|cafe|eat/.test(text)) emoji = "🍽️";
        else if (/market|shop/.test(text)) emoji = "🛍️";
        else if (/castle|palace/.test(text)) emoji = "🏰";
        else if (/boat|ferry|cruise/.test(text)) emoji = "⛵";
        else if (/sunrise|sunset|viewpoint/.test(text)) emoji = "🌅";

        const chips = [];
        if (act.time) chips.push(act.time);
        if (act.cost) chips.push(`₹ ${act.cost}`);

        entries.push({
          type: isTransport ? "transport" : "activity",
          day: day.day || 1,
          time: act.time || "Flexible",
          title,
          emoji,
          desc: act.description || "Planned activity.",
          chips,
        });
      });
    });
  }

  return entries;
}

/* ─────────── Entry components ─────────── */
const ZigzagEntry = ({ item, index }) => {
  const isLeft = index % 2 === 0;
  const cat = CATEGORY_LABELS[item.type] || item.type;

  const card = (
    <article className="zz-card">
      <div className="zz-head">
        <span className="zz-cat">{cat}</span>
        <span className="zz-day">DAY {pad2(item.day)}</span>
      </div>
      <h2 className="zz-title">{item.title}</h2>
      <div className="zz-time">{item.time}</div>
      <p className="zz-desc">{item.desc}</p>
      {item.chips?.length > 0 && (
        <div className="zz-chips">
          {item.chips.map((c, i) => (
            <span className="zz-chip" key={i}>{c}</span>
          ))}
        </div>
      )}
    </article>
  );

  return (
    <div className="zz-entry" data-type={item.type}>
      <div className={`zz-left${isLeft ? "" : " empty"}`}>
        {isLeft ? card : null}
      </div>
      <div className="zz-marker-col">
        <div className="zz-marker">
          <span className="zz-marker-num">{pad2(index + 1)}</span>
          <span className="zz-marker-day">D{pad2(item.day)}</span>
        </div>
      </div>
      <div className={`zz-right${!isLeft ? "" : " empty"}`}>
        {!isLeft ? card : null}
      </div>
    </div>
  );
};

const StreamEntry = ({ item }) => (
  <article className="st-event" data-type={item.type}>
    <div className="st-pin"><div className="st-pin-inner" /></div>
    <div className="st-head">
      <div className="st-day">
        <span className="num">DAY {pad2(item.day)}</span>
        <span>{item.time}</span>
      </div>
      <div className="st-time">{item.time}</div>
    </div>
    <h2 className="st-title">
      <span className="st-emoji">{item.emoji}</span>
      {item.title}
    </h2>
    <div className="st-body">
      <p className="st-desc">{item.desc}</p>
      {item.chips?.length > 0 && (
        <div className="st-chips">
          {item.chips.map((c, i) => (
            <span className="st-chip" key={i}>{c}</span>
          ))}
        </div>
      )}
    </div>
  </article>
);

/* ─────────── Main page ─────────── */
const TripJournal = () => {
  const { id } = useParams();
  const isRealTrip = Boolean(id);

  const [trip, setTrip] = useState(null);
  const [tripLoading, setTripLoading] = useState(isRealTrip);
  const [tripError, setTripError] = useState("");

  const [activeView, setActiveView] = useState("zigzag");
  const [activeTypes, setActiveTypes] = useState({
    destination: true,
    hotel: true,
    activity: true,
    transport: true,
  });

  const progressRef = useRef(null);
  const rootRef = useRef(null);

  /* Fetch real trip */
  useEffect(() => {
    if (!isRealTrip) {
      setTripLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setTripLoading(true);
      setTripError("");
      try {
        const res = await api.get(`/trips/${id}`);
        if (!cancelled) setTrip(res.data);
      } catch (err) {
        if (!cancelled)
          setTripError(err.response?.data?.message || "Failed to load trip");
      } finally {
        if (!cancelled) setTripLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isRealTrip]);

  /* Compute entries */
  const entries = isRealTrip ? tripToEntries(trip) : DEMO_ENTRIES;

  /* Scroll progress */
  useEffect(() => {
    let raf = false;
    const onScroll = () => {
      if (raf) return;
      raf = true;
      requestAnimationFrame(() => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const pct = max > 0 ? window.scrollY / max : 0;
        if (progressRef.current) {
          progressRef.current.style.width = `${pct * 100}%`;
        }
        raf = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [entries]);

  /* Reveal observer */
  useEffect(() => {
    if (!rootRef.current) return;
    const els = rootRef.current.querySelectorAll(".zz-entry, .st-event");
    const io = new IntersectionObserver(
      (items) => {
        items.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -80px 0px", threshold: 0.08 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [entries, activeView]);

  useEffect(() => {
    if (!rootRef.current) return;
    const els = rootRef.current.querySelectorAll(".zz-entry, .st-event");
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.95 && r.bottom > 0) {
        el.classList.add("revealed");
      }
    });
  }, [activeView]);

  const toggleFilter = (type) => {
    setActiveTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  /* Loading / error */
  if (isRealTrip && tripLoading) {
    return (
      <div className="tj-root">
        <div className="tj-orb-1" />
        <div className="tj-orb-2" />
        <div className="tj-page">
          <div className="tj-skeleton" style={{ height: 200, marginBottom: 32 }} />
          <div className="tj-skeleton" style={{ height: 400 }} />
        </div>
      </div>
    );
  }

  if (isRealTrip && tripError) {
    return (
      <div className="tj-root">
        <div className="tj-orb-1" />
        <div className="tj-orb-2" />
        <div className="tj-page">
          <Link
            to={`/trips/${id}`}
            style={{
              color: "#888",
              marginBottom: 20,
              display: "inline-block",
              textDecoration: "none",
            }}
          >
            ← Back to trip
          </Link>
          <div className="tj-kicker">Error</div>
          <h1 className="tj-title">{tripError}</h1>
        </div>
      </div>
    );
  }

  if (isRealTrip && !trip) return null;

  const title = isRealTrip ? trip.destination : "Twelve Days";
  const subtitle = isRealTrip ? "Trip Journal" : "in Japan";

  return (
    <div className="tj-root" ref={rootRef}>
      <div className="tj-orb-1" />
      <div className="tj-orb-2" />
      <div className="tj-scroll-progress" ref={progressRef} />

      <main className="tj-page">
        {isRealTrip && (
          <Link
            to={`/trips/${id}`}
            style={{
              color: "#888",
              marginBottom: 20,
              display: "inline-block",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            ← Back to trip
          </Link>
        )}

        <header className="tj-masthead">
          <div className="tj-masthead-left">
            <div className="tj-kicker">
              {isRealTrip
                ? `${entries.filter((e) => e.type === "activity").length} activities · Field Notes`
                : "Japan · Field Notes · Vol. 01"}
            </div>
            <h1 className="tj-title">
              {title} <em>{subtitle}</em>
            </h1>
            <p className="tj-lede">
              {isRealTrip
                ? `A day-by-day journal of your trip. Switch views below, filter by category, and scroll to relive each moment.`
                : "A slow travelogue through Tokyo's alleys, Hakone's hot springs, Kyoto's thousand gates, and Osaka's neon kitchens."}
            </p>
          </div>
          <div className="tj-masthead-right">
            <span>Created</span>
            <strong>
              {isRealTrip
                ? new Date(trip.createdAt || Date.now())
                    .toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })
                    .toUpperCase()
                : "OCT 2026"}
            </strong>
            <span>Entries</span>
            <strong>{entries.length}</strong>
            <span>Days</span>
            <strong>{isRealTrip ? daysBetween(trip.startDate, trip.endDate) : 12}</strong>
          </div>
        </header>

        <div className="tj-stat-strip">
          <div className="tj-stat-cell">
            <span className="tj-stat-key">Cities</span>
            <span className="tj-stat-val">
              {entries.filter((e) => e.type === "destination").length || 1}
            </span>
          </div>
          <div className="tj-stat-cell">
            <span className="tj-stat-key">Days</span>
            <span className="tj-stat-val">
              {isRealTrip ? daysBetween(trip.startDate, trip.endDate) : 12}
              <span className="unit">total</span>
            </span>
          </div>
          <div className="tj-stat-cell">
            <span className="tj-stat-key">Activities</span>
            <span className="tj-stat-val">
              <span className="accent">
                {entries.filter((e) => e.type === "activity").length}
              </span>
            </span>
          </div>
          <div className="tj-stat-cell">
            <span className="tj-stat-key">Transit legs</span>
            <span className="tj-stat-val">
              {entries.filter((e) => e.type === "transport").length}
            </span>
          </div>
        </div>

        <div className="tj-controls">
          <div className="tj-segmented">
            <button
              type="button"
              className={activeView === "zigzag" ? "active" : ""}
              onClick={() => setActiveView("zigzag")}
            >
              ↔ Zigzag Journal
            </button>
            <button
              type="button"
              className={activeView === "stream" ? "active" : ""}
              onClick={() => setActiveView("stream")}
            >
              ↓ Vertical Stream
            </button>
          </div>
          <div className="tj-filters">
            {["destination", "hotel", "activity", "transport"].map((type) => (
              <button
                key={type}
                type="button"
                className={`tj-filter-pill${activeTypes[type] ? "" : " off"}`}
                data-filter={type}
                onClick={() => toggleFilter(type)}
              >
                <span className="dot" />
                {type === "destination"
                  ? "Cities"
                  : type === "hotel"
                  ? "Hotels"
                  : type === "activity"
                  ? "Activities"
                  : "Transport"}
              </button>
            ))}
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="tj-empty">
            <div style={{ fontSize: "3rem", marginBottom: 16, opacity: 0.5 }}>📓</div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: 8 }}>
              No journal entries yet
            </h2>
            <p style={{ color: "#888", fontSize: "0.88rem", marginBottom: 20 }}>
              Generate your itinerary first, then come back here.
            </p>
            {isRealTrip && (
              <Link
                to={`/trips/${id}`}
                className="tj-segmented"
                style={{
                  padding: "10px 22px",
                  textDecoration: "none",
                  color: "#000",
                  background: "#a3e635",
                  borderRadius: 999,
                  fontWeight: 800,
                  display: "inline-block",
                }}
              >
                Go to trip
              </Link>
            )}
          </div>
        ) : (
          <div className="tj-journal-wrap">
            <div
              className={`tj-layout tj-zigzag${
                activeView === "zigzag" ? " active" : ""
              }`}
            >
              <div className="tj-zigzag-path">
                <svg preserveAspectRatio="none" viewBox="0 0 80 1000">
                  <path d="M 40 0 Q 20 100 40 200 Q 60 300 40 400 Q 20 500 40 600 Q 60 700 40 800 Q 20 900 40 1000" />
                </svg>
              </div>
              {entries.map((item, i) => (
                <ZigzagEntry key={i} item={item} index={i} />
              ))}
            </div>

            <div
              className={`tj-layout tj-stream${
                activeView === "stream" ? " active" : ""
              }`}
            >
              {entries.map((item, i) => (
                <StreamEntry key={i} item={item} />
              ))}
            </div>
          </div>
        )}

        <footer className="tj-page-footer">
          <span>Two views · One journey · Filter categories</span>
          <span>AI Travel Planner © Field Journal</span>
        </footer>
      </main>
    </div>
  );
};

export default TripJournal;