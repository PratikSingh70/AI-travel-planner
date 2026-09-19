import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/Skeleton";
import TripMap from "../components/TripMap";

const Pill = ({ icon, children }) => (
  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-ink">
    <span className="w-5 h-5 rounded-full bg-lime flex items-center justify-center text-xs">
      {icon}
    </span>
    {children}
  </span>
);

const SharedTripSkeleton = () => (
  <div className="min-h-screen bg-white pb-20">
    <div className="max-w-6xl mx-auto px-6 pt-8">
      <Skeleton variant="rectangular" width={280} height={40} rounded="9999px" />
      <div style={{ marginTop: 16 }}>
        <Skeleton
          variant="rectangular"
          width="100%"
          style={{ aspectRatio: "21 / 9" }}
          rounded="24px"
        />
      </div>
      <div style={{ marginTop: 32 }}>
        <Skeleton variant="rectangular" width="55%" height={48} rounded="12px" />
      </div>
      <div className="flex flex-wrap gap-3 mt-5">
        <Skeleton variant="rectangular" width={110} height={40} rounded="9999px" />
        <Skeleton variant="rectangular" width={140} height={40} rounded="9999px" />
      </div>
    </div>
  </div>
);

const SharedTrip = () => {
  const { shareId } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const res = await api.get(`/trips/shared/${shareId}`);
        setTrip(res.data);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "This shared trip doesn't exist or has been removed."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [shareId]);

  // Fire-and-forget image + weather fetch (won't fail the page)
  useEffect(() => {
    if (!trip) return;
    const dest = trip.destination;

    // Destination cover image from Pexels via public fallback
    fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(
        dest + " travel"
      )}&per_page=1`,
      {
        headers: {
          Authorization: import.meta.env.VITE_PEXELS_KEY || "",
        },
      }
    )
      .then((r) => r.json())
      .then((data) => {
        const url = data?.photos?.[0]?.src?.large;
        if (url) setCoverImage(url);
      })
      .catch(() => {});

    // Weather via Nominatim + Open-Meteo
    fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        dest
      )}&count=1`
    )
      .then((r) => r.json())
      .then((data) => {
        const r = data?.results?.[0];
        if (!r) return;
        return fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${r.latitude}&longitude=${r.longitude}&current=temperature_2m,wind_speed_10m&timezone=auto`
        )
          .then((r) => r.json())
          .then((w) =>
            setWeather({
              location: { lat: r.latitude, lng: r.longitude },
              current: w.current,
            })
          );
      })
      .catch(() => {});
  }, [trip]);

  if (loading) return <SharedTripSkeleton />;
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-6xl mb-4">🔍</p>
          <h1 className="text-2xl font-extrabold text-ink mb-2">
            Trip not found
          </h1>
          <p className="text-gray-500 mb-8">{error}</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 rounded-full bg-lime text-forest font-bold hover:bg-lime-dark transition"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }
  if (!trip) return null;

  const days = Math.max(
    1,
    Math.round(
      (new Date(trip.endDate) - new Date(trip.startDate)) /
        (1000 * 60 * 60 * 24)
    )
  );
  const budgetLabel =
    trip.budget < 20000 ? "Cheap" : trip.budget < 50000 ? "Moderate" : "Luxury";

  const heroImg =
    coverImage ||
    `https://picsum.photos/seed/${encodeURIComponent(trip.destination)}/1600/700`;

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-6xl mx-auto px-6 pt-8">
        {/* Top banner */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 bg-lime-light border border-lime/30 rounded-full px-4 py-2">
            <span className="text-lg">🔗</span>
            <span className="text-sm font-bold text-forest">
              Shared trip · by {trip.sharedBy}
            </span>
          </div>
          <Link
            to="/register"
            className="text-sm font-bold text-forest hover:text-lime-dark transition"
          >
            Plan your own trip →
          </Link>
        </div>

        {/* Hero */}
        <div className="rounded-3xl overflow-hidden aspect-[21/9] bg-gray-100">
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

        <div className="mt-8">
          <h1 className="text-3xl md:text-5xl font-extrabold text-ink">
            {trip.destination}
          </h1>
        </div>

        <div className="flex flex-wrap gap-3 mt-5">
          <Pill icon="📅">
            {days} Day{days > 1 ? "s" : ""}
          </Pill>
          <Pill icon="💰">{budgetLabel} Budget</Pill>
          <Pill icon="👥">{trip.travellers} Traveller
            {trip.travellers > 1 ? "s" : ""}</Pill>
        </div>

        {/* INTERESTS */}
        {trip.interests?.length > 0 && (
          <div className="mt-6">
            <p className="text-xs uppercase font-bold text-gray-500 mb-2 tracking-widest">
              Interests
            </p>
            <div className="flex flex-wrap gap-2">
              {trip.interests.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-gray-100 text-ink px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* HOTELS */}
        {trip.hotels?.length > 0 && (
          <section className="mt-16">
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
                  <div key={i}>
                    <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100">
                      <img
                        src={imgUrl}
                        alt={h.name}
                        className="w-full h-full object-cover"
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

        {/* ITINERARY */}
        {trip.itinerary?.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-extrabold text-ink mb-8">
              Day-by-Day Itinerary
            </h2>
            {trip.itinerary.map((day) => (
              <div key={day.day} className="mb-10">
                <h3 className="text-xl font-extrabold text-ink mb-5">
                  Day {day.day}{" "}
                  <span className="text-sm text-gray-400 font-normal">
                    {day.date}
                  </span>
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
                        <div className="flex gap-4 p-4 border border-gray-100 rounded-2xl bg-white">
                          <img
                            src={imgUrl}
                            alt={act.title}
                            className="w-24 h-24 md:w-28 md:h-28 rounded-xl object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-ink text-base leading-tight">
                              {act.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                              {act.description}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              📍 {act.location}
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

        {/* BUDGET BREAKDOWN */}
        {trip.budgetBreakdown?.total > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-extrabold text-ink mb-6">
              Budget Breakdown
            </h2>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md">
              {[
                { label: "✈️ Flights", value: trip.budgetBreakdown.flights },
                { label: "🏨 Hotels", value: trip.budgetBreakdown.hotels },
                { label: "🍽 Food", value: trip.budgetBreakdown.food },
                { label: "🎟 Activities", value: trip.budgetBreakdown.activities },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between py-2 border-b border-gray-100 last:border-b-0"
                >
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-bold text-ink">
                    ₹{item.value}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-3 mt-2 border-t-2 border-ink">
                <span className="font-extrabold text-ink">Total</span>
                <span className="font-extrabold text-ink">
                  ₹{trip.budgetBreakdown.total}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* MAP */}
        {weather?.location && (
          <section className="mt-16">
            <h2 className="text-2xl font-extrabold text-ink mb-6">
              Destination Map
            </h2>
            <div className="flex flex-wrap gap-3 mb-5">
              <Pill icon="🌤️">
                {Math.round(weather.current?.temperature_2m ?? 0)}°C
              </Pill>
              <Pill icon="💨">
                {weather.current?.wind_speed_10m ?? 0} km/h wind
              </Pill>
            </div>
            <TripMap
              lat={weather.location.lat}
              lng={weather.location.lng}
              label={trip.destination}
            />
          </section>
        )}

        {/* CTA */}
        <div className="mt-16 bg-lime-light border-2 border-lime rounded-3xl p-8 text-center">
          <h3 className="text-2xl font-extrabold text-ink mb-2">
            Loved this itinerary?
          </h3>
          <p className="text-gray-600 mb-6">
            Create your own AI-powered trip in under a minute.
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-3.5 rounded-full bg-lime text-forest font-bold hover:bg-lime-dark transition shadow-[0_6px_20px_-8px_rgba(168,216,74,0.8)]"
          >
            ✨ Plan Your Own Trip
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SharedTrip;