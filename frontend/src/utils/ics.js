// frontend/src/utils/ics.js
// Generates a standard .ics calendar file from a trip.
// Spec: RFC 5545

const pad = (n) => String(n).padStart(2, "0");

function toICSDate(date) {
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    "00Z"
  );
}

function escapeICS(text) {
  if (!text) return "";
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/* Parse "09:00 AM" or "Morning" or "All day" into { hour, minute } */
function parseTime(timeStr) {
  if (!timeStr) return { hour: 9, minute: 0 };
  const s = String(timeStr).trim();

  // "09:00 AM" / "9:30 PM" / "14:00"
  const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2] || "0", 10);
    const ap = ampm[3].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return { hour: h, minute: m };
  }

  // "14:00" / "9:30"
  const hhmm = s.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    return {
      hour: parseInt(hhmm[1], 10),
      minute: parseInt(hhmm[2], 10),
    };
  }

  // Named times
  const named = s.toLowerCase();
  if (named.includes("morning")) return { hour: 9, minute: 0 };
  if (named.includes("afternoon")) return { hour: 14, minute: 0 };
  if (named.includes("evening")) return { hour: 18, minute: 0 };
  if (named.includes("night")) return { hour: 20, minute: 0 };
  if (named.includes("dawn")) return { hour: 6, minute: 0 };
  if (named.includes("midday") || named.includes("noon"))
    return { hour: 12, minute: 0 };
  if (named.includes("all day") || named.includes("full day"))
    return { hour: 9, minute: 0 };

  return { hour: 9, minute: 0 };
}

function eventDurationHours(title) {
  const t = (title || "").toLowerCase();
  if (/full day|all day/.test(t)) return 8;
  if (/hike|trek|tour|day trip/.test(t)) return 3;
  if (/dinner|lunch|breakfast|meal/.test(t)) return 2;
  if (/museum|temple|shrine|visit/.test(t)) return 2;
  return 2;
}

/**
 * Build the .ics content string from a trip object.
 * @param {Object} trip - MongoDB trip document
 * @returns {string} ICS file content
 */
export function generateICS(trip) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI Travel Planner//Trip Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICS(trip.destination || "Trip")}`,
    `X-WR-CALDESC:${escapeICS(
      `Itinerary for ${trip.destination || "trip"}`
    )}`,
  ];

  const tripStart = new Date(trip.startDate || Date.now());
  const destination = trip.destination || "Trip";

  // Hero event on day 1
  lines.push(
    "BEGIN:VEVENT",
    `UID:trip-start-${trip._id || Date.now()}@aitravelplanner`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(tripStart)}`,
    `DTEND:${toICSDate(
      new Date(tripStart.getTime() + 60 * 60 * 1000)
    )}`,
    `SUMMARY:${escapeICS("✈️ Arrive — " + destination)}`,
    `DESCRIPTION:${escapeICS(
      `Trip starts. ${trip.travellers || 1} traveller(s), budget ₹${
        trip.budget || 0
      }.`
    )}`,
    `LOCATION:${escapeICS(destination)}`,
    "END:VEVENT"
  );

  // Each activity becomes an event
  (trip.itinerary || []).forEach((day, dayIdx) => {
    const dayDate = new Date(tripStart);
    dayDate.setDate(dayDate.getDate() + dayIdx);

    (day.activities || []).forEach((act, actIdx) => {
      const { hour, minute } = parseTime(act.time);
      const start = new Date(dayDate);
      start.setHours(hour, minute, 0, 0);

      const durationH = eventDurationHours(act.title);
      const end = new Date(start.getTime() + durationH * 60 * 60 * 1000);

      const desc = [
        act.description,
        act.cost ? `Cost: ₹${act.cost} per person` : "",
        act.location ? `Location: ${act.location}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      lines.push(
        "BEGIN:VEVENT",
        `UID:day${dayIdx}-act${actIdx}-${trip._id || Date.now()}@aitravelplanner`,
        `DTSTAMP:${toICSDate(new Date())}`,
        `DTSTART:${toICSDate(start)}`,
        `DTEND:${toICSDate(end)}`,
        `SUMMARY:${escapeICS("📍 " + (act.title || "Activity"))}`,
        `DESCRIPTION:${escapeICS(desc)}`,
        `LOCATION:${escapeICS(act.location || destination)}`,
        "END:VEVENT"
      );
    });
  });

  // Hotels as optional events on check-in day
  (trip.hotels || []).forEach((hotel, hIdx) => {
    const checkIn = new Date(tripStart);
    const start = new Date(checkIn);
    start.setHours(15, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    lines.push(
      "BEGIN:VEVENT",
      `UID:hotel${hIdx}-${trip._id || Date.now()}@aitravelplanner`,
      `DTSTAMP:${toICSDate(new Date())}`,
      `DTSTART:${toICSDate(start)}`,
      `DTEND:${toICSDate(end)}`,
      `SUMMARY:${escapeICS("🏨 " + (hotel.name || "Hotel"))}`,
      `DESCRIPTION:${escapeICS(
        [
          hotel.address,
          hotel.price ? `Price: ${hotel.price}` : "",
          hotel.rating ? `Rating: ${hotel.rating}★` : "",
        ]
          .filter(Boolean)
          .join("\n")
      )}`,
      `LOCATION:${escapeICS(hotel.address || destination)}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");

  // ICS requires CRLF line endings
  return lines.join("\r\n");
}

/**
 * Trigger the browser to download the trip's .ics file.
 */
export function downloadICS(trip) {
  if (!trip) return;
  const content = generateICS(trip);
  const blob = new Blob([content], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const filename =
    (trip.destination || "trip").replace(/\s+/g, "-").toLowerCase() +
    "-itinerary.ics";
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return filename;
}