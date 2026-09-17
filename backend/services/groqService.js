// backend/services/groqService.js
// Fallback AI provider for when Gemini is overloaded.

import Groq from "groq-sdk";

let groq = null;

const getGroq = () => {
  if (!groq) {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      throw new Error("GROQ_API_KEY is not set in .env");
    }
    groq = new Groq({ apiKey: key });
  }
  return groq;
};

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const generateItineraryWithGroq = async (trip) => {
  const client = getGroq();

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
        {
          "time": "09:00 AM",
          "title": "string",
          "description": "string",
          "location": "string",
          "cost": 0
        }
      ]
    }
  ],
  "hotels": [
    {
      "name": "string",
      "rating": 4.5,
      "price": "₹3500/night",
      "address": "string"
    }
  ],
  "budgetBreakdown": {
    "flights": 0,
    "hotels": 0,
    "food": 0,
    "activities": 0,
    "total": 0
  }
}`;

  let lastError = null;

  for (const model of GROQ_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Groq] Trying ${model} (attempt ${attempt}/2)...`);

        const completion = await client.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are an AI travel planner. Always respond with valid JSON only. No markdown. No code fences.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 4000,
        });

        const text = completion.choices[0]?.message?.content;
        if (!text) throw new Error("Groq returned empty response");

        console.log(`[Groq] ✓ SUCCESS with ${model}`);
        return text;
      } catch (err) {
        lastError = err;
        const status = err?.status || err?.response?.status;
        const msg = String(err?.message || "").toLowerCase();

        console.log(
          `[Groq] ✗ Error from ${model}:`,
          status,
          err?.message?.slice(0, 120)
        );

        const isRateLimit =
          status === 429 || msg.includes("rate") || msg.includes("quota");
        const isBusy =
          status === 503 || msg.includes("overloaded") || msg.includes("unavailable");

        if (isBusy && attempt < 2) {
          await sleep(3000);
          continue;
        }

        // try next model
        break;
      }
    }
  }

  throw new Error(
    `All Groq models failed. Last error: ${lastError?.message || "Unknown"}`
  );
};