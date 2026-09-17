import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import TripMap from "../components/TripMap";

const Pill = ({ icon, children }) => (
  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-ink">
    <span className="w-5 h-5 rounded-full bg-lime flex items-center justify-center text-xs">
      {icon}
    </span>
    {children}
  </span>
);

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [weather, setWeather] = useState(null);
  const [places, setPlaces] = useState([]);
  const [coverImage, setCoverImage] = useState(null);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const res = await api.get(`/trips/${id}`);
        setTrip(res.data);

        api
          .get(`/trips/${id}/places`)
          .then((r) => setPlaces(r.data.places || []))
          .catch(() => {});
        api
          .get(`/trips/${id}/weather`)
          .then((w) => setWeather(w.data))
          .catch(() => {});
        api
          .get(`/trips/${id}/image`)
          .then((r) => setCoverImage(r.data.imageUrl))
          .catch(() => {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [id]);

  const handleGenerate = async () => {
    setGenError("");
    setGenerating(true);
    try {
      const res = await api.post(`/trips/${id}/generate`);
      setTrip({
        ...trip,
        itinerary: res.data.itinerary,
        hotels: res.data.hotels || [],
        budgetBreakdown: res.data.budgetBreakdown,
      });
    } catch (err) {
      setGenError(err.response?.data?.message || "AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  if (!trip) return null;

  const days = Math.max(
    1,
    Math.round(
      (new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24)
    )
  );
  const budgetLabel =
    trip.budget < 20000 ? "Cheap" : trip.budget < 50000 ? "Moderate" : "Luxury";

  const heroImg =
    coverImage ||
    `https://picsum.photos/seed/${encodeURIComponent(trip.destination)}/1600/700`;

  return (
    <div className="min-h-screen bg-white pb-20">
      {generating && (
        <div className="fixed bottom-6 right-6 bg-white border border-gray-200 rounded-2xl shadow-lg px-5 py-4 flex items-center gap-3 z-50 animate-fade-in-up">
          <span className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 dot-bounce" />
            <span className="w-2 h-2 rounded-full bg-blue-500 dot-bounce" />
            <span className="w-2 h-2 rounded-full bg-blue-500 dot-bounce" />
          </span>
          <span className="text-sm font-semibold text-ink">
            Please wait... We are working on it...
          </span>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 pt-8">
        <Link
          to="/trips"
          className="text-sm text-gray-500 hover:text-ink transition"
        >
          ← Back to trips
        </Link>

        <div className="mt-4 rounded-3xl overflow-hidden aspect-[21/9] bg-gray-100 animate-fade-in">
          <img
            src={heroImg}
            alt={trip.destination}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = `https://picsum.photos/seed/${encodeURIComponent(
                trip.destination
              )}/1600/700`;
            }}
          />
        </div>

        <div className="mt-8 flex justify-between items-start gap-4 animate-fade-in-up">
          <h1 className="text-3xl md:text-5xl font-extrabold text-ink">
            {trip.destination}
          </h1>
        </div>

        <div className="flex flex-wrap gap-3 mt-5 animate-fade-in-up delay-100">
          <Pill icon="📅">{days} Day{days > 1 ? "s" : ""}</Pill>
          <Pill icon="💰">{budgetLabel} Budget</Pill>
          <Pill icon="👥">No. Of Traveler: {trip.travellers}</Pill>
        </div>

        {genError && (
          <p className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mt-6 text-sm">
            {genError}
          </p>
        )}

        <div className="mt-8 animate-fade-in-up">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-8 py-3.5 rounded-lg bg-ink text-white font-bold hover:bg-black disabled:opacity-60 btn-press transition"
          >
            {generating
              ? "Generating..."
              : trip.itinerary?.length
              ? "Regenerate Trip"
              : "Generate Trip"}
          </button>
        </div>

        {/* HOTELS */}
        {trip.hotels?.length > 0 && (
          <section className="mt-16 animate-fade-in-up">
            <h2 className="text-2xl font-extrabold text-ink mb-6">
              Hotel Recommendation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {trip.hotels.map((h, i) => {
                const imgUrl =
                  h.image ||
                  `https://picsum.photos/seed/${encodeURIComponent(
                    h.name
                  )}/400/300`;
                return (
                  <div
                    key={i}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${i * 0.08}s` }}
                  >
                    <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100">
                      <img
                        src={imgUrl}
                        alt={h.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = `https://picsum.photos/seed/${encodeURIComponent(
                            h.name
                          )}/400/300`;
                        }}
                      />
                    </div>
                    <h3 className="mt-3 font-bold text-ink text-sm leading-tight">
                      {h.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-2">📍 {h.address}</p>
                    <p className="text-sm font-bold text-ink mt-2">
                      💰 {h.price}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      ⭐ {h.rating} stars
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* PLACES TO VISIT */}
        {trip.itinerary?.length > 0 && (
          <section className="mt-16 animate-fade-in-up">
            <h2 className="text-2xl font-extrabold text-ink mb-8">
              Places to Visit
            </h2>

            {trip.itinerary.map((day) => (
              <div key={day.day} className="mb-10">
                <h3 className="text-xl font-extrabold text-ink mb-5">
                  Day {day.day}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {day.activities.map((act, idx) => {
                    const imgUrl =
                      act.image ||
                      `https://picsum.photos/seed/${encodeURIComponent(
                        act.title
                      )}/200/200`;
                    return (
                      <div key={idx} className="flex flex-col">
                        <p className="text-red-600 text-sm font-bold mb-2">
                          {act.time}
                        </p>
                        <div className="flex gap-4 p-4 border border-gray-100 rounded-2xl card-hover bg-white">
                          <img
                            src={imgUrl}
                            alt={act.title}
                            className="w-24 h-24 md:w-28 md:h-28 rounded-xl object-cover flex-shrink-0"
                            onError={(e) => {
                              e.target.src = `https://picsum.photos/seed/${encodeURIComponent(
                                act.title
                              )}/200/200`;
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-ink text-base leading-tight">
                              {act.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                              {act.description}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              ⏱{" "}
                              {act.time?.split("-")[1]?.trim() || "Flexible"}
                            </p>
                            <p className="text-xs font-bold text-ink mt-1">
                              ₹ {act.cost} per person
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* TOURIST PLACES */}
        {places.length > 0 && (
          <section className="mt-16 animate-fade-in-up">
            <h2 className="text-2xl font-extrabold text-ink mb-6">
              Famous Tourist Spots Nearby
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {places.map((p, i) => {
                const imgUrl =
                  p.image ||
                  `https://picsum.photos/seed/${encodeURIComponent(
                    p.name
                  )}/400/300`;
                return (
                  <div
                    key={p.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100">
                      <img
                        src={imgUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = `https://picsum.photos/seed/${encodeURIComponent(
                            p.name
                          )}/400/300`;
                        }}
                      />
                    </div>
                    <div className="flex justify-between items-start gap-2 mt-3">
                      <h3 className="font-bold text-ink text-sm leading-tight">
                        {p.name}
                      </h3>
                      <span className="text-xs bg-lime-light text-forest px-2 py-0.5 rounded-full whitespace-nowrap font-semibold">
                        {p.type}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {p.description}
                      </p>
                    )}
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-lime-dark font-semibold hover:underline mt-2 inline-block"
                    >
                      View on map →
                    </a>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* WEATHER + MAP */}
        {weather && (
          <section className="mt-16 animate-fade-in-up">
            <h2 className="text-2xl font-extrabold text-ink mb-6">
              Destination Map
            </h2>
            <div className="flex flex-wrap gap-3 mb-5">
              <Pill icon="🌤️">
                {Math.round(weather.current.temperature_2m)}°C
              </Pill>
              <Pill icon="💨">
                {weather.current.wind_speed_10m} km/h wind
              </Pill>
            </div>
            <TripMap
              lat={weather.location.lat}
              lng={weather.location.lng}
              label={trip.destination}
              places={places}
            />
          </section>
        )}

        <div className="mt-16 pt-6 border-t border-gray-100 flex justify-end">
          <button
            onClick={async () => {
              if (!confirm("Delete this trip?")) return;
              await api.delete(`/trips/${id}`);
              navigate("/trips");
            }}
            className="text-red-500 text-sm font-medium hover:text-red-700"
          >
            Delete Trip
          </button>
        </div>
      </div>
    </div>
  );
};

export default TripDetail;