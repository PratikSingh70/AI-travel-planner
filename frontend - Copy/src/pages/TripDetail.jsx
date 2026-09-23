import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/Skeleton";
import TripMap from "../components/TripMap";
import DeleteButton from "../components/DeleteButton";
import ItineraryPaper from "../components/ItineraryPaper";
import SkyFlightButton from "../components/SkyFlightButton";
import { useTripActions } from "../context/TripActionsContext";
import "./TripDetail.css";

const parsePrice = (price) => {
  if (typeof price === "number") return price;
  if (!price) return null;
  const match = String(price).replace(/,/g, "").match(/\d+/);
  return match ? Number(match[0]) : null;
};

const formatINR = (value) => {
  const n = Number(value) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
};

/* Build a Booking.com search URL for the hotel */
const getBookingUrl = (hotel, destination) => {
  const parts = [hotel?.name, destination].filter(Boolean);
  const query = parts.join(" ").trim() || "hotel";
  return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
    query
  )}`;
};

const TripDetailSkeleton = () => (
  <div className="td-root">
    <div className="td-orb-1" />
    <div className="td-orb-2" />
    <div className="td-page">
      <Skeleton variant="text" width={120} height={14} />
      <div style={{ marginTop: 16 }}>
        <Skeleton
          variant="rectangular"
          width="100%"
          style={{ aspectRatio: "21 / 9" }}
          rounded="28px"
        />
      </div>
      <div style={{ marginTop: 32 }}>
        <Skeleton variant="rectangular" width="55%" height={48} rounded="12px" />
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <Skeleton variant="rectangular" width={110} height={40} rounded="9999px" />
        <Skeleton variant="rectangular" width={140} height={40} rounded="9999px" />
        <Skeleton variant="rectangular" width={180} height={40} rounded="9999px" />
      </div>
    </div>
  </div>
);

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setActions } = useTripActions();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [weather, setWeather] = useState(null);
  const [places, setPlaces] = useState([]);
  const [coverImage, setCoverImage] = useState(null);

  const [shareUrl, setShareUrl] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const res = await api.get(`/trips/${id}`);
        setTrip(res.data);
        api.get(`/trips/${id}/places`).then((r) => setPlaces(r.data.places || [])).catch(() => {});
        api.get(`/trips/${id}/weather`).then((w) => setWeather(w.data)).catch(() => {});
        api.get(`/trips/${id}/image`).then((r) => setCoverImage(r.data.imageUrl)).catch(() => {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [id]);

  useEffect(() => {
    if (!trip || generating) return;
    if (searchParams.get("autoGen") !== "1") return;
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("autoGen");
    setSearchParams(newParams, { replace: true });
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, searchParams]);

  useEffect(() => {
    if (!trip) {
      setActions(null);
      return;
    }
    setActions({
      trip,
      shareLoading,
      onShare: async () => {
        setShareLoading(true);
        try {
          const res = await api.post(`/trips/${id}/share`);
          const shareId = res.data.shareId;
          setShareUrl(`${window.location.origin}/share/${shareId}`);
        } catch (err) {
          alert(err.response?.data?.message || "Could not generate share link");
        } finally {
          setShareLoading(false);
        }
      },
    });
    return () => setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, id, shareLoading]);

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
      if (window.__skyTripBtn?.setComplete) window.__skyTripBtn.setComplete();
    } catch (err) {
      setGenError(err.response?.data?.message || "AI generation failed");
      if (window.__skyTripBtn?.reset) window.__skyTripBtn.reset();
    } finally {
      setGenerating(false);
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

  const handleDelete = async () => {
    await api.delete(`/trips/${id}`);
    navigate("/trips");
  };

  const openBooking = (hotel) => {
    const url = getBookingUrl(hotel, trip.destination);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) return <TripDetailSkeleton />;
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
    trip.image ||
    coverImage ||
    `https://picsum.photos/seed/${encodeURIComponent(trip.destination)}/1600/700`;

  return (
    <div className="td-root">
      <div className="td-orb-1" />
      <div className="td-orb-2" />

      <div className="td-page">
        <div className="td-top-row">
          <Link to="/trips" className="td-back">
            ← Back to trips
          </Link>
        </div>

        <div className="td-hero">
          <img
            src={heroImg}
            alt={trip.destination}
            onError={(e) => {
              e.target.src = `https://picsum.photos/seed/${encodeURIComponent(
                trip.destination
              )}/1600/700`;
            }}
          />
        </div>

        <h1 className="td-dest">{trip.destination}</h1>

        <div className="td-pills">
          <span className="td-pill">
            <span className="td-pill-icon">📅</span>
            {days} Day{days > 1 ? "s" : ""}
          </span>
          {trip.spotsCount > 0 && (
            <span className="td-pill">
              <span className="td-pill-icon">📍</span>
              {trip.spotsCount} places
            </span>
          )}
          <span className="td-pill">
            <span className="td-pill-icon">💰</span>
            {formatINR(trip.budget)} · {budgetLabel}
          </span>
          <span className="td-pill">
            <span className="td-pill-icon">👥</span>
            Travellers: {trip.travellers}
          </span>
        </div>

        {genError && <p className="td-error">{genError}</p>}

        <div style={{ marginTop: 32 }}>
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
          <section className="td-section">
            <h2 className="td-section-title">
              Hotel <span>Recommendation</span>
            </h2>
            <div className="td-hotels">
              {trip.hotels.map((h, i) => {
                const imgUrl =
                  h.image ||
                  `https://picsum.photos/seed/${encodeURIComponent(h.name)}/400/300`;
                const priceNum = parsePrice(h.price);
                return (
                  <div
                    key={i}
                    className="td-hotel"
                    role="button"
                    tabIndex={0}
                    onClick={() => openBooking(h)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openBooking(h);
                      }
                    }}
                    aria-label={`Book ${h.name} on Booking.com`}
                  >
                    <div className="td-hotel-img">
                      <img src={imgUrl} alt={h.name} />
                      <div className="td-hotel-img-overlay">
                        <span className="td-hotel-book-badge">
                          🏨 Book Now →
                        </span>
                      </div>
                    </div>
                    <div className="td-hotel-body">
                      <h3 className="td-hotel-name">{h.name}</h3>
                      <div className="td-hotel-row">📍 {h.address}</div>
                      <div className="td-hotel-price">
                        💰 {priceNum !== null ? `${formatINR(priceNum)}/night` : h.price}
                      </div>
                      <div className="td-hotel-rating">⭐ {h.rating} stars</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {trip.itinerary?.length > 0 && (
          <section className="td-section">
            <h2 className="td-section-title">
              Places to <span>Visit</span>
            </h2>
            {trip.itinerary.map((day) => (
              <div key={day.day} className="td-day">
                <h3 className="td-day-head">Day {day.day}</h3>
                <div className="td-activities">
                  {day.activities.map((act, idx) => {
                    const imgUrl =
                      act.image ||
                      `https://picsum.photos/seed/${encodeURIComponent(act.title)}/200/200`;
                    return (
                      <div key={idx} className="td-activity">
                        <div className="td-activity-img">
                          <img src={imgUrl} alt={act.title} />
                        </div>
                        <div className="td-activity-body">
                          <div className="td-activity-time">{act.time}</div>
                          <h4 className="td-activity-title">{act.title}</h4>
                          <p className="td-activity-desc">{act.description}</p>
                          <div className="td-activity-loc">
                            ⏱ {act.time?.split("-")[1]?.trim() || "Flexible"}
                          </div>
                          <div className="td-activity-cost">
                            {formatINR(act.cost)} per person
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
          <section className="td-section">
            <h2 className="td-section-title">
              Famous Tourist <span>Spots Nearby</span>
            </h2>
            <div className="td-places">
              {places.map((p) => {
                const imgUrl =
                  p.image ||
                  `https://picsum.photos/seed/${encodeURIComponent(p.name)}/400/300`;
                return (
                  <div key={p.id} className="td-place">
                    <div className="td-place-img">
                      <img src={imgUrl} alt={p.name} />
                    </div>
                    <div className="td-place-body">
                      <div className="td-place-head">
                        <h3 className="td-place-name">{p.name}</h3>
                        <span className="td-place-tag">{p.type}</span>
                      </div>
                      {p.description && (
                        <p className="td-place-desc">{p.description}</p>
                      )}
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="td-place-link"
                      >
                        View on map →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {weather?.location && (
          <section className="td-section">
            <h2 className="td-section-title">
              Destination <span>Map</span>
            </h2>
            <div className="td-pills" style={{ marginBottom: 18 }}>
              <span className="td-pill">
                <span className="td-pill-icon">🌤️</span>
                {Math.round(weather.current?.temperature_2m ?? 0)}°C
              </span>
              <span className="td-pill">
                <span className="td-pill-icon">💨</span>
                {weather.current?.wind_speed_10m ?? 0} km/h wind
              </span>
            </div>
            <TripMap
              lat={weather.location.lat}
              lng={weather.location.lng}
              label={trip.destination}
              places={places}
              itinerary={trip.itinerary}
            />
          </section>
        )}

        {weather?.location && (
          <section className="td-section">
            <div className="td-weather-card">
              <div className="td-weather-left">
                <div className="td-weather-kicker">Smart Weather Plan</div>
                <h2 className="td-weather-title">Plan your trip around the weather</h2>
                <p className="td-weather-text">
                  We check the weather for each day of your trip. Outdoor plans
                  go on sunny days, and indoor plans go on rainy days.
                </p>
                <Link to={`/trips/${id}/weather-itinerary`} className="td-weather-cta">
                  See Smart Weather Plan →
                </Link>
              </div>
              <div className="td-weather-badge">
                <span className="td-weather-icon">🌤️</span>
                <div>
                  <div className="td-weather-temp">
                    {Math.round(weather.current?.temperature_2m ?? 0)}°
                    <span className="unit">C</span>
                  </div>
                  <div className="td-weather-wind">
                    💨 {Math.round(weather.current?.wind_speed_10m ?? 0)} km/h wind
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="td-actions-bar">
          <Link to={`/trips/${id}/edit`} className="td-btn td-btn-edit">
            <span className="td-btn-icon">✏️</span>
            <span>Edit Trip</span>
          </Link>
          <DeleteButton label="Delete Trip" onClick={handleDelete} />
        </div>
      </div>

      <div id="itnHolder" className="itn-paper-holder">
        <ItineraryPaper trip={trip} places={places} />
      </div>

      {shareUrl && (
        <div
          className="td-share-back"
          onClick={() => { setShareUrl(""); setCopied(false); }}
        >
          <div className="td-share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="td-share-head">
              <div>
                <h3 className="td-share-title">🔗 Share this trip</h3>
                <p className="td-share-sub">
                  Anyone with this link can view your itinerary.
                </p>
              </div>
              <button
                onClick={() => { setShareUrl(""); setCopied(false); }}
                className="td-share-close"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="td-share-row">
              <input
                type="text"
                readOnly
                value={shareUrl}
                onClick={(e) => e.target.select()}
                className="td-share-input"
              />
              <button onClick={copyShareUrl} className="td-share-copy">
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <a href={shareUrl} target="_blank" rel="noreferrer" className="td-share-open">
              Open in new tab →
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDetail;