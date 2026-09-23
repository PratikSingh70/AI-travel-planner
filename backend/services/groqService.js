// backend/services/groqService.js
import Groq from "groq-sdk";

let groq = null;

const getGroq = () => {
  if (!groq) {
    const key = process.env.GROQ_API_KEY;

    if (!key) {
      throw new Error("GROQ_API_KEY is not set in .env");
    }

    groq = new Groq({
      apiKey: key,
    });
  }

  return groq;
};

const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];

// ─────────────────────────────────────────────────────────────
// JSON REPAIR HELPER
// Handles the malformed JSON that GPT-OSS sometimes emits,
// including the missing "{" before "day":N entries and
// trailing commas, smart quotes, etc.
// ─────────────────────────────────────────────────────────────
const tryRepairJSON = (text) => {
  if (!text || typeof text !== "string") return null;

  let cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/,\s*([}\]])/g, "$1")          // strip trailing commas
    .replace(/[\u201C\u201D]/g, '"')        // smart double quotes → straight
    .replace(/[\u2018\u2019]/g, "'")        // smart single quotes
    .trim();

  // Attempt 1 — straight parse
  try {
    return JSON.parse(cleaned);
  } catch {
    /* continue to repair */
  }

  // Attempt 2 — insert missing "{" before each `,"day":N`
  // (this is the exact failure pattern seen in GPT-OSS output)
  let repaired = cleaned.replace(
    /,\s*"day"\s*:/g,
    ',{"day":'
  );

  try {
    return JSON.parse(repaired);
  } catch {
    /* continue to repair */
  }

  // Attempt 3 — also wrap entries that appear at the start of the array
  repaired = repaired.replace(
    /\[\s*"day"\s*:/g,
    '[{"day":'
  );

  try {
    return JSON.parse(repaired);
  } catch {
    /* continue */
  }

  // Attempt 4 — best-effort: trim to last complete top-level key
  try {
    const lastClose = cleaned.lastIndexOf("}}");
    if (lastClose > 0) {
      const truncated = cleaned.slice(0, lastClose + 2) + "}";
      return JSON.parse(truncated);
    }
  } catch {
    /* give up */
  }

  return null;
};

// ─────────────────────────────────────────────────────────────
// MAIN FUNCTION
// ─────────────────────────────────────────────────────────────
export const generateItineraryWithGroq = async (trip) => {
  const client = getGroq();

  const spotsCount = trip.spotsCount || 5;

  const startDate = new Date(trip.startDate)
    .toISOString()
    .split("T")[0];

  const endDate = new Date(trip.endDate)
    .toISOString()
    .split("T")[0];

  const prompt = `
You are an expert AI travel planner.

Create a complete travel itinerary.

TRIP DETAILS

Destination: ${trip.destination}
Start Date: ${startDate}
End Date: ${endDate}
Budget: ₹${trip.budget}
Travellers: ${trip.travellers}
Places to Cover: ${spotsCount}
Interests: ${
    trip.interests?.length
      ? trip.interests.join(", ")
      : "general sightseeing"
  }

OUTPUT STRUCTURE — FOLLOW EXACTLY

Return ONE valid JSON object with EXACTLY these five top-level keys:
  destination, summary, days, hotels, budgetBreakdown

The "days" array has one entry per day. Each entry MUST be a complete
JSON object wrapped in braces { }, with EXACTLY three keys:
  "day"         — integer (1, 2, 3, ...)
  "date"        — string "YYYY-MM-DD"
  "activities"  — array of activity objects

CRITICAL: every element of the "days" array MUST start with "{" and end
with "}". Do not omit the opening brace. Example of a correct entry:

  {"day": 1, "date": "2026-09-23", "activities": [...]}

Do NOT add any other key inside a day object.
Do NOT put "budgetBreakdown" inside a day object.
Do NOT put "hotels" or "summary" inside a day object.
Do NOT put any per-day totals anywhere.
The ONLY place "budgetBreakdown" appears is at the TOP LEVEL of the
response, as a sibling of "days", not inside it.

Each activity object contains EXACTLY five keys:
  time, title, description, location, cost

Each hotel object contains EXACTLY four keys:
  name, rating, price, address

The top-level "budgetBreakdown" object contains EXACTLY five keys:
  flights, hotels, food, activities, total

CONTENT RULES

1. One day per date between start and end (inclusive).
2. Correct ISO date for every day.
3. 3 to 5 activities per day.
4. 3 to 5 hotels.
5. Hotel rating between 1 and 5. Price in INR as a string like "₹3500/night".
6. All costs are numbers in INR (no symbols, no commas).
7. Budget breakdown numbers are plain numbers in INR.
8. Keep the total close to or below the user's budget.
9. Cover ${spotsCount} distinct places across the trip, no repeats.
10. Return JSON only. No markdown. No commentary. No code fences.
`;

  let lastError = null;

  for (const model of GROQ_MODELS) {
    try {
      console.log(`[Groq] Trying ${model}...`);

      const completion =
        await client.chat.completions.create({
          model,

          messages: [
            {
              role: "system",
              content:
                "You are a professional AI travel planner. Generate accurate structured travel itinerary data based on the user's trip details. Always return valid, complete JSON.",
            },

            {
              role: "user",
              content: prompt,
            },
          ],

          response_format: { type: "json_object" },

          temperature: 0.4,

          max_completion_tokens: 8000,

          reasoning_effort: "medium",
          reasoning_format: "hidden",
        });

      const text =
        completion.choices?.[0]?.message?.content;

      if (!text) {
        throw new Error(
          "Groq returned an empty response"
        );
      }

      console.log(
        `[Groq] ✓ Raw response received from ${model} (${text.length} chars)`
      );

      const itinerary = tryRepairJSON(text);

      if (!itinerary) {
        console.error(
          "[Groq] Could not parse or repair JSON. First 300 chars:",
          text?.slice(0, 300)
        );
        throw new Error(
          "Groq returned unparseable JSON"
        );
      }

      console.log(
        `[Groq] ✓ SUCCESS with ${model}`
      );

      // Validation / normalization

      if (!itinerary.destination) {
        itinerary.destination = trip.destination;
      }

      if (!itinerary.summary) {
        itinerary.summary =
          `Travel plan for ${trip.destination}`;
      }

      if (!Array.isArray(itinerary.days)) {
        throw new Error(
          "Itinerary days are missing"
        );
      }

      if (!Array.isArray(itinerary.hotels)) {
        itinerary.hotels = [];
      }

      if (!itinerary.budgetBreakdown) {
        itinerary.budgetBreakdown = {
          flights: 0,
          hotels: 0,
          food: 0,
          activities: 0,
          total: 0,
        };
      }

      return itinerary;

    } catch (error) {
      lastError = error;

      const status =
        error?.status ||
        error?.response?.status;

      const message =
        error?.message || "Unknown error";

      console.error(
        `[Groq] ✗ ${model}`,
        status,
        message.substring(0, 300)
      );

      if (
        status === 429 ||
        message
          .toLowerCase()
          .includes("rate limit")
      ) {
        console.log(
          `[Groq] Rate limit → trying next model`
        );
      }

      continue;
    }
  }

  throw new Error(
    `All Groq models failed. Last error: ${
      lastError?.message ||
      "Unknown Groq error"
    }`
  );
};