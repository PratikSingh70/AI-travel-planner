import TripMap from "../components/TripMap";
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios";

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [weather, setWeather] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const res = await api.get(`/trips/${id}`);
        setTrip(res.data);

        // places (fire & forget)
        api
          .get(`/trips/${id}/places`)
          .then((r) => setPlaces(r.data.places || []))
          .catch(() => setPlaces([]))
          .finally(() => setLoadingPlaces(false));

        // cover image
        api
          .get(`/trips/${id}/image`)
          .then((r) => setCoverImage(r.data.imageUrl))
          .catch(() => setCoverImage(null));

        // weather
        api
          .get(`/trips/${id}/weather`)
          .then((w) => setWeather(w.data))
          .catch(() => setWeather(null));
      } catch (err) {
        setError(err.response?.data?.message || "Could not load trip");
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this trip?")) return;
    try {
      await api.delete(`/trips/${id}`);
      navigate("/trips");
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const handleGenerate = async () => {
    setGenError("");
    setGenerating(true);
    try {
      const res = await api.post(`/trips/${id}/generate`);
      setTrip({ ...trip, itinerary: res.data.itinerary });
    } catch (err) {
      setGenError(
        err.response?.data?.message ||
          "AI generation failed. Check the backend logs."
      );
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <p className="p-8">Loading...</p>;
  if (error) return <p className="p-8 text-red-600">{error}</p>;
  if (!trip) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <Link to="/trips" className="text-blue-600 hover:underline text-sm">
          ← Back to trips
        </Link>

        {/* HERO HEADER */}
        <div className="relative mt-4 mb-6 rounded-lg overflow-hidden h-56 bg-gradient-to-r from-blue-600 to-purple-600">
          {coverImage && (
            <img
              src={coverImage}
              alt={trip.destination}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
              onError={() => setCoverImage(null)}
            />
          )}
          <div className="relative h-full flex flex-col justify-end p-6 text-white">
            <h1 className="text-4xl font-bold drop-shadow">
              {trip.destination}
            </h1>
            <p className="text-white/90 drop-shadow">
              {new Date(trip.startDate).toLocaleDateString()} →{" "}
              {new Date(trip.endDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* BUDGET + TRAVELLERS */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-sm text-gray-500">Budget</p>
            <p className="text-lg font-semibold">₹{trip.budget}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-sm text-gray-500">Travellers</p>
            <p className="text-lg font-semibold">{trip.travellers}</p>
          </div>
        </div>

        {/* INTERESTS */}
        {trip.interests.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">Interests</p>
            <div className="flex flex-wrap gap-2">
              {trip.interests.map((tag) => (
                <span
                  key={tag}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* MAP + WEATHER SECTION */}
        {weather && (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">
              Destination on the map
            </p>
            <TripMap
              lat={weather.location.lat}
              lng={weather.location.lng}
              label={trip.destination}
              places={places}
            />
            <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded">
              <p className="font-semibold">Current weather</p>
              <p className="text-3xl font-bold">
                {Math.round(weather.current.temperature_2m)}°C
              </p>
              <p className="text-sm text-gray-600">
                Wind: {weather.current.wind_speed_10m} km/h
              </p>
            </div>
          </div>
        )}

        {/* TOURIST PLACES */}
        <div className="mb-6 border-t pt-6">
          <h2 className="text-xl font-bold mb-4">
            📍 Famous Tourist Spots Nearby
          </h2>

          {loadingPlaces && (
            <p className="text-gray-500 text-sm">
              Searching nearby attractions...
            </p>
          )}

          {!loadingPlaces && places.length === 0 && (
            <p className="text-gray-500 text-sm">
              No attractions found nearby. Try a more specific destination.
            </p>
          )}

          {places.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {places.map((p) => (
                <div
                  key={p.id}
                  className="bg-white border border-gray-200 p-4 rounded hover:shadow-sm transition"
                >
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-gray-800">{p.name}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {p.type}
                    </span>
                  </div>
                  {p.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {p.description}
                    </p>
                  )}
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                  >
                    View on map →
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI SECTION */}
        <div className="border-t pt-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">AI Itinerary</h2>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-60"
            >
              {generating
                ? "Generating..."
                : trip.itinerary?.length
                ? "Regenerate"
                : "✨ Generate AI Itinerary"}
            </button>
          </div>

          {genError && (
            <p className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">
              {genError}
            </p>
          )}

          {generating && (
            <p className="text-gray-600 text-sm mb-4">
              Gemini is planning your trip... this usually takes 5–15 seconds.
            </p>
          )}

          {!generating && (!trip.itinerary || trip.itinerary.length === 0) && (
            <p className="text-gray-500 text-sm">
              No itinerary yet. Click the button to generate one with AI.
            </p>
          )}

          {trip.itinerary && trip.itinerary.length > 0 && (
            <div className="space-y-6">
              {trip.itinerary.map((day) => (
                <div
                  key={day.day}
                  className="border-l-4 border-purple-500 pl-4"
                >
                  <h3 className="font-semibold text-lg mb-1">
                    Day {day.day}{" "}
                    <span className="text-sm text-gray-500 font-normal">
                      {day.date}
                    </span>
                  </h3>
                  <div className="space-y-3 mt-2">
                    {day.activities.map((act, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 p-3 rounded border border-gray-200"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <p className="text-xs text-purple-600 font-semibold">
                              {act.time}
                            </p>
                            <p className="font-medium">{act.title}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {act.description}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              📍 {act.location}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                            ₹{act.cost}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DELETE */}
        <div className="border-t pt-6 mt-6">
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Delete Trip
          </button>
        </div>
      </div>
    </div>
  );
};

export default TripDetail;