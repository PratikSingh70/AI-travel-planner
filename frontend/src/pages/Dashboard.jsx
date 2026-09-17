import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="animate-fade-in-up">
          <p className="text-gray-500 mb-2">Welcome back,</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-ink">
            Hey {user?.name} 👋
          </h1>
          <p className="text-gray-500 mt-4 max-w-lg">
            Ready to plan your next adventure? Let AI handle the details.
          </p>
          <div className="flex gap-4 mt-8 flex-wrap">
            <Link
              to="/trips/new"
              className="px-6 py-3 rounded-full bg-lime text-forest font-bold hover:bg-lime-dark btn-press transition"
            >
              ✨ Create a Trip
            </Link>
            <Link
              to="/trips"
              className="px-6 py-3 rounded-full border border-gray-200 text-ink font-bold hover:border-ink transition"
            >
              View My Trips
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-12">
          {[
            { icon: "🤖", label: "AI Powered", value: "Gemini" },
            { icon: "🗺️", label: "Maps", value: "OpenStreetMap" },
            { icon: "🌤️", label: "Weather", value: "Open-Meteo" },
          ].map((s, i) => (
            <div
              key={i}
              className="border border-gray-100 rounded-2xl p-5 card-hover animate-fade-in-up"
              style={{ animationDelay: `${0.2 + i * 0.1}s` }}
            >
              <div className="text-3xl mb-2">{s.icon}</div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {s.label}
              </p>
              <p className="font-semibold mt-1 text-ink">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;