// backend/services/mistralService.js
// Mistral AI — free tier, OpenAI-compatible

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

const MISTRAL_MODELS = [
  "mistral-small-latest",
  "open-mistral-7b",
];

export const generateItineraryWithMistral = async (trip) => {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error("MISTRAL_API_KEY is not set");

  const spotsCount = trip.spotsCount || 5;
  const startDate = new Date(trip.startDate).toISOString().split("T")[0];
  const endDate = new Date(trip.endDate).toISOString().split("T")[0];

  const prompt = `You are an expert AI travel planner.

Create a complete travel itinerary.

TRIP DETAILS
Destination: ${trip.destination}
Start Date: ${startDate}
End Date: ${endDate}
Budget: ₹${trip.budget}
Travellers: ${trip.travellers}
Places to Cover: ${spotsCount}
Interests: ${trip.interests?.join(", ") || "general sightseeing"}

Return ONLY a valid JSON object with EXACTLY these top-level keys:
destination, summary, days, hotels, budgetBreakdown

Each element of "days" must have EXACTLY: day, date, activities.
Each activity: time, title, description, location, cost.
Each hotel: name, rating, price, address.
Do NOT add extra keys. Return JSON only.`;

  let lastError = null;

  for (const model of MISTRAL_MODELS) {
    try {
      console.log(`[Mistral] Trying ${model}...`);

      const res = await fetch(MISTRAL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a professional AI travel planner. Return valid JSON only.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.4,
          max_tokens: 8000,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Mistral ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("Mistral returned empty response");

      const itinerary = JSON.parse(text);
      console.log(`[Mistral] ✓ SUCCESS with ${model}`);
      return itinerary;
    } catch (err) {
      lastError = err;
      console.error(`[Mistral] ✗ ${model}:`, err.message.slice(0, 200));
    }
  }

  throw new Error(`All Mistral models failed. Last: ${lastError?.message}`);
};