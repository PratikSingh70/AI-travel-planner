import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-white py-12 px-6">
    <div className="max-w-4xl mx-auto">
      <Skeleton variant="text" width={130} height={14} />
      <div style={{ marginTop: 12 }}>
        <Skeleton variant="rectangular" width="55%" height={48} rounded="12px" />
      </div>
      <div style={{ marginTop: 20 }}>
        <Skeleton variant="text" width="80%" height={16} />
      </div>
      <div className="flex gap-4 mt-8 flex-wrap">
        <Skeleton variant="rectangular" width={180} height={48} rounded="9999px" />
        <Skeleton variant="rectangular" width={170} height={48} rounded="9999px" />
      </div>
      <div className="grid md:grid-cols-3 gap-4 mt-12">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-gray-100 rounded-2xl p-5">
            <Skeleton variant="circular" width={40} height={40} />
            <div style={{ marginTop: 12 }}>
              <Skeleton variant="text" width="60%" height={12} />
            </div>
            <div style={{ marginTop: 10 }}>
              <Skeleton variant="rectangular" width="40%" height={28} rounded="6px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/trips")
      .then((r) => setTrips(r.data || []))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  const totalBudget = trips.reduce((sum, t) => sum + (Number(t.budget) || 0), 0);
  const upcomingTrips = trips.filter((t) => new Date(t.startDate) > new Date()).length;

  const recentTrips = [...trips]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

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
              className="px-6 py-3 rounded-full border border-gray-200 text-ink font-bold hover:border-forest transition"
            >
              View My Trips
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-12">
          <div
            className="border border-gray-100 rounded-2xl p-5 card-hover animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="text-3xl mb-2">🗺️</div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Trips</p>
            <p className="font-bold text-ink text-2xl mt-1">{trips.length}</p>
          </div>

          <div
            className="border border-gray-100 rounded-2xl p-5 card-hover animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="text-3xl mb-2">💰</div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Budget</p>
            <p className="font-bold text-ink text-2xl mt-1">
              ₹{totalBudget.toLocaleString()}
            </p>
          </div>

          <div
            className="border border-gray-100 rounded-2xl p-5 card-hover animate-fade-in-up"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="text-3xl mb-2">📅</div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Upcoming Trips</p>
            <p className="font-bold text-ink text-2xl mt-1">{upcomingTrips}</p>
          </div>
        </div>

        {recentTrips.length > 0 && (
          <div className="mt-12 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-2xl font-extrabold text-ink">Recent Trips</h2>
              <Link to="/trips" className="text-sm text-lime-dark font-semibold hover:underline">
                View all →
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {recentTrips.map((t) => {
                const days = Math.max(
                  1,
                  Math.round(
                    (new Date(t.endDate) - new Date(t.startDate)) / (1000 * 60 * 60 * 24)
                  )
                );
                return (
                  <Link
                    key={t._id}
                    to={`/trips/${t._id}`}
                    className="group border border-gray-100 rounded-2xl overflow-hidden card-hover"
                  >
                    <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                      <img
                        src={t.image || `https://picsum.photos/seed/${encodeURIComponent(t.destination)}/600/450`}
                        alt={t.destination}
                        className="w-full h-full object-cover img-zoom"
                        onError={(e) => {
                          e.target.src = `https://picsum.photos/seed/${encodeURIComponent(t.destination)}/600/450`;
                        }}
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-ink">{t.destination}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {days} Day{days > 1 ? "s" : ""} · ₹
                        {t.budget?.toLocaleString?.() || t.budget}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;