import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <section className="bg-lime-light rounded-b-[3rem] pt-16 pb-32 px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          {/* Brand row */}
          <div className="inline-flex items-center gap-3 mb-10 animate-fade-in-up">
            <div className="w-14 h-14 rounded-full bg-lime flex items-center justify-center">
              <svg width="30" height="30" viewBox="0 0 24 24">
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
            <span className="text-2xl font-extrabold text-ink">Travely</span>
            <span className="px-5 py-2 rounded-full bg-forest text-white text-sm font-semibold">
              v1.0
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-ink leading-[1.05] animate-fade-in-up delay-100">
            Turn Your Dream Trips
            <br />
            <span className="text-lime-dark">Into Reality</span>
          </h1>

          {/* Sub-headline */}
          <p className="mt-8 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
            Stop endlessly searching. Let AI craft your perfect itinerary so you
            can explore more and stress less.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex justify-center gap-4 flex-wrap animate-fade-in-up delay-300">
            <Link
              to={user ? "/trips/new" : "/register"}
              className="px-8 py-4 rounded-full bg-lime text-forest font-bold text-lg hover:bg-lime-dark btn-press transition shadow-lg"
            >
              {user ? "Plan a New Trip" : "Get Started Free"}
            </Link>
            {!user && (
              <Link
                to="/login"
                className="px-8 py-4 rounded-full border-2 border-ink text-ink font-bold text-lg hover:bg-ink hover:text-white transition"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Feature Highlights */}
          <ul className="mt-12 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 text-base md:text-lg text-ink font-medium">
            {[
              "Tailored to Your Vibe",
              "Zero Planning Burnout",
              "Endless New Discoveries",
            ].map((text, i) => (
              <li
                key={i}
                className="flex items-center gap-3 animate-fade-in-up"
                style={{ animationDelay: `${(i + 4) * 0.1}s` }}
              >
                <span className="w-7 h-7 rounded-full bg-lime flex items-center justify-center text-forest text-sm font-bold flex-shrink-0">
                  ✓
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Phone mockups */}
        <div className="mt-20 flex justify-center gap-6 animate-fade-in-up delay-500">
          <div className="hidden md:block w-64 rounded-[2.5rem] border-[10px] border-forest bg-white overflow-hidden shadow-2xl">
            <div className="bg-forest text-white text-xs px-4 py-2 flex justify-between">
              <span>19:27</span>
              <span>◉ ◉ ▮▮</span>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-400">Hi, Jonathan</p>
              <p className="text-sm font-bold text-ink">📍 Chennai, New York</p>
              <div className="mt-3 bg-gray-100 rounded-full px-3 py-2 text-xs text-gray-500">
                Search...
              </div>
              <div className="flex gap-2 mt-3 text-xs">
                <span className="px-3 py-1 rounded-full bg-lime text-forest font-semibold">
                  Adventure
                </span>
                <span className="px-3 py-1 rounded-full bg-gray-100">Beach</span>
              </div>
              <p className="text-xs font-bold mt-4 mb-2">Most Popular</p>
              <img
                src="https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=400"
                className="w-full h-32 object-cover rounded-xl"
                alt="Venice"
              />
              <p className="text-xs font-semibold mt-2">Venice Grand Canal</p>
              <p className="text-xs text-gray-400">From ₹1339/Person</p>
            </div>
          </div>

          <div className="w-64 rounded-[2.5rem] border-[10px] border-forest bg-white overflow-hidden shadow-2xl">
            <div className="bg-forest text-white text-xs px-4 py-2 flex justify-between">
              <span>19:27</span>
              <span>◉ ◉ ▮▮</span>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-400">Sign In</p>
              <p className="text-sm font-bold text-ink mt-1 mb-3">
                Welcome back
              </p>
              <div className="bg-gray-100 rounded-lg px-3 py-2 text-xs text-gray-500 mb-2">
                Email address
              </div>
              <div className="bg-gray-100 rounded-lg px-3 py-2 text-xs text-gray-500 mb-3">
                Password
              </div>
              <button className="w-full bg-lime text-forest text-xs font-bold py-2 rounded-lg">
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold text-ink mb-6">
          Ready to plan your trip?
        </h2>
        <Link
          to={user ? "/trips/new" : "/register"}
          className="inline-block px-10 py-4 rounded-full bg-lime text-forest font-bold text-lg hover:bg-lime-dark btn-press transition"
        >
          {user ? "Create a Trip" : "Start Planning Free"}
        </Link>
      </section>
    </div>
  );
};

export default Landing;