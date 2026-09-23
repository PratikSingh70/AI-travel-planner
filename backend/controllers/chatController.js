// backend/controllers/chatController.js
import { chatWithAI } from "../services/chatService.js";
import Trip from "../models/Trip.js";

export const sendChatMessage = async (req, res) => {
  try {
    const { messages } = req.body || {};

    // Accept tripId from body OR query string — some frontends send it one
    // way, some the other
    const tripId = req.body?.tripId || req.query?.tripId || null;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "Messages array is required" });
    }

    // Cap to last 10 messages, trim each to 2000 chars
    const trimmed = messages.slice(-10).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 2000),
    }));

    // Load trip context if provided and owned by user
    let trip = null;
    if (tripId) {
      try {
        const t = await Trip.findById(tripId);
        if (t && t.user.toString() === req.user._id.toString()) {
          trip = t;
          console.log(`[Chat] Loaded trip context: "${t.destination}" (${t._id})`);
        } else {
          console.warn(
            `[Chat] tripId ${tripId} not found or not owned by user`
          );
        }
      } catch (err) {
        console.warn(`[Chat] Invalid tripId "${tripId}": ${err.message}`);
      }
    } else {
      console.log("[Chat] No tripId provided — general travel assistant mode");
    }

    const { text, provider, model } = await chatWithAI(trimmed, trip);

    res.json({
      reply: text,
      provider,
      model,
      // Useful for the frontend to show "Context: Bihar trip" if desired
      hasTripContext: Boolean(trip),
      tripDestination: trip?.destination || null,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      message: "Chat failed. Please try again in a moment.",
    });
  }
};