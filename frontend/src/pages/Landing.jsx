import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ImageSlideshow from "../components/ImageSlideshow";
import "./Landing.css";

const ROTATE_WORDS = [
  "India", "Japan", "Bali", "America", "Canada", "Sri Lanka",
  "Nepal", "Saudi Arabia", "Thailand", "Dubai", "France", "Iceland",
];

const FEATURES = [
  { icon: "🤖", title: "AI Itinerary", desc: "Gemini + Groq craft a day-by-day plan in seconds — hotels, activities, and budget included." },
  { icon: "🌦️", title: "Weather-Aware", desc: "Live forecasts reshuffle your outdoor plans onto sunny days and indoor ones onto rainy days." },
  { icon: "🗺️", title: "Interactive Map", desc: "Numbered stops, route lines, and distance between activities — all on a live map." },
  { icon: "💰", title: "Budget Breakdown", desc: "Flights, hotels, food, activities — see where every rupee goes before you book." },
  { icon: "📄", title: "One-Click PDF", desc: "Export your full itinerary as a beautiful A4 PDF, ready to print or share." },
  { icon: "🔗", title: "Share Publicly", desc: "Send friends a link to view your trip — no login required on their end." },
];

const STEPS = [
  { n: "01", title: "Tell us where", desc: "Pick a destination, dates, budget, travellers, and the things you love." },
  { n: "02", title: "AI plans it", desc: "Gemini generates a day-by-day itinerary with hotels and cost estimates." },
  { n: "03", title: "Explore & export", desc: "View the map, check the weather plan, then download PDF or share a link." },
];

const PREVIEW_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1600&h=686&fit=crop&q=80",
    pill: "4 Days · 6 places", title: "Taj Mahal, Agra",
    url: "aitravelplanner.app/trips/agra",
    day: "Sunrise at Taj Mahal", weather: "28°C · Clear", budget: "₹35,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1600&h=686&fit=crop&q=80",
    pill: "7 Days · 9 places", title: "Rajasthan, India",
    url: "aitravelplanner.app/trips/rajasthan",
    day: "Jaipur City Palace", weather: "32°C · Sunny", budget: "₹55,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1600&h=686&fit=crop&q=80",
    pill: "6 Days · 8 places", title: "San Francisco, USA",
    url: "aitravelplanner.app/trips/san-francisco",
    day: "Golden Gate Bridge", weather: "20°C · Foggy", budget: "₹1,20,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1513326738677-b964603b136d?w=1600&h=686&fit=crop&q=80",
    pill: "5 Days · 7 places", title: "Moscow, Russia",
    url: "aitravelplanner.app/trips/moscow",
    day: "Red Square & Kremlin", weather: "-2°C · Snowy", budget: "₹85,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1600&h=686&fit=crop&q=80",
    pill: "8 Days · 10 places", title: "Serengeti, Africa",
    url: "aitravelplanner.app/trips/serengeti",
    day: "Wildlife safari", weather: "30°C · Sunny", budget: "₹1,50,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&h=686&fit=crop&q=80",
    pill: "5 Days · 7 places", title: "Tokyo, Japan",
    url: "aitravelplanner.app/trips/tokyo",
    day: "Arrival & Shinjuku", weather: "18°C · Clear", budget: "₹70,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&h=686&fit=crop&q=80",
    pill: "4 Days · 6 places", title: "Paris, France",
    url: "aitravelplanner.app/trips/paris",
    day: "Eiffel Tower & Louvre", weather: "15°C · Cloudy", budget: "₹55,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600&h=686&fit=crop&q=80",
    pill: "7 Days · 9 places", title: "Bali, Indonesia",
    url: "aitravelplanner.app/trips/bali",
    day: "Ubud rice terraces", weather: "28°C · Sunny", budget: "₹45,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=1600&h=686&fit=crop&q=80",
    pill: "6 Days · 8 places", title: "Reykjavik, Iceland",
    url: "aitravelplanner.app/trips/reykjavik",
    day: "Golden Circle tour", weather: "5°C · Snowy", budget: "₹95,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&h=686&fit=crop&q=80",
    pill: "4 Days · 5 places", title: "Dubai, UAE",
    url: "aitravelplanner.app/trips/dubai",
    day: "Burj Khalifa visit", weather: "32°C · Clear", budget: "₹60,000 total",
  },
];

