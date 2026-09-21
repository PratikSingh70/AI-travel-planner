import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTripActions } from "../context/TripActionsContext";
import CurrencyToggle from "./CurrencyToggle";
import "./Navbar.css";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/trips/new", label: "Create" },
  { to: "/trips", label: "My Trips" },
  { to: "/compare", label: "Compare" },
  { to: "/weather", label: "Weather" },
  { to: "/journal", label: "Journal" },
];

const loadHtml2Pdf = () => {
  if (window.html2pdf) return Promise.resolve(window.html2pdf);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.onload = () => resolve(window.html2pdf);
    s.onerror = reject;
    document.head.appendChild(s);
  });
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { actions } = useTripActions();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [pdfAnim, setPdfAnim] = useState("idle"); // idle | dropping | done

  const menuRef = useRef(null);
  const audioRef = useRef({ ac: null, noiseBuf: null });
  const path = location.pathname;

  /* ─── Audio helpers ─── */
  const getAudio = () => {
    const a = audioRef.current;
    if (!a.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      a.ac = new AC();
      const len = a.ac.sampleRate * 1.5;
      a.noiseBuf = a.ac.createBuffer(1, len, a.ac.sampleRate);
      const d = a.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (a.ac.state === "suspended") a.ac.resume();
    return a.ac;
  };

  useEffect(() => {
    const unlock = () => {
      getAudio();
      window.removeEventListener("pointerdown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const sPress = (t) => {
    const ctx = getAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(820, t);
    o.frequency.exponentialRampToValueAtTime(230, t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.085, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.09);
  };

  const sDescent = (t, dur) => {
    const ctx = getAudio();
    if (!ctx) return;
    const a = audioRef.current;
    const n = ctx.createBufferSource();
    n.buffer = a.noiseBuf;
    n.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.7;
    bp.frequency.setValueAtTime(3200, t);
    bp.frequency.exponentialRampToValueAtTime(640, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.1);
    g.gain.linearRampToValueAtTime(0.085, t + dur * 0.68);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    n.connect(bp).connect(g).connect(ctx.destination);
    n.start(t);
    n.stop(t + dur + 0.06);
  };

  const sThud = (t) => {
    const ctx = getAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.38, t + 0.009);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.33);
  };

  const sPing = (t) => {
    const ctx = getAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(1200, t);
    o.frequency.exponentialRampToValueAtTime(1188, t + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.135, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.52);
  };

  const sVictory = (t) => {
    const ctx = getAudio();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const st = t + i * 0.075;
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.095, st + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.72);
      o.connect(g).connect(ctx.destination);
      o.start(st);
      o.stop(st + 0.78);
    });
  };

  const playPDFSounds = () => {
    const ctx = getAudio();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    sPress(t);
    sDescent(t + 0.1, 1.6);
    sThud(t + 1.85);
    sPing(t + 2.0);
    sVictory(t + 2.25);
  };

  /* ─── PDF export ─── */
  const runPDFExport = async () => {
    const target = document.getElementById("itineraryPaper");
    const holder = document.getElementById("itnHolder");
    if (!target) {
      console.warn("[Navbar PDF] target #itineraryPaper not found");
      return;
    }
    if (holder) holder.classList.add("is-exporting");
    await new Promise((r) => setTimeout(r, 250));

    try {
      const html2pdf = await loadHtml2Pdf();
      const filename = actions?.trip?.destination
        ? `${actions.trip.destination.replace(/\s+/g, "-")}-itinerary.pdf`
        : "itinerary.pdf";

      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: {
            mode: ["css", "legacy"],
            avoid: [".itn-day", ".itn-hotel", ".itn-table tr", ".itn-foot"],
          },
        })
        .from(target)
        .save();
    } catch (err) {
      console.error("[Navbar PDF] failed:", err);
      window.print();
    } finally {
      if (holder) holder.classList.remove("is-exporting");
    }
  };

  const handleTripPDF = () => {
    setMenuOpen(false);
    if (pdfAnim !== "idle") return;

    setPdfAnim("dropping");
    playPDFSounds();

    setTimeout(() => setPdfAnim("done"), 2000);
    setTimeout(() => runPDFExport(), 2300);
    setTimeout(() => setPdfAnim("idle"), 4800);
  };

  /* ─── Nav helpers ─── */
  const isLinkActive = (to) => {
    if (to === "/") return path === "/";
    if (to === "/trips/new") return path === "/trips/new";
    if (to === "/compare") return path === "/compare";
    if (to === "/weather")
      return path.startsWith("/weather") || path.includes("/weather-itinerary");
    if (to === "/journal")
      return path.startsWith("/journal") || path.includes("/journal");
    if (to === "/trips") {
      if (path === "/trips/new") return false;
      if (path.includes("/weather-itinerary")) return false;
      if (path.includes("/journal")) return false;
      return path === "/trips" || path.startsWith("/trips/");
    }
    return path.startsWith(to);
  };

  const handleLogout = () => {
    setOpen(false);
    setMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  const initials = (user?.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const closeMobile = () => setOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(""), 2000);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = document.title || "AI Travel Planner";

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        setMenuOpen(false);
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard");
    } catch {
      showToast("Could not copy link");
    }
    setMenuOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Link copied");
    } catch {
      showToast("Could not copy");
    }
    setMenuOpen(false);
  };

  const handleProfile = () => {
    setMenuOpen(false);
    navigate("/profile");
  };

  const handleTripCalendar = () => {
    setMenuOpen(false);
    if (actions?.onCalendar) actions.onCalendar();
  };

  const handleTripCoverArt = () => {
    setMenuOpen(false);
    if (actions?.onCoverArt) actions.onCoverArt();
  };

  const handleTripJournal = () => {
    setMenuOpen(false);
    if (actions?.trip?._id) navigate(`/trips/${actions.trip._id}/journal`);
  };

  const handleTripShare = () => {
    setMenuOpen(false);
    if (actions?.onShare) actions.onShare();
  };

  return (
    <>
      <nav className="nb-root">
        <div className="nb-inner">
          {/* Brand */}
          <Link to="/" className="nb-brand" onClick={closeMobile}>
            <span className="nb-brand-text">
              AI Travel <span className="nb-brand-accent">Planner</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="nb-links">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className={`nb-link ${isLinkActive(l.to) ? "active" : ""}`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          {user ? (
            <div className="nb-auth">
              <CurrencyToggle />
              <Link
                to="/profile"
                className="nb-avatar"
                title={user.name}
                aria-label="Your profile"
              >
                {initials}
              </Link>

              <button
                type="button"
                className="nb-logout"
                onClick={handleLogout}
              >
                Logout
              </button>

              <div className="nb-menu-wrap" ref={menuRef}>
                <button
                  type="button"
                  className={`nb-menu-btn ${menuOpen ? "open" : ""}`}
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="More options"
                  aria-expanded={menuOpen}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="12" cy="19" r="1.8" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="nb-menu">
                    {actions ? (
                      <>
                        <div className="nb-menu-label">Trip actions</div>

                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleTripPDF}
                          disabled={pdfAnim !== "idle"}
                        >
                          <span className="nb-menu-icon">📄</span>
                          <span>
                            {pdfAnim === "dropping"
                              ? "Dropping your PDF…"
                              : pdfAnim === "done"
                              ? "PDF Downloaded!"
                              : "Export PDF"}
                          </span>
                        </button>

                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleTripCalendar}
                        >
                          <span className="nb-menu-icon">📅</span>
                          <span>Add to Calendar</span>
                        </button>

                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleTripCoverArt}
                          disabled={actions.generatingArt}
                        >
                          <span className="nb-menu-icon">🎨</span>
                          <span>
                            {actions.generatingArt
                              ? "Generating…"
                              : "Generate Cover Art"}
                          </span>
                        </button>

                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleTripJournal}
                        >
                          <span className="nb-menu-icon">📓</span>
                          <span>View Journal</span>
                        </button>

                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleTripShare}
                          disabled={actions.shareLoading}
                        >
                          <span className="nb-menu-icon">🔗</span>
                          <span>
                            {actions.shareLoading
                              ? "Creating..."
                              : "Share Trip"}
                          </span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleShare}
                        >
                          <span className="nb-menu-icon">🔗</span>
                          <span>Share this page</span>
                        </button>
                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleCopyLink}
                        >
                          <span className="nb-menu-icon">📋</span>
                          <span>Copy link</span>
                        </button>
                        <div className="nb-menu-divider" />
                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleProfile}
                        >
                          <span className="nb-menu-icon">👤</span>
                          <span>Profile</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="nb-auth">
              <CurrencyToggle />
              <Link to="/login" className="nb-cta-login">
                Login
              </Link>
              <Link to="/register" className="nb-cta-get-started">
                Get Started
              </Link>

              <div className="nb-menu-wrap" ref={menuRef}>
                <button
                  type="button"
                  className={`nb-menu-btn ${menuOpen ? "open" : ""}`}
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="More options"
                  aria-expanded={menuOpen}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="12" cy="19" r="1.8" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="nb-menu">
                    <button
                      type="button"
                      className="nb-menu-item"
                      onClick={handleShare}
                    >
                      <span className="nb-menu-icon">🔗</span>
                      <span>Share this page</span>
                    </button>
                    <button
                      type="button"
                      className="nb-menu-item"
                      onClick={handleCopyLink}
                    >
                      <span className="nb-menu-icon">📋</span>
                      <span>Copy link</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile toggle */}
          <button
            type="button"
            className="nb-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile panel */}
        <div className={`nb-mobile ${open ? "open" : ""}`}>
          <div className="nb-mobile-links">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                onClick={closeMobile}
                className={`nb-mobile-link ${isLinkActive(l.to) ? "active" : ""}`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="nb-mobile-actions">
            <button
              type="button"
              className="nb-mobile-logout"
              onClick={handleShare}
            >
              🔗 Share this page
            </button>
            <button
              type="button"
              className="nb-mobile-logout"
              onClick={handleCopyLink}
            >
              📋 Copy link
            </button>
          </div>

          {user ? (
            <>
              <Link
                to="/profile"
                className="nb-mobile-user"
                onClick={closeMobile}
              >
                <span className="nb-avatar">{initials}</span>
                <span className="nb-mobile-user-info">
                  <span className="nb-mobile-user-name">{user.name}</span>
                  <span className="nb-mobile-user-email">{user.email}</span>
                </span>
              </Link>
              <div className="nb-mobile-actions">
                <button
                  type="button"
                  className="nb-mobile-logout"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="nb-mobile-actions">
              <Link
                to="/register"
                className="nb-mobile-cta"
                onClick={closeMobile}
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="nb-mobile-cta-ghost"
                onClick={closeMobile}
              >
                Login
              </Link>
            </div>
          )}
        </div>
      </nav>

      {toast && <div className="nb-toast">{toast}</div>}

      {/* ═══════════ SMALL FLOATING PDF PANEL (top-right) ═══════════ */}
      {pdfAnim !== "idle" && (
        <div className={`pdf-mini ${pdfAnim}`} aria-hidden="true">
          <div className="pdf-mini__sky" />

          <div className="pdf-mini__para">
            <svg viewBox="0 0 40 46" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="miniCp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#C4E570" />
                  <stop offset="1" stopColor="#8FBF2E" />
                </linearGradient>
                <linearGradient id="miniCrate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ffe2a0" />
                  <stop offset="1" stopColor="#d99b2b" />
                </linearGradient>
                <linearGradient id="miniPack" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#A8D84A" />
                  <stop offset="1" stopColor="#1A2E1A" />
                </linearGradient>
              </defs>

              <g className="mini-canopy">
                <path
                  d="M20 1 C8 1 1 8 1 16 L39 16 C39 8 32 1 20 1 Z"
                  fill="url(#miniCp)"
                />
                <circle cx="7" cy="16" r="6" fill="url(#miniCp)" />
                <circle cx="20" cy="16" r="6" fill="url(#miniCp)" />
                <circle cx="33" cy="16" r="6" fill="url(#miniCp)" />
              </g>

              <g stroke="#DCF0A0" strokeWidth=".9" opacity=".85" fill="none">
                <line x1="7" y1="20" x2="17" y2="29" />
                <line x1="20" y1="21" x2="20" y2="29" />
                <line x1="33" y1="20" x2="23" y2="29" />
              </g>

              <g className="mini-crate">
                <rect x="15" y="24" width="10" height="6" rx="1.6" fill="url(#miniPack)" />
                <rect
                  x="11"
                  y="28"
                  width="18"
                  height="15"
                  rx="2.2"
                  fill="url(#miniCrate)"
                  stroke="#8a5a10"
                  strokeWidth=".9"
                />
              </g>
            </svg>
          </div>

          <div className="pdf-mini__shock" />

          {pdfAnim === "done" && (
            <div className="pdf-mini__badge">
              <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle
                  cx="20"
                  cy="20"
                  r="17"
                  fill="#1A2E1A"
                  stroke="#A8D84A"
                  strokeWidth="2.5"
                />
                <path
                  d="M11 20 L17 26 L29 13"
                  fill="none"
                  stroke="#A8D84A"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}

          <div className="pdf-mini__label">
            {pdfAnim === "dropping" ? "Dropping your PDF…" : "PDF Downloaded!"}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;