// backend/services/geminiService.js
import { GoogleGenAI } from "@google/genai";

let ai = null;

const getAI = () => {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not set in .env");
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
};

// Try each model ONCE. Fail fast to Groq.
const MODELS = [
  "gemini-flash-latest",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

const generateWithRetry = async (prompt) => {
  const client = getAI();
  let lastError = null;

  for (const model of MODELS) {
    try {
      console.log(`→ ${model}`);
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
      console.log(`✓ ${model} succeeded`);
      return response.text;
    } catch (err) {
      lastError = err;
      const status = err?.status;
      const msg = String(err?.message || "").toLowerCase();

      const isNotFound = status === 404 || msg.includes("not found");
      const isRateLimit = status === 429 || msg.includes("quota");
      const isBusy = status === 503 || msg.includes("unavailable") || msg.includes("high demand");

      if (isNotFound || isRateLimit) {
        console.log(`  skipped (${isNotFound ? "404" : "429"})`);
      } else if (isBusy) {
        console.log(`  busy (503) — next model`);
      } else {
        console.log(`  failed: ${err?.message?.slice(0, 80)}`);
      }
      // Move on immediately — no retries
    }
  }

  throw new Error(
    `All Gemini models failed. Last error: ${lastError?.message || "Unknown"}`
  );
};

export const generateItinerary = async (trip) => {
  const prompt = `You are an expert AI travel planner.
Generate a complete travel plan based on these details:

Destination: ${trip.destination}
Start Date: ${trip.startDate.toISOString().split("T")[0]}
End Date: ${trip.endDate.toISOString().split("T")[0]}
Budget (INR): ${trip.budget}
Number of Travellers: ${trip.travellers}
Interests: ${trip.interests?.length ? trip.interests.join(", ") : "general sightseeing"}

REQUIREMENTS:
1. Plan one entry per day of the trip, including start and end dates.
2. Suggest 3 to 5 activities per day, each with time, title, description, location, and cost in INR.
3. Suggest 3 to 5 realistic hotels near the destination with name, rating (1-5), price per night in INR, and short address.
4. Provide a budget breakdown: flights, hotels, food, activities, total — all in INR.
5. Keep total within the user's stated budget.
6. Return ONLY valid JSON. No markdown. No explanations outside the JSON.

RETURN THIS EXACT STRUCTURE:
{
  "destination": "string",
  "summary": "short paragraph",
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        { "time": "09:00 AM", "title": "string", "description": "string", "location": "string", "cost": 0 }
      ]
    }
  ],
  "hotels": [
    { "name": "string", "rating": 4.5, "price": "₹3500/night", "address": "string" }
  ],
  "budgetBreakdown": { "flights": 0, "hotels": 0, "food": 0, "activities": 0, "total": 0 }
}`;

  const text = await generateWithRetry(prompt);

  let itinerary;
  try {
    itinerary = JSON.parse(text);
  } catch (err) {
    console.error("Invalid JSON from Gemini:", text?.slice(0, 300));
    throw new Error("Gemini returned invalid JSON. Please try again.");
  }

  if (!itinerary.destination) itinerary.destination = trip.destination;
  if (!itinerary.summary) itinerary.summary = `Travel plan for ${trip.destination}`;
  if (!Array.isArray(itinerary.days)) throw new Error("Itinerary missing 'days' array.");
  if (!Array.isArray(itinerary.hotels)) itinerary.hotels = [];
  if (!itinerary.budgetBreakdown) {
    itinerary.budgetBreakdown = { flights: 0, hotels: 0, food: 0, activities: 0, total: 0 };
  }

  return itinerary;
};