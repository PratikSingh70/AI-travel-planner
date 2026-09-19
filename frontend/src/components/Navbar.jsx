import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/trips/new", label: "Destinations", end: false },
  { to: "/weather-itinerary", label: "Weather", end: false },
  { to: "/trips", label: "My Trips", end: false },
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");

  const menuRef = useRef(null);

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
              <NavLink
                key={l.label}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `nb-link ${isActive ? "active" : ""}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>

          {/* Right side */}
          {user ? (
            <div className="nb-auth">
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
              <NavLink
                key={l.label}
                to={l.to}
                end={l.end}
                onClick={closeMobile}
                className={({ isActive }) =>
                  `nb-mobile-link ${isActive ? "active" : ""}`
                }
              >
                {l.label}
              </NavLink>
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
    </>
  );
};

export default Navbar;