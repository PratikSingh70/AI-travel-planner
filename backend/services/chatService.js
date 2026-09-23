// backend/services/chatService.js
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

let ai = null;
let groq = null;

const getAI = () => {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set");
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
};

const getGroq = () => {
  if (!groq) {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY is not set");
    groq = new Groq({ apiKey: key });
  }
  return groq;
};

const GEMINI_MODEL = "gemini-3.8-flash";
const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];

// ─────────────────────────────────────────────────────────────
// Build a rich system prompt with the user's full trip context
// ─────────────────────────────────────────────────────────────
const buildSystemPrompt = (trip) => {
  let base = `
You are "Sky", a warm and friendly AI travel assistant inside the
AI Travel Planner application.

Your job is to help users with:
- Travel planning and day plans
- Destinations, hotels, budgets, packing
- Weather, transportation, local tips
- Activities, food, culture

RULES:
1. Keep answers short and useful.
2. Prefer 2-4 short paragraphs.
3. Use simple conversational language.
4. Use emojis occasionally.
5. Do not use markdown headers.
6. Do not use code blocks.
7. Prices should be in INR (₹) by default.
8. Never invent facts when uncertain.
9. Be helpful and specific.
`;

  if (trip) {
    const start = trip.startDate
      ? new Date(trip.startDate).toDateString()
      : "Not specified";
    const end = trip.endDate
      ? new Date(trip.endDate).toDateString()
      : "Not specified";

    base += `

═══════════════════════════════════════════
USER'S CURRENT TRIP (use this as context!)
═══════════════════════════════════════════

Destination: ${trip.destination || "Not specified"}
Travel dates: ${start} → ${end}
Budget: ₹${trip.budget || 0}
Travellers: ${trip.travellers || 1}
Interests: ${
      Array.isArray(trip.interests) && trip.interests.length
        ? trip.interests.join(", ")
        : "general sightseeing"
    }
`;

    // Map center (AI-recommended base city)
    if (trip.mapCenter?.label) {
      base += `Primary base city: ${trip.mapCenter.label}\n`;
    }

    // Budget breakdown
    if (trip.budgetBreakdown) {
      const bb = trip.budgetBreakdown;
      base += `
Budget breakdown:
  Flights: ₹${bb.flights || 0}
  Hotels: ₹${bb.hotels || 0}
  Food: ₹${bb.food || 0}
  Activities: ₹${bb.activities || 0}
  Total: ₹${bb.total || 0}
`;
    }

    // Full itinerary (compact format so the AI can reference specific days)
    if (Array.isArray(trip.itinerary) && trip.itinerary.length) {
      base += `\nPlanned itinerary (${trip.itinerary.length} days):\n`;
      for (const day of trip.itinerary.slice(0, 14)) {
        const dayNum = day.day ?? "?";
        const date = day.date || "";
        const acts = (day.activities || [])
          .slice(0, 6)
          .map((a) => a.title || "activity")
          .filter(Boolean)
          .join(" · ");
        base += `  Day ${dayNum} (${date}): ${acts || "no activities"}\n`;
      }
      if (trip.itinerary.length > 14) {
        base += `  ...and ${trip.itinerary.length - 14} more days\n`;
      }
    }

    // Hotels
    if (Array.isArray(trip.hotels) && trip.hotels.length) {
      base += `\nSuggested hotels:\n`;
      for (const h of trip.hotels.slice(0, 6)) {
        if (!h?.name) continue;
        base += `  - ${h.name}${h.price ? ` (${h.price})` : ""}\n`;
      }
    }

    // ─────────────────────────────────────────────────
    // CRITICAL: instructions on how to use the context
    // ─────────────────────────────────────────────────
    base += `

═══════════════════════════════════════════
HOW TO USE THIS CONTEXT
═══════════════════════════════════════════

1. The user is CURRENTLY working on the trip above. When they ask
   questions like "Best time to visit?", "What should I pack?",
   "Is it expensive?", "What can I do on day 3?", or anything else
   that could relate to their trip — assume they mean THIS trip's
   destination (${trip.destination}).

2. Do NOT ask "where are you going?" if the destination is already
   listed above. Only ask clarifying questions when the user's
   intent is genuinely ambiguous.

3. When mentioning dates, weather, or timing, reference the actual
   travel dates listed above.

4. When recommending places, food, or activities, tailor them to
   the destination and the user's stated interests.

5. If the user asks about a DIFFERENT destination than the one on
   this trip, answer that instead — the trip context is a default,
   not a cage.
`;
  } else {
    // No trip — behave as a general travel assistant
    base += `

No specific trip is loaded. If the user asks something that needs
a destination and they haven't provided one, ask for it politely
BEFORE giving generic advice.
`;
  }

  return base;
};

// ─────────────────────────────────────────────────────────────
// Gemini chat
// ─────────────────────────────────────────────────────────────
const chatWithGemini = async (messages, systemPrompt) => {
  const client = getAI();
  console.log(`[Chat] Trying Gemini: ${GEMINI_MODEL}`);

  const contents = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: String(message.content || "") }],
  }));

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 1200,
    },
  });

  const text = response?.text;
  if (!text) throw new Error("Empty Gemini response");

  console.log("[Chat] ✓ Gemini succeeded");
  return text;
};

// ─────────────────────────────────────────────────────────────
// Groq chat
// ─────────────────────────────────────────────────────────────
const chatWithGroq = async (messages, systemPrompt) => {
  const client = getGroq();
  let lastError = null;

  for (const model of GROQ_MODELS) {
    try {
      console.log(`[Chat] Trying Groq: ${model}`);

      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((message) => ({
            role: message.role === "assistant" ? "assistant" : "user",
            content: String(message.content || ""),
          })),
        ],
        temperature: 0.7,
        max_completion_tokens: 2048,
        reasoning_effort: "low",
        reasoning_format: "hidden",
      });

      const text = completion?.choices?.[0]?.message?.content;
      if (!text) throw new Error("Empty Groq response");

      console.log(`[Chat] ✓ Groq succeeded: ${model}`);
      return { text, model };
    } catch (error) {
      lastError = error;
      console.error(`[Chat] ✗ Groq ${model}:`, error?.message);
      continue;
    }
  }

  throw new Error(
    `All Groq chat models failed. Last error: ${lastError?.message || "Unknown error"}`
  );
};

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────
export const chatWithAI = async (messages, trip = null) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Chat messages are required");
  }

  const systemPrompt = buildSystemPrompt(trip);

  try {
    const text = await chatWithGemini(messages, systemPrompt);
    return { text, provider: "gemini", model: GEMINI_MODEL };
  } catch (geminiError) {
    console.warn("[Chat] Gemini failed → Groq fallback");
  }

  try {
    const result = await chatWithGroq(messages, systemPrompt);
    return { text: result.text, provider: "groq", model: result.model };
  } catch (groqError) {
    console.error("[Chat] All AI models failed:", groqError);
    throw new Error(
      "All AI services are temporarily unavailable. Please try again."
    );
  }
};