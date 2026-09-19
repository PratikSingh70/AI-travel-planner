import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Landing.css";

const Landing = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
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
      {/* ───── Background scene ───── */}
      <div className="lp-bg-scene" aria-hidden="true">
        <svg
          className="lp-landscape"
          viewBox="0 0 1440 620"
          preserveAspectRatio="xMidYMax slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="lpHillFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dbe8a2" stopOpacity=".75" />
              <stop offset="100%" stopColor="#dbe8a2" stopOpacity=".28" />
            </linearGradient>
            <linearGradient id="lpHillNear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cfe08c" stopOpacity=".68" />
              <stop offset="100%" stopColor="#cfe08c" stopOpacity=".22" />
            </linearGradient>
            <linearGradient id="lpPathG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eef5cf" stopOpacity=".9" />
              <stop offset="100%" stopColor="#eef5cf" stopOpacity=".35" />
            </linearGradient>
          </defs>

          <path
            d="M0 430 Q 180 310 360 385 T 720 355 T 1080 395 T 1440 345 L1440 620 L0 620 Z"
            fill="url(#lpHillFar)"
          />

          <path
            d="M700 620 C 660 540, 765 500, 722 440 C 692 390, 762 360, 730 318"
            fill="none"
            stroke="url(#lpPathG)"
            strokeWidth="44"
            strokeLinecap="round"
            opacity=".55"
          />

          <path
            d="M0 505 Q 220 405 440 472 T 880 452 T 1440 482 L1440 620 L0 620 Z"
            fill="url(#lpHillNear)"
          />

          {/* Palm tree #1 — left */}
          <g opacity=".5" fill="#adc766">
            <path d="M100 575 C 108 500, 135 435, 168 382 L 180 375 C 150 435, 128 500, 135 575 Z" />
            <path d="M174 378 C 160 340, 135 315, 100 305 C 130 325, 155 355, 172 385 Z" />
            <path d="M174 378 C 178 335, 185 305, 198 275 C 190 310, 182 345, 178 380 Z" />
            <path d="M174 378 C 200 345, 232 325, 268 320 C 235 340, 200 360, 178 382 Z" />
            <path d="M174 378 C 215 380, 258 395, 295 425 C 255 405, 212 388, 176 383 Z" />
            <path d="M174 378 C 200 405, 225 440, 240 485 C 220 445, 198 408, 176 383 Z" />
            <path d="M174 378 C 148 408, 122 445, 105 490 C 125 450, 150 412, 172 383 Z" />
            <path d="M174 378 C 135 385, 95 400, 60 425 C 98 408, 140 393, 172 383 Z" />
            <circle cx="172" cy="385" r="5" />
            <circle cx="180" cy="382" r="4.5" />
            <circle cx="176" cy="391" r="4" />
          </g>

          {/* Palm tree #2 — right */}
          <g opacity=".5" fill="#adc766">
            <path d="M1275 575 C 1280 510, 1288 450, 1290 405 L 1305 400 C 1305 450, 1302 510, 1308 575 Z" />
            <path d="M1297 402 C 1270 375, 1240 360, 1205 358 C 1235 370, 1265 385, 1295 405 Z" />
            <path d="M1297 402 C 1290 365, 1285 335, 1290 305 C 1300 340, 1302 370, 1300 405 Z" />
            <path d="M1297 402 C 1325 375, 1355 360, 1390 358 C 1360 370, 1330 385, 1300 405 Z" />
            <path d="M1297 402 C 1335 400, 1375 408, 1410 430 C 1370 418, 1332 408, 1300 405 Z" />
            <path d="M1297 402 C 1258 400, 1220 408, 1185 430 C 1225 418, 1262 408, 1294 405 Z" />
            <path d="M1297 402 C 1325 425, 1345 455, 1355 490 C 1338 458, 1318 430, 1300 405 Z" />
            <path d="M1297 402 C 1270 425, 1250 455, 1240 490 C 1258 458, 1278 430, 1295 405 Z" />
          </g>

          {/* Bushes */}
          <g opacity=".38" fill="#c6d98b">
            <ellipse cx="360" cy="562" rx="72" ry="30" />
            <ellipse cx="1080" cy="576" rx="92" ry="34" />
            <ellipse cx="620" cy="592" rx="60" ry="24" />
          </g>
        </svg>

        {/* Floating icons */}
        <span className="lp-floater p1">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </span>
        <span className="lp-floater p2">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
          </svg>
        </span>
        <span className="lp-floater p3">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </span>
        <span className="lp-floater p4">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
          </svg>
        </span>
        <span className="lp-floater p5">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </span>
        <span className="lp-floater p6">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 3C9 3 4 8 4 16c0 1.5.3 3 .8 4.2l1.6-.7C6.1 18.5 6 17.3 6 16c0-6 4-10 11-10h2V3h-2z" />
            <path d="M20 3v2c0 8-5 13-13 13H5l1 2h1c9 0 15-6 15-15V3h-2z" opacity=".5" />
          </svg>
        </span>
      </div>

      {/* ───── Topbar ───── */}
      <header className="lp-topbar">
        <div className="lp-topbar-inner">
          <Link to="/" className="lp-brand" aria-label="AI travel planner home">
            <span className="lp-brand-name">
              AI Travel <span className="lp-brand-accent">Planner</span>
            </span>
          </Link>

          <nav className="lp-mainnav" aria-label="Primary">
            <Link to="/" className="lp-active">Home</Link>
            <Link to="/trips/new">Destinations</Link>
            <Link to="/weather-itinerary">Weather</Link>
            <Link to="/trips">My Trips</Link>
          </nav>

          <div className="lp-user">
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="lp-avatar"
                  title={user.name}
                  aria-hidden="true"
                >
                  {initials}
                </Link>
                <button
                  className="lp-btn-logout"
                  type="button"
                  onClick={handleLogout}
                >
                  Logout
                </button>
                <button
                  className="lp-btn-more"
                  type="button"
                  aria-label="More options"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="12" cy="19" r="1.8" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="lp-auth-login">
                  Login
                </Link>
                <Link to="/register" className="lp-auth-cta">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ───── Main ───── */}
      <main className="lp-main">
        <h1 className="lp-headline">
          Turn Your Dream Trips
          <span className="lp-hl">Into Reality</span>
        </h1>

        <p className="lp-sub">
          Stop endlessly searching. Let AI craft your perfect itinerary so you
          can explore more and stress less.
        </p>

        <button className="lp-cta" type="button" onClick={handlePlanTrip}>
          Plan a New Trip
        </button>

        <ul className="lp-features">
          <li>
            <span className="lp-check" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#12200a"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            Tailored to Your Vibe
          </li>
          <li>
            <span className="lp-check" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#12200a"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            Zero Planning Burnout
          </li>
          <li>
            <span className="lp-check" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#12200a"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            Endless New Discoveries
          </li>
        </ul>
      </main>
    </div>
  );
};

export default Landing;