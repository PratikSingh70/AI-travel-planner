import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTripActions } from "../context/TripActionsContext";
import "./Navbar.css";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/trips/new", label: "Create" },
  { to: "/trips", label: "My Trips" },
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
  const [pdfState, setPdfState] = useState("idle");

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
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.09);
  };

  const sPing = (t) => {
    const ctx = getAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(1200, t);
    o.frequency.exponentialRampToValueAtTime(1188, t + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.46);
  };

  const sVictory = (t) => {
    const ctx = getAudio();
    if (!ctx) return;
    const notes = [784, 988, 1174];
    notes.forEach((freq, i) => {
      const st = t + i * 0.06;
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.08, st + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(st);
      o.stop(st + 0.55);
    });
  };

  const playPDFSounds = () => {
    const ctx = getAudio();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    sPress(t);
    sPing(t + 0.15);
    sVictory(t + 0.35);
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
    if (pdfState !== "idle") return;

    setPdfState("loading");
    playPDFSounds();

    setTimeout(() => {
      setPdfState("done");
      runPDFExport();
    }, 900);

    setTimeout(() => setPdfState("idle"), 3600);
  };

  /* ─── Nav helpers ─── */
  const isLinkActive = (to) => {
    if (to === "/") return path === "/";
    if (to === "/trips/new") return path === "/trips/new";
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
          <Link to="/" className="nb-brand" onClick={closeMobile}>
            <span className="nb-brand-text">
              AI Travel <span className="nb-brand-accent">Planner</span>
            </span>
          </Link>

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

          {user ? (
            <div className="nb-auth">
              <Link to="/profile" className="nb-avatar" title={user.name}>
                {initials}
              </Link>
              <button type="button" className="nb-logout" onClick={handleLogout}>
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
                          disabled={pdfState !== "idle"}
                        >
                          <span className="nb-menu-icon">📄</span>
                          <span>
                            {pdfState === "loading"
                              ? "Preparing PDF…"
                              : pdfState === "done"
                              ? "PDF Downloaded!"
                              : "Export PDF"}
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
            <button type="button" className="nb-mobile-logout" onClick={handleShare}>
              🔗 Share this page
            </button>
            <button type="button" className="nb-mobile-logout" onClick={handleCopyLink}>
              📋 Copy link
            </button>
          </div>

          {user ? (
            <>
              <Link to="/profile" className="nb-mobile-user" onClick={closeMobile}>
                <span className="nb-avatar">{initials}</span>
                <span className="nb-mobile-user-info">
                  <span className="nb-mobile-user-name">{user.name}</span>
                  <span className="nb-mobile-user-email">{user.email}</span>
                </span>
              </Link>
              <div className="nb-mobile-actions">
                <button type="button" className="nb-mobile-logout" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="nb-mobile-actions">
              <Link to="/register" className="nb-mobile-cta" onClick={closeMobile}>
                Get Started
              </Link>
              <Link to="/login" className="nb-mobile-cta-ghost" onClick={closeMobile}>
                Login
              </Link>
            </div>
          )}
        </div>
      </nav>

      {toast && <div className="nb-toast">{toast}</div>}

      {pdfState !== "idle" && (
        <div className={`pdf-toast ${pdfState}`} role="status" aria-live="polite">
          <div className="pdf-toast__icon">
            {pdfState === "loading" ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                strokeLinejoin="round" className="pdf-toast__spinner">
                <path d="M21 12a9 9 0 1 1-6.2-8.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"
                strokeLinejoin="round" className="pdf-toast__check">
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
            )}
          </div>
          <div className="pdf-toast__text">
            <div className="pdf-toast__title">
              {pdfState === "loading" ? "Preparing PDF" : "PDF Downloaded"}
            </div>
            <div className="pdf-toast__sub">
              {pdfState === "loading"
                ? "Just a moment…"
                : "Check your downloads folder"}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;