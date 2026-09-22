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

const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
];

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.2-3b-preview",
  "mixtral-8x7b-32768",
];

const buildSystemPrompt = (trip) => {
  let base = `You are "Sky", a warm, friendly AI travel assistant inside the AI Travel Planner app.

Your job: answer travel questions, suggest day plans, help with budgets, packing, weather, transport, and local tips.

Rules:
- Keep answers SHORT and useful (2-4 short paragraphs max).
- Use plain text. Emojis occasionally. No markdown headers, no code blocks.
- Prices in INR by default (₹), unless the user asks otherwise.
- If you don't know, say so — never invent facts.
- Be conversational, warm, and specific.`;

  if (trip) {
    const start = new Date(trip.startDate).toDateString();
    const end = new Date(trip.endDate).toDateString();
    base += `

The user is currently viewing this trip. Use these details when relevant:
- Destination: ${trip.destination}
- Dates: ${start} → ${end}
- Budget: ₹${trip.budget} INR
- Travellers: ${trip.travellers}
${trip.itinerary?.length ? `- Itinerary has ${trip.itinerary.length} days planned` : ""}
${trip.hotels?.length ? `- Hotels suggested: ${trip.hotels.map((h) => h.name).join(", ")}` : ""}

Reference these details when relevant.`;
  }

  return base;
};

const chatWithGemini = async (messages, systemPrompt) => {
  const client = getAI();
  let lastErr = null;

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`[Chat] Trying Gemini: ${model}`);

      const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const response = await client.models.generateContent({
        model,
        contents,
        config: { systemInstruction: systemPrompt },
      });

      const text = response.text;
      if (!text) throw new Error("Empty Gemini response");
      console.log(`[Chat] ✓ Gemini ${model}`);
      return text;
    } catch (err) {
      lastErr = err;
      console.log(`[Chat] ✗ Gemini ${model}: ${err.message?.slice(0, 100)}`);
      continue;
    }
  }
  throw new Error(`All Gemini chat models failed. Last: ${lastErr?.message}`);
};

const chatWithGroq = async (messages, systemPrompt) => {
  const client = getGroq();
  let lastErr = null;

  for (const model of GROQ_MODELS) {
    try {
      console.log(`[Chat] Trying Groq: ${model}`);

      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const text = completion.choices[0]?.message?.content;
      if (!text) throw new Error("Empty Groq response");
      console.log(`[Chat] ✓ Groq ${model}`);
      return text;
    } catch (err) {
      lastErr = err;
      console.log(`[Chat] ✗ Groq ${model}: ${err.message?.slice(0, 100)}`);
      continue;
    }
  }
  throw new Error(`All Groq chat models failed. Last: ${lastErr?.message}`);
};

export const chatWithAI = async (messages, trip = null) => {
  const systemPrompt = buildSystemPrompt(trip);

  try {
    const text = await chatWithGemini(messages, systemPrompt);
    return { text, provider: "gemini" };
  } catch (err) {
    console.warn("[Chat] Gemini failed, falling back to Groq");
    const text = await chatWithGroq(messages, systemPrompt);
    return { text, provider: "groq" };
  }
};