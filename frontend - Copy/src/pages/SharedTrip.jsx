import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/Skeleton";
import TripMap from "../components/TripMap";
import "./SharedTrip.css";

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

const SharedTripSkeleton = () => (
  <div className="shr-root">
    <div className="shr-orb-1" />
    <div className="shr-orb-2" />
    <div className="shr-page">
      <Skeleton variant="rectangular" width={280} height={40} rounded="9999px" />
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

  useEffect(() => {
    if (!trip) return;
    const dest = trip.destination;

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
      <div className="shr-root">
        <div className="shr-orb-1" />
        <div className="shr-orb-2" />
        <div className="shr-error">
          <div className="shr-error-inner">
            <div className="shr-error-icon">🔍</div>
            <h1 className="shr-error-title">Trip not found</h1>
            <p className="shr-error-text">{error}</p>
            <Link to="/" className="shr-cta-btn">
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="shr-root">
      <div className="shr-orb-1" />
      <div className="shr-orb-2" />

      <main className="shr-page">
        <div className="shr-banner">
          <div className="shr-badge">
            <span className="shr-badge-icon">🔗</span>
            Shared trip · by {trip.sharedBy}
          </div>
          <Link to="/register" className="shr-banner-link">
            Plan your own trip →
          </Link>
        </div>

        <div className="shr-hero">
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

        <h1 className="shr-dest">{trip.destination}</h1>

        <div className="shr-pills">
          <span className="shr-pill">
            <span className="shr-pill-icon">📅</span>
            {days} Day{days > 1 ? "s" : ""}
          </span>
          <span className="shr-pill">
            <span className="shr-pill-icon">💰</span>
            {budgetLabel} Budget
          </span>
          <span className="shr-pill">
            <span className="shr-pill-icon">👥</span>
            {trip.travellers} Traveller{trip.travellers > 1 ? "s" : ""}
          </span>
        </div>

        {trip.interests?.length > 0 && (
          <div className="shr-interests">
            <div className="shr-interests-label">Interests</div>
            <div className="shr-interests-list">
              {trip.interests.map((tag) => (
                <span key={tag} className="shr-interest">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {trip.hotels?.length > 0 && (
          <section className="shr-section">
            <h2 className="shr-section-title">
              Hotel <span>Recommendation</span>
            </h2>
            <div className="shr-hotels">
              {trip.hotels.map((h, i) => {
                const imgUrl =
                  h.image ||
                  `https://picsum.photos/seed/${encodeURIComponent(h.name)}/400/300`;
                const priceNum = parsePrice(h.price);
                return (
                  <div key={i} className="shr-hotel">
                    <div className="shr-hotel-img">
                      <img src={imgUrl} alt={h.name} />
                    </div>
                    <div className="shr-hotel-body">
                      <h3 className="shr-hotel-name">{h.name}</h3>
                      <div className="shr-hotel-row">📍 {h.address}</div>
                      <div className="shr-hotel-price">
                        💰 {priceNum !== null ? `${formatINR(priceNum)}/night` : h.price}
                      </div>
                      <div className="shr-hotel-rating">⭐ {h.rating} stars</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {trip.itinerary?.length > 0 && (
          <section className="shr-section">
            <h2 className="shr-section-title">
              Day-by-Day <span>Itinerary</span>
            </h2>
            {trip.itinerary.map((day) => (
              <div key={day.day} className="shr-day">
                <h3 className="shr-day-head">
                  Day {day.day} <span className="date">{day.date}</span>
                </h3>
                <div className="shr-activities">
                  {day.activities.map((act, idx) => {
                    const imgUrl =
                      act.image ||
                      `https://picsum.photos/seed/${encodeURIComponent(act.title)}/200/200`;
                    return (
                      <div key={idx} className="shr-activity">
                        <div className="shr-activity-img">
                          <img src={imgUrl} alt={act.title} />
                        </div>
                        <div className="shr-activity-body">
                          <div className="shr-activity-time">{act.time}</div>
                          <h4 className="shr-activity-title">{act.title}</h4>
                          <p className="shr-activity-desc">{act.description}</p>
                          <div className="shr-activity-loc">📍 {act.location}</div>
                          <div className="shr-activity-cost">
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

        {trip.budgetBreakdown?.total > 0 && (
          <section className="shr-section">
            <h2 className="shr-section-title">
              Budget <span>Breakdown</span>
            </h2>
            <div className="shr-budget">
              {[
                { label: "✈️ Flights", value: trip.budgetBreakdown.flights },
                { label: "🏨 Hotels", value: trip.budgetBreakdown.hotels },
                { label: "🍽 Food", value: trip.budgetBreakdown.food },
                { label: "🎟 Activities", value: trip.budgetBreakdown.activities },
              ].map((item, i) => (
                <div key={i} className="shr-budget-row">
                  <span className="label">{item.label}</span>
                  <span className="val">{formatINR(item.value)}</span>
                </div>
              ))}
              <div className="shr-budget-total">
                <span className="label">Total</span>
                <span className="val">{formatINR(trip.budgetBreakdown.total)}</span>
              </div>
            </div>
          </section>
        )}

        {weather?.location && (
          <section className="shr-section">
            <h2 className="shr-section-title">
              Destination <span>Map</span>
            </h2>
            <div className="shr-map-pills">
              <span className="shr-pill">
                <span className="shr-pill-icon">🌤️</span>
                {Math.round(weather.current?.temperature_2m ?? 0)}°C
              </span>
              <span className="shr-pill">
                <span className="shr-pill-icon">💨</span>
                {weather.current?.wind_speed_10m ?? 0} km/h wind
              </span>
            </div>
            <TripMap
              lat={weather.location.lat}
              lng={weather.location.lng}
              label={trip.destination}
            />
          </section>
        )}

        <div className="shr-cta">
          <h3 className="shr-cta-title">Loved this itinerary?</h3>
          <p className="shr-cta-sub">
            Create your own AI-powered trip in under a minute.
          </p>
          <Link to="/register" className="shr-cta-btn">
            ✨ Plan Your Own Trip
          </Link>
        </div>
      </main>
    </div>
  );
};

export default SharedTrip;