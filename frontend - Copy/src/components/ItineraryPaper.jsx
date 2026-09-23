const formatDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const ItineraryPaper = ({ trip, places = [] }) => {
  if (!trip) return null;

  const days = Math.max(
    1,
    Math.round(
      (new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24)
    )
  );
  const budgetLabel =
    trip.budget < 20000 ? "Cheap" : trip.budget < 50000 ? "Moderate" : "Luxury";

  const startDate = formatDate(trip.startDate);
  const endDate = formatDate(trip.endDate);

  const totalSpent = (trip.itinerary || []).reduce((sum, day) => {
    return (
      sum +
      (day.activities || []).reduce((s, act) => s + (Number(act.cost) || 0), 0)
    );
  }, 0);

  return (
    <main className="itn-paper" id="itineraryPaper">
      {/* HEADER */}
      <header className="itn-header">
        <div className="itn-eyebrow">Official Travel Itinerary</div>
        <h1 className="itn-title">{trip.destination}</h1>
        <div className="itn-dest">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>{trip.destination}</span>
        </div>
        <div className="itn-dates">
          <span>
            {days} Day{days > 1 ? "s" : ""}
          </span>
          <span className="dot"></span>
          <span>
            {startDate} — {endDate}
          </span>
        </div>
      </header>

      {/* SUMMARY */}
      <section className="itn-summary">
        <div className="itn-metric">
          <div className="m-label">Travellers</div>
          <div className="m-value">
            {trip.travellers}
            <small>{trip.travellers > 1 ? " guests" : " guest"}</small>
          </div>
        </div>
        <div className="itn-metric m-budget">
          <div className="m-label">Total Budget</div>
          <div className="m-value">
            ₹{trip.budget?.toLocaleString?.() || trip.budget}
          </div>
        </div>
        <div className="itn-metric m-travellers">
          <div className="m-label">Trip Style</div>
          <div className="m-value">
            {budgetLabel}
            <small> tier</small>
          </div>
        </div>
      </section>

      {/* ITINERARY */}
      {trip.itinerary?.length > 0 && (
        <>
          <div className="itn-section-head">
            <h2>Day-by-Day Itinerary</h2>
          </div>

          {trip.itinerary.map((day) => (
            <article className="itn-day" key={day.day}>
              <header className="itn-day-head">
                <div className="itn-day-num">
                  {String(day.day).padStart(2, "0")}
                </div>
                <div className="itn-day-name">Day {day.day}</div>
                <div className="itn-day-date">{day.date}</div>
              </header>
              <table className="itn-table">
                <thead>
                  <tr>
                    <th className="itn-col-time">Time</th>
                    <th>Activity</th>
                    <th className="itn-col-cost">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {(day.activities || []).map((act, i) => (
                    <tr key={i}>
                      <td className="itn-col-time">
                        <span className="itn-time-chip">{act.time}</span>
                      </td>
                      <td>
                        <div className="itn-act-title">{act.title}</div>
                        {act.description && (
                          <div className="itn-act-desc">{act.description}</div>
                        )}
                        {act.location && (
                          <div className="itn-venue">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <span>{act.location}</span>
                          </div>
                        )}
                      </td>
                      <td className="itn-col-cost">
                        <div
                          className={`itn-cost-val ${
                            !act.cost || act.cost === 0 ? "free" : ""
                          }`}
                        >
                          {!act.cost || act.cost === 0 ? "Free" : `₹${act.cost}`}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
        </>
      )}

      {/* HOTELS */}
      {trip.hotels?.length > 0 && (
        <>
          <div className="itn-section-head">
            <h2>Recommended Hotels</h2>
          </div>
          <div className="itn-hotel-grid">
            {trip.hotels.map((h, i) => (
              <div className="itn-hotel" key={i}>
                <div className="itn-hotel-name">{h.name}</div>
                <div className="itn-hotel-row">📍 {h.address}</div>
                <div className="itn-hotel-row">
                  ⭐ {h.rating} · 💰 {h.price}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* PLACES */}
      {places.length > 0 && (
        <>
          <div className="itn-section-head">
            <h2>Nearby Attractions</h2>
          </div>
          <div className="itn-hotel-grid">
            {places.slice(0, 6).map((p, i) => (
              <div className="itn-hotel" key={i}>
                <div className="itn-hotel-name">{p.name}</div>
                <div className="itn-hotel-row">🏷 {p.type}</div>
                {p.description && (
                  <div className="itn-hotel-row">
                    {String(p.description).slice(0, 120)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* BUDGET BREAKDOWN */}
      {trip.budgetBreakdown && trip.budgetBreakdown.total > 0 && (
        <>
          <div className="itn-section-head">
            <h2>Budget Breakdown</h2>
          </div>
          <table className="itn-table">
            <tbody>
              <tr>
                <td>✈️ Flights</td>
                <td className="itn-col-cost">
                  <div className="itn-cost-val">
                    ₹{trip.budgetBreakdown.flights}
                  </div>
                </td>
              </tr>
              <tr>
                <td>🏨 Hotels</td>
                <td className="itn-col-cost">
                  <div className="itn-cost-val">
                    ₹{trip.budgetBreakdown.hotels}
                  </div>
                </td>
              </tr>
              <tr>
                <td>🍽 Food</td>
                <td className="itn-col-cost">
                  <div className="itn-cost-val">
                    ₹{trip.budgetBreakdown.food}
                  </div>
                </td>
              </tr>
              <tr>
                <td>🎟 Activities</td>
                <td className="itn-col-cost">
                  <div className="itn-cost-val">
                    ₹{trip.budgetBreakdown.activities}
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td className="itn-col-cost">
                  <div className="itn-cost-val">
                    <strong>₹{trip.budgetBreakdown.total}</strong>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      <footer className="itn-foot">
        <div className="f-left">
          Generated via <span>AI Travel Planner</span>
        </div>
        <div className="f-mid">
          Planned activity cost: ₹{totalSpent.toLocaleString?.() || totalSpent}
        </div>
        <div className="f-right">Safe Travels!</div>
      </footer>
    </main>
  );
};

export default ItineraryPaper;