// backend/services/chatService.js

import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

let ai = null;
let groq = null;

const getAI = () => {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    ai = new GoogleGenAI({
      apiKey: key,
    });
  }

  return ai;
};

const getGroq = () => {
  if (!groq) {
    const key = process.env.GROQ_API_KEY;

    if (!key) {
      throw new Error("GROQ_API_KEY is not set");
    }

    groq = new Groq({
      apiKey: key,
    });
  }

  return groq;
};


/*
==================================================
3 AI MODELS
==================================================

1. Gemini 3.8 Flash
2. Groq GPT-OSS 120B
3. Groq GPT-OSS 20B
==================================================
*/

const GEMINI_MODEL = "gemini-3.8-flash";

const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];


const buildSystemPrompt = (trip) => {

  let base = `
You are "Sky", a warm and friendly AI travel assistant
inside the AI Travel Planner application.

Your job is to help users with:

- Travel planning
- Day plans
- Destinations
- Hotels
- Budgets
- Packing
- Weather
- Transportation
- Local travel tips
- Activities

RULES:

1. Keep answers short and useful.
2. Prefer 2-4 short paragraphs.
3. Use simple conversational language.
4. Use emojis occasionally.
5. Do not use markdown headers.
6. Do not use code blocks.
7. Prices should be in INR (₹) by default.
8. Never invent facts when you are uncertain.
9. Be helpful and specific.
10. If something depends on current information, clearly say that it may change.
`;

  if (trip) {

    const start = trip.startDate
      ? new Date(trip.startDate).toDateString()
      : "Not specified";

    const end = trip.endDate
      ? new Date(trip.endDate).toDateString()
      : "Not specified";

    base += `

CURRENT TRIP:

Destination: ${trip.destination || "Not specified"}
Dates: ${start} → ${end}
Budget: ₹${trip.budget || 0}
Travellers: ${trip.travellers || 1}

`;

    if (Array.isArray(trip.itinerary) && trip.itinerary.length) {
      base += `Itinerary days planned: ${trip.itinerary.length}\n`;
    }

    if (Array.isArray(trip.hotels) && trip.hotels.length) {

      const hotelNames = trip.hotels
        .map((h) => h?.name)
        .filter(Boolean)
        .slice(0, 5)
        .join(", ");

      if (hotelNames) {
        base += `Hotels: ${hotelNames}\n`;
      }
    }
  }

  return base;
};


/*
==================================================
AI #1 — GEMINI
==================================================
*/

const chatWithGemini = async (messages, systemPrompt) => {

  const client = getAI();

  try {

    console.log(`[Chat] Trying Gemini: ${GEMINI_MODEL}`);

    const contents = messages.map((message) => ({
      role:
        message.role === "assistant"
          ? "model"
          : "user",

      parts: [
        {
          text: String(message.content || ""),
        },
      ],
    }));

    const response =
      await client.models.generateContent({

        model: GEMINI_MODEL,

        contents,

        config: {
          systemInstruction: systemPrompt,

          maxOutputTokens: 800,
        },
      });

    const text = response?.text;

    if (!text) {
      throw new Error("Empty Gemini response");
    }

    console.log(
      `[Chat] ✓ Gemini succeeded`
    );

    return text;

  } catch (error) {

    console.error(
      `[Chat] ✗ Gemini failed:`,
      error?.message
    );

    throw error;
  }
};


/*
==================================================
AI #2 + AI #3 — GROQ
==================================================
*/

const chatWithGroq = async (
  messages,
  systemPrompt
) => {

  const client = getGroq();

  let lastError = null;

  for (const model of GROQ_MODELS) {

    try {

      console.log(
        `[Chat] Trying Groq: ${model}`
      );

      const completion =
        await client.chat.completions.create({

          model,

          messages: [
            {
              role: "system",
              content: systemPrompt,
            },

            ...messages.map((message) => ({
              role:
                message.role === "assistant"
                  ? "assistant"
                  : "user",

              content: String(
                message.content || ""
              ),
            })),
          ],

          temperature: 0.7,

          max_completion_tokens: 800,

          reasoning_effort: "low",
          include_reasoning:false,
        });

      const text =
        completion
          ?.choices?.[0]
          ?.message
          ?.content;

      if (!text) {
        throw new Error(
          "Empty Groq response"
        );
      }

      console.log(
        `[Chat] ✓ Groq succeeded: ${model}`
      );

      return {
        text,
        model,
      };

    } catch (error) {

      lastError = error;

      console.error(
        `[Chat] ✗ Groq ${model}:`,
        error?.message
      );

      continue;
    }
  }

  throw new Error(
    `All Groq chat models failed. Last error: ${
      lastError?.message || "Unknown error"
    }`
  );
};


/*
==================================================
MAIN AI FUNCTION
==================================================
*/

export const chatWithAI = async (
  messages,
  trip = null
) => {

  if (
    !Array.isArray(messages) ||
    messages.length === 0
  ) {
    throw new Error(
      "Chat messages are required"
    );
  }

  const systemPrompt =
    buildSystemPrompt(trip);


  /*
  AI #1
  Gemini
  */

  try {

    const text =
      await chatWithGemini(
        messages,
        systemPrompt
      );

    return {
      text,
      provider: "gemini",
      model: GEMINI_MODEL,
    };

  } catch (geminiError) {

    console.warn(
      "[Chat] Gemini failed → Groq fallback"
    );
  }


  /*
  AI #2 / AI #3
  Groq
  */

  try {

    const result =
      await chatWithGroq(
        messages,
        systemPrompt
      );

    return {
      text: result.text,
      provider: "groq",
      model: result.model,
    };

  } catch (groqError) {

    console.error(
      "[Chat] All AI models failed:",
      groqError
    );

    throw new Error(
      "All AI services are temporarily unavailable. Please try again."
    );
  }
};