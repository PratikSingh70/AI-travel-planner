import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/Skeleton";
import TripMap from "../components/TripMap";
import DeleteButton from "../components/DeleteButton";
import ExportPDFButton from "../components/ExportPDFButton";
import ItineraryPaper from "../components/ItineraryPaper";
import SkyFlightButton from "../components/SkyFlightButton";

const Pill = ({ icon, children }) => (
  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-ink">
    <span className="w-5 h-5 rounded-full bg-lime flex items-center justify-center text-xs">
      {icon}
    </span>
    {children}
  </span>
);

const TripDetailSkeleton = () => (
  <div className="min-h-screen bg-white pb-20">
    <div className="max-w-6xl mx-auto px-6 pt-8">
      <Skeleton variant="text" width={120} height={14} />
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
        <Skeleton variant="rectangular" width={180} height={40} rounded="9999px" />
      </div>
      <div style={{ marginTop: 32 }}>
        <Skeleton variant="rectangular" width={280} height={54} rounded="9999px" />
      </div>
    </div>
  </div>
);

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [weather, setWeather] = useState(null);
  const [places, setPlaces] = useState([]);
  const [coverImage, setCoverImage] = useState(null);

  // ─── SHARE state ───
  const [shareUrl, setShareUrl] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Auto-trigger generation when arriving from Edit Trip (?autoGen=1)
  useEffect(() => {
    if (!trip || generating) return;
    if (searchParams.get("autoGen") !== "1") return;

    const newParams = new URLSearchParams(searchParams);
    newParams.delete("autoGen");
    setSearchParams(newParams, { replace: true });

    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, searchParams]);

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

      if (window.__skyTripBtn?.setComplete) {
        window.__skyTripBtn.setComplete();
      }
    } catch (err) {
      setGenError(err.response?.data?.message || "AI generation failed");
      if (window.__skyTripBtn?.reset) {
        window.__skyTripBtn.reset();
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    setShareLoading(true);
    try {
      const res = await api.post(`/trips/${id}/share`);
      const shareId = res.data.shareId;
      const url = `${window.location.origin}/share/${shareId}`;
      setShareUrl(url);
    } catch (err) {
      alert(err.response?.data?.message || "Could not generate share link");
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Could not copy — please copy manually");
    }
  };

  if (loading) return <TripDetailSkeleton />;
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
        <Link
          to="/trips"
          className="text-sm text-gray-500 hover:text-ink transition"
        >
          ← Back to trips
        </Link>

        <div className="mt-4 rounded-3xl overflow-hidden aspect-[21/9] bg-gray-100">
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
          <Pill icon="👥">No. Of Traveler: {trip.travellers}</Pill>
        </div>

        {genError && (
          <p className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mt-6 text-sm">
            {genError}
          </p>
        )}

        {/* SKY FLIGHT GENERATE / REGENERATE BUTTON */}
        <div className="mt-8">
          <SkyFlightButton
            label={trip.itinerary?.length ? "Regenerate Trip" : "Generate Trip"}
            loadingLabel="Curating Your Itinerary"
            doneLabel="🎉 Itinerary Ready!"
            disabled={generating}
            loading={generating}
            onClick={handleGenerate}
            autoCompleteAfter={0}
          />
        </div>

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

        {trip.itinerary?.length > 0 && (
          <section className="mt-16">
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

        {places.length > 0 && (
          <section className="mt-16">
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
                  <div key={p.id}>
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
              places={places}
            />
          </section>
        )}

        {/* ═══════════ SMART WEATHER PLAN ═══════════ */}
        {weather?.location && (
          <section className="mt-16">
            <div className="rounded-3xl border-2 border-lime/30 bg-gradient-to-br from-lime-light/50 to-white p-8 md:p-10">
              <div className="flex items-start justify-between gap-8 flex-wrap">
                <div className="flex-1 min-w-[260px]">
                  <p className="text-xs font-bold uppercase tracking-widest text-lime-dark mb-2">
                    Smart Weather Plan
                  </p>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-ink leading-tight">
                    Plan your trip around the weather
                  </h2>
                  <p className="text-sm text-gray-600 mt-3 max-w-lg leading-relaxed">
                    We check the weather for each day of your trip. Outdoor
                    plans go on sunny days, and indoor plans go on rainy days.
                  </p>
                  <Link
                    to={`/trips/${id}/weather-itinerary`}
                    className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-lime text-forest font-bold hover:bg-lime-dark btn-press transition shadow-[0_6px_20px_-8px_rgba(168,216,74,0.8)]"
                  >
                    See Smart Weather Plan →
                  </Link>
                </div>

                <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 px-6 py-5 shadow-sm">
                  <span className="text-4xl leading-none">🌤️</span>
                  <div>
                    <p className="text-3xl font-extrabold text-ink leading-none">
                      {Math.round(weather.current?.temperature_2m ?? 0)}°
                      <span className="text-base text-gray-400 ml-1">C</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-2 font-semibold">
                      💨 {Math.round(weather.current?.wind_speed_10m ?? 0)} km/h wind
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ACTION BUTTONS */}
        <div className="mt-16 pt-6 border-t border-gray-100 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex flex-wrap gap-3 items-center">
            <ExportPDFButton
              targetId="itineraryPaper"
              holderId="itnHolder"
              filename={`${trip.destination.replace(/\s+/g, "-")}-itinerary.pdf`}
            />

            <Link
              to={`/trips/${id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-ink text-[13px] font-semibold hover:border-forest hover:text-forest transition"
            >
              ✏️ Edit Trip
            </Link>

            <button
              onClick={handleShare}
              disabled={shareLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-ink text-[13px] font-semibold hover:border-forest hover:text-forest transition disabled:opacity-60"
            >
              {shareLoading ? "Creating..." : "🔗 Share"}
            </button>
          </div>

          <DeleteButton
            label="Delete Trip"
            onClick={async () => {
              await api.delete(`/trips/${id}`);
              navigate("/trips");
            }}
          />
        </div>
      </div>

      <div id="itnHolder" className="itn-paper-holder">
        <ItineraryPaper trip={trip} places={places} />
      </div>

      {/* SHARE MODAL */}
      {shareUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
          onClick={() => {
            setShareUrl("");
            setCopied(false);
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-ink">
                  🔗 Share this trip
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Anyone with this link can view your itinerary.
                </p>
              </div>
              <button
                onClick={() => {
                  setShareUrl("");
                  setCopied(false);
                }}
                className="text-gray-400 hover:text-ink text-xl leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={shareUrl}
                onClick={(e) => e.target.select()}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-ink bg-gray-50 focus:outline-none"
              />
              <button
                onClick={copyShareUrl}
                className="px-4 py-2.5 rounded-lg bg-lime text-forest font-bold text-sm hover:bg-lime-dark transition whitespace-nowrap"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>

            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-lime-dark font-semibold hover:underline"
            >
              Open in new tab →
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDetail;