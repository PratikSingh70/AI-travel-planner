import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const Trips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/trips")
      .then((r) => setTrips(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-white py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold text-ink mb-12 animate-fade-in-up">
          My Trips
        </h1>

        {trips.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <p className="text-gray-500 mb-6">No trips yet.</p>
            <Link
              to="/trips/new"
              className="inline-block px-6 py-3 rounded-lg bg-ink text-white font-bold"
            >
              + Create your first trip
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-3">
            {trips.map((trip, i) => {
              const days = Math.max(
                1,
                Math.round(
                  (new Date(trip.endDate) - new Date(trip.startDate)) /
                    (1000 * 60 * 60 * 24)
                )
              );
              const budgetLabel =
                trip.budget < 20000
                  ? "Cheap"
                  : trip.budget < 50000
                  ? "Moderate"
                  : "Luxury";

              // Use Pexels image if available, else fallback
              const imgUrl =
                trip.image ||
                `https://picsum.photos/seed/${encodeURIComponent(
                  trip.destination
                )}/600/450`;

              return (
                <Link
                  key={trip._id}
                  to={`/trips/${trip._id}`}
                  className="block group card-hover animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100">
                    <img
                      src={imgUrl}
                      alt={trip.destination}
                      className="w-full h-full object-cover img-zoom"
                      onError={(e) => {
                        e.target.src = `https://picsum.photos/seed/${encodeURIComponent(
                          trip.destination
                        )}/600/450`;
                      }}
                    />
                  </div>
                  <h3 className="mt-4 font-extrabold text-ink text-lg">
                    {trip.destination}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {days} Days trip with {budgetLabel} Budget
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Trips;