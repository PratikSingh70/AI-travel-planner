import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const Trips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await api.get("/trips");
        setTrips(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load trips");
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, []);

  if (loading) return <p className="p-8">Loading trips...</p>;
  if (error) return <p className="p-8 text-red-600">{error}</p>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Trips</h1>
          <Link
            to="/trips/new"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + New Trip
          </Link>
        </div>

        {trips.length === 0 ? (
          <div className="bg-white p-8 rounded shadow text-center">
            <p className="text-gray-600 mb-4">
              You haven't created any trips yet.
            </p>
            <Link
              to="/trips/new"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Create your first trip
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {trips.map((trip) => (
              <Link
                key={trip._id}
                to={`/trips/${trip._id}`}
                className="bg-white p-5 rounded shadow hover:shadow-md transition"
              >
                <h2 className="text-lg font-semibold">{trip.destination}</h2>
                <p className="text-sm text-gray-600">
                  {new Date(trip.startDate).toLocaleDateString()} →{" "}
                  {new Date(trip.endDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  Budget: ₹{trip.budget} · {trip.travellers} traveller
                  {trip.travellers > 1 ? "s" : ""}
                </p>
                {trip.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {trip.interests.map((tag) => (
                      <span
                        key={tag}
                        className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Trips;