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

// Try generating up to N times with delay
const generateWithRetry = async (prompt, maxAttempts = 3) => {
  const client = getAI();
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });
      return response.text;
    } catch (err) {
      lastError = err;
      const msg = err?.message || "";
      const isRetryable =
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("high demand") ||
        msg.includes("overloaded");

      if (!isRetryable || attempt === maxAttempts) {
        throw err;
      }

      // wait 2s, then 4s, then 6s…
      const delay = attempt * 2000;
      console.log(
        `Gemini busy (attempt ${attempt}/${maxAttempts}). Retrying in ${delay}ms...`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
};

export const generateItinerary = async (trip) => {
  const prompt = `You are an expert AI travel planner.
Generate a detailed day-wise travel itinerary based on these details:

Destination: ${trip.destination}
Start Date: ${trip.startDate.toISOString().split("T")[0]}
End Date: ${trip.endDate.toISOString().split("T")[0]}
Budget (INR): ${trip.budget}
Number of Travellers: ${trip.travellers}
Interests: ${trip.interests.length ? trip.interests.join(", ") : "general sightseeing"}

Requirements:
- Plan one entry per day of the trip (inclusive of start and end date).
- Suggest 3 to 5 activities per day.
- Each activity must have a time (like "09:00 AM"), a title, a short description, a location, and an estimated cost in INR.
- Keep total estimated cost within the budget.
- Make it practical: account for travel time between places.
- Base recommendations on the stated interests.

Return ONLY valid JSON in this exact shape (no markdown, no comments):
{
  "destination": "string",
  "summary": "short paragraph summarizing the trip",
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "time": "09:00 AM",
          "title": "string",
          "description": "string",
          "location": "string",
          "cost": 0
        }
      ]
    }
  ]
}`;

  const text = await generateWithRetry(prompt);

  let itinerary;
  try {
    itinerary = JSON.parse(text);
  } catch (err) {
    throw new Error("Gemini did not return valid JSON");
  }

  if (!itinerary.days || !Array.isArray(itinerary.days)) {
    throw new Error("Itinerary missing 'days' array");
  }

  return itinerary;
};