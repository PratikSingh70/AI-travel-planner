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

const itinerarySchema = {
  type: "object",
  additionalProperties: false,

  properties: {
    destination: {
      type: "string",
    },

    summary: {
      type: "string",
    },

    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,

        properties: {
          day: {
            type: "integer",
          },

          date: {
            type: "string",
          },

          activities: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,

              properties: {
                time: {
                  type: "string",
                },

                title: {
                  type: "string",
                },

                description: {
                  type: "string",
                },

                location: {
                  type: "string",
                },

                cost: {
                  type: "number",
                },
              },

              required: [
                "time",
                "title",
                "description",
                "location",
                "cost",
              ],
            },
          },
        },

        required: [
          "day",
          "date",
          "activities",
        ],
      },
    },

    hotels: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,

        properties: {
          name: {
            type: "string",
          },

          rating: {
            type: "number",
          },

          price: {
            type: "string",
          },

          address: {
            type: "string",
          },
        },

        required: [
          "name",
          "rating",
          "price",
          "address",
        ],
      },
    },

    budgetBreakdown: {
      type: "object",
      additionalProperties: false,

      properties: {
        flights: {
          type: "number",
        },

        hotels: {
          type: "number",
        },

        food: {
          type: "number",
        },

        activities: {
          type: "number",
        },

        total: {
          type: "number",
        },
      },

      required: [
        "flights",
        "hotels",
        "food",
        "activities",
        "total",
      ],
    },
  },

  required: [
    "destination",
    "summary",
    "days",
    "hotels",
    "budgetBreakdown",
  ],
};

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

IMPORTANT RULES

1. Create one day for every day between the start and end date.
2. Include the correct date for every day.
3. Suggest 3 to 5 activities per day.
4. Every activity must contain:
   - time
   - title
   - description
   - location
   - cost
5. Suggest 3 to 5 hotels.
6. Hotel rating must be between 1 and 5.
7. Hotel price must be in INR.
8. Give a complete budget breakdown.
9. Keep the estimated total close to or below the user's budget.
10. Cover ${spotsCount} distinct places.
11. Do not repeatedly use the same attraction.
12. All prices are in INR.
13. Do not add fields that are not defined by the requested structure.
14. Return structured data only.
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
                "You are a professional AI travel planner. Generate accurate structured travel itinerary data based on the user's trip details.",
            },

            {
              role: "user",
              content: prompt,
            },
          ],

          response_format: {
            type: "json_schema",

            json_schema: {
              name: "travel_itinerary",

              strict: true,

              schema: itinerarySchema,
            },
          },

          temperature: 0.4,

          max_tokens: 8000,

          reasoning_effort: "low",
        });

      const text =
        completion.choices?.[0]?.message?.content;

      if (!text) {
        throw new Error(
          "Groq returned an empty response"
        );
      }

      console.log(
        `[Groq] ✓ SUCCESS with ${model}`
      );

      let itinerary;

      try {
        itinerary = JSON.parse(text);
      } catch (error) {
        console.error(
          "[Groq] JSON parse error:",
          error
        );

        throw new Error(
          "Groq returned invalid JSON"
        );
      }

      // Additional validation

      if (!itinerary.destination) {
        itinerary.destination =
          trip.destination;
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
        message
          .toLowerCase()
          .includes("json_validate_failed")
      ) {
        console.log(
          `[Groq] JSON validation failed for ${model}`
        );
      }

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