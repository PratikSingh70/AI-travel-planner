import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 rounded-full bg-lime flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="white" />
        <path
          d="M3 12c1.5-2 3-3 5-2s3.5 3 6 3 4-1 5-3"
          stroke="#A8D84A"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
    <span className="text-xl font-bold text-ink tracking-tight">
      AI Travel Planner
    </span>
  </div>
);

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (p) => location.pathname === p;

  const pill = (path) =>
    `px-5 py-2 rounded-full border text-sm font-medium transition ${
      isActive(path)
        ? "border-ink bg-ink text-white"
        : "border-gray-200 text-ink hover:border-forest"
    }`;

  const initials = (user?.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/">
          <Logo />
        </Link>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to="/trips/new" className={pill("/trips/new")}>
                + Create Trip
              </Link>
              <Link to="/trips" className={pill("/trips")}>
                My Trips
              </Link>
              <Link
                to="/profile"
                title="Your profile"
                className={`w-10 h-10 rounded-full bg-lime flex items-center justify-center text-forest font-bold ml-1 transition ${
                  isActive("/profile")
                    ? "ring-2 ring-forest"
                    : "hover:ring-2 hover:ring-forest"
                }`}
              >
                {initials}
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-ink transition ml-1"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-5 py-2 text-sm font-medium text-ink hover:text-lime-dark transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-6 py-2.5 rounded-full bg-lime text-forest text-sm font-bold hover:bg-lime-dark btn-press transition"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-ink p-2"
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-fade-in-up">
          <div className="flex flex-col p-4 gap-2">
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setIsOpen(false)} className={pill("/dashboard")}>
                  Dashboard
                </Link>
                <Link to="/trips" onClick={() => setIsOpen(false)} className={pill("/trips")}>
                  My Trips
                </Link>
                <Link
                  to="/trips/new"
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-lime text-forest text-sm font-bold text-center"
                >
                  + Create Trip
                </Link>
                <Link to="/profile" onClick={() => setIsOpen(false)} className={pill("/profile")}>
                  👤 My Profile
                </Link>
                <div className="flex items-center gap-3 px-3 pt-3 border-t border-gray-100 mt-2">
                  <div className="w-10 h-10 rounded-full bg-lime flex items-center justify-center text-forest font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="px-5 py-2 rounded-full border border-gray-200 text-ink text-sm font-medium mt-2"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsOpen(false)} className={pill("/login")}>
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-lime text-forest text-sm font-bold text-center"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;