const PreviewSlideshow = () => {
  const [index, setIndex] = useState(0);
  const active = PREVIEW_SLIDES[index] || PREVIEW_SLIDES[0];

  return (
    <div className="lp-preview-window">
      <div className="lp-preview-bar">
        <span className="lp-preview-dot r" />
        <span className="lp-preview-dot y" />
        <span className="lp-preview-dot g" />
        <span className="lp-preview-url">{active.url}</span>
      </div>

      <div className="lp-preview-body">
        <ImageSlideshow
          slides={PREVIEW_SLIDES}
          interval={2000}
          onChange={(_, i) => {
            setTimeout(() => setIndex(i), 0);
          }}
        />

        <div className="lp-preview-cards">
          <div className="lp-preview-card">
            <div className="lp-preview-card-icon">📅</div>
            <div>
              <div className="lp-preview-card-label">Day 1</div>
              <div className="lp-preview-card-text">{active.day}</div>
            </div>
          </div>
          <div className="lp-preview-card">
            <div className="lp-preview-card-icon">🌤️</div>
            <div>
              <div className="lp-preview-card-label">Weather</div>
              <div className="lp-preview-card-text">{active.weather}</div>
            </div>
          </div>
          <div className="lp-preview-card">
            <div className="lp-preview-card-icon">💰</div>
            <div>
              <div className="lp-preview-card-label">Budget</div>
              <div className="lp-preview-card-text">{active.budget}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Landing = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [wordIndex, setWordIndex] = useState(0);
  const [wordOut, setWordOut] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      setWordOut(true);
      setTimeout(() => {
        setWordIndex((i) => (i + 1) % ROTATE_WORDS.length);
        setWordOut(false);
      }, 400);
    }, 1800);
    return () => clearInterval(iv);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handlePlanTrip = () => {
    if (user) navigate("/trips/new");
    else navigate("/register");
  };

  const initials = (user?.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="lp-root">
      <div className="lp-bg-scene" aria-hidden="true">
        <div className="lp-sun">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff9c4" />
                <stop offset="55%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#facc15" />
              </radialGradient>
              <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fde047" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="46" fill="url(#sunGlow)" className="lp-sun-glow" />
            <g className="lp-sun-rays">
              {Array.from({ length: 12 }).map((_, i) => (
                <rect key={i} x="48.6" y="2" width="2.8" height="12" rx="1.4"
                  fill="#facc15" opacity="0.7"
                  transform={`rotate(${(i * 360) / 12} 50 50)`} />
              ))}
            </g>
            <circle cx="50" cy="50" r="22" fill="url(#sunCore)" className="lp-sun-core" />
          </svg>
        </div>

        <div className="lp-cloud lp-cloud-1">
          <svg viewBox="0 0 120 50">
            <path d="M20 42 C 6 42 2 32 10 26 C 8 16 18 10 28 14 C 34 4 50 2 60 12 C 70 4 86 6 92 18 C 104 14 116 22 114 34 C 118 42 108 46 96 44 L 20 42 Z" fill="#ffffff" opacity="0.55" />
          </svg>
        </div>
        <div className="lp-cloud lp-cloud-2">
          <svg viewBox="0 0 120 50">
            <path d="M20 42 C 6 42 2 32 10 26 C 8 16 18 10 28 14 C 34 4 50 2 60 12 C 70 4 86 6 92 18 C 104 14 116 22 114 34 C 118 42 108 46 96 44 L 20 42 Z" fill="#ffffff" opacity="0.4" />
          </svg>
        </div>

        <div className="lp-birds lp-birds-1">
          <svg viewBox="0 0 60 20">
            <path d="M4 10 Q 8 4 12 10 Q 16 4 20 10" stroke="#2f3a1f" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M28 6 Q 32 1 36 6 Q 40 1 44 6" stroke="#2f3a1f" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </svg>
        </div>

        <svg className="lp-landscape" viewBox="0 0 1440 620" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="lpHillFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8f0bc" stopOpacity=".85" />
              <stop offset="100%" stopColor="#d4e28e" stopOpacity=".5" />
            </linearGradient>
            <linearGradient id="lpHillNear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cfe08c" stopOpacity=".85" />
              <stop offset="100%" stopColor="#b5cd63" stopOpacity=".6" />
            </linearGradient>
          </defs>
          <path d="M0 400 Q 180 280 360 355 T 720 325 T 1080 365 T 1440 315 L1440 620 L0 620 Z" fill="url(#lpHillFar)" />
          <path d="M0 520 Q 240 420 480 480 T 960 460 T 1440 490 L1440 620 L0 620 Z" fill="url(#lpHillNear)" />

          <g className="lp-palm lp-palm-1" opacity=".62" fill="#93b352">
            <path d="M100 575 C 108 500, 135 435, 168 382 L 180 375 C 150 435, 128 500, 135 575 Z" />
            <path d="M174 378 C 160 340, 135 315, 100 305 C 130 325, 155 355, 172 385 Z" />
            <path d="M174 378 C 178 335, 185 305, 198 275 C 190 310, 182 345, 178 380 Z" />
            <path d="M174 378 C 200 345, 232 325, 268 320 C 235 340, 200 360, 178 382 Z" />
            <path d="M174 378 C 215 380, 258 395, 295 425 C 255 405, 212 388, 176 383 Z" />
            <path d="M174 378 C 200 405, 225 440, 240 485 C 220 445, 198 408, 176 383 Z" />
            <path d="M174 378 C 148 408, 122 445, 105 490 C 125 450, 150 412, 172 383 Z" />
            <path d="M174 378 C 135 385, 95 400, 60 425 C 98 408, 140 393, 172 383 Z" />
            <circle cx="172" cy="385" r="5" />
          </g>
          <g className="lp-palm lp-palm-2" opacity=".62" fill="#93b352">
            <path d="M1275 575 C 1280 510, 1288 450, 1290 405 L 1305 400 C 1305 450, 1302 510, 1308 575 Z" />
            <path d="M1297 402 C 1270 375, 1240 360, 1205 358 C 1235 370, 1265 385, 1295 405 Z" />
            <path d="M1297 402 C 1290 365, 1285 335, 1290 305 C 1300 340, 1302 370, 1300 405 Z" />
            <path d="M1297 402 C 1325 375, 1355 360, 1390 358 C 1360 370, 1330 385, 1300 405 Z" />
            <path d="M1297 402 C 1335 400, 1375 408, 1410 430 C 1370 418, 1332 408, 1300 405 Z" />
            <path d="M1297 402 C 1258 400, 1220 408, 1185 430 C 1225 418, 1262 408, 1294 405 Z" />
            <path d="M1297 402 C 1325 425, 1345 455, 1355 490 C 1338 458, 1318 430, 1300 405 Z" />
          </g>
        </svg>

        <span className="lp-pin pin1">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg>
        </span>
        <span className="lp-pin pin2">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg>
        </span>
        <span className="lp-pin pin3">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg>
        </span>

        <span className="lp-plane plane1">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
        </span>
        <span className="lp-plane plane2">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
        </span>
        <span className="lp-plane plane3">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
        </span>

        <span className="lp-sparkle s1" />
        <span className="lp-sparkle s2" />
        <span className="lp-sparkle s3" />
        <span className="lp-sparkle s4" />
      </div>

      <header className="lp-topbar">
        <div className="lp-topbar-inner">
          <Link to="/" className="lp-brand">
            <span className="lp-brand-name">
              AI Travel <span className="lp-brand-accent">Planner</span>
            </span>
          </Link>
          <nav className="lp-mainnav">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#preview">Preview</a>
            <Link to="/trips/new">Plan a trip</Link>
          </nav>
          <div className="lp-user">
            {user ? (
              <>
                <Link to="/profile" className="lp-avatar" title={user.name}>{initials}</Link>
                <button className="lp-btn-logout" type="button" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="lp-auth-login">Login</Link>
                <Link to="/register" className="lp-auth-cta">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="lp-main">
        <h1 className="lp-headline">
          <span className="lp-headline-line">Your next trip to</span>
          <span className="lp-headline-rotate">
            <span className={`lp-rotator${wordOut ? " out" : ""}`}>
              {ROTATE_WORDS[wordIndex]}
            </span>
          </span>
          <span className="lp-headline-line lp-headline-accent">planned in seconds.</span>
        </h1>
        <p className="lp-sub">
          Stop endlessly searching. Let AI craft your perfect itinerary —
          day-by-day plans, hotels, budget, weather, and maps — in one place.
        </p>
        <div className="lp-hero-actions">
          <button className="lp-cta" type="button" onClick={handlePlanTrip}>
            ✨ Plan a New Trip
          </button>
          <a href="#how" className="lp-cta-ghost">See how it works →</a>
        </div>
        <ul className="lp-features-inline">
          <li>
            <span className="lp-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="#12200a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </span>
            Tailored to your vibe
          </li>
          <li>
            <span className="lp-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="#12200a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </span>
            Zero planning burnout
          </li>
          <li>
            <span className="lp-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="#12200a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </span>
            Free to use
          </li>
        </ul>
      </main>

      <section className="lp-section" id="how">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <span className="lp-section-tag">How it works</span>
            <h2 className="lp-section-title">Three steps from <span>idea to itinerary</span></h2>
          </div>
          <div className="lp-steps">
            {STEPS.map((s) => (
              <div key={s.n} className="lp-step">
                <div className="lp-step-num">{s.n}</div>
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section" id="features">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <span className="lp-section-tag">Features</span>
            <h2 className="lp-section-title">Everything you need, <span>nothing you don't</span></h2>
          </div>
          <div className="lp-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="lp-feature">
                <div className="lp-feature-icon">{f.icon}</div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section" id="preview">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <span className="lp-section-tag">Preview</span>
            <h2 className="lp-section-title">Itineraries that look <span>this good</span></h2>
            <p className="lp-section-sub">
              Real output from a 5-day Tokyo trip — map, weather, and budget included.
            </p>
          </div>
          <div className="lp-preview">
            <PreviewSlideshow />
            <div className="lp-preview-info">
              <h3 className="lp-preview-info-title">What you'll get</h3>
              <ul className="lp-preview-list">
                <li><span>📅</span> Day-by-day plan with times</li>
                <li><span>🏨</span> 3–5 hotels with prices</li>
                <li><span>💰</span> Full budget breakdown</li>
                <li><span>🗺️</span> Live map with route</li>
                <li><span>🌦️</span> Weather-aware reshuffling</li>
                <li><span>📄</span> One-click PDF export</li>
                <li><span>🔗</span> Public share links</li>
                <li><span>📓</span> Field journal view</li>
              </ul>
              <button className="lp-cta" type="button" onClick={handlePlanTrip}>
                Try it free →
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-stats-section">
        <div className="lp-section-inner">
          <div className="lp-stats">
            <div className="lp-stat"><div className="lp-stat-value">8+</div><div className="lp-stat-label">APIs integrated</div></div>
            <div className="lp-stat"><div className="lp-stat-value">2</div><div className="lp-stat-label">AI providers</div></div>
            <div className="lp-stat"><div className="lp-stat-value">25</div><div className="lp-stat-label">Currencies</div></div>
            <div className="lp-stat"><div className="lp-stat-value">~30s</div><div className="lp-stat-label">Average generation</div></div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-cta-section">
        <div className="lp-section-inner">
          <div className="lp-cta-card">
            <h2 className="lp-cta-title">Ready to plan your next adventure?</h2>
            <p className="lp-cta-sub">Free, fast, and no credit card. Just tell us where and we'll do the rest.</p>
            <button className="lp-cta" type="button" onClick={handlePlanTrip}>
              ✨ Start Planning — It's Free
            </button>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-content">
          <div className="lp-footer-brand">
            <h3>AI Travel Planner</h3>
            <p>Your AI-powered travel companion. Plan less, explore more.</p>
          </div>
          <div className="lp-footer-links">
            <div className="lp-footer-column">
              <h4>Product</h4>
              <ul>
                <li><Link to="/trips/new">Create Trip</Link></li>
                <li><Link to="/trips">My Trips</Link></li>
                <li><Link to="/weather">Weather</Link></li>
                <li><Link to="/journal">Journal</Link></li>
              </ul>
            </div>
            <div className="lp-footer-column">
              <h4>Account</h4>
              <ul>
                <li><Link to="/profile">Profile</Link></li>
                <li><Link to="/dashboard">Dashboard</Link></li>
                <li><Link to="/login">Sign in</Link></li>
                <li><Link to="/register">Get Started</Link></li>
              </ul>
            </div>
            <div className="lp-footer-column">
              <h4>Data</h4>
              <ul>
                <li><span>Open-Meteo</span></li>
                <li><span>OpenStreetMap</span></li>
                <li><span>Gemini · Groq</span></li>
                <li><span>Pexels</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <p>© {new Date().getFullYear()} AI Travel Planner. All rights reserved.</p>
          <p>Made with ❤️ for travelers</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;