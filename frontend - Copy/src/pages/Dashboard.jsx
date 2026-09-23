import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

const formatINR = (value) => {
  const n = Number(value) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
};

const DashboardSkeleton = () => (
  <div className="dash-root">
    <div className="dash-orb-1" />
    <div className="dash-orb-2" />
    <div className="dash-page">
      <Skeleton variant="text" width={130} height={14} />
      <div style={{ marginTop: 12 }}>
        <Skeleton variant="rectangular" width="55%" height={48} rounded="12px" />
      </div>
      <div style={{ marginTop: 20 }}>
        <Skeleton variant="text" width="80%" height={16} />
      </div>
      <div className="dash-ctas">
        <Skeleton variant="rectangular" width={180} height={48} rounded="14px" />
        <Skeleton variant="rectangular" width={170} height={48} rounded="14px" />
      </div>
      <div className="dash-stats">
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ padding: 22 }}>
            <Skeleton variant="circular" width={30} height={30} />
            <div style={{ marginTop: 14 }}>
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
    <div className="dash-root">
      <div className="dash-orb-1" />
      <div className="dash-orb-2" />

      <main className="dash-page">
        <div className="dash-tag">
          <span className="dash-pulse" />
          Welcome back
        </div>

        <h1 className="dash-title">
          Hey {user?.name?.split(" ")[0] || "traveller"} <span>👋</span>
        </h1>
        <p className="dash-subtitle">
          Ready to plan your next adventure? Let AI handle the details.
        </p>

        <div className="dash-ctas">
          <Link to="/trips/new" className="dash-btn-primary">
            ✨ Create a Trip
          </Link>
          <Link to="/trips" className="dash-btn-ghost">
            View My Trips
          </Link>
        </div>

        <div className="dash-stats">
          <div className="dash-stat">
            <div className="dash-stat-icon">🗺️</div>
            <div className="dash-stat-label">Total Trips</div>
            <div className="dash-stat-value">{trips.length}</div>
          </div>

          <div className="dash-stat">
            <div className="dash-stat-icon">💰</div>
            <div className="dash-stat-label">Total Budget</div>
            <div className="dash-stat-value accent">
              {formatINR(totalBudget)}
            </div>
          </div>

          <div className="dash-stat">
            <div className="dash-stat-icon">📅</div>
            <div className="dash-stat-label">Upcoming Trips</div>
            <div className="dash-stat-value">{upcomingTrips}</div>
          </div>
        </div>

        {recentTrips.length > 0 && (
          <section>
            <div className="dash-section-head">
              <h2 className="dash-section-title">
                Recent <span>Trips</span>
              </h2>
              <Link to="/trips" className="dash-section-link">
                View all →
              </Link>
            </div>

            <div className="dash-grid">
              {recentTrips.map((t) => {
                const days = Math.max(
                  1,
                  Math.round(
                    (new Date(t.endDate) - new Date(t.startDate)) / (1000 * 60 * 60 * 24)
                  )
                );
                return (
                  <Link key={t._id} to={`/trips/${t._id}`} className="dash-trip">
                    <div className="dash-trip-img">
                      <img
                        src={t.image || `https://picsum.photos/seed/${encodeURIComponent(t.destination)}/600/450`}
                        alt={t.destination}
                        onError={(e) => {
                          e.target.src = `https://picsum.photos/seed/${encodeURIComponent(t.destination)}/600/450`;
                        }}
                      />
                    </div>
                    <div className="dash-trip-body">
                      <h3 className="dash-trip-name">{t.destination}</h3>
                      <p className="dash-trip-meta">
                        {days} Day{days > 1 ? "s" : ""} · {formatINR(t.budget)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;