
# AI Travel Planner - Complete Source Code

> Auto-generated from actual project files.
> Last updated: 2026-09-23 11:27

---

## Backend

### backend/config/db.js

```
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
```

### backend/controllers/authController.js

```
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Helper to create a JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.password) {
      return res
        .status(400)
        .json({ message: "This account uses Google sign-in. Please use Google." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/google
export const googleAuth = async (req, res) => {
  try {
    const { email, name, googleId, avatar } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({ message: "Email and googleId required" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({ name, email, googleId, avatar });
    } else if (!user.googleId) {
      // Link Google to existing email/password user
      user.googleId = googleId;
      if (avatar) user.avatar = avatar;
      await user.save();
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/auth/profile
export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      return res
        .status(400)
        .json({ message: "Name must be at least 2 characters" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name.trim();
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/auth/password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both fields are required" });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.password) {
      return res.status(400).json({
        message: "This account uses Google sign-in. No password to change.",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

### backend/controllers/chatController.js

```
// backend/controllers/chatController.js
import { chatWithAI } from "../services/chatService.js";
import Trip from "../models/Trip.js";

export const sendChatMessage = async (req, res) => {
  try {
    const { messages, tripId } = req.body;

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
        }
      } catch {
        /* ignore invalid id */
      }
    }

    const { text, provider } = await chatWithAI(trimmed, trip);

    res.json({ reply: text, provider });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      message: "Chat failed. Please try again in a moment.",
    });
  }
};
```

### backend/controllers/tripController.js

```
import Trip from "../models/Trip.js";
import { generateItinerary } from "../services/geminiService.js";
import { generateItineraryWithGroq } from "../services/groqService.js";
import { geocode, getWeather } from "../services/weatherService.js";
import { getDestinationImage, getPlaceImages } from "../services/imageService.js";
import { getTouristPlaces } from "../services/placesService.js";

// CREATE - POST /api/trips
export const createTrip = async (req, res) => {
  try {
    const { destination, startDate, endDate, budget, travellers, interests } =
      req.body;

    if (!destination || !startDate || !endDate || !budget) {
      return res
        .status(400)
        .json({ message: "Please fill all required fields" });
    }

    const trip = await Trip.create({
      user: req.user._id,
      destination,
      startDate,
      endDate,
      budget,
      travellers: travellers || 1,
      interests: interests || [],
    });

    res.status(201).json(trip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// READ ALL - GET /api/trips
export const getTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    const tripsWithImages = await Promise.all(
      trips.map(async (t) => {
        const image = await getDestinationImage(t.destination);
        return { ...t.toObject(), image };
      })
    );

    res.json(tripsWithImages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// READ ONE - GET /api/trips/:id
export const getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    if (trip.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    res.json(trip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE - PUT /api/trips/:id
export const updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }
    if (trip.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const updated = await Trip.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE - DELETE /api/trips/:id
export const deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }
    if (trip.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await trip.deleteOne();
    res.json({ message: "Trip removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GENERATE ITINERARY - POST /api/trips/:id/generate
export const generateTripItinerary = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }
    if (trip.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    let itinerary;
    let provider = "gemini";

    try {
      console.log("→ Attempting Gemini...");
      itinerary = await generateItinerary(trip);
      console.log("✓ Gemini succeeded");
    } catch (geminiError) {
      console.warn("✗ Gemini failed:", geminiError.message);
      console.log("→ Falling back to Groq...");
      provider = "groq";
      itinerary = await generateItineraryWithGroq(trip);
      console.log("✓ Groq succeeded");
    }

    trip.itinerary = itinerary.days;
    trip.hotels = itinerary.hotels || [];
    trip.budgetBreakdown = itinerary.budgetBreakdown || {
      flights: 0,
      hotels: 0,
      food: 0,
      activities: 0,
      total: 0,
    };
    await trip.save();

    const hotelsWithImages = await Promise.all(
      (trip.hotels || []).map(async (h) => {
        const imgs = await getPlaceImages(h.name + " hotel", 1);
        return { ...h, image: imgs[0] || null };
      })
    );

    const itineraryWithImages = await Promise.all(
      (trip.itinerary || []).map(async (day) => {
        const acts = await Promise.all(
          (day.activities || []).map(async (act) => {
            const imgs = await getPlaceImages(act.title, 1);
            return { ...act, image: imgs[0] || null };
          })
        );
        return { ...day, activities: acts };
      })
    );

    trip.hotels = hotelsWithImages;
    trip.itinerary = itineraryWithImages;
    await trip.save();

    res.json({
      message: `Itinerary generated by ${provider}`,
      provider,
      itinerary: trip.itinerary,
      hotels: trip.hotels,
      budgetBreakdown: trip.budgetBreakdown,
    });
  } catch (error) {
    console.error("AI generation error:", error);

    const raw = error.message || "";
    let friendly = "AI generation failed. Please try again.";

    if (
      raw.includes("503") ||
      raw.includes("UNAVAILABLE") ||
      raw.includes("high demand")
    ) {
      friendly =
        "Both AI providers are busy right now. Please wait a minute and try again.";
    } else if (raw.includes("API key not valid")) {
      friendly = "API key is invalid. Check backend .env.";
    } else if (raw.includes("quota") || raw.includes("429")) {
      friendly = "Rate limit reached. Wait about a minute and retry.";
    } else if (raw.includes("valid JSON")) {
      friendly = "AI returned invalid JSON. Please retry.";
    }

    res.status(500).json({ message: friendly });
  }
};

// GET WEATHER - GET /api/trips/:id/weather
export const getTripWeather = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) return res.status(404).json({ message: "Trip not found" });
    if (trip.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    try {
      const location = await geocode(trip.destination);
      const weather = await getWeather(location.lat, location.lng);
      return res.json({
        location,
        current: weather.current,
        daily: weather.daily,
      });
    } catch (innerErr) {
      console.error("Weather inner error:", innerErr.message);
      return res.json({ location: null, current: null, daily: null });
    }
  } catch (error) {
    console.error("Weather error:", error);
    res.status(500).json({ message: error.message || "Weather fetch failed" });
  }
};

// GET IMAGE - GET /api/trips/:id/image
export const getTripImage = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    if (trip.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const imageUrl = await getDestinationImage(trip.destination);
    res.json({ imageUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET TOURIST PLACES - GET /api/trips/:id/places
export const getTripPlaces = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    if (trip.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const location = await geocode(trip.destination);
    const places = await getTouristPlaces(location.lat, location.lng);

    res.json({ location, places });
  } catch (error) {
    console.error("Places error:", error);
    res.json({ location: null, places: [] });
  }
};

// PHOTO SEARCH - GET /api/trips/photo?q=...&count=4
export const searchPhotos = async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.json({ images: [] });

    const count = parseInt(req.query.count) || 4;
    const images = await getPlaceImages(q, count);
    res.json({ images });
  } catch (error) {
    res.status(500).json({ images: [] });
  }
};

// SHARE - POST /api/trips/:id/share
export const shareTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) return res.status(404).json({ message: "Trip not found" });
    if (trip.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!trip.shareId) {
      const id = Math.random().toString(36).substring(2, 10);
      trip.shareId = id;
      await trip.save();
    }

    res.json({ shareId: trip.shareId });
  } catch (error) {
    console.error("Share error:", error);
    res.status(500).json({ message: error.message });
  }
};

// PUBLIC - GET /api/trips/shared/:shareId
export const getSharedTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ shareId: req.params.shareId }).populate(
      "user",
      "name"
    );

    if (!trip) {
      return res.status(404).json({ message: "Shared trip not found" });
    }

    res.json({
      _id: trip._id,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      budget: trip.budget,
      travellers: trip.travellers,
      interests: trip.interests,
      itinerary: trip.itinerary,
      hotels: trip.hotels,
      budgetBreakdown: trip.budgetBreakdown,
      sharedBy: trip.user?.name || "Someone",
      createdAt: trip.createdAt,
    });
  } catch (error) {
    console.error("Shared trip error:", error);
    res.status(500).json({ message: error.message });
  }
};
```

### backend/middleware/authMiddleware.js

```
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};
```

### backend/models/Trip.js

```
import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    destination: {
      type: String,
      required: [true, "Destination is required"],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    budget: {
      type: Number,
      required: [true, "Budget is required"],
      min: 0,
    },
    travellers: {
      type: Number,
      default: 1,
      min: 1,
    },
    spotsCount: {
      type: Number,
      default: 5,
      min: 1,
      max: 50,
    },
    interests: {
      type: [String],
      default: [],
    },
    itinerary: {
      type: Array,
      default: [],
    },
    hotels: {
      type: Array,
      default: [],
    },
    budgetBreakdown: {
      flights: { type: Number, default: 0 },
      hotels: { type: Number, default: 0 },
      food: { type: Number, default: 0 },
      activities: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    // ─── AI-generated cover art URL ───
    image: {
      type: String,
      default: "",
    },
    // ─── unique share identifier for public links ───
    shareId: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

const Trip = mongoose.model("Trip", tripSchema);

export default Trip;
```

### backend/models/User.js

```
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Not required — Google users won't have a password
    password: {
      type: String,
      required: false,
      minlength: 6,
    },
    // Added for Google OAuth
    googleId: {
      type: String,
      default: null,
    },
    avatar: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
```

### backend/package.json

```
{
  "name": "backend",
  "version": "1.0.0",
  "description": "",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@google/genai": "^2.22.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "groq-sdk": "^1.6.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.5.1",
    "node-fetch": "^3.3.2"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  }
}
```

### backend/routes/authRoutes.js

```
import express from "express";
import {
  registerUser,
  loginUser,
  googleAuth,
  getProfile,
  updateProfile,
  changePassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleAuth);

// Protected
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.put("/password", protect, changePassword);

export default router;
```

### backend/routes/chatRoutes.js

```
// backend/routes/chatRoutes.js
import express from "express";
import { sendChatMessage } from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, sendChatMessage);

export default router;
```

### backend/routes/tripRoutes.js

```
import express from "express";
import {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  generateTripItinerary,
  getTripWeather,
  getTripImage,
  getTripPlaces,
  searchPhotos,
  shareTrip,
  getSharedTrip,
} from "../controllers/tripController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ══════════════════════════════════════════════════════════
// PUBLIC ROUTES — no authentication required
// These must come BEFORE router.use(protect)
// ══════════════════════════════════════════════════════════
router.get("/shared/:shareId", getSharedTrip);

// ══════════════════════════════════════════════════════════
// PROTECTED ROUTES — require valid JWT
// ══════════════════════════════════════════════════════════
router.use(protect);

router.get("/photo", searchPhotos);

router.route("/").post(createTrip).get(getTrips);
router.post("/:id/generate", generateTripItinerary);
router.get("/:id/weather", getTripWeather);
router.get("/:id/image", getTripImage);
router.get("/:id/places", getTripPlaces);
router.post("/:id/share", shareTrip);
router.route("/:id").get(getTripById).put(updateTrip).delete(deleteTrip);

export default router;
```

### backend/server.js

```
import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "API is running..." });
});

app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

### backend/services/chatService.js

```
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

          temperature: 0.7,

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

          max_tokens: 800,

          reasoning_effort: "low",
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
```

### backend/services/geminiService.js

```
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

// Current working Gemini models (2026)
const MODELS = [
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
];

const generateWithRetry = async (prompt) => {
  const client = getAI();
  let lastError = null;

  for (const model of MODELS) {
    try {
      console.log(`→ Trying ${model}...`);
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

      if (
        status === 404 ||
        msg.includes("not found") ||
        msg.includes("no longer available")
      ) {
        console.log(`  ✗ ${model} not available — next`);
      } else if (status === 429 || msg.includes("quota")) {
        console.log(`  ✗ ${model} rate limited — next`);
      } else if (status === 503 || msg.includes("high demand")) {
        console.log(`  ✗ ${model} busy — next`);
      } else {
        console.log(`  ✗ ${model} failed: ${err?.message?.slice(0, 80)}`);
      }
    }
  }

  throw new Error(
    `All Gemini models failed. Last error: ${lastError?.message || "Unknown"}`
  );
};

export const generateItinerary = async (trip) => {
  const spotsCount = trip.spotsCount || 5;

  const prompt = `You are an expert AI travel planner.
Generate a complete travel plan based on these details:

Destination: ${trip.destination}
Start Date: ${trip.startDate.toISOString().split("T")[0]}
End Date: ${trip.endDate.toISOString().split("T")[0]}
Budget (INR): ${trip.budget}
Number of Travellers: ${trip.travellers}
Places to Cover: ${spotsCount} distinct spots
Interests: ${trip.interests?.length ? trip.interests.join(", ") : "general sightseeing"}

REQUIREMENTS:
1. Plan one entry per day of the trip, including start and end dates.
2. Suggest 3 to 5 activities per day, each with time, title, description, location, and cost in INR.
3. Suggest 3 to 5 realistic hotels near the destination with name, rating (1-5), price per night in INR, and short address.
4. Provide a budget breakdown: flights, hotels, food, activities, total — all in INR.
5. Keep total within the user's stated budget.
6. Cover exactly ${spotsCount} distinct places across the trip. Spread them evenly across the days. Do not repeat the same place on multiple days.
7. Return ONLY valid JSON. No markdown. No explanations outside the JSON.

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
  if (!itinerary.summary)
    itinerary.summary = `Travel plan for ${trip.destination}`;
  if (!Array.isArray(itinerary.days))
    throw new Error("Itinerary missing 'days' array.");
  if (!Array.isArray(itinerary.hotels)) itinerary.hotels = [];
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
};
```

### backend/services/groqService.js

```
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
```

### backend/services/imageService.js

```
// backend/services/imageService.js
// Uses Pexels API (free) to fetch real destination photos.

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_URL = "https://api.pexels.com/v1/search";

// Cache results in memory for 24h
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const getDestinationImage = async (destination) => {
  if (!PEXELS_API_KEY) {
    console.warn("PEXELS_API_KEY not set in .env");
    return null;
  }

  const cacheKey = `dest:${destination.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.url;
  }

  try {
    const url = `${PEXELS_URL}?query=${encodeURIComponent(
      destination + " travel landscape"
    )}&per_page=1&orientation=landscape`;

    const res = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
    });

    if (!res.ok) throw new Error(`Pexels returned ${res.status}`);

    const data = await res.json();
    const imageUrl = data.photos?.[0]?.src?.large2x || data.photos?.[0]?.src?.large || null;

    if (imageUrl) {
      cache.set(cacheKey, { url: imageUrl, time: Date.now() });
    }

    return imageUrl;
  } catch (err) {
    console.error("Pexels image error:", err.message);
    return null;
  }
};

// Get multiple images for a place (for hotel/attraction cards)
export const getPlaceImages = async (query, count = 1) => {
  if (!PEXELS_API_KEY) return [];

  const cacheKey = `place:${query.toLowerCase()}:${count}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.urls;
  }

  try {
    const url = `${PEXELS_URL}?query=${encodeURIComponent(
      query
    )}&per_page=${count}&orientation=landscape`;

    const res = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
    });

    if (!res.ok) throw new Error(`Pexels returned ${res.status}`);

    const data = await res.json();
    const urls = (data.photos || []).map((p) => p.src.large || p.src.medium);

    cache.set(cacheKey, { urls, time: Date.now() });
    return urls;
  } catch (err) {
    console.error("Pexels images error:", err.message);
    return [];
  }
};
```

### backend/services/placesService.js

```
// backend/services/placesService.js
// Finds tourist attractions near a location using Overpass API (OpenStreetMap).
// Tries multiple mirrors, caches by location, and adds Pexels photos.

import { getPlaceImages } from "./imageService.js";

const cache = new Map(); // in-memory cache, keyed by rounded lat/lng

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

export const getTouristPlaces = async (lat, lng, radiusMeters = 15000) => {
  const cacheKey = `${lat.toFixed(1)},${lng.toFixed(1)},${radiusMeters}`;

  if (cache.has(cacheKey)) {
    console.log("Places cache hit:", cacheKey);
    return cache.get(cacheKey);
  }

  const query = `
    [out:json][timeout:25];
    (
      node["tourism"~"attraction|museum|viewpoint|artwork|gallery|zoo|theme_park"](around:${radiusMeters},${lat},${lng});
      way["tourism"~"attraction|museum|viewpoint|artwork|gallery|zoo|theme_park"](around:${radiusMeters},${lat},${lng});
    );
    out center 30;
  `;

  let rawPlaces = [];

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(mirror, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "AI-Travel-Planner-MCA/1.0",
        },
        body: "data=" + encodeURIComponent(query),
      });

      if (!res.ok) continue;

      const data = await res.json();

      rawPlaces = (data.elements || [])
        .map((el) => {
          const la = el.lat ?? el.center?.lat;
          const lo = el.lon ?? el.center?.lon;
          const name = el.tags?.name;
          if (!name || !la || !lo) return null;

          return {
            id: el.id,
            name,
            lat: la,
            lng: lo,
            type: el.tags?.tourism || "attraction",
            description: el.tags?.description || el.tags?.["description:en"] || "",
            image: null, // will be filled below
          };
        })
        .filter(Boolean);

      break; // stop trying mirrors if this one worked
    } catch (err) {
      console.error(`Places mirror failed (${mirror}):`, err.message);
    }
  }

  // Dedupe by name, take first 12
  const seen = new Set();
  const unique = [];
  for (const p of rawPlaces) {
    if (!seen.has(p.name)) {
      seen.add(p.name);
      unique.push(p);
      if (unique.length >= 12) break;
    }
  }

  // Fetch a Pexels photo for each place (in parallel, but with limit)
  const withImages = await Promise.all(
    unique.map(async (p) => {
      const imgs = await getPlaceImages(p.name, 1);
      return { ...p, image: imgs[0] || null };
    })
  );

  cache.set(cacheKey, withImages);
  return withImages;
};
```

### backend/services/weatherService.js

```
// backend/services/weatherService.js
// Uses Open-Meteo + Nominatim (both free, no API key required).

const USER_AGENT =
  "AI-Travel-Planner-MCA/1.0 (https://github.com/PratikSingh70/AI-travel-planner)";

const geoCache = new Map();
const GEO_TTL = 30 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Try Open-Meteo first (more lenient), then Nominatim.
const geocodeOpenMeteo = async (place) => {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    place
  )}&count=1&language=en&format=json`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Open-Meteo geocoding ${res.status}`);
  const data = await res.json();
  if (!data.results?.length) throw new Error("Open-Meteo: no results");
  const r = data.results[0];
  return {
    lat: r.latitude,
    lng: r.longitude,
    displayName: `${r.name}${r.country ? ", " + r.country : ""}`,
  };
};

const geocodeNominatim = async (place) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    place
  )}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  if (!data.length) throw new Error("Nominatim: no results");
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
};

// Try multiple shortened variants of the input
const geocodeAny = async (place) => {
  const parts = place
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const variants = [
    place,
    parts.slice(0, 3).join(", "),
    parts.slice(0, 2).join(", "),
    parts[0],
    parts.slice(-2).join(", "),
  ].filter(Boolean);

  const providers = [geocodeOpenMeteo, geocodeNominatim];
  let lastError;

  for (const variant of variants) {
    for (const provider of providers) {
      try {
        return await provider(variant);
      } catch (err) {
        lastError = err;
        if (provider === geocodeNominatim) await sleep(300);
      }
    }
  }

  throw new Error(
    `Could not geocode "${place}". Last error: ${lastError?.message}`
  );
};

export const geocode = async (place) => {
  const key = place.toLowerCase().trim();
  const cached = geoCache.get(key);
  if (cached && Date.now() - cached.time < GEO_TTL) {
    return cached.value;
  }

  const result = await geocodeAny(place);
  geoCache.set(key, { value: result, time: Date.now() });
  return result;
};

export const getWeather = async (lat, lng) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  return await res.json();
};
```

---

## Frontend

### frontend/eslint.config.js

```
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
```

### frontend/index.html

```
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;600;700&family=Roboto+Mono:wght@500;700&display=swap" rel="stylesheet" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Travel Planner</title>

    <!-- Force light theme — never apply dark class -->
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <script>
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### frontend/package.json

```
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tabler/icons-react": "^3.46.0",
    "axios": "^1.20.0",
    "clsx": "^2.1.1",
    "html2pdf.js": "^0.14.0",
    "leaflet": "^1.9.4",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-leaflet": "^5.0.0",
    "react-router-dom": "^7.18.3",
    "tailwind-merge": "^3.7.0"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.7",
    "@vitejs/plugin-react": "^6.1.1",
    "autoprefixer": "^10.6.0",
    "eslint": "^10.10.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.6",
    "globals": "^17.12.0",
    "postcss": "^8.5.28",
    "tailwindcss": "^3.4.19",
    "vite": "^8.3.0"
  }
}
```

### frontend/postcss.config.js

```
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### frontend/README.md

```
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
```

### frontend/src/api/axios.js

```
import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export default api;
```

### frontend/src/App.jsx

```
import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import ChatAssistant from "./components/ChatAssistant";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Trips from "./pages/Trips";
import CreateTrip from "./pages/CreateTrip";
import TripDetail from "./pages/TripDetail";
import EditTrip from "./pages/EditTrip";
import Profile from "./pages/Profile";
import Landing from "./pages/Landing";
import SharedTrip from "./pages/SharedTrip";
import WeatherAwareItinerary from "./pages/WeatherAwareItinerary";
import WeatherTrips from "./pages/WeatherTrips";
import TripJournal from "./pages/TripJournal";
import JournalTrips from "./pages/JournalTrips";
import NotFound from "./pages/NotFound";
import { useAuth } from "./context/AuthContext";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
};

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

const App = () => {
  const location = useLocation();
  const hideNavbar = ["/", "/login", "/register"].includes(location.pathname);

  return (
    <>
      <ScrollToTop />
      {!hideNavbar && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth initialMode="login" />} />
        <Route path="/register" element={<Auth initialMode="signup" />} />
        <Route path="/share/:shareId" element={<SharedTrip />} />

        {/* Protected */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/trips" element={<PrivateRoute><Trips /></PrivateRoute>} />
        <Route path="/trips/new" element={<PrivateRoute><CreateTrip /></PrivateRoute>} />
        <Route path="/trips/:id" element={<PrivateRoute><TripDetail /></PrivateRoute>} />
        <Route path="/trips/:id/edit" element={<PrivateRoute><EditTrip /></PrivateRoute>} />
        <Route path="/trips/:id/journal" element={<PrivateRoute><TripJournal /></PrivateRoute>} />
        <Route path="/weather" element={<PrivateRoute><WeatherTrips /></PrivateRoute>} />
        <Route path="/weather-itinerary" element={<PrivateRoute><WeatherAwareItinerary /></PrivateRoute>} />
        <Route path="/trips/:id/weather-itinerary" element={<PrivateRoute><WeatherAwareItinerary /></PrivateRoute>} />
        <Route path="/journal" element={<PrivateRoute><JournalTrips /></PrivateRoute>} />
        <Route path="/journal/demo" element={<PrivateRoute><TripJournal /></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ChatAssistant />
    </>
  );
};

export default App;
```

### frontend/src/components/ChatAssistant.css

```
/* frontend/src/components/ChatAssistant.css */

/* ═════════════════════════════════════════════════════
   FLOATING BUTTON
   ═════════════════════════════════════════════════════ */

.chat-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #a3e635, #bef264);
  color: #000;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900;
  box-shadow:
    0 10px 30px -6px rgba(163, 230, 53, 0.6),
    0 0 0 1px rgba(163, 230, 53, 0.3);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.25s ease;
  -webkit-tap-highlight-color: transparent;
}

.chat-fab:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow:
    0 16px 40px -8px rgba(163, 230, 53, 0.85),
    0 0 0 1px rgba(163, 230, 53, 0.5);
}

.chat-fab:active {
  transform: translateY(-1px) scale(0.98);
}

.chat-fab.open {
  background: #111111;
  color: #a3e635;
  box-shadow:
    0 10px 30px -6px rgba(0, 0, 0, 0.9),
    0 0 0 1px rgba(163, 230, 53, 0.4);
}

.chat-fab-icon {
  font-size: 1.5rem;
  line-height: 1;
  animation: chatSparkle 2.5s ease-in-out infinite;
}

@keyframes chatSparkle {
  0%, 100% { transform: rotate(0deg) scale(1); }
  50%      { transform: rotate(15deg) scale(1.1); }
}

/* ═════════════════════════════════════════════════════
   CHAT WINDOW
   ═════════════════════════════════════════════════════ */

.chat-window {
  position: fixed;
  bottom: 92px;
  right: 24px;
  width: 380px;
  max-width: calc(100vw - 32px);
  height: 560px;
  max-height: calc(100vh - 140px);
  background: #0b0b0b;
  border: 1px solid rgba(163, 230, 53, 0.3);
  border-radius: 22px;
  display: flex;
  flex-direction: column;
  z-index: 901;
  overflow: hidden;
  box-shadow:
    0 30px 70px -20px rgba(0, 0, 0, 0.95),
    0 0 40px -12px rgba(163, 230, 53, 0.25);
  animation: chatWindowIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: 'Poppins', system-ui, sans-serif;
}

@keyframes chatWindowIn {
  from { opacity: 0; transform: translateY(12px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Header ── */
.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(135deg, rgba(163, 230, 53, 0.08), transparent);
  flex-shrink: 0;
}

.chat-header-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a3e635, #bef264);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
  box-shadow: 0 0 16px rgba(163, 230, 53, 0.4);
}

.chat-header-info {
  flex: 1;
  min-width: 0;
}

.chat-header-name {
  font-size: 0.92rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.01em;
}

.chat-header-sub {
  font-size: 0.68rem;
  color: #888888;
  font-weight: 600;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-header-close {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #888888;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-family: inherit;
  transition: all 0.2s;
  flex-shrink: 0;
}

.chat-header-close:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
}

/* ── Messages ── */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-messages::-webkit-scrollbar {
  width: 5px;
}
.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}
.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(163, 230, 53, 0.3);
  border-radius: 3px;
}

.chat-msg {
  display: flex;
  max-width: 100%;
}

.chat-msg.user {
  justify-content: flex-end;
}

.chat-msg.assistant {
  justify-content: flex-start;
}

.chat-bubble {
  max-width: 85%;
  padding: 11px 15px;
  border-radius: 16px;
  font-size: 0.85rem;
  line-height: 1.55;
  font-weight: 500;
  white-space: pre-wrap;
  word-wrap: break-word;
  animation: chatBubbleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes chatBubbleIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.chat-msg.user .chat-bubble {
  background: linear-gradient(135deg, #a3e635, #bef264);
  color: #000;
  border-bottom-right-radius: 6px;
  font-weight: 600;
}

.chat-msg.assistant .chat-bubble {
  background: #1a1a1a;
  color: #e5e5e5;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom-left-radius: 6px;
}

/* Typing dots */
.chat-typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  min-height: 20px;
}

.chat-typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #a3e635;
  animation: chatTypingDot 1.3s ease-in-out infinite;
}

.chat-typing span:nth-child(2) {
  animation-delay: 0.15s;
}

.chat-typing span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes chatTypingDot {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30%           { opacity: 1;   transform: translateY(-4px); }
}

/* ── Suggestions ── */
.chat-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 14px 12px;
  flex-shrink: 0;
}

.chat-suggestion {
  background: transparent;
  border: 1px solid rgba(163, 230, 53, 0.35);
  color: #a3e635;
  padding: 6px 12px;
  border-radius: 9999px;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.chat-suggestion:hover {
  background: rgba(163, 230, 53, 0.12);
  transform: translateY(-1px);
}

/* ── Input row ── */
.chat-input-row {
  display: flex;
  gap: 8px;
  padding: 12px 14px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.chat-input {
  flex: 1;
  min-width: 0;
  background: #000;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 11px 14px;
  color: #fff;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.chat-input::placeholder {
  color: #52525b;
}

.chat-input:focus {
  outline: none;
  border-color: #a3e635;
  box-shadow: 0 0 0 3px rgba(163, 230, 53, 0.15);
}

.chat-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-send {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #a3e635, #bef264);
  color: #000;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 6px 16px -4px rgba(163, 230, 53, 0.5);
}

.chat-send:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px -4px rgba(163, 230, 53, 0.75);
}

.chat-send:active:not(:disabled) {
  transform: translateY(0) scale(0.97);
}

.chat-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

/* ── Mobile ── */
@media (max-width: 480px) {
  .chat-fab {
    bottom: 18px;
    right: 18px;
    width: 52px;
    height: 52px;
  }

  .chat-window {
    bottom: 82px;
    right: 12px;
    left: 12px;
    width: auto;
    height: calc(100vh - 120px);
    max-height: 600px;
    border-radius: 20px;
  }

  .chat-bubble {
    max-width: 90%;
    font-size: 0.82rem;
  }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .chat-fab,
  .chat-fab-icon,
  .chat-window,
  .chat-bubble,
  .chat-typing span {
    animation: none !important;
    transition: none !important;
  }
}

/* ── Refresh button in header ── */
.chat-header-refresh {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #888888;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
  padding: 0;
}

.chat-header-refresh:hover:not(:disabled) {
  color: #a3e635;
  border-color: rgba(163, 230, 53, 0.5);
  background: rgba(163, 230, 53, 0.08);
  transform: rotate(-90deg);
}

.chat-header-refresh:active:not(:disabled) {
  transform: rotate(-180deg) scale(0.95);
}

.chat-header-refresh:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Spinning animation while loading */
.chat-header-refresh.spinning svg {
  animation: chatRefreshSpin 0.9s linear infinite;
}

@keyframes chatRefreshSpin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .chat-header-refresh,
  .chat-header-refresh svg {
    transition: none !important;
    animation: none !important;
  }
}
```

### frontend/src/components/ChatAssistant.jsx

```
import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useTripActions } from "../context/TripActionsContext";
import "./ChatAssistant.css";

const SUGGESTIONS = [
  "Best time to visit?",
  "What should I pack?",
  "Cheap food spots?",
  "Local transport tips?",
];

const ChatAssistant = () => {
  const { user } = useAuth();
  const { actions } = useTripActions();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const tripContext = actions?.trip || null;

  // Welcome message helper
  const welcomeMessage = () => ({
    role: "assistant",
    content: tripContext
      ? `Hi! 👋 I can help with your trip to ${tripContext.destination}. Ask me anything — packing, budget, local tips, day plans.`
      : `Hi! 👋 I'm Sky, your travel assistant. Ask me anything — trip ideas, packing, budgets, local tips.`,
  });

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Welcome message on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([welcomeMessage()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Hide on landing page and when logged out
  if (location.pathname === "/" || !user) return null;

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/chat", {
        messages: next,
        tripId: tripContext?._id || null,
      });
      setMessages([...next, { role: "assistant", content: res.data.reply }]);
    } catch (err) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            err.response?.data?.message ||
            "Sorry, I couldn't reply just now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Refresh — clears conversation and resets to welcome
  const handleRefresh = () => {
    if (loading) return;
    setMessages([welcomeMessage()]);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        className={`chat-fab ${open ? "open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open AI assistant"}
      >
        {open ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <span className="chat-fab-icon">✨</span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-avatar">✨</div>
            <div className="chat-header-info">
              <div className="chat-header-name">Sky</div>
              <div className="chat-header-sub">
                {tripContext
                  ? `Trip: ${tripContext.destination}`
                  : "AI Travel Assistant"}
              </div>
            </div>

            {/* 🔄 Refresh button */}
            <button
              type="button"
              className="chat-header-refresh"
              onClick={handleRefresh}
              disabled={loading}
              title="Start a new conversation"
              aria-label="Refresh chat"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
              </svg>
            </button>

            <button
              className="chat-header-close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          <div className="chat-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <div className="chat-bubble">{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg assistant">
                <div className="chat-bubble chat-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && !loading && (
            <div className="chat-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chat-suggestion"
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="chat-input-row">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask anything..."
              className="chat-input"
              disabled={loading}
            />
            <button
              type="button"
              className="chat-send"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;
```

### frontend/src/components/DeleteButton.css

```
/* frontend/src/components/DeleteButton.css */

/* ═════════════════════════════════════════════════════
   DELETE-TRIP BUTTON — matches Edit Trip, red on hover
   ═════════════════════════════════════════════════════ */

.dtb-root {
  --dtb-cycle: 2.6s;
  --dtb-ltr-stagger: 0.09s;
  --dtb-ltr-dur: 1.6s;
  --dtb-ltr-start: 0.30s;

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 11px 20px 11px 16px;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: #111111;
  color: #ffffff;
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  box-shadow: none;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  transition:
    background 0.28s ease,
    color 0.28s ease,
    border-color 0.28s ease,
    box-shadow 0.28s ease,
    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

/* ─── Hover: turns red ─── */
.dtb-root:hover {
  background: rgba(248, 113, 113, 0.12);
  color: #fca5a5;
  border-color: #ef4444;
  box-shadow: 0 14px 30px -10px rgba(239, 68, 68, 0.45);
  transform: translateY(-3px);
}

.dtb-root:active { transform: translateY(-1px); }

.dtb-root:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(163, 230, 53, 0.5);
}

/* ═══ Bin (stationary) ═══ */
.dtb-bin {
  position: relative;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  z-index: 3;
  will-change: transform;
  color: currentColor;
}
.dtb-bin svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.dtb-bin__body {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.dtb-bin__lid {
  transform-box: fill-box;
  transform-origin: 8% 92%;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  will-change: transform;
}

/* ═══ Sparks ═══ */
.dtb-sparks {
  position: absolute;
  left: 50%;
  top: 40%;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 4;
}
.dtb-spark {
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #ffffff;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0);
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.9);
  will-change: transform, opacity;
}
.dtb-spark:nth-child(2n) {
  background: #fecaca;
  box-shadow: 0 0 6px rgba(254, 202, 202, 0.9);
}
.dtb-spark:nth-child(3n) {
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.9);
}

/* ═══ Label ═══ */
.dtb-label {
  display: inline-flex;
  align-items: center;
  z-index: 1;
  white-space: nowrap;
  pointer-events: none;
}
.dtb-ltr {
  display: inline-block;
  will-change: transform, opacity;
  transform-origin: 50% 60%;
}

/* ═════════════════════════════════════════════════════
   ANIMATION TIMELINE
   ═════════════════════════════════════════════════════ */

/* Bin body squash */
.dtb-root.eating .dtb-bin {
  animation: dtbBinSquash var(--dtb-cycle) cubic-bezier(0.65, 0, 0.35, 1) forwards;
}
@keyframes dtbBinSquash {
  0%, 62% { transform: scale(1, 1); }
  67%     { transform: scale(1.10, 0.86); }
  73%     { transform: scale(0.97, 1.07); }
  79%     { transform: scale(1, 1); }
  100%    { transform: scale(1, 1); }
}

/* Lid open → hold → snap */
.dtb-root.eating .dtb-bin__lid {
  animation: dtbLidMouth var(--dtb-cycle) cubic-bezier(0.65, 0, 0.35, 1) forwards;
}
@keyframes dtbLidMouth {
  0%   { transform: rotate(0deg); }
  12%  { transform: rotate(-74deg); }
  58%  { transform: rotate(-74deg); }
  65%  { transform: rotate(8deg);  }
  71%  { transform: rotate(-4deg); }
  78%  { transform: rotate(0deg);  }
  100% { transform: rotate(0deg);  }
}

/* Letters fly into bin */
.dtb-root.eating .dtb-ltr {
  animation: dtbLetterEat var(--dtb-ltr-dur) cubic-bezier(0.55, 0, 0.25, 1) forwards;
  animation-delay: calc(var(--dtb-ltr-start) + var(--i) * var(--dtb-ltr-stagger));
}
@keyframes dtbLetterEat {
  0%   { opacity: 1; transform: translate(0, 0) scale(1); }
  8%   { opacity: 1; transform: translate(0, 0) scale(1.06); }
  30%  { opacity: 0; transform: translate(var(--eat-x), var(--eat-y)) scale(0.1); }
  55%  { opacity: 0; transform: translate(var(--eat-x), var(--eat-y)) scale(0.1); }
  72%  { opacity: 1; transform: translate(0, 0) scale(1); }
  100% { opacity: 1; transform: translate(0, 0) scale(1); }
}

/* Sparks fly out at the snap */
.dtb-root.eating .dtb-spark {
  animation: dtbSparkFly 0.6s cubic-bezier(0.22, 0.9, 0.3, 1) forwards;
  animation-delay: calc(1.72s + var(--sd, 0s));
}
@keyframes dtbSparkFly {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(
        calc(-50% + var(--dx)),
        calc(-50% + var(--dy))
      )
      scale(0.2);
  }
}

/* ═════════════════════════════════════════════════════
   CONFIRMATION MODAL — DARK
   ═════════════════════════════════════════════════════ */

.dtb-modal-back {
  position: fixed;
  inset: 0;
  z-index: 5000;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: dtbModalFade 0.22s ease-out;
}
@keyframes dtbModalFade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.dtb-modal {
  width: 100%;
  max-width: 440px;
  background: #0b0b0b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 36px 32px 28px;
  text-align: center;
  box-shadow:
    0 30px 80px -30px rgba(0, 0, 0, 0.95),
    0 0 40px -12px rgba(163, 230, 53, 0.15);
  animation: dtbModalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: 'Poppins', system-ui, sans-serif;
}
@keyframes dtbModalPop {
  from { opacity: 0; transform: translateY(20px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.dtb-modal__icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 18px;
  border-radius: 20px;
  background: rgba(248, 113, 113, 0.12);
  border: 2px solid rgba(248, 113, 113, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
}
.dtb-modal__title {
  font-size: 1.35rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.02em;
  margin: 0 0 10px;
}
.dtb-modal__text {
  font-size: 0.88rem;
  color: #888888;
  line-height: 1.6;
  margin: 0 0 28px;
}
.dtb-modal__actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}
.dtb-modal__btn {
  flex: 1;
  padding: 13px 20px;
  border-radius: 14px;
  border: none;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}
.dtb-modal__btn--cancel {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.14);
}
.dtb-modal__btn--cancel:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
}
.dtb-modal__btn--danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  box-shadow: 0 8px 22px -6px rgba(239, 68, 68, 0.55);
}
.dtb-modal__btn--danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px -8px rgba(239, 68, 68, 0.7);
}

@media (max-width: 480px) {
  .dtb-modal { padding: 28px 22px 22px; border-radius: 20px; }
  .dtb-modal__title { font-size: 1.15rem; }
  .dtb-modal__actions { flex-direction: column-reverse; }
}

@media (prefers-reduced-motion: reduce) {
  .dtb-root.eating .dtb-bin,
  .dtb-root.eating .dtb-bin__lid,
  .dtb-root.eating .dtb-ltr,
  .dtb-root.eating .dtb-spark,
  .dtb-modal-back,
  .dtb-modal {
    animation-duration: 0.001ms !important;
    animation-delay: 0ms !important;
  }
}
```

### frontend/src/components/DeleteButton.jsx

```
// frontend/src/components/DeleteButton.jsx
import { useState, useRef, useEffect } from "react";
import "./DeleteButton.css";

const DeleteButton = ({ onClick, label = "Delete Trip" }) => {
  const binRef = useRef(null);
  const labelRef = useRef(null);
  const [eating, setEating] = useState(false);
  const busyRef = useRef(false);
  const audioRef = useRef({ ac: null, noiseBuf: null });
  const timeoutRef = useRef(null);

  /* ═══════════ Audio ═══════════ */
  const getAudio = () => {
    const a = audioRef.current;
    if (!a.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      a.ac = new AC();
      const len = a.ac.sampleRate * 0.5;
      a.noiseBuf = a.ac.createBuffer(1, len, a.ac.sampleRate);
      const d = a.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (a.ac.state === "suspended") a.ac.resume();
    return a.ac;
  };

  useEffect(() => {
    const unlock = () => {
      getAudio();
      window.removeEventListener("pointerdown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const noise = ({
    type = "bandpass",
    freq = 1200,
    q = 1,
    dur = 0.15,
    vol = 0.15,
    delay = 0,
    sweepTo = null,
  } = {}) => {
    const ctx = getAudio();
    if (!ctx) return;
    const a = audioRef.current;
    const t0 = ctx.currentTime + delay;
    const s = ctx.createBufferSource();
    s.buffer = a.noiseBuf;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(ctx.destination);
    s.start(t0);
    s.stop(t0 + dur + 0.05);
  };

  const tone = ({
    type = "sine",
    from = 440,
    to = 440,
    dur = 0.12,
    vol = 0.15,
    delay = 0,
  } = {}) => {
    const ctx = getAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  };

  const playSounds = (letterCount) => {
    // Click
    tone({ type: "square", from: 900, to: 200, dur: 0.03, vol: 0.06 });
    noise({ type: "highpass", freq: 3000, q: 0.7, dur: 0.03, vol: 0.05 });

    // Whoosh per letter
    const n = Math.min(letterCount, 12);
    for (let i = 0; i < n; i++) {
      const d = 0.3 + i * 0.09;
      noise({
        type: "bandpass",
        freq: 900 + i * 110,
        sweepTo: 260,
        q: 1.3,
        dur: 0.3,
        vol: 0.05,
        delay: d,
      });
    }

    // Lid snap
    noise({ type: "highpass", freq: 2500, q: 0.9, dur: 0.06, vol: 0.14, delay: 1.69 });
    tone({ type: "triangle", from: 260, to: 70, dur: 0.18, vol: 0.14, delay: 1.69 });
    tone({ type: "sine", from: 140, to: 60, dur: 0.22, vol: 0.1, delay: 1.73 });

    // Return chime
    tone({ type: "triangle", from: 880, to: 1320, dur: 0.24, vol: 0.06, delay: 1.9 });
    tone({ type: "sine", from: 1320, to: 1760, dur: 0.28, vol: 0.04, delay: 2.0 });
  };

  /* ═══════════ Measure letters → bin mouth ═══════════ */
  const measureEatTargets = () => {
    const bin = binRef.current;
    const labelEl = labelRef.current;
    if (!bin || !labelEl) return;

    const binRect = bin.getBoundingClientRect();
    const mouthX = binRect.left + binRect.width * 0.55;
    const mouthY = binRect.top + binRect.height * 0.28;

    const ltrs = labelEl.querySelectorAll(".dtb-ltr");
    ltrs.forEach((ltr) => {
      const r = ltr.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      ltr.style.setProperty("--eat-x", mouthX - cx + "px");
      ltr.style.setProperty("--eat-y", mouthY - cy + "px");
    });
  };

  useEffect(() => {
    measureEatTargets();
    const onResize = () => {
      if (eating) return;
      measureEatTargets();
    };
    window.addEventListener("resize", onResize);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureEatTargets);
    }
    return () => window.removeEventListener("resize", onResize);
  }, [eating, label]);

  /* ═══════════ Click — no confirm, just delete ═══════════ */
  const handleClick = () => {
    if (busyRef.current) return;
    busyRef.current = true;

    // Start animation
    setEating(false);
    requestAnimationFrame(() => {
      measureEatTargets();
      setEating(true);
    });

    // Play sounds
    playSounds(label.length);

    // After animation (2.6s), call onClick to actually delete
    timeoutRef.current = setTimeout(() => {
      setEating(false);
      busyRef.current = false;
      if (onClick) onClick();
    }, 2600);
  };

  const letters = label.split("");

  return (
    <button
      type="button"
      className={`dtb-root ${eating ? "eating" : ""}`}
      onClick={handleClick}
      aria-label={label}
    >
      {/* Bin + sparks */}
      <span className="dtb-bin" aria-hidden="true" ref={binRef}>
        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <path
            className="dtb-bin__body"
            d="M9 12 L23 12 L21.5 27.5 Q21.4 29 20 29 L12 29 Q10.6 29 10.5 27.5 Z"
          />
          <line className="dtb-bin__body" x1="13" y1="16" x2="13.4" y2="25" />
          <line className="dtb-bin__body" x1="16" y1="16" x2="16" y2="25" />
          <line className="dtb-bin__body" x1="19" y1="16" x2="18.6" y2="25" />
          <g className="dtb-bin__lid">
            <path d="M6 9 L26 9 Q27.2 9 27.2 10.2 L27.2 11.6 L4.8 11.6 L4.8 10.2 Q4.8 9 6 9 Z" />
            <path d="M13.5 5.6 L18.5 5.6 Q19.6 5.6 19.6 6.7 L19.6 9 L12.4 9 L12.4 6.7 Q12.4 5.6 13.5 5.6 Z" />
          </g>
        </svg>

        <span className="dtb-sparks">
          <span className="dtb-spark" style={{ "--dx": "-14px", "--dy": "-12px", "--sd": "0.00s" }} />
          <span className="dtb-spark" style={{ "--dx": "-10px", "--dy": "-16px", "--sd": "0.02s" }} />
          <span className="dtb-spark" style={{ "--dx": "-4px",  "--dy": "-18px", "--sd": "0.04s" }} />
          <span className="dtb-spark" style={{ "--dx": "5px",   "--dy": "-18px", "--sd": "0.01s" }} />
          <span className="dtb-spark" style={{ "--dx": "12px",  "--dy": "-14px", "--sd": "0.03s" }} />
          <span className="dtb-spark" style={{ "--dx": "16px",  "--dy": "-6px",  "--sd": "0.05s" }} />
          <span className="dtb-spark" style={{ "--dx": "-16px", "--dy": "-4px",  "--sd": "0.02s" }} />
          <span className="dtb-spark" style={{ "--dx": "0px",   "--dy": "-20px", "--sd": "0.00s" }} />
        </span>
      </span>

      {/* Label */}
      <span className="dtb-label" aria-hidden="true" ref={labelRef}>
        {letters.map((ch, i) => (
          <span key={i} className="dtb-ltr" style={{ "--i": String(i) }}>
            {ch === " " ? "\u00A0" : ch}
          </span>
        ))}
      </span>
    </button>
  );
};

export default DeleteButton;
```

### frontend/src/components/ExportPDFButton.css

```
/* frontend/src/components/ExportPDFButton.css */

/* ═════════════════════════════════════════════════════
   BASE BUTTON
   ═════════════════════════════════════════════════════ */
.pdf-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 22px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #a3e635 0%, #bef264 100%);
  color: #12200a;
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.01em;
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  box-shadow:
    0 10px 24px -8px rgba(163, 230, 53, 0.7),
    0 2px 0 rgba(255, 255, 255, 0.4) inset;
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1),
              background 0.3s ease;
  isolation: isolate;
}

.pdf-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow:
    0 16px 36px -10px rgba(163, 230, 53, 0.9),
    0 0 0 4px rgba(163, 230, 53, 0.2);
}

.pdf-btn:disabled {
  cursor: wait;
}

.pdf-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(163, 230, 53, 0.5);
}

/* ═════════════════════════════════════════════════════
   SKY BACKGROUND (appears during animation)
   ═════════════════════════════════════════════════════ */
.pdf-btn__sky {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, #cde9ff 0%, #eaf6ff 60%, #f5faff 100%);
  opacity: 0;
  z-index: 0;
  transition: opacity 0.35s ease;
  pointer-events: none;
}

.pdf-btn.running .pdf-btn__sky {
  opacity: 1;
}

/* ═════════════════════════════════════════════════════
   PARACHUTE PAYLOAD
   ═════════════════════════════════════════════════════ */
.pdf-btn__payload {
  position: absolute;
  top: 0;
  left: 50%;
  width: 34px;
  height: 40px;
  margin-left: -17px;
  z-index: 3;
  opacity: 0;
  transform: translateY(-70px) scale(0.6);
  pointer-events: none;
  will-change: transform, opacity;
}

.pdf-btn.running .pdf-btn__payload {
  animation: pdfParachuteDrop 2.2s cubic-bezier(0.34, 0.94, 0.6, 1) forwards;
}

@keyframes pdfParachuteDrop {
  0% {
    opacity: 0;
    transform: translateY(-70px) scale(0.5) rotate(-6deg);
  }
  15% {
    opacity: 1;
    transform: translateY(-45px) scale(0.9) rotate(4deg);
  }
  40% {
    transform: translateY(-20px) scale(1) rotate(-3deg);
  }
  65% {
    transform: translateY(-2px) scale(1.05) rotate(2deg);
  }
  85% {
    transform: translateY(6px) scale(0.95) rotate(-1deg);
  }
  100% {
    opacity: 0;
    transform: translateY(18px) scale(0.7) rotate(0deg);
  }
}

/* Canopy sway */
.pdf-btn.running .pdf-btn__para-svg .canopy-g {
  transform-origin: 20px 16px;
  animation: pdfCanopySway 1.2s ease-in-out infinite alternate;
}

@keyframes pdfCanopySway {
  from { transform: rotate(-4deg) scaleX(0.98); }
  to   { transform: rotate(4deg) scaleX(1.02); }
}

/* Crate swing */
.pdf-btn.running .pdf-btn__para-svg .crate-g {
  transform-origin: 20px 26px;
  animation: pdfCrateSwing 0.9s ease-in-out infinite alternate;
}

@keyframes pdfCrateSwing {
  from { transform: rotate(-8deg); }
  to   { transform: rotate(8deg); }
}

/* Trail behind the payload */
.pdf-btn__trail {
  position: absolute;
  left: 50%;
  top: -30px;
  width: 3px;
  height: 30px;
  margin-left: -1.5px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(163, 230, 53, 0.5) 40%,
    rgba(163, 230, 53, 0.9) 100%
  );
  border-radius: 2px;
  filter: blur(0.5px);
  opacity: 0;
}

.pdf-btn.running .pdf-btn__trail {
  animation: pdfTrailPulse 1.4s ease-out forwards;
}

@keyframes pdfTrailPulse {
  0% { opacity: 0; transform: scaleY(0.4); }
  20% { opacity: 1; transform: scaleY(1); }
  70% { opacity: 0.7; transform: scaleY(1.15); }
  100% { opacity: 0; transform: scaleY(1); }
}

/* ═════════════════════════════════════════════════════
   SHOCKWAVE (when payload lands)
   ═════════════════════════════════════════════════════ */
.pdf-btn__shockwave {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  margin: -20px 0 0 -20px;
  border-radius: 50%;
  border: 2px solid rgba(163, 230, 53, 0.7);
  opacity: 0;
  z-index: 2;
  pointer-events: none;
}

.pdf-btn.running .pdf-btn__shockwave {
  animation: pdfShockwave 0.9s 1.5s ease-out forwards;
}

@keyframes pdfShockwave {
  0% {
    opacity: 0.9;
    transform: scale(0.4);
    border-color: rgba(163, 230, 53, 0.9);
  }
  100% {
    opacity: 0;
    transform: scale(3);
    border-color: rgba(163, 230, 53, 0);
  }
}

/* ═════════════════════════════════════════════════════
   CHECKMARK BADGE (appears after drop)
   ═════════════════════════════════════════════════════ */
.pdf-btn__badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  z-index: 5;
  opacity: 0;
  transform: scale(0.4);
  pointer-events: none;
}

.pdf-btn.win .pdf-btn__badge {
  animation: pdfBadgePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes pdfBadgePop {
  0%   { opacity: 0; transform: scale(0.4) rotate(-30deg); }
  60%  { opacity: 1; transform: scale(1.25) rotate(8deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}

/* ═════════════════════════════════════════════════════
   LABELS
   ═════════════════════════════════════════════════════ */
.pdf-btn__label-stack {
  position: relative;
  display: inline-block;
  z-index: 4;
  height: 1.2em;
  overflow: hidden;
  padding: 0 4px;
  min-width: 160px;
  text-align: left;
}

.pdf-btn__lbl {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.28s ease;
  white-space: nowrap;
}

.pdf-btn__lbl-default {
  opacity: 1;
  transform: translateY(0);
}

.pdf-btn__lbl-drop,
.pdf-btn__lbl-done {
  opacity: 0;
  transform: translateY(1.2em);
}

/* Running state — swap to "Dropping your PDF…" */
.pdf-btn.running .pdf-btn__lbl-default {
  opacity: 0;
  transform: translateY(-1.2em);
}
.pdf-btn.running .pdf-btn__lbl-drop {
  opacity: 1;
  transform: translateY(0);
  color: #1e40af;
}

/* Done state — swap to "PDF Downloaded!" */
.pdf-btn.win .pdf-btn__lbl-default { opacity: 0; transform: translateY(-1.2em); }
.pdf-btn.win .pdf-btn__lbl-drop    { opacity: 0; transform: translateY(-1.2em); }
.pdf-btn.win .pdf-btn__lbl-done    { opacity: 1; transform: translateY(0); }

/* ═════════════════════════════════════════════════════
   SR-ONLY
   ═════════════════════════════════════════════════════ */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ═════════════════════════════════════════════════════
   REDUCED MOTION
   ═════════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .pdf-btn__payload,
  .pdf-btn__trail,
  .pdf-btn__shockwave,
  .pdf-btn__badge,
  .pdf-btn__lbl {
    animation: none !important;
    transition: opacity 0.2s ease !important;
  }
  .pdf-btn.running .pdf-btn__payload {
    opacity: 1;
    transform: none;
    position: relative;
    margin-right: 8px;
  }
}
```

### frontend/src/components/ExportPDFButton.jsx

```
// frontend/src/components/ExportPDFButton.jsx
import { useRef, useState, useEffect } from "react";
import "./ExportPDFButton.css";

const loadHtml2Pdf = () => {
  if (window.html2pdf) return Promise.resolve(window.html2pdf);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.onload = () => resolve(window.html2pdf);
    s.onerror = reject;
    document.head.appendChild(s);
  });
};

const ExportPDFButton = ({ targetId, filename, holderId }) => {
  const [state, setState] = useState("idle"); // idle | running | done
  const busyRef = useRef(false);
  const audioRef = useRef({ ac: null, noiseBuf: null });

  /* ─────────────────────────────────────────────
     Audio setup — Web Audio API (no files needed)
     ───────────────────────────────────────────── */
  const getAudio = () => {
    const a = audioRef.current;
    if (!a.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      a.ac = new AC();
      const len = a.ac.sampleRate * 1.5;
      a.noiseBuf = a.ac.createBuffer(1, len, a.ac.sampleRate);
      const d = a.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (a.ac.state === "suspended") a.ac.resume();
    return a.ac;
  };

  /* Unlock audio on first user gesture (browser autoplay policy) */
  useEffect(() => {
    const unlock = () => {
      getAudio();
      window.removeEventListener("pointerdown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  /* ─── Sound 1: Button press — square blip ─── */
  const sPress = (t) => {
    const ctx = getAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(820, t);
    o.frequency.exponentialRampToValueAtTime(230, t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.085, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.09);
  };

  /* ─── Sound 2: Parachute descent — filtered noise sweeping down ─── */
  const sDescent = (t, dur) => {
    const ctx = getAudio();
    if (!ctx) return;
    const a = audioRef.current;
    const n = ctx.createBufferSource();
    n.buffer = a.noiseBuf;
    n.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.7;
    bp.frequency.setValueAtTime(3200, t);
    bp.frequency.exponentialRampToValueAtTime(640, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.1);
    g.gain.linearRampToValueAtTime(0.085, t + dur * 0.68);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    n.connect(bp).connect(g).connect(ctx.destination);
    n.start(t);
    n.stop(t + dur + 0.06);
  };

  /* ─── Sound 3: Landing thud — sine sweep down ─── */
  const sThud = (t) => {
    const ctx = getAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.38, t + 0.009);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.33);
  };

  /* ─── Sound 4: Success ping — triangle ding ─── */
  const sPing = (t) => {
    const ctx = getAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(1200, t);
    o.frequency.exponentialRampToValueAtTime(1188, t + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.135, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.52);
  };

  /* ─── Sound 5: Victory chord — C-E-G-C ─── */
  const sVictory = (t) => {
    const ctx = getAudio();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const st = t + i * 0.075;
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.095, st + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.72);
      o.connect(g).connect(ctx.destination);
      o.start(st);
      o.stop(st + 0.78);
    });
  };

  /* ─── Play the full sequence ─── */
  const playFull = () => {
    const ctx = getAudio();
    if (!ctx) {
      console.warn("[PDF Button] AudioContext unavailable");
      return;
    }
    const t = ctx.currentTime + 0.02;

    sPress(t);              // 0.00s — button click
    sDescent(t + 0.1, 1.6); // 0.10s — parachute descends (1.6s whoosh)
    sThud(t + 1.85);        // 1.85s — landing thud
    sPing(t + 2.0);         // 2.00s — ping when badge pops
    sVictory(t + 2.25);     // 2.25s — victory chord
  };

  /* ─────────────────────────────────────────────
     PDF export
     ───────────────────────────────────────────── */
  const runExport = async () => {
    const target = document.getElementById(targetId);
    const holder = holderId ? document.getElementById(holderId) : null;

    if (!target) {
      console.warn("[Export] Target not found:", targetId);
      return;
    }

    if (holder) holder.classList.add("is-exporting");

    await new Promise((r) => setTimeout(r, 250));

    try {
      const html2pdf = await loadHtml2Pdf();

      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: filename || "itinerary.pdf",
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: {
            mode: ["css", "legacy"],
            avoid: [".itn-day", ".itn-hotel", ".itn-table tr", ".itn-foot"],
          },
        })
        .from(target)
        .save();
    } catch (err) {
      console.warn("[Export] html2pdf failed, falling back to print:", err);
      window.print();
    } finally {
      if (holder) holder.classList.remove("is-exporting");
    }
  };

  /* ─────────────────────────────────────────────
     Click handler
     ───────────────────────────────────────────── */
  const handleClick = () => {
    if (busyRef.current) return;
    busyRef.current = true;

    // 1) Start the parachute animation
    setState("running");

    // 2) Play the synced sound sequence
    playFull();

    // 3) At 2.0s, swap label to "PDF Downloaded!"
    setTimeout(() => setState("done"), 2000);

    // 4) At 2.3s, actually export the PDF
    setTimeout(() => runExport(), 2300);

    // 5) Reset at 4.8s
    setTimeout(() => {
      setState("idle");
      busyRef.current = false;
    }, 4800);
  };

  const cls = [
    "pdf-btn",
    state === "running" ? "running" : "",
    state === "done" ? "win" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={cls}
      onClick={handleClick}
      aria-label="Export PDF Itinerary"
      disabled={state === "running"}
    >
      <span className="sr-only" role="status" aria-live="polite">
        {state === "running" ? "Preparing PDF" : state === "done" ? "PDF ready" : ""}
      </span>

      <span className="pdf-btn__sky" aria-hidden="true" />
      <span className="pdf-btn__shockwave" aria-hidden="true" />

      <span className="pdf-btn__payload" aria-hidden="true">
        <span className="pdf-btn__trail" />
        <svg
          className="pdf-btn__para-svg"
          viewBox="0 0 40 46"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="cpGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#C4E570" />
              <stop offset="1" stopColor="#8FBF2E" />
            </linearGradient>
            <linearGradient id="crateGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe2a0" />
              <stop offset="1" stopColor="#d99b2b" />
            </linearGradient>
            <linearGradient id="packGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#A8D84A" />
              <stop offset="1" stopColor="#1A2E1A" />
            </linearGradient>
          </defs>

          <g className="canopy-g">
            <path
              d="M20 1 C8 1 1 8 1 16 L39 16 C39 8 32 1 20 1 Z"
              fill="url(#cpGrad)"
            />
            <circle cx="7" cy="16" r="6" fill="url(#cpGrad)" />
            <circle cx="20" cy="16" r="6" fill="url(#cpGrad)" />
            <circle cx="33" cy="16" r="6" fill="url(#cpGrad)" />
            <path
              d="M20 1 C8 1 1 8 1 16"
              fill="none"
              stroke="#DCF0A0"
              strokeWidth=".9"
              opacity=".55"
            />
            <path
              d="M20 1 C32 1 39 8 39 16"
              fill="none"
              stroke="#DCF0A0"
              strokeWidth=".9"
              opacity=".55"
            />
            <path d="M20 1 L20 16" stroke="#DCF0A0" strokeWidth=".7" opacity=".4" />
          </g>

          <g stroke="#DCF0A0" strokeWidth=".9" opacity=".85" fill="none">
            <line x1="7" y1="20" x2="17" y2="29" />
            <line x1="20" y1="21" x2="20" y2="29" />
            <line x1="33" y1="20" x2="23" y2="29" />
          </g>

          <g className="crate-g">
            <rect x="15" y="24" width="10" height="6" rx="1.6" fill="url(#packGrad)" />
            <rect
              x="11"
              y="28"
              width="18"
              height="15"
              rx="2.2"
              fill="url(#crateGrad)"
              stroke="#8a5a10"
              strokeWidth=".9"
            />
            <line x1="20" y1="28" x2="20" y2="43" stroke="#8a5a10" strokeWidth="1" />
            <line
              x1="11"
              y1="35.5"
              x2="29"
              y2="35.5"
              stroke="#8a5a10"
              strokeWidth="1"
            />
            <rect
              x="17.5"
              y="31.5"
              width="5"
              height="4"
              rx=".8"
              fill="#1A2E1A"
              opacity=".85"
            />
          </g>
        </svg>
      </span>

      <span className="pdf-btn__badge" aria-hidden="true">
        <svg viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
          <circle
            cx="11"
            cy="11"
            r="9.6"
            fill="#1A2E1A"
            stroke="#A8D84A"
            strokeWidth="1.6"
          />
          <path
            d="M6.6 11.4 L9.6 14.3 L15.4 8.2"
            fill="none"
            stroke="#A8D84A"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <span className="pdf-btn__label-stack">
        <span className="pdf-btn__lbl pdf-btn__lbl-default">
          📄 Export PDF Itinerary
        </span>
        <span className="pdf-btn__lbl pdf-btn__lbl-drop">
          🪂 Dropping your PDF…
        </span>
        <span className="pdf-btn__lbl pdf-btn__lbl-done">
          ✅ PDF Downloaded!
        </span>
      </span>
    </button>
  );
};

export default ExportPDFButton;
```

### frontend/src/components/ImageSlideshow.css

```
/* frontend/src/components/ImageSlideshow.css */

.slideshow {
  position: relative;
  aspect-ratio: 21 / 9;
  border-radius: 14px;
  overflow: hidden;
  background: #0b0b0b;
  outline: none;
}

.slideshow:focus-visible {
  box-shadow: 0 0 0 3px rgba(163, 230, 53, 0.5);
}

.slides-track {
  display: flex;
  height: 100%;
  width: 100%;
  transition: transform 0.9s cubic-bezier(0.65, 0, 0.35, 1);
  will-change: transform;
}

/* Silent snap — no animation when jumping from the duplicate back to slide 0 */
.slides-track.no-transition {
  transition: none !important;
}

.slide {
  position: relative;
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0b0b0b;
}

.slide img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 1;
  transform: scale(1.05);
  transition: transform 5.5s ease-out;
  background: #0b0b0b;
}

@keyframes kenBurns {
  0%   { transform: scale(1.06) translate(0, 0); }
  100% { transform: scale(1.16) translate(-1.5%, -1%); }
}

.slide.active img {
  animation: kenBurns 7s ease-out forwards;
}

.slide-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.15) 0%,
    rgba(0, 0, 0, 0) 30%,
    rgba(0, 0, 0, 0.15) 60%,
    rgba(0, 0, 0, 0.7) 100%
  );
  pointer-events: none;
}

.slide-content {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 18px;
  z-index: 2;
  transform: translateY(16px);
  opacity: 0;
  transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s,
              opacity 0.6s ease 0.15s;
}

.slide.active .slide-content {
  transform: translateY(0);
  opacity: 1;
}

.slide-pill {
  display: inline-block;
  padding: 4px 10px;
  background: #a3e635;
  color: #000;
  font-size: 0.65rem;
  font-weight: 800;
  border-radius: 6px;
  margin-bottom: 8px;
  letter-spacing: 0.01em;
}

.slide-title {
  color: #fff;
  font-size: 1.25rem;
  font-weight: 900;
  margin: 0;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
}

.slides-dots {
  position: absolute;
  bottom: 12px;
  right: 14px;
  z-index: 3;
  display: flex;
  gap: 5px;
  padding: 5px 8px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 9999px;
}

.slides-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  padding: 0;
}

.slides-dot:hover {
  background: rgba(255, 255, 255, 0.7);
}

.slides-dot.active {
  background: #a3e635;
  width: 18px;
  border-radius: 3px;
  box-shadow: 0 0 8px rgba(163, 230, 53, 0.7);
}

@media (max-width: 768px) {
  .slide-title { font-size: 1rem; }
}

@media (prefers-reduced-motion: reduce) {
  .slides-track,
  .slide img,
  .slide-content,
  .slides-dot {
    transition: none !important;
    animation: none !important;
  }
}
```

### frontend/src/components/ImageSlideshow.jsx

```
import { useEffect, useRef, useState } from "react";
import "./ImageSlideshow.css";

const fallbackUrl = (title) =>
  `https://picsum.photos/seed/${encodeURIComponent(title || "travel")}/1600/686`;

const ImageSlideshow = ({
  slides = [],
  interval = 3000,
  className = "",
  onChange,
}) => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState({});
  const [noTransition, setNoTransition] = useState(false);
  const timerRef = useRef(null);
  const touchStartX = useRef(0);

  const total = slides.length;
  const extended = total > 0 ? [...slides, slides[0]] : [];

  useEffect(() => {
    if (total <= 1 || paused) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => {
        if (c >= total) return 0;
        const next = c + 1;
        const realIndex = next % total;
        if (onChange) {
          setTimeout(() => onChange(slides[realIndex], realIndex), 0);
        }
        return next;
      });
    }, interval);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, paused, interval, slides]);

  const handleTransitionEnd = () => {
    if (current === total) {
      setNoTransition(true);
      setCurrent(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setNoTransition(false));
      });
    }
  };

  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };
  const handleTouchEnd = (e) => {
    const delta = e.changedTouches[0].screenX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      setPaused(false);
      setCurrent((c) => {
        let next = c + (delta < 0 ? 1 : -1);
        if (next < 0) next = 0;
        if (next > total) next = total;
        return next;
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowRight") {
      setCurrent((c) => Math.min(c + 1, total));
    }
    if (e.key === "ArrowLeft") {
      setCurrent((c) => Math.max(c - 1, 0));
    }
  };

  if (!total) return null;

  return (
    <div
      className={`slideshow ${className}`}
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
    >
      <div
        className={`slides-track ${noTransition ? "no-transition" : ""}`}
        style={{ transform: `translateX(-${current * 100}%)` }}
        onTransitionEnd={handleTransitionEnd}
      >
        {extended.map((s, i) => (
          <div
            key={i}
            className={`slide ${i === current ? "active" : ""} ${
              loaded[i % total] ? "loaded" : ""
            }`}
          >
            <img
              src={s.image}
              alt={s.title}
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={() =>
                setLoaded((prev) => ({ ...prev, [i % total]: true }))
              }
              onError={(e) => {
                if (e.target.dataset.fallback === "1") return;
                e.target.dataset.fallback = "1";
                e.target.src = fallbackUrl(s.title);
              }}
            />
            <div className="slide-overlay" />
            <div className="slide-content">
              {s.pill && <div className="slide-pill">{s.pill}</div>}
              {s.title && <h3 className="slide-title">{s.title}</h3>}
            </div>
          </div>
        ))}
      </div>

      <div className="slides-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`slides-dot ${current % total === i ? "active" : ""}`}
            onClick={() => {
              setPaused(false);
              setCurrent(i);
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageSlideshow;
```

### frontend/src/components/ItineraryPaper.jsx

```
const formatDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const ItineraryPaper = ({ trip, places = [] }) => {
  if (!trip) return null;

  const days = Math.max(
    1,
    Math.round(
      (new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24)
    )
  );
  const budgetLabel =
    trip.budget < 20000 ? "Cheap" : trip.budget < 50000 ? "Moderate" : "Luxury";

  const startDate = formatDate(trip.startDate);
  const endDate = formatDate(trip.endDate);

  const totalSpent = (trip.itinerary || []).reduce((sum, day) => {
    return (
      sum +
      (day.activities || []).reduce((s, act) => s + (Number(act.cost) || 0), 0)
    );
  }, 0);

  return (
    <main className="itn-paper" id="itineraryPaper">
      {/* HEADER */}
      <header className="itn-header">
        <div className="itn-eyebrow">Official Travel Itinerary</div>
        <h1 className="itn-title">{trip.destination}</h1>
        <div className="itn-dest">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>{trip.destination}</span>
        </div>
        <div className="itn-dates">
          <span>
            {days} Day{days > 1 ? "s" : ""}
          </span>
          <span className="dot"></span>
          <span>
            {startDate} — {endDate}
          </span>
        </div>
      </header>

      {/* SUMMARY */}
      <section className="itn-summary">
        <div className="itn-metric">
          <div className="m-label">Travellers</div>
          <div className="m-value">
            {trip.travellers}
            <small>{trip.travellers > 1 ? " guests" : " guest"}</small>
          </div>
        </div>
        <div className="itn-metric m-budget">
          <div className="m-label">Total Budget</div>
          <div className="m-value">
            ₹{trip.budget?.toLocaleString?.() || trip.budget}
          </div>
        </div>
        <div className="itn-metric m-travellers">
          <div className="m-label">Trip Style</div>
          <div className="m-value">
            {budgetLabel}
            <small> tier</small>
          </div>
        </div>
      </section>

      {/* ITINERARY */}
      {trip.itinerary?.length > 0 && (
        <>
          <div className="itn-section-head">
            <h2>Day-by-Day Itinerary</h2>
          </div>

          {trip.itinerary.map((day) => (
            <article className="itn-day" key={day.day}>
              <header className="itn-day-head">
                <div className="itn-day-num">
                  {String(day.day).padStart(2, "0")}
                </div>
                <div className="itn-day-name">Day {day.day}</div>
                <div className="itn-day-date">{day.date}</div>
              </header>
              <table className="itn-table">
                <thead>
                  <tr>
                    <th className="itn-col-time">Time</th>
                    <th>Activity</th>
                    <th className="itn-col-cost">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {(day.activities || []).map((act, i) => (
                    <tr key={i}>
                      <td className="itn-col-time">
                        <span className="itn-time-chip">{act.time}</span>
                      </td>
                      <td>
                        <div className="itn-act-title">{act.title}</div>
                        {act.description && (
                          <div className="itn-act-desc">{act.description}</div>
                        )}
                        {act.location && (
                          <div className="itn-venue">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <span>{act.location}</span>
                          </div>
                        )}
                      </td>
                      <td className="itn-col-cost">
                        <div
                          className={`itn-cost-val ${
                            !act.cost || act.cost === 0 ? "free" : ""
                          }`}
                        >
                          {!act.cost || act.cost === 0 ? "Free" : `₹${act.cost}`}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
        </>
      )}

      {/* HOTELS */}
      {trip.hotels?.length > 0 && (
        <>
          <div className="itn-section-head">
            <h2>Recommended Hotels</h2>
          </div>
          <div className="itn-hotel-grid">
            {trip.hotels.map((h, i) => (
              <div className="itn-hotel" key={i}>
                <div className="itn-hotel-name">{h.name}</div>
                <div className="itn-hotel-row">📍 {h.address}</div>
                <div className="itn-hotel-row">
                  ⭐ {h.rating} · 💰 {h.price}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* PLACES */}
      {places.length > 0 && (
        <>
          <div className="itn-section-head">
            <h2>Nearby Attractions</h2>
          </div>
          <div className="itn-hotel-grid">
            {places.slice(0, 6).map((p, i) => (
              <div className="itn-hotel" key={i}>
                <div className="itn-hotel-name">{p.name}</div>
                <div className="itn-hotel-row">🏷 {p.type}</div>
                {p.description && (
                  <div className="itn-hotel-row">
                    {String(p.description).slice(0, 120)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* BUDGET BREAKDOWN */}
      {trip.budgetBreakdown && trip.budgetBreakdown.total > 0 && (
        <>
          <div className="itn-section-head">
            <h2>Budget Breakdown</h2>
          </div>
          <table className="itn-table">
            <tbody>
              <tr>
                <td>✈️ Flights</td>
                <td className="itn-col-cost">
                  <div className="itn-cost-val">
                    ₹{trip.budgetBreakdown.flights}
                  </div>
                </td>
              </tr>
              <tr>
                <td>🏨 Hotels</td>
                <td className="itn-col-cost">
                  <div className="itn-cost-val">
                    ₹{trip.budgetBreakdown.hotels}
                  </div>
                </td>
              </tr>
              <tr>
                <td>🍽 Food</td>
                <td className="itn-col-cost">
                  <div className="itn-cost-val">
                    ₹{trip.budgetBreakdown.food}
                  </div>
                </td>
              </tr>
              <tr>
                <td>🎟 Activities</td>
                <td className="itn-col-cost">
                  <div className="itn-cost-val">
                    ₹{trip.budgetBreakdown.activities}
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td className="itn-col-cost">
                  <div className="itn-cost-val">
                    <strong>₹{trip.budgetBreakdown.total}</strong>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      <footer className="itn-foot">
        <div className="f-left">
          Generated via <span>AI Travel Planner</span>
        </div>
        <div className="f-mid">
          Planned activity cost: ₹{totalSpent.toLocaleString?.() || totalSpent}
        </div>
        <div className="f-right">Safe Travels!</div>
      </footer>
    </main>
  );
};

export default ItineraryPaper;
```

### frontend/src/components/LiquidMetalButton.css

```
/* frontend/src/components/LiquidMetalButton.css */

@property --flow {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

/* ═════════════════════════════════════════════════════
   LIQUID LIME BUTTON — matches site lime theme
   ═════════════════════════════════════════════════════ */

.liquid-metal-btn {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  gap: 16px;
  padding: 6px 28px 6px 6px;
  background: rgba(10, 10, 12, 0.95);
  border-radius: 999px;
  cursor: pointer;
  outline: none;
  border: none;
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(163, 230, 53, 0.1);
  transition:
    transform 0.3s cubic-bezier(0.22, 0.9, 0.3, 1),
    box-shadow 0.3s ease,
    background 0.3s ease,
    opacity 0.3s ease;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-family: 'Poppins', system-ui, sans-serif;
}

.liquid-metal-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

/* ─── Liquid lime border — main layer ─── */
.liquid-metal-btn::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 2.5px;
  background: conic-gradient(
    from var(--flow) at 50% 50%,
    #bef264 0deg,
    #a3e635 22deg,
    #4d7c0f 52deg,
    #ffffff 78deg,
    #a3e635 104deg,
    #365314 138deg,
    #bef264 168deg,
    #84cc16 196deg,
    #1a2e1a 226deg,
    #bef264 254deg,
    #e5f0c8 286deg,
    #65a30d 320deg,
    #a3e635 360deg
  );
  filter: url(#liquidBorder);
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask-composite: xor;
  pointer-events: none;
  animation: lm-rotate 6s linear infinite;
  z-index: 1;
}

/* ─── Shimmer pass — brighter "wet" lime highlight ─── */
.liquid-metal-btn::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 2.5px;
  background: conic-gradient(
    from var(--flow) at 50% 50%,
    rgba(190, 242, 100, 0) 0deg,
    rgba(190, 242, 100, 1) 20deg,
    rgba(190, 242, 100, 0) 46deg,
    rgba(190, 242, 100, 0) 180deg,
    rgba(163, 230, 53, 0.9) 220deg,
    rgba(163, 230, 53, 0) 260deg,
    rgba(190, 242, 100, 0) 360deg
  );
  filter: url(#liquidBorder) blur(0.4px);
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask-composite: xor;
  mix-blend-mode: screen;
  pointer-events: none;
  animation: lm-rotate 6s linear infinite reverse;
  z-index: 2;
}

@keyframes lm-rotate {
  to {
    --flow: 360deg;
  }
}

/* ─── Hover — lifts + lime glow ─── */
.liquid-metal-btn:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.02);
  background: rgba(18, 20, 14, 0.98);
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.75),
    0 0 0 1px rgba(163, 230, 53, 0.2),
    0 0 34px rgba(163, 230, 53, 0.35);
}

.liquid-metal-btn:hover:not(:disabled)::before,
.liquid-metal-btn:hover:not(:disabled)::after {
  animation-duration: 3.2s;
}

/* ─── Active ─── */
.liquid-metal-btn:active:not(:disabled) {
  transform: translateY(1px) scale(0.98);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(163, 230, 53, 0.15);
}

/* ─── Focus ─── */
.liquid-metal-btn:focus-visible {
  outline: 2px solid rgba(163, 230, 53, 0.85);
  outline-offset: 6px;
}

/* ═════════════════════════════════════════════════════
   ICON CONTAINER
   ═════════════════════════════════════════════════════ */

.lmb-icon-container {
  position: relative;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  background: rgba(163, 230, 53, 0.12);
  border-radius: 50%;
  transition: background 0.3s ease;
  box-shadow: inset 0 1px 1px rgba(190, 242, 100, 0.2);
  flex-shrink: 0;
}

.liquid-metal-btn:hover:not(:disabled) .lmb-icon-container {
  background: rgba(163, 230, 53, 0.22);
}

.lmb-plane {
  width: 18px;
  height: 18px;
  color: #a3e635;
  transition: transform 0.3s ease;
}

.liquid-metal-btn:hover:not(:disabled) .lmb-plane {
  transform: scale(1.12) rotate(-8deg);
}

.lmb-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(163, 230, 53, 0.25);
  border-top-color: #a3e635;
  border-radius: 50%;
  animation: lmb-spin 0.7s linear infinite;
}

@keyframes lmb-spin {
  to { transform: rotate(360deg); }
}

/* ═════════════════════════════════════════════════════
   LABEL
   ═════════════════════════════════════════════════════ */

.lmb-text {
  position: relative;
  z-index: 3;
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.01em;
  padding-right: 4px;
  user-select: none;
  white-space: nowrap;
  transition: color 0.3s ease;
}

.liquid-metal-btn:hover:not(:disabled) .lmb-text {
  color: #bef264;
}

/* ═════════════════════════════════════════════════════
   REDUCED MOTION
   ═════════════════════════════════════════════════════ */

@media (prefers-reduced-motion: reduce) {
  .liquid-metal-btn::before,
  .liquid-metal-btn::after {
    animation: none;
  }
  .lmb-spinner {
    animation-duration: 2s;
  }
}

/* ═════════════════════════════════════════════════════
   RESPONSIVE
   ═════════════════════════════════════════════════════ */

@media (max-width: 480px) {
  .liquid-metal-btn {
    width: 100%;
    justify-content: center;
    padding: 6px 20px 6px 6px;
  }
}
```

### frontend/src/components/LiquidMetalButton.jsx

```
import { useEffect, useRef, forwardRef } from "react";
import "./LiquidMetalButton.css";

const LiquidMetalButton = forwardRef(
  (
    {
      children = "Generate Trip",
      onClick,
      disabled = false,
      loading = false,
      type = "button",
    },
    ref
  ) => {
    const turbRef = useRef(null);

    // Animate the SVG turbulence filter for organic liquid flow
    useEffect(() => {
      const turb = turbRef.current;
      if (!turb) return;

      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduce) return;

      let t = 0;
      let prev = 0;
      let rafId = null;

      const loop = (now) => {
        if (now - prev > 40) {
          prev = now;
          t += 0.04;

          const fx =
            0.012 + Math.sin(t * 0.7) * 0.004 + Math.sin(t * 1.9) * 0.0015;
          const fy =
            0.018 + Math.cos(t * 0.55) * 0.005 + Math.cos(t * 1.4) * 0.0018;

          turb.setAttribute(
            "baseFrequency",
            fx.toFixed(5) + " " + fy.toFixed(5)
          );
        }
        rafId = requestAnimationFrame(loop);
      };

      rafId = requestAnimationFrame(loop);
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
      };
    }, []);

    const isDisabled = disabled || loading;

    return (
      <>
        {/* SVG filter host — only rendered once per page load */}
        <svg
          className="lm-defs"
          aria-hidden="true"
          focusable="false"
          style={{
            position: "absolute",
            width: 0,
            height: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <filter
            id="liquidBorder"
            x="-20%"
            y="-40%"
            width="140%"
            height="180%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              ref={turbRef}
              type="fractalNoise"
              baseFrequency="0.012 0.018"
              numOctaves="2"
              seed="4"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="6"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>

        <button
          ref={ref}
          type={type}
          className="liquid-metal-btn"
          onClick={onClick}
          disabled={isDisabled}
          aria-busy={loading}
        >
          <span className="lmb-icon-container">
            {loading ? (
              <span className="lmb-spinner" />
            ) : (
              <svg
                className="lmb-plane"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            )}
          </span>
          <span className="lmb-text">
            {loading ? "Generating..." : children}
          </span>
        </button>
      </>
    );
  }
);

LiquidMetalButton.displayName = "LiquidMetalButton";

export default LiquidMetalButton;
```

### frontend/src/components/Navbar.css

```
/* frontend/src/components/Navbar.css */

/* ═════════════════════════════════════════════════════
   ROOT NAVBAR
   ═════════════════════════════════════════════════════ */

.nb-root {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: rgba(5, 5, 5, 0.82);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.nb-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

/* ═════════════════════════════════════════════════════
   BRAND
   ═════════════════════════════════════════════════════ */

.nb-brand {
  display: flex;
  align-items: center;
  text-decoration: none;
  flex-shrink: 0;
}
.nb-brand-text {
  color: #fff;
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 1.15rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.nb-brand-text .nb-brand-accent {
  color: #a3e635;
}

/* ═════════════════════════════════════════════════════
   DESKTOP NAV LINKS
   ═════════════════════════════════════════════════════ */

.nb-links {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  justify-content: center;
}
.nb-link {
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: #888;
  text-decoration: none;
  padding: 8px 14px;
  border-radius: 10px;
  transition: color 0.2s, background 0.2s;
  white-space: nowrap;
}
.nb-link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}
.nb-link.active {
  color: #a3e635;
  background: rgba(163, 230, 53, 0.12);
  font-weight: 700;
}

/* ═════════════════════════════════════════════════════
   AUTH ZONE (right side)
   ═════════════════════════════════════════════════════ */

.nb-auth {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.nb-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a3e635, #bef264);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-size: 0.78rem;
  font-weight: 900;
  text-decoration: none;
  letter-spacing: 0.02em;
  box-shadow: 0 0 14px rgba(163, 230, 53, 0.35);
  transition: box-shadow 0.2s, transform 0.2s;
  flex-shrink: 0;
}
.nb-avatar:hover {
  box-shadow: 0 0 22px rgba(163, 230, 53, 0.6);
  transform: translateY(-1px);
}
.nb-logout {
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  color: #888;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 7px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
  white-space: nowrap;
}
.nb-logout:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.05);
}

/* ═════════════════════════════════════════════════════
   NOT-LOGGED-IN CTAs
   ═════════════════════════════════════════════════════ */

.nb-cta-login {
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  color: #888;
  text-decoration: none;
  padding: 8px 14px;
  border-radius: 10px;
  transition: color 0.2s, background 0.2s;
  white-space: nowrap;
}
.nb-cta-login:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}
.nb-cta-get-started {
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 800;
  color: #000;
  text-decoration: none;
  padding: 9px 18px;
  border-radius: 12px;
  background: linear-gradient(135deg, #a3e635, #bef264);
  box-shadow: 0 6px 20px -6px rgba(163, 230, 53, 0.55);
  transition: transform 0.2s, box-shadow 0.2s;
  white-space: nowrap;
}
.nb-cta-get-started:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 26px -6px rgba(163, 230, 53, 0.75);
}

/* ═════════════════════════════════════════════════════
   MOBILE TOGGLE
   ═════════════════════════════════════════════════════ */

.nb-toggle {
  display: none;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  transition: border-color 0.2s, background 0.2s;
  flex-shrink: 0;
}
.nb-toggle:hover {
  border-color: rgba(163, 230, 53, 0.5);
  background: rgba(163, 230, 53, 0.06);
}

/* ═════════════════════════════════════════════════════
   MOBILE PANEL
   ═════════════════════════════════════════════════════ */

.nb-mobile {
  display: none;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(5, 5, 5, 0.95);
  padding: 16px 24px 20px;
  animation: nbSlideDown 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes nbSlideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.nb-mobile.open { display: block; }

.nb-mobile-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}
.nb-mobile-link {
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  color: #888;
  text-decoration: none;
  padding: 12px 14px;
  border-radius: 12px;
  transition: color 0.2s, background 0.2s;
}
.nb-mobile-link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}
.nb-mobile-link.active {
  color: #a3e635;
  background: rgba(163, 230, 53, 0.12);
  font-weight: 700;
}

.nb-mobile-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 10px;
  text-decoration: none;
}
.nb-mobile-user .nb-avatar {
  width: 42px;
  height: 42px;
  font-size: 0.85rem;
  border-radius: 50%;
}
.nb-mobile-user-info {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.nb-mobile-user-name {
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 0.85rem;
  font-weight: 800;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nb-mobile-user-email {
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 0.72rem;
  color: #888;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nb-mobile-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}
.nb-mobile-logout {
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  color: #888;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}
.nb-mobile-logout:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
}
.nb-mobile-cta {
  display: block;
  text-align: center;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 800;
  color: #000;
  text-decoration: none;
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #a3e635, #bef264);
  box-shadow: 0 8px 24px -8px rgba(163, 230, 53, 0.6);
  transition: transform 0.2s;
}
.nb-mobile-cta:hover { transform: translateY(-1px); }
.nb-mobile-cta-ghost {
  display: block;
  text-align: center;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  text-decoration: none;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  transition: border-color 0.2s;
}
.nb-mobile-cta-ghost:hover { border-color: rgba(255, 255, 255, 0.3); }

/* ═════════════════════════════════════════════════════
   THREE-DOT MENU
   ═════════════════════════════════════════════════════ */

.nb-menu-wrap {
  position: relative;
  display: inline-block;
}

.nb-menu-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #888;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
  font-family: inherit;
  flex-shrink: 0;
}
.nb-menu-btn:hover {
  color: #fff;
  border-color: rgba(163, 230, 53, 0.5);
  background: rgba(163, 230, 53, 0.06);
}
.nb-menu-btn.open {
  color: #a3e635;
  border-color: #a3e635;
  background: rgba(163, 230, 53, 0.12);
}

.nb-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 240px;
  background: rgba(15, 15, 15, 0.98);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 6px;
  box-shadow:
    0 20px 50px -12px rgba(0, 0, 0, 0.9),
    0 0 24px -8px rgba(163, 230, 53, 0.15);
  z-index: 200;
  animation: nbMenuIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes nbMenuIn {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.nb-menu-label {
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #52525b;
  padding: 8px 12px 6px;
}

.nb-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: transparent;
  border: none;
  color: #e5e5e5;
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}
.nb-menu-item:hover:not(:disabled) {
  background: rgba(163, 230, 53, 0.1);
  color: #a3e635;
}
.nb-menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.nb-menu-icon {
  font-size: 0.95rem;
  flex-shrink: 0;
  width: 18px;
  text-align: center;
}

.nb-menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 6px 4px;
}

/* ═════════════════════════════════════════════════════
   GENERIC TOAST (link copied, etc.)
   ═════════════════════════════════════════════════════ */

.nb-toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: #a3e635;
  color: #000;
  padding: 12px 22px;
  border-radius: 14px;
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 0.85rem;
  font-weight: 800;
  box-shadow: 0 12px 32px -8px rgba(163, 230, 53, 0.5);
  z-index: 400;
  animation: nbToastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}
@keyframes nbToastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* ═════════════════════════════════════════════════════
   RESPONSIVE
   ═════════════════════════════════════════════════════ */

@media (max-width: 820px) {
  .nb-links,
  .nb-auth,
  .nb-cta-login,
  .nb-cta-get-started {
    display: none;
  }
  .nb-toggle {
    display: flex;
  }
  .nb-menu-wrap {
    display: none;
  }
}

/* ═════════════════════════════════════════════════════
   SMALL PDF DOWNLOAD TOAST
   ═════════════════════════════════════════════════════ */

.pdf-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px 12px 14px;
  background: #0b0b0b;
  border: 1px solid rgba(163, 230, 53, 0.4);
  border-radius: 14px;
  box-shadow:
    0 16px 40px -12px rgba(0, 0, 0, 0.9),
    0 0 24px -6px rgba(163, 230, 53, 0.35);
  z-index: 9999;
  font-family: 'Poppins', system-ui, sans-serif;
  min-width: 220px;
  animation: pdfToastIn 0.32s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}

@keyframes pdfToastIn {
  from { opacity: 0; transform: translateY(16px) scale(0.94); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.pdf-toast.done {
  border-color: rgba(163, 230, 53, 0.85);
  box-shadow:
    0 16px 40px -12px rgba(0, 0, 0, 0.9),
    0 0 32px -4px rgba(163, 230, 53, 0.55);
}

.pdf-toast__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(163, 230, 53, 0.12);
  color: #a3e635;
  transition: background 0.3s ease, color 0.3s ease;
}

.pdf-toast.done .pdf-toast__icon {
  background: linear-gradient(135deg, #a3e635, #bef264);
  color: #000;
  box-shadow: 0 0 16px rgba(163, 230, 53, 0.6);
}

.pdf-toast__spinner {
  animation: pdfToastSpin 0.9s linear infinite;
}

@keyframes pdfToastSpin {
  to { transform: rotate(360deg); }
}

.pdf-toast__check {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: pdfToastDraw 0.45s cubic-bezier(0.65, 0, 0.35, 1) forwards;
}

@keyframes pdfToastDraw {
  to { stroke-dashoffset: 0; }
}

.pdf-toast__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.pdf-toast__title {
  font-size: 0.85rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.pdf-toast.done .pdf-toast__title {
  color: #a3e635;
}

.pdf-toast__sub {
  font-size: 0.72rem;
  color: #888;
  font-weight: 500;
  line-height: 1.2;
}

/* Mobile */
@media (max-width: 480px) {
  .pdf-toast {
    bottom: 16px;
    right: 16px;
    left: 16px;
    min-width: 0;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .pdf-toast,
  .pdf-toast__spinner,
  .pdf-toast__check {
    animation: none !important;
  }
  .pdf-toast__check {
    stroke-dashoffset: 0;
  }
}
```

### frontend/src/components/Navbar.jsx

```
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTripActions } from "../context/TripActionsContext";
import "./Navbar.css";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/trips/new", label: "Create" },
  { to: "/trips", label: "My Trips" },
  { to: "/weather", label: "Weather" },
  { to: "/journal", label: "Journal" },
];

const loadHtml2Pdf = () => {
  if (window.html2pdf) return Promise.resolve(window.html2pdf);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.onload = () => resolve(window.html2pdf);
    s.onerror = reject;
    document.head.appendChild(s);
  });
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { actions } = useTripActions();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [pdfState, setPdfState] = useState("idle");

  const menuRef = useRef(null);
  const audioRef = useRef({ ac: null, noiseBuf: null });
  const path = location.pathname;

  /* ─── Audio helpers ─── */
  const getAudio = () => {
    const a = audioRef.current;
    if (!a.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      a.ac = new AC();
      const len = a.ac.sampleRate * 1.5;
      a.noiseBuf = a.ac.createBuffer(1, len, a.ac.sampleRate);
      const d = a.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (a.ac.state === "suspended") a.ac.resume();
    return a.ac;
  };

  useEffect(() => {
    const unlock = () => {
      getAudio();
      window.removeEventListener("pointerdown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const sPress = (t) => {
    const ctx = getAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(820, t);
    o.frequency.exponentialRampToValueAtTime(230, t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.09);
  };

  const sPing = (t) => {
    const ctx = getAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(1200, t);
    o.frequency.exponentialRampToValueAtTime(1188, t + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.46);
  };

  const sVictory = (t) => {
    const ctx = getAudio();
    if (!ctx) return;
    const notes = [784, 988, 1174];
    notes.forEach((freq, i) => {
      const st = t + i * 0.06;
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.08, st + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(st);
      o.stop(st + 0.55);
    });
  };

  const playPDFSounds = () => {
    const ctx = getAudio();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    sPress(t);
    sPing(t + 0.15);
    sVictory(t + 0.35);
  };

  /* ─── PDF export ─── */
  const runPDFExport = async () => {
    const target = document.getElementById("itineraryPaper");
    const holder = document.getElementById("itnHolder");
    if (!target) {
      console.warn("[Navbar PDF] target #itineraryPaper not found");
      return;
    }
    if (holder) holder.classList.add("is-exporting");
    await new Promise((r) => setTimeout(r, 250));

    try {
      const html2pdf = await loadHtml2Pdf();
      const filename = actions?.trip?.destination
        ? `${actions.trip.destination.replace(/\s+/g, "-")}-itinerary.pdf`
        : "itinerary.pdf";

      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: {
            mode: ["css", "legacy"],
            avoid: [".itn-day", ".itn-hotel", ".itn-table tr", ".itn-foot"],
          },
        })
        .from(target)
        .save();
    } catch (err) {
      console.error("[Navbar PDF] failed:", err);
      window.print();
    } finally {
      if (holder) holder.classList.remove("is-exporting");
    }
  };

  const handleTripPDF = () => {
    setMenuOpen(false);
    if (pdfState !== "idle") return;

    setPdfState("loading");
    playPDFSounds();

    setTimeout(() => {
      setPdfState("done");
      runPDFExport();
    }, 900);

    setTimeout(() => setPdfState("idle"), 3600);
  };

  /* ─── Nav helpers ─── */
  const isLinkActive = (to) => {
    if (to === "/") return path === "/";
    if (to === "/trips/new") return path === "/trips/new";
    if (to === "/weather")
      return path.startsWith("/weather") || path.includes("/weather-itinerary");
    if (to === "/journal")
      return path.startsWith("/journal") || path.includes("/journal");
    if (to === "/trips") {
      if (path === "/trips/new") return false;
      if (path.includes("/weather-itinerary")) return false;
      if (path.includes("/journal")) return false;
      return path === "/trips" || path.startsWith("/trips/");
    }
    return path.startsWith(to);
  };

  const handleLogout = () => {
    setOpen(false);
    setMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  const initials = (user?.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const closeMobile = () => setOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(""), 2000);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = document.title || "AI Travel Planner";
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        setMenuOpen(false);
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard");
    } catch {
      showToast("Could not copy link");
    }
    setMenuOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Link copied");
    } catch {
      showToast("Could not copy");
    }
    setMenuOpen(false);
  };

  const handleProfile = () => {
    setMenuOpen(false);
    navigate("/profile");
  };

  const handleTripJournal = () => {
    setMenuOpen(false);
    if (actions?.trip?._id) navigate(`/trips/${actions.trip._id}/journal`);
  };

  const handleTripShare = () => {
    setMenuOpen(false);
    if (actions?.onShare) actions.onShare();
  };

  return (
    <>
      <nav className="nb-root">
        <div className="nb-inner">
          <Link to="/" className="nb-brand" onClick={closeMobile}>
            <span className="nb-brand-text">
              AI Travel <span className="nb-brand-accent">Planner</span>
            </span>
          </Link>

          <div className="nb-links">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className={`nb-link ${isLinkActive(l.to) ? "active" : ""}`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {user ? (
            <div className="nb-auth">
              <Link to="/profile" className="nb-avatar" title={user.name}>
                {initials}
              </Link>
              <button type="button" className="nb-logout" onClick={handleLogout}>
                Logout
              </button>

              <div className="nb-menu-wrap" ref={menuRef}>
                <button
                  type="button"
                  className={`nb-menu-btn ${menuOpen ? "open" : ""}`}
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="More options"
                  aria-expanded={menuOpen}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="12" cy="19" r="1.8" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="nb-menu">
                    {actions ? (
                      <>
                        <div className="nb-menu-label">Trip actions</div>

                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleTripPDF}
                          disabled={pdfState !== "idle"}
                        >
                          <span className="nb-menu-icon">📄</span>
                          <span>
                            {pdfState === "loading"
                              ? "Preparing PDF…"
                              : pdfState === "done"
                              ? "PDF Downloaded!"
                              : "Export PDF"}
                          </span>
                        </button>

                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleTripJournal}
                        >
                          <span className="nb-menu-icon">📓</span>
                          <span>View Journal</span>
                        </button>

                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleTripShare}
                          disabled={actions.shareLoading}
                        >
                          <span className="nb-menu-icon">🔗</span>
                          <span>
                            {actions.shareLoading
                              ? "Creating..."
                              : "Share Trip"}
                          </span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleShare}
                        >
                          <span className="nb-menu-icon">🔗</span>
                          <span>Share this page</span>
                        </button>
                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleCopyLink}
                        >
                          <span className="nb-menu-icon">📋</span>
                          <span>Copy link</span>
                        </button>
                        <div className="nb-menu-divider" />
                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleProfile}
                        >
                          <span className="nb-menu-icon">👤</span>
                          <span>Profile</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="nb-auth">
              <Link to="/login" className="nb-cta-login">
                Login
              </Link>
              <Link to="/register" className="nb-cta-get-started">
                Get Started
              </Link>

              <div className="nb-menu-wrap" ref={menuRef}>
                <button
                  type="button"
                  className={`nb-menu-btn ${menuOpen ? "open" : ""}`}
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="More options"
                  aria-expanded={menuOpen}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="12" cy="19" r="1.8" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="nb-menu">
                    <button
                      type="button"
                      className="nb-menu-item"
                      onClick={handleShare}
                    >
                      <span className="nb-menu-icon">🔗</span>
                      <span>Share this page</span>
                    </button>
                    <button
                      type="button"
                      className="nb-menu-item"
                      onClick={handleCopyLink}
                    >
                      <span className="nb-menu-icon">📋</span>
                      <span>Copy link</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            className="nb-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>

        <div className={`nb-mobile ${open ? "open" : ""}`}>
          <div className="nb-mobile-links">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                onClick={closeMobile}
                className={`nb-mobile-link ${isLinkActive(l.to) ? "active" : ""}`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="nb-mobile-actions">
            <button type="button" className="nb-mobile-logout" onClick={handleShare}>
              🔗 Share this page
            </button>
            <button type="button" className="nb-mobile-logout" onClick={handleCopyLink}>
              📋 Copy link
            </button>
          </div>

          {user ? (
            <>
              <Link to="/profile" className="nb-mobile-user" onClick={closeMobile}>
                <span className="nb-avatar">{initials}</span>
                <span className="nb-mobile-user-info">
                  <span className="nb-mobile-user-name">{user.name}</span>
                  <span className="nb-mobile-user-email">{user.email}</span>
                </span>
              </Link>
              <div className="nb-mobile-actions">
                <button type="button" className="nb-mobile-logout" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="nb-mobile-actions">
              <Link to="/register" className="nb-mobile-cta" onClick={closeMobile}>
                Get Started
              </Link>
              <Link to="/login" className="nb-mobile-cta-ghost" onClick={closeMobile}>
                Login
              </Link>
            </div>
          )}
        </div>
      </nav>

      {toast && <div className="nb-toast">{toast}</div>}

      {pdfState !== "idle" && (
        <div className={`pdf-toast ${pdfState}`} role="status" aria-live="polite">
          <div className="pdf-toast__icon">
            {pdfState === "loading" ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                strokeLinejoin="round" className="pdf-toast__spinner">
                <path d="M21 12a9 9 0 1 1-6.2-8.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"
                strokeLinejoin="round" className="pdf-toast__check">
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
            )}
          </div>
          <div className="pdf-toast__text">
            <div className="pdf-toast__title">
              {pdfState === "loading" ? "Preparing PDF" : "PDF Downloaded"}
            </div>
            <div className="pdf-toast__sub">
              {pdfState === "loading"
                ? "Just a moment…"
                : "Check your downloads folder"}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
```

### frontend/src/components/Skeleton.jsx

```
/**
 * Reusable skeleton placeholder.
 *
 * Usage:
 *   <Skeleton variant="text" width="60%" />
 *   <Skeleton variant="circular" width={40} height={40} />
 *   <Skeleton variant="rectangular" width="100%" height={200} />
 *   <Skeleton variant="card" />           // image + title + lines
 */
const Skeleton = ({
  variant = "rectangular",
  width,
  height,
  className = "",
  style = {},
  count = 1,
  rounded,
}) => {
  const baseClass = "skeleton";
  const variantClass = {
    text: "skeleton-text",
    circular: "skeleton-circle",
    rectangular: "skeleton-img",
    card: "",
  }[variant] || "";

  const autoRounded =
    rounded !== undefined
      ? rounded
      : variant === "text"
      ? "6px"
      : variant === "circular"
      ? "50%"
      : "12px";

  const inlineStyle = {
    width,
    height,
    borderRadius: autoRounded,
    ...style,
  };

  // Count = render N stacked skeletons
  if (count > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {[...Array(count)].map((_, i) => (
          <div key={i} className={`${baseClass} ${variantClass}`} style={inlineStyle} />
        ))}
      </div>
    );
  }

  // card = composite (image + title + 2 lines)
  if (variant === "card") {
    return (
      <div className={`animate-fade-in ${className}`}>
        <div className={`${baseClass} skeleton-img`} style={{ width: "100%", aspectRatio: "4 / 3" }} />
        <div className={`${baseClass} skeleton-text`} style={{ width: "70%", height: 18, marginTop: 12 }} />
        <div className={`${baseClass} skeleton-text`} style={{ width: "45%", height: 12, marginTop: 8 }} />
      </div>
    );
  }

  return <div className={`${baseClass} ${variantClass} ${className}`} style={inlineStyle} />;
};

export default Skeleton;
```

### frontend/src/components/SubmitButton.css

```
/* frontend/src/components/SubmitButton.css */

.sb-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 46px;
  min-width: 180px;
  padding: 0 28px;
  border-radius: 9999px;
  background: transparent;
  border: 2px solid #a3e635;
  color: #a3e635;
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  cursor: pointer;
  overflow: hidden;
  outline: none;
  transition:
    width 0.45s cubic-bezier(0.16, 1, 0.3, 1),
    min-width 0.45s cubic-bezier(0.16, 1, 0.3, 1),
    padding 0.45s cubic-bezier(0.16, 1, 0.3, 1),
    background 0.3s ease,
    border-color 0.3s ease,
    color 0.3s ease,
    transform 0.15s ease,
    box-shadow 0.3s ease;
}

.sb-btn:hover:not(:disabled) {
  background: #a3e635;
  color: #000;
  box-shadow: 0 10px 30px -8px rgba(163, 230, 53, 0.6);
}

.sb-btn:active:not(:disabled) {
  transform: scale(0.97);
  letter-spacing: 0.08em;
}

.sb-btn:focus-visible {
  outline: 2px solid #a3e635;
  outline-offset: 4px;
}

.sb-btn:disabled {
  cursor: not-allowed;
}

.sb-btn.is-loading {
  width: 46px;
  min-width: 46px;
  padding: 0;
  background: transparent;
  border-color: rgba(163, 230, 53, 0.18);
  border-left-color: #a3e635;
  border-width: 3px;
  color: transparent;
  animation: sb-rotate 1s linear infinite;
  box-shadow: 0 0 24px -8px rgba(163, 230, 53, 0.6);
  pointer-events: none;
}

.sb-btn.is-loading .sb-label {
  display: none;
}

@keyframes sb-rotate {
  to { transform: rotate(360deg); }
}

.sb-btn.is-success {
  width: 46px;
  min-width: 46px;
  padding: 0;
  background: #a3e635;
  border-color: #a3e635;
  color: #000;
  animation: none;
  box-shadow:
    0 0 0 4px rgba(163, 230, 53, 0.2),
    0 10px 30px -8px rgba(163, 230, 53, 0.7);
}

.sb-btn.is-success .sb-label {
  display: none;
}

.sb-check {
  width: 22px;
  height: 22px;
  color: #000;
}

.sb-check polyline {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: sb-draw 0.45s cubic-bezier(0.65, 0, 0.35, 1) 0.05s forwards;
}

@keyframes sb-draw {
  to { stroke-dashoffset: 0; }
}

.sb-label {
  display: inline-block;
  white-space: nowrap;
  user-select: none;
  transition: opacity 0.2s ease;
}

@media (prefers-reduced-motion: reduce) {
  .sb-btn {
    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }
  .sb-btn.is-loading {
    animation-duration: 3s;
  }
  .sb-check polyline {
    animation-duration: 0.01ms;
    stroke-dashoffset: 0;
  }
}

@media (max-width: 480px) {
  .sb-btn {
    width: 100%;
    min-width: 0;
  }
  .sb-btn.is-loading,
  .sb-btn.is-success {
    width: 46px;
    min-width: 46px;
    margin-left: auto;
  }
}
```

### frontend/src/components/SubmitButton.jsx

```
import "./SubmitButton.css";

const SubmitButton = ({
  children = "Generate Trip",
  state = "idle",
  type = "submit",
  onClick,
  disabled = false,
}) => {
  const isLoading = state === "loading";
  const isSuccess = state === "success";
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      className={`sb-btn ${isLoading ? "is-loading" : ""} ${
        isSuccess ? "is-success" : ""
      }`}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isLoading}
    >
      {isSuccess ? (
        <svg
          className="sb-check"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <span className="sb-label">{children}</span>
      )}
    </button>
  );
};

export default SubmitButton;
```

### frontend/src/components/TripMap.css

```
/* frontend/src/components/TripMap.css */

/* Wrapper isolates the map into its own stacking context */
.trip-map-wrap {
  position: relative;
  z-index: 0;            /* LOW — below navbar (100) and other UI */
  isolation: isolate;    /* creates a new stacking context */
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #050505;
  box-shadow:
    0 16px 40px -20px rgba(0, 0, 0, 0.9),
    0 0 30px -12px rgba(163, 230, 53, 0.15);
}

/* Force the Leaflet container to stay inside the wrapper */
.trip-map-wrap .leaflet-container {
  z-index: 0 !important;
  border-radius: 20px;
  font-family: 'Poppins', system-ui, sans-serif;
  background: #0b0b0b;
}

/* Keep Leaflet's internal panes from escaping above the navbar */
.trip-map-wrap .leaflet-pane,
.trip-map-wrap .leaflet-top,
.trip-map-wrap .leaflet-bottom {
  z-index: auto !important;
}

.trip-map-wrap .leaflet-pane { z-index: 400 !important; }
.trip-map-wrap .leaflet-tile-pane    { z-index: 200 !important; }
.trip-map-wrap .leaflet-overlay-pane { z-index: 400 !important; }
.trip-map-wrap .leaflet-shadow-pane  { z-index: 500 !important; }
.trip-map-wrap .leaflet-marker-pane  { z-index: 600 !important; }
.trip-map-wrap .leaflet-tooltip-pane { z-index: 650 !important; }
.trip-map-wrap .leaflet-popup-pane   { z-index: 700 !important; }

/* Leaflet controls (zoom +/-) */
.trip-map-wrap .leaflet-top,
.trip-map-wrap .leaflet-bottom {
  z-index: 800 !important;
}

/* Zoom buttons — dark glass */
.trip-map-wrap .leaflet-control-zoom {
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 12px !important;
  overflow: hidden;
  box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.9);
}
.trip-map-wrap .leaflet-control-zoom a {
  background: rgba(11, 11, 11, 0.95) !important;
  color: #ffffff !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  font-weight: 700;
  width: 34px !important;
  height: 34px !important;
  line-height: 34px !important;
  font-size: 18px !important;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.trip-map-wrap .leaflet-control-zoom a:hover {
  background: #a3e635 !important;
  color: #000000 !important;
  border-color: #a3e635 !important;
}
.trip-map-wrap .leaflet-control-zoom a.leaflet-disabled {
  background: rgba(11, 11, 11, 0.6) !important;
  color: rgba(255, 255, 255, 0.3) !important;
}

/* Attribution bar — dark glass */
.trip-map-wrap .leaflet-control-attribution {
  background: rgba(11, 11, 11, 0.85) !important;
  color: #888888 !important;
  font-size: 10px;
  padding: 3px 10px;
  border-radius: 10px 0 0 0;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-left: 1px solid rgba(255, 255, 255, 0.06);
}
.trip-map-wrap .leaflet-control-attribution a {
  color: #a3e635 !important;
  text-decoration: none;
  font-weight: 700;
}
.trip-map-wrap .leaflet-control-attribution a:hover {
  color: #bef264 !important;
  text-decoration: underline;
}

/* Popups — dark card */
.trip-map-wrap .leaflet-popup-content-wrapper {
  background: #0b0b0b;
  color: #ffffff;
  border: 1px solid rgba(163, 230, 53, 0.35);
  border-radius: 14px;
  box-shadow:
    0 16px 32px -12px rgba(0, 0, 0, 0.95),
    0 0 24px -8px rgba(163, 230, 53, 0.25);
}
.trip-map-wrap .leaflet-popup-content {
  margin: 12px 14px;
  font-size: 12.5px;
  line-height: 1.5;
}
.trip-map-wrap .leaflet-popup-content strong {
  color: #ffffff;
  font-weight: 800;
}
.trip-map-wrap .leaflet-popup-tip {
  background: #0b0b0b;
  border: 1px solid rgba(163, 230, 53, 0.35);
  box-shadow: none;
}
.trip-map-wrap .leaflet-popup-close-button {
  color: #888888 !important;
  font-size: 18px !important;
  padding: 6px 8px !important;
}
.trip-map-wrap .leaflet-popup-close-button:hover {
  color: #a3e635 !important;
}
```

### frontend/src/components/TripMap.jsx

```
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./TripMap.css";

/* Fix default marker icons (known Leaflet+React quirk) */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* Red marker icon for tourist attractions */
const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const TripMap = ({ lat, lng, label, places = [] }) => {
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  return (
    <div className="trip-map-wrap">
      <MapContainer
        center={[lat, lng]}
        zoom={11}
        style={{ height: "360px", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[lat, lng]}>
          <Popup>{label}</Popup>
        </Marker>

        {places.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={redIcon}>
            <Popup>
              <strong>{p.name}</strong>
              <br />
              <span style={{ fontSize: 12, color: "#666" }}>{p.type}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default TripMap;
```

### frontend/src/components/WeatherIcon.jsx

```
// frontend/src/components/WeatherIcon.jsx — NEW FILE
import { useMemo } from "react";

/* WMO code → animation type */
export function decodeWeatherCode(code) {
  if (code === 0) return { type: "sun", label: "Clear Sky" };
  if (code === 1) return { type: "partly", label: "Mainly Clear" };
  if (code === 2) return { type: "partly", label: "Partly Cloudy" };
  if (code === 3) return { type: "cloud", label: "Overcast" };
  if (code === 45 || code === 48) return { type: "fog", label: "Foggy" };
  if (code >= 51 && code <= 57) return { type: "drizzle", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { type: "rain", label: "Rain" };
  if (code >= 71 && code <= 77) return { type: "snow", label: "Snow" };
  if (code >= 80 && code <= 82) return { type: "rain", label: "Rain Showers" };
  if (code >= 85 && code <= 86) return { type: "snow", label: "Snow Showers" };
  if (code >= 95 && code <= 99) return { type: "thunder", label: "Thunderstorm" };
  return { type: "cloud", label: "Mixed" };
}

let _uid = 0;

function renderWxSvg(type) {
  const uid = ++_uid;

  const defs = `<defs>
    <radialGradient id="wfSunCore-${uid}" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#fffbe6"/>
      <stop offset="35%" stop-color="#fde047"/>
      <stop offset="70%" stop-color="#facc15"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </radialGradient>
    <radialGradient id="wfSunGlow-${uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fde047" stop-opacity="0.85"/>
      <stop offset="55%" stop-color="#fbbf24" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="wfRay-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <linearGradient id="wfCloud-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
    <linearGradient id="wfCloudBack-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
    <linearGradient id="wfStorm-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="wfDrop-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e0f2fe"/>
      <stop offset="55%" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
    <linearGradient id="wfBolt-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff7cc"/>
      <stop offset="50%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <filter id="wfBlur-${uid}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.4"/>
    </filter>
    <filter id="wfGlow-${uid}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.4"/>
    </filter>
  </defs>`;

  const wrap = (inner) =>
    `<svg class="wf-wx-icon" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">${defs}${inner}</svg>`;

  const cloud = `<path d="M22 58 h38 c5 0 9 -4 9 -9 c0 -5 -4 -9 -9 -9 c-1 -8 -8 -14 -16 -14 c-7 0 -13 4 -15 11 c-1 -1 -3 -1 -4 -1 c-5 0 -9 4 -9 9 c0 5 4 9 9 9 z" fill="url(#wfCloud-${uid})" stroke="rgba(255,255,255,0.9)" stroke-width="0.9" stroke-linejoin="round"/>`;
  const cloudBack = `<path d="M22 56 h38 c5 0 9 -4 9 -9 c0 -5 -4 -9 -9 -9 c-1 -8 -8 -14 -16 -14 c-7 0 -13 4 -15 11 c-1 -1 -3 -1 -4 -1 c-5 0 -9 4 -9 9 c0 5 4 9 9 9 z" fill="url(#wfCloudBack-${uid})" stroke="rgba(255,255,255,0.35)" stroke-width="0.8" stroke-linejoin="round"/>`;
  const storm = `<path d="M18 56 h44 c6 0 10 -4 10 -10 c0 -6 -4 -10 -10 -10 c-1 -9 -9 -16 -18 -16 c-8 0 -15 5 -17 13 c-1 -1 -3 -1 -4 -1 c-6 0 -11 5 -11 11 c0 6 5 13 6 13 z" fill="url(#wfStorm-${uid})" stroke="rgba(255,255,255,0.3)" stroke-width="0.8" stroke-linejoin="round"/>`;

  if (type === "sun") {
    const rays = Array.from({ length: 12 }, (_, i) => {
      const a = (i * 360) / 12;
      return `<rect x="38.6" y="6" width="2.8" height="10" rx="1.4" fill="url(#wfRay-${uid})" transform="rotate(${a} 40 40)"/>`;
    }).join("");
    return wrap(`
      <circle class="wf-wx-sun-glow" cx="40" cy="40" r="28" fill="url(#wfSunGlow-${uid})"/>
      <g class="wf-wx-sun-rays">${rays}</g>
      <circle class="wf-wx-sun-core" cx="40" cy="40" r="15" fill="url(#wfSunCore-${uid})"/>
      <ellipse cx="35" cy="33" rx="6" ry="4.5" fill="#ffffff" opacity="0.55" filter="url(#wfBlur-${uid})"/>
      <circle cx="40" cy="40" r="15" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
    `);
  }

  if (type === "cloud") {
    return wrap(`
      <g class="wf-wx-cloud">${cloudBack}${cloud}
        <ellipse cx="30" cy="38" rx="10" ry="5" fill="#ffffff" opacity="0.35" filter="url(#wfBlur-${uid})"/>
      </g>
    `);
  }

  if (type === "partly") {
    const rays = Array.from({ length: 8 }, (_, i) => {
      const a = (i * 360) / 8;
      return `<rect x="54.6" y="6" width="2.8" height="8" rx="1.4" fill="url(#wfRay-${uid})" transform="rotate(${a} 56 10)"/>`;
    }).join("");
    return wrap(`
      <circle class="wf-wx-sun-glow" cx="56" cy="20" r="18" fill="url(#wfSunGlow-${uid})"/>
      <g class="wf-wx-sun-rays" style="transform-origin:56px 20px">${rays}</g>
      <circle class="wf-wx-sun-core" cx="56" cy="20" r="9" fill="url(#wfSunCore-${uid})"/>
      <ellipse cx="53" cy="17" rx="3.5" ry="2.8" fill="#fff" opacity="0.6" filter="url(#wfBlur-${uid})"/>
      <g class="wf-wx-cloud" style="transform-origin:40px 50px">${cloudBack}${cloud}
        <ellipse cx="30" cy="38" rx="10" ry="5" fill="#ffffff" opacity="0.4" filter="url(#wfBlur-${uid})"/>
      </g>
    `);
  }

  if (type === "rain") {
    const drops = [
      [22, 68, 0], [32, 68, 0.28], [42, 68, 0.55], [52, 68, 0.83], [62, 68, 1.1],
    ].map(([x, y, d]) => `
      <g class="wf-wx-raindrop" style="animation-delay:${d}s">
        <path d="M${x} ${y-6} c -3 4 -3 8 0 10 c 3 -2 3 -6 0 -10 z" fill="url(#wfDrop-${uid})" stroke="rgba(255,255,255,0.5)" stroke-width="0.5"/>
        <circle cx="${x}" cy="${y+2}" r="0.9" fill="#ffffff" opacity="0.85"/>
      </g>`).join("");
    return wrap(`<g class="wf-wx-cloud-back" style="transform-origin:40px 40px">${storm}</g><g class="wf-wx-cloud">${cloud}</g>${drops}`);
  }

  if (type === "drizzle") {
    const drops = [[26, 68, 0], [40, 68, 0.35], [54, 68, 0.7]]
      .map(([x, y, d]) => `
      <g class="wf-wx-raindrop" style="animation-delay:${d}s">
        <path d="M${x} ${y-4} c -2 3 -2 6 0 8 c 2 -2 2 -5 0 -8 z" fill="url(#wfDrop-${uid})" stroke="rgba(255,255,255,0.5)" stroke-width="0.4"/>
      </g>`).join("");
    return wrap(`<g class="wf-wx-cloud">${cloud}</g>${drops}`);
  }

  if (type === "thunder") {
    return wrap(`
      <g class="wf-wx-cloud-back" style="transform-origin:40px 40px">${storm}</g>
      <g class="wf-wx-cloud">${cloud}</g>
      <path class="wf-wx-bolt-glow" d="M42 52 L32 64 L40 64 L34 76 L50 60 L42 60 L46 52 Z" fill="#fde047" filter="url(#wfGlow-${uid})"/>
      <path class="wf-wx-bolt" d="M42 52 L32 64 L40 64 L34 76 L50 60 L42 60 L46 52 Z" fill="url(#wfBolt-${uid})" stroke="#fffbe6" stroke-width="1" stroke-linejoin="round"/>
    `);
  }

  if (type === "snow") {
    const flake = (cx, cy, i) => `
      <g class="wf-wx-snowflake" style="animation-delay:${i * 0.75}s;transform-origin:${cx}px ${cy}px">
        <g transform="translate(${cx} ${cy})">
          <line x1="0" y1="-4" x2="0" y2="4" stroke="#f0f9ff" stroke-width="1.6" stroke-linecap="round"/>
          <line x1="-3.5" y1="-2" x2="3.5" y2="2" stroke="#f0f9ff" stroke-width="1.6" stroke-linecap="round"/>
          <line x1="-3.5" y1="2" x2="3.5" y2="-2" stroke="#f0f9ff" stroke-width="1.6" stroke-linecap="round"/>
          <circle cx="0" cy="0" r="1.2" fill="#ffffff"/>
        </g>
      </g>`;
    return wrap(`<g class="wf-wx-cloud">${cloud}</g>${flake(24, 70, 0)}${flake(40, 70, 1)}${flake(56, 70, 2)}`);
  }

  if (type === "fog") {
    return wrap(`
      <g class="wf-wx-cloud">${cloud}</g>
      <g class="wf-wx-fog-wave"><path d="M14 66 q6 -3 12 0 t12 0 t12 0 t12 0" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/></g>
      <g class="wf-wx-fog-wave"><path d="M10 72 q6 -3 12 0 t12 0 t12 0 t12 0" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-linecap="round"/></g>
      <g class="wf-wx-fog-wave"><path d="M14 78 q6 -3 12 0 t12 0 t12 0 t12 0" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/></g>
    `);
  }

  return wrap(`<circle cx="40" cy="40" r="14" fill="none" stroke="#cbd5e1" stroke-width="2"/>`);
}

export default function WeatherIcon({ type, size = 72 }) {
  const svg = useMemo(() => renderWxSvg(type), [type]);
  return (
    <span
      style={{ display: "inline-block", width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
```

### frontend/src/components/WeatherSlider.jsx

```
import { useEffect, useMemo, useRef, useState } from "react";

/* ============================================================
   WMO CODE TABLE
   ============================================================ */
const WMO = {
  0: { icon: "☀️", label: "Clear" },
  1: { icon: "🌤️", label: "Mainly clear" },
  2: { icon: "⛅", label: "Partly cloudy" },
  3: { icon: "☁️", label: "Overcast" },
  45: { icon: "🌫️", label: "Fog" },
  48: { icon: "🌫️", label: "Rime fog" },
  51: { icon: "🌦️", label: "Light drizzle" },
  53: { icon: "🌦️", label: "Drizzle" },
  55: { icon: "🌧️", label: "Dense drizzle" },
  61: { icon: "🌦️", label: "Light rain" },
  63: { icon: "🌧️", label: "Rain" },
  65: { icon: "🌧️", label: "Heavy rain" },
  71: { icon: "🌨️", label: "Light snow" },
  73: { icon: "🌨️", label: "Snow" },
  75: { icon: "❄️", label: "Heavy snow" },
  77: { icon: "❄️", label: "Snow grains" },
  80: { icon: "🌦️", label: "Showers" },
  81: { icon: "🌧️", label: "Showers" },
  82: { icon: "⛈️", label: "Violent showers" },
  85: { icon: "🌨️", label: "Snow showers" },
  86: { icon: "❄️", label: "Heavy snow" },
  95: { icon: "⛈️", label: "Thunderstorm" },
  96: { icon: "⛈️", label: "Storm + hail" },
  99: { icon: "⛈️", label: "Storm + hail" },
};
const describe = (c) => WMO[c] || { icon: "🌡️", label: "Unsettled" };

/* ============================================================
   HELPERS
   ============================================================ */
const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmtShort = (iso) =>
  fromISO(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const mean = (arr) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

/* ============================================================
   AI-STYLE TIP GENERATOR (based on weather)
   ============================================================ */
function generateTip(day) {
  const label = describe(day.code).label.toLowerCase();
  if (day.pop >= 60) {
    return "⚠️ High rain chance — best for indoor museums, cafés, and shopping districts.";
  }
  if (day.pop >= 40) {
    return "Carry an umbrella — mix indoor and outdoor stops today.";
  }
  if (day.max >= 32) {
    return "☀️ Hot day — plan outdoor activities early morning, stay hydrated.";
  }
  if (day.max <= 5) {
    return "❄️ Cold day — dress warm, ideal for scenic walks and hot drinks.";
  }
  if (label.includes("clear") || label.includes("sunny")) {
    return "Perfect weather for outdoor sightseeing, photography, and walking tours.";
  }
  return "Comfortable weather — a great day to explore the destination.";
}

/* ============================================================
   COMPONENT
   ============================================================ */
const WeatherSlider = ({ lat, lng, startDate, endDate }) => {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState("C");
  const [filter, setFilter] = useState("all");
  const [activeDay, setActiveDay] = useState(1);
  const [motionOn, setMotionOn] = useState(false);
  const [progress, setProgress] = useState(6);

  const trackRef = useRef(null);
  const motionRef = useRef(null);
  const dragRef = useRef({ dragging: false, startX: 0, startLeft: 0 });

  /* ---------- Fetch data ---------- */
  useEffect(() => {
    if (!lat || !lng || !startDate || !endDate) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const sISO = toISO(new Date(startDate));
        const eISO = toISO(new Date(endDate));
        const days =
          Math.round((fromISO(eISO) - fromISO(sISO)) / 86400000) + 1;

        // Cap at 30 days for the slider
        const totalDays = Math.min(days, 30);

        // ── Live 16-day fetch ──
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", lat);
        url.searchParams.set("longitude", lng);
        url.searchParams.set(
          "daily",
          "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
        );
        url.searchParams.set("timezone", "auto");
        url.searchParams.set("forecast_days", "16");

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Forecast failed");
        const daily = (await res.json())?.daily;
        if (!daily?.time?.length) throw new Error("No forecast data");

        const liveRows = daily.time.map((date, i) => ({
          date,
          code: daily.weather_code?.[i] ?? 0,
          max: daily.temperature_2m_max?.[i] ?? null,
          min: daily.temperature_2m_min?.[i] ?? null,
          pop: daily.precipitation_probability_max?.[i] ?? 0,
          source: "live",
        }));

        // ── Climate tail (days 17–30) ──
        // Fetch same calendar window from 3 prior years
        const climateRows = [];
        if (totalDays > 16) {
          const climateStart = new Date(sISO);
          climateStart.setDate(climateStart.getDate() + 16);
          const climateEnd = new Date(sISO);
          climateEnd.setDate(climateEnd.getDate() + totalDays - 1);

          const thisYear = new Date().getFullYear();
          const years = [thisYear - 1, thisYear - 2, thisYear - 3];

          const perYear = await Promise.all(
            years.map(async (y) => {
              const cs = new Date(
                y,
                climateStart.getMonth(),
                climateStart.getDate()
              );
              const ce = new Date(
                y,
                climateEnd.getMonth(),
                climateEnd.getDate()
              );
              const cu = new URL(
                "https://archive-api.open-meteo.com/v1/archive"
              );
              cu.searchParams.set("latitude", lat);
              cu.searchParams.set("longitude", lng);
              cu.searchParams.set("start_date", toISO(cs));
              cu.searchParams.set("end_date", toISO(ce));
              cu.searchParams.set(
                "daily",
                "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum"
              );
              cu.searchParams.set("timezone", "auto");
              try {
                const r = await fetch(cu.toString());
                if (!r.ok) return null;
                const j = await r.json();
                const d = j?.daily;
                if (!d?.time?.length) return null;
                return d.time.map((date, i) => ({
                  code: d.weather_code?.[i] ?? 0,
                  max: d.temperature_2m_max?.[i] ?? null,
                  min: d.temperature_2m_min?.[i] ?? null,
                  precip: d.precipitation_sum?.[i] ?? null,
                }));
              } catch {
                return null;
              }
            })
          );

          const validYears = perYear.filter(Boolean);
          if (validYears.length) {
            const spine = validYears[0];
            spine.forEach((_, i) => {
              const maxes = validYears.map((y) => y[i]?.max).filter((v) => v != null);
              const mins = validYears.map((y) => y[i]?.min).filter((v) => v != null);
              const codes = validYears.map((y) => y[i]?.code).filter((v) => v != null);
              const precips = validYears.map((y) => y[i]?.precip).filter((v) => v != null);

              // mode for weather code
              const freq = new Map();
              codes.forEach((c) => freq.set(c, (freq.get(c) || 0) + 1));
              let dom = codes[0] ?? 0;
              let best = -1;
              for (const [c, n] of freq) if (n > best) { best = n; dom = c; }

              const rainy = precips.filter((p) => p > 1).length;
              const pop = precips.length ? Math.round((rainy / precips.length) * 100) : 0;

              const dateObj = new Date(sISO);
              dateObj.setDate(dateObj.getDate() + 16 + i);

              climateRows.push({
                date: toISO(dateObj),
                code: dom,
                max: mean(maxes),
                min: mean(mins),
                pop,
                source: "climate",
              });
            });
          }
        }

        const combined = [...liveRows.slice(0, 16), ...climateRows].slice(0, totalDays);
        if (!cancelled) setSeries(combined);
      } catch (err) {
        console.error("[WeatherSlider]", err);
        if (!cancelled) setError("Couldn't load the weather forecast.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [lat, lng, startDate, endDate]);

  /* ---------- Temperature conversion ---------- */
  const temp = (c) => {
    if (c === null || c === undefined) return "–";
    if (unit === "F") return `${Math.round((c * 9) / 5 + 32)}°F`;
    return `${c}°C`;
  };
  const tempShort = (c) => {
    if (c === null || c === undefined) return "–";
    if (unit === "F") return `${Math.round((c * 9) / 5 + 32)}°`;
    return `${c}°`;
  };

  /* ---------- Filtered series ---------- */
  const visible = useMemo(() => {
    if (filter === "clear") return series.filter((d) => d.pop < 20);
    if (filter === "rain") return series.filter((d) => d.pop >= 50);
    return series;
  }, [series, filter]);

  /* ---------- Auto-scroll ---------- */
  useEffect(() => {
    if (motionOn) {
      motionRef.current = setInterval(() => {
        const track = trackRef.current;
        if (!track) return;
        if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
          track.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          track.scrollBy({ left: 165, behavior: "smooth" });
        }
      }, 1800);
    } else if (motionRef.current) {
      clearInterval(motionRef.current);
      motionRef.current = null;
    }
    return () => {
      if (motionRef.current) clearInterval(motionRef.current);
    };
  }, [motionOn]);

  /* ---------- Progress bar on scroll ---------- */
  const updateProgress = () => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    if (max <= 0) return setProgress(100);
    const pct = (track.scrollLeft / max) * 100;
    setProgress(Math.max(6, Math.min(100, pct)));
  };

  /* ---------- Drag to scroll ---------- */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onDown = (e) => {
      dragRef.current.dragging = true;
      dragRef.current.startX = e.pageX - track.offsetLeft;
      dragRef.current.startLeft = track.scrollLeft;
    };
    const onLeave = () => (dragRef.current.dragging = false);
    const onUp = () => (dragRef.current.dragging = false);
    const onMove = (e) => {
      if (!dragRef.current.dragging) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const walk = (x - dragRef.current.startX) * 1.5;
      track.scrollLeft = dragRef.current.startLeft - walk;
    };

    track.addEventListener("mousedown", onDown);
    track.addEventListener("mouseleave", onLeave);
    track.addEventListener("mouseup", onUp);
    track.addEventListener("mousemove", onMove);
    track.addEventListener("scroll", updateProgress);

    return () => {
      track.removeEventListener("mousedown", onDown);
      track.removeEventListener("mouseleave", onLeave);
      track.removeEventListener("mouseup", onUp);
      track.removeEventListener("mousemove", onMove);
      track.removeEventListener("scroll", updateProgress);
    };
  }, [visible]);

  /* ---------- Card 3D tilt ---------- */
  const handleMove = (e, el) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `perspective(600px) rotateX(${-y * 0.1}deg) rotateY(${x * 0.1}deg) translateY(-8px) scale(1.04)`;
  };
  const handleLeave = (el) => {
    el.style.transform = "";
  };

  /* ---------- Arrows ---------- */
  const slide = (dir) => {
    const track = trackRef.current;
    if (track) track.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  /* ---------- Active day data ---------- */
  const activeData = series.find(
    (d, i) => i + 1 === activeDay
  ) || series[0] || null;

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <section className="mt-16">
        <h2 className="text-2xl font-extrabold text-ink mb-6">
          Trip Weather Outlook
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-44 rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-16">
        <h2 className="text-2xl font-extrabold text-ink mb-6">
          Trip Weather Outlook
        </h2>
        <p className="text-sm text-gray-500">{error}</p>
      </section>
    );
  }

  if (!series.length) return null;

  return (
    <section className="mt-16 ws-wrapper">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="ws-header">
        <div>
          <div className="ws-brand-tag">
            <span className="ws-pulse-dot"></span>
            AI Live Weather Engine
          </div>
          <h2 className="ws-title">
            {series.length}-Day <span>Forecast Motion</span>
          </h2>
          <p className="ws-subtitle">
            Horizontal scroll with live Open-Meteo + seasonal climate fallback.
          </p>
        </div>

        <div className="ws-controls">
          <button
            className="ws-btn"
            onClick={() => setUnit(unit === "C" ? "F" : "C")}
          >
            Unit: °{unit}
          </button>
          <button
            className={`ws-btn ${motionOn ? "active" : ""}`}
            onClick={() => setMotionOn((v) => !v)}
          >
            <span>{motionOn ? "⏸" : "▶"}</span>
            <span>{motionOn ? "Pause" : "Auto-Scroll"}</span>
          </button>
          <div className="ws-nav-arrows">
            <button
              className="ws-arrow-btn"
              onClick={() => slide(-1)}
              aria-label="Previous"
            >
              ◀
            </button>
            <button
              className="ws-arrow-btn"
              onClick={() => slide(1)}
              aria-label="Next"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════ FILTERS ═══════════ */}
      <div className="ws-filters">
        <button
          className={`ws-chip ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All {series.length} Days
        </button>
        <button
          className={`ws-chip ${filter === "clear" ? "active" : ""}`}
          onClick={() => setFilter("clear")}
        >
          ☀️ Clear Skies (&lt;20% Rain)
        </button>
        <button
          className={`ws-chip ${filter === "rain" ? "active" : ""}`}
          onClick={() => setFilter("rain")}
        >
          🌧️ Plan B Days (≥50% Rain)
        </button>
      </div>

      {/* ═══════════ TRACK ═══════════ */}
      <div className="ws-track-wrapper">
        <div className="ws-edge-left" />
        <div className="ws-edge-right" />
        <div className="ws-track" ref={trackRef}>
          {visible.map((d, idx) => {
            const dayNum = series.indexOf(d) + 1;
            const w = describe(d.code);
            const isLive = d.source === "live";
            const isRainy = d.pop >= 50;
            const isActive = dayNum === activeDay;

            return (
              <div
                key={d.date}
                className={`ws-card ${isActive ? "active" : ""}`}
                onClick={() => setActiveDay(dayNum)}
                onMouseMove={(e) => handleMove(e, e.currentTarget)}
                onMouseLeave={(e) => handleLeave(e.currentTarget)}
              >
                <div className="ws-card-header">
                  <span className="ws-card-day">Day {dayNum}</span>
                  <span
                    className={`ws-card-badge ${
                      isLive ? "ws-badge-live" : "ws-badge-climate"
                    }`}
                  >
                    {isLive ? "Live" : "Climate"}
                  </span>
                </div>

                <div className="ws-card-icon-area">
                  <span className="ws-card-icon">{w.icon}</span>
                  <div className="ws-card-date">{fmtShort(d.date)}</div>
                </div>

                <div className="ws-card-stats">
                  <div>
                    <span className="ws-temp-high">{tempShort(d.max)}</span>
                    <span className="ws-temp-low">{tempShort(d.min)}</span>
                  </div>
                  <span
                    className={`ws-rain-stat ${
                      isRainy ? "ws-rain-warning" : "ws-rain-safe"
                    }`}
                  >
                    {d.pop}%
                  </span>
                </div>

                {isRainy && <div className="ws-plan-b">⚡ Plan B</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════ PROGRESS ═══════════ */}
      <div className="ws-progress">
        <div
          className="ws-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ═══════════ INSPECTOR ═══════════ */}
      {activeData && (
        <div className="ws-inspector">
          <div className="ws-inspector-left">
            <div className="ws-inspector-icon">
              {describe(activeData.code).icon}
            </div>
            <div className="ws-inspector-info">
              <div className="ws-inspector-title">
                <span>
                  Day {activeDay}: {fmtShort(activeData.date)} —{" "}
                  {describe(activeData.code).label}
                </span>
                <span
                  className={`ws-inspector-risk ${
                    activeData.pop >= 50 ? "rainy" : ""
                  }`}
                >
                  {activeData.pop >= 50 ? "🌧️" : "☀️"} {activeData.pop}% Rain
                  Risk
                </span>
              </div>
              <div className="ws-inspector-sub">
                High: {temp(activeData.max)} • Low: {temp(activeData.min)} •
                Source:{" "}
                {activeData.source === "live"
                  ? "Open-Meteo 16-Day Forecast"
                  : "Historical Climate Model"}
              </div>
            </div>
          </div>

          <div className="ws-inspector-ai">
            <span className="ws-ai-badge">AI Plan</span>
            <span>{generateTip(activeData)}</span>
          </div>
        </div>
      )}
    </section>
  );
};

export default WeatherSlider;
```

### frontend/src/context/AuthContext.jsx

```
import { createContext, useContext, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );

  const register = async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("user", JSON.stringify(res.data));
    setUser(res.data);
  };

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("user", JSON.stringify(res.data));
    setUser(res.data);
  };

  const googleLogin = async ({ email, name, googleId, avatar }) => {
    const res = await api.post("/auth/google", {
      email,
      name,
      googleId,
      avatar,
    });
    localStorage.setItem("user", JSON.stringify(res.data));
    setUser(res.data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, register, login, googleLogin, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

### frontend/src/context/ThemeContext.jsx

```
import { createContext, useContext, useMemo } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Theme is permanently locked to light mode.
  // The toggle and dark logic have been removed.
  const value = useMemo(
    () => ({
      theme: "light",
      isDark: false,
      dark: false,
      toggleTheme: () => {},
      setDark: () => {},
    }),
    []
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
};

export default ThemeContext;
```

### frontend/src/context/TripActionsContext.jsx

```
import { createContext, useContext, useState } from "react";

const TripActionsContext = createContext({
  actions: null,
  setActions: () => {},
});

export function TripActionsProvider({ children }) {
  const [actions, setActions] = useState(null);

  return (
    <TripActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </TripActionsContext.Provider>
  );
}

export function useTripActions() {
  return useContext(TripActionsContext);
}
```

### frontend/src/index.css

```
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap");
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ============================================================
   ROOT
   ============================================================ */
:root {
  color-scheme: light;
}

html, body, #root {
  background-color: #ffffff;
  color: #0a0a0a;
  font-family: "Poppins", system-ui, sans-serif;
}

/* ============================================================
   ANIMATIONS
   ============================================================ */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up { animation: fadeInUp 0.5s ease-out both; }
.animate-fade-in    { animation: fadeInUp 0.4s ease-out both; }

.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
.delay-300 { animation-delay: 0.3s; }
.delay-400 { animation-delay: 0.4s; }
.delay-500 { animation-delay: 0.5s; }

.card-hover { transition: transform 0.3s ease, box-shadow 0.3s ease; }
.card-hover:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08); }

.img-zoom { transition: transform 0.5s ease; }
.group:hover .img-zoom { transform: scale(1.05); }

.btn-press { transition: transform 0.15s ease, background-color 0.2s ease; }
.btn-press:active { transform: scale(0.97); }

@keyframes bounceDot {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40% { transform: translateY(-4px); opacity: 1; }
}
.dot-bounce { animation: bounceDot 1.2s infinite ease-in-out; }
.dot-bounce:nth-child(2) { animation-delay: 0.15s; }
.dot-bounce:nth-child(3) { animation-delay: 0.3s; }

::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #f3f4f6; }
::-webkit-scrollbar-thumb { background: #A8D84A; border-radius: 4px; }

/* ============================================================
   DELETE BUTTON
   ============================================================ */
@layer components {
  .eat-btn {
    --btn-bg: #f5f5f5;
    --btn-bg-dark: #e5e5e5;
    --btn-fg: #0a0a0a;
    --cycle: 2.6s;
    --ltr-stagger: 0.09s;
    --ltr-dur: 1.6s;
    --ltr-start: 0.3s;

    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px 8px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 9999px;
    background-image: linear-gradient(180deg, var(--btn-bg) 0%, var(--btn-bg-dark) 100%);
    color: var(--btn-fg);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    overflow: hidden;
    isolation: isolate;
    outline: none;
    transition: color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
  }
  .eat-btn:hover {
    color: #dc2626;
    border-color: #dc2626;
  }
  .eat-btn:active { transform: translateY(1px); }
  .eat-btn:focus-visible { outline: 2px solid #A8D84A; outline-offset: 3px; }

  .eat-btn__bin {
    position: relative;
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
    z-index: 3;
  }
  .eat-btn__bin svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .bin__body { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .bin__lid {
    transform-box: fill-box;
    transform-origin: 8% 92%;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .eat-btn__sparks { position: absolute; left: 50%; top: 40%; width: 0; height: 0; pointer-events: none; z-index: 4; }
  .eat-btn__spark {
    position: absolute;
    left: 0;
    top: 0;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #A8D84A;
    opacity: 0;
    transform: translate(-50%, -50%) scale(0);
    will-change: transform, opacity;
  }
  .eat-btn__spark:nth-child(2n) { background: #0a0a0a; }
  .eat-btn__spark:nth-child(3n) { background: #ffffff; }

  .eat-btn__label { display: inline-flex; align-items: center; z-index: 1; white-space: nowrap; pointer-events: none; color: inherit; }
  .eat-btn__ltr { display: inline-block; }

  .eat-btn.eating .eat-btn__bin { animation: binSquash var(--cycle) cubic-bezier(0.65, 0, 0.35, 1) forwards; }
  @keyframes binSquash {
    0%,  62% { transform: scale(1, 1); }
    67%      { transform: scale(1.12, 0.85); }
    73%      { transform: scale(0.96, 1.08); }
    79%      { transform: scale(1, 1); }
    100%     { transform: scale(1, 1); }
  }
  .eat-btn.eating .bin__lid { animation: lidMouth var(--cycle) cubic-bezier(0.65, 0, 0.35, 1) forwards; }
  @keyframes lidMouth {
    0%   { transform: rotate(0deg); }
    12%  { transform: rotate(-74deg); }
    58%  { transform: rotate(-74deg); }
    65%  { transform: rotate(8deg); }
    71%  { transform: rotate(-4deg); }
    78%  { transform: rotate(0deg); }
    100% { transform: rotate(0deg); }
  }
  .eat-btn.eating .eat-btn__ltr {
    animation: letterEat var(--ltr-dur) cubic-bezier(0.55, 0, 0.25, 1) forwards;
    animation-delay: calc(var(--ltr-start) + var(--i) * var(--ltr-stagger));
  }
  @keyframes letterEat {
    0%   { opacity: 1; transform: translate(0, 0) scale(1); }
    8%   { opacity: 1; transform: translate(0, 0) scale(1.06); }
    30%  { opacity: 0; transform: translate(var(--eat-x), var(--eat-y)) scale(0.1); }
    55%  { opacity: 0; transform: translate(var(--eat-x), var(--eat-y)) scale(0.1); }
    72%  { opacity: 1; transform: translate(0, 0) scale(1); }
    100% { opacity: 1; transform: translate(0, 0) scale(1); }
  }
  .eat-btn.eating .eat-btn__spark {
    animation: sparkFly 0.6s cubic-bezier(0.22, 0.9, 0.3, 1) forwards;
    animation-delay: calc(1.72s + var(--sd, 0s));
  }
  @keyframes sparkFly {
    0%   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    100% { opacity: 0; transform:
             translate(calc(-50% + var(--dx)), calc(-50% + var(--dy)))
             scale(0.2); }
  }
}

/* ============================================================
   PARACHUTE EXPORT PDF BUTTON — Lime Theme
   ============================================================ */
@layer components {
  .pdf-btn {
    --btn-lime-1: #B8E85A;
    --btn-lime-2: #A8D84A;
    --btn-lime-3: #8FBF2E;
    --btn-forest: #1A2E1A;

    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px 8px 12px;
    border: 0;
    border-radius: 9999px;
    background: transparent;
    color: var(--btn-forest);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    overflow: hidden;
    isolation: isolate;
    outline: none;
    transform: translateY(0);
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
    z-index: 5;
  }
  .pdf-btn:hover { transform: translateY(-1px); }
  .pdf-btn:active { transform: translateY(0); }

  .pdf-btn__skin {
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    background: linear-gradient(180deg, var(--btn-lime-1) 0%, var(--btn-lime-2) 46%, var(--btn-lime-3) 100%);
    box-shadow:
      0 0 0 1px rgba(168, 216, 74, 0.55),
      0 6px 20px -8px rgba(168, 216, 74, 0.8),
      0 4px 10px -6px rgba(0, 10, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.5),
      inset 0 -2px 5px rgba(0, 0, 0, 0.15);
    transition: box-shadow 0.35s ease, transform 0.16s cubic-bezier(0.45, 0, 0.55, 1), background 0.35s ease;
    z-index: 0;
  }
  .pdf-btn:hover .pdf-btn__skin {
    box-shadow:
      0 0 0 1px rgba(168, 216, 74, 0.75),
      0 10px 26px -6px rgba(168, 216, 74, 0.95),
      0 6px 14px -6px rgba(0, 10, 0, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      inset 0 -2px 5px rgba(0, 0, 0, 0.18);
  }
  .pdf-btn:focus-visible .pdf-btn__skin {
    box-shadow:
      0 0 0 3px rgba(168, 216, 74, 0.75),
      0 8px 22px -4px rgba(168, 216, 74, 0.9),
      inset 0 1px 0 rgba(255, 255, 255, 0.6);
  }
  .pdf-btn.pressing .pdf-btn__skin { transform: scaleY(0.955) translateY(2px); }

  .pdf-btn__icon-zone {
    position: relative;
    z-index: 2;
    flex: 0 0 16px;
    width: 16px;
    height: 18px;
    overflow: visible;
  }
  .pdf-btn__shockwave {
    position: absolute;
    left: 50%;
    bottom: -1px;
    width: 14px;
    height: 5px;
    margin-left: -7px;
    border-radius: 50%;
    border: 1.2px solid rgba(26, 46, 26, 0.7);
    box-shadow: 0 0 6px rgba(26, 46, 26, 0.6);
    opacity: 0;
    pointer-events: none;
    z-index: 1;
  }
  .pdf-btn__trail {
    position: absolute;
    left: 50%;
    top: 0;
    width: 2px;
    height: 0;
    margin-left: -1px;
    border-radius: 2px;
    background: linear-gradient(180deg, rgba(26, 46, 26, 0) 0%, rgba(26, 46, 26, 0.55) 40%, rgba(26, 46, 26, 0.25) 100%);
    filter: blur(1.2px);
    opacity: 0;
    pointer-events: none;
    z-index: 1;
  }
  .pdf-btn__payload {
    position: absolute;
    left: 50%;
    bottom: 1px;
    width: 14px;
    height: 17px;
    margin-left: -7px;
    overflow: visible;
    opacity: 0;
    transform: translateY(-32px);
    will-change: transform, opacity;
    transition: opacity 0.35s ease;
    z-index: 3;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2));
  }
  .pdf-btn .canopy-g {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    will-change: transform, opacity;
  }
  .pdf-btn .crate-g {
    transform-box: fill-box;
    transform-origin: 50% 100%;
    will-change: transform;
  }

  .pdf-btn__label-stack {
    position: relative;
    z-index: 2;
    width: 130px;
    height: 16px;
    overflow: visible;
  }
  .pdf-btn__lbl {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 600;
    transition: opacity 0.34s ease, transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .pdf-btn__lbl-default {
    opacity: 1;
    transform: translateY(0);
    color: var(--btn-forest);
  }
  .pdf-btn__lbl-done {
    opacity: 0;
    transform: translateY(6px);
    color: var(--btn-forest);
  }
  .pdf-btn.win .pdf-btn__lbl-default { opacity: 0; transform: translateY(-6px); }
  .pdf-btn.win .pdf-btn__lbl-done { opacity: 1; transform: translateY(0); }

  .pdf-btn__badge {
    position: relative;
    z-index: 2;
    flex: 0 0 14px;
    width: 14px;
    height: 14px;
    opacity: 0;
    transform: scale(0.3) rotate(-90deg);
    will-change: transform, opacity;
  }
  .pdf-btn__badge svg {
    display: block;
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 0 3px rgba(26, 46, 26, 0.4));
  }

  .pdf-btn.running .pdf-btn__skin { animation: pdfSkinPress 1.5s cubic-bezier(0.45, 0, 0.25, 1) both; }
  @keyframes pdfSkinPress {
    0%   { transform: scaleY(1) translateY(0); }
    4%   { transform: scaleY(0.955) translateY(2px); }
    55%  { transform: scaleY(0.965) translateY(1px); }
    72%  { transform: scaleY(1) translateY(0); }
    100% { transform: scaleY(1) translateY(0); }
  }
  .pdf-btn.running .pdf-btn__payload { animation: pdfPayloadDrop 1.5s cubic-bezier(0.35, 0.02, 0.55, 1) both; }
  @keyframes pdfPayloadDrop {
    0%, 7%   { opacity: 0; transform: translateY(-32px); }
    13%      { opacity: 1; transform: translateY(-28px); }
    52%      { transform: translateY(-6px); }
    58%      { transform: translateY(2px); }
    63%      { transform: translateY(-1px); }
    68%      { transform: translateY(0); }
    100%     { transform: translateY(0); opacity: 1; }
  }
  .pdf-btn.running .canopy-g { animation: pdfCanopyCollapse 1.5s linear both; }
  @keyframes pdfCanopyCollapse {
    0%, 56% { opacity: 1; transform: scale(1) translateY(0); }
    72%     { opacity: 0; transform: scale(0.3) translateY(4px); }
    100%    { opacity: 0; transform: scale(0.3) translateY(4px); }
  }
  .pdf-btn.running .crate-g { animation: pdfCrateSquash 1.5s cubic-bezier(0.3, 0, 0.4, 1) both; }
  @keyframes pdfCrateSquash {
    0%, 56% { transform: scale(1, 1); }
    60%     { transform: scale(1.16, 0.82); }
    68%     { transform: scale(0.95, 1.05); }
    76%     { transform: scale(1, 1); }
    100%    { transform: scale(1, 1); }
  }
  .pdf-btn.running .pdf-btn__trail { animation: pdfTrailGrow 1.5s linear both; }
  @keyframes pdfTrailGrow {
    0%, 10% { opacity: 0; height: 0; }
    22%     { opacity: 0.85; height: 28px; }
    48%     { opacity: 0.45; height: 12px; }
    58%     { opacity: 0; height: 0; }
    100%    { opacity: 0; height: 0; }
  }
  .pdf-btn.running .pdf-btn__shockwave { animation: pdfShockwave 1.5s linear both; }
  @keyframes pdfShockwave {
    0%, 56% { opacity: 0; transform: scale(0.2); }
    60%     { opacity: 0.95; transform: scale(0.75); }
    80%     { opacity: 0; transform: scale(2.3); }
    100%    { opacity: 0; transform: scale(2.3); }
  }
  .pdf-btn.running .pdf-btn__badge { animation: pdfBadgePop 1.5s cubic-bezier(0.22, 1.4, 0.36, 1) both; }
  @keyframes pdfBadgePop {
    0%, 64% { opacity: 0; transform: scale(0.3) rotate(-90deg); }
    74%     { opacity: 1; transform: scale(1.2) rotate(6deg); }
    82%     { opacity: 1; transform: scale(1) rotate(0deg); }
    100%    { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  .pdf-btn.win .pdf-btn__skin {
    background: linear-gradient(180deg, #C4E570 0%, #A8D84A 46%, #8FBF2E 100%);
    box-shadow:
      0 0 0 1px rgba(168, 216, 74, 0.85),
      0 8px 24px -4px rgba(168, 216, 74, 0.95),
      0 4px 10px -4px rgba(0, 10, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      inset 0 -2px 5px rgba(0, 0, 0, 0.2);
  }
}

/* ============================================================
   LIQUID CHAMBER RISE BUTTON — Lime Theme, No Sound
   ============================================================ */
@layer components {
  .liquid-btn {
    position: relative;
    isolation: isolate;
    display: inline-flex;
    width: 280px;
    height: 62px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    cursor: pointer;
    overflow: hidden;
    color: #1A2E1A;
    font: inherit;
    font-weight: 700;
    font-size: 15px;
    letter-spacing: 0.2px;
    -webkit-tap-highlight-color: transparent;
    background: linear-gradient(140deg, #B8E85A 0%, #A8D84A 44%, #8FBF2E 100%);
    box-shadow:
      0 0 0 1px rgba(168, 216, 74, 0.55),
      0 0 18px rgba(168, 216, 74, 0.45),
      0 0 46px rgba(168, 216, 74, 0.18),
      inset 0 1px 0 rgba(255, 255, 255, 0.5),
      0 16px 34px rgba(0, 0, 0, 0.15);
    transition: transform 0.25s ease, box-shadow 0.35s ease, opacity 0.3s ease;
  }
  .liquid-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow:
      0 0 0 1px rgba(196, 229, 112, 0.75),
      0 0 26px rgba(168, 216, 74, 0.65),
      0 0 70px rgba(168, 216, 74, 0.28),
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      0 20px 40px rgba(0, 0, 0, 0.2);
  }
  .liquid-btn:active:not(:disabled) {
    transform: translateY(0) scale(0.985);
  }
  .liquid-btn:focus-visible {
    outline: 2px solid #A8D84A;
    outline-offset: 4px;
  }
  .liquid-btn:disabled {
    cursor: not-allowed;
    opacity: 0.55;
    filter: grayscale(0.35);
  }

  .liquid-btn__liquid {
    position: absolute;
    left: -25%;
    width: 150%;
    top: 85%;
    height: 200%;
    z-index: 1;
    pointer-events: none;
    transition: top 1.5s cubic-bezier(0.34, 1.2, 0.4, 1);
    will-change: top;
  }
  .liquid-btn.is-loading .liquid-btn__liquid {
    top: -100%;
  }
  .liquid-btn.is-complete .liquid-btn__liquid {
    top: -100%;
    transition: top 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .liquid-btn.is-resetting .liquid-btn__liquid {
    transition: top 0.7s cubic-bezier(0.45, 0, 0.6, 1);
  }

  .liquid-btn__liquid::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(229, 240, 200, 0.60) 0%,
      rgba(196, 229, 112, 0.68) 12%,
      rgba(143, 191, 46, 0.80) 38%,
      rgba(26, 46, 26, 0.92) 100%
    );
    transition: background 0.6s ease;
  }
  .liquid-btn.is-complete .liquid-btn__liquid::after {
    background: linear-gradient(
      180deg,
      rgba(229, 240, 200, 0.60) 0%,
      rgba(196, 229, 112, 0.68) 14%,
      rgba(143, 191, 46, 0.78) 42%,
      rgba(10, 10, 10, 0.92) 100%
    );
  }

  .liquid-btn__wave {
    position: absolute;
    top: -14px;
    left: 0;
    width: 200%;
    height: 28px;
    display: block;
    will-change: transform;
  }
  .liquid-btn__wave svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  .liquid-btn__wave--a {
    animation: liquidWaveLeft 7s linear infinite;
    opacity: 0.75;
  }
  .liquid-btn__wave--b {
    animation: liquidWaveRight 5.2s linear infinite;
    opacity: 0.85;
    top: -10px;
    height: 24px;
  }
  .liquid-btn.is-loading .liquid-btn__wave--a {
    animation-duration: 3.2s;
  }
  .liquid-btn.is-loading .liquid-btn__wave--b {
    animation-duration: 2.4s;
  }
  .liquid-btn.is-complete .liquid-btn__wave--a,
  .liquid-btn.is-complete .liquid-btn__wave--b {
    animation-duration: 9s;
    opacity: 0.5;
  }
  @keyframes liquidWaveLeft {
    from { transform: translate3d(0, 0, 0); }
    to   { transform: translate3d(-50%, 0, 0); }
  }
  @keyframes liquidWaveRight {
    from { transform: translate3d(-50%, 0, 0); }
    to   { transform: translate3d(0, 0, 0); }
  }

  .liquid-btn__particles {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    overflow: hidden;
    border-radius: inherit;
  }
  .liquid-btn__bubble,
  .liquid-btn__spark {
    position: absolute;
    bottom: -14px;
    opacity: 0;
    animation-name: liquidRise;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
  }
  .liquid-btn__bubble {
    border-radius: 50%;
    background: radial-gradient(
      circle at 32% 30%,
      #ffffff 0%,
      rgba(229, 240, 200, 0.85) 45%,
      rgba(168, 216, 74, 0.35) 100%
    );
    box-shadow: 0 0 8px rgba(196, 229, 112, 0.65);
  }
  .liquid-btn__spark {
    border-radius: 1px;
    background: #f4fbdd;
    box-shadow: 0 0 10px rgba(196, 229, 112, 0.95), 0 0 20px rgba(168, 216, 74, 0.55);
  }
  @keyframes liquidRise {
    0%   { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
    12%  { opacity: 1; }
    80%  { opacity: 0.9; }
    100% { transform: translate3d(var(--dx, 0px), -90px, 0) rotate(190deg); opacity: 0; }
  }

  .liquid-btn__flash {
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    opacity: 0;
    border-radius: inherit;
    background:
      radial-gradient(circle at 50% 118%, rgba(168, 216, 74, 0.95) 0%, rgba(143, 191, 46, 0.45) 42%, rgba(143, 191, 46, 0) 72%),
      radial-gradient(circle at 50% 50%, rgba(229, 240, 200, 0.35) 0%, rgba(229, 240, 200, 0) 70%);
  }
  .liquid-btn.is-complete .liquid-btn__flash {
    animation: liquidFlash 0.95s ease-out;
  }
  @keyframes liquidFlash {
    0%   { opacity: 0; }
    22%  { opacity: 1; }
    100% { opacity: 0; }
  }

  .liquid-btn__content {
    position: relative;
    z-index: 5;
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 0 22px;
    text-shadow: 0 1px 10px rgba(26, 46, 26, 0.35);
    transition: color 0.4s ease;
  }
  .liquid-btn.is-loading .liquid-btn__content {
    color: #1A2E1A;
  }
  .liquid-btn.is-complete .liquid-btn__content {
    color: #E5F0C8;
  }

  .liquid-btn__icon-wrap {
    position: relative;
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
  }
  .liquid-btn__ic {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transition: opacity 0.4s ease, transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .liquid-btn__ic--compass {
    opacity: 1;
    transform: none;
  }
  .liquid-btn__ic--check {
    opacity: 0;
    transform: scale(0.35) rotate(-50deg);
  }
  .liquid-btn.is-complete .liquid-btn__ic--compass {
    opacity: 0;
    transform: scale(0.35) rotate(130deg);
  }
  .liquid-btn.is-complete .liquid-btn__ic--check {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
  .liquid-btn__check-path {
    stroke-dasharray: 24;
    stroke-dashoffset: 24;
  }
  .liquid-btn.is-complete .liquid-btn__check-path {
    animation: liquidDraw 0.55s cubic-bezier(0.65, 0, 0.35, 1) 0.12s forwards;
  }
  @keyframes liquidDraw {
    to { stroke-dashoffset: 0; }
  }

  .liquid-btn__label-stack {
    position: relative;
    display: inline-grid;
    place-items: center;
  }
  .liquid-btn__label {
    grid-area: 1/1;
    white-space: nowrap;
    transition: opacity 0.35s ease, transform 0.35s ease;
  }
  .liquid-btn__label--idle {
    opacity: 1;
    transform: none;
  }
  .liquid-btn__label--loading,
  .liquid-btn__label--done {
    opacity: 0;
    transform: translateY(9px);
  }

  .liquid-btn.is-loading .liquid-btn__label--idle {
    opacity: 0;
    transform: translateY(-9px);
  }
  .liquid-btn.is-loading .liquid-btn__label--loading {
    opacity: 1;
    transform: translateY(0);
  }

  .liquid-btn.is-complete .liquid-btn__label--idle {
    opacity: 0;
    transform: translateY(-9px);
  }
  .liquid-btn.is-complete .liquid-btn__label--loading {
    opacity: 0;
    transform: translateY(-9px);
  }
  .liquid-btn.is-complete .liquid-btn__label--done {
    opacity: 1;
    transform: translateY(0);
  }

  .liquid-btn__dots {
    display: inline-flex;
    gap: 4px;
    margin-left: 6px;
    vertical-align: middle;
  }
  .liquid-btn__dots i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #1A2E1A;
    box-shadow: 0 0 8px rgba(26, 46, 26, 0.5);
    animation: liquidPulse 1.05s ease-in-out infinite;
  }
  .liquid-btn__dots i:nth-child(2) { animation-delay: 0.16s; }
  .liquid-btn__dots i:nth-child(3) { animation-delay: 0.32s; }
  @keyframes liquidPulse {
    0%, 100% { transform: scale(0.55); opacity: 0.35; }
    50%      { transform: scale(1);    opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .liquid-btn { transition: box-shadow 0.2s ease; }
    .liquid-btn:hover:not(:disabled) { transform: none; }
    .liquid-btn:active:not(:disabled) { transform: none; }
    .liquid-btn__liquid { transition: top 0.25s linear; }
    .liquid-btn__wave--a,
    .liquid-btn__wave--b { animation: none; }
    .liquid-btn__bubble,
    .liquid-btn__spark { animation: none; opacity: 0; }
    .liquid-btn.is-complete .liquid-btn__flash { animation: none; opacity: 0; }
    .liquid-btn__dots i { animation: none; opacity: 0.85; transform: scale(1); }
    .liquid-btn__check-path { stroke-dasharray: none; stroke-dashoffset: 0; }
    .liquid-btn.is-complete .liquid-btn__check-path { animation: none; }
  }
}

/* ============================================================
   LOADING SKELETONS
   ============================================================ */
@keyframes skeleton-shimmer {
  0%   { background-position: -500px 0; }
  100% { background-position: 500px 0; }
}
.skeleton {
  display: block;
  background-color: #1a1a1a;
  background-image: linear-gradient(90deg, #1a1a1a 0%, #262626 40%, #1a1a1a 80%);
  background-size: 500px 100%;
  background-repeat: no-repeat;
  animation: skeleton-shimmer 1.6s infinite linear;
  border-radius: 8px;
}
.skeleton-text   { height: 14px; }
.skeleton-img    { border-radius: 16px; }
.skeleton-circle { border-radius: 50%; }

/* ============================================================
   ITINERARY PAPER (for PDF export) — html2canvas safe
   ============================================================ */
@layer components {
  .itn-paper {
    width: 210mm;
    min-height: 297mm;
    padding: 16mm 14mm 12mm;
    background: #ffffff;
    color: #0a0a0a;
    font-size: 13px;
    line-height: 1.55;
    font-family: "Poppins", system-ui, sans-serif;
    box-sizing: border-box;
  }

  .itn-header {
    display: block;
    padding: 20px 22px 18px;
    border-radius: 12px;
    border-left: 6px solid #A8D84A;
    background: #f7fbe9;
    margin-bottom: 18px;
  }
  .itn-eyebrow {
    display: inline-block;
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #0a0a0a;
    margin-bottom: 8px;
    padding-left: 26px;
    position: relative;
  }
  .itn-eyebrow::before {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 2px;
    background: #A8D84A;
  }
  .itn-title {
    display: block;
    margin: 0 0 6px 0;
    font-size: 26px;
    font-weight: 800;
    line-height: 1.15;
    color: #0a0a0a;
  }
  .itn-dest {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 14px 0;
    font-size: 14px;
    font-weight: 600;
    color: #0a0a0a;
  }
  .itn-dest svg {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    color: #A8D84A;
  }
  .itn-dates {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 999px;
    background: #A8D84A;
    color: #0a0a0a;
    font-size: 12px;
    font-weight: 700;
  }
  .itn-dates .dot {
    display: inline-block;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #0a0a0a;
    vertical-align: middle;
    margin: 0 8px;
  }
  .itn-dates span {
    display: inline;
    vertical-align: middle;
  }

  .itn-summary {
    display: table;
    width: 100%;
    table-layout: fixed;
    border-spacing: 10px 0;
    margin-bottom: 22px;
  }
  .itn-metric {
    display: table-cell;
    width: 33.33%;
    vertical-align: top;
    padding: 12px 14px;
    border-radius: 9px;
    border: 2px solid #0a0a0a;
    background: #ffffff;
    box-sizing: border-box;
  }
  .itn-metric .m-label {
    display: block;
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #0a0a0a;
    line-height: 1.2;
    margin: 0 0 6px 0;
  }
  .itn-metric .m-value {
    display: block;
    font-size: 17px;
    font-weight: 800;
    line-height: 1.2;
    color: #0a0a0a;
    margin: 0;
  }
  .itn-metric .m-value small {
    font-size: 11px;
    font-weight: 600;
    color: #0a0a0a;
  }
  .itn-metric.m-budget {
    border-color: #A8D84A;
  }
  .itn-metric.m-travellers {
    border-color: #0a0a0a;
  }

  .itn-section-head {
    display: block;
    margin: 26px 0 14px 0;
    padding-bottom: 6px;
    border-bottom: 1.5px solid #A8D84A;
  }
  .itn-section-head h2 {
    display: inline-block;
    margin: 0;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.19em;
    text-transform: uppercase;
    color: #0a0a0a;
  }

  .itn-day {
    display: block;
    margin-bottom: 16px;
    border-radius: 10px;
    border: 2px solid #0a0a0a;
    background: #fff;
    overflow: hidden;
  }
  .itn-day-head {
    display: block;
    padding: 0;
    background: #A8D84A;
    border-bottom: 2px solid #0a0a0a;
    line-height: 0;
    font-size: 0;
  }
  .itn-day-num {
    display: inline-block;
    width: 34px;
    height: 34px;
    line-height: 34px;
    text-align: center;
    margin: 10px 12px 10px 14px;
    border-radius: 8px;
    background: #0a0a0a;
    color: #ffffff;
    font-size: 13px;
    font-weight: 800;
    vertical-align: middle;
  }
  .itn-day-name {
    display: inline-block;
    font-size: 13px;
    font-weight: 800;
    line-height: 34px;
    color: #0a0a0a;
    vertical-align: middle;
  }

  .itn-day-date {
    float: right;
    margin: 15px 16px 0 0;
    padding: 4px 10px;
    border-radius: 999px;
    background: #0a0a0a;
    color: #ffffff;
    font-size: 10.5px;
    font-weight: 800;
    line-height: 1.2;
  }

  .itn-table {
    display: table;
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
  }
  .itn-table thead th {
    padding: 8px 12px;
    text-align: left;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #0a0a0a;
    background: #f5f5f5;
    border-bottom: 2px solid #0a0a0a;
    vertical-align: middle;
  }
  .itn-table tbody tr {
    border-bottom: 1px solid #e5e5e5;
  }
  .itn-table tbody td {
    padding: 10px 12px;
    color: #0a0a0a;
    vertical-align: top;
  }
  .itn-col-time {
    width: 90px;
    white-space: nowrap;
  }
  .itn-col-cost {
    width: 100px;
    text-align: right;
    white-space: nowrap;
  }
  .itn-time-chip {
    display: inline-block;
    font-size: 10.5px;
    font-weight: 800;
    color: #0a0a0a;
    padding: 3px 8px;
    border-radius: 5px;
    background: #A8D84A;
    white-space: nowrap;
  }
  .itn-act-title {
    display: block;
    font-size: 12px;
    font-weight: 700;
    color: #0a0a0a;
    line-height: 1.35;
    margin-bottom: 2px;
  }
  .itn-act-desc {
    display: block;
    font-size: 11px;
    color: #0a0a0a;
    opacity: 0.75;
    line-height: 1.5;
  }
  .itn-venue {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: #0a0a0a;
    margin-top: 3px;
  }
  .itn-venue svg {
    width: 11px;
    height: 11px;
    color: #A8D84A;
    vertical-align: middle;
    margin-right: 3px;
  }
  .itn-venue span {
    vertical-align: middle;
  }
  .itn-cost-val {
    display: block;
    font-size: 11.5px;
    font-weight: 800;
    color: #0a0a0a;
  }
  .itn-cost-val.free {
    color: #0a0a0a;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .itn-hotel-grid {
    display: table;
    width: 100%;
    table-layout: fixed;
    border-spacing: 10px 10px;
    margin-top: 8px;
  }
  .itn-hotel {
    display: table-cell;
    width: 50%;
    vertical-align: top;
    border: 2px solid #0a0a0a;
    border-radius: 9px;
    padding: 10px 12px;
    background: #fff;
    box-sizing: border-box;
  }
  .itn-hotel-name {
    display: block;
    font-weight: 800;
    font-size: 12px;
    color: #0a0a0a;
    margin-bottom: 3px;
  }
  .itn-hotel-row {
    display: block;
    font-size: 11px;
    color: #0a0a0a;
    opacity: 0.75;
    margin-top: 3px;
    line-height: 1.4;
  }

  .itn-foot {
    display: block;
    margin-top: 26px;
    padding-top: 12px;
    border-top: 2px solid #0a0a0a;
    font-size: 10px;
    color: #0a0a0a;
  }
  .itn-foot .f-left {
    display: block;
    font-weight: 700;
    margin-bottom: 3px;
  }
  .itn-foot .f-left span {
    color: #A8D84A;
    font-weight: 800;
  }
  .itn-foot .f-mid {
    display: block;
    margin-bottom: 3px;
  }
  .itn-foot .f-right {
    display: block;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }
}

/* ============================================================
   HOLDER for the printable itinerary
   ============================================================ */
.itn-paper-holder {
  position: fixed;
  top: 0;
  left: 0;
  width: 210mm;
  height: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: -1;
}

.itn-paper-holder.is-exporting {
  height: auto;
  overflow: visible;
}

@media print {
  .itn-paper-holder {
    position: static;
    width: auto;
    height: auto;
    overflow: visible;
    pointer-events: auto;
    z-index: auto;
  }
}

/* ============================================================
   WEATHER SLIDER — DARK
   ============================================================ */

.ws-wrapper { position: relative; }

.ws-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.ws-brand-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #a3e635;
  background: rgba(163, 230, 53, 0.12);
  border: 1px solid rgba(163, 230, 53, 0.3);
  padding: 4px 12px;
  border-radius: 9999px;
  width: fit-content;
}

.ws-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #a3e635;
  box-shadow: 0 0 10px #a3e635;
  animation: wsPulseDot 1.5s infinite;
}
@keyframes wsPulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.4; transform: scale(0.8); }
}

.ws-title {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #ffffff;
  margin: 6px 0 2px;
}
.ws-title span { color: #a3e635; }

.ws-subtitle { font-size: 13px; color: #888888; }

.ws-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ws-btn {
  background: #111111;
  color: #888888;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 14px;
  border-radius: 14px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.ws-btn:hover {
  background: rgba(163, 230, 53, 0.12);
  color: #a3e635;
  border-color: rgba(163, 230, 53, 0.4);
  transform: translateY(-2px);
}
.ws-btn.active {
  background: #a3e635;
  color: #000000;
  border-color: #a3e635;
  box-shadow: 0 0 15px rgba(163, 230, 53, 0.5);
}

.ws-nav-arrows {
  display: flex;
  align-items: center;
  background: #111111;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 3px;
  gap: 3px;
}
.ws-arrow-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: #888888;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-family: inherit;
  transition: all 0.15s;
}
.ws-arrow-btn:hover {
  background: #a3e635;
  color: #000000;
}

.ws-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.ws-chip {
  background: #111111;
  color: #888888;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.ws-chip:hover {
  color: #ffffff;
  border-color: rgba(163, 230, 53, 0.4);
}
.ws-chip.active {
  background: #a3e635;
  color: #000000;
  border-color: #a3e635;
  box-shadow: 0 0 15px rgba(163, 230, 53, 0.4);
}

.ws-track-wrapper { position: relative; margin-bottom: 16px; }
.ws-edge-left,
.ws-edge-right {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 36px;
  pointer-events: none;
  z-index: 5;
}
.ws-edge-left  { left: 0;  background: linear-gradient(to right, rgba(5, 5, 5, 0.95), transparent); }
.ws-edge-right { right: 0; background: linear-gradient(to left,  rgba(5, 5, 5, 0.95), transparent); }

.ws-track {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  padding: 12px 6px 20px 6px;
  cursor: grab;
  user-select: none;
}
.ws-track:active { cursor: grabbing; }
.ws-track::-webkit-scrollbar { display: none; }

/* ═══════════════ CARDS ═══════════════ */
.ws-card {
  flex: 0 0 148px;
  scroll-snap-align: start;
  background: #111111;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 22px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  position: relative;
  transition:
    transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.25s,
    box-shadow 0.25s,
    background 0.25s;
  will-change: transform;
}
.ws-card:hover {
  background: #181818;
  border-color: rgba(163, 230, 53, 0.5);
  transform: translateY(-8px) scale(1.03);
  box-shadow: 0 16px 30px -10px rgba(0, 0, 0, 0.9), 0 0 25px rgba(163, 230, 53, 0.3);
}
.ws-card.active {
  background: #000000;
  border-color: #a3e635;
  border-width: 2px;
  transform: translateY(-10px) scale(1.05);
  box-shadow:
    0 20px 40px -10px rgba(0, 0, 0, 0.9),
    0 0 35px rgba(163, 230, 53, 0.5);
}

.ws-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.ws-card-day {
  font-size: 12px;
  font-weight: 800;
  color: #ffffff;
}
.ws-card-badge {
  font-size: 9.5px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ws-badge-live {
  background: #a3e635;
  color: #1A2E1A;
  box-shadow: 0 0 10px rgba(163, 230, 53, 0.5);
}
.ws-badge-climate {
  background: rgba(255, 255, 255, 0.08);
  color: #888888;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.ws-card-icon-area { text-align: center; margin: 8px 0; }
.ws-card-icon {
  font-size: 34px;
  display: inline-block;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ws-card:hover .ws-card-icon { transform: scale(1.2) rotate(6deg); }

.ws-card-date {
  font-size: 11px;
  color: #888888;
  margin-top: 3px;
  font-weight: 600;
}

.ws-card-stats {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 9px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ws-temp-high { font-size: 13px; font-weight: 900; color: #ffffff; }
.ws-temp-low  { font-size: 11px; color: #52525b; margin-left: 3px; }

.ws-rain-stat {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
}
.ws-rain-safe    { color: #a3e635; background: rgba(163, 230, 53, 0.12); }
.ws-rain-warning { color: #60a5fa; background: rgba(96, 165, 250, 0.12); }

.ws-plan-b {
  margin-top: 8px;
  background: #000000;
  color: #a3e635;
  font-size: 10px;
  font-weight: 800;
  padding: 4px 6px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 0 10px rgba(163, 230, 53, 0.2);
}

/* ═══════════════ PROGRESS BAR ═══════════════ */
.ws-progress {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 22px;
}
.ws-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #a3e635, #bef264);
  box-shadow: 0 0 15px #a3e635;
  border-radius: 9999px;
  transition: width 0.15s ease-out;
}

/* ═══════════════ INSPECTOR PANEL ═══════════════ */
.ws-inspector {
  background: #0b0b0b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 22px;
  padding: 20px 24px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-shadow: 0 15px 35px -10px rgba(0, 0, 0, 0.9);
}
.ws-inspector-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1 1 auto;
  min-width: 0;
}
.ws-inspector-icon {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  background: #000000;
  border: 1px solid #a3e635;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  box-shadow: 0 0 20px rgba(163, 230, 53, 0.25);
  flex-shrink: 0;
}
.ws-inspector-info { min-width: 0; }
.ws-inspector-title {
  font-size: 17px;
  font-weight: 900;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.ws-inspector-risk {
  font-size: 11px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 9999px;
  background: #a3e635;
  color: #1A2E1A;
  box-shadow: 0 0 12px rgba(163, 230, 53, 0.5);
}
.ws-inspector-risk.rainy {
  background: #60a5fa;
  color: #000000;
  box-shadow: 0 0 12px rgba(96, 165, 250, 0.5);
}
.ws-inspector-sub {
  font-size: 12.5px;
  color: #888888;
  margin-top: 4px;
}
.ws-inspector-ai {
  background: #000000;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 12.5px;
  color: #ffffff;
  max-width: 460px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  line-height: 1.5;
  flex: 1 1 340px;
}
.ws-ai-badge {
  color: #1A2E1A;
  background: #a3e635;
  font-size: 10px;
  font-weight: 900;
  padding: 2px 7px;
  border-radius: 6px;
  white-space: nowrap;
  text-transform: uppercase;
  flex-shrink: 0;
}

/* ═══════════════ RESPONSIVE ═══════════════ */
@media (max-width: 768px) {
  .ws-card { flex: 0 0 132px; }
  .ws-inspector { flex-direction: column; align-items: flex-start; }
  .ws-title { font-size: 19px; }
}

@media (prefers-reduced-motion: reduce) {
  .ws-card, .ws-btn, .ws-chip, .ws-card-icon { transition: none; }
  .ws-card:hover, .ws-card.active { transform: none; }
  .ws-pulse-dot { animation: none; }
}

/* ============================================================
   SKY FLIGHT BUTTON — Lime Theme, No Sound, Compact
   ============================================================ */
.sky-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 54px;
  min-width: 280px;
  padding: 0 24px;
  border: 1px solid rgba(168, 216, 74, 0.6);
  border-radius: 9999px;
  background: #1A2E1A;
  color: #E5F0C8;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.01em;
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  -webkit-tap-highlight-color: transparent;
  box-shadow:
    0 0 0 1px rgba(168, 216, 74, 0.15),
    0 0 20px -6px rgba(168, 216, 74, 0.55),
    0 14px 28px -16px rgba(26, 46, 26, 0.8),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  transition: transform 0.18s ease, box-shadow 0.35s ease, border-color 0.35s ease;
}
.sky-btn:hover:not(:disabled) {
  border-color: rgba(196, 229, 112, 0.9);
  transform: translateY(-1px);
  box-shadow:
    0 0 0 1px rgba(168, 216, 74, 0.3),
    0 0 32px -4px rgba(168, 216, 74, 0.85),
    0 18px 34px -16px rgba(26, 46, 26, 1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
.sky-btn:active:not(:disabled) { transform: translateY(0) scale(0.985); }
.sky-btn:focus-visible { outline: 2px solid #A8D84A; outline-offset: 3px; }
.sky-btn:disabled { cursor: not-allowed; }
.sky-btn.is-complete { border-color: rgba(196, 229, 112, 0.85); }

.sky-btn__sky {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: linear-gradient(160deg, #1f3a1f 0%, #14261a 55%, #0a1208 100%);
  transition: filter 0.9s ease;
}
.sky-btn.is-loading .sky-btn__sky { filter: brightness(1.35) saturate(1.2); }

.sky-btn__tint {
  position: absolute;
  inset: 0;
  background: linear-gradient(160deg, rgba(168, 216, 74, 0.5) 0%, rgba(143, 191, 46, 0.55) 100%);
  opacity: 0;
  transition: opacity 0.7s ease;
}
.sky-btn.is-complete .sky-btn__tint { opacity: 1; }

.sky-btn__stars {
  position: absolute;
  inset: 0;
  opacity: 0.7;
  animation: skyBtnTwinkle 4.5s ease-in-out infinite;
  background-image:
    radial-gradient(1px 1px at 8% 24%, rgba(229, 240, 200, 0.95), transparent),
    radial-gradient(1px 1px at 18% 72%, rgba(229, 240, 200, 0.7), transparent),
    radial-gradient(1.2px 1.2px at 31% 38%, rgba(229, 240, 200, 0.85), transparent),
    radial-gradient(1px 1px at 44% 15%, rgba(229, 240, 200, 0.6), transparent),
    radial-gradient(1px 1px at 57% 80%, rgba(229, 240, 200, 0.8), transparent),
    radial-gradient(1.3px 1.3px at 68% 30%, rgba(229, 240, 200, 0.9), transparent),
    radial-gradient(1px 1px at 79% 62%, rgba(229, 240, 200, 0.65), transparent),
    radial-gradient(1px 1px at 88% 18%, rgba(229, 240, 200, 0.8), transparent),
    radial-gradient(1px 1px at 94% 76%, rgba(229, 240, 200, 0.55), transparent),
    radial-gradient(1px 1px at 13% 90%, rgba(229, 240, 200, 0.7), transparent);
}
@keyframes skyBtnTwinkle {
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 0.9; }
}

.sky-btn__cloud {
  position: absolute;
  left: 0;
  border-radius: 999px;
  pointer-events: none;
  background: radial-gradient(
    ellipse at center,
    rgba(229, 240, 200, 0.55) 0%,
    rgba(229, 240, 200, 0.2) 48%,
    rgba(229, 240, 200, 0) 74%
  );
  filter: blur(2px);
  animation-name: skyBtnCloudDrift;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform;
}
.sky-btn__cloud.c1 { top: 10%; width: 64px; height: 14px; animation-duration: 15s; animation-delay: -2s;  opacity: 0.7; }
.sky-btn__cloud.c2 { top: 58%; width: 84px; height: 16px; animation-duration: 19s; animation-delay: -8s;  opacity: 0.6; }
.sky-btn__cloud.c3 { top: 32%; width: 48px; height: 10px; animation-duration: 24s; animation-delay: -14s; opacity: 0.5; }
@keyframes skyBtnCloudDrift {
  from { transform: translateX(-140px); }
  to   { transform: translateX(340px); }
}

.sky-btn__flyer {
  position: absolute;
  top: 50%;
  left: -48px;
  width: 26px;
  height: 26px;
  margin-top: -13px;
  z-index: 2;
  opacity: 0;
  pointer-events: none;
  color: #E5F0C8;
}
.sky-btn.is-loading .sky-btn__flyer {
  animation: skyBtnFly 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
@keyframes skyBtnFly {
  0%   { left: -48px;              opacity: 0; }
  12%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { left: calc(100% + 20px);  opacity: 0; }
}

.sky-btn__flyer-svg {
  width: 100%;
  height: 100%;
  transform: rotate(90deg);
  filter: drop-shadow(0 0 8px rgba(168, 216, 74, 0.95));
}

.sky-btn__trail {
  position: absolute;
  right: 100%;
  top: 50%;
  width: 56px;
  height: 2.5px;
  margin-top: -1.25px;
  margin-right: 5px;
  border-radius: 3px;
  transform-origin: right center;
  background: linear-gradient(
    90deg,
    rgba(229, 240, 200, 0) 0%,
    rgba(229, 240, 200, 0.4) 50%,
    rgba(229, 240, 200, 0.9) 100%
  );
  animation: skyBtnTrailPuff 1s ease-out infinite;
}
@keyframes skyBtnTrailPuff {
  0%   { transform: scaleX(0);   opacity: 0; }
  25%  { opacity: 1; }
  100% { transform: scaleX(1);   opacity: 0; }
}

.sky-btn__streak {
  position: absolute;
  right: 100%;
  height: 1.5px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(229, 240, 200, 0), rgba(229, 240, 200, 0.85));
  animation: skyBtnStreak 0.9s linear infinite;
}
.sky-btn__streak.s1 { top: 30%; width: 22px; margin-right: 8px;  animation-delay: 0s;    }
.sky-btn__streak.s2 { top: 50%; width: 30px; margin-right: 5px;  animation-delay: 0.25s; }
.sky-btn__streak.s3 { top: 70%; width: 18px; margin-right: 10px; animation-delay: 0.5s;  }
@keyframes skyBtnStreak {
  0%   { transform: translateX(0)     scaleX(0.2); opacity: 0; }
  35%  { opacity: 1; }
  100% { transform: translateX(-32px) scaleX(1);   opacity: 0; }
}

.sky-btn__ripple {
  position: absolute;
  inset: -20%;
  z-index: 2;
  border-radius: 9999px;
  pointer-events: none;
  background: radial-gradient(
    circle at 50% 55%,
    rgba(196, 229, 112, 0.9),
    rgba(196, 229, 112, 0) 62%
  );
  animation: skyBtnRipple 0.95s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@keyframes skyBtnRipple {
  0%   { opacity: 0.95; transform: scale(0.25); }
  55%  { opacity: 0.55; }
  100% { opacity: 0;    transform: scale(1.35); }
}

.sky-btn__content {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
}

.sky-btn__icon {
  position: relative;
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
}
.sky-btn__icon svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform-origin: 50% 50%;
  transition: opacity 0.32s ease, transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}
.sky-btn__icon-plane {
  color: #C4E570;
  opacity: 1;
  transform: rotate(90deg);
  filter: drop-shadow(0 0 6px rgba(168, 216, 74, 0.8));
}
.sky-btn__icon-check {
  color: #E5F0C8;
  opacity: 0;
  transform: scale(0.4) rotate(-30deg);
}
.sky-btn.is-complete .sky-btn__icon-plane { opacity: 0; transform: rotate(90deg) scale(0.4); }
.sky-btn.is-complete .sky-btn__icon-check { opacity: 1; transform: none; }

.sky-btn.is-idle .sky-btn__icon-plane { animation: skyBtnIconBob 2.8s ease-in-out infinite; }
@keyframes skyBtnIconBob {
  0%, 100% { transform: rotate(90deg) translateY(0); }
  50%      { transform: rotate(90deg) translateY(-2px); }
}
.sky-btn.is-loading .sky-btn__icon-plane {
  animation: skyBtnIconFly 0.8s ease-in-out infinite;
}
@keyframes skyBtnIconFly {
  0%, 100% { transform: rotate(90deg) translateY(0)    scale(1); }
  50%      { transform: rotate(90deg) translateY(-2.5px) scale(1.08); }
}

.sky-btn__icon-check path {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
}
.sky-btn.is-complete .sky-btn__icon-check path {
  animation: skyBtnDraw 0.5s cubic-bezier(0.65, 0, 0.35, 1) 0.1s forwards;
}
@keyframes skyBtnDraw { to { stroke-dashoffset: 0; } }

.sky-btn__swap { display: grid; place-items: center; }
.sky-btn__swap > * { grid-area: 1 / 1; }

.sky-btn__label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px) scale(0.96);
  text-shadow: 0 1px 8px rgba(26, 46, 26, 0.6);
  transition:
    opacity 0.3s ease,
    transform 0.42s cubic-bezier(0.22, 1, 0.36, 1),
    visibility 0s linear 0.3s;
}
.sky-btn__label.is-active {
  opacity: 1;
  visibility: visible;
  transform: none;
  transition:
    opacity 0.3s ease 0.06s,
    transform 0.42s cubic-bezier(0.22, 1, 0.36, 1) 0.06s,
    visibility 0s;
}

.sky-btn__dots { display: inline-flex; gap: 3px; margin-left: 2px; }
.sky-btn__dots i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.3;
  animation: skyBtnDot 1.2s ease-in-out infinite;
}
.sky-btn__dots i:nth-child(2) { animation-delay: 0.15s; }
.sky-btn__dots i:nth-child(3) { animation-delay: 0.3s; }
@keyframes skyBtnDot {
  0%, 100% { opacity: 0.25; transform: translateY(0); }
  50%      { opacity: 1;    transform: translateY(-2px); }
}

@media (prefers-reduced-motion: reduce) {
  .sky-btn { transition: none; }
  .sky-btn:hover:not(:disabled) { transform: none; }
  .sky-btn__sky,
  .sky-btn__tint { transition-duration: 0.2s; }
  .sky-btn__stars,
  .sky-btn__cloud { animation: none; opacity: 0.35; }
  .sky-btn__flyer { display: none; }
  .sky-btn__icon-plane,
  .sky-btn.is-idle .sky-btn__icon-plane,
  .sky-btn.is-loading .sky-btn__icon-plane { animation: none; }
  .sky-btn__ripple { animation-duration: 0.3s; }
  .sky-btn__dots i { animation: none; opacity: 0.7; }
  .sky-btn__icon-check path { stroke-dashoffset: 0; }
  .sky-btn.is-complete .sky-btn__icon-check path { animation: none; }
}

/* ============================================================
   PRINT RULES
   ============================================================ */
@page { size: A4; margin: 10mm; }
@media print {
  html, body { background: #ffffff !important; }
  .no-print, nav, button, aside, .pdf-btn, .eat-btn, .liquid-btn, .skeleton { display: none !important; }
  .itn-paper-holder { position: static; width: auto; height: auto; overflow: visible; }
  .itn-paper { width: auto; min-height: 0; margin: 0; padding: 0; }
}
```

### frontend/src/lib/utils.js

```
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

### frontend/src/main.jsx

```
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { TripActionsProvider } from "./context/TripActionsContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <TripActionsProvider>
            <App />
          </TripActionsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

### frontend/src/pages/Auth.css

```
/* frontend/src/pages/Auth.css */

/* ═══════════════════════════════════════════════════════════
   ROOT CONTAINER
   ═══════════════════════════════════════════════════════════ */
.auth-root {
  --auth-bg: #050505;
  --auth-card: #0b0b0b;
  --auth-card-2: #111111;
  --auth-border: rgba(255, 255, 255, 0.1);
  --auth-muted: #888888;
  --auth-dim: #52525b;
  --auth-lime: #a3e635;
  --auth-lime-bright: #bef264;
  --auth-lime-dark: #84cc16;
  --auth-lime-glow: rgba(163, 230, 53, 0.4);
  --auth-lime-subtle: rgba(163, 230, 53, 0.12);
  --auth-red: #f87171;
  --auth-red-subtle: rgba(248, 113, 113, 0.12);
  --auth-red-border: rgba(248, 113, 113, 0.35);

  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  padding: 40px 20px;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--auth-bg);
  font-family: 'Poppins', system-ui, sans-serif;
  color: #fff;
  -webkit-font-smoothing: antialiased;
  line-height: 1.5;
}

.auth-root *,
.auth-root *::before,
.auth-root *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* ═══════════════════════════════════════════════════════════
   BACKGROUND
   ═══════════════════════════════════════════════════════════ */
.auth-cosmos {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background: #050505;
}

#auth-stars {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.auth-orb-1,
.auth-orb-2 {
  position: absolute;
  filter: blur(90px);
  pointer-events: none;
  z-index: 1;
}
.auth-orb-1 {
  top: -120px;
  left: 8%;
  width: 500px;
  height: 500px;
  background: radial-gradient(
    circle,
    rgba(163, 230, 53, 0.4) 0%,
    rgba(163, 230, 53, 0.05) 50%,
    transparent 75%
  );
  animation: authOrbFloat 10s ease-in-out infinite alternate;
}
.auth-orb-2 {
  bottom: -120px;
  right: 8%;
  width: 450px;
  height: 450px;
  background: radial-gradient(
    circle,
    rgba(96, 165, 250, 0.16) 0%,
    transparent 70%
  );
  animation: authOrbFloat 13s ease-in-out infinite alternate-reverse;
}
@keyframes authOrbFloat {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(40px, 40px) scale(1.15); }
}

.auth-aurora {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}
.auth-aurora svg {
  position: absolute;
  display: block;
  width: 100%;
  height: 100%;
}
.auth-aurora .auth-trail {
  fill: none;
  stroke-linecap: round;
  filter: blur(6px);
  opacity: 0.55;
}
.auth-aurora .auth-t1 {
  stroke: url(#authAuroraA);
  stroke-width: 5;
  animation: authAuroraPulse 12s ease-in-out infinite;
}
.auth-aurora .auth-t2 {
  stroke: url(#authAuroraB);
  stroke-width: 4;
  animation: authAuroraPulse 15s ease-in-out -3s infinite;
}
.auth-aurora .auth-t3 {
  stroke: url(#authAuroraC);
  stroke-width: 3;
  animation: authAuroraPulse 18s ease-in-out -6s infinite;
}
@keyframes authAuroraPulse {
  0%, 100% { opacity: 0.2; }
  50%      { opacity: 0.5; }
}

.auth-grid-overlay {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(163, 230, 53, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(163, 230, 53, 0.04) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse at center, #000 30%, transparent 78%);
  -webkit-mask-image: radial-gradient(ellipse at center, #000 30%, transparent 78%);
}

/* ═══════════════════════════════════════════════════════════
   KEYFRAMES
   ═══════════════════════════════════════════════════════════ */
@keyframes authCardIn {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.97);
    filter: blur(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}
@keyframes authBorderShift {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
@keyframes authSheen {
  0%, 55%   { left: -40%; }
  80%, 100% { left: 140%; }
}
@keyframes authBlink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}
@keyframes authFormSwap {
  0%   { opacity: 0; transform: translateX(14px); }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes authSuccessPop {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

/* ═══════════════════════════════════════════════════════════
   CARD
   ═══════════════════════════════════════════════════════════ */
.auth-card {
  position: relative;
  margin: auto;
  z-index: 2;
  width: 100%;
  max-width: 460px;
  padding: 32px 40px 32px;
  border-radius: 24px;
  background: linear-gradient(
    180deg,
    rgba(20, 20, 20, 0.85) 0%,
    rgba(11, 11, 11, 0.95) 100%
  );
  border: 1px solid var(--auth-border);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  box-shadow:
    0 0 0 1px rgba(163, 230, 53, 0.08) inset,
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    0 30px 80px rgba(0, 0, 0, 0.85),
    0 0 60px rgba(163, 230, 53, 0.15);
  overflow: visible;
  animation: authCardIn 0.9s cubic-bezier(0.2, 0.8, 0.25, 1) backwards;
  will-change: transform;
  transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.25, 1);
  flex-shrink: 0;
}

.auth-card::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(163, 230, 53, 0.55) 0%,
    rgba(163, 230, 53, 0.1) 25%,
    rgba(163, 230, 53, 0.7) 50%,
    rgba(163, 230, 53, 0.1) 75%,
    rgba(163, 230, 53, 0.55) 100%
  );
  background-size: 200% 100%;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  opacity: 0.85;
  pointer-events: none;
  animation: authBorderShift 9s linear infinite;
}

.auth-card::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: radial-gradient(
    90% 100% at 50% 0%,
    rgba(163, 230, 53, 0.12),
    transparent 70%
  );
  pointer-events: none;
  border-radius: 24px 24px 0 0;
}

/* ═══════════════════════════════════════════════════════════
   BRAND
   ═══════════════════════════════════════════════════════════ */
.auth-card-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
  position: relative;
  z-index: 1;
}
.auth-card-brand .auth-mark {
  width: 38px;
  height: 38px;
  flex: none;
  filter: drop-shadow(0 0 12px rgba(163, 230, 53, 0.7));
}
.auth-brand-name {
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: -0.005em;
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}
.auth-brand-name .auth-a {
  color: #fff;
}
.auth-brand-name .auth-b {
  color: var(--auth-lime);
  text-shadow: 0 0 20px var(--auth-lime-glow);
}
.auth-brand-tag {
  display: block;
  width: 100%;
  margin-top: 2px;
  font-family: 'Roboto Mono', 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.6rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--auth-dim);
}

/* ═══════════════════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════════════════ */
.auth-tabs {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 24px;
  z-index: 1;
}
.auth-glider {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  border-radius: 9px;
  background: linear-gradient(
    135deg,
    var(--auth-lime) 0%,
    var(--auth-lime-bright) 100%
  );
  box-shadow:
    0 6px 20px rgba(163, 230, 53, 0.45),
    0 0 20px rgba(163, 230, 53, 0.35),
    0 1px 0 rgba(255, 255, 255, 0.3) inset;
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: transform;
}
.auth-tabs.signup .auth-glider {
  transform: translateX(100%);
}
.auth-tab {
  position: relative;
  z-index: 1;
  padding: 11px 10px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--auth-muted);
  cursor: pointer;
  border-radius: 9px;
  transition: color 0.25s ease;
}
.auth-tab.active {
  color: #000;
  font-weight: 800;
}
.auth-tab:not(.active):hover {
  color: #fff;
}

/* ═══════════════════════════════════════════════════════════
   HEADING
   ═══════════════════════════════════════════════════════════ */
.auth-head {
  position: relative;
  z-index: 1;
  margin-bottom: 22px;
}
.auth-head h2 {
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: #fff;
  line-height: 1.15;
}
.auth-head-sub {
  margin-top: 6px;
  font-size: 0.86rem;
  color: var(--auth-muted);
  font-weight: 400;
}

/* ═══════════════════════════════════════════════════════════
   FORMS
   ═══════════════════════════════════════════════════════════ */
.auth-form-panel {
  position: relative;
  z-index: 1;
  animation: authFormSwap 0.4s cubic-bezier(0.2, 0.8, 0.25, 1) backwards;
}
.auth-form-panel form {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.auth-ctrl {
  position: relative;
}

.auth-ctrl input {
  width: 100%;
  padding: 15px 18px 15px 48px;
  font-family: inherit;
  font-size: 0.94rem;
  font-weight: 500;
  color: #fff;
  background: #000;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  outline: none;
  color-scheme: dark;
  transition:
    background 0.22s ease,
    border-color 0.22s ease,
    box-shadow 0.22s ease;
}
.auth-ctrl input::placeholder {
  color: var(--auth-dim);
  font-weight: 400;
}
.auth-ctrl input:hover {
  background: #0a0a0a;
  border-color: rgba(255, 255, 255, 0.2);
}
.auth-ctrl input:focus {
  background: rgba(163, 230, 53, 0.04);
  border-color: var(--auth-lime);
  box-shadow:
    0 0 0 4px rgba(163, 230, 53, 0.15),
    0 0 24px rgba(163, 230, 53, 0.25);
}
.auth-ctrl input.invalid {
  border-color: rgba(248, 113, 113, 0.85);
  background: rgba(248, 113, 113, 0.06);
  box-shadow:
    0 0 0 4px rgba(248, 113, 113, 0.15),
    0 0 20px rgba(248, 113, 113, 0.3);
}

.auth-in-ic {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: rgba(163, 230, 53, 0.6);
  pointer-events: none;
  transition: color 0.22s ease;
}
.auth-ctrl input:focus ~ .auth-in-ic {
  color: var(--auth-lime);
}
.auth-ctrl input.invalid ~ .auth-in-ic {
  color: var(--auth-red);
}

.auth-eye {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: var(--auth-muted);
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
  padding: 0;
}
.auth-eye:hover {
  background: rgba(163, 230, 53, 0.1);
  color: var(--auth-lime);
}
.auth-eye svg {
  width: 17px;
  height: 17px;
}

.auth-err {
  display: block;
  margin-top: 5px;
  font-size: 0.75rem;
  color: var(--auth-red);
  font-weight: 500;
  min-height: 0;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.auth-err.show {
  opacity: 1;
  transform: translateY(0);
  min-height: 16px;
}

.auth-strength {
  height: 3px;
  border-radius: 3px;
  margin-top: 6px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
  display: none;
}
.auth-strength.show {
  display: block;
}
.auth-strength .auth-bar {
  height: 100%;
  width: 0%;
  border-radius: 3px;
  background: linear-gradient(
    90deg,
    #f43f5e 0%,
    #fb923c 50%,
    var(--auth-lime) 100%
  );
  transition: width 0.35s cubic-bezier(0.2, 0.8, 0.25, 1);
}

.auth-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  margin-top: -2px;
}
.auth-remember {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--auth-muted);
  cursor: pointer;
  user-select: none;
  font-weight: 500;
  transition: color 0.2s ease;
}
.auth-remember:hover {
  color: #fff;
}
.auth-remember input {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: 1.5px solid rgba(163, 230, 53, 0.4);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  flex: none;
}
.auth-remember input:checked {
  background: linear-gradient(
    135deg,
    var(--auth-lime),
    var(--auth-lime-bright)
  );
  border-color: var(--auth-lime);
  box-shadow: 0 0 14px rgba(163, 230, 53, 0.6);
}
.auth-remember input:checked::after {
  content: "";
  position: absolute;
  left: 5px;
  top: 1.5px;
  width: 5px;
  height: 9px;
  border: solid #000;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.auth-row a {
  color: var(--auth-muted);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.85rem;
  transition: color 0.2s ease;
}
.auth-row a:hover {
  color: var(--auth-lime);
}

/* ═══════════════════════════════════════════════════════════
   PRIMARY BUTTON
   ═══════════════════════════════════════════════════════════ */
.auth-btn-primary {
  margin-top: 4px;
  width: 100%;
  padding: 16px 22px;
  font-family: inherit;
  font-size: 0.94rem;
  font-weight: 800;
  letter-spacing: 0.005em;
  color: #000;
  background: linear-gradient(
    135deg,
    var(--auth-lime) 0%,
    var(--auth-lime-bright) 100%
  );
  background-size: 200% 100%;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow:
    0 10px 30px rgba(163, 230, 53, 0.45),
    0 0 40px rgba(163, 230, 53, 0.25),
    0 1px 0 rgba(255, 255, 255, 0.35) inset;
  transition:
    transform 0.18s ease,
    background-position 0.6s ease,
    box-shadow 0.25s ease,
    opacity 0.2s ease;
}
.auth-btn-primary svg {
  width: 18px;
  height: 18px;
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.25, 1);
}
.auth-btn-primary::after {
  content: "";
  position: absolute;
  top: 0;
  left: -40%;
  width: 40%;
  height: 100%;
  background: linear-gradient(
    100deg,
    transparent 0%,
    rgba(255, 255, 255, 0.6) 50%,
    transparent 100%
  );
  transform: skewX(-20deg);
  animation: authSheen 5s ease-in-out 1.6s infinite;
  pointer-events: none;
}
.auth-btn-primary:hover:not(:disabled) {
  background-position: 100% 0;
  transform: translateY(-2px);
  box-shadow:
    0 14px 40px rgba(163, 230, 53, 0.6),
    0 0 60px rgba(163, 230, 53, 0.4),
    0 1px 0 rgba(255, 255, 255, 0.45) inset;
}
.auth-btn-primary:hover:not(:disabled) svg {
  transform: translateX(5px);
}
.auth-btn-primary:active:not(:disabled) {
  transform: translateY(0);
}
.auth-btn-primary:disabled {
  opacity: 0.7;
  cursor: wait;
}
.auth-btn-primary:focus-visible {
  outline: 2px solid var(--auth-lime);
  outline-offset: 3px;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 6px 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--auth-dim);
  font-family: 'Roboto Mono', ui-monospace, monospace;
}
.auth-divider::before,
.auth-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.15),
    transparent
  );
}

/* ═══════════════════════════════════════════════════════════
   GOOGLE BUTTON — CUSTOM SKIN + INVISIBLE GSI OVERLAY
   ═══════════════════════════════════════════════════════════ */
.auth-google-wrap {
  position: relative;
  width: 100%;
  height: 50px;
  margin-top: 4px;
  border-radius: 14px;
  overflow: hidden;
}

/* Invisible Google-rendered button on top */
.auth-google-overlay {
  position: absolute;
  inset: 0;
  opacity: 0;
  z-index: 3;
  cursor: pointer;
  overflow: hidden;
  border-radius: 14px;
}
.auth-google-overlay > div {
  width: 100% !important;
  height: 100% !important;
}
.auth-google-overlay > div > div {
  width: 100% !important;
  height: 100% !important;
}
.auth-google-overlay iframe {
  width: 100% !important;
  height: 100% !important;
  border-radius: 14px !important;
}

/* Custom visible button underneath */
.auth-btn-google {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  padding: 0 20px;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  pointer-events: none;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.25s ease;
}
.auth-btn-google svg {
  width: 20px;
  height: 20px;
  flex: none;
}

/* Hover effect targets the wrapper since the visible button has pointer-events: none */
.auth-google-wrap:hover .auth-btn-google {
  background: rgba(163, 230, 53, 0.08);
  border-color: rgba(163, 230, 53, 0.4);
  box-shadow: 0 8px 24px rgba(163, 230, 53, 0.2);
}

/* Google error banner */
.auth-google-error {
  margin: -8px 0 12px;
  padding: 10px 14px;
  font-size: 0.82rem;
  color: var(--auth-red);
  background: var(--auth-red-subtle);
  border: 1px solid var(--auth-red-border);
  border-radius: 12px;
  font-weight: 500;
  position: relative;
  z-index: 1;
}

/* ═══════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════ */
.auth-foot {
  margin-top: 22px;
  text-align: center;
  font-size: 0.86rem;
  color: var(--auth-muted);
  position: relative;
  z-index: 1;
}
.auth-foot a {
  font-weight: 700;
  text-decoration: none;
  color: var(--auth-lime);
  cursor: pointer;
  transition: color 0.2s ease, text-shadow 0.2s ease;
}
.auth-foot a:hover {
  color: var(--auth-lime-bright);
  text-shadow: 0 0 12px var(--auth-lime-glow);
}

/* ═══════════════════════════════════════════════════════════
   SUCCESS OVERLAY
   ═══════════════════════════════════════════════════════════ */
.auth-success {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
  background: linear-gradient(
    180deg,
    rgba(20, 20, 20, 0.97) 0%,
    rgba(11, 11, 11, 0.99) 100%
  );
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: inherit;
  padding: 40px;
  text-align: center;
}
.auth-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--auth-lime), var(--auth-lime-bright));
  box-shadow:
    0 0 40px rgba(163, 230, 53, 0.55),
    0 0 80px rgba(163, 230, 53, 0.35);
  animation: authSuccessPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}
.auth-circle svg {
  width: 40px;
  height: 40px;
  stroke: #050505;
  stroke-width: 3;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.auth-success h3 {
  font-size: 1.4rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #fff;
}
.auth-success p {
  font-size: 0.9rem;
  color: var(--auth-muted);
  max-width: 30ch;
}
.auth-success .auth-btn-primary {
  max-width: 220px;
  margin-top: 8px;
}

/* ═══════════════════════════════════════════════════════════
   CORNER HUD
   ═══════════════════════════════════════════════════════════ */
.auth-tag-hud {
  position: fixed;
  font-family: 'Roboto Mono', ui-monospace, monospace;
  font-size: 0.6rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.28);
  z-index: 3;
  pointer-events: none;
}
.auth-tl { top: 20px; left: 24px; }
.auth-tr { top: 20px; right: 24px; }
.auth-bl { bottom: 20px; left: 24px; }
.auth-br { bottom: 20px; right: 24px; }

.auth-hud-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--auth-lime);
  margin-right: 7px;
  vertical-align: middle;
  box-shadow: 0 0 8px var(--auth-lime);
  animation: authBlink 2s ease-in-out infinite;
}

/* ═══════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════ */
@media (max-width: 520px) {
  .auth-root {
    padding: 24px 16px;
  }
  .auth-card {
    padding: 28px 24px 26px;
    border-radius: 20px;
    max-width: 400px;
  }
  .auth-head h2 {
    font-size: 1.4rem;
  }
  .auth-tl,
  .auth-tr {
    display: none;
  }
  .auth-ctrl input {
    font-size: 0.9rem;
    padding: 14px 15px 14px 44px;
  }
  .auth-tab {
    font-size: 0.8rem;
    padding: 10px 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-root *,
  .auth-root *::before,
  .auth-root *::after {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
}
```

### frontend/src/pages/Auth.jsx

```
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Decode the Google ID token (JWT) payload
const parseJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const Auth = ({ initialMode = "login" }) => {
  const navigate = useNavigate();
  const { login, register, googleLogin, user } = useAuth();

  const [mode, setMode] = useState(initialMode);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginErrors, setLoginErrors] = useState({});
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup form
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPwd, setShowSignupPwd] = useState(false);
  const [signupTerms, setSignupTerms] = useState(false);
  const [signupErrors, setSignupErrors] = useState({});
  const [signupLoading, setSignupLoading] = useState(false);

  // Google Identity Services state
  const [gsiReady, setGsiReady] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const googleBtnRef = useRef(null);
  const googleBtnRefSignup = useRef(null);

  // Success overlay
  const [success, setSuccess] = useState({ show: false, title: "", msg: "" });

  const canvasRef = useRef(null);
  const cardRef = useRef(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  // Sync mode when prop changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Wait for the GSI script to load
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setGsiReady(true);
      return;
    }
    const t = setInterval(() => {
      if (window.google?.accounts?.id) {
        setGsiReady(true);
        clearInterval(t);
      }
    }, 150);
    return () => clearInterval(t);
  }, []);

  // Handle the credential response from Google
  const handleGoogleCredential = async (response) => {
    setGoogleError("");
    try {
      const payload = parseJwt(response.credential);
      if (!payload) throw new Error("Invalid Google credential");

      await googleLogin({
        email: payload.email,
        name: payload.name,
        googleId: payload.sub,
        avatar: payload.picture,
      });

      setSuccess({
        show: true,
        title: "Welcome!",
        msg: "Signed in with Google. Redirecting…",
      });
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Google sign-in failed. Please try again.";
      setGoogleError(msg);
    }
  };

  // Render Google's button invisibly on top of our custom button
  useEffect(() => {
    if (!gsiReady) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      setGoogleError(
        "Google sign-in not configured. Set VITE_GOOGLE_CLIENT_ID in frontend/.env"
      );
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    const opts = {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: 380,
    };

    if (mode === "login" && googleBtnRef.current) {
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, opts);
    }
    if (mode === "signup" && googleBtnRefSignup.current) {
      googleBtnRefSignup.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRefSignup.current, opts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gsiReady, mode]);

  // Star field animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0,
      h = 0,
      stars = [];
    const COUNT = 120;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let rafId = null;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const build = () => {
      stars = [];
      for (let i = 0; i < COUNT; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.2 + 0.2,
          a: Math.random() * 0.7 + 0.2,
          tw: Math.random() * Math.PI * 2,
          sp: Math.random() * 0.02 + 0.005,
          hue: Math.random() < 0.65 ? 0 : Math.random() < 0.5 ? 100 : 200,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.tw += s.sp;
        const flicker = 0.7 + Math.sin(s.tw) * 0.3;
        const alpha = s.a * flicker;
        const color =
          s.hue === 0
            ? `rgba(255,255,255,${alpha})`
            : s.hue === 100
            ? `rgba(190,242,100,${alpha})`
            : `rgba(165,243,252,${alpha})`;

        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
        g.addColorStop(0, color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      rafId = requestAnimationFrame(draw);
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        ctx.fillStyle = `rgba(255,255,255,${s.a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    resize();
    build();
    if (!reduced) draw();
    else drawStatic();

    const onResize = () => {
      resize();
      build();
      if (reduced) drawStatic();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // 3D card tilt
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || coarse) return;

    let rx = 0,
      ry = 0,
      cx = 0,
      cy = 0;
    const MAX = 4;
    let rafId = null;

    const onMove = (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      ry = nx * MAX;
      rx = -ny * MAX;
    };
    const onLeave = () => {
      rx = 0;
      ry = 0;
    };
    const loop = () => {
      cx += (ry - cx) * 0.08;
      cy += (rx - cy) * 0.08;
      card.style.transform = `perspective(1200px) rotateY(${cx.toFixed(
        2
      )}deg) rotateX(${cy.toFixed(2)}deg)`;
      rafId = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    loop();

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Password strength
  const strengthPct = (() => {
    const v = signupPassword;
    if (!v) return 0;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    return (score / 4) * 100;
  })();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!loginEmail.trim()) errors.loginEmail = "Email is required";
    else if (!EMAIL_RE.test(loginEmail.trim()))
      errors.loginEmail = "Enter a valid email";
    if (!loginPassword) errors.loginPassword = "Password is required";
    else if (loginPassword.length < 6)
      errors.loginPassword = "Password must be at least 6 characters";

    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoginLoading(true);
    try {
      await login(loginEmail.trim(), loginPassword);
      setSuccess({
        show: true,
        title: "Welcome back!",
        msg: "Redirecting to your trips…",
      });
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err) {
      const msg =
        err.response?.data?.message || "Login failed. Please try again.";
      setLoginErrors({ loginPassword: msg });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!signupName.trim()) errors.signupName = "Please enter your name";
    else if (signupName.trim().length < 2)
      errors.signupName = "Name is too short";
    if (!signupEmail.trim()) errors.signupEmail = "Email is required";
    else if (!EMAIL_RE.test(signupEmail.trim()))
      errors.signupEmail = "Enter a valid email";
    if (!signupPassword) errors.signupPassword = "Password is required";
    else if (signupPassword.length < 8)
      errors.signupPassword = "Password must be at least 8 characters";
    else if (!/[A-Z]/.test(signupPassword))
      errors.signupPassword = "Add at least one uppercase letter";
    else if (!/[0-9]/.test(signupPassword))
      errors.signupPassword = "Add at least one number";
    if (!signupTerms)
      errors.signupTerms = "Please accept the Terms to continue";

    setSignupErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSignupLoading(true);
    try {
      await register(signupName.trim(), signupEmail.trim(), signupPassword);
      setSuccess({
        show: true,
        title: "Account created!",
        msg: "Welcome aboard. Start exploring the world.",
      });
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err) {
      const msg =
        err.response?.data?.message || "Sign up failed. Please try again.";
      setSignupErrors({ signupEmail: msg });
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="auth-root">
      {/* Cosmic background */}
      <div className="auth-cosmos" aria-hidden="true">
        <canvas ref={canvasRef} id="auth-stars" />
        <div className="auth-orb-1" />
        <div className="auth-orb-2" />
        <div className="auth-aurora">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 1400 900"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <linearGradient id="authAuroraA" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a3e635" stopOpacity="0" />
                <stop offset="40%" stopColor="#a3e635" stopOpacity=".85" />
                <stop offset="70%" stopColor="#bef264" stopOpacity=".8" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="authAuroraB" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
                <stop offset="50%" stopColor="#a3e635" stopOpacity=".8" />
                <stop offset="100%" stopColor="#bef264" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="authAuroraC" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#84cc16" stopOpacity="0" />
                <stop offset="50%" stopColor="#a3e635" stopOpacity=".8" />
                <stop offset="100%" stopColor="#bef264" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              className="auth-trail auth-t1"
              d="M -100 380 C 200 300, 500 480, 900 380 C 1150 320, 1350 420, 1500 360"
            />
            <path
              className="auth-trail auth-t2"
              d="M -100 640 C 250 560, 550 760, 950 660 C 1200 600, 1350 700, 1500 640"
            />
            <path
              className="auth-trail auth-t3"
              d="M -100 180 C 300 140, 600 260, 1000 200 C 1250 160, 1400 220, 1500 200"
            />
          </svg>
        </div>
      </div>

      <div className="auth-grid-overlay" aria-hidden="true" />

      {/* Corner HUD */}
      <span className="auth-tag-hud auth-tl">
        <span className="auth-hud-dot" />System online</span>
      <span className="auth-tag-hud auth-br">© AI Travel Planner 2025</span>
      {/* Card */}
      <main className="auth-card" ref={cardRef}>
        <div className="auth-card-brand">
          <svg
            className="auth-mark"
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="authLogG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a3e635" />
                <stop offset="100%" stopColor="#bef264" />
              </linearGradient>
            </defs>
            <circle
              cx="24"
              cy="24"
              r="19"
              stroke="url(#authLogG)"
              strokeWidth="2.4"
              fill="rgba(163,230,53,.12)"
            />
            <path
              d="M14 28 L 22 18 L 26 24 L 34 14"
              stroke="url(#authLogG)"
              strokeWidth="2.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M31 12 L 40 15 L 33 20 L 35 15.5 Z"
              fill="url(#authLogG)"
            />
          </svg>
          <div className="auth-brand-name">
            <span className="auth-a">AI TRAVEL</span>
            <span className="auth-b">PLANNER</span>
            <span className="auth-brand-tag">Secure access</span>
          </div>
        </div>

        {/* Tabs */}
        <div
          className={`auth-tabs ${mode === "signup" ? "signup" : ""}`}
          role="tablist"
        >
          <span className="auth-glider" aria-hidden="true" />
          <button
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => {
              setMode("login");
              setGoogleError("");
            }}
            type="button"
          >
            Log In
          </button>
          <button
            className={`auth-tab ${mode === "signup" ? "active" : ""}`}
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => {
              setMode("signup");
              setGoogleError("");
            }}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {/* Heading */}
        <div className="auth-head">
          <h2>{mode === "login" ? "Welcome Back" : "Create Account"}</h2>
          <p className="auth-head-sub">
            {mode === "login"
              ? "Log in to continue your journey"
              : "Start planning your next adventure"}
          </p>
        </div>

        {googleError && <p className="auth-google-error">{googleError}</p>}

        {/* LOGIN PANEL */}
        {mode === "login" && (
          <div className="auth-form-panel" role="tabpanel">
            <form onSubmit={handleLoginSubmit} noValidate>
              <div className="auth-ctrl">
                <input
                  type="email"
                  placeholder="Email address"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    setLoginErrors((p) => ({ ...p, loginEmail: "" }));
                  }}
                  className={loginErrors.loginEmail ? "invalid" : ""}
                />
                <svg
                  className="auth-in-ic"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M2 7l10 6 10-6" />
                </svg>
                <span
                  className={`auth-err ${
                    loginErrors.loginEmail ? "show" : ""
                  }`}
                >
                  {loginErrors.loginEmail}
                </span>
              </div>

              <div className="auth-ctrl">
                <input
                  type={showLoginPwd ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setLoginErrors((p) => ({ ...p, loginPassword: "" }));
                  }}
                  className={loginErrors.loginPassword ? "invalid" : ""}
                  style={{ paddingRight: 48 }}
                />
                <svg
                  className="auth-in-ic"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                <button
                  className="auth-eye"
                  type="button"
                  onClick={() => setShowLoginPwd((v) => !v)}
                  aria-label={showLoginPwd ? "Hide password" : "Show password"}
                >
                  {showLoginPwd ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <path d="M1 1l22 22" />
                    </svg>
                  )}
                </button>
                <span
                  className={`auth-err ${
                    loginErrors.loginPassword ? "show" : ""
                  }`}
                >
                  {loginErrors.loginPassword}
                </span>
              </div>

              <div className="auth-row">
                <label className="auth-remember">
                  <input type="checkbox" defaultChecked />
                  <span>Remember me</span>
                </label>
                <a href="#">Forgot password?</a>
              </div>

              <button
                type="submit"
                className="auth-btn-primary"
                disabled={loginLoading}
              >
                {loginLoading ? "Signing in…" : "Log In"}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="M13 5l7 7-7 7" />
                </svg>
              </button>

              <div className="auth-divider">or</div>

              <div className="auth-google-wrap">
                <div
                  ref={googleBtnRef}
                  className="auth-google-overlay"
                  aria-hidden="true"
                />
                <button type="button" className="auth-btn-google" tabIndex={-1}>
                  <svg viewBox="0 0 48 48" aria-hidden="true">
                    <path
                      fill="#FFC107"
                      d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.7 0-1.2-.1-2.4-.4-3.5z"
                    />
                  </svg>
                  Continue with Google
                </button>
              </div>
            </form>

            <p className="auth-foot">
              Don't have an account?{" "}
              <a onClick={() => setMode("signup")} role="button">
                Sign up free
              </a>
            </p>
          </div>
        )}

        {/* SIGNUP PANEL */}
        {mode === "signup" && (
          <div className="auth-form-panel" role="tabpanel">
            <form onSubmit={handleSignupSubmit} noValidate>
              <div className="auth-ctrl">
                <input
                  type="text"
                  placeholder="Full name"
                  autoComplete="name"
                  value={signupName}
                  onChange={(e) => {
                    setSignupName(e.target.value);
                    setSignupErrors((p) => ({ ...p, signupName: "" }));
                  }}
                  className={signupErrors.signupName ? "invalid" : ""}
                />
                <svg
                  className="auth-in-ic"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span
                  className={`auth-err ${
                    signupErrors.signupName ? "show" : ""
                  }`}
                >
                  {signupErrors.signupName}
                </span>
              </div>

              <div className="auth-ctrl">
                <input
                  type="email"
                  placeholder="Email address"
                  autoComplete="email"
                  value={signupEmail}
                  onChange={(e) => {
                    setSignupEmail(e.target.value);
                    setSignupErrors((p) => ({ ...p, signupEmail: "" }));
                  }}
                  className={signupErrors.signupEmail ? "invalid" : ""}
                />
                <svg
                  className="auth-in-ic"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M2 7l10 6 10-6" />
                </svg>
                <span
                  className={`auth-err ${
                    signupErrors.signupEmail ? "show" : ""
                  }`}
                >
                  {signupErrors.signupEmail}
                </span>
              </div>

              <div className="auth-ctrl">
                <input
                  type={showSignupPwd ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="new-password"
                  value={signupPassword}
                  onChange={(e) => {
                    setSignupPassword(e.target.value);
                    setSignupErrors((p) => ({ ...p, signupPassword: "" }));
                  }}
                  className={signupErrors.signupPassword ? "invalid" : ""}
                  style={{ paddingRight: 48 }}
                />
                <svg
                  className="auth-in-ic"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                <button
                  className="auth-eye"
                  type="button"
                  onClick={() => setShowSignupPwd((v) => !v)}
                  aria-label={showSignupPwd ? "Hide password" : "Show password"}
                >
                  {showSignupPwd ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <path d="M1 1l22 22" />
                    </svg>
                  )}
                </button>
                {signupPassword && (
                  <div className="auth-strength show">
                    <div
                      className="auth-bar"
                      style={{ width: `${strengthPct}%` }}
                    />
                  </div>
                )}
                <span
                  className={`auth-err ${
                    signupErrors.signupPassword ? "show" : ""
                  }`}
                >
                  {signupErrors.signupPassword}
                </span>
              </div>

              <div className="auth-row">
                <label className="auth-remember">
                  <input
                    type="checkbox"
                    checked={signupTerms}
                    onChange={(e) => {
                      setSignupTerms(e.target.checked);
                      setSignupErrors((p) => ({ ...p, signupTerms: "" }));
                    }}
                  />
                  <span>
                    I agree to the <a href="#">Terms</a>
                  </span>
                </label>
              </div>
              <span
                className={`auth-err ${
                  signupErrors.signupTerms ? "show" : ""
                }`}
                style={{ marginTop: -8 }}
              >
                {signupErrors.signupTerms}
              </span>

              <button
                type="submit"
                className="auth-btn-primary"
                disabled={signupLoading}
              >
                {signupLoading ? "Creating account…" : "Create Account"}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="M13 5l7 7-7 7" />
                </svg>
              </button>

              <div className="auth-divider">or</div>

              <div className="auth-google-wrap">
                <div
                  ref={googleBtnRefSignup}
                  className="auth-google-overlay"
                  aria-hidden="true"
                />
                <button type="button" className="auth-btn-google" tabIndex={-1}>
                  <svg viewBox="0 0 48 48" aria-hidden="true">
                    <path
                      fill="#FFC107"
                      d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.7 0-1.2-.1-2.4-.4-3.5z"
                    />
                  </svg>
                  Sign up with Google
                </button>
              </div>
            </form>

            <p className="auth-foot">
              Already have an account?{" "}
              <a onClick={() => setMode("login")} role="button">
                Log in
              </a>
            </p>
          </div>
        )}

        {/* Success overlay */}
        {success.show && (
          <div className="auth-success show">
            <div className="auth-circle">
              <svg viewBox="0 0 24 24">
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
            </div>
            <h3>{success.title}</h3>
            <p>{success.msg}</p>
            <button
              type="button"
              className="auth-btn-primary"
              onClick={() => {
                setSuccess({ show: false });
                navigate("/dashboard");
              }}
            >
              Continue
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Auth;
```

### frontend/src/pages/CreateTrip.css

```
/* frontend/src/pages/CreateTrip.css */

.ct-root {
  --ct-bg: #050505;
  --ct-card: #111111;
  --ct-border: rgba(255, 255, 255, 0.1);
  --ct-muted: #888888;
  --ct-dim: #52525b;
  --ct-lime: #a3e635;
  --ct-lime-bright: #bef264;
  --ct-lime-glow: rgba(163, 230, 53, 0.4);
  --ct-lime-subtle: rgba(163, 230, 53, 0.12);
  background: var(--ct-bg);
  color: #fff;
  min-height: 100vh;
  font-family: 'Poppins', system-ui, sans-serif;
  overflow-x: hidden;
  position: relative;
  padding: 48px 24px 80px;
}

.ct-orb-1, .ct-orb-2 {
  position: fixed;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.ct-orb-1 {
  top: -120px; left: 8%;
  width: 500px; height: 500px;
  background: radial-gradient(circle, var(--ct-lime-glow) 0%, rgba(163,230,53,0.05) 50%, transparent 75%);
  animation: ctFloat 10s ease-in-out infinite alternate;
}
.ct-orb-2 {
  bottom: -120px; right: 8%;
  width: 450px; height: 450px;
  background: radial-gradient(circle, rgba(163,230,53,0.22) 0%, transparent 70%);
  animation: ctFloat 13s ease-in-out infinite alternate-reverse;
}
@keyframes ctFloat {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(40px, 40px) scale(1.15); }
}

.ct-page {
  position: relative;
  z-index: 10;
  max-width: 780px;
  margin: 0 auto;
}

.ct-tag {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 0.7rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--ct-lime);
  background: var(--ct-lime-subtle);
  border: 1px solid rgba(163, 230, 53, 0.3);
  padding: 5px 12px; border-radius: 9999px;
  width: fit-content;
  margin-bottom: 14px;
}
.ct-pulse {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--ct-lime);
  box-shadow: 0 0 10px var(--ct-lime);
  animation: ctPulse 1.5s infinite;
}
@keyframes ctPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}

.ct-title {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: #fff;
  margin-bottom: 14px;
}
.ct-title span { color: var(--ct-lime); text-shadow: 0 0 30px var(--ct-lime-glow); }

.ct-subtitle {
  font-size: 0.95rem;
  color: var(--ct-muted);
  max-width: 560px;
  line-height: 1.6;
  margin-bottom: 40px;
}

.ct-error {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fecaca;
  padding: 12px 16px;
  border-radius: 14px;
  margin-bottom: 24px;
  font-size: 0.88rem;
}

.ct-form {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.ct-field { position: relative; }

.ct-label {
  display: block;
  font-size: 1.05rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
  letter-spacing: -0.01em;
}

.ct-input {
  width: 100%;
  background: #000;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 14px 16px;
  color: #fff;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  transition: border-color 0.2s, box-shadow 0.2s;
  color-scheme: dark;
}
.ct-input::placeholder { color: var(--ct-dim); font-weight: 500; }
.ct-input:focus {
  outline: none;
  border-color: var(--ct-lime);
  box-shadow: 0 0 0 3px rgba(163, 230, 53, 0.15);
}

.ct-suggestions {
  position: absolute;
  left: 0; right: 0; top: 100%;
  margin-top: 6px;
  background: #0b0b0b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  box-shadow: 0 20px 60px -20px rgba(0, 0, 0, 0.9);
  max-height: 288px;
  overflow-y: auto;
  z-index: 50;
}
.ct-suggestion {
  width: 100%;
  text-align: left;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #d4d4d8;
  font-family: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.ct-suggestion:last-child { border-bottom: none; }
.ct-suggestion:hover {
  background: rgba(163, 230, 53, 0.08);
  color: var(--ct-lime);
}

.ct-options-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 14px;
}
@media (min-width: 720px) {
  .ct-options-grid { grid-template-columns: repeat(3, 1fr); }
}

.ct-option {
  text-align: left;
  padding: 20px;
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  background: var(--ct-card);
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  transition: border-color 0.2s, background 0.2s, transform 0.2s, box-shadow 0.2s;
}
.ct-option:hover {
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}
.ct-option.ct-selected {
  border-color: var(--ct-lime);
  background: #000;
  box-shadow: 0 0 24px -6px var(--ct-lime-glow), inset 0 0 12px rgba(163, 230, 53, 0.08);
}

.ct-option-icon { font-size: 1.8rem; margin-bottom: 12px; line-height: 1; }
.ct-option-title { font-size: 1rem; font-weight: 800; color: #fff; }
.ct-option-desc { font-size: 0.82rem; color: var(--ct-muted); margin-top: 6px; line-height: 1.4; }

/* ═════════════════════════════════════════════════════
   INTEREST CHIPS
   ═════════════════════════════════════════════════════ */

.ct-hint {
  font-size: 0.82rem;
  color: var(--ct-muted);
  margin: -6px 0 16px;
  line-height: 1.5;
}

.ct-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.ct-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px 10px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: #e5e5e5;
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  letter-spacing: 0.005em;
  cursor: pointer;
  transition:
    background 0.22s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.22s ease,
    color 0.22s ease,
    transform 0.15s ease,
    box-shadow 0.25s ease;
  white-space: nowrap;
  position: relative;
}

.ct-chip:hover {
  border-color: rgba(163, 230, 53, 0.4);
  background: rgba(163, 230, 53, 0.06);
  color: #fff;
  transform: translateY(-1px);
}

.ct-chip:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(163, 230, 53, 0.3);
}

.ct-chip:active {
  transform: translateY(0) scale(0.98);
}

.ct-chip-emoji {
  font-size: 1rem;
  line-height: 1;
  flex-shrink: 0;
  filter: grayscale(0.4);
  transition: filter 0.22s ease, transform 0.22s ease;
}

.ct-chip:hover .ct-chip-emoji {
  filter: grayscale(0);
  transform: scale(1.1);
}

.ct-chip.ct-chip-active {
  background: linear-gradient(
    135deg,
    rgba(163, 230, 53, 0.18),
    rgba(163, 230, 53, 0.08)
  );
  border-color: rgba(163, 230, 53, 0.7);
  color: #e8ffb8;
  box-shadow:
    0 0 0 1px rgba(163, 230, 53, 0.15) inset,
    0 6px 18px -8px rgba(163, 230, 53, 0.5),
    0 0 20px -8px rgba(163, 230, 53, 0.4);
}

.ct-chip.ct-chip-active .ct-chip-emoji {
  filter: grayscale(0);
  transform: scale(1.1);
}

.ct-chip.ct-chip-active:hover {
  background: linear-gradient(
    135deg,
    rgba(163, 230, 53, 0.24),
    rgba(163, 230, 53, 0.12)
  );
  border-color: #a3e635;
}

.ct-chip-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #a3e635;
  color: #000;
  font-size: 0.68rem;
  font-weight: 900;
  line-height: 1;
  flex-shrink: 0;
  animation: chipCheckIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes chipCheckIn {
  from { opacity: 0; transform: scale(0.4); }
  to   { opacity: 1; transform: scale(1); }
}

@media (max-width: 480px) {
  .ct-chip {
    padding: 9px 14px 9px 12px;
    font-size: 0.82rem;
    gap: 6px;
  }
  .ct-chip-emoji {
    font-size: 0.9rem;
  }
}

/* ═════════════════════════════════════════════════════
   SUBMIT + TOAST
   ═════════════════════════════════════════════════════ */

.ct-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}

.ct-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #0b0b0b;
  border: 1px solid rgba(163, 230, 53, 0.35);
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 60;
  box-shadow: 0 20px 60px -20px rgba(0, 0, 0, 0.9);
  animation: ctFadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes ctFadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ct-toast-dots {
  display: flex;
  gap: 4px;
}
.ct-toast-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ct-lime);
  animation: ctBounce 1.2s infinite ease-in-out;
}
.ct-toast-dot:nth-child(2) { animation-delay: 0.15s; }
.ct-toast-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes ctBounce {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.6; }
  40% { transform: scale(1.15); opacity: 1; }
}
.ct-toast-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: #fff;
}

/* ═════════════════════════════════════════════════════
   KILL ALL FOCUS OUTLINES (fixes the rectangle)
   ═════════════════════════════════════════════════════ */

/* Wrapper divs that receive programmatic focus */
.ct-field[tabindex]:focus,
.ct-field[tabindex]:focus-visible {
  outline: none !important;
  outline-offset: 0 !important;
}

/* Any element inside the form that might get an outline */
.ct-form [tabindex="-1"]:focus,
.ct-form [tabindex="-1"]:focus-visible {
  outline: none !important;
  outline-offset: 0 !important;
  box-shadow: none;
}

/* Form element itself */
.ct-form:focus,
.ct-form:focus-visible,
.ct-form:focus-within {
  outline: none !important;
}

/* Number inputs — kill browser spin-button outline */
.ct-input[type="number"]:focus,
.ct-input[type="number"]:focus-visible {
  outline: none !important;
}

.ct-input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
.ct-input[type="number"]::-webkit-outer-spin-button,
.ct-input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox — remove inner dotted outline */
.ct-field:-moz-focusring {
  outline: none !important;
}

/* Safari — remove tap highlight */
.ct-field[tabindex] {
  -webkit-tap-highlight-color: transparent;
}

/* Re-enable visible focus only for real interactive elements (accessibility) */
.ct-root button:focus-visible,
.ct-root input:focus-visible,
.ct-root a:focus-visible {
  outline: 2px solid #a3e635;
  outline-offset: 2px;
}

/* ═════════════════════════════════════════════════════
   REDUCED MOTION
   ═════════════════════════════════════════════════════ */

@media (prefers-reduced-motion: reduce) {
  .ct-orb-1, .ct-orb-2, .ct-pulse, .ct-toast-dot,
  .ct-chip, .ct-chip-emoji, .ct-chip-check {
    animation: none !important;
    transition: none !important;
  }
}
```

### frontend/src/pages/CreateTrip.jsx

```
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import SubmitButton from "../components/SubmitButton";
import "./CreateTrip.css";

const shortenAddress = (displayName) => {
  if (!displayName) return "";
  const parts = displayName
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 3) return parts.join(", ");

  const first = parts[0];
  const country = parts[parts.length - 1];
  const region = parts[parts.length - 2];
  const cleanRegion = /^\d+$/.test(region) ? parts[parts.length - 3] : region;
  return [first, cleanRegion, country].filter(Boolean).join(", ");
};

const BUDGET_OPTIONS = [
  { id: "cheap", icon: "💵", label: "Cheap", desc: "Stay conscious of costs", budget: 15000 },
  { id: "moderate", icon: "💰", label: "Moderate", desc: "Keep cost on the average side", budget: 30000 },
  { id: "luxury", icon: "💎", label: "Luxury", desc: "Don't worry about cost", budget: 80000 },
];

const TRAVELER_OPTIONS = [
  { id: "solo", icon: "✈️", label: "Just Me", desc: "A sole traveler in exploration", count: 1 },
  { id: "couple", icon: "🥂", label: "A Couple", desc: "Two travelers in tandem", count: 2 },
  { id: "family", icon: "🏠", label: "Family", desc: "A group of fun-loving adventurers", count: 4 },
  { id: "friends", icon: "⛵", label: "Friends", desc: "A bunch of thrill-seekers", count: 5 },
];

const INTEREST_OPTIONS = [
  { id: "history", icon: "🏛️", label: "History & old towns" },
  { id: "food", icon: "🍜", label: "Food & markets" },
  { id: "museums", icon: "🎨", label: "Museums & art" },
  { id: "walking", icon: "🚶", label: "Walking tours" },
  { id: "nature", icon: "🌿", label: "Nature & day trips" },
  { id: "nightlife", icon: "🌙", label: "Nightlife" },
  { id: "shopping", icon: "🛍️", label: "Shopping" },
  { id: "beaches", icon: "🏖️", label: "Beaches" },
  { id: "other", icon: "✨", label: "Other" },
];

const CreateTrip = () => {
  const navigate = useNavigate();
  const [destination, setDestination] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [days, setDays] = useState("");
  const [budget, setBudget] = useState("");
  const [travelerType, setTravelerType] = useState("");
  const [interests, setInterests] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [btnState, setBtnState] = useState("idle"); // idle | loading | success

  const suggestionsRef = useRef(null);
  const daysRef = useRef(null);
  const budgetRef = useRef(null);
  const travelersRef = useRef(null);
  const interestsRef = useRef(null);

  // Fetch destination suggestions
  useEffect(() => {
    if (destination.length < 3) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
            destination
          )}`,
          { headers: { "User-Agent": "AI-Travel-Planner/1.0" } }
        );
        const data = await res.json();
        setSuggestions(data.map((d) => ({ name: d.display_name })));
      } catch {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [destination]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll + focus helper
  const focusNext = (ref) => {
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => el.focus?.(), 250);
  };

  // Toggle interest chip
  const toggleInterest = (id) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Enter key handlers for auto-focus flow
  const handleDestinationKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (suggestions.length > 0) {
      setDestination(shortenAddress(suggestions[0].name));
      setSuggestions([]);
      setShowSuggestions(false);
    } else {
      setShowSuggestions(false);
    }
    focusNext(daysRef);
  };

  const handleDaysKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    focusNext(budgetRef);
  };

  const handleBudgetKeyDown = (e, id) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setBudget(id);
      focusNext(travelersRef);
    }
  };

  const handleTravelerKeyDown = (e, id) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setTravelerType(id);
      focusNext(interestsRef);
    }
  };

  const handleInterestKeyDown = (e, id) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleInterest(id);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!destination || !days || !budget || !travelerType) {
      return setError("Please fill all fields");
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + Number(days));
    const selectedBudget = BUDGET_OPTIONS.find((b) => b.id === budget);
    const selectedTraveler = TRAVELER_OPTIONS.find((t) => t.id === travelerType);

    const interestLabels = interests.map((id) => {
      const found = INTEREST_OPTIONS.find((i) => i.id === id);
      return found ? found.label : id;
    });

    try {
      setBtnState("loading");
      setLoading(true);

      const res = await api.post("/trips", {
        destination: shortenAddress(destination) || destination,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        budget: selectedBudget.budget,
        travellers: selectedTraveler.count,
        interests: interestLabels,
      });

      setLoading(false);
      setBtnState("success");

      setTimeout(() => {
        navigate(`/trips/${res.data._id}`);
      }, 900);
    } catch (err) {
      setBtnState("idle");
      setLoading(false);
      setError(err.response?.data?.message || "Could not create trip");
    }
  };

  return (
    <div className="ct-root">
      <div className="ct-orb-1" />
      <div className="ct-orb-2" />

      {loading && (
        <div className="ct-toast">
          <span className="ct-toast-dots">
            <span className="ct-toast-dot" />
            <span className="ct-toast-dot" />
            <span className="ct-toast-dot" />
          </span>
          <span className="ct-toast-text">
            Please wait... We are working on it...
          </span>
        </div>
      )}

      <div className="ct-page">
        <div className="ct-tag">
          <span className="ct-pulse" />
          AI Trip Planner
        </div>

        <h1 className="ct-title">
          Tell us your travel <span>preferences</span> 🏝️
        </h1>
        <p className="ct-subtitle">
          Just provide some basic information, and our trip planner will
          generate a customized itinerary based on your preferences.
        </p>

        {error && <p className="ct-error">{error}</p>}

        <form onSubmit={handleSubmit} className="ct-form">
          {/* DESTINATION */}
          <div ref={suggestionsRef} className="ct-field" style={{ zIndex: 30 }}>
            <label className="ct-label">
              What is destination of choice?
            </label>
            <input
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleDestinationKeyDown}
              placeholder="Search a city — try Paris, Tokyo, Bali…"
              className="ct-input"
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="ct-suggestions">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDestination(shortenAddress(s.name));
                      setSuggestions([]);
                      setShowSuggestions(false);
                      focusNext(daysRef);
                    }}
                    className="ct-suggestion"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DAYS */}
          <div className="ct-field" style={{ zIndex: 10 }}>
            <label className="ct-label">
              How many days are you planning your trip?
            </label>
            <input
              ref={daysRef}
              type="number"
              min="1"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              onKeyDown={handleDaysKeyDown}
              placeholder="Ex. 3"
              className="ct-input"
            />
          </div>

          {/* BUDGET */}
          <div
            className="ct-field"
            style={{ zIndex: 10 }}
            ref={budgetRef}
            tabIndex={-1}
          >
            <label className="ct-label">What is Your Budget?</label>
            <div className="ct-options-grid">
              {BUDGET_OPTIONS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setBudget(b.id);
                    focusNext(travelersRef);
                  }}
                  onKeyDown={(e) => handleBudgetKeyDown(e, b.id)}
                  className={`ct-option ${budget === b.id ? "ct-selected" : ""}`}
                >
                  <div className="ct-option-icon">{b.icon}</div>
                  <div className="ct-option-title">{b.label}</div>
                  <div className="ct-option-desc">{b.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* TRAVELERS */}
          <div
            className="ct-field"
            style={{ zIndex: 10 }}
            ref={travelersRef}
            tabIndex={-1}
          >
            <label className="ct-label">
              Who do you plan on traveling with on your next adventure?
            </label>
            <div className="ct-options-grid">
              {TRAVELER_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTravelerType(t.id);
                    focusNext(interestsRef);
                  }}
                  onKeyDown={(e) => handleTravelerKeyDown(e, t.id)}
                  className={`ct-option ${
                    travelerType === t.id ? "ct-selected" : ""
                  }`}
                >
                  <div className="ct-option-icon">{t.icon}</div>
                  <div className="ct-option-title">{t.label}</div>
                  <div className="ct-option-desc">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* INTERESTS */}
          <div
            className="ct-field"
            style={{ zIndex: 10 }}
            ref={interestsRef}
            tabIndex={-1}
          >
            <label className="ct-label">What do you want to do there?</label>
            <p className="ct-hint">Pick as many as you like.</p>
            <div className="ct-chips">
              {INTEREST_OPTIONS.map((opt) => {
                const isOn = interests.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleInterest(opt.id)}
                    onKeyDown={(e) => handleInterestKeyDown(e, opt.id)}
                    className={`ct-chip ${isOn ? "ct-chip-active" : ""}`}
                    aria-pressed={isOn}
                  >
                    <span className="ct-chip-emoji">{opt.icon}</span>
                    <span className="ct-chip-label">{opt.label}</span>
                    {isOn && <span className="ct-chip-check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SUBMIT */}
          <div className="ct-actions" style={{ zIndex: 5 }}>
            <SubmitButton type="submit" state={btnState}>
              Generate Trip
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTrip;
```

### frontend/src/pages/Dashboard.css

```
/* frontend/src/pages/Dashboard.css */

.dash-root {
  --dash-bg: #050505;
  --dash-card: #111111;
  --dash-card-hover: #181818;
  --dash-border: rgba(255, 255, 255, 0.1);
  --dash-muted: #888888;
  --dash-dim: #52525b;
  --dash-lime: #a3e635;
  --dash-lime-bright: #bef264;
  --dash-lime-glow: rgba(163, 230, 53, 0.4);
  --dash-lime-subtle: rgba(163, 230, 53, 0.12);
  background: var(--dash-bg);
  color: #fff;
  min-height: 100vh;
  font-family: 'Poppins', system-ui, sans-serif;
  overflow-x: hidden;
  position: relative;
}
.dash-orb-1, .dash-orb-2 {
  position: fixed;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.dash-orb-1 {
  top: -120px; left: 8%;
  width: 500px; height: 500px;
  background: radial-gradient(circle, var(--dash-lime-glow) 0%, rgba(163,230,53,0.05) 50%, transparent 75%);
  animation: dashFloat 10s ease-in-out infinite alternate;
}
.dash-orb-2 {
  bottom: -120px; right: 8%;
  width: 450px; height: 450px;
  background: radial-gradient(circle, rgba(96,165,250,0.16) 0%, transparent 70%);
  animation: dashFloat 13s ease-in-out infinite alternate-reverse;
}
@keyframes dashFloat {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(40px, 40px) scale(1.15); }
}

.dash-page {
  position: relative;
  z-index: 10;
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

.dash-tag {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 0.7rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--dash-lime);
  background: var(--dash-lime-subtle);
  border: 1px solid rgba(163, 230, 53, 0.3);
  padding: 5px 12px; border-radius: 9999px;
  width: fit-content;
  margin-bottom: 14px;
}
.dash-pulse {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--dash-lime);
  box-shadow: 0 0 10px var(--dash-lime);
  animation: dashPulse 1.5s infinite;
}
@keyframes dashPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.4; transform: scale(0.8); }
}

.dash-title {
  font-size: clamp(2rem, 4.5vw, 3.2rem);
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.035em;
  color: #fff;
  margin: 0 0 14px;
}
.dash-title span { color: var(--dash-lime); text-shadow: 0 0 30px var(--dash-lime-glow); }
.dash-subtitle {
  font-size: 1rem;
  color: var(--dash-muted);
  max-width: 620px;
  line-height: 1.6;
  margin-bottom: 32px;
}

.dash-ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 40px;
}
.dash-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, var(--dash-lime), var(--dash-lime-bright));
  color: #000;
  padding: 13px 24px;
  border-radius: 14px;
  font-size: 0.9rem;
  font-weight: 800;
  text-decoration: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 8px 24px -6px rgba(163, 230, 53, 0.5);
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.dash-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px -6px rgba(163, 230, 53, 0.7);
}
.dash-btn-ghost {
  display: inline-flex; align-items: center; gap: 8px;
  background: transparent;
  color: #fff;
  border: 1px solid var(--dash-border);
  padding: 13px 24px;
  border-radius: 14px;
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.22s;
}
.dash-btn-ghost:hover {
  border-color: var(--dash-lime);
  color: var(--dash-lime);
  background: var(--dash-lime-subtle);
}

.dash-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 40px;
}
.dash-stat {
  background: var(--dash-card);
  border: 1px solid var(--dash-border);
  border-radius: 20px;
  padding: 22px;
  transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
  animation: dashCardIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.dash-stat:nth-child(1) { animation-delay: 0.10s; }
.dash-stat:nth-child(2) { animation-delay: 0.18s; }
.dash-stat:nth-child(3) { animation-delay: 0.26s; }
.dash-stat:hover {
  transform: translateY(-3px);
  border-color: rgba(163, 230, 53, 0.4);
  box-shadow: 0 16px 30px -12px rgba(0,0,0,0.9), 0 0 24px rgba(163,230,53,0.12);
}
.dash-stat-icon {
  font-size: 1.6rem;
  margin-bottom: 12px;
  line-height: 1;
}
.dash-stat-label {
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--dash-dim);
}
.dash-stat-value {
  font-size: 2rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.03em;
  line-height: 1;
  margin-top: 8px;
}
.dash-stat-value.accent { color: var(--dash-lime); }

.dash-section-head {
  display: flex; justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.dash-section-title {
  font-size: 1.35rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.02em;
  margin: 0;
}
.dash-section-title span { color: var(--dash-lime); }
.dash-section-link {
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--dash-lime);
  text-decoration: none;
  transition: color 0.2s;
}
.dash-section-link:hover { color: var(--dash-lime-bright); }

.dash-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.dash-trip {
  background: var(--dash-card);
  border: 1px solid var(--dash-border);
  border-radius: 20px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.25s, box-shadow 0.25s;
  animation: dashCardIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.dash-trip:hover {
  transform: translateY(-4px);
  border-color: rgba(163, 230, 53, 0.45);
  box-shadow: 0 16px 30px -12px rgba(0,0,0,0.9), 0 0 24px rgba(163,230,53,0.16);
}
.dash-trip-img {
  aspect-ratio: 4 / 3;
  background: #000;
  overflow: hidden;
}
.dash-trip-img img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.5s ease;
}
.dash-trip:hover .dash-trip-img img { transform: scale(1.06); }
.dash-trip-body {
  padding: 16px 18px;
}
.dash-trip-name {
  font-size: 1rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.01em;
  line-height: 1.2;
  margin: 0 0 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dash-trip-meta {
  font-size: 0.75rem;
  color: var(--dash-muted);
  font-weight: 600;
}

@keyframes dashCardIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .dash-orb-1, .dash-orb-2, .dash-pulse,
  .dash-stat, .dash-trip { animation: none !important; }
}
```

### frontend/src/pages/Dashboard.jsx

```
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

const formatINR = (value) => {
  const n = Number(value) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
};

const DashboardSkeleton = () => (
  <div className="dash-root">
    <div className="dash-orb-1" />
    <div className="dash-orb-2" />
    <div className="dash-page">
      <Skeleton variant="text" width={130} height={14} />
      <div style={{ marginTop: 12 }}>
        <Skeleton variant="rectangular" width="55%" height={48} rounded="12px" />
      </div>
      <div style={{ marginTop: 20 }}>
        <Skeleton variant="text" width="80%" height={16} />
      </div>
      <div className="dash-ctas">
        <Skeleton variant="rectangular" width={180} height={48} rounded="14px" />
        <Skeleton variant="rectangular" width={170} height={48} rounded="14px" />
      </div>
      <div className="dash-stats">
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ padding: 22 }}>
            <Skeleton variant="circular" width={30} height={30} />
            <div style={{ marginTop: 14 }}>
              <Skeleton variant="text" width="60%" height={12} />
            </div>
            <div style={{ marginTop: 10 }}>
              <Skeleton variant="rectangular" width="40%" height={28} rounded="6px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/trips")
      .then((r) => setTrips(r.data || []))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  const totalBudget = trips.reduce((sum, t) => sum + (Number(t.budget) || 0), 0);
  const upcomingTrips = trips.filter((t) => new Date(t.startDate) > new Date()).length;

  const recentTrips = [...trips]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  return (
    <div className="dash-root">
      <div className="dash-orb-1" />
      <div className="dash-orb-2" />

      <main className="dash-page">
        <div className="dash-tag">
          <span className="dash-pulse" />
          Welcome back
        </div>

        <h1 className="dash-title">
          Hey {user?.name?.split(" ")[0] || "traveller"} <span>👋</span>
        </h1>
        <p className="dash-subtitle">
          Ready to plan your next adventure? Let AI handle the details.
        </p>

        <div className="dash-ctas">
          <Link to="/trips/new" className="dash-btn-primary">
            ✨ Create a Trip
          </Link>
          <Link to="/trips" className="dash-btn-ghost">
            View My Trips
          </Link>
        </div>

        <div className="dash-stats">
          <div className="dash-stat">
            <div className="dash-stat-icon">🗺️</div>
            <div className="dash-stat-label">Total Trips</div>
            <div className="dash-stat-value">{trips.length}</div>
          </div>

          <div className="dash-stat">
            <div className="dash-stat-icon">💰</div>
            <div className="dash-stat-label">Total Budget</div>
            <div className="dash-stat-value accent">
              {formatINR(totalBudget)}
            </div>
          </div>

          <div className="dash-stat">
            <div className="dash-stat-icon">📅</div>
            <div className="dash-stat-label">Upcoming Trips</div>
            <div className="dash-stat-value">{upcomingTrips}</div>
          </div>
        </div>

        {recentTrips.length > 0 && (
          <section>
            <div className="dash-section-head">
              <h2 className="dash-section-title">
                Recent <span>Trips</span>
              </h2>
              <Link to="/trips" className="dash-section-link">
                View all →
              </Link>
            </div>

            <div className="dash-grid">
              {recentTrips.map((t) => {
                const days = Math.max(
                  1,
                  Math.round(
                    (new Date(t.endDate) - new Date(t.startDate)) / (1000 * 60 * 60 * 24)
                  )
                );
                return (
                  <Link key={t._id} to={`/trips/${t._id}`} className="dash-trip">
                    <div className="dash-trip-img">
                      <img
                        src={t.image || `https://picsum.photos/seed/${encodeURIComponent(t.destination)}/600/450`}
                        alt={t.destination}
                        onError={(e) => {
                          e.target.src = `https://picsum.photos/seed/${encodeURIComponent(t.destination)}/600/450`;
                        }}
                      />
                    </div>
                    <div className="dash-trip-body">
                      <h3 className="dash-trip-name">{t.destination}</h3>
                      <p className="dash-trip-meta">
                        {days} Day{days > 1 ? "s" : ""} · {formatINR(t.budget)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
```

### frontend/src/pages/EditTrip.css

```
/* frontend/src/pages/EditTrip.css */

.et-root {
  --et-bg: #050505;
  --et-card: #111111;
  --et-border: rgba(255, 255, 255, 0.1);
  --et-muted: #888888;
  --et-dim: #52525b;
  --et-lime: #a3e635;
  --et-lime-bright: #bef264;
  --et-lime-glow: rgba(163, 230, 53, 0.4);
  --et-lime-subtle: rgba(163, 230, 53, 0.12);
  background: var(--et-bg);
  color: #fff;
  min-height: 100vh;
  font-family: 'Poppins', system-ui, sans-serif;
  overflow-x: hidden;
  position: relative;
  padding: 48px 24px 80px;
}
.et-orb-1, .et-orb-2 {
  position: fixed;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.et-orb-1 {
  top: -120px; left: 8%;
  width: 500px; height: 500px;
  background: radial-gradient(circle, var(--et-lime-glow) 0%, rgba(163,230,53,0.05) 50%, transparent 75%);
  animation: etFloat 10s ease-in-out infinite alternate;
}
.et-orb-2 {
  bottom: -120px; right: 8%;
  width: 450px; height: 450px;
  background: radial-gradient(circle, rgba(96,165,250,0.16) 0%, transparent 70%);
  animation: etFloat 13s ease-in-out infinite alternate-reverse;
}
@keyframes etFloat {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(40px, 40px) scale(1.15); }
}

.et-page {
  position: relative;
  z-index: 10;
  max-width: 780px;
  margin: 0 auto;
}

.et-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--et-muted);
  text-decoration: none;
  transition: color 0.2s;
  margin-bottom: 24px;
  font-weight: 600;
}
.et-back:hover { color: var(--et-lime); }

.et-title {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: #fff;
  margin: 0 0 14px;
}
.et-title span { color: var(--et-lime); text-shadow: 0 0 30px var(--et-lime-glow); }

.et-subtitle {
  font-size: 0.95rem;
  color: var(--et-muted);
  line-height: 1.6;
  margin-bottom: 40px;
  max-width: 620px;
}

.et-error {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fecaca;
  padding: 12px 16px;
  border-radius: 14px;
  margin-bottom: 24px;
  font-size: 0.88rem;
}

.et-form {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.et-field { position: relative; }
.et-label {
  display: block;
  font-size: 1.05rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 12px;
  letter-spacing: -0.01em;
}
.et-hint {
  font-size: 0.82rem;
  color: var(--et-muted);
  margin: -6px 0 14px;
  line-height: 1.5;
}
.et-sublabel {
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--et-dim);
  margin-bottom: 8px;
}

.et-input {
  width: 100%;
  background: #000;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 14px 16px;
  color: #fff;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  transition: border-color 0.2s, box-shadow 0.2s;
  color-scheme: dark;
}
.et-input::placeholder { color: var(--et-dim); font-weight: 500; }
.et-input:focus {
  outline: none;
  border-color: var(--et-lime);
  box-shadow: 0 0 0 3px rgba(163, 230, 53, 0.15);
}

.et-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 640px) {
  .et-row { grid-template-columns: 1fr; }
}

.et-suggestions {
  position: absolute;
  left: 0; right: 0;
  top: 100%;
  margin-top: 6px;
  background: #0b0b0b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  box-shadow: 0 20px 60px -20px rgba(0, 0, 0, 0.9);
  max-height: 288px;
  overflow-y: auto;
  z-index: 50;
}
.et-suggestion {
  width: 100%;
  text-align: left;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #d4d4d8;
  font-family: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.et-suggestion:last-child { border-bottom: none; }
.et-suggestion:hover {
  background: rgba(163, 230, 53, 0.08);
  color: var(--et-lime);
}

.et-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.et-chip {
  padding: 8px 16px;
  border-radius: 9999px;
  border: 2px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: var(--et-muted);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
}
.et-chip:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
}
.et-chip.active {
  border-color: var(--et-lime);
  background: var(--et-lime-subtle);
  color: var(--et-lime);
}

.et-spots-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.et-spots-input {
  width: 130px;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 900;
}
.et-spots-hint {
  font-size: 0.85rem;
  color: var(--et-muted);
  font-weight: 500;
}

.et-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 12px;
}
@media (max-width: 480px) {
  .et-actions { flex-direction: column-reverse; }
  .et-actions > * { width: 100%; justify-content: center; }
}

.et-btn {
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 800;
  padding: 13px 26px;
  border-radius: 14px;
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  text-decoration: none;
  white-space: nowrap;
}
.et-btn-primary {
  background: linear-gradient(135deg, var(--et-lime), var(--et-lime-bright));
  color: #000;
  box-shadow: 0 8px 24px -6px rgba(163, 230, 53, 0.5);
}
.et-btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px -6px rgba(163, 230, 53, 0.7);
}
.et-btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}
.et-btn-ghost {
  background: transparent;
  color: var(--et-muted);
  border: 1px solid var(--et-border);
}
.et-btn-ghost:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.04);
}

.et-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--et-bg);
}
.et-spinner {
  width: 32px; height: 32px;
  border: 4px solid var(--et-lime);
  border-top-color: transparent;
  border-radius: 50%;
  animation: etSpin 0.8s linear infinite;
}
@keyframes etSpin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .et-orb-1, .et-orb-2, .et-spinner { animation: none !important; }
}
```

### frontend/src/pages/EditTrip.jsx

```
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../api/axios";
import "./EditTrip.css";

const shortenAddress = (displayName) => {
  if (!displayName) return "";
  const parts = displayName.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 3) return parts.join(", ");
  const first = parts[0];
  const country = parts[parts.length - 1];
  const region = parts[parts.length - 2];
  const cleanRegion = /^\d+$/.test(region) ? parts[parts.length - 3] : region;
  return [first, cleanRegion, country].filter(Boolean).join(", ");
};

const EditTrip = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [travellers, setTravellers] = useState(1);
  const [spotsCount, setSpotsCount] = useState(5);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    const loadTrip = async () => {
      try {
        const res = await api.get(`/trips/${id}`);
        const t = res.data;
        setDestination(t.destination || "");
        setStartDate(t.startDate ? t.startDate.split("T")[0] : "");
        setEndDate(t.endDate ? t.endDate.split("T")[0] : "");
        setBudget(t.budget ? String(t.budget) : "");
        setTravellers(t.travellers || 1);
        setSpotsCount(t.spotsCount || 5);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load trip");
      } finally {
        setLoading(false);
      }
    };
    loadTrip();
  }, [id]);

  useEffect(() => {
    if (destination.length < 3) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
            destination
          )}`,
          { headers: { "User-Agent": "AI-Travel-Planner/1.0" } }
        );
        const data = await res.json();
        setSuggestions(data.map((d) => ({ name: d.display_name })));
      } catch {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [destination]);

  useEffect(() => {
    const handler = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!destination || !startDate || !endDate || !budget || !travellers) {
      return setError("Please fill all fields");
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return setError("End date must be after start date");
    }
    if (spotsCount < 1 || spotsCount > 50) {
      return setError("Places count must be between 1 and 50");
    }

    try {
      setSaving(true);
      await api.put(`/trips/${id}`, {
        destination: shortenAddress(destination) || destination,
        startDate,
        endDate,
        budget: Number(budget),
        travellers: Number(travellers),
        spotsCount: Number(spotsCount),
      });
      navigate(`/trips/${id}?autoGen=1`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not update trip");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="et-loading">
        <div className="et-spinner" />
      </div>
    );
  }

  return (
    <div className="et-root">
      <div className="et-orb-1" />
      <div className="et-orb-2" />

      <div className="et-page">
        <Link to={`/trips/${id}`} className="et-back">
          ← Back to trip
        </Link>

        <h1 className="et-title">
          Edit your <span>trip</span> 
        </h1>
        <p className="et-subtitle">
          Update the details of your trip. Saving will regenerate the AI
          itinerary with your new preferences.
        </p>

        {error && <p className="et-error">{error}</p>}

        <form onSubmit={handleSubmit} className="et-form">
          {/* Destination */}
          <div ref={suggestionsRef} className="et-field" style={{ zIndex: 30 }}>
            <label className="et-label">Destination</label>
            <input
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search a city..."
              className="et-input"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="et-suggestions">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDestination(shortenAddress(s.name));
                      setShowSuggestions(false);
                    }}
                    className="et-suggestion"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="et-field" style={{ zIndex: 10 }}>
            <label className="et-label">Trip dates</label>
            <div className="et-row">
              <div>
                <span className="et-sublabel">Start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="et-input"
                />
              </div>
              <div>
                <span className="et-sublabel">End date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="et-input"
                />
              </div>
            </div>
          </div>

          {/* Places count */}
          <div className="et-field" style={{ zIndex: 10 }}>
            <label className="et-label">
              How many places do you want to visit?
            </label>
            <p className="et-hint">
              Total distinct spots within your destination. For example, 5 cities
              across Rajasthan, or 8 must-see spots in Tokyo.
            </p>

            <div className="et-chips">
              {[3, 5, 7, 10, 15].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSpotsCount(n)}
                  className={`et-chip ${spotsCount === n ? "active" : ""}`}
                >
                  {n} places
                </button>
              ))}
            </div>

            <div className="et-spots-row">
              <input
                type="number"
                min="1"
                max="50"
                value={spotsCount}
                onChange={(e) => setSpotsCount(Number(e.target.value) || 1)}
                className="et-input et-spots-input"
              />
              <span className="et-spots-hint">places (custom — 1 to 50)</span>
            </div>
          </div>

          {/* Budget + travellers */}
          <div className="et-field" style={{ zIndex: 10 }}>
            <div className="et-row">
              <div>
                <label className="et-label">Budget (INR)</label>
                <input
                  type="number"
                  min="0"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="25000"
                  className="et-input"
                />
              </div>
              <div>
                <label className="et-label">Travellers</label>
                <input
                  type="number"
                  min="1"
                  value={travellers}
                  onChange={(e) => setTravellers(e.target.value)}
                  className="et-input"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="et-actions">
            <Link to={`/trips/${id}`} className="et-btn et-btn-ghost">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="et-btn et-btn-primary"
            >
              {saving ? "Saving..." : "Save & Regenerate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTrip;
```

### frontend/src/pages/JournalTrips.css

```
/* frontend/src/pages/JournalTrips.css */

.jt-root {
  --jt-bg: #050505;
  --jt-card: #111111;
  --jt-border: rgba(255, 255, 255, 0.1);
  --jt-muted: #888888;
  --jt-dim: #52525b;
  --jt-lime: #a3e635;
  --jt-lime-bright: #bef264;
  --jt-lime-glow: rgba(163, 230, 53, 0.4);
  --jt-lime-subtle: rgba(163, 230, 53, 0.12);
  background: var(--jt-bg);
  color: #fff;
  min-height: 100vh;
  font-family: 'Poppins', system-ui, sans-serif;
  overflow-x: hidden;
  position: relative;
}

.jt-orb-1, .jt-orb-2 {
  position: fixed;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.jt-orb-1 {
  top: -120px; left: 8%;
  width: 500px; height: 500px;
  background: radial-gradient(circle, var(--jt-lime-glow) 0%, rgba(163,230,53,0.05) 50%, transparent 75%);
  animation: jtFloat 10s ease-in-out infinite alternate;
}
.jt-orb-2 {
  bottom: -120px; right: 8%;
  width: 450px; height: 450px;
  background: radial-gradient(circle, rgba(96,165,250,0.18) 0%, transparent 70%);
  animation: jtFloat 13s ease-in-out infinite alternate-reverse;
}
@keyframes jtFloat {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(40px, 40px) scale(1.15); }
}

.jt-page {
  position: relative;
  z-index: 10;
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

.jt-header {
  display: flex; flex-direction: column; gap: 14px;
  margin-bottom: 36px;
}
.jt-tag {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 0.7rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--jt-lime);
  background: var(--jt-lime-subtle);
  border: 1px solid rgba(163, 230, 53, 0.3);
  padding: 5px 12px; border-radius: 9999px;
  width: fit-content;
}
.jt-pulse {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--jt-lime);
  box-shadow: 0 0 10px var(--jt-lime);
  animation: jtPulse 1.5s infinite;
}
@keyframes jtPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}
.jt-title {
  font-size: clamp(1.9rem, 4.2vw, 3rem);
  font-weight: 900; line-height: 1.05;
  letter-spacing: -0.035em; color: #fff;
}
.jt-title span { color: var(--jt-lime); text-shadow: 0 0 30px var(--jt-lime-glow); }
.jt-subtitle {
  font-size: 0.95rem; color: var(--jt-muted);
  max-width: 640px; line-height: 1.6;
}

.jt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
  margin-bottom: 40px;
}

.jt-card {
  background: var(--jt-card);
  border: 1px solid var(--jt-border);
  border-radius: 20px;
  padding: 22px 20px;
  text-decoration: none;
  color: inherit;
  display: flex; flex-direction: column; gap: 10px;
  transition: transform 0.25s cubic-bezier(0.16,1,0.3,1),
              border-color 0.25s, box-shadow 0.25s, background 0.25s;
  animation: jtCardIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes jtCardIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.jt-card:hover {
  transform: translateY(-5px);
  background: #181818;
  border-color: rgba(163, 230, 53, 0.5);
  box-shadow: 0 16px 30px -12px rgba(0,0,0,0.9),
              0 0 24px rgba(163,230,53,0.14);
}

.jt-card-thumb {
  width: 52px; height: 52px;
  border-radius: 14px;
  background: #000;
  border: 1px solid rgba(163, 230, 53, 0.4);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.6rem;
  overflow: hidden;
  flex-shrink: 0;
}
.jt-card-thumb img { width: 100%; height: 100%; object-fit: cover; }

.jt-card-name {
  font-size: 1.15rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.jt-card-meta {
  font-size: 0.78rem;
  color: var(--jt-muted);
  font-weight: 600;
}
.jt-card-warn { color: #fb923c; }
.jt-card-cta {
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--jt-lime);
  transition: color 0.2s;
}
.jt-card:hover .jt-card-cta { color: var(--jt-lime-bright); }

.jt-skeleton {
  background: linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%);
  background-size: 200% 100%;
  animation: jtShimmer 1.4s infinite;
  border-radius: 20px;
  min-height: 180px;
  border: 1px solid var(--jt-border);
}
@keyframes jtShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.jt-empty {
  text-align: center;
  padding: 70px 20px;
  border: 1px dashed rgba(255,255,255,0.12);
  border-radius: 24px;
  background: rgba(255,255,255,0.01);
}
.jt-empty-icon { font-size: 3rem; margin-bottom: 16px; opacity: 0.5; }
.jt-empty-title {
  font-size: 1.15rem; font-weight: 800; color: #fff;
  margin-bottom: 8px;
}
.jt-empty-text {
  font-size: 0.85rem; color: var(--jt-muted);
  max-width: 400px; margin: 0 auto 20px; line-height: 1.6;
}
.jt-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, var(--jt-lime), var(--jt-lime-bright));
  color: #000;
  padding: 11px 22px;
  border-radius: 14px;
  font-size: 0.85rem; font-weight: 800;
  text-decoration: none;
  box-shadow: 0 8px 24px -6px rgba(163, 230, 53, 0.5);
  transition: transform 0.2s, box-shadow 0.2s;
}
.jt-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px -6px rgba(163, 230, 53, 0.7);
}

.jt-footer {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  font-size: 0.75rem;
  color: var(--jt-dim);
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .jt-orb-1, .jt-orb-2, .jt-pulse, .jt-card { animation: none !important; }
}
```

### frontend/src/pages/JournalTrips.jsx

```
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import "./JournalTrips.css";

function pickEmoji(destination) {
  const t = (destination || "").toLowerCase();
  if (t.includes("bali") || t.includes("beach")) return "🏝️";
  if (t.includes("tokyo") || t.includes("japan")) return "🗼";
  if (t.includes("kyoto")) return "⛩️";
  if (t.includes("new york") || t.includes("nyc")) return "🗽";
  if (t.includes("paris") || t.includes("france")) return "🥐";
  if (t.includes("rome") || t.includes("italy")) return "🏛️";
  if (t.includes("iceland") || t.includes("reyk")) return "🌋";
  if (t.includes("marrakech") || t.includes("morocco")) return "🕌";
  if (t.includes("dubai")) return "🌇";
  if (t.includes("london")) return "🎡";
  if (t.includes("india") || t.includes("goa") || t.includes("delhi")) return "🛕";
  return "✈️";
}

function daysBetween(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
}

const JournalTrips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/trips");
        if (!cancelled) setTrips(res.data || []);
      } catch {
        if (!cancelled) setTrips([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="jt-root">
      <div className="jt-orb-1" />
      <div className="jt-orb-2" />

      <main className="jt-page">
        <header className="jt-header">
          <div className="jt-tag">
            <span className="jt-pulse" />
            Field Journal
          </div>
          <h1 className="jt-title">
            Trip <span>journals</span>
          </h1>
          <p className="jt-subtitle">
            Pick a trip to read its day-by-day journal. Toggle between zigzag
            and stream views, filter by category.
          </p>
        </header>

        {loading && (
          <div className="jt-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="jt-skeleton" />
            ))}
          </div>
        )}

        {!loading && trips.length === 0 && (
          <div className="jt-empty">
            <div className="jt-empty-icon">📓</div>
            <div className="jt-empty-title">No trips yet</div>
            <p className="jt-empty-text">
              Create a trip first, then come back to read its journal.
            </p>
            <Link to="/trips/new" className="jt-btn-primary">
              ✨ Create a trip
            </Link>
          </div>
        )}

        {!loading && trips.length > 0 && (
          <div className="jt-grid">
            {trips.map((trip) => {
              const days = daysBetween(trip.startDate, trip.endDate);
              const hasItinerary =
                Array.isArray(trip.itinerary) && trip.itinerary.length > 0;
              return (
                <Link
                  key={trip._id}
                  to={`/trips/${trip._id}/journal`}
                  className="jt-card"
                >
                  <div className="jt-card-thumb">
                    {trip.image ? (
                      <img
                        src={trip.image}
                        alt={trip.destination}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      pickEmoji(trip.destination)
                    )}
                  </div>
                  <div className="jt-card-name">{trip.destination}</div>
                  <div className="jt-card-meta">
                    {days} day{days === 1 ? "" : "s"}
                    {!hasItinerary && (
                      <span className="jt-card-warn"> · no itinerary yet</span>
                    )}
                  </div>
                  <div className="jt-card-cta">Open journal →</div>
                </Link>
              );
            })}
          </div>
        )}

        <footer className="jt-footer">
          <span>Two views · One journey</span>
          <span>AI Travel Planner © Journal</span>
        </footer>
      </main>
    </div>
  );
};

export default JournalTrips;
```

### frontend/src/pages/Landing.css

```
/* frontend/src/pages/Landing.css */

.lp-root {
  --lp-bg: #e9f1c1;
  --lp-bg-deep: #dfe9ad;
  --lp-ink: #111111;
  --lp-text: #1f2c0f;
  --lp-accent: #a4d14b;
  --lp-accent-lt: #b3dc52;
  --lp-accent-dk: #8bbf35;
  --lp-card: #ffffff;
  --lp-muted: #5f6b7a;
  --lp-soft: #7a8a6a;
  --lp-line: #d5e0b0;
  --lp-bar: #1c1c1c;
  --lp-bar-line: #333333;

  min-height: 100vh;
  background: var(--lp-bg);
  color: var(--lp-text);
  font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  position: relative;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
}

/* ═══════════ BACKGROUND SCENE ═══════════ */
.lp-bg-scene {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}
.lp-bg-scene > svg.lp-landscape {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: auto;
  min-height: 48vh;
  display: block;
}

.lp-sun {
  position: absolute;
  top: 8%;
  right: 6%;
  width: 140px;
  height: 140px;
  pointer-events: none;
  opacity: 0.45;
  z-index: 1;
}
.lp-sun svg {
  width: 100%;
  height: 100%;
  display: block;
  filter: drop-shadow(0 0 18px rgba(250, 204, 21, 0.12));
}
.lp-sun-rays {
  transform-origin: 50px 50px;
  animation: lpSunRays 40s linear infinite;
}
@keyframes lpSunRays {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.lp-sun-glow {
  transform-origin: 50px 50px;
  animation: lpSunGlow 4.5s ease-in-out infinite;
}
@keyframes lpSunGlow {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50%      { opacity: 0.55; transform: scale(1.08); }
}
.lp-sun-core {
  transform-origin: 50px 50px;
  animation: lpSunCore 4.5s ease-in-out infinite;
}
@keyframes lpSunCore {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
}

.lp-cloud {
  position: absolute;
  pointer-events: none;
  z-index: 1;
  opacity: 0.35;
}
.lp-cloud svg {
  width: 100%;
  height: 100%;
  display: block;
}
.lp-cloud-1 {
  top: 12%;
  left: -20%;
  width: 220px;
  height: 90px;
  animation: lpCloudDrift 60s linear infinite;
}
.lp-cloud-2 {
  top: 28%;
  left: -30%;
  width: 180px;
  height: 75px;
  animation: lpCloudDrift 80s linear infinite;
  animation-delay: -22s;
  opacity: 0.28;
}
@keyframes lpCloudDrift {
  0%   { transform: translateX(0); }
  100% { transform: translateX(140vw); }
}

.lp-birds {
  position: absolute;
  pointer-events: none;
  z-index: 2;
  opacity: 0.32;
}
.lp-birds svg {
  width: 100%;
  height: 100%;
  display: block;
}
.lp-birds-1 {
  top: 18%;
  left: -10%;
  width: 90px;
  height: 30px;
  animation: lpBirds1 48s linear infinite;
}
@keyframes lpBirds1 {
  0%   { transform: translateX(0) translateY(0); }
  50%  { transform: translateX(70vw) translateY(-25px); }
  100% { transform: translateX(140vw) translateY(-15px); }
}

.lp-sparkle {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.9), 0 0 24px rgba(250, 204, 21, 0.5);
  pointer-events: none;
  opacity: 0;
  z-index: 1;
}
.lp-sparkle.s1 { top: 18%; left: 22%; animation: lpSparkle 3.2s ease-in-out infinite; }
.lp-sparkle.s2 { top: 34%; left: 68%; animation: lpSparkle 4.1s ease-in-out infinite; animation-delay: 0.7s; }
.lp-sparkle.s3 { top: 12%; left: 82%; animation: lpSparkle 2.8s ease-in-out infinite; animation-delay: 1.4s; }
.lp-sparkle.s4 { top: 48%; left: 38%; animation: lpSparkle 5s ease-in-out infinite; animation-delay: 2.1s; }
@keyframes lpSparkle {
  0%, 100% { opacity: 0; transform: scale(0.4); }
  50%      { opacity: 1; transform: scale(1.3); }
}

/* ═══════════ TOPBAR ═══════════ */
.lp-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--lp-bar);
  width: 100%;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.15);
}
.lp-topbar-inner {
  max-width: 1280px;
  margin: 0 auto;
  height: 68px;
  padding: 0 clamp(16px, 3vw, 32px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.lp-brand {
  display: flex;
  align-items: center;
  text-decoration: none;
  flex: none;
}
.lp-brand-name {
  color: #fff;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  white-space: nowrap;
}
.lp-brand-name .lp-brand-accent {
  color: var(--lp-accent);
}

.lp-mainnav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  justify-content: center;
}
.lp-mainnav a {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #9d9d9d;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.18s ease, background 0.18s ease;
}
.lp-mainnav a:hover { color: #fff; background: rgba(255, 255, 255, 0.06); }

.lp-user {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}
.lp-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--lp-accent);
  color: #12200a;
  display: grid;
  place-items: center;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  flex: none;
  text-decoration: none;
}
.lp-btn-logout {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--lp-bar-line);
  background: transparent;
  color: #cfcfcf;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}
.lp-btn-logout:hover {
  background: #2a2a2a;
  color: #fff;
  border-color: #454545;
}

.lp-auth-cta {
  padding: 8px 18px;
  border-radius: 8px;
  background: var(--lp-accent);
  color: #12200a;
  font-size: 0.85rem;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.18s;
}
.lp-auth-cta:hover { background: var(--lp-accent-lt); }
.lp-auth-login {
  padding: 8px 16px;
  border-radius: 8px;
  color: #cfcfcf;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.18s;
}
.lp-auth-login:hover { color: #fff; }

/* ═══════════ HERO ═══════════ */
.lp-main {
  position: relative;
  z-index: 2;
  flex: 1;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: clamp(60px, 10vh, 120px) clamp(20px, 4vw, 48px) clamp(80px, 12vh, 140px);
  text-align: center;
}

.lp-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(17, 17, 17, 0.08);
  border: 1px solid rgba(17, 17, 17, 0.12);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--lp-ink);
  text-transform: uppercase;
  margin-bottom: 24px;
  animation: lpFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.lp-hero-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--lp-accent-dk);
  box-shadow: 0 0 8px var(--lp-accent-dk);
  animation: lpBadgePulse 1.5s infinite;
}
@keyframes lpBadgePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.4; transform: scale(0.8); }
}

.lp-headline {
  margin: 0 auto;
  max-width: 24ch;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: clamp(2.4rem, 7vw, 5.4rem);
  font-weight: 900;
  line-height: 1.06;
  letter-spacing: -0.045em;
  color: var(--lp-ink);
}

.lp-headline-line {
  display: block;
  color: var(--lp-ink);
  animation: focusInExpandFwd 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}
.lp-headline-accent {
  color: var(--lp-accent-dk);
  animation: blurContractBck 0.65s 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}
.lp-headline-rotate {
  display: inline-block;
  position: relative;
  min-height: 1.1em;
  width: 100%;
  text-align: center;
}
.lp-rotator {
  display: inline-block;
  font-weight: 900;
  letter-spacing: -0.045em;
  color: var(--lp-accent-dk);
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1),
              filter 0.4s ease;
  transform-origin: center bottom;
  animation: lpHeadlineIn 0.45s 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.lp-rotator.out {
  opacity: 0;
  transform: translateY(-18px) rotateX(60deg);
  filter: blur(5px);
}

@keyframes focusInExpandFwd {
  0%   { letter-spacing: -0.5em; filter: blur(12px); opacity: 0; }
  60%  { filter: blur(4px); opacity: 0.85; }
  100% { letter-spacing: -0.045em; filter: blur(0); opacity: 1; }
}
@keyframes blurContractBck {
  0%   { letter-spacing: 0.35em; transform: translateZ(400px) scale(1.4); filter: blur(14px); opacity: 0; }
  60%  { transform: translateZ(60px) scale(1.08); filter: blur(5px); opacity: 0.85; }
  100% { letter-spacing: -0.045em; transform: translateZ(0) scale(1); filter: blur(0); opacity: 1; }
}
@keyframes lpHeadlineIn {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}

.lp-sub {
  margin: clamp(22px, 3vh, 32px) auto 0;
  max-width: 620px;
  font-size: clamp(1rem, 1.5vw, 1.15rem);
  line-height: 1.6;
  font-weight: 500;
  color: var(--lp-muted);
  animation: lpFadeIn 0.5s 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.lp-hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
  margin-top: clamp(30px, 4vh, 44px);
  animation: lpFadeIn 0.5s 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.lp-cta {
  display: inline-block;
  padding: 18px 44px;
  border: none;
  border-radius: 999px;
  background: var(--lp-accent);
  color: #12200a;
  font-family: inherit;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow:
    0 16px 32px -10px rgba(164, 209, 75, 0.95),
    0 2px 0 0 rgba(255, 255, 255, 0.45) inset;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
  text-decoration: none;
}
.lp-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 42px -12px rgba(164, 209, 75, 1);
}
.lp-cta:active { transform: translateY(0); }

.lp-cta-ghost {
  display: inline-flex;
  align-items: center;
  padding: 18px 32px;
  border-radius: 999px;
  background: transparent;
  color: var(--lp-ink);
  border: 2px solid rgba(17, 17, 17, 0.15);
  font-family: inherit;
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.22s ease;
}
.lp-cta-ghost:hover {
  border-color: var(--lp-ink);
  background: rgba(17, 17, 17, 0.04);
  transform: translateY(-2px);
}

.lp-features-inline {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 22px clamp(28px, 4vw, 60px);
  margin: clamp(46px, 7vh, 74px) 0 0;
  padding: 0;
  list-style: none;
  animation: lpFadeIn 0.5s 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.lp-features-inline li {
  display: flex;
  align-items: center;
  gap: 11px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--lp-ink);
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.lp-check {
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--lp-accent);
  display: grid;
  place-items: center;
  box-shadow: 0 4px 10px -4px rgba(164, 209, 75, 0.85);
}
.lp-check svg { width: 13px; height: 13px; }

@keyframes lpFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ═══════════ SECTIONS ═══════════ */
.lp-section {
  position: relative;
  z-index: 2;
  padding: clamp(60px, 9vh, 100px) clamp(20px, 4vw, 48px);
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.lp-section:nth-of-type(even) {
  background: rgba(255, 255, 255, 0.75);
}

.lp-section-inner {
  max-width: 1180px;
  margin: 0 auto;
}

.lp-section-head {
  text-align: center;
  margin-bottom: clamp(40px, 6vh, 70px);
}
.lp-section-tag {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--lp-accent-dk);
  background: rgba(164, 209, 75, 0.18);
  border: 1px solid rgba(164, 209, 75, 0.4);
  padding: 6px 14px;
  border-radius: 9999px;
  margin-bottom: 16px;
}
.lp-section-title {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--lp-ink);
  margin: 0 0 14px;
}
.lp-section-title span {
  color: var(--lp-accent-dk);
}
.lp-section-sub {
  font-size: 1.05rem;
  color: var(--lp-muted);
  max-width: 620px;
  margin: 0 auto;
  line-height: 1.6;
}

/* ═══════════ STEPS ═══════════ */
.lp-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}
.lp-step {
  padding: 32px 28px;
  background: #fff;
  border: 1px solid rgba(17, 17, 17, 0.08);
  border-radius: 24px;
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.28s ease, border-color 0.28s ease;
}
.lp-step:hover {
  transform: translateY(-4px);
  border-color: rgba(164, 209, 75, 0.55);
  box-shadow: 0 20px 40px -16px rgba(0, 0, 0, 0.15);
}
.lp-step-num {
  display: inline-block;
  font-size: 2.4rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: var(--lp-accent-dk);
  line-height: 1;
  margin-bottom: 18px;
}
.lp-step-title {
  font-size: 1.15rem;
  font-weight: 900;
  color: var(--lp-ink);
  letter-spacing: -0.02em;
  margin: 0 0 8px;
}
.lp-step-desc {
  font-size: 0.9rem;
  color: var(--lp-muted);
  line-height: 1.6;
  margin: 0;
}

/* ═══════════ FEATURES GRID ═══════════ */
.lp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
}
.lp-feature {
  padding: 28px 26px;
  background: #fff;
  border: 1px solid rgba(17, 17, 17, 0.08);
  border-radius: 24px;
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.28s ease, border-color 0.28s ease;
}
.lp-feature:hover {
  transform: translateY(-4px);
  border-color: rgba(164, 209, 75, 0.55);
  box-shadow: 0 20px 40px -16px rgba(0, 0, 0, 0.15);
}
.lp-feature-icon {
  font-size: 2rem;
  line-height: 1;
  margin-bottom: 16px;
}
.lp-feature-title {
  font-size: 1.05rem;
  font-weight: 900;
  color: var(--lp-ink);
  letter-spacing: -0.01em;
  margin: 0 0 8px;
}
.lp-feature-desc {
  font-size: 0.88rem;
  color: var(--lp-muted);
  line-height: 1.6;
  margin: 0;
}

/* ═══════════ PREVIEW ═══════════ */
.lp-preview {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 40px;
  align-items: center;
}
@media (max-width: 900px) {
  .lp-preview { grid-template-columns: 1fr; gap: 30px; }
}

.lp-preview-window {
  background: #0b0b0b;
  border-radius: 20px;
  overflow: hidden;
  box-shadow:
    0 30px 60px -20px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}
.lp-preview-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: #111;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.lp-preview-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.lp-preview-dot.r { background: #ff5f57; }
.lp-preview-dot.y { background: #febc2e; }
.lp-preview-dot.g { background: #28c840; }
.lp-preview-url {
  margin-left: 12px;
  font-family: 'Roboto Mono', ui-monospace, monospace;
  font-size: 0.7rem;
  color: #6b7280;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.lp-preview-body { padding: 20px; }
.lp-preview-hero {
  position: relative;
  aspect-ratio: 21 / 9;
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 14px;
  background: linear-gradient(135deg, #a3e635, #8bbf35);
}
.lp-preview-hero-img {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.4), transparent 40%),
    radial-gradient(circle at 70% 60%, rgba(255, 255, 255, 0.25), transparent 45%);
}
.lp-preview-hero-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 16px;
  background: linear-gradient(180deg, transparent 40%, rgba(0, 0, 0, 0.6) 100%);
}
.lp-preview-pill {
  display: inline-block;
  align-self: flex-start;
  padding: 4px 10px;
  background: #a3e635;
  color: #000;
  font-size: 0.65rem;
  font-weight: 800;
  border-radius: 6px;
  margin-bottom: 8px;
}
.lp-preview-hero-overlay h3 {
  color: #fff;
  font-size: 1.15rem;
  font-weight: 900;
  margin: 0;
  letter-spacing: -0.02em;
}

.lp-preview-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.lp-preview-card {
  display: flex;
  gap: 8px;
  padding: 10px;
  background: #151515;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  align-items: center;
}
.lp-preview-card-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}
.lp-preview-card-label {
  font-size: 0.6rem;
  color: #52525b;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.lp-preview-card-text {
  font-size: 0.7rem;
  color: #fff;
  font-weight: 700;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lp-preview-info {
  padding: 8px 0;
}
.lp-preview-info-title {
  font-size: 1.35rem;
  font-weight: 900;
  color: var(--lp-ink);
  letter-spacing: -0.02em;
  margin: 0 0 20px;
}
.lp-preview-list {
  list-style: none;
  padding: 0;
  margin: 0 0 28px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lp-preview-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--lp-ink);
}
.lp-preview-list li span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(164, 209, 75, 0.18);
  border: 1px solid rgba(164, 209, 75, 0.35);
  font-size: 1rem;
  flex-shrink: 0;
}

/* ═══════════ STATS ═══════════ */
.lp-stats-section {
  padding: clamp(40px, 6vh, 70px) clamp(20px, 4vw, 48px);
}
.lp-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  text-align: center;
}
.lp-stat {
  padding: 24px 16px;
}
.lp-stat-value {
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  color: var(--lp-ink);
  line-height: 1;
  margin-bottom: 8px;
}
.lp-stat-label {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--lp-muted);
}

/* ═══════════ CTA CARD ═══════════ */
.lp-cta-section {
  padding-bottom: clamp(80px, 12vh, 130px);
}
.lp-cta-card {
  text-align: center;
  background: var(--lp-ink);
  color: var(--lp-bg);
  padding: clamp(50px, 8vh, 80px) clamp(28px, 5vw, 60px);
  border-radius: 32px;
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.35);
}
.lp-cta-title {
  font-size: clamp(1.6rem, 3.4vw, 2.5rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--lp-bg);
  margin: 0 0 14px;
}
.lp-cta-sub {
  font-size: 1rem;
  opacity: 0.75;
  max-width: 520px;
  margin: 0 auto 28px;
  line-height: 1.6;
}
.lp-cta-card .lp-cta {
  box-shadow: 0 16px 32px -10px rgba(164, 209, 75, 0.6);
}

/* ═══════════ FOOTER ═══════════ */
.lp-footer {
  position: relative;
  z-index: 2;
  background: var(--lp-ink);
  color: var(--lp-bg);
  padding: 56px 32px 24px;
}
.lp-footer-content {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 40px;
}
.lp-footer-brand h3 {
  color: var(--lp-accent);
  font-size: 1.35rem;
  font-weight: 800;
  margin-bottom: 10px;
  letter-spacing: -0.02em;
}
.lp-footer-brand p {
  font-size: 0.9rem;
  opacity: 0.7;
  max-width: 320px;
  line-height: 1.55;
}
.lp-footer-links {
  display: flex;
  gap: 56px;
  flex-wrap: wrap;
}
.lp-footer-column h4 {
  font-size: 0.95rem;
  margin-bottom: 16px;
  color: var(--lp-accent);
  font-weight: 800;
  letter-spacing: 0.02em;
}
.lp-footer-column ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.lp-footer-column li { margin-bottom: 10px; }
.lp-footer-column a,
.lp-footer-column span {
  color: var(--lp-bg);
  text-decoration: none;
  font-size: 0.88rem;
  opacity: 0.75;
  transition: opacity 0.2s, color 0.2s;
}
.lp-footer-column a:hover {
  opacity: 1;
  color: var(--lp-accent);
}
.lp-footer-column span {
  opacity: 0.55;
  cursor: default;
}
.lp-footer-bottom {
  max-width: 1100px;
  margin: 40px auto 0;
  padding-top: 22px;
  border-top: 1px solid rgba(233, 241, 193, 0.18);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 0.82rem;
  opacity: 0.65;
  color: var(--lp-bg);
}

/* ═══════════ RESPONSIVE ═══════════ */
@media (max-width: 1024px) {
  .lp-mainnav a { padding: 8px 13px; font-size: 0.86rem; }
  .lp-mainnav { gap: 2px; }
}

@media (max-width: 860px) {
  .lp-mainnav { display: none; }
  .lp-topbar-inner { justify-content: space-between; }
}

@media (max-width: 768px) {
  .lp-headline { max-width: 20ch; font-size: clamp(2.1rem, 9vw, 3.4rem); }
  .lp-footer { padding: 44px 24px 20px; }
  .lp-footer-content { flex-direction: column; gap: 28px; }
  .lp-footer-links { flex-direction: column; gap: 28px; }
  .lp-footer-bottom { flex-direction: column; text-align: center; justify-content: center; }
  .lp-preview-cards { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .lp-hero-actions { flex-direction: column; align-items: stretch; }
  .lp-cta, .lp-cta-ghost { width: 100%; justify-content: center; text-align: center; }
  .lp-features-inline { flex-direction: column; align-items: flex-start; max-width: 320px; margin-left: auto; margin-right: auto; gap: 16px; }
  .lp-features-inline li { white-space: normal; }
  .lp-sun { width: 90px; height: 90px; }
  .lp-cloud-1 { width: 150px; height: 60px; }
  .lp-cloud-2 { width: 120px; height: 50px; }
  .lp-sparkle { display: none; }
  .lp-btn-logout { display: none; }
}

/* ═══════════ REDUCED MOTION ═══════════ */
@media (prefers-reduced-motion: reduce) {
  .lp-sun-rays,
  .lp-sun-glow,
  .lp-sun-core,
  .lp-cloud,
  .lp-birds,
  .lp-sparkle,
  .lp-hero-badge-dot,
  .lp-rotator,
  .lp-headline-line,
  .lp-headline-accent,
  .lp-sub,
  .lp-hero-actions,
  .lp-features-inline {
    animation: none !important;
    transition: none !important;
  }
}

/* ═════════════════════════════════════════════════════
   PALM TREES
   ═════════════════════════════════════════════════════ */
.lp-palm {
  transform-origin: center bottom;
  transform-box: fill-box;
}
.lp-palm-1 {
  animation: lpPalmSway 6.5s ease-in-out infinite;
}
.lp-palm-2 {
  animation: lpPalmSway 8s ease-in-out infinite reverse;
}
@keyframes lpPalmSway {
  0%, 100% { transform: rotate(0deg); }
  25%      { transform: rotate(1.4deg); }
  50%      { transform: rotate(0deg); }
  75%      { transform: rotate(-1.4deg); }
}

/* ═════════════════════════════════════════════════════
   FLOATING PAPER PLANES / PINS
   ═════════════════════════════════════════════════════ */
.lp-floater {
  position: absolute;
  color: var(--lp-accent-dk);
  opacity: 0.22;
  animation: lpDrift 26s linear infinite;
  will-change: transform;
  z-index: 1;
}
.lp-floater svg {
  display: block;
  width: 100%;
  height: 100%;
}

.lp-floater.p1 {
  top: 14%; left: -8%;
  width: 64px; height: 64px;
  animation-duration: 28s;
  animation-delay: 0s;
  opacity: 0.24;
}
.lp-floater.p2 {
  top: 30%; left: -6%;
  width: 46px; height: 46px;
  animation-duration: 34s;
  animation-delay: -9s;
  opacity: 0.18;
}
.lp-floater.p3 {
  top: 56%; left: -10%;
  width: 72px; height: 72px;
  animation-duration: 32s;
  animation-delay: -16s;
  opacity: 0.20;
}
.lp-floater.p4 {
  top: 20%; left: -8%;
  width: 40px; height: 40px;
  animation-duration: 38s;
  animation-delay: -4s;
  opacity: 0.15;
}
.lp-floater.p5 {
  top: 74%; left: -6%;
  width: 52px; height: 52px;
  animation-duration: 30s;
  animation-delay: -21s;
  opacity: 0.18;
}
.lp-floater.p6 {
  top: 44%; left: -9%;
  width: 36px; height: 36px;
  animation-duration: 40s;
  animation-delay: -12s;
  opacity: 0.14;
}

@keyframes lpDrift {
  0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
  50%  { transform: translate3d(60vw, -50px, 0) rotate(12deg); }
  100% { transform: translate3d(125vw, -100px, 0) rotate(24deg); }
}

/* ═════════════════════════════════════════════════════
   HOT-AIR BALLOONS
   ═════════════════════════════════════════════════════ */
.lp-balloon {
  position: absolute;
  z-index: 2;
  pointer-events: none;
  filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.15));
  will-change: transform;
}
.lp-balloon svg {
  display: block;
  width: 100%;
  height: 100%;
}

.lp-balloon.b1 {
  top: 22%; left: -15%;
  width: 90px; height: 135px;
  animation: balloonFloat1 32s linear infinite;
}
.lp-balloon.b2 {
  top: 45%; left: -20%;
  width: 70px; height: 105px;
  animation: balloonFloat2 42s linear infinite;
  animation-delay: -12s;
  opacity: 0.85;
}
.lp-balloon.b3 {
  top: 12%; left: -25%;
  width: 60px; height: 90px;
  animation: balloonFloat1 38s linear infinite;
  animation-delay: -20s;
  opacity: 0.75;
}
.lp-balloon.b4 {
  top: 62%; left: -18%;
  width: 80px; height: 120px;
  animation: balloonFloat2 48s linear infinite;
  animation-delay: -30s;
  opacity: 0.8;
}

@keyframes balloonFloat1 {
  0%   { transform: translate3d(0, 0, 0) rotate(-3deg); }
  50%  { transform: translate3d(65vw, -80px, 0) rotate(3deg); }
  100% { transform: translate3d(135vw, -160px, 0) rotate(-3deg); }
}
@keyframes balloonFloat2 {
  0%   { transform: translate3d(0, 0, 0) rotate(4deg); }
  50%  { transform: translate3d(70vw, 60px, 0) rotate(-4deg); }
  100% { transform: translate3d(135vw, -120px, 0) rotate(4deg); }
}

/* ═════════════════════════════════════════════════════
   SPARKLES (extra dots)
   ═════════════════════════════════════════════════════ */
.lp-sparkle.s5 {
  top: 55%; left: 78%;
  animation: lpSparkle 3.6s ease-in-out infinite;
  animation-delay: 0.9s;
}
.lp-sparkle.s6 {
  top: 22%; left: 8%;
  animation: lpSparkle 4.5s ease-in-out infinite;
  animation-delay: 1.7s;
}

/* ═════════════════════════════════════════════════════
   REDUCED MOTION
   ═════════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .lp-palm,
  .lp-floater,
  .lp-balloon {
    animation: none !important;
  }
}

/* Mobile tweaks */
@media (max-width: 640px) {
  .lp-balloon.b1 { width: 60px; height: 90px; }
  .lp-balloon.b2 { width: 50px; height: 75px; }
  .lp-balloon.b3 { width: 45px; height: 68px; }
  .lp-balloon.b4 { width: 55px; height: 82px; }
  .lp-floater.p3,
  .lp-floater.p6 { display: none; }
  .lp-sparkle { display: none; }
}

/* ═════════════════════════════════════════════════════
   PALM TREES
   ═════════════════════════════════════════════════════ */
.lp-palm {
  transform-origin: center bottom;
  transform-box: fill-box;
}
.lp-palm-1 {
  animation: lpPalmSway 6.5s ease-in-out infinite;
}
.lp-palm-2 {
  animation: lpPalmSway 8s ease-in-out infinite reverse;
}
@keyframes lpPalmSway {
  0%, 100% { transform: rotate(0deg); }
  25%      { transform: rotate(1.4deg); }
  50%      { transform: rotate(0deg); }
  75%      { transform: rotate(-1.4deg); }
}

/* ═════════════════════════════════════════════════════
   LEAF MOTIFS (on hills)
   ═════════════════════════════════════════════════════ */
.lp-leaf-motif {
  transform-origin: center bottom;
  transform-box: fill-box;
  animation: lpLeafBreath 5s ease-in-out infinite;
}
.lp-leaf-motif > g:nth-child(1) { animation-delay: 0s; }
.lp-leaf-motif > g:nth-child(2) { animation-delay: 0.6s; }
.lp-leaf-motif > g:nth-child(3) { animation-delay: 1.2s; }
.lp-leaf-motif > g:nth-child(4) { animation-delay: 1.8s; }
.lp-leaf-motif > g:nth-child(5) { animation-delay: 2.4s; }

@keyframes lpLeafBreath {
  0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.7; }
  50%      { transform: scale(1.08) rotate(4deg); opacity: 0.9; }
}

/* ═════════════════════════════════════════════════════
   DOTTED FLIGHT PATHS
   ═════════════════════════════════════════════════════ */
.lp-flight-paths {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  overflow: visible;
}

.lp-flight-path {
  animation: lpFlightDash 3s linear infinite;
}
.lp-flight-path.fp1 { animation-duration: 4s; }
.lp-flight-path.fp2 { animation-duration: 5s; animation-direction: reverse; }
.lp-flight-path.fp3 { animation-duration: 3.5s; }

@keyframes lpFlightDash {
  to { stroke-dashoffset: -120; }
}

/* ═════════════════════════════════════════════════════
   FLOATING LOCATION PINS
   ═════════════════════════════════════════════════════ */
.lp-pin {
  position: absolute;
  color: #8bbf35;
  opacity: 0.55;
  pointer-events: none;
  z-index: 2;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.15));
}
.lp-pin svg {
  display: block;
  width: 100%;
  height: 100%;
}

.lp-pin.pin1 {
  top: 22%; left: 22%;
  width: 30px; height: 30px;
  animation: pinBob 4s ease-in-out infinite;
}
.lp-pin.pin2 {
  top: 38%; left: 74%;
  width: 24px; height: 24px;
  animation: pinBob 5.5s ease-in-out infinite;
  animation-delay: -1.2s;
  color: #a4d14b;
}
.lp-pin.pin3 {
  top: 62%; left: 42%;
  width: 28px; height: 28px;
  animation: pinBob 6s ease-in-out infinite;
  animation-delay: -2.5s;
  color: #7aa036;
}
.lp-pin.pin4 {
  top: 12%; left: 62%;
  width: 22px; height: 22px;
  animation: pinBob 4.5s ease-in-out infinite;
  animation-delay: -3s;
}

@keyframes pinBob {
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-8px) scale(1.08); }
}

/* ═════════════════════════════════════════════════════
   FLOATING PAPER PLANES
   ═════════════════════════════════════════════════════ */
.lp-plane {
  position: absolute;
  color: #8bbf35;
  opacity: 0.5;
  pointer-events: none;
  z-index: 2;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.12));
  animation: planeDrift 22s linear infinite;
  will-change: transform;
}
.lp-plane svg {
  display: block;
  width: 100%;
  height: 100%;
  transform: rotate(-10deg);
}

.lp-plane.plane1 {
  top: 18%; left: -8%;
  width: 42px; height: 42px;
  animation-duration: 24s;
  animation-delay: 0s;
  opacity: 0.55;
}
.lp-plane.plane2 {
  top: 46%; left: -12%;
  width: 34px; height: 34px;
  animation-duration: 30s;
  animation-delay: -8s;
  opacity: 0.4;
}
.lp-plane.plane3 {
  top: 68%; left: -10%;
  width: 48px; height: 48px;
  animation-duration: 26s;
  animation-delay: -14s;
  opacity: 0.48;
  color: #a4d14b;
}
.lp-plane.plane4 {
  top: 8%; left: -6%;
  width: 28px; height: 28px;
  animation-duration: 34s;
  animation-delay: -20s;
  opacity: 0.35;
}

@keyframes planeDrift {
  0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
  50%  { transform: translate3d(60vw, -40px, 0) rotate(8deg); }
  100% { transform: translate3d(125vw, -80px, 0) rotate(16deg); }
}

/* ═════════════════════════════════════════════════════
   FLOATING LEAF MOTIFS (top of page, drifting)
   ═════════════════════════════════════════════════════ */
.lp-floating-leaf {
  position: absolute;
  color: #a4d14b;
  opacity: 0.35;
  pointer-events: none;
  z-index: 2;
  animation: leafDrift 28s linear infinite;
  will-change: transform;
}
.lp-floating-leaf svg {
  display: block;
  width: 100%;
  height: 100%;
}

.lp-floating-leaf.leaf1 {
  top: 30%; left: -6%;
  width: 32px; height: 32px;
  animation-duration: 26s;
  animation-delay: 0s;
  opacity: 0.4;
}
.lp-floating-leaf.leaf2 {
  top: 55%; left: -8%;
  width: 26px; height: 26px;
  animation-duration: 34s;
  animation-delay: -10s;
  opacity: 0.3;
  color: #8bbf35;
}
.lp-floating-leaf.leaf3 {
  top: 78%; left: -10%;
  width: 36px; height: 36px;
  animation-duration: 30s;
  animation-delay: -18s;
  opacity: 0.35;
  color: #7aa036;
}

@keyframes leafDrift {
  0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
  25%  { transform: translate3d(30vw, -30px, 0) rotate(90deg); }
  50%  { transform: translate3d(60vw, -10px, 0) rotate(180deg); }
  75%  { transform: translate3d(95vw, -40px, 0) rotate(270deg); }
  100% { transform: translate3d(125vw, -20px, 0) rotate(360deg); }
}

/* ═════════════════════════════════════════════════════
   SPARKLES (extra)
   ═════════════════════════════════════════════════════ */
.lp-sparkle.s5 {
  top: 55%; left: 78%;
  animation: lpSparkle 3.6s ease-in-out infinite;
  animation-delay: 0.9s;
}
.lp-sparkle.s6 {
  top: 22%; left: 8%;
  animation: lpSparkle 4.5s ease-in-out infinite;
  animation-delay: 1.7s;
}

/* ═════════════════════════════════════════════════════
   REDUCED MOTION
   ═════════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .lp-palm,
  .lp-leaf-motif,
  .lp-flight-path,
  .lp-pin,
  .lp-plane,
  .lp-floating-leaf {
    animation: none !important;
  }
}

/* ═════════════════════════════════════════════════════
   MOBILE
   ═════════════════════════════════════════════════════ */
@media (max-width: 640px) {
  .lp-pin { transform: scale(0.8); }
  .lp-plane { transform: scale(0.75); }
  .lp-floating-leaf { transform: scale(0.75); }
  .lp-flight-paths { opacity: 0.5; }
  .lp-sparkle { display: none; }
}
```

### frontend/src/pages/Landing.jsx

```
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ImageSlideshow from "../components/ImageSlideshow";
import "./Landing.css";

const ROTATE_WORDS = [
  "India", "Japan", "Bali", "America", "Canada", "Sri Lanka",
  "Nepal", "Saudi Arabia", "Thailand", "Dubai", "France", "Iceland",
];

const FEATURES = [
  { icon: "🤖", title: "AI Itinerary", desc: "Gemini + Groq craft a day-by-day plan in seconds — hotels, activities, and budget included." },
  { icon: "🌦️", title: "Weather-Aware", desc: "Live forecasts reshuffle your outdoor plans onto sunny days and indoor ones onto rainy days." },
  { icon: "🗺️", title: "Interactive Map", desc: "Numbered stops, route lines, and distance between activities — all on a live map." },
  { icon: "💰", title: "Budget Breakdown", desc: "Flights, hotels, food, activities — see where every rupee goes before you book." },
  { icon: "📄", title: "One-Click PDF", desc: "Export your full itinerary as a beautiful A4 PDF, ready to print or share." },
  { icon: "🔗", title: "Share Publicly", desc: "Send friends a link to view your trip — no login required on their end." },
];

const STEPS = [
  { n: "01", title: "Tell us where", desc: "Pick a destination, dates, budget, travellers, and the things you love." },
  { n: "02", title: "AI plans it", desc: "Gemini generates a day-by-day itinerary with hotels and cost estimates." },
  { n: "03", title: "Explore & export", desc: "View the map, check the weather plan, then download PDF or share a link." },
];

const PREVIEW_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1600&h=686&fit=crop&q=80",
    pill: "4 Days · 6 places", title: "Taj Mahal, Agra",
    url: "aitravelplanner.app/trips/agra",
    day: "Sunrise at Taj Mahal", weather: "28°C · Clear", budget: "₹35,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=1600&h=686&fit=crop&q=80",
    pill: "7 Days · 9 places", title: "Rajasthan, India",
    url: "aitravelplanner.app/trips/rajasthan",
    day: "Jaipur City Palace", weather: "32°C · Sunny", budget: "₹55,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1600&h=686&fit=crop&q=80",
    pill: "6 Days · 8 places", title: "San Francisco, USA",
    url: "aitravelplanner.app/trips/san-francisco",
    day: "Golden Gate Bridge", weather: "20°C · Foggy", budget: "₹1,20,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1513326738677-b964603b136d?w=1600&h=686&fit=crop&q=80",
    pill: "5 Days · 7 places", title: "Moscow, Russia",
    url: "aitravelplanner.app/trips/moscow",
    day: "Red Square & Kremlin", weather: "-2°C · Snowy", budget: "₹85,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1600&h=686&fit=crop&q=80",
    pill: "8 Days · 10 places", title: "Serengeti, Africa",
    url: "aitravelplanner.app/trips/serengeti",
    day: "Wildlife safari", weather: "30°C · Sunny", budget: "₹1,50,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&h=686&fit=crop&q=80",
    pill: "5 Days · 7 places", title: "Tokyo, Japan",
    url: "aitravelplanner.app/trips/tokyo",
    day: "Arrival & Shinjuku", weather: "18°C · Clear", budget: "₹70,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&h=686&fit=crop&q=80",
    pill: "4 Days · 6 places", title: "Paris, France",
    url: "aitravelplanner.app/trips/paris",
    day: "Eiffel Tower & Louvre", weather: "15°C · Cloudy", budget: "₹55,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600&h=686&fit=crop&q=80",
    pill: "7 Days · 9 places", title: "Bali, Indonesia",
    url: "aitravelplanner.app/trips/bali",
    day: "Ubud rice terraces", weather: "28°C · Sunny", budget: "₹45,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=1600&h=686&fit=crop&q=80",
    pill: "6 Days · 8 places", title: "Reykjavik, Iceland",
    url: "aitravelplanner.app/trips/reykjavik",
    day: "Golden Circle tour", weather: "5°C · Snowy", budget: "₹95,000 total",
  },
  {
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&h=686&fit=crop&q=80",
    pill: "4 Days · 5 places", title: "Dubai, UAE",
    url: "aitravelplanner.app/trips/dubai",
    day: "Burj Khalifa visit", weather: "32°C · Clear", budget: "₹60,000 total",
  },
];

const PreviewSlideshow = () => {
  const [index, setIndex] = useState(0);
  const active = PREVIEW_SLIDES[index] || PREVIEW_SLIDES[0];

  return (
    <div className="lp-preview-window">
      <div className="lp-preview-bar">
        <span className="lp-preview-dot r" />
        <span className="lp-preview-dot y" />
        <span className="lp-preview-dot g" />
        <span className="lp-preview-url">{active.url}</span>
      </div>

      <div className="lp-preview-body">
        <ImageSlideshow
          slides={PREVIEW_SLIDES}
          interval={2000}
          onChange={(_, i) => {
            setTimeout(() => setIndex(i), 0);
          }}
        />

        <div className="lp-preview-cards">
          <div className="lp-preview-card">
            <div className="lp-preview-card-icon">📅</div>
            <div>
              <div className="lp-preview-card-label">Day 1</div>
              <div className="lp-preview-card-text">{active.day}</div>
            </div>
          </div>
          <div className="lp-preview-card">
            <div className="lp-preview-card-icon">🌤️</div>
            <div>
              <div className="lp-preview-card-label">Weather</div>
              <div className="lp-preview-card-text">{active.weather}</div>
            </div>
          </div>
          <div className="lp-preview-card">
            <div className="lp-preview-card-icon">💰</div>
            <div>
              <div className="lp-preview-card-label">Budget</div>
              <div className="lp-preview-card-text">{active.budget}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Landing = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [wordIndex, setWordIndex] = useState(0);
  const [wordOut, setWordOut] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      setWordOut(true);
      setTimeout(() => {
        setWordIndex((i) => (i + 1) % ROTATE_WORDS.length);
        setWordOut(false);
      }, 400);
    }, 1800);
    return () => clearInterval(iv);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handlePlanTrip = () => {
    if (user) navigate("/trips/new");
    else navigate("/register");
  };

  const initials = (user?.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="lp-root">
      <div className="lp-bg-scene" aria-hidden="true">
        <div className="lp-sun">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff9c4" />
                <stop offset="55%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#facc15" />
              </radialGradient>
              <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fde047" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="46" fill="url(#sunGlow)" className="lp-sun-glow" />
            <g className="lp-sun-rays">
              {Array.from({ length: 12 }).map((_, i) => (
                <rect key={i} x="48.6" y="2" width="2.8" height="12" rx="1.4"
                  fill="#facc15" opacity="0.7"
                  transform={`rotate(${(i * 360) / 12} 50 50)`} />
              ))}
            </g>
            <circle cx="50" cy="50" r="22" fill="url(#sunCore)" className="lp-sun-core" />
          </svg>
        </div>

        <div className="lp-cloud lp-cloud-1">
          <svg viewBox="0 0 120 50">
            <path d="M20 42 C 6 42 2 32 10 26 C 8 16 18 10 28 14 C 34 4 50 2 60 12 C 70 4 86 6 92 18 C 104 14 116 22 114 34 C 118 42 108 46 96 44 L 20 42 Z" fill="#ffffff" opacity="0.55" />
          </svg>
        </div>
        <div className="lp-cloud lp-cloud-2">
          <svg viewBox="0 0 120 50">
            <path d="M20 42 C 6 42 2 32 10 26 C 8 16 18 10 28 14 C 34 4 50 2 60 12 C 70 4 86 6 92 18 C 104 14 116 22 114 34 C 118 42 108 46 96 44 L 20 42 Z" fill="#ffffff" opacity="0.4" />
          </svg>
        </div>

        <div className="lp-birds lp-birds-1">
          <svg viewBox="0 0 60 20">
            <path d="M4 10 Q 8 4 12 10 Q 16 4 20 10" stroke="#2f3a1f" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M28 6 Q 32 1 36 6 Q 40 1 44 6" stroke="#2f3a1f" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </svg>
        </div>

        <svg className="lp-landscape" viewBox="0 0 1440 620" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="lpHillFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8f0bc" stopOpacity=".85" />
              <stop offset="100%" stopColor="#d4e28e" stopOpacity=".5" />
            </linearGradient>
            <linearGradient id="lpHillNear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cfe08c" stopOpacity=".85" />
              <stop offset="100%" stopColor="#b5cd63" stopOpacity=".6" />
            </linearGradient>
          </defs>
          <path d="M0 400 Q 180 280 360 355 T 720 325 T 1080 365 T 1440 315 L1440 620 L0 620 Z" fill="url(#lpHillFar)" />
          <path d="M0 520 Q 240 420 480 480 T 960 460 T 1440 490 L1440 620 L0 620 Z" fill="url(#lpHillNear)" />

          <g className="lp-palm lp-palm-1" opacity=".62" fill="#93b352">
            <path d="M100 575 C 108 500, 135 435, 168 382 L 180 375 C 150 435, 128 500, 135 575 Z" />
            <path d="M174 378 C 160 340, 135 315, 100 305 C 130 325, 155 355, 172 385 Z" />
            <path d="M174 378 C 178 335, 185 305, 198 275 C 190 310, 182 345, 178 380 Z" />
            <path d="M174 378 C 200 345, 232 325, 268 320 C 235 340, 200 360, 178 382 Z" />
            <path d="M174 378 C 215 380, 258 395, 295 425 C 255 405, 212 388, 176 383 Z" />
            <path d="M174 378 C 200 405, 225 440, 240 485 C 220 445, 198 408, 176 383 Z" />
            <path d="M174 378 C 148 408, 122 445, 105 490 C 125 450, 150 412, 172 383 Z" />
            <path d="M174 378 C 135 385, 95 400, 60 425 C 98 408, 140 393, 172 383 Z" />
            <circle cx="172" cy="385" r="5" />
          </g>
          <g className="lp-palm lp-palm-2" opacity=".62" fill="#93b352">
            <path d="M1275 575 C 1280 510, 1288 450, 1290 405 L 1305 400 C 1305 450, 1302 510, 1308 575 Z" />
            <path d="M1297 402 C 1270 375, 1240 360, 1205 358 C 1235 370, 1265 385, 1295 405 Z" />
            <path d="M1297 402 C 1290 365, 1285 335, 1290 305 C 1300 340, 1302 370, 1300 405 Z" />
            <path d="M1297 402 C 1325 375, 1355 360, 1390 358 C 1360 370, 1330 385, 1300 405 Z" />
            <path d="M1297 402 C 1335 400, 1375 408, 1410 430 C 1370 418, 1332 408, 1300 405 Z" />
            <path d="M1297 402 C 1258 400, 1220 408, 1185 430 C 1225 418, 1262 408, 1294 405 Z" />
            <path d="M1297 402 C 1325 425, 1345 455, 1355 490 C 1338 458, 1318 430, 1300 405 Z" />
          </g>
        </svg>

        <span className="lp-pin pin1">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg>
        </span>
        <span className="lp-pin pin2">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg>
        </span>
        <span className="lp-pin pin3">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg>
        </span>

        <span className="lp-plane plane1">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
        </span>
        <span className="lp-plane plane2">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
        </span>
        <span className="lp-plane plane3">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
        </span>

        <span className="lp-sparkle s1" />
        <span className="lp-sparkle s2" />
        <span className="lp-sparkle s3" />
        <span className="lp-sparkle s4" />
      </div>

      <header className="lp-topbar">
        <div className="lp-topbar-inner">
          <Link to="/" className="lp-brand">
            <span className="lp-brand-name">
              AI Travel <span className="lp-brand-accent">Planner</span>
            </span>
          </Link>
          <nav className="lp-mainnav">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#preview">Preview</a>
            <Link to="/trips/new">Plan a trip</Link>
          </nav>
          <div className="lp-user">
            {user ? (
              <>
                <Link to="/profile" className="lp-avatar" title={user.name}>{initials}</Link>
                <button className="lp-btn-logout" type="button" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="lp-auth-login">Login</Link>
                <Link to="/register" className="lp-auth-cta">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="lp-main">
        <h1 className="lp-headline">
          <span className="lp-headline-line">Your next trip to</span>
          <span className="lp-headline-rotate">
            <span className={`lp-rotator${wordOut ? " out" : ""}`}>
              {ROTATE_WORDS[wordIndex]}
            </span>
          </span>
          <span className="lp-headline-line lp-headline-accent">planned in seconds.</span>
        </h1>
        <p className="lp-sub">
          Stop endlessly searching. Let AI craft your perfect itinerary —
          day-by-day plans, hotels, budget, weather, and maps — in one place.
        </p>
        <div className="lp-hero-actions">
          <button className="lp-cta" type="button" onClick={handlePlanTrip}>
            ✨ Plan a New Trip
          </button>
          <a href="#how" className="lp-cta-ghost">See how it works →</a>
        </div>
        <ul className="lp-features-inline">
          <li>
            <span className="lp-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="#12200a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </span>
            Tailored to your vibe
          </li>
          <li>
            <span className="lp-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="#12200a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </span>
            Zero planning burnout
          </li>
          <li>
            <span className="lp-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="#12200a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </span>
            Free to use
          </li>
        </ul>
      </main>

      <section className="lp-section" id="how">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <span className="lp-section-tag">How it works</span>
            <h2 className="lp-section-title">Three steps from <span>idea to itinerary</span></h2>
          </div>
          <div className="lp-steps">
            {STEPS.map((s) => (
              <div key={s.n} className="lp-step">
                <div className="lp-step-num">{s.n}</div>
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section" id="features">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <span className="lp-section-tag">Features</span>
            <h2 className="lp-section-title">Everything you need, <span>nothing you don't</span></h2>
          </div>
          <div className="lp-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="lp-feature">
                <div className="lp-feature-icon">{f.icon}</div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section" id="preview">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <span className="lp-section-tag">Preview</span>
            <h2 className="lp-section-title">Itineraries that look <span>this good</span></h2>
            <p className="lp-section-sub">
              Real output from a 5-day Tokyo trip — map, weather, and budget included.
            </p>
          </div>
          <div className="lp-preview">
            <PreviewSlideshow />
            <div className="lp-preview-info">
              <h3 className="lp-preview-info-title">What you'll get</h3>
              <ul className="lp-preview-list">
                <li><span>📅</span> Day-by-day plan with times</li>
                <li><span>🏨</span> 3–5 hotels with prices</li>
                <li><span>💰</span> Full budget breakdown</li>
                <li><span>🗺️</span> Live map with route</li>
                <li><span>🌦️</span> Weather-aware reshuffling</li>
                <li><span>📄</span> One-click PDF export</li>
                <li><span>🔗</span> Public share links</li>
                <li><span>📓</span> Field journal view</li>
              </ul>
              <button className="lp-cta" type="button" onClick={handlePlanTrip}>
                Try it free →
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-stats-section">
        <div className="lp-section-inner">
          <div className="lp-stats">
            <div className="lp-stat"><div className="lp-stat-value">8+</div><div className="lp-stat-label">APIs integrated</div></div>
            <div className="lp-stat"><div className="lp-stat-value">2</div><div className="lp-stat-label">AI providers</div></div>
            <div className="lp-stat"><div className="lp-stat-value">25</div><div className="lp-stat-label">Currencies</div></div>
            <div className="lp-stat"><div className="lp-stat-value">~30s</div><div className="lp-stat-label">Average generation</div></div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-cta-section">
        <div className="lp-section-inner">
          <div className="lp-cta-card">
            <h2 className="lp-cta-title">Ready to plan your next adventure?</h2>
            <p className="lp-cta-sub">Free, fast, and no credit card. Just tell us where and we'll do the rest.</p>
            <button className="lp-cta" type="button" onClick={handlePlanTrip}>
              ✨ Start Planning — It's Free
            </button>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-content">
          <div className="lp-footer-brand">
            <h3>AI Travel Planner</h3>
            <p>Your AI-powered travel companion. Plan less, explore more.</p>
          </div>
          <div className="lp-footer-links">
            <div className="lp-footer-column">
              <h4>Product</h4>
              <ul>
                <li><Link to="/trips/new">Create Trip</Link></li>
                <li><Link to="/trips">My Trips</Link></li>
                <li><Link to="/weather">Weather</Link></li>
                <li><Link to="/journal">Journal</Link></li>
              </ul>
            </div>
            <div className="lp-footer-column">
              <h4>Account</h4>
              <ul>
                <li><Link to="/profile">Profile</Link></li>
                <li><Link to="/dashboard">Dashboard</Link></li>
                <li><Link to="/login">Sign in</Link></li>
                <li><Link to="/register">Get Started</Link></li>
              </ul>
            </div>
            <div className="lp-footer-column">
              <h4>Data</h4>
              <ul>
                <li><span>Open-Meteo</span></li>
                <li><span>OpenStreetMap</span></li>
                <li><span>Gemini · Groq</span></li>
                <li><span>Pexels</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <p>© {new Date().getFullYear()} AI Travel Planner. All rights reserved.</p>
          <p>Made with ❤️ for travelers</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
```

### frontend/src/pages/NotFound.jsx

```
import { useState } from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  const [copied, setCopied] = useState(false);
  const promptText =
    "Plan a 5-day all-inclusive tropical beach vacation for 2.";

  const copyPrompt = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(promptText);
      } else {
        const ta = document.createElement("textarea");
        ta.value = promptText;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } catch {}
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="notfound-wrapper">
      <main className="notfound-card">
        <svg
          className="notfound-scene"
          viewBox="0 0 640 420"
          role="img"
          aria-label="A tiny deserted tropical island with a bent palm tree, a beach chair and a message in a bottle containing a 404 note"
        >
          <defs>
            <linearGradient id="nf-skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c7ecff" />
              <stop offset="100%" stopColor="#f2fbff" />
            </linearGradient>
            <linearGradient id="nf-oceanGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7fd8f5" />
              <stop offset="45%" stopColor="#2fc4e0" />
              <stop offset="100%" stopColor="#0a94b8" />
            </linearGradient>
            <radialGradient id="nf-sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fde68a" stopOpacity=".95" />
              <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="nf-sandTop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fdeccd" />
              <stop offset="100%" stopColor="#f7d9a3" />
            </linearGradient>
            <linearGradient id="nf-trunkGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#c98f52" />
              <stop offset="100%" stopColor="#a86a34" />
            </linearGradient>
            <filter id="nf-softShadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="6" stdDeviation="9" floodColor="#a4b6c2" floodOpacity=".35" />
            </filter>
            <filter id="nf-sandShadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0e7490" floodOpacity=".28" />
            </filter>
            <clipPath id="nf-chairClip">
              <path d="M-36 -34 L14 -34 L22 -16 L-28 -16 Z" />
              <path d="M-40 -34 L-58 -64 L-34 -70 L-20 -40 Z" />
            </clipPath>
          </defs>

          {/* Sky */}
          <rect x="0" y="0" width="640" height="256" fill="url(#nf-skyGrad)" />

          {/* Sun */}
          <circle className="notfound-pulse" cx="548" cy="76" r="70" fill="url(#nf-sunGlow)" />
          <circle cx="548" cy="76" r="40" fill="#fbbf24" />
          <circle cx="548" cy="76" r="31" fill="#fcd34d" />

          {/* Clouds */}
          <g className="notfound-float-slow" opacity=".95">
            <ellipse cx="106" cy="80" rx="52" ry="24" fill="#ffffff" />
            <ellipse cx="146" cy="72" rx="34" ry="18" fill="#ffffff" />
            <ellipse cx="68" cy="90" rx="28" ry="14" fill="#ffffff" />
          </g>
          <g className="notfound-float-mid" opacity=".8">
            <ellipse cx="418" cy="58" rx="40" ry="19" fill="#ffffff" />
            <ellipse cx="448" cy="66" rx="26" ry="13" fill="#ffffff" />
            <ellipse cx="390" cy="68" rx="22" ry="11" fill="#ffffff" />
          </g>
          <g className="notfound-float-fast" opacity=".65">
            <ellipse cx="272" cy="112" rx="30" ry="14" fill="#ffffff" />
            <ellipse cx="296" cy="118" rx="19" ry="9" fill="#ffffff" />
          </g>

          {/* Seagulls */}
          <g className="notfound-drift" stroke="#8fa9bb" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".8">
            <path d="M158 148 q9 -9 18 0 q9 -9 18 0" />
            <path d="M212 170 q7 -7 14 0 q7 -7 14 0" />
          </g>

          {/* Ocean */}
          <rect x="0" y="252" width="640" height="168" fill="url(#nf-oceanGrad)" />
          <rect x="0" y="252" width="640" height="5" fill="#bdeaf8" opacity=".85" />

          {/* Ocean sparkle */}
          <g stroke="#e0f7ff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".55">
            <path d="M46 288 q13 -9 26 0" />
            <path d="M120 316 q11 -8 22 0" />
            <path d="M540 296 q13 -9 26 0" />
            <path d="M572 336 q11 -8 22 0" />
            <path d="M488 372 q13 -9 26 0" />
            <path d="M62 366 q11 -8 22 0" />
          </g>

          {/* Shallow lagoon */}
          <ellipse cx="300" cy="358" rx="234" ry="72" fill="#a5f3fc" opacity=".55" />
          <ellipse cx="300" cy="358" rx="196" ry="60" fill="#cffafe" opacity=".55" />

          {/* Island */}
          <g filter="url(#nf-sandShadow)">
            <ellipse cx="300" cy="352" rx="162" ry="48" fill="#f0c88a" />
            <ellipse cx="300" cy="342" rx="152" ry="41" fill="url(#nf-sandTop)" />
          </g>

          {/* Sand speckles */}
          <g fill="#e8c58c" opacity=".7">
            <circle cx="196" cy="344" r="3" />
            <circle cx="232" cy="362" r="2.4" />
            <circle cx="386" cy="356" r="2.8" />
            <circle cx="424" cy="340" r="2.2" />
            <circle cx="330" cy="330" r="2" />
            <circle cx="160" cy="358" r="2.4" />
          </g>

          {/* Palm trunk */}
          <g>
            <path
              d="M242 340 C246 292 258 226 296 166 L316 176 C282 232 272 294 270 342 Z"
              fill="url(#nf-trunkGrad)"
              stroke="#96602c"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <g stroke="#96602c" strokeWidth="3" fill="none" opacity=".55" strokeLinecap="round">
              <path d="M249 308 Q262 303 273 307" />
              <path d="M254 272 Q266 267 277 271" />
              <path d="M264 234 Q274 229 285 233" />
              <path d="M278 198 Q287 194 297 197" />
            </g>
          </g>

          {/* Palm fronds */}
          <g className="notfound-sway">
            <path d="M304 162 C280 122 248 96 208 88 C246 110 278 136 304 162 Z" fill="#2fbf8f" />
            <path d="M304 162 C264 156 224 166 196 188 C238 176 274 170 304 162 Z" fill="#26a97d" />
            <path d="M304 162 C270 136 230 128 192 134 C234 142 272 152 304 162 Z" fill="#3fd39f" />
            <path d="M304 162 C294 118 286 80 290 42 C310 78 310 118 304 162 Z" fill="#34cb99" />
            <path d="M304 162 C328 122 360 96 400 88 C362 110 330 136 304 162 Z" fill="#2fbf8f" />
            <path d="M304 162 C338 136 378 128 416 134 C374 142 336 152 304 162 Z" fill="#3fd39f" />
            <path d="M304 162 C344 156 384 166 412 188 C370 176 334 170 304 162 Z" fill="#26a97d" />

            {/* Coconuts */}
            <circle cx="294" cy="170" r="8" fill="#b45309" />
            <circle cx="311" cy="174" r="7.5" fill="#92400e" />
            <circle cx="303" cy="183" r="7" fill="#a16207" />
            <circle cx="295" cy="168" r="2.6" fill="#d97706" opacity=".7" />
          </g>

          {/* Beach chair */}
          <g transform="translate(392,342)" filter="url(#nf-softShadow)">
            <line x1="-30" y1="0" x2="10" y2="-34" stroke="#c2874a" strokeWidth="6" strokeLinecap="round" />
            <line x1="30" y1="0" x2="-8" y2="-34" stroke="#c2874a" strokeWidth="6" strokeLinecap="round" />
            <line x1="-8" y1="-34" x2="-46" y2="-62" stroke="#c2874a" strokeWidth="6" strokeLinecap="round" />
            <path d="M-36 -34 L14 -34 L22 -16 L-28 -16 Z" fill="#ff8a9b" />
            <path d="M-40 -34 L-58 -64 L-34 -70 L-20 -40 Z" fill="#ff8a9b" />
            <g clipPath="url(#nf-chairClip)">
              <path d="M-56 -80 L-50 20" stroke="#fff1f2" strokeWidth="5" />
              <path d="M-34 -80 L-28 20" stroke="#fff1f2" strokeWidth="5" />
              <path d="M-16 -80 L-10 20" stroke="#fff1f2" strokeWidth="5" />
              <path d="M2 -80 L8 20" stroke="#fff1f2" strokeWidth="5" />
            </g>
            <ellipse cx="-30" cy="-46" rx="13" ry="9" fill="#fffaf0" opacity=".95" transform="rotate(-38 -30 -46)" />
          </g>

          {/* Bottle with 404 note */}
          <g transform="translate(288,374) rotate(-8)">
            <g className="notfound-bob">
              <rect
                x="-54"
                y="-22"
                width="88"
                height="44"
                rx="20"
                fill="rgba(165,243,252,.6)"
                stroke="#22d3ee"
                strokeWidth="3"
              />
              <rect
                x="30"
                y="-12"
                width="26"
                height="24"
                rx="7"
                fill="rgba(165,243,252,.6)"
                stroke="#22d3ee"
                strokeWidth="3"
              />
              <rect x="52" y="-11" width="16" height="22" rx="5" fill="#c2874a" stroke="#a1662f" strokeWidth="2" />
              <line x1="56" y1="-6" x2="64" y2="-6" stroke="#a1662f" strokeWidth="2" />
              <line x1="56" y1="0" x2="64" y2="0" stroke="#a1662f" strokeWidth="2" />
              <line x1="56" y1="6" x2="64" y2="6" stroke="#a1662f" strokeWidth="2" />
              <rect x="-30" y="-14" width="52" height="28" rx="6" fill="#fffaf0" stroke="#e2cfa8" strokeWidth="2" />
              <text
                x="-4"
                y="5"
                textAnchor="middle"
                fontFamily="'Roboto Mono', monospace"
                fontSize="14"
                fontWeight="700"
                fill="#fb7185"
              >
                404
              </text>
              <path d="M-42 -11 q12 -7 26 -7" stroke="#ffffff" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".85" />
              <path d="M36 -6 h14" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" />
            </g>
          </g>

          {/* Starfish */}
          <g transform="translate(432,368) rotate(12)" fill="#fb923c">
            <path d="M0 -14 L4 -4 L14 -4 L6 3 L9 13 L0 7 L-9 13 L-6 3 L-14 -4 L-4 -4 Z" />
            <circle cx="0" cy="0" r="2.4" fill="#ffedd5" />
          </g>

          {/* Shell */}
          <g transform="translate(196,372)">
            <path d="M-11 6 A11 11 0 0 1 11 6 Z" fill="#fda4af" />
            <path d="M0 -5 L0 6 M-6 -1 L-4 6 M6 -1 L4 6" stroke="#fecdd3" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Crab */}
          <g transform="translate(168,340)">
            <path d="M-15 0 l-9 -7 M15 0 l9 -7" stroke="#fb7185" strokeWidth="3.4" strokeLinecap="round" />
            <ellipse cx="0" cy="2" rx="15" ry="10" fill="#fb7185" />
            <circle cx="-5" cy="-5" r="3.2" fill="#1f2d3d" />
            <circle cx="5" cy="-5" r="3.2" fill="#1f2d3d" />
            <path d="M-6 9 q6 5 12 0" stroke="#e11d48" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>

          {/* Sparkles */}
          <g fill="#fbbf24">
            <path className="notfound-float-fast" d="M462 118 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" />
            <path className="notfound-float-mid" d="M232 106 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4 z" />
          </g>
          <circle className="notfound-pulse" cx="130" cy="214" r="3.6" fill="#34d399" />
          <circle className="notfound-pulse" cx="500" cy="196" r="3" fill="#22d3ee" />
        </svg>

        <div>
          <span className="notfound-eyebrow">
            <span className="dot"></span> Error 404 · Castaway Status
          </span>
        </div>

        <h1 className="notfound-title">
          Mayday! You've Washed Up on{" "}
          <span className="accent">Page 404</span>
        </h1>

        <p className="notfound-subtext">
          No resorts, no Wi-Fi, and definitely no breakfast buffet here. Don't
          panic — our rescue boat is ready to take you back to safety.
        </p>

        <div className="notfound-ai-box">
          <div className="notfound-ai-icon" aria-hidden="true">
            🌴
          </div>
          <div className="notfound-ai-content">
            <div className="notfound-ai-label">Ask AI</div>
            <p className="notfound-ai-prompt">{promptText}</p>
          </div>
          <button
            className={`notfound-copy-btn ${copied ? "copied" : ""}`}
            type="button"
            onClick={copyPrompt}
          >
            {copied ? "Copied ✓" : "Copy prompt"}
          </button>
        </div>

        <div className="notfound-actions">
          <Link to="/" className="notfound-btn notfound-btn-primary">
            🛟 Rescue Me Home
          </Link>
          <Link to="/trips/new" className="notfound-btn notfound-btn-ghost">
            🏝️ Plan a Real Trip
          </Link>
        </div>

        <p className="notfound-footnote">
          Last known coordinates: <code>/404</code> · No coconuts were harmed in
          the making of this page.
        </p>
      </main>
    </div>
  );
};

export default NotFound;
```

### frontend/src/pages/Profile.css

```
/* frontend/src/pages/Profile.css */

.pf-root {
  --pf-bg: #050505;
  --pf-card: #111111;
  --pf-card-hover: #181818;
  --pf-border: rgba(255, 255, 255, 0.1);
  --pf-border-strong: rgba(255, 255, 255, 0.2);
  --pf-muted: #888888;
  --pf-dim: #52525b;
  --pf-lime: #a3e635;
  --pf-lime-bright: #bef264;
  --pf-lime-glow: rgba(163, 230, 53, 0.4);
  --pf-lime-subtle: rgba(163, 230, 53, 0.12);
  --pf-red: #f87171;
  --pf-red-subtle: rgba(248, 113, 113, 0.12);
  --pf-red-border: rgba(248, 113, 113, 0.35);

  position: relative;
  background: var(--pf-bg);
  color: #fff;
  min-height: 100vh;
  font-family: 'Poppins', system-ui, sans-serif;
  overflow-x: hidden;
}

.pf-orb-1, .pf-orb-2 {
  position: fixed;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.pf-orb-1 {
  top: -120px; left: 8%;
  width: 500px; height: 500px;
  background: radial-gradient(circle, var(--pf-lime-glow) 0%, rgba(163,230,53,0.05) 50%, transparent 75%);
  animation: pfFloat 10s ease-in-out infinite alternate;
}
.pf-orb-2 {
  bottom: -120px; right: 8%;
  width: 450px; height: 450px;
  background: radial-gradient(circle, rgba(96,165,250,0.16) 0%, transparent 70%);
  animation: pfFloat 13s ease-in-out infinite alternate-reverse;
}
@keyframes pfFloat {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(40px, 40px) scale(1.15); }
}

.pf-page {
  position: relative; z-index: 10;
  max-width: 900px; margin: 0 auto;
  padding: 48px 24px 80px;
}

/* ─── Header ─── */
.pf-header {
  display: flex; flex-direction: column; gap: 14px;
  margin-bottom: 32px;
}
.pf-tag {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 0.7rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--pf-lime);
  background: var(--pf-lime-subtle);
  border: 1px solid rgba(163, 230, 53, 0.3);
  padding: 5px 12px; border-radius: 9999px;
  width: fit-content;
}
.pf-pulse {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--pf-lime);
  box-shadow: 0 0 10px var(--pf-lime);
  animation: pfPulse 1.5s infinite;
}
@keyframes pfPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.4; transform: scale(0.8); }
}
.pf-title {
  font-size: clamp(1.9rem, 4.2vw, 3rem);
  font-weight: 900; line-height: 1.05;
  letter-spacing: -0.035em; color: #fff;
}
.pf-title span { color: var(--pf-lime); text-shadow: 0 0 30px var(--pf-lime-glow); }
.pf-subtitle {
  font-size: 0.95rem; color: var(--pf-muted);
  max-width: 640px; line-height: 1.6;
}

/* ─── Hero card ─── */
.pf-hero {
  display: flex; flex-direction: column; gap: 20px;
  align-items: center;
  text-align: center;
  background: var(--pf-card);
  border: 1px solid var(--pf-border);
  border-radius: 24px;
  padding: 32px 26px;
  position: relative;
  overflow: hidden;
  margin-bottom: 20px;
  animation: pfCardIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.pf-hero::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--pf-lime), transparent);
  opacity: 0.8;
}
@keyframes pfCardIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (min-width: 640px) {
  .pf-hero {
    flex-direction: row;
    text-align: left;
    padding: 32px;
  }
}

.pf-avatar {
  width: 96px; height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--pf-lime), var(--pf-lime-bright));
  color: #000;
  display: flex; align-items: center; justify-content: center;
  font-size: 2rem; font-weight: 900;
  letter-spacing: 0.02em;
  flex-shrink: 0;
  box-shadow: 0 0 40px -6px rgba(163, 230, 53, 0.6);
  border: 3px solid var(--pf-bg);
}

.pf-hero-info { flex: 1; min-width: 0; }

.pf-name-row {
  display: flex; align-items: center; gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
@media (min-width: 640px) {
  .pf-name-row { justify-content: flex-start; }
}

.pf-name {
  font-size: 1.75rem; font-weight: 900;
  letter-spacing: -0.03em;
  color: #fff;
  line-height: 1.1;
  margin: 0;
  word-break: break-word;
}
.pf-edit-btn {
  background: transparent;
  border: 1px solid var(--pf-border-strong);
  color: var(--pf-muted);
  padding: 5px 12px;
  border-radius: 9999px;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.04em;
}
.pf-edit-btn:hover {
  color: var(--pf-lime);
  border-color: var(--pf-lime);
  background: var(--pf-lime-subtle);
}

.pf-email {
  font-size: 0.9rem;
  color: var(--pf-muted);
  margin-top: 8px;
  word-break: break-all;
}
.pf-joined {
  font-size: 0.72rem;
  color: var(--pf-dim);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-top: 10px;
}

/* ─── Edit name form ─── */
.pf-edit-form {
  display: flex; flex-direction: column; gap: 10px;
  width: 100%;
  animation: pfCardIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.pf-edit-actions {
  display: flex; gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}
@media (min-width: 640px) {
  .pf-edit-actions { justify-content: flex-start; }
}

/* ─── Inputs ─── */
.pf-input {
  width: 100%;
  background: #000;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 13px 16px;
  color: #fff;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  color-scheme: dark;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.pf-input::placeholder { color: var(--pf-dim); font-weight: 500; }
.pf-input:focus {
  outline: none;
  border-color: var(--pf-lime);
  box-shadow: 0 0 0 3px rgba(163, 230, 53, 0.15);
}

.pf-label {
  display: block;
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--pf-dim);
  margin-bottom: 8px;
}

/* ─── Stat grid ─── */
.pf-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}
.pf-stat {
  background: var(--pf-card);
  border: 1px solid var(--pf-border);
  border-radius: 20px;
  padding: 20px;
  transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
  animation: pfCardIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.pf-stat:nth-child(1) { animation-delay: 0.08s; }
.pf-stat:nth-child(2) { animation-delay: 0.16s; }
.pf-stat:nth-child(3) { animation-delay: 0.24s; }
.pf-stat:hover {
  transform: translateY(-3px);
  border-color: rgba(163, 230, 53, 0.4);
  box-shadow: 0 16px 30px -12px rgba(0,0,0,0.9), 0 0 24px rgba(163,230,53,0.12);
}
.pf-stat-label {
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--pf-dim);
}
.pf-stat-value {
  font-size: 2rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.03em;
  line-height: 1;
  margin-top: 10px;
}
.pf-stat-value.accent { color: var(--pf-lime); }

/* ─── Panel / section ─── */
.pf-panel {
  background: var(--pf-card);
  border: 1px solid var(--pf-border);
  border-radius: 24px;
  padding: 26px;
  margin-bottom: 16px;
  animation: pfCardIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.pf-panel-head {
  display: flex; align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.pf-panel-title {
  font-size: 1.15rem; font-weight: 900;
  color: #fff;
  letter-spacing: -0.02em;
  margin: 0 0 4px;
}
.pf-panel-sub {
  font-size: 0.82rem;
  color: var(--pf-muted);
  margin: 0;
}
.pf-toggle-pass {
  background: transparent;
  border: 1px solid var(--pf-border-strong);
  color: var(--pf-muted);
  padding: 5px 12px;
  border-radius: 9999px;
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.pf-toggle-pass:hover {
  color: var(--pf-lime);
  border-color: var(--pf-lime);
  background: var(--pf-lime-subtle);
}

/* ─── Alerts ─── */
.pf-alert {
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 0.85rem;
  margin-bottom: 16px;
  font-weight: 600;
}
.pf-alert-error {
  background: var(--pf-red-subtle);
  border: 1px solid var(--pf-red-border);
  color: #fecaca;
}
.pf-alert-success {
  background: var(--pf-lime-subtle);
  border: 1px solid rgba(163, 230, 53, 0.4);
  color: var(--pf-lime);
}

/* ─── Password form ─── */
.pf-form {
  display: flex; flex-direction: column; gap: 16px;
}
.pf-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 640px) {
  .pf-form-grid { grid-template-columns: 1fr; }
}
.pf-form-actions {
  display: flex; justify-content: flex-end;
  padding-top: 6px;
}

/* ─── Buttons ─── */
.pf-btn {
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 800;
  padding: 12px 22px;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
}
.pf-btn-primary {
  background: linear-gradient(135deg, var(--pf-lime), var(--pf-lime-bright));
  color: #000;
  box-shadow: 0 8px 24px -6px rgba(163, 230, 53, 0.5);
}
.pf-btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px -6px rgba(163, 230, 53, 0.7);
}
.pf-btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}
.pf-btn-ghost {
  background: transparent;
  color: var(--pf-muted);
  border: 1px solid var(--pf-border-strong);
}
.pf-btn-ghost:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.04);
}

/* ─── Logout panel ─── */
.pf-danger-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.pf-danger-title {
  font-size: 1rem;
  font-weight: 800;
  color: #fff;
  margin: 0 0 4px;
}
.pf-danger-sub {
  font-size: 0.82rem;
  color: var(--pf-muted);
  margin: 0;
}
.pf-btn-danger {
  background: transparent;
  color: var(--pf-red);
  border: 1.5px solid var(--pf-red-border);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 800;
  padding: 10px 20px;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.pf-btn-danger:hover {
  background: var(--pf-red-subtle);
  border-color: var(--pf-red);
  transform: translateY(-1px);
}

/* ─── Loading ─── */
.pf-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--pf-bg);
}
.pf-spinner {
  width: 32px; height: 32px;
  border: 4px solid var(--pf-lime);
  border-top-color: transparent;
  border-radius: 50%;
  animation: pfSpin 0.8s linear infinite;
}
@keyframes pfSpin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .pf-orb-1, .pf-orb-2, .pf-pulse, .pf-spinner { animation: none !important; }
  .pf-hero, .pf-stat, .pf-panel { animation: none !important; }
}
```

### frontend/src/pages/Profile.jsx

```
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "./Profile.css";

const Profile = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ trips: 0, totalBudget: 0, avgBudget: 0 });
  const [loading, setLoading] = useState(true);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, tripsRes] = await Promise.all([
          api.get("/auth/profile"),
          api.get("/trips"),
        ]);
        setProfile(profileRes.data);
        setNewName(profileRes.data.name);

        const trips = tripsRes.data || [];
        const totalBudget = trips.reduce(
          (sum, t) => sum + (Number(t.budget) || 0),
          0
        );
        setStats({
          trips: trips.length,
          totalBudget,
          avgBudget: trips.length ? Math.round(totalBudget / trips.length) : 0,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSaveName = async (e) => {
    e.preventDefault();
    setNameError("");
    setNameSuccess("");
    if (!newName || newName.trim().length < 2) {
      return setNameError("Name must be at least 2 characters");
    }
    try {
      setSavingName(true);
      const res = await api.put("/auth/profile", { name: newName });
      const stored = JSON.parse(localStorage.getItem("user")) || {};
      localStorage.setItem("user", JSON.stringify({ ...stored, ...res.data }));
      setProfile({ ...profile, name: res.data.name });
      setNameSuccess("Name updated!");
      setEditingName(false);
      setTimeout(() => window.location.reload(), 700);
    } catch (err) {
      setNameError(err.response?.data?.message || "Could not update name");
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      return setPwdError("Please fill all fields");
    }
    if (newPassword.length < 6) {
      return setPwdError("New password must be at least 6 characters");
    }
    if (newPassword !== confirmPassword) {
      return setPwdError("New passwords do not match");
    }
    if (currentPassword === newPassword) {
      return setPwdError("New password must be different from current");
    }
    try {
      setSavingPassword(true);
      await api.put("/auth/password", { currentPassword, newPassword });
      setPwdSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwdError(err.response?.data?.message || "Could not change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="pf-loading">
        <div className="pf-spinner" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = (profile.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="pf-root">
      <div className="pf-orb-1" />
      <div className="pf-orb-2" />

      <main className="pf-page">
        {/* Header */}
        <header className="pf-header">
          <div className="pf-tag">
            <span className="pf-pulse" />
            Your account
          </div>
          <h1 className="pf-title">
            Your <span>Profile</span>
          </h1>
          <p className="pf-subtitle">
            Manage your account details, change your password, and see your
            travel stats.
          </p>
        </header>

        {/* Hero card */}
        <div className="pf-hero">
          <div className="pf-avatar">{initials}</div>
          <div className="pf-hero-info">
            {!editingName ? (
              <>
                <div className="pf-name-row">
                  <h2 className="pf-name">{profile.name}</h2>
                  <button
                    type="button"
                    className="pf-edit-btn"
                    onClick={() => {
                      setEditingName(true);
                      setNewName(profile.name);
                      setNameError("");
                      setNameSuccess("");
                    }}
                  >
                    ✏️ Edit
                  </button>
                </div>
                <p className="pf-email">{profile.email}</p>
                <p className="pf-joined">Joined {formatDate(profile.createdAt)}</p>
              </>
            ) : (
              <form onSubmit={handleSaveName} className="pf-edit-form">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="pf-input"
                  placeholder="Your name"
                  autoFocus
                />
                {nameError && <p className="pf-alert pf-alert-error">{nameError}</p>}
                {nameSuccess && (
                  <p className="pf-alert pf-alert-success">{nameSuccess}</p>
                )}
                <div className="pf-edit-actions">
                  <button
                    type="submit"
                    disabled={savingName}
                    className="pf-btn pf-btn-primary"
                  >
                    {savingName ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(false)}
                    className="pf-btn pf-btn-ghost"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="pf-stats">
          <div className="pf-stat">
            <div className="pf-stat-label">Trips Planned</div>
            <div className="pf-stat-value">{stats.trips}</div>
          </div>
          <div className="pf-stat">
            <div className="pf-stat-label">Total Budget</div>
            <div className="pf-stat-value accent">
              ₹{stats.totalBudget.toLocaleString()}
            </div>
          </div>
          <div className="pf-stat">
            <div className="pf-stat-label">Avg Budget / Trip</div>
            <div className="pf-stat-value">
              ₹{stats.avgBudget.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="pf-panel">
          <div className="pf-panel-head">
            <div>
              <h2 className="pf-panel-title">🔒 Change Password</h2>
              <p className="pf-panel-sub">Update your account password</p>
            </div>
            <button
              type="button"
              className="pf-toggle-pass"
              onClick={() => setShowPasswords((v) => !v)}
            >
              {showPasswords ? "Hide" : "Show"} passwords
            </button>
          </div>

          {pwdError && <p className="pf-alert pf-alert-error">{pwdError}</p>}
          {pwdSuccess && <p className="pf-alert pf-alert-success">{pwdSuccess}</p>}

          <form onSubmit={handleChangePassword} className="pf-form">
            <div>
              <label className="pf-label">Current password</label>
              <input
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pf-input"
                placeholder="Enter current password"
              />
            </div>

            <div className="pf-form-grid">
              <div>
                <label className="pf-label">New password</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pf-input"
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="pf-label">Confirm new password</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pf-input"
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            <div className="pf-form-actions">
              <button
                type="submit"
                disabled={savingPassword}
                className="pf-btn pf-btn-primary"
              >
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>

        {/* Logout */}
        <div className="pf-panel">
          <div className="pf-danger-panel">
            <div>
              <h3 className="pf-danger-title">Sign out of this device</h3>
              <p className="pf-danger-sub">
                You'll need to log in again to access your trips.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="pf-btn-danger"
            >
              Logout
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
```

### frontend/src/pages/SharedTrip.css

```
/* frontend/src/pages/SharedTrip.css */

.shr-root {
  --shr-bg: #050505;
  --shr-card: #111111;
  --shr-card-hover: #181818;
  --shr-border: rgba(255, 255, 255, 0.1);
  --shr-muted: #888888;
  --shr-dim: #52525b;
  --shr-lime: #a3e635;
  --shr-lime-bright: #bef264;
  --shr-lime-glow: rgba(163, 230, 53, 0.4);
  --shr-lime-subtle: rgba(163, 230, 53, 0.12);
  background: var(--shr-bg);
  color: #fff;
  min-height: 100vh;
  font-family: 'Poppins', system-ui, sans-serif;
  overflow-x: hidden;
  position: relative;
  padding-bottom: 80px;
}
.shr-orb-1, .shr-orb-2 {
  position: fixed;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.shr-orb-1 {
  top: -120px; left: 8%;
  width: 500px; height: 500px;
  background: radial-gradient(circle, var(--shr-lime-glow) 0%, rgba(163,230,53,0.05) 50%, transparent 75%);
  animation: shrFloat 10s ease-in-out infinite alternate;
}
.shr-orb-2 {
  bottom: -120px; right: 8%;
  width: 450px; height: 450px;
  background: radial-gradient(circle, rgba(96,165,250,0.16) 0%, transparent 70%);
  animation: shrFloat 13s ease-in-out infinite alternate-reverse;
}
@keyframes shrFloat {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(40px, 40px) scale(1.15); }
}

.shr-page {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px 0;
}

.shr-banner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}
.shr-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--shr-lime-subtle);
  border: 1px solid rgba(163, 230, 53, 0.35);
  color: var(--shr-lime);
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 800;
}
.shr-badge-icon { font-size: 1rem; }
.shr-banner-link {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--shr-lime);
  text-decoration: none;
  transition: color 0.2s;
}
.shr-banner-link:hover { color: var(--shr-lime-bright); }

.shr-hero {
  width: 100%;
  aspect-ratio: 21 / 9;
  border-radius: 28px;
  overflow: hidden;
  background: #000;
  border: 1px solid var(--shr-border);
  margin-bottom: 32px;
}
.shr-hero img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}

.shr-dest {
  font-size: clamp(2rem, 5vw, 3.4rem);
  font-weight: 900;
  letter-spacing: -0.035em;
  line-height: 1.05;
  color: #fff;
  margin: 0 0 20px;
}

.shr-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 40px;
}
.shr-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  background: var(--shr-card);
  border: 1px solid var(--shr-border);
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  transition: border-color 0.2s;
}
.shr-pill:hover { border-color: rgba(163, 230, 53, 0.4); }
.shr-pill-icon {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: var(--shr-lime);
  color: #000;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  flex-shrink: 0;
}

.shr-interests {
  margin-bottom: 40px;
}
.shr-interests-label {
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--shr-dim);
  margin-bottom: 12px;
}
.shr-interests-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.shr-interest {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9999px;
  color: #d4d4d8;
}

.shr-section { margin-top: 56px; }
.shr-section-title {
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #fff;
  margin: 0 0 24px;
}
.shr-section-title span { color: var(--shr-lime); }

/* Hotels */
.shr-hotels {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 18px;
}
.shr-hotel {
  background: var(--shr-card);
  border: 1px solid var(--shr-border);
  border-radius: 20px;
  overflow: hidden;
  transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.25s, box-shadow 0.25s;
  animation: shrCardIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.shr-hotel:hover {
  transform: translateY(-4px);
  border-color: rgba(163, 230, 53, 0.45);
  box-shadow: 0 16px 30px -12px rgba(0,0,0,0.9), 0 0 24px rgba(163,230,53,0.16);
}
.shr-hotel-img {
  aspect-ratio: 4 / 3;
  background: #000;
  overflow: hidden;
}
.shr-hotel-img img { width: 100%; height: 100%; object-fit: cover; }
.shr-hotel-body { padding: 16px 18px; }
.shr-hotel-name {
  font-size: 0.95rem;
  font-weight: 900;
  color: #fff;
  line-height: 1.25;
  margin: 0 0 8px;
}
.shr-hotel-row {
  font-size: 0.78rem;
  color: var(--shr-muted);
  font-weight: 600;
  margin-bottom: 4px;
  display: flex;
  gap: 6px;
  align-items: flex-start;
}
.shr-hotel-price {
  font-size: 0.9rem;
  font-weight: 900;
  color: var(--shr-lime);
  margin-top: 8px;
}
.shr-hotel-rating {
  font-size: 0.75rem;
  color: var(--shr-muted);
  font-weight: 700;
  margin-top: 4px;
}

/* Itinerary */
.shr-day { margin-bottom: 40px; }
.shr-day-head {
  font-size: 1.15rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.01em;
  margin: 0 0 18px;
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.shr-day-head .date {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--shr-dim);
  letter-spacing: 0.06em;
}
.shr-activities {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
}

.shr-activity {
  display: flex;
  gap: 14px;
  background: var(--shr-card);
  border: 1px solid var(--shr-border);
  border-radius: 18px;
  padding: 14px;
  transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.25s, box-shadow 0.25s;
  animation: shrCardIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.shr-activity:hover {
  transform: translateY(-3px);
  border-color: rgba(163, 230, 53, 0.4);
  box-shadow: 0 14px 28px -14px rgba(0,0,0,0.9), 0 0 20px rgba(163,230,53,0.12);
}
.shr-activity-img {
  width: 88px; height: 88px;
  border-radius: 14px;
  overflow: hidden;
  background: #000;
  flex-shrink: 0;
}
.shr-activity-img img { width: 100%; height: 100%; object-fit: cover; }
.shr-activity-body { flex: 1; min-width: 0; }
.shr-activity-time {
  font-size: 0.72rem;
  font-weight: 900;
  color: var(--shr-lime);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 4px;
}
.shr-activity-title {
  font-size: 0.95rem;
  font-weight: 900;
  color: #fff;
  line-height: 1.25;
  margin: 0 0 6px;
}
.shr-activity-desc {
  font-size: 0.78rem;
  color: var(--shr-muted);
  line-height: 1.5;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.shr-activity-loc {
  font-size: 0.72rem;
  color: var(--shr-dim);
  margin-bottom: 4px;
}
.shr-activity-cost {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--shr-lime);
}

/* Budget */
.shr-budget {
  background: var(--shr-card);
  border: 1px solid var(--shr-border);
  border-radius: 22px;
  padding: 26px;
  max-width: 480px;
}
.shr-budget-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.9rem;
}
.shr-budget-row:last-of-type { border-bottom: none; }
.shr-budget-row .label { color: var(--shr-muted); font-weight: 600; }
.shr-budget-row .val { color: #fff; font-weight: 800; }
.shr-budget-total {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
  margin-top: 12px;
  border-top: 2px solid var(--shr-lime);
}
.shr-budget-total .label {
  color: #fff;
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: -0.01em;
}
.shr-budget-total .val {
  color: var(--shr-lime);
  font-size: 1.15rem;
  font-weight: 900;
}

/* Map */
.shr-map-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

/* CTA */
.shr-cta {
  margin-top: 64px;
  background: linear-gradient(135deg, rgba(163,230,53,0.12), rgba(163,230,53,0.02));
  border: 2px solid rgba(163, 230, 53, 0.35);
  border-radius: 28px;
  padding: 40px 32px;
  text-align: center;
}
.shr-cta-title {
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #fff;
  margin: 0 0 10px;
}
.shr-cta-sub {
  font-size: 0.95rem;
  color: var(--shr-muted);
  margin: 0 0 24px;
  line-height: 1.6;
}
.shr-cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, var(--shr-lime), var(--shr-lime-bright));
  color: #000;
  padding: 14px 28px;
  border-radius: 9999px;
  font-size: 0.92rem;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 10px 26px -8px rgba(163, 230, 53, 0.6);
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.shr-cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px -8px rgba(163, 230, 53, 0.8);
}

/* Error */
.shr-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  text-align: center;
}
.shr-error-inner { max-width: 440px; }
.shr-error-icon { font-size: 3.5rem; margin-bottom: 16px; opacity: 0.6; }
.shr-error-title {
  font-size: 1.6rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.02em;
  margin: 0 0 10px;
}
.shr-error-text {
  font-size: 0.9rem;
  color: var(--shr-muted);
  line-height: 1.6;
  margin: 0 0 28px;
}

@keyframes shrCardIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .shr-orb-1, .shr-orb-2, .shr-hotel, .shr-activity { animation: none !important; }
}
```

### frontend/src/pages/SharedTrip.jsx

```
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/Skeleton";
import TripMap from "../components/TripMap";
import "./SharedTrip.css";

const parsePrice = (price) => {
  if (typeof price === "number") return price;
  if (!price) return null;
  const match = String(price).replace(/,/g, "").match(/\d+/);
  return match ? Number(match[0]) : null;
};

const formatINR = (value) => {
  const n = Number(value) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
};

const SharedTripSkeleton = () => (
  <div className="shr-root">
    <div className="shr-orb-1" />
    <div className="shr-orb-2" />
    <div className="shr-page">
      <Skeleton variant="rectangular" width={280} height={40} rounded="9999px" />
      <div style={{ marginTop: 16 }}>
        <Skeleton
          variant="rectangular"
          width="100%"
          style={{ aspectRatio: "21 / 9" }}
          rounded="28px"
        />
      </div>
      <div style={{ marginTop: 32 }}>
        <Skeleton variant="rectangular" width="55%" height={48} rounded="12px" />
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <Skeleton variant="rectangular" width={110} height={40} rounded="9999px" />
        <Skeleton variant="rectangular" width={140} height={40} rounded="9999px" />
      </div>
    </div>
  </div>
);

const SharedTrip = () => {
  const { shareId } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const res = await api.get(`/trips/shared/${shareId}`);
        setTrip(res.data);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "This shared trip doesn't exist or has been removed."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [shareId]);

  useEffect(() => {
    if (!trip) return;
    const dest = trip.destination;

    fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(
        dest + " travel"
      )}&per_page=1`,
      {
        headers: {
          Authorization: import.meta.env.VITE_PEXELS_KEY || "",
        },
      }
    )
      .then((r) => r.json())
      .then((data) => {
        const url = data?.photos?.[0]?.src?.large;
        if (url) setCoverImage(url);
      })
      .catch(() => {});

    fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        dest
      )}&count=1`
    )
      .then((r) => r.json())
      .then((data) => {
        const r = data?.results?.[0];
        if (!r) return;
        return fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${r.latitude}&longitude=${r.longitude}&current=temperature_2m,wind_speed_10m&timezone=auto`
        )
          .then((r) => r.json())
          .then((w) =>
            setWeather({
              location: { lat: r.latitude, lng: r.longitude },
              current: w.current,
            })
          );
      })
      .catch(() => {});
  }, [trip]);

  if (loading) return <SharedTripSkeleton />;

  if (error) {
    return (
      <div className="shr-root">
        <div className="shr-orb-1" />
        <div className="shr-orb-2" />
        <div className="shr-error">
          <div className="shr-error-inner">
            <div className="shr-error-icon">🔍</div>
            <h1 className="shr-error-title">Trip not found</h1>
            <p className="shr-error-text">{error}</p>
            <Link to="/" className="shr-cta-btn">
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) return null;

  const days = Math.max(
    1,
    Math.round(
      (new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24)
    )
  );
  const budgetLabel =
    trip.budget < 20000 ? "Cheap" : trip.budget < 50000 ? "Moderate" : "Luxury";

  const heroImg =
    coverImage ||
    `https://picsum.photos/seed/${encodeURIComponent(trip.destination)}/1600/700`;

  return (
    <div className="shr-root">
      <div className="shr-orb-1" />
      <div className="shr-orb-2" />

      <main className="shr-page">
        <div className="shr-banner">
          <div className="shr-badge">
            <span className="shr-badge-icon">🔗</span>
            Shared trip · by {trip.sharedBy}
          </div>
          <Link to="/register" className="shr-banner-link">
            Plan your own trip →
          </Link>
        </div>

        <div className="shr-hero">
          <img
            src={heroImg}
            alt={trip.destination}
            onError={(e) => {
              e.target.src = `https://picsum.photos/seed/${encodeURIComponent(
                trip.destination
              )}/1600/700`;
            }}
          />
        </div>

        <h1 className="shr-dest">{trip.destination}</h1>

        <div className="shr-pills">
          <span className="shr-pill">
            <span className="shr-pill-icon">📅</span>
            {days} Day{days > 1 ? "s" : ""}
          </span>
          <span className="shr-pill">
            <span className="shr-pill-icon">💰</span>
            {budgetLabel} Budget
          </span>
          <span className="shr-pill">
            <span className="shr-pill-icon">👥</span>
            {trip.travellers} Traveller{trip.travellers > 1 ? "s" : ""}
          </span>
        </div>

        {trip.interests?.length > 0 && (
          <div className="shr-interests">
            <div className="shr-interests-label">Interests</div>
            <div className="shr-interests-list">
              {trip.interests.map((tag) => (
                <span key={tag} className="shr-interest">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {trip.hotels?.length > 0 && (
          <section className="shr-section">
            <h2 className="shr-section-title">
              Hotel <span>Recommendation</span>
            </h2>
            <div className="shr-hotels">
              {trip.hotels.map((h, i) => {
                const imgUrl =
                  h.image ||
                  `https://picsum.photos/seed/${encodeURIComponent(h.name)}/400/300`;
                const priceNum = parsePrice(h.price);
                return (
                  <div key={i} className="shr-hotel">
                    <div className="shr-hotel-img">
                      <img src={imgUrl} alt={h.name} />
                    </div>
                    <div className="shr-hotel-body">
                      <h3 className="shr-hotel-name">{h.name}</h3>
                      <div className="shr-hotel-row">📍 {h.address}</div>
                      <div className="shr-hotel-price">
                        💰 {priceNum !== null ? `${formatINR(priceNum)}/night` : h.price}
                      </div>
                      <div className="shr-hotel-rating">⭐ {h.rating} stars</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {trip.itinerary?.length > 0 && (
          <section className="shr-section">
            <h2 className="shr-section-title">
              Day-by-Day <span>Itinerary</span>
            </h2>
            {trip.itinerary.map((day) => (
              <div key={day.day} className="shr-day">
                <h3 className="shr-day-head">
                  Day {day.day} <span className="date">{day.date}</span>
                </h3>
                <div className="shr-activities">
                  {day.activities.map((act, idx) => {
                    const imgUrl =
                      act.image ||
                      `https://picsum.photos/seed/${encodeURIComponent(act.title)}/200/200`;
                    return (
                      <div key={idx} className="shr-activity">
                        <div className="shr-activity-img">
                          <img src={imgUrl} alt={act.title} />
                        </div>
                        <div className="shr-activity-body">
                          <div className="shr-activity-time">{act.time}</div>
                          <h4 className="shr-activity-title">{act.title}</h4>
                          <p className="shr-activity-desc">{act.description}</p>
                          <div className="shr-activity-loc">📍 {act.location}</div>
                          <div className="shr-activity-cost">
                            {formatINR(act.cost)} per person
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {trip.budgetBreakdown?.total > 0 && (
          <section className="shr-section">
            <h2 className="shr-section-title">
              Budget <span>Breakdown</span>
            </h2>
            <div className="shr-budget">
              {[
                { label: "✈️ Flights", value: trip.budgetBreakdown.flights },
                { label: "🏨 Hotels", value: trip.budgetBreakdown.hotels },
                { label: "🍽 Food", value: trip.budgetBreakdown.food },
                { label: "🎟 Activities", value: trip.budgetBreakdown.activities },
              ].map((item, i) => (
                <div key={i} className="shr-budget-row">
                  <span className="label">{item.label}</span>
                  <span className="val">{formatINR(item.value)}</span>
                </div>
              ))}
              <div className="shr-budget-total">
                <span className="label">Total</span>
                <span className="val">{formatINR(trip.budgetBreakdown.total)}</span>
              </div>
            </div>
          </section>
        )}

        {weather?.location && (
          <section className="shr-section">
            <h2 className="shr-section-title">
              Destination <span>Map</span>
            </h2>
            <div className="shr-map-pills">
              <span className="shr-pill">
                <span className="shr-pill-icon">🌤️</span>
                {Math.round(weather.current?.temperature_2m ?? 0)}°C
              </span>
              <span className="shr-pill">
                <span className="shr-pill-icon">💨</span>
                {weather.current?.wind_speed_10m ?? 0} km/h wind
              </span>
            </div>
            <TripMap
              lat={weather.location.lat}
              lng={weather.location.lng}
              label={trip.destination}
            />
          </section>
        )}

        <div className="shr-cta">
          <h3 className="shr-cta-title">Loved this itinerary?</h3>
          <p className="shr-cta-sub">
            Create your own AI-powered trip in under a minute.
          </p>
          <Link to="/register" className="shr-cta-btn">
            ✨ Plan Your Own Trip
          </Link>
        </div>
      </main>
    </div>
  );
};

export default SharedTrip;
```

### frontend/src/pages/TripDetail.css

```
/* frontend/src/pages/TripDetail.css */

/* ═════════════════════════════════════════════════════
   TOP ROW
   ═════════════════════════════════════════════════════ */

.td-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  min-height: 40px;
  position: relative;
  z-index: 40;
  margin-bottom: 16px;
}

.td-more-wrap {
  position: relative;
  display: inline-flex;
}

.td-more-btn {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1.5px solid rgba(255, 255, 255, 0.12);
  background: #111111;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition:
    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.22s ease,
    background 0.22s ease,
    color 0.22s ease,
    box-shadow 0.22s ease;
}

.td-more-btn:hover {
  border-color: #a3e635;
  background: rgba(163, 230, 53, 0.12);
  color: #a3e635;
  transform: translateY(-2px);
  box-shadow: 0 12px 24px -10px rgba(163, 230, 53, 0.55);
}

.td-more-btn.open {
  border-color: #a3e635;
  background: #a3e635;
  color: #000000;
  transform: translateY(-2px);
}

.td-more-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(163, 230, 53, 0.4);
}

.td-more-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 260px;
  background: #0b0b0b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  padding: 8px;
  box-shadow:
    0 24px 48px -16px rgba(0, 0, 0, 0.95),
    0 0 0 1px rgba(163, 230, 53, 0.08);
  z-index: 100;
  animation: tdMenuIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top right;
}
@keyframes tdMenuIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.td-more-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  background: transparent;
  border: none;
  color: #e5e5e5;
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
  padding: 11px 14px;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}
.td-more-item:hover:not(:disabled) {
  background: rgba(163, 230, 53, 0.1);
  color: #a3e635;
  transform: translateX(2px);
}
.td-more-item:disabled { opacity: 0.55; cursor: not-allowed; }

.td-more-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  font-size: 15px;
  flex-shrink: 0;
}

.td-more-item-pdf {
  padding: 4px;
  margin-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.td-more-item-pdf .pdf-btn { width: 100%; justify-content: center; }

/* ═════════════════════════════════════════════════════
   BOTTOM ACTION BAR
   ═════════════════════════════════════════════════════ */

.td-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-top: 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin-top: 64px;
  flex-wrap: wrap;
}

.td-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 20px;
  border-radius: 999px;
  border: 1.5px solid transparent;
  background: #111111;
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  cursor: pointer;
  text-decoration: none;
  overflow: hidden;
  white-space: nowrap;
  transition:
    transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.28s ease,
    background 0.28s ease,
    color 0.28s ease;
}
.td-btn::before {
  content: "";
  position: absolute;
  top: 0; left: -75%;
  width: 50%; height: 100%;
  background: linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%);
  transform: skewX(-20deg);
  transition: left 0.65s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}
.td-btn:hover::before { left: 125%; }
.td-btn:hover { transform: translateY(-3px); }
.td-btn:active { transform: translateY(-1px); }
.td-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(163, 230, 53, 0.5);
}

.td-btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  line-height: 1;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.td-btn:hover .td-btn-icon { transform: scale(1.25) rotate(-8deg); }

.td-btn-edit {
  background: #111111;
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.1);
}
.td-btn-edit:hover {
  background: rgba(163, 230, 53, 0.12);
  border-color: #a3e635;
  color: #a3e635;
  box-shadow: 0 14px 30px -10px rgba(163, 230, 53, 0.55);
}
.td-btn-edit:hover .td-btn-icon { transform: scale(1.15) rotate(-10deg); }

/* Delete Trip button */
.delete-trip-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 20px;
  border-radius: 999px;
  border: 1.5px solid rgba(248, 113, 113, 0.35);
  background: #111111;
  color: #f87171;
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition:
    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    background 0.25s ease,
    border-color 0.25s ease,
    color 0.25s ease,
    box-shadow 0.25s ease;
}
.delete-trip-btn:hover:not(:disabled) {
  background: rgba(248, 113, 113, 0.12);
  border-color: #ef4444;
  color: #fecaca;
  transform: translateY(-3px);
  box-shadow: 0 14px 30px -10px rgba(239, 68, 68, 0.4);
}
.delete-trip-btn:active:not(:disabled) { transform: translateY(-1px); }
.delete-trip-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.delete-trip-btn__icon { font-size: 14px; line-height: 1; }

/* ═════════════════════════════════════════════════════
   DARK THEME — page root
   ═════════════════════════════════════════════════════ */

.td-root {
  --td-bg: #050505;
  --td-card: #111111;
  --td-border: rgba(255, 255, 255, 0.1);
  --td-muted: #888888;
  --td-dim: #52525b;
  --td-lime: #a3e635;
  --td-lime-bright: #bef264;
  --td-lime-glow: rgba(163, 230, 53, 0.4);
  --td-lime-subtle: rgba(163, 230, 53, 0.12);
  background: var(--td-bg);
  color: #fff;
  min-height: 100vh;
  font-family: 'Poppins', system-ui, sans-serif;
  overflow-x: hidden;
  position: relative;
  padding-bottom: 80px;
}
.td-orb-1, .td-orb-2 {
  position: fixed;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.td-orb-1 {
  top: -120px; left: 8%;
  width: 500px; height: 500px;
  background: radial-gradient(circle, var(--td-lime-glow) 0%, rgba(163,230,53,0.05) 50%, transparent 75%);
  animation: tdFloat 10s ease-in-out infinite alternate;
}
.td-orb-2 {
  bottom: -120px; right: 8%;
  width: 450px; height: 450px;
  background: radial-gradient(circle, rgba(96,165,250,0.16) 0%, transparent 70%);
  animation: tdFloat 13s ease-in-out infinite alternate-reverse;
}
@keyframes tdFloat {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(40px, 40px) scale(1.15); }
}

.td-page {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px 0;
}

.td-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--td-muted);
  text-decoration: none;
  transition: color 0.2s;
  font-weight: 600;
}
.td-back:hover { color: var(--td-lime); }

/* Hero */
.td-hero {
  width: 100%;
  aspect-ratio: 21 / 9;
  border-radius: 28px;
  overflow: hidden;
  background: #000;
  border: 1px solid var(--td-border);
  margin-bottom: 32px;
  margin-top: 16px;
}
.td-hero img { width: 100%; height: 100%; object-fit: cover; display: block; }

.td-dest {
  font-size: clamp(2rem, 5vw, 3.4rem);
  font-weight: 900;
  letter-spacing: -0.035em;
  line-height: 1.05;
  color: #fff;
  margin: 0 0 20px;
}

/* Pills */
.td-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
}
.td-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  background: var(--td-card);
  border: 1px solid var(--td-border);
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  transition: border-color 0.2s;
}
.td-pill:hover { border-color: rgba(163, 230, 53, 0.4); }
.td-pill-icon {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: var(--td-lime);
  color: #000;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  flex-shrink: 0;
}

.td-error {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fecaca;
  padding: 12px 16px;
  border-radius: 14px;
  margin-bottom: 20px;
  font-size: 0.85rem;
}

.td-section { margin-top: 56px; }
.td-section-title {
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #fff;
  margin: 0 0 24px;
}
.td-section-title span { color: var(--td-lime); }

/* Hotels */
.td-hotels {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 18px;
}
.td-hotel {
  background: var(--td-card);
  border: 1px solid var(--td-border);
  border-radius: 20px;
  overflow: hidden;
  transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.25s, box-shadow 0.25s;
}
.td-hotel:hover {
  transform: translateY(-4px);
  border-color: rgba(163, 230, 53, 0.45);
  box-shadow: 0 16px 30px -12px rgba(0,0,0,0.9), 0 0 24px rgba(163,230,53,0.16);
}
.td-hotel-img {
  aspect-ratio: 4 / 3;
  background: #000;
  overflow: hidden;
}
.td-hotel-img img { width: 100%; height: 100%; object-fit: cover; }
.td-hotel-body { padding: 16px 18px; }
.td-hotel-name {
  font-size: 0.95rem;
  font-weight: 900;
  color: #fff;
  line-height: 1.25;
  margin: 0 0 8px;
}
.td-hotel-row {
  font-size: 0.78rem;
  color: var(--td-muted);
  font-weight: 600;
  margin-bottom: 4px;
}
.td-hotel-price {
  font-size: 0.9rem;
  font-weight: 900;
  color: var(--td-lime);
  margin-top: 8px;
}
.td-hotel-rating {
  font-size: 0.75rem;
  color: var(--td-muted);
  font-weight: 700;
  margin-top: 4px;
}

/* Itinerary */
.td-day { margin-bottom: 40px; }
.td-day-head {
  font-size: 1.15rem;
  font-weight: 900;
  color: #fff;
  margin: 0 0 18px;
}
.td-activities {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
}
.td-activity {
  display: flex;
  gap: 14px;
  background: var(--td-card);
  border: 1px solid var(--td-border);
  border-radius: 18px;
  padding: 14px;
  transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.25s, box-shadow 0.25s;
}
.td-activity:hover {
  transform: translateY(-3px);
  border-color: rgba(163, 230, 53, 0.4);
  box-shadow: 0 14px 28px -14px rgba(0,0,0,0.9), 0 0 20px rgba(163,230,53,0.12);
}
.td-activity-img {
  width: 88px; height: 88px;
  border-radius: 14px;
  overflow: hidden;
  background: #000;
  flex-shrink: 0;
}
.td-activity-img img { width: 100%; height: 100%; object-fit: cover; }
.td-activity-body { flex: 1; min-width: 0; }
.td-activity-time {
  font-size: 0.72rem;
  font-weight: 900;
  color: var(--td-lime);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 4px;
}
.td-activity-title {
  font-size: 0.95rem;
  font-weight: 900;
  color: #fff;
  line-height: 1.25;
  margin: 0 0 6px;
}
.td-activity-desc {
  font-size: 0.78rem;
  color: var(--td-muted);
  line-height: 1.5;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.td-activity-loc {
  font-size: 0.72rem;
  color: var(--td-dim);
  margin-bottom: 4px;
}
.td-activity-cost {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--td-lime);
}

/* Nearby places */
.td-places {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
}
.td-place {
  background: var(--td-card);
  border: 1px solid var(--td-border);
  border-radius: 20px;
  overflow: hidden;
  transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.25s, box-shadow 0.25s;
}
.td-place:hover {
  transform: translateY(-4px);
  border-color: rgba(163, 230, 53, 0.45);
  box-shadow: 0 16px 30px -12px rgba(0,0,0,0.9), 0 0 24px rgba(163,230,53,0.16);
}
.td-place-img {
  aspect-ratio: 4 / 3;
  background: #000;
  overflow: hidden;
}
.td-place-img img { width: 100%; height: 100%; object-fit: cover; }
.td-place-body { padding: 16px 18px; }
.td-place-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}
.td-place-name {
  font-size: 0.9rem;
  font-weight: 900;
  color: #fff;
  line-height: 1.25;
  margin: 0;
}
.td-place-tag {
  font-size: 0.65rem;
  font-weight: 900;
  padding: 3px 8px;
  background: var(--td-lime-subtle);
  color: var(--td-lime);
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
  flex-shrink: 0;
}
.td-place-desc {
  font-size: 0.75rem;
  color: var(--td-muted);
  line-height: 1.5;
  margin: 0 0 10px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.td-place-link {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--td-lime);
  text-decoration: none;
  transition: color 0.2s;
}
.td-place-link:hover { color: var(--td-lime-bright); }

/* Weather card */
.td-weather-card {
  border: 1px solid rgba(163, 230, 53, 0.35);
  background: linear-gradient(135deg, rgba(163,230,53,0.10), rgba(163,230,53,0.02));
  border-radius: 28px;
  padding: 32px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  flex-wrap: wrap;
}
.td-weather-left { flex: 1; min-width: 260px; }
.td-weather-kicker {
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--td-lime);
  margin-bottom: 10px;
}
.td-weather-title {
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 900;
  letter-spacing: -0.025em;
  line-height: 1.15;
  color: #fff;
  margin: 0 0 12px;
}
.td-weather-text {
  font-size: 0.9rem;
  color: var(--td-muted);
  line-height: 1.6;
  max-width: 480px;
  margin: 0 0 22px;
}
.td-weather-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, var(--td-lime), var(--td-lime-bright));
  color: #000;
  padding: 13px 24px;
  border-radius: 9999px;
  font-size: 0.9rem;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 8px 24px -6px rgba(163, 230, 53, 0.5);
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.td-weather-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px -6px rgba(163, 230, 53, 0.7);
}
.td-weather-badge {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #000;
  border: 1px solid var(--td-border);
  border-radius: 20px;
  padding: 18px 22px;
  flex-shrink: 0;
}
.td-weather-icon { font-size: 2.4rem; line-height: 1; }
.td-weather-temp {
  font-size: 2rem;
  font-weight: 900;
  color: #fff;
  line-height: 1;
  letter-spacing: -0.03em;
}
.td-weather-temp .unit {
  font-size: 1rem;
  color: var(--td-dim);
  margin-left: 4px;
  font-weight: 700;
}
.td-weather-wind {
  font-size: 0.72rem;
  color: var(--td-muted);
  font-weight: 700;
  margin-top: 6px;
}

/* Share modal */
.td-share-back {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.td-share-modal {
  background: #0b0b0b;
  border: 1px solid var(--td-border);
  border-radius: 22px;
  padding: 26px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 30px 80px -20px rgba(0,0,0,0.9), 0 0 40px -10px rgba(163,230,53,0.15);
}
.td-share-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}
.td-share-title {
  font-size: 1.15rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.02em;
  margin: 0 0 4px;
}
.td-share-sub {
  font-size: 0.8rem;
  color: var(--td-muted);
  margin: 0;
  line-height: 1.5;
}
.td-share-close {
  background: transparent;
  border: 1px solid var(--td-border);
  color: var(--td-muted);
  width: 32px; height: 32px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-family: inherit;
  transition: all 0.2s;
  flex-shrink: 0;
}
.td-share-close:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
}
.td-share-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.td-share-input {
  flex: 1;
  min-width: 0;
  background: #000;
  border: 1px solid var(--td-border);
  border-radius: 12px;
  padding: 12px 14px;
  color: #fff;
  font-family: 'Roboto Mono', monospace;
  font-size: 0.82rem;
  outline: none;
}
.td-share-input:focus { border-color: var(--td-lime); }
.td-share-copy {
  background: linear-gradient(135deg, var(--td-lime), var(--td-lime-bright));
  color: #000;
  border: none;
  padding: 12px 18px;
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.2s;
}
.td-share-copy:hover { transform: translateY(-1px); }
.td-share-open {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--td-lime);
  text-decoration: none;
}
.td-share-open:hover { color: var(--td-lime-bright); }

/* Responsive */
@media (max-width: 640px) {
  .td-top-row {
    flex-wrap: wrap;
    gap: 10px;
  }
  .td-actions-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .td-actions-bar .td-btn { justify-content: center; }
  .td-more-menu { min-width: 230px; right: -4px; }
}

@media (prefers-reduced-motion: reduce) {
  .td-btn, .td-btn::before, .td-btn-icon,
  .td-more-btn, .td-more-item, .td-more-menu,
  .td-orb-1, .td-orb-2 {
    animation: none !important;
    transition: none !important;
  }
}

/* ─────────────────────────────────────────────────────────
   LOCAL CURRENCY BADGE
   ───────────────────────────────────────────────────────── */

.td-local-currency {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-radius: 16px;
  margin-bottom: 22px;
  font-size: 0.85rem;
  font-weight: 600;
  flex-wrap: wrap;
  transition: all 0.25s ease;
}

.td-local-currency.is-different {
  background: linear-gradient(135deg, rgba(163, 230, 53, 0.14), rgba(163, 230, 53, 0.03));
  border: 1px solid rgba(163, 230, 53, 0.4);
  color: #d4e8b0;
}

.td-local-currency.is-active {
  background: rgba(163, 230, 53, 0.08);
  border: 1px solid rgba(163, 230, 53, 0.25);
  color: #a3e635;
}

.td-local-flag {
  font-size: 1.4rem;
  line-height: 1;
  flex-shrink: 0;
}

.td-local-text {
  flex: 1;
  min-width: 180px;
}

.td-local-text strong {
  color: #a3e635;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.td-local-switch {
  background: linear-gradient(135deg, #a3e635, #bef264);
  color: #000;
  border: none;
  padding: 8px 16px;
  border-radius: 9999px;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  letter-spacing: 0.02em;
  box-shadow: 0 6px 18px -4px rgba(163, 230, 53, 0.6);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.2s;
}

.td-local-switch:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px -4px rgba(163, 230, 53, 0.8);
}

.td-local-switch:active {
  transform: translateY(0);
}

@media (max-width: 640px) {
  .td-local-currency {
    padding: 10px 14px;
    font-size: 0.8rem;
  }
  .td-local-flag {
    font-size: 1.2rem;
  }
  .td-local-switch {
    width: 100%;
    text-align: center;
    padding: 10px 16px;
  }
}

/* ═════════════════════════════════════════════════════
   HOTEL CARD — clickable to book
   ═════════════════════════════════════════════════════ */

.td-hotel {
  cursor: pointer;
  position: relative;
}

.td-hotel:focus-visible {
  outline: 2px solid var(--td-lime);
  outline-offset: 3px;
}

.td-hotel:hover {
  transform: translateY(-4px);
  border-color: rgba(163, 230, 53, 0.6);
  box-shadow:
    0 20px 40px -12px rgba(0, 0, 0, 0.9),
    0 0 28px rgba(163, 230, 53, 0.25);
}

.td-hotel-img {
  position: relative;
  overflow: hidden;
}

.td-hotel-img img {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.td-hotel:hover .td-hotel-img img {
  transform: scale(1.06);
}

.td-hotel-img-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.55) 100%
  );
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.td-hotel:hover .td-hotel-img-overlay {
  opacity: 1;
}

.td-hotel-book-badge {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%) translateY(6px);
  background: linear-gradient(135deg, #a3e635, #bef264);
  color: #000;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  padding: 7px 14px;
  border-radius: 9999px;
  white-space: nowrap;
  box-shadow: 0 8px 22px -6px rgba(163, 230, 53, 0.7);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.td-hotel:hover .td-hotel-book-badge {
  transform: translateX(-50%) translateY(0);
}

@media (max-width: 640px) {
  .td-hotel-img-overlay {
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0) 40%,
      rgba(0, 0, 0, 0.6) 100%
    );
    opacity: 1;
  }
  .td-hotel-book-badge {
    transform: translateX(-50%) translateY(0);
    font-size: 0.68rem;
    padding: 6px 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .td-hotel-img img,
  .td-hotel-book-badge,
  .td-hotel-img-overlay {
    transition: none;
  }
}
```

### frontend/src/pages/TripDetail.jsx

```
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/Skeleton";
import TripMap from "../components/TripMap";
import DeleteButton from "../components/DeleteButton";
import ItineraryPaper from "../components/ItineraryPaper";
import LiquidMetalButton from "../components/LiquidMetalButton";
import { useTripActions } from "../context/TripActionsContext";
import "./TripDetail.css";

const parsePrice = (price) => {
  if (typeof price === "number") return price;
  if (!price) return null;
  const match = String(price).replace(/,/g, "").match(/\d+/);
  return match ? Number(match[0]) : null;
};

const formatINR = (value) => {
  const n = Number(value) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
};

/* Build a Booking.com search URL for the hotel */
const getBookingUrl = (hotel, destination) => {
  const parts = [hotel?.name, destination].filter(Boolean);
  const query = parts.join(" ").trim() || "hotel";
  return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
    query
  )}`;
};

const TripDetailSkeleton = () => (
  <div className="td-root">
    <div className="td-orb-1" />
    <div className="td-orb-2" />
    <div className="td-page">
      <Skeleton variant="text" width={120} height={14} />
      <div style={{ marginTop: 16 }}>
        <Skeleton
          variant="rectangular"
          width="100%"
          style={{ aspectRatio: "21 / 9" }}
          rounded="28px"
        />
      </div>
      <div style={{ marginTop: 32 }}>
        <Skeleton variant="rectangular" width="55%" height={48} rounded="12px" />
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <Skeleton variant="rectangular" width={110} height={40} rounded="9999px" />
        <Skeleton variant="rectangular" width={140} height={40} rounded="9999px" />
        <Skeleton variant="rectangular" width={180} height={40} rounded="9999px" />
      </div>
    </div>
  </div>
);

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setActions } = useTripActions();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [weather, setWeather] = useState(null);
  const [places, setPlaces] = useState([]);
  const [coverImage, setCoverImage] = useState(null);

  const [shareUrl, setShareUrl] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const res = await api.get(`/trips/${id}`);
        setTrip(res.data);
        api
          .get(`/trips/${id}/places`)
          .then((r) => setPlaces(r.data.places || []))
          .catch(() => {});
        api
          .get(`/trips/${id}/weather`)
          .then((w) => setWeather(w.data))
          .catch(() => {});
        api
          .get(`/trips/${id}/image`)
          .then((r) => setCoverImage(r.data.imageUrl))
          .catch(() => {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [id]);

  useEffect(() => {
    if (!trip || generating) return;
    if (searchParams.get("autoGen") !== "1") return;
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("autoGen");
    setSearchParams(newParams, { replace: true });
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, searchParams]);

  useEffect(() => {
    if (!trip) {
      setActions(null);
      return;
    }
    setActions({
      trip,
      shareLoading,
      onShare: async () => {
        setShareLoading(true);
        try {
          const res = await api.post(`/trips/${id}/share`);
          const shareId = res.data.shareId;
          setShareUrl(`${window.location.origin}/share/${shareId}`);
        } catch (err) {
          alert(err.response?.data?.message || "Could not generate share link");
        } finally {
          setShareLoading(false);
        }
      },
    });
    return () => setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, id, shareLoading]);

  const handleGenerate = async () => {
    setGenError("");
    setGenerating(true);
    try {
      const res = await api.post(`/trips/${id}/generate`);
      setTrip({
        ...trip,
        itinerary: res.data.itinerary,
        hotels: res.data.hotels || [],
        budgetBreakdown: res.data.budgetBreakdown,
      });
    } catch (err) {
      setGenError(err.response?.data?.message || "AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Could not copy — please copy manually");
    }
  };

  const handleDelete = async () => {
    await api.delete(`/trips/${id}`);
    navigate("/trips");
  };

  const openBooking = (hotel) => {
    const url = getBookingUrl(hotel, trip.destination);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) return <TripDetailSkeleton />;
  if (!trip) return null;

  const days = Math.max(
    1,
    Math.round(
      (new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24)
    )
  );
  const budgetLabel =
    trip.budget < 20000 ? "Cheap" : trip.budget < 50000 ? "Moderate" : "Luxury";

  const heroImg =
    trip.image ||
    coverImage ||
    `https://picsum.photos/seed/${encodeURIComponent(trip.destination)}/1600/700`;

  return (
    <div className="td-root">
      <div className="td-orb-1" />
      <div className="td-orb-2" />

      <div className="td-page">
        <div className="td-top-row">
          <Link to="/trips" className="td-back">
            ← Back to trips
          </Link>
        </div>

        <div className="td-hero">
          <img
            src={heroImg}
            alt={trip.destination}
            onError={(e) => {
              e.target.src = `https://picsum.photos/seed/${encodeURIComponent(
                trip.destination
              )}/1600/700`;
            }}
          />
        </div>

        <h1 className="td-dest">{trip.destination}</h1>

        <div className="td-pills">
          <span className="td-pill">
            <span className="td-pill-icon">📅</span>
            {days} Day{days > 1 ? "s" : ""}
          </span>
          {trip.spotsCount > 0 && (
            <span className="td-pill">
              <span className="td-pill-icon">📍</span>
              {trip.spotsCount} places
            </span>
          )}
          <span className="td-pill">
            <span className="td-pill-icon">💰</span>
            {formatINR(trip.budget)} · {budgetLabel}
          </span>
          <span className="td-pill">
            <span className="td-pill-icon">👥</span>
            Travellers: {trip.travellers}
          </span>
        </div>

        {genError && <p className="td-error">{genError}</p>}

        <div style={{ marginTop: 32 }}>
          <LiquidMetalButton
            type="button"
            onClick={handleGenerate}
            loading={generating}
            disabled={generating}
          >
            {trip.itinerary?.length ? "Regenerate Trip" : "Generate Trip"}
          </LiquidMetalButton>
        </div>

        {trip.hotels?.length > 0 && (
          <section className="td-section">
            <h2 className="td-section-title">
              Hotel <span>Recommendation</span>
            </h2>
            <div className="td-hotels">
              {trip.hotels.map((h, i) => {
                const imgUrl =
                  h.image ||
                  `https://picsum.photos/seed/${encodeURIComponent(h.name)}/400/300`;
                const priceNum = parsePrice(h.price);
                return (
                  <div
                    key={i}
                    className="td-hotel"
                    role="button"
                    tabIndex={0}
                    onClick={() => openBooking(h)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openBooking(h);
                      }
                    }}
                    aria-label={`Book ${h.name} on Booking.com`}
                  >
                    <div className="td-hotel-img">
                      <img src={imgUrl} alt={h.name} />
                      <div className="td-hotel-img-overlay">
                        <span className="td-hotel-book-badge">
                          🏨 Book Now →
                        </span>
                      </div>
                    </div>
                    <div className="td-hotel-body">
                      <h3 className="td-hotel-name">{h.name}</h3>
                      <div className="td-hotel-row">📍 {h.address}</div>
                      <div className="td-hotel-price">
                        💰 {priceNum !== null ? `${formatINR(priceNum)}/night` : h.price}
                      </div>
                      <div className="td-hotel-rating">⭐ {h.rating} stars</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {trip.itinerary?.length > 0 && (
          <section className="td-section">
            <h2 className="td-section-title">
              Places to <span>Visit</span>
            </h2>
            {trip.itinerary.map((day) => (
              <div key={day.day} className="td-day">
                <h3 className="td-day-head">Day {day.day}</h3>
                <div className="td-activities">
                  {day.activities.map((act, idx) => {
                    const imgUrl =
                      act.image ||
                      `https://picsum.photos/seed/${encodeURIComponent(act.title)}/200/200`;
                    return (
                      <div key={idx} className="td-activity">
                        <div className="td-activity-img">
                          <img src={imgUrl} alt={act.title} />
                        </div>
                        <div className="td-activity-body">
                          <div className="td-activity-time">{act.time}</div>
                          <h4 className="td-activity-title">{act.title}</h4>
                          <p className="td-activity-desc">{act.description}</p>
                          <div className="td-activity-loc">
                            ⏱ {act.time?.split("-")[1]?.trim() || "Flexible"}
                          </div>
                          <div className="td-activity-cost">
                            {formatINR(act.cost)} per person
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {places.length > 0 && (
          <section className="td-section">
            <h2 className="td-section-title">
              Famous Tourist <span>Spots Nearby</span>
            </h2>
            <div className="td-places">
              {places.map((p) => {
                const imgUrl =
                  p.image ||
                  `https://picsum.photos/seed/${encodeURIComponent(p.name)}/400/300`;
                return (
                  <div key={p.id} className="td-place">
                    <div className="td-place-img">
                      <img src={imgUrl} alt={p.name} />
                    </div>
                    <div className="td-place-body">
                      <div className="td-place-head">
                        <h3 className="td-place-name">{p.name}</h3>
                        <span className="td-place-tag">{p.type}</span>
                      </div>
                      {p.description && (
                        <p className="td-place-desc">{p.description}</p>
                      )}
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="td-place-link"
                      >
                        View on map →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {weather?.location && (
          <section className="td-section">
            <h2 className="td-section-title">
              Destination <span>Map</span>
            </h2>
            <div className="td-pills" style={{ marginBottom: 18 }}>
              <span className="td-pill">
                <span className="td-pill-icon">🌤️</span>
                {Math.round(weather.current?.temperature_2m ?? 0)}°C
              </span>
              <span className="td-pill">
                <span className="td-pill-icon">💨</span>
                {weather.current?.wind_speed_10m ?? 0} km/h wind
              </span>
            </div>
            <TripMap
              lat={weather.location.lat}
              lng={weather.location.lng}
              label={trip.destination}
              places={places}
              itinerary={trip.itinerary}
            />
          </section>
        )}

        {weather?.location && (
          <section className="td-section">
            <div className="td-weather-card">
              <div className="td-weather-left">
                <div className="td-weather-kicker">Smart Weather Plan</div>
                <h2 className="td-weather-title">Plan your trip around the weather</h2>
                <p className="td-weather-text">
                  We check the weather for each day of your trip. Outdoor plans
                  go on sunny days, and indoor plans go on rainy days.
                </p>
                <Link to={`/trips/${id}/weather-itinerary`} className="td-weather-cta">
                  See Smart Weather Plan →
                </Link>
              </div>
              <div className="td-weather-badge">
                <span className="td-weather-icon">🌤️</span>
                <div>
                  <div className="td-weather-temp">
                    {Math.round(weather.current?.temperature_2m ?? 0)}°
                    <span className="unit">C</span>
                  </div>
                  <div className="td-weather-wind">
                    💨 {Math.round(weather.current?.wind_speed_10m ?? 0)} km/h wind
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="td-actions-bar">
          <Link to={`/trips/${id}/edit`} className="td-btn td-btn-edit">
            <span className="td-btn-icon">✏️</span>
            <span>Edit Trip</span>
          </Link>
          <DeleteButton label="Delete Trip" onClick={handleDelete} />
        </div>
      </div>

      <div id="itnHolder" className="itn-paper-holder">
        <ItineraryPaper trip={trip} places={places} />
      </div>

      {shareUrl && (
        <div
          className="td-share-back"
          onClick={() => {
            setShareUrl("");
            setCopied(false);
          }}
        >
          <div className="td-share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="td-share-head">
              <div>
                <h3 className="td-share-title">🔗 Share this trip</h3>
                <p className="td-share-sub">
                  Anyone with this link can view your itinerary.
                </p>
              </div>
              <button
                onClick={() => {
                  setShareUrl("");
                  setCopied(false);
                }}
                className="td-share-close"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="td-share-row">
              <input
                type="text"
                readOnly
                value={shareUrl}
                onClick={(e) => e.target.select()}
                className="td-share-input"
              />
              <button onClick={copyShareUrl} className="td-share-copy">
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="td-share-open"
            >
              Open in new tab →
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDetail;
```

### frontend/src/pages/TripJournal.css

```
/* frontend/src/pages/TripJournal.css */

.tj-root {
  --tj-bg: #050505;
  --tj-card: #111111;
  --tj-card-hover: #181818;
  --tj-border: rgba(255, 255, 255, 0.1);
  --tj-border-strong: rgba(255, 255, 255, 0.2);
  --tj-muted: #888888;
  --tj-dim: #52525b;
  --tj-lime: #a3e635;
  --tj-lime-bright: #bef264;
  --tj-lime-glow: rgba(163, 230, 53, 0.4);
  --tj-lime-subtle: rgba(163, 230, 53, 0.12);
  --tj-sky: #60a5fa;
  --tj-sky-subtle: rgba(96, 165, 250, 0.12);
  --tj-amber: #fbbf24;
  --tj-amber-subtle: rgba(251, 191, 36, 0.12);
  --tj-purple: #c084fc;
  --tj-purple-subtle: rgba(192, 132, 252, 0.12);

  position: relative;
  background: var(--tj-bg);
  color: #fff;
  font-family: 'Poppins', system-ui, sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
}

.tj-orb-1, .tj-orb-2 {
  position: fixed;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.tj-orb-1 {
  top: -120px; left: 8%;
  width: 500px; height: 500px;
  background: radial-gradient(circle, var(--tj-lime-glow) 0%, rgba(163,230,53,0.05) 50%, transparent 75%);
  animation: tjFloat 10s ease-in-out infinite alternate;
}
.tj-orb-2 {
  bottom: -120px; right: 8%;
  width: 450px; height: 450px;
  background: radial-gradient(circle, rgba(96,165,250,0.18) 0%, transparent 70%);
  animation: tjFloat 13s ease-in-out infinite alternate-reverse;
}
@keyframes tjFloat {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(40px, 40px) scale(1.15); }
}

.tj-scroll-progress {
  position: fixed; top: 0; left: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--tj-lime), var(--tj-lime-bright));
  z-index: 200;
  width: 0%;
  transition: width 0.1s linear;
  box-shadow: 0 0 12px var(--tj-lime-glow);
}

/* ---------- Page ---------- */
.tj-page {
  position: relative; z-index: 2;
  max-width: 1080px; margin: 0 auto;
  padding: 48px 32px 100px;
}

/* ---------- Masthead ---------- */
.tj-masthead {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 40px;
  align-items: end;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--tj-border-strong);
  margin-bottom: 12px;
}
@media (max-width: 720px) { .tj-masthead { grid-template-columns: 1fr; } }

.tj-masthead-left { display: flex; flex-direction: column; gap: 20px; }
.tj-kicker {
  display: inline-flex; align-items: center; gap: 10px;
  font-size: 0.7rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.16em;
  color: var(--tj-lime);
  background: var(--tj-lime-subtle);
  border: 1px solid rgba(163, 230, 53, 0.3);
  padding: 5px 12px;
  border-radius: 9999px;
  width: fit-content;
}

.tj-title {
  font-size: clamp(2rem, 5vw, 3.6rem);
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.035em;
  color: #fff;
}
.tj-title em {
  font-style: italic;
  color: var(--tj-lime);
  text-shadow: 0 0 30px var(--tj-lime-glow);
  font-weight: 800;
}
.tj-lede {
  font-size: 0.98rem; color: var(--tj-muted);
  line-height: 1.6; max-width: 580px;
}

.tj-masthead-right {
  display: flex; flex-direction: column;
  gap: 4px; text-align: right;
  font-size: 0.68rem; color: var(--tj-dim);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
}
.tj-masthead-right strong {
  font-size: 0.85rem; color: #fff;
  font-weight: 800; letter-spacing: 0.1em;
}
@media (max-width: 720px) {
  .tj-masthead-right { text-align: left; padding-top: 20px; border-top: 1px solid var(--tj-border); }
}

/* ---------- Stat strip ---------- */
.tj-stat-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 1px solid var(--tj-border);
  margin-bottom: 40px;
}
@media (max-width: 640px) { .tj-stat-strip { grid-template-columns: repeat(2, 1fr); } }

.tj-stat-cell {
  padding: 22px 22px 22px 0;
  border-right: 1px solid var(--tj-border);
  display: flex; flex-direction: column; gap: 6px;
}
.tj-stat-cell:last-child { border-right: none; padding-right: 0; }
.tj-stat-cell:nth-child(n+3) { padding-left: 22px; }
@media (max-width: 640px) {
  .tj-stat-cell:nth-child(2n) { border-right: none; padding-right: 0; padding-left: 22px; }
  .tj-stat-cell:nth-child(2n+1) { padding-left: 0; }
}
.tj-stat-key {
  font-size: 0.62rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.16em;
  color: var(--tj-dim);
}
.tj-stat-val {
  font-size: 2.2rem; font-weight: 900;
  color: #fff;
  line-height: 1;
  letter-spacing: -0.03em;
}
.tj-stat-val .accent { color: var(--tj-lime); font-style: italic; font-weight: 800; }
.tj-stat-val .unit {
  font-size: 0.68rem; font-weight: 800;
  color: var(--tj-muted);
  margin-left: 6px;
  letter-spacing: 0.1em;
}

/* ---------- Controls ---------- */
.tj-controls {
  display: flex; align-items: center;
  justify-content: space-between;
  gap: 20px; margin-bottom: 40px;
  flex-wrap: wrap;
}
.tj-segmented {
  display: inline-flex;
  background: #0b0b0b;
  border: 1px solid var(--tj-border);
  border-radius: 999px;
  padding: 4px;
}
.tj-segmented button {
  background: transparent; border: none;
  color: var(--tj-muted);
  padding: 8px 18px; border-radius: 999px;
  font-size: 0.72rem; font-weight: 800;
  font-family: inherit;
  cursor: pointer; transition: all 0.2s;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.tj-segmented button:hover { color: #fff; }
.tj-segmented button.active {
  background: var(--tj-lime);
  color: #000;
  font-weight: 800;
}

.tj-filters { display: flex; flex-wrap: wrap; gap: 8px; }
.tj-filter-pill {
  display: inline-flex; align-items: center; gap: 8px;
  background: transparent;
  border: 1px solid var(--tj-border);
  color: var(--tj-muted);
  padding: 8px 14px; border-radius: 999px;
  font-size: 0.7rem; font-weight: 800;
  font-family: inherit;
  cursor: pointer; transition: all 0.25s;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.tj-filter-pill:hover { border-color: var(--tj-border-strong); color: #fff; }
.tj-filter-pill.off { opacity: 0.35; }
.tj-filter-pill .dot {
  width: 8px; height: 8px; border-radius: 50%;
  transition: transform 0.2s;
}
.tj-filter-pill:not(.off) .dot { transform: scale(1.2); }
.tj-filter-pill[data-filter="destination"] .dot { background: var(--tj-lime); }
.tj-filter-pill[data-filter="hotel"]       .dot { background: var(--tj-sky); }
.tj-filter-pill[data-filter="activity"]    .dot { background: var(--tj-amber); }
.tj-filter-pill[data-filter="transport"]   .dot { background: var(--tj-purple); }

/* ---------- Journal wrapper ---------- */
.tj-journal-wrap { position: relative; }
.tj-layout { display: none; }
.tj-layout.active { display: block; }

/* ============================================================
   LAYOUT 1 — ZIGZAG
   ============================================================ */
.tj-zigzag { position: relative; padding-top: 20px; }

.tj-zigzag-path {
  position: absolute;
  left: 50%; top: 0; bottom: 0;
  width: 80px;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 1;
  opacity: 0.35;
}
@media (max-width: 860px) { .tj-zigzag-path { display: none; } }
.tj-zigzag-path svg { width: 100%; height: 100%; }
.tj-zigzag-path path {
  fill: none;
  stroke: var(--tj-lime);
  stroke-width: 1.5;
  stroke-dasharray: 4 8;
}

.zz-entry {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 88px 1fr;
  gap: 0;
  padding: 28px 0;
  align-items: center;
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.zz-entry.revealed { opacity: 1; transform: translateY(0); }

@media (max-width: 860px) {
  .zz-entry { grid-template-columns: 56px 1fr; gap: 16px; padding: 20px 0; }
}

.zz-left, .zz-right { display: flex; flex-direction: column; }
.zz-left  { align-items: flex-end; padding-right: 12px; }
.zz-right { align-items: flex-start; padding-left: 12px; }

@media (max-width: 860px) {
  .zz-left  { grid-column: 2; align-items: flex-start; padding: 0; }
  .zz-right { grid-column: 2; align-items: flex-start; padding: 0; }
  .zz-right.empty, .zz-left.empty { display: none; }
}

.zz-marker-col {
  display: flex; justify-content: center;
  align-items: center;
  position: relative;
  z-index: 3;
}
@media (max-width: 860px) {
  .zz-marker-col { grid-column: 1; grid-row: 1; justify-content: flex-start; }
}

.zz-marker {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: var(--tj-bg);
  border: 2px solid var(--tj-border-strong);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  transition: all 0.3s;
}
.zz-marker-num {
  font-size: 0.92rem; font-weight: 900;
  color: var(--tj-dim); line-height: 1;
}
.zz-marker-day {
  font-size: 0.48rem; font-weight: 800;
  color: var(--tj-dim); letter-spacing: 0.08em;
  margin-top: 1px;
}
.zz-entry.revealed .zz-marker { border-color: var(--tj-lime); background: var(--tj-lime); box-shadow: 0 0 20px var(--tj-lime-glow); }
.zz-entry.revealed .zz-marker-num,
.zz-entry.revealed .zz-marker-day { color: #000; }
.zz-entry[data-type="hotel"].revealed .zz-marker { border-color: var(--tj-sky); background: var(--tj-sky); box-shadow: 0 0 20px rgba(96,165,250,0.4); }
.zz-entry[data-type="activity"].revealed .zz-marker { border-color: var(--tj-amber); background: var(--tj-amber); box-shadow: 0 0 20px rgba(251,191,36,0.4); }
.zz-entry[data-type="transport"].revealed .zz-marker { border-color: var(--tj-purple); background: var(--tj-purple); box-shadow: 0 0 20px rgba(192,132,252,0.4); }

/* Card */
.zz-card {
  width: 100%; max-width: 420px;
  background: var(--tj-card);
  color: #fff;
  border: 1px solid var(--tj-border);
  border-radius: 18px;
  padding: 22px 24px;
  position: relative;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.25s, box-shadow 0.25s, background 0.25s;
  cursor: pointer;
  overflow: hidden;
}
.zz-card:hover {
  transform: translateY(-4px);
  background: var(--tj-card-hover);
  border-color: rgba(163, 230, 53, 0.4);
  box-shadow: 0 16px 30px -12px rgba(0,0,0,0.9),
              0 0 24px rgba(163,230,53,0.14);
}

@media (max-width: 860px) { .zz-card { max-width: none; } }

.zz-card::before {
  content: "";
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 4px; background: var(--tj-lime);
}
.zz-entry[data-type="hotel"]     .zz-card::before { background: var(--tj-sky); }
.zz-entry[data-type="activity"]  .zz-card::before { background: var(--tj-amber); }
.zz-entry[data-type="transport"] .zz-card::before { background: var(--tj-purple); }

.zz-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; padding-bottom: 12px;
  border-bottom: 1px dashed var(--tj-border);
}
.zz-cat {
  font-size: 0.62rem; font-weight: 900;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--tj-lime);
}
.zz-entry[data-type="hotel"]     .zz-cat { color: var(--tj-sky); }
.zz-entry[data-type="activity"]  .zz-cat { color: var(--tj-amber); }
.zz-entry[data-type="transport"] .zz-cat { color: var(--tj-purple); }

.zz-day {
  font-size: 0.62rem; font-weight: 800;
  color: var(--tj-muted); letter-spacing: 0.1em;
  background: rgba(255, 255, 255, 0.06);
  padding: 3px 8px; border-radius: 6px;
}
.zz-title {
  font-size: 1.25rem; font-weight: 900;
  color: #fff; line-height: 1.15;
  letter-spacing: -0.02em; margin-bottom: 4px;
}
.zz-time {
  font-size: 0.62rem; font-weight: 800;
  color: var(--tj-dim);
  letter-spacing: 0.14em; text-transform: uppercase;
  margin-bottom: 12px;
}
.zz-desc {
  font-size: 0.85rem;
  color: var(--tj-muted);
  line-height: 1.6; margin-bottom: 14px;
}
.zz-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.zz-chip {
  font-size: 0.6rem; font-weight: 700;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #d4d4d8; border-radius: 6px;
  letter-spacing: 0.04em;
}

/* Transport ticket */
.zz-entry[data-type="transport"] .zz-card {
  background: #0b0b0b;
  padding: 18px 20px;
  background-image:
    radial-gradient(circle at 0% 50%, var(--tj-bg) 5px, transparent 5.5px),
    radial-gradient(circle at 100% 50%, var(--tj-bg) 5px, transparent 5.5px);
  background-size: 100% 100%;
}
.zz-entry[data-type="transport"] .zz-card::before { background: var(--tj-purple); }

/* Hotel stamp */
.zz-entry[data-type="hotel"] .zz-card::after {
  content: "HOTEL";
  position: absolute; top: 18px; right: 22px;
  font-size: 0.5rem; font-weight: 900;
  color: var(--tj-sky);
  border: 1.5px solid var(--tj-sky);
  padding: 3px 6px; border-radius: 4px;
  letter-spacing: 0.22em;
  transform: rotate(-6deg);
  opacity: 0.55;
}

.zz-entry[data-type="destination"] .zz-card {
  padding: 26px 26px 22px;
  max-width: 440px;
  background: linear-gradient(135deg, rgba(163,230,53,0.08), rgba(163,230,53,0.01));
  border-color: rgba(163, 230, 53, 0.25);
}
.zz-entry[data-type="destination"] .zz-title { font-size: 1.7rem; }

/* ============================================================
   LAYOUT 2 — STREAM
   ============================================================ */
.tj-stream {
  position: relative;
  padding-top: 20px;
  padding-left: 8px;
}
.tj-stream::before {
  content: "";
  position: absolute;
  left: 31px; top: 24px; bottom: 24px;
  width: 2px;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(163, 230, 53, 0.35) 6%,
    rgba(163, 230, 53, 0.5) 50%,
    rgba(163, 230, 53, 0.35) 94%,
    transparent 100%);
  border-radius: 2px;
}
@media (max-width: 600px) { .tj-stream::before { left: 19px; } }

.st-event {
  position: relative;
  padding-left: 84px;
  padding-bottom: 40px;
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}
.st-event.revealed { opacity: 1; transform: translateY(0); }
.st-event:last-child { padding-bottom: 0; }
@media (max-width: 600px) { .st-event { padding-left: 60px; padding-bottom: 32px; } }

.st-pin {
  position: absolute;
  left: 20px; top: 2px;
  width: 24px; height: 24px;
  border-radius: 50%;
  background: var(--tj-bg);
  border: 2px solid var(--tj-dim);
  display: flex; align-items: center; justify-content: center;
  z-index: 3;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.st-pin-inner {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--tj-dim);
  transition: all 0.35s;
}
.st-event.revealed .st-pin {
  border-color: var(--tj-lime);
  box-shadow: 0 0 18px var(--tj-lime-glow);
}
.st-event.revealed .st-pin-inner {
  background: var(--tj-lime);
  box-shadow: 0 0 10px var(--tj-lime);
}
.st-event[data-type="hotel"].revealed .st-pin { border-color: var(--tj-sky); box-shadow: 0 0 18px rgba(96,165,250,0.5); }
.st-event[data-type="hotel"].revealed .st-pin-inner { background: var(--tj-sky); box-shadow: 0 0 10px var(--tj-sky); }
.st-event[data-type="activity"].revealed .st-pin { border-color: var(--tj-amber); box-shadow: 0 0 18px rgba(251,191,36,0.5); }
.st-event[data-type="activity"].revealed .st-pin-inner { background: var(--tj-amber); box-shadow: 0 0 10px var(--tj-amber); }
.st-event[data-type="transport"].revealed .st-pin { border-color: var(--tj-purple); box-shadow: 0 0 18px rgba(192,132,252,0.5); }
.st-event[data-type="transport"].revealed .st-pin-inner { background: var(--tj-purple); box-shadow: 0 0 10px var(--tj-purple); }

.st-event[data-type="destination"] .st-pin { width: 32px; height: 32px; left: 16px; top: -2px; border-width: 2.5px; }
.st-event[data-type="destination"] .st-pin-inner { width: 11px; height: 11px; }
.st-event[data-type="destination"].revealed .st-pin { animation: stPulse 2.8s ease-in-out infinite; }
@keyframes stPulse {
  0%, 100% { box-shadow: 0 0 18px var(--tj-lime-glow); }
  50%      { box-shadow: 0 0 30px rgba(163, 230, 53, 0.85); }
}
@media (max-width: 600px) {
  .st-pin { left: 8px; }
  .st-event[data-type="destination"] .st-pin { left: 4px; }
}

.st-head {
  display: flex; align-items: baseline;
  justify-content: space-between;
  gap: 16px; margin-bottom: 10px;
  flex-wrap: wrap;
}
.st-day {
  font-size: 0.7rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--tj-dim);
  display: flex; align-items: center; gap: 10px;
}
.st-day .num { color: var(--tj-lime); font-weight: 900; }
.st-event[data-type="hotel"]     .st-day .num { color: var(--tj-sky); }
.st-event[data-type="activity"]  .st-day .num { color: var(--tj-amber); }
.st-event[data-type="transport"] .st-day .num { color: var(--tj-purple); }

.st-time {
  font-size: 0.66rem; font-weight: 800;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--tj-muted);
  padding: 4px 12px;
  background: var(--tj-card);
  border: 1px solid var(--tj-border);
  border-radius: 100px;
}

.st-title {
  font-size: 1.35rem; font-weight: 900;
  letter-spacing: -0.025em; line-height: 1.15;
  color: #fff;
  margin-bottom: 10px;
  display: flex; align-items: center; gap: 12px;
  transition: color 0.25s;
}
.st-event[data-type="destination"] .st-title { font-size: 1.7rem; }
.st-event:hover .st-title { color: var(--tj-lime-bright); }
.st-emoji { font-size: 1.05rem; }
.st-event[data-type="destination"] .st-emoji { font-size: 1.35rem; }

.st-body {
  background: var(--tj-card);
  border: 1px solid var(--tj-border);
  border-radius: 16px;
  padding: 18px 22px;
  transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.st-body::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(163, 230, 53, 0.5) 50%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s;
}
.st-event:hover .st-body {
  background: var(--tj-card-hover);
  border-color: var(--tj-border-strong);
  transform: translateX(4px);
  box-shadow: 0 14px 32px -18px rgba(0,0,0,0.9);
}
.st-event:hover .st-body::before { opacity: 1; }

.st-event[data-type="destination"] .st-body {
  background: linear-gradient(135deg, rgba(163, 230, 53, 0.08), rgba(163, 230, 53, 0.02));
  border-color: rgba(163, 230, 53, 0.22);
}
.st-event[data-type="hotel"] .st-body {
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.08), rgba(96, 165, 250, 0.015));
  border-color: rgba(96, 165, 250, 0.18);
}
.st-event[data-type="activity"] .st-body {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.07), rgba(251, 191, 36, 0.015));
  border-color: rgba(251, 191, 36, 0.18);
}
.st-event[data-type="transport"] .st-body {
  background: linear-gradient(135deg, rgba(192, 132, 252, 0.08), rgba(192, 132, 252, 0.015));
  border-color: rgba(192, 132, 252, 0.18);
}

.st-desc { font-size: 0.88rem; line-height: 1.6; color: #c8cbd8; font-weight: 400; }

.st-chips {
  display: flex; flex-wrap: wrap; gap: 6px;
  margin-top: 14px; padding-top: 14px;
  border-top: 1px solid var(--tj-border);
}
.st-chip {
  font-size: 0.62rem; font-weight: 800;
  letter-spacing: 0.06em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 100px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--tj-muted);
  border: 1px solid var(--tj-border);
}
.st-event[data-type="destination"] .st-chip {
  background: var(--tj-lime-subtle); color: var(--tj-lime);
  border-color: rgba(163, 230, 53, 0.25);
}
.st-event[data-type="hotel"] .st-chip {
  background: var(--tj-sky-subtle); color: var(--tj-sky);
  border-color: rgba(96, 165, 250, 0.2);
}
.st-event[data-type="activity"] .st-chip {
  background: var(--tj-amber-subtle); color: var(--tj-amber);
  border-color: rgba(251, 191, 36, 0.2);
}
.st-event[data-type="transport"] .st-chip {
  background: var(--tj-purple-subtle); color: var(--tj-purple);
  border-color: rgba(192, 132, 252, 0.2);
}

.zz-entry.filtered-out,
.st-event.filtered-out { display: none; }

/* ---------- Footer ---------- */
.tj-page-footer {
  margin-top: 80px; padding-top: 24px;
  border-top: 1px solid var(--tj-border);
  display: flex; flex-wrap: wrap;
  justify-content: space-between; align-items: center;
  gap: 16px;
  font-size: 0.72rem; color: var(--tj-dim);
  letter-spacing: 0.06em; text-transform: uppercase;
  font-weight: 700;
}
.tj-page-footer a { color: var(--tj-lime); text-decoration: none; font-weight: 800; }
.tj-page-footer a:hover { text-decoration: underline; }

@media (prefers-reduced-motion: reduce) {
  .zz-entry, .st-event, .zz-card, .zz-marker, .st-pin { animation: none !important; transition: none !important; }
  .tj-orb-1, .tj-orb-2 { animation: none !important; }
}

/* ═════════════════════════════════════════════════════
   COMPACT CARDS — shrink journal entry cards
   ═════════════════════════════════════════════════════ */

/* Zigzag layout — card */
.tj-root .zz-card {
  max-width: 340px;
  padding: 16px 18px;
  border-radius: 14px;
}
.tj-root .zz-title {
  font-size: 1rem;
  margin-bottom: 2px;
}
.tj-root .zz-desc {
  font-size: 0.78rem;
  margin-bottom: 10px;
  line-height: 1.5;
}
.tj-root .zz-head {
  padding-bottom: 8px;
  margin-bottom: 8px;
}
.tj-root .zz-cat {
  font-size: 0.56rem;
}
.tj-root .zz-day {
  font-size: 0.56rem;
}
.tj-root .zz-time {
  font-size: 0.56rem;
  margin-bottom: 8px;
}
.tj-root .zz-chip {
  font-size: 0.55rem;
  padding: 2px 6px;
}

/* Zigzag layout — numbered marker */
.tj-root .zz-marker {
  width: 34px;
  height: 34px;
}
.tj-root .zz-marker-num {
  font-size: 0.75rem;
}
.tj-root .zz-marker-day {
  font-size: 0.42rem;
}

/* Zigzag layout — reduce vertical gaps */
.tj-root .zz-entry {
  padding: 16px 0;
}

/* Stream layout — body card */
.tj-root .st-body {
  padding: 14px 16px;
  border-radius: 12px;
}
.tj-root .st-title {
  font-size: 1rem;
  margin-bottom: 6px;
}
.tj-root .st-desc {
  font-size: 0.78rem;
  line-height: 1.55;
}
.tj-root .st-chips {
  margin-top: 10px;
  padding-top: 10px;
  gap: 5px;
}
.tj-root .st-chip {
  font-size: 0.55rem;
  padding: 3px 8px;
}
.tj-root .st-time {
  font-size: 0.58rem;
  padding: 3px 9px;
}
.tj-root .st-day {
  font-size: 0.62rem;
}
.tj-root .st-event {
  padding-left: 72px;
  padding-bottom: 28px;
}
.tj-root .st-pin {
  width: 20px;
  height: 20px;
  left: 22px;
}
.tj-root .st-pin-inner {
  width: 6px;
  height: 6px;
}
/* Mobile — even smaller */
@media (max-width: 640px) {
  .tj-root .zz-card {
    max-width: 100%;
    padding: 14px 16px;
  }
  .tj-root .zz-title {
    font-size: 0.92rem;
  }
  .tj-root .zz-desc {
    font-size: 0.74rem;
  }
  .tj-root .st-body {
    padding: 12px 14px;
  }
  .tj-root .st-title {
    font-size: 0.92rem;
  }
  .tj-root .st-desc {
    font-size: 0.74rem;
  }
}

/* ═════════════════════════════════════════════════════
   MAKE DESTINATION CARD SAME SIZE AS OTHERS
   ═════════════════════════════════════════════════════ */

/* Zigzag layout — destination card override */
.tj-root .zz-entry[data-type="destination"] .zz-card {
  padding: 16px 18px;
  max-width: 340px;
  border-radius: 14px;
  background: var(--tj-card);
  border-color: var(--tj-border);
}

.tj-root .zz-entry[data-type="destination"] .zz-title {
  font-size: 1rem;
  line-height: 1.15;
  margin-bottom: 4px;
}

/* Stream layout — destination override */
.tj-root .st-event[data-type="destination"] .st-title {
  font-size: 1rem;
}

.tj-root .st-event[data-type="destination"] .st-body {
  background: var(--tj-card);
  border-color: var(--tj-border);
  padding: 14px 16px;
}

.tj-root .st-event[data-type="destination"] .st-pin {
  width: 20px;
  height: 20px;
  left: 22px;
  top: 2px;
  border-width: 2px;
}

.tj-root .st-event[data-type="destination"] .st-pin-inner {
  width: 6px;
  height: 6px;
}

@media (max-width: 640px) {
  .tj-root .zz-entry[data-type="destination"] .zz-card {
    max-width: 100%;
    padding: 14px 16px;
  }
  .tj-root .zz-entry[data-type="destination"] .zz-title,
  .tj-root .st-event[data-type="destination"] .st-title {
    font-size: 0.92rem;
  }
}
```

### frontend/src/pages/TripJournal.jsx

```
import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import "./TripJournal.css";

/* ─────────── Demo data (Japan trip) ─────────── */
const DEMO_ENTRIES = [
  { type: "destination", day: 1, time: "Morning", title: "Tokyo", emoji: "🗼",
    desc: "Arrive at Narita, transfer to Shinjuku, and settle in for four nights in the capital.",
    chips: ["4 nights", "Shinjuku base"] },
  { type: "hotel", day: 1, time: "Afternoon", title: "Park Hyatt Tokyo", emoji: "🏨",
    desc: "High-rise above Shinjuku with Mount Fuji views on clear days. Walking distance to the metro.",
    chips: ["Shinjuku", "4 nights"] },
  { type: "activity", day: 2, time: "Morning", title: "Tsukiji Outer Market", emoji: "🍣",
    desc: "Fresh sushi, tamagoyaki, and matcha from the stalls that never left after the market moved.",
    chips: ["Food", "2 hrs"] },
  { type: "activity", day: 2, time: "Afternoon", title: "Senso-ji & Asakusa", emoji: "⛩️",
    desc: "Tokyo's oldest temple, the Nakamise shopping street, and a slow walk along the Sumida.",
    chips: ["Culture", "3 hrs"] },
  { type: "activity", day: 3, time: "All day", title: "Shibuya, Harajuku & Omotesando", emoji: "🛍️",
    desc: "The scramble crossing, Takeshita Street, and the tree-lined avenue of flagship boutiques.",
    chips: ["Shopping", "Full day"] },
  { type: "transport", day: 5, time: "Morning", title: "Tokyo → Hakone", emoji: "🚄",
    desc: "Shinkansen to Odawara, then the Tozan Railway up into the mountains.",
    chips: ["90 min", "Shinkansen"] },
  { type: "destination", day: 5, time: "Midday", title: "Hakone", emoji: "🌋",
    desc: "An onsen town inside the Fuji-Hakone-Izu National Park. Two nights of hot springs and mountain air.",
    chips: ["2 nights", "Onsen"] },
  { type: "hotel", day: 5, time: "Afternoon", title: "Gora Kadan Ryokan", emoji: "♨️",
    desc: "A traditional ryokan with private onsen, kaiseki dinner, and tatami rooms overlooking the valley.",
    chips: ["Ryokan", "2 nights"] },
  { type: "activity", day: 6, time: "All day", title: "Lake Ashi & Owakudani", emoji: "🚡",
    desc: "Pirate ship across Lake Ashi, ropeway over the volcanic valley, black eggs at the summit.",
    chips: ["Outdoor", "Full day"] },
  { type: "transport", day: 7, time: "Morning", title: "Hakone → Kyoto", emoji: "🚄",
    desc: "Back down to Odawara, then a two-hour shinkansen ride west to Kyoto Station.",
    chips: ["2 hrs", "Reserved seats"] },
  { type: "destination", day: 7, time: "Afternoon", title: "Kyoto", emoji: "⛩️",
    desc: "Japan's former capital — 1,600 temples, 400 shrines, and the country's most refined food culture.",
    chips: ["3 nights", "Old capital"] },
  { type: "hotel", day: 7, time: "Evening", title: "The Ritz-Carlton Kyoto", emoji: "🏨",
    desc: "Riverside property on the Kamogawa with a quiet garden courtyard and modern-Japanese rooms.",
    chips: ["Kamogawa", "3 nights"] },
  { type: "activity", day: 8, time: "Dawn", title: "Fushimi Inari at Sunrise", emoji: "⛩️",
    desc: "Ten thousand vermilion torii gates up Mount Inari, blissfully empty before seven a.m.",
    chips: ["Hike", "3 hrs"] },
  { type: "activity", day: 8, time: "Afternoon", title: "Arashiyama Bamboo Grove", emoji: "🎋",
    desc: "The famous path through the bamboo, plus the monkey park and Togetsukyo Bridge.",
    chips: ["Nature", "Half day"] },
  { type: "activity", day: 9, time: "All day", title: "Gion & Kiyomizu-dera", emoji: "🍵",
    desc: "Morning at the hillside temple, afternoon tea ceremony, evening walk through Gion's lantern-lit lanes.",
    chips: ["Culture", "Full day"] },
  { type: "transport", day: 10, time: "Morning", title: "Kyoto → Osaka", emoji: "🚄",
    desc: "A fifteen-minute shinkansen hop — barely enough time to finish a station bento.",
    chips: ["15 min", "Short hop"] },
  { type: "destination", day: 10, time: "Midday", title: "Osaka", emoji: "🏯",
    desc: "Japan's kitchen and nightlife capital. Two nights of street food, neon, and Dotonbori chaos.",
    chips: ["2 nights", "Street food"] },
  { type: "hotel", day: 10, time: "Afternoon", title: "Conrad Osaka", emoji: "🏨",
    desc: "Skyline views from Nakanoshima, walkable to Umeda and a short metro to Dotonbori.",
    chips: ["Nakanoshima", "2 nights"] },
  { type: "activity", day: 11, time: "Evening", title: "Dotonbori Food Crawl", emoji: "🍢",
    desc: "Takoyaki, okonomiyaki, kushikatsu, and the Glico running man. Come hungry.",
    chips: ["Food", "4 hrs"] },
  { type: "transport", day: 12, time: "Morning", title: "Osaka → Kansai Airport", emoji: "🚆",
    desc: "The Nankai Rapi:t express to KIX — forty minutes through Osaka's southern suburbs.",
    chips: ["40 min", "Airport"] }
];

const CATEGORY_LABELS = {
  destination: "City",
  hotel: "Stay",
  activity: "Activity",
  transport: "Transit"
};

const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);

function daysBetween(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
}

/* ─────────── Transform a real trip into journal entries ─────────── */
function tripToEntries(trip) {
  if (!trip) return [];

  const entries = [];
  const startISO = trip.startDate
    ? new Date(trip.startDate).toISOString().slice(0, 10)
    : "";

  // Hero
  entries.push({
    type: "destination",
    day: 1,
    time: "Arrival",
    title: trip.destination,
    emoji: "📍",
    desc: `${daysBetween(trip.startDate, trip.endDate)}-day trip starting ${new Date(
      trip.startDate
    ).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}.`,
    chips: [
      `${trip.travellers || 1} traveller${trip.travellers > 1 ? "s" : ""}`,
      `₹ ${(trip.budget || 0).toLocaleString()}`,
    ],
  });

  // Hotels
  if (Array.isArray(trip.hotels)) {
    trip.hotels.forEach((h) => {
      entries.push({
        type: "hotel",
        day: 1,
        time: "Stay",
        title: h.name || "Hotel",
        emoji: "🏨",
        desc: h.address || "Accommodation for your trip.",
        chips: [
          h.rating ? `⭐ ${h.rating}` : null,
          h.price || null,
        ].filter(Boolean),
      });
    });
  }

  // Days + activities
  if (Array.isArray(trip.itinerary)) {
    trip.itinerary.forEach((day) => {
      (day.activities || []).forEach((act) => {
        const title = act.title || "Activity";
        const lower = title.toLowerCase();
        const desc = (act.description || "").toLowerCase();
        const text = `${lower} ${desc}`;

        // Detect transport
        const isTransport = /→|->|train|flight|drive|taxi|transfer|travel|shinkansen|airport|metro|bus/i.test(
          text
        );

        // Detect indoor/outdoor for emoji
        let emoji = "📍";
        if (isTransport) emoji = "🚆";
        else if (/museum|gallery/.test(text)) emoji = "🏛️";
        else if (/beach/.test(text)) emoji = "🏖️";
        else if (/temple|shrine/.test(text)) emoji = "⛩️";
        else if (/park|garden|nature/.test(text)) emoji = "🌳";
        else if (/hike|trek/.test(text)) emoji = "🥾";
        else if (/food|restaurant|dinner|lunch|cafe|eat/.test(text)) emoji = "🍽️";
        else if (/market|shop/.test(text)) emoji = "🛍️";
        else if (/castle|palace/.test(text)) emoji = "🏰";
        else if (/boat|ferry|cruise/.test(text)) emoji = "⛵";
        else if (/sunrise|sunset|viewpoint/.test(text)) emoji = "🌅";

        const chips = [];
        if (act.time) chips.push(act.time);
        if (act.cost) chips.push(`₹ ${act.cost}`);

        entries.push({
          type: isTransport ? "transport" : "activity",
          day: day.day || 1,
          time: act.time || "Flexible",
          title,
          emoji,
          desc: act.description || "Planned activity.",
          chips,
        });
      });
    });
  }

  return entries;
}

/* ─────────── Entry components ─────────── */
const ZigzagEntry = ({ item, index }) => {
  const isLeft = index % 2 === 0;
  const cat = CATEGORY_LABELS[item.type] || item.type;

  const card = (
    <article className="zz-card">
      <div className="zz-head">
        <span className="zz-cat">{cat}</span>
        <span className="zz-day">DAY {pad2(item.day)}</span>
      </div>
      <h2 className="zz-title">{item.title}</h2>
      <div className="zz-time">{item.time}</div>
      <p className="zz-desc">{item.desc}</p>
      {item.chips?.length > 0 && (
        <div className="zz-chips">
          {item.chips.map((c, i) => (
            <span className="zz-chip" key={i}>{c}</span>
          ))}
        </div>
      )}
    </article>
  );

  return (
    <div className="zz-entry" data-type={item.type}>
      <div className={`zz-left${isLeft ? "" : " empty"}`}>
        {isLeft ? card : null}
      </div>
      <div className="zz-marker-col">
        <div className="zz-marker">
          <span className="zz-marker-num">{pad2(index + 1)}</span>
          <span className="zz-marker-day">D{pad2(item.day)}</span>
        </div>
      </div>
      <div className={`zz-right${!isLeft ? "" : " empty"}`}>
        {!isLeft ? card : null}
      </div>
    </div>
  );
};

const StreamEntry = ({ item }) => (
  <article className="st-event" data-type={item.type}>
    <div className="st-pin"><div className="st-pin-inner" /></div>
    <div className="st-head">
      <div className="st-day">
        <span className="num">DAY {pad2(item.day)}</span>
        <span>{item.time}</span>
      </div>
      <div className="st-time">{item.time}</div>
    </div>
    <h2 className="st-title">
      <span className="st-emoji">{item.emoji}</span>
      {item.title}
    </h2>
    <div className="st-body">
      <p className="st-desc">{item.desc}</p>
      {item.chips?.length > 0 && (
        <div className="st-chips">
          {item.chips.map((c, i) => (
            <span className="st-chip" key={i}>{c}</span>
          ))}
        </div>
      )}
    </div>
  </article>
);

/* ─────────── Main page ─────────── */
const TripJournal = () => {
  const { id } = useParams();
  const isRealTrip = Boolean(id);

  const [trip, setTrip] = useState(null);
  const [tripLoading, setTripLoading] = useState(isRealTrip);
  const [tripError, setTripError] = useState("");

  const [activeView, setActiveView] = useState("zigzag");
  const [activeTypes, setActiveTypes] = useState({
    destination: true,
    hotel: true,
    activity: true,
    transport: true,
  });

  const progressRef = useRef(null);
  const rootRef = useRef(null);

  /* Fetch real trip */
  useEffect(() => {
    if (!isRealTrip) {
      setTripLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setTripLoading(true);
      setTripError("");
      try {
        const res = await api.get(`/trips/${id}`);
        if (!cancelled) setTrip(res.data);
      } catch (err) {
        if (!cancelled)
          setTripError(err.response?.data?.message || "Failed to load trip");
      } finally {
        if (!cancelled) setTripLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isRealTrip]);

  /* Compute entries */
  const entries = isRealTrip ? tripToEntries(trip) : DEMO_ENTRIES;

  /* Scroll progress */
  useEffect(() => {
    let raf = false;
    const onScroll = () => {
      if (raf) return;
      raf = true;
      requestAnimationFrame(() => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const pct = max > 0 ? window.scrollY / max : 0;
        if (progressRef.current) {
          progressRef.current.style.width = `${pct * 100}%`;
        }
        raf = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [entries]);

  /* Reveal observer */
  useEffect(() => {
    if (!rootRef.current) return;
    const els = rootRef.current.querySelectorAll(".zz-entry, .st-event");
    const io = new IntersectionObserver(
      (items) => {
        items.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -80px 0px", threshold: 0.08 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [entries, activeView]);

  useEffect(() => {
    if (!rootRef.current) return;
    const els = rootRef.current.querySelectorAll(".zz-entry, .st-event");
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.95 && r.bottom > 0) {
        el.classList.add("revealed");
      }
    });
  }, [activeView]);

  const toggleFilter = (type) => {
    setActiveTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  /* Loading / error */
  if (isRealTrip && tripLoading) {
    return (
      <div className="tj-root">
        <div className="tj-orb-1" />
        <div className="tj-orb-2" />
        <div className="tj-page">
          <div className="tj-skeleton" style={{ height: 200, marginBottom: 32 }} />
          <div className="tj-skeleton" style={{ height: 400 }} />
        </div>
      </div>
    );
  }

  if (isRealTrip && tripError) {
    return (
      <div className="tj-root">
        <div className="tj-orb-1" />
        <div className="tj-orb-2" />
        <div className="tj-page">
          <Link
            to={`/trips/${id}`}
            style={{
              color: "#888",
              marginBottom: 20,
              display: "inline-block",
              textDecoration: "none",
            }}
          >
            ← Back to trip
          </Link>
          <div className="tj-kicker">Error</div>
          <h1 className="tj-title">{tripError}</h1>
        </div>
      </div>
    );
  }

  if (isRealTrip && !trip) return null;

  const title = isRealTrip ? trip.destination : "Twelve Days";
  const subtitle = isRealTrip ? "Trip Journal" : "in Japan";

  return (
    <div className="tj-root" ref={rootRef}>
      <div className="tj-orb-1" />
      <div className="tj-orb-2" />
      <div className="tj-scroll-progress" ref={progressRef} />

      <main className="tj-page">
        {isRealTrip && (
          <Link
            to={`/trips/${id}`}
            style={{
              color: "#888",
              marginBottom: 20,
              display: "inline-block",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            ← Back to trip
          </Link>
        )}

        <header className="tj-masthead">
          <div className="tj-masthead-left">
            <div className="tj-kicker">
              {isRealTrip
                ? `${entries.filter((e) => e.type === "activity").length} activities · Field Notes`
                : "Japan · Field Notes · Vol. 01"}
            </div>
            <h1 className="tj-title">
              {title} <em>{subtitle}</em>
            </h1>
            <p className="tj-lede">
              {isRealTrip
                ? `A day-by-day journal of your trip. Switch views below, filter by category, and scroll to relive each moment.`
                : "A slow travelogue through Tokyo's alleys, Hakone's hot springs, Kyoto's thousand gates, and Osaka's neon kitchens."}
            </p>
          </div>
          <div className="tj-masthead-right">
            <span>Created</span>
            <strong>
              {isRealTrip
                ? new Date(trip.createdAt || Date.now())
                    .toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })
                    .toUpperCase()
                : "OCT 2026"}
            </strong>
            <span>Entries</span>
            <strong>{entries.length}</strong>
            <span>Days</span>
            <strong>{isRealTrip ? daysBetween(trip.startDate, trip.endDate) : 12}</strong>
          </div>
        </header>

        <div className="tj-stat-strip">
          <div className="tj-stat-cell">
            <span className="tj-stat-key">Cities</span>
            <span className="tj-stat-val">
              {entries.filter((e) => e.type === "destination").length || 1}
            </span>
          </div>
          <div className="tj-stat-cell">
            <span className="tj-stat-key">Days</span>
            <span className="tj-stat-val">
              {isRealTrip ? daysBetween(trip.startDate, trip.endDate) : 12}
              <span className="unit">total</span>
            </span>
          </div>
          <div className="tj-stat-cell">
            <span className="tj-stat-key">Activities</span>
            <span className="tj-stat-val">
              <span className="accent">
                {entries.filter((e) => e.type === "activity").length}
              </span>
            </span>
          </div>
          <div className="tj-stat-cell">
            <span className="tj-stat-key">Transit legs</span>
            <span className="tj-stat-val">
              {entries.filter((e) => e.type === "transport").length}
            </span>
          </div>
        </div>

        <div className="tj-controls">
          <div className="tj-segmented">
            <button
              type="button"
              className={activeView === "zigzag" ? "active" : ""}
              onClick={() => setActiveView("zigzag")}
            >
              ↔ Zigzag Journal
            </button>
            <button
              type="button"
              className={activeView === "stream" ? "active" : ""}
              onClick={() => setActiveView("stream")}
            >
              ↓ Vertical Stream
            </button>
          </div>
          <div className="tj-filters">
            {["destination", "hotel", "activity", "transport"].map((type) => (
              <button
                key={type}
                type="button"
                className={`tj-filter-pill${activeTypes[type] ? "" : " off"}`}
                data-filter={type}
                onClick={() => toggleFilter(type)}
              >
                <span className="dot" />
                {type === "destination"
                  ? "Cities"
                  : type === "hotel"
                  ? "Hotels"
                  : type === "activity"
                  ? "Activities"
                  : "Transport"}
              </button>
            ))}
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="tj-empty">
            <div style={{ fontSize: "3rem", marginBottom: 16, opacity: 0.5 }}>📓</div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: 8 }}>
              No journal entries yet
            </h2>
            <p style={{ color: "#888", fontSize: "0.88rem", marginBottom: 20 }}>
              Generate your itinerary first, then come back here.
            </p>
            {isRealTrip && (
              <Link
                to={`/trips/${id}`}
                className="tj-segmented"
                style={{
                  padding: "10px 22px",
                  textDecoration: "none",
                  color: "#000",
                  background: "#a3e635",
                  borderRadius: 999,
                  fontWeight: 800,
                  display: "inline-block",
                }}
              >
                Go to trip
              </Link>
            )}
          </div>
        ) : (
          <div className="tj-journal-wrap">
            <div
              className={`tj-layout tj-zigzag${
                activeView === "zigzag" ? " active" : ""
              }`}
            >
              <div className="tj-zigzag-path">
                <svg preserveAspectRatio="none" viewBox="0 0 80 1000">
                  <path d="M 40 0 Q 20 100 40 200 Q 60 300 40 400 Q 20 500 40 600 Q 60 700 40 800 Q 20 900 40 1000" />
                </svg>
              </div>
              {entries.map((item, i) => (
                <ZigzagEntry key={i} item={item} index={i} />
              ))}
            </div>

            <div
              className={`tj-layout tj-stream${
                activeView === "stream" ? " active" : ""
              }`}
            >
              {entries.map((item, i) => (
                <StreamEntry key={i} item={item} />
              ))}
            </div>
          </div>
        )}

        <footer className="tj-page-footer">
          <span>Two views · One journey · Filter categories</span>
          <span>AI Travel Planner © Field Journal</span>
        </footer>
      </main>
    </div>
  );
};

export default TripJournal;
```

### frontend/src/pages/Trips.css

```
/* frontend/src/pages/Trips.css */

.tr-root {
  --tr-bg: #050505;
  --tr-card: #111111;
  --tr-card-hover: #181818;
  --tr-border: rgba(255, 255, 255, 0.1);
  --tr-muted: #888888;
  --tr-dim: #52525b;
  --tr-lime: #a3e635;
  --tr-lime-bright: #bef264;
  --tr-lime-glow: rgba(163, 230, 53, 0.4);
  --tr-lime-subtle: rgba(163, 230, 53, 0.12);
  --tr-sky: #60a5fa;
  --tr-sky-subtle: rgba(96, 165, 250, 0.12);
  --tr-amber: #fbbf24;
  --tr-amber-subtle: rgba(251, 191, 36, 0.12);
  background: var(--tr-bg);
  color: #fff;
  min-height: 100vh;
  font-family: 'Poppins', system-ui, sans-serif;
  overflow-x: hidden;
  position: relative;
}

.tr-orb-1, .tr-orb-2 {
  position: fixed;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.tr-orb-1 {
  top: -120px; left: 8%;
  width: 500px; height: 500px;
  background: radial-gradient(circle, var(--tr-lime-glow) 0%, rgba(163,230,53,0.05) 50%, transparent 75%);
  animation: trFloatOrb 10s ease-in-out infinite alternate;
}
.tr-orb-2 {
  bottom: -120px; right: 8%;
  width: 450px; height: 450px;
  background: radial-gradient(circle, rgba(96,165,250,0.16) 0%, transparent 70%);
  animation: trFloatOrb 13s ease-in-out infinite alternate-reverse;
}
@keyframes trFloatOrb {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(40px, 40px) scale(1.15); }
}

.tr-page {
  position: relative; z-index: 10;
  max-width: 1240px; margin: 0 auto;
  padding: 48px 24px 80px;
}

.tr-header { display: flex; flex-direction: column; gap: 14px; margin-bottom: 32px; }
.tr-tag {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 0.7rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--tr-lime);
  background: var(--tr-lime-subtle);
  border: 1px solid rgba(163, 230, 53, 0.3);
  padding: 5px 12px; border-radius: 9999px;
  width: fit-content;
}
.tr-pulse {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--tr-lime);
  box-shadow: 0 0 10px var(--tr-lime);
  animation: trPulse 1.5s infinite;
}
@keyframes trPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}
.tr-title {
  font-size: clamp(1.9rem, 4.2vw, 3.2rem);
  font-weight: 900; line-height: 1.05;
  letter-spacing: -0.035em; color: #fff;
}
.tr-title span { color: var(--tr-lime); text-shadow: 0 0 30px var(--tr-lime-glow); }
.tr-subtitle {
  font-size: 1rem; color: var(--tr-muted); max-width: 720px;
  line-height: 1.6;
}
.tr-subtitle strong { color: var(--tr-lime); font-weight: 800; }

.tr-header-row {
  display: flex; justify-content: space-between; align-items: flex-end;
  gap: 20px; flex-wrap: wrap;
}

/* Cart button */
.tr-cart-btn {
  position: relative;
  display: inline-flex; align-items: center; gap: 8px;
  background: #000; color: #fff;
  border: 1px solid rgba(255,255,255,0.14);
  padding: 11px 16px; border-radius: 14px;
  font-family: inherit;
  font-size: 0.85rem; font-weight: 800; cursor: pointer;
  transition: all 0.2s;
}
.tr-cart-btn:hover {
  border-color: var(--tr-lime);
  color: var(--tr-lime);
  box-shadow: 0 0 18px rgba(163,230,53,0.2);
}
.tr-cart-btn.has-items {
  background: var(--tr-lime); color: #000;
  border-color: var(--tr-lime);
  box-shadow: 0 0 20px rgba(163,230,53,0.4);
}
.tr-cart-btn.has-items:hover { background: var(--tr-lime-bright); color: #000; }

.tr-cart-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; padding: 0 6px;
  background: var(--tr-lime); color: #000;
  border-radius: 9999px;
  font-size: 0.68rem; font-weight: 900;
  line-height: 1;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tr-cart-btn.has-items .tr-cart-badge { background: #000; color: var(--tr-lime); }
.tr-cart-badge.bump { transform: scale(1.35); }

/* Filter panel */
.tr-filter-panel {
  background: rgba(10, 10, 10, 0.88);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px; padding: 20px; margin-bottom: 22px;
  box-shadow: 0 20px 60px -20px rgba(0,0,0,0.9), 0 0 30px -10px rgba(163,230,53,0.08);
}
.tr-filter-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 12px; align-items: end;
}
@media (max-width: 820px) { .tr-filter-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 560px) { .tr-filter-grid { grid-template-columns: 1fr; } }

.tr-field { display: flex; flex-direction: column; gap: 8px; }
.tr-label {
  font-size: 0.68rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.14em;
  color: var(--tr-dim);
}
.tr-input-wrap {
  display: flex; align-items: center; gap: 10px;
  background: #000; border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px; padding: 12px 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.tr-input-wrap:focus-within {
  border-color: var(--tr-lime);
  box-shadow: 0 0 0 3px rgba(163, 230, 53, 0.15);
}
.tr-input-wrap input,
.tr-input-wrap select {
  flex: 1; background: transparent; border: none; outline: none;
  color: #fff; font-family: inherit; font-size: 0.9rem; font-weight: 600;
  color-scheme: dark; cursor: pointer;
  min-width: 0;
}
.tr-input-wrap input { cursor: text; }
.tr-input-wrap select option { background: #111; color: #fff; }
.tr-input-wrap input::placeholder { color: var(--tr-dim); font-weight: 500; }
.tr-field-icon { font-size: 1rem; opacity: 0.7; flex-shrink: 0; }

.tr-clear {
  background: transparent; border: none; cursor: pointer;
  color: var(--tr-muted); font-size: 1.1rem; line-height: 1;
  padding: 2px 4px; border-radius: 6px;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
  font-family: inherit;
}
.tr-clear:hover { color: #fff; background: rgba(255,255,255,0.08); }

.tr-kbd {
  font-size: 0.62rem; font-weight: 800;
  color: var(--tr-dim);
  border: 1px solid rgba(255,255,255,0.12);
  background: #0b0b0b;
  padding: 2px 6px; border-radius: 5px;
  letter-spacing: 0.04em; flex-shrink: 0;
}

/* Active filter pills */
.tr-active-bar {
  display: none;
  flex-wrap: wrap; align-items: center;
  gap: 8px; margin-bottom: 20px;
}
.tr-active-bar.visible { display: flex; }
.tr-active-label {
  font-size: 0.68rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.14em;
  color: var(--tr-dim); margin-right: 4px;
}
.tr-pill {
  display: inline-flex; align-items: center; gap: 7px;
  background: var(--tr-lime-subtle);
  border: 1px solid rgba(163, 230, 53, 0.35);
  color: var(--tr-lime);
  padding: 5px 8px 5px 12px;
  border-radius: 9999px;
  font-size: 0.72rem; font-weight: 800;
}
.tr-pill button {
  background: rgba(163, 230, 53, 0.2);
  border: none; color: var(--tr-lime);
  width: 16px; height: 16px; border-radius: 50%;
  font-size: 0.75rem; line-height: 1; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-family: inherit;
  transition: background 0.15s;
}
.tr-pill button:hover { background: var(--tr-lime); color: #000; }

.tr-clear-all {
  background: transparent; border: 1px solid rgba(255,255,255,0.14);
  color: var(--tr-muted);
  padding: 5px 12px; border-radius: 9999px;
  font-size: 0.72rem; font-weight: 700; cursor: pointer;
  font-family: inherit; transition: all 0.2s;
  margin-left: auto;
}
.tr-clear-all:hover { color: #fff; border-color: rgba(255,255,255,0.3); }

.tr-results {
  font-size: 0.82rem; color: var(--tr-muted); font-weight: 600;
  margin-bottom: 16px;
}
.tr-results strong { color: #fff; font-weight: 800; }
.tr-results em { color: var(--tr-lime); font-style: normal; font-weight: 800; }

/* Grid */
.tr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

/* Trip card */
.tr-card {
  background: var(--tr-card);
  border: 1px solid var(--tr-border);
  border-left-width: 3px;
  border-radius: 20px;
  padding: 18px 18px 16px;
  display: flex; flex-direction: column; gap: 12px;
  cursor: pointer; position: relative;
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.25s, box-shadow 0.25s, background 0.25s;
  animation: trCardIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes trCardIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.tr-card:hover {
  transform: translateY(-5px);
  background: var(--tr-card-hover);
  box-shadow: 0 16px 30px -12px rgba(0,0,0,0.9), 0 0 24px rgba(163,230,53,0.14);
}
.tr-card.tier-cheap    { border-left-color: var(--tr-lime); }
.tr-card.tier-moderate { border-left-color: var(--tr-sky); }
.tr-card.tier-luxury   { border-left-color: var(--tr-amber); }

.tr-card.selected {
  background: #000;
  border-color: var(--tr-lime);
  box-shadow: 0 20px 40px -12px rgba(0,0,0,0.9),
              0 0 28px rgba(163,230,53,0.28),
              inset 0 0 15px rgba(163,230,53,0.05);
}

.tr-card-top {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 10px;
}
.tr-card-thumb {
  width: 52px; height: 52px; border-radius: 14px;
  background: #000;
  border: 1px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.6rem; flex-shrink: 0;
  overflow: hidden;
}
.tr-card-thumb img { width: 100%; height: 100%; object-fit: cover; }
.tr-card.tier-cheap .tr-card-thumb    { border-color: rgba(163,230,53,0.4); }
.tr-card.tier-moderate .tr-card-thumb { border-color: rgba(96,165,250,0.4); }
.tr-card.tier-luxury .tr-card-thumb   { border-color: rgba(251,191,36,0.4); }

.tr-card-top-right {
  display: flex; flex-direction: column;
  align-items: flex-end; gap: 8px;
}

.tr-tier {
  font-size: 0.6rem; font-weight: 900;
  padding: 3px 9px; border-radius: 9999px;
  text-transform: uppercase; letter-spacing: 0.1em;
  white-space: nowrap;
}
.tr-tier.tier-cheap    { background: var(--tr-lime-subtle); color: var(--tr-lime); }
.tr-tier.tier-moderate { background: var(--tr-sky-subtle); color: var(--tr-sky); }
.tr-tier.tier-luxury   { background: var(--tr-amber-subtle); color: var(--tr-amber); }

.tr-select {
  display: inline-flex; align-items: center; gap: 6px;
  background: #000; color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
  padding: 6px 11px; border-radius: 10px;
  font-size: 0.7rem; font-weight: 800;
  cursor: pointer; font-family: inherit;
  white-space: nowrap;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  letter-spacing: 0.02em;
}
.tr-select:hover {
  border-color: var(--tr-lime);
  color: var(--tr-lime);
  transform: translateY(-1px);
}
.tr-select.selected {
  background: var(--tr-lime); color: #000;
  border-color: var(--tr-lime);
  box-shadow: 0 0 16px rgba(163,230,53,0.4);
}

.tr-name {
  font-size: 1.15rem; font-weight: 900; color: #fff;
  letter-spacing: -0.02em; line-height: 1.15;
}
.tr-country {
  font-size: 0.8rem; color: var(--tr-muted);
  font-weight: 500; margin-top: 4px;
}
.tr-meta {
  display: flex; align-items: center; gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin-top: auto;
  font-size: 0.72rem; font-weight: 700;
  color: var(--tr-dim);
}
.tr-meta .days { color: #fff; font-weight: 800; }
.tr-meta .sep { opacity: 0.4; }
.tr-meta .created { color: var(--tr-muted); }

/* Skeleton */
.tr-skeleton {
  background: linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%);
  background-size: 200% 100%;
  animation: trShimmer 1.4s infinite;
  border-radius: 20px;
  min-height: 180px;
  border: 1px solid var(--tr-border);
}
@keyframes trShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Empty */
.tr-empty {
  text-align: center; padding: 70px 20px;
  border: 1px dashed rgba(255,255,255,0.12);
  border-radius: 24px;
  background: rgba(255,255,255,0.01);
}
.tr-empty-icon { font-size: 3rem; margin-bottom: 16px; opacity: 0.5; }
.tr-empty-title {
  font-size: 1.15rem; font-weight: 800; color: #fff;
  margin-bottom: 8px;
}
.tr-empty-text {
  font-size: 0.85rem; color: var(--tr-muted);
  max-width: 400px; margin: 0 auto 20px; line-height: 1.6;
}
.tr-btn-primary {
  background: linear-gradient(135deg, var(--tr-lime), var(--tr-lime-bright));
  color: #000; border: none;
  padding: 11px 22px; border-radius: 14px;
  font-size: 0.85rem; font-weight: 800; cursor: pointer;
  font-family: inherit;
  display: inline-flex; align-items: center; gap: 8px;
  box-shadow: 0 8px 24px -6px rgba(163, 230, 53, 0.5);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  text-decoration: none;
}
.tr-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px -6px rgba(163, 230, 53, 0.7);
}

/* Drawer */
.tr-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 200;
  opacity: 0; pointer-events: none;
  transition: opacity 0.25s;
}
.tr-overlay.open { opacity: 1; pointer-events: auto; }

.tr-drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 100%; max-width: 420px;
  background: #0a0a0a;
  border-left: 1px solid rgba(255,255,255,0.1);
  z-index: 210;
  display: flex; flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: -20px 0 60px -20px rgba(0,0,0,0.9);
}
.tr-drawer.open { transform: translateX(0); }

.tr-drawer-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 22px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}
.tr-drawer-title {
  font-size: 1.1rem; font-weight: 900; color: #fff;
  letter-spacing: -0.02em;
  display: flex; align-items: center; gap: 10px;
}
.tr-drawer-title span { color: var(--tr-lime); }
.tr-drawer-close {
  background: transparent; border: 1px solid rgba(255,255,255,0.14);
  color: var(--tr-muted);
  width: 34px; height: 34px; border-radius: 10px;
  font-size: 1.1rem; line-height: 1; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-family: inherit;
  transition: all 0.2s;
}
.tr-drawer-close:hover {
  color: #fff;
  border-color: rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.06);
}

.tr-drawer-summary {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 16px 22px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.tr-summary-stat {
  background: #000;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 12px 14px;
}
.tr-summary-label {
  font-size: 0.6rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--tr-dim);
}
.tr-summary-value {
  font-size: 1.4rem; font-weight: 900; color: #fff;
  letter-spacing: -0.03em; line-height: 1;
  margin-top: 6px;
}
.tr-summary-value span {
  font-size: 0.7rem; font-weight: 800; color: var(--tr-muted);
  margin-left: 4px;
}
.tr-summary-value.accent { color: var(--tr-lime); }

.tr-drawer-body {
  flex: 1; overflow-y: auto;
  padding: 12px 14px;
}
.tr-drawer-body::-webkit-scrollbar { width: 6px; }
.tr-drawer-body::-webkit-scrollbar-track { background: transparent; }
.tr-drawer-body::-webkit-scrollbar-thumb {
  background: rgba(163,230,53,0.25); border-radius: 3px;
}

.tr-cart-item {
  display: flex; align-items: center; gap: 12px;
  background: #111;
  border: 1px solid rgba(255,255,255,0.08);
  border-left: 3px solid var(--tr-lime);
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 8px;
  animation: trCartItemIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.tr-cart-item.tier-cheap    { border-left-color: var(--tr-lime); }
.tr-cart-item.tier-moderate { border-left-color: var(--tr-sky); }
.tr-cart-item.tier-luxury   { border-left-color: var(--tr-amber); }

@keyframes trCartItemIn {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}

.tr-cart-item-thumb {
  width: 42px; height: 42px; border-radius: 12px;
  background: #000; border: 1px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem; flex-shrink: 0;
  overflow: hidden;
}
.tr-cart-item-thumb img { width: 100%; height: 100%; object-fit: cover; }
.tr-cart-item-body { flex: 1; min-width: 0; }
.tr-cart-item-name {
  font-size: 0.88rem; font-weight: 800; color: #fff;
  line-height: 1.2;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tr-cart-item-meta {
  font-size: 0.7rem; color: var(--tr-muted);
  margin-top: 3px; font-weight: 600;
}
.tr-cart-item-remove {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.12);
  color: var(--tr-muted);
  width: 28px; height: 28px; border-radius: 8px;
  font-size: 1rem; line-height: 1; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-family: inherit; flex-shrink: 0;
  transition: all 0.2s;
}
.tr-cart-item-remove:hover {
  color: #f87171;
  border-color: rgba(248,113,113,0.5);
  background: rgba(248,113,113,0.08);
}

.tr-cart-empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--tr-dim);
}
.tr-cart-empty-icon { font-size: 2.4rem; opacity: 0.5; margin-bottom: 14px; }
.tr-cart-empty-title {
  font-size: 0.95rem; font-weight: 800; color: #fff;
  margin-bottom: 6px;
}
.tr-cart-empty-text {
  font-size: 0.78rem; color: var(--tr-muted);
  max-width: 240px; margin: 0 auto; line-height: 1.6;
}

.tr-drawer-foot {
  padding: 16px 22px 20px;
  border-top: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
  display: flex; flex-direction: column; gap: 10px;
}
.tr-drawer-actions { display: flex; gap: 10px; }

.tr-btn-cart-primary {
  flex: 1;
  background: linear-gradient(135deg, var(--tr-lime), var(--tr-lime-bright));
  color: #000; border: none;
  padding: 13px 20px; border-radius: 12px;
  font-size: 0.85rem; font-weight: 800; cursor: pointer;
  font-family: inherit;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: 0 8px 24px -6px rgba(163, 230, 53, 0.5);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.tr-btn-cart-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px -6px rgba(163, 230, 53, 0.7);
}
.tr-btn-cart-primary:disabled {
  opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none;
}
.tr-btn-cart-ghost {
  background: transparent;
  color: var(--tr-muted);
  border: 1px solid rgba(255,255,255,0.14);
  padding: 13px 18px; border-radius: 12px;
  font-size: 0.82rem; font-weight: 700; cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.tr-btn-cart-ghost:hover {
  color: #fff;
  border-color: rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.05);
}

/* Toast */
.tr-toast {
  position: fixed; bottom: 30px; left: 50%;
  transform: translateX(-50%) translateY(120%);
  background: var(--tr-lime); color: #000;
  padding: 12px 22px; border-radius: 14px;
  font-size: 0.85rem; font-weight: 800;
  box-shadow: 0 12px 32px -8px rgba(163,230,53,0.5);
  z-index: 300;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
  display: flex; align-items: center; gap: 10px;
  max-width: 90vw;
}
.tr-toast.show { transform: translateX(-50%) translateY(0); }

@media (prefers-reduced-motion: reduce) {
  .tr-orb-1, .tr-orb-2, .tr-pulse, .tr-card, .tr-cart-item { animation: none !important; }
}
```

### frontend/src/pages/Trips.jsx

```
import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import "./Trips.css";

const TIERS = [
  { key: "all", label: "All budgets" },
  { key: "cheap", label: "Cheap" },
  { key: "moderate", label: "Moderate" },
  { key: "luxury", label: "Luxury" },
];

const SORTS = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "az", label: "A → Z" },
  { key: "za", label: "Z → A" },
];

/* ─────── Helpers ─────── */
function getBudgetTier(budget) {
  const n = Number(budget) || 0;
  if (n < 20000) return "cheap";
  if (n < 50000) return "moderate";
  return "luxury";
}

function tierLabel(key) {
  const found = TIERS.find((t) => t.key === key);
  return found ? found.label : key;
}

function daysBetween(a, b) {
  const start = new Date(a);
  const end = new Date(b);
  return Math.max(1, Math.round((end - start) / 86400000));
}

function relativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `${w} week${w === 1 ? "" : "s"} ago`;
  }
  if (days < 365) {
    const m = Math.floor(days / 30);
    return `${m} month${m === 1 ? "" : "s"} ago`;
  }
  const y = Math.floor(days / 365);
  return `${y} year${y === 1 ? "" : "s"} ago`;
}

function pickEmoji(destination) {
  const t = (destination || "").toLowerCase();
  if (t.includes("bali") || t.includes("beach")) return "🏝️";
  if (t.includes("tokyo") || t.includes("japan")) return "🗼";
  if (t.includes("kyoto")) return "⛩️";
  if (t.includes("new york") || t.includes("nyc")) return "🗽";
  if (t.includes("paris") || t.includes("france")) return "🥐";
  if (t.includes("rome") || t.includes("italy")) return "🏛️";
  if (t.includes("iceland") || t.includes("reyk")) return "🌋";
  if (t.includes("marrakech") || t.includes("morocco")) return "🕌";
  if (t.includes("cape town") || t.includes("africa")) return "🦁";
  if (t.includes("lisbon") || t.includes("portugal")) return "🚋";
  if (t.includes("bangkok") || t.includes("thai")) return "🛕";
  if (t.includes("dubai")) return "🌇";
  if (t.includes("barcelona") || t.includes("spain")) return "🎨";
  if (t.includes("santorini") || t.includes("greece")) return "🏖️";
  if (t.includes("hanoi") || t.includes("vietnam")) return "🍜";
  if (t.includes("sydney") || t.includes("australia")) return "🌉";
  if (t.includes("peru") || t.includes("machu")) return "🏔️";
  if (t.includes("zermatt") || t.includes("switzerland")) return "🏂";
  if (t.includes("india") || t.includes("delhi") || t.includes("mumbai")) return "🛕";
  if (t.includes("london")) return "🎡";
  if (t.includes("egypt") || t.includes("cairo")) return "🐫";
  return "✈️";
}

function extractCountry(destination) {
  if (!destination) return "";
  const parts = destination.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 1];
  return "";
}

/* ─────── Skeleton grid ─────── */
const SkeletonGrid = () => (
  <div className="tr-grid">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="tr-skeleton" />
    ))}
  </div>
);

/* ─────── Main page ─────── */
const Trips = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [tier, setTier] = useState(searchParams.get("tier") || "all");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");

  const searchRef = useRef(null);

  /* Fetch trips */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/trips");
        if (!cancelled) setTrips(res.data || []);
      } catch {
        if (!cancelled) setTrips([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Sync URL */
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (tier !== "all") params.set("tier", tier);
    if (sort !== "newest") params.set("sort", sort);
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tier, sort]);

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        if (document.activeElement === searchRef.current) {
          setQuery("");
          searchRef.current?.blur();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* Visible trips */
  const visibleTrips = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = trips.filter((t) => {
      const dest = (t.destination || "").toLowerCase();
      const matchQ = !q || dest.includes(q);
      const matchTier = tier === "all" || getBudgetTier(t.budget) === tier;
      return matchQ && matchTier;
    });

    return filtered.slice().sort((a, b) => {
      switch (sort) {
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "az":
          return (a.destination || "").localeCompare(b.destination || "");
        case "za":
          return (b.destination || "").localeCompare(a.destination || "");
        case "newest":
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
  }, [trips, query, tier, sort]);

  const hasFilters = query.trim() || tier !== "all" || sort !== "newest";

  /* Handlers */
  const clearAllFilters = () => {
    setQuery("");
    setTier("all");
    setSort("newest");
    searchRef.current?.focus();
  };

  const handleCardClick = (id) => {
    navigate(`/trips/${id}`);
  };

  const handleCardKeyDown = (e, id) => {
    if (e.key === "Enter" || e.key === " ") {
      if (e.target !== e.currentTarget) return;
      e.preventDefault();
      handleCardClick(id);
    }
  };

  return (
    <div className="tr-root">
      <div className="tr-orb-1" />
      <div className="tr-orb-2" />

      <main className="tr-page">
        <header className="tr-header">
          <div className="tr-header-row">
            <div>
              <div className="tr-tag">
                <span className="tr-pulse" />
                {trips.length} trip{trips.length === 1 ? "" : "s"} saved
              </div>
              <h1 className="tr-title">
                My <span>Trips</span>
              </h1>
              <p className="tr-subtitle">
                Search, filter, and sort your trips. Click any card to open it.
              </p>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="tr-filter-panel">
          <div className="tr-filter-grid">
            <label className="tr-field">
              <span className="tr-label">Search destinations</span>
              <span className="tr-input-wrap">
                <span className="tr-field-icon">🔍</span>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder='Try "Japan", "Paris", "Bali"…'
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {!query && <span className="tr-kbd">/</span>}
                {query && (
                  <button
                    type="button"
                    className="tr-clear"
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </span>
            </label>

            <label className="tr-field">
              <span className="tr-label">Budget tier</span>
              <span className="tr-input-wrap">
                <span className="tr-field-icon">💰</span>
                <select value={tier} onChange={(e) => setTier(e.target.value)}>
                  {TIERS.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </span>
            </label>

            <label className="tr-field">
              <span className="tr-label">Sort by</span>
              <span className="tr-input-wrap">
                <span className="tr-field-icon">↕️</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          </div>
        </div>

        {/* Active pills */}
        {hasFilters && (
          <div className="tr-active-bar visible">
            <span className="tr-active-label">Active</span>
            {query.trim() && (
              <span className="tr-pill">
                "{query.trim()}"
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Remove search"
                >
                  ×
                </button>
              </span>
            )}
            {tier !== "all" && (
              <span className="tr-pill">
                {tierLabel(tier)}
                <button
                  type="button"
                  onClick={() => setTier("all")}
                  aria-label="Remove tier"
                >
                  ×
                </button>
              </span>
            )}
            {sort !== "newest" && (
              <span className="tr-pill">
                {SORTS.find((s) => s.key === sort)?.label}
                <button
                  type="button"
                  onClick={() => setSort("newest")}
                  aria-label="Reset sort"
                >
                  ×
                </button>
              </span>
            )}
            <button
              type="button"
              className="tr-clear-all"
              onClick={clearAllFilters}
            >
              Clear all
            </button>
          </div>
        )}

        {/* Results count */}
        {!loading && trips.length > 0 && (
          <p className="tr-results">
            Showing <strong>{visibleTrips.length}</strong> of{" "}
            <strong>{trips.length}</strong> trips
            {query.trim() && (
              <>
                {" "}
                matching <em>"{query.trim()}"</em>
              </>
            )}
            {tier !== "all" && (
              <>
                {" "}
                in the <em>{tierLabel(tier)}</em> tier
              </>
            )}
          </p>
        )}

        {/* Grid / states */}
        {loading && <SkeletonGrid />}

        {!loading && trips.length === 0 && (
          <div className="tr-empty">
            <div className="tr-empty-icon">🗺️</div>
            <div className="tr-empty-title">No trips yet</div>
            <p className="tr-empty-text">
              Start planning your first adventure and let AI craft the perfect
              itinerary for you.
            </p>
            <Link to="/trips/new" className="tr-btn-primary">
              ✨ Create your first trip
            </Link>
          </div>
        )}

        {!loading && trips.length > 0 && visibleTrips.length === 0 && (
          <div className="tr-empty">
            <div className="tr-empty-icon">🔍</div>
            <div className="tr-empty-title">No trips match your filters</div>
            <p className="tr-empty-text">
              Try a different search term, switch the budget tier, or clear
              everything to see all trips again.
            </p>
            <button
              className="tr-btn-primary"
              onClick={clearAllFilters}
              type="button"
            >
              ✨ Clear all filters
            </button>
          </div>
        )}

        {!loading && visibleTrips.length > 0 && (
          <div className="tr-grid">
            {visibleTrips.map((trip, i) => {
              const tier = getBudgetTier(trip.budget);
              const days = daysBetween(trip.startDate, trip.endDate);
              const country = extractCountry(trip.destination);
              const emoji = pickEmoji(trip.destination);

              return (
                <article
                  key={trip._id}
                  className={`tr-card tier-${tier}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                  tabIndex={0}
                  onClick={() => handleCardClick(trip._id)}
                  onKeyDown={(e) => handleCardKeyDown(e, trip._id)}
                >
                  <div className="tr-card-top">
                    <div className="tr-card-thumb">
                      {trip.image ? (
                        <img
                          src={trip.image}
                          alt={trip.destination}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        emoji
                      )}
                    </div>
                    <div className="tr-card-top-right">
                      <span className={`tr-tier tier-${tier}`}>
                        {tierLabel(tier)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="tr-name">{trip.destination}</h3>
                    {country && <p className="tr-country">{country}</p>}
                  </div>

                  <div className="tr-meta">
                    <span className="days">{days} days</span>
                    <span className="sep">·</span>
                    <span className="created">{relativeTime(trip.createdAt)}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer
          style={{
            marginTop: 60,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            fontSize: "0.75rem",
            color: "var(--tr-dim)",
            fontWeight: 600,
          }}
        >
          <span>Filters sync to the URL</span>
          <span>AI Travel Planner © My Trips</span>
        </footer>
      </main>
    </div>
  );
};

export default Trips;
```

### frontend/src/pages/WeatherAwareItinerary.css

```
/* frontend/src/pages/WeatherAwareItinerary.css */

.wai-root {
  --wai-bg: #050505;
  --wai-card: #111111;
  --wai-card-hover: #181818;
  --wai-border: rgba(255, 255, 255, 0.1);
  --wai-muted: #888888;
  --wai-dim: #52525b;
  --wai-lime: #a3e635;
  --wai-lime-bright: #bef264;
  --wai-lime-glow: rgba(163, 230, 53, 0.4);
  --wai-lime-subtle: rgba(163, 230, 53, 0.12);
  --wai-amber: #fbbf24;
  --wai-amber-subtle: rgba(251, 191, 36, 0.12);
  --wai-sky: #60a5fa;
  --wai-sky-subtle: rgba(96, 165, 250, 0.12);
  background: var(--wai-bg);
  color: #fff;
  min-height: 100vh;
  font-family: 'Poppins', system-ui, sans-serif;
  overflow-x: hidden;
  position: relative;
}

.wai-orb-1, .wai-orb-2 {
  position: fixed;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.wai-orb-1 {
  top: -120px; left: 8%;
  width: 500px; height: 500px;
  background: radial-gradient(circle, var(--wai-lime-glow) 0%, rgba(163,230,53,0.05) 50%, transparent 75%);
  animation: waiFloat 10s ease-in-out infinite alternate;
}
.wai-orb-2 {
  bottom: -120px; right: 8%;
  width: 450px; height: 450px;
  background: radial-gradient(circle, rgba(96,165,250,0.18) 0%, transparent 70%);
  animation: waiFloat 13s ease-in-out infinite alternate-reverse;
}
@keyframes waiFloat {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(40px, 40px) scale(1.15); }
}

.wai-page {
  position: relative; z-index: 10;
  max-width: 1240px; margin: 0 auto;
  padding: 48px 24px 80px;
}

.wai-header { display: flex; flex-direction: column; gap: 14px; margin-bottom: 36px; }
.wai-tag {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 0.7rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--wai-lime);
  background: var(--wai-lime-subtle);
  border: 1px solid rgba(163, 230, 53, 0.3);
  padding: 5px 12px; border-radius: 9999px;
  width: fit-content;
}
.wai-pulse {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--wai-lime);
  box-shadow: 0 0 10px var(--wai-lime);
  animation: waiPulse 1.5s infinite;
}
@keyframes waiPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}
.wai-title {
  font-size: clamp(1.9rem, 4.2vw, 3.2rem);
  font-weight: 900; line-height: 1.05;
  letter-spacing: -0.035em; color: #fff;
}
.wai-title span { color: var(--wai-lime); text-shadow: 0 0 30px var(--wai-lime-glow); }
.wai-subtitle {
  font-size: 1rem; color: var(--wai-muted); max-width: 720px;
  line-height: 1.6;
}

.wai-control-panel {
  background: rgba(10, 10, 10, 0.88);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px; padding: 24px; margin-bottom: 28px;
  box-shadow: 0 20px 60px -20px rgba(0,0,0,0.9), 0 0 30px -10px rgba(163,230,53,0.1);
}
.wai-field-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 14px; align-items: end;
}
@media (max-width: 900px) { .wai-field-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 600px) { .wai-field-grid { grid-template-columns: 1fr; } }

.wai-field { display: flex; flex-direction: column; gap: 8px; }
.wai-field-label {
  font-size: 0.68rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.14em;
  color: var(--wai-dim);
}
.wai-field-input {
  display: flex; align-items: center; gap: 10px;
  background: #000; border: 1px solid rgba(255,255,255,0.12);
  border-radius: 14px; padding: 12px 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.wai-field-input:focus-within {
  border-color: var(--wai-lime);
  box-shadow: 0 0 0 3px rgba(163,230,53,0.15);
}
.wai-field-input input,
.wai-field-input select {
  flex: 1; background: transparent; border: none; outline: none;
  color: #fff; font-family: inherit; font-size: 0.9rem; font-weight: 600;
  color-scheme: dark; cursor: pointer;
  width: 100%;
}
.wai-field-input select option { background: #111; color: #fff; }
.wai-field-input input::placeholder { color: var(--wai-dim); font-weight: 500; }
.wai-field-icon { font-size: 1rem; opacity: 0.7; }

.wai-btn-primary {
  background: linear-gradient(135deg, var(--wai-lime), var(--wai-lime-bright));
  color: #000; border: none;
  padding: 13px 24px; border-radius: 14px;
  font-size: 0.85rem; font-weight: 800; cursor: pointer;
  font-family: inherit;
  display: inline-flex; align-items: center; gap: 8px;
  box-shadow: 0 8px 24px -6px rgba(163,230,53,0.5);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
}
.wai-btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px -6px rgba(163,230,53,0.7);
}
.wai-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.wai-mode-toggle {
  display: flex; gap: 6px;
  margin-top: 16px; padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
  flex-wrap: wrap; align-items: center;
}
.wai-mode-toggle-label {
  font-size: 0.68rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.14em;
  color: var(--wai-dim); margin-right: 4px;
}
.wai-mode-btn {
  background: #000; color: var(--wai-muted);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 7px 14px; border-radius: 9999px;
  font-size: 0.75rem; font-weight: 700; cursor: pointer;
  font-family: inherit; transition: all 0.2s;
}
.wai-mode-btn:hover { color: #fff; border-color: rgba(255,255,255,0.25); }
.wai-mode-btn.active {
  background: var(--wai-lime); color: #000;
  border-color: var(--wai-lime);
  box-shadow: 0 0 15px rgba(163,230,53,0.35);
}

.wai-status-banner {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px;
  background: #0b0b0b;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  font-size: 0.85rem; color: var(--wai-muted); font-weight: 500;
  margin-bottom: 24px;
}
.wai-status-banner .wai-dot {
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--wai-lime);
  box-shadow: 0 0 12px var(--wai-lime);
  flex-shrink: 0;
}
.wai-status-banner strong { color: var(--wai-lime); font-weight: 800; }
.wai-status-banner.baseline { border-color: rgba(255,255,255,0.22); }
.wai-status-banner.baseline .wai-dot { background: #fff; box-shadow: 0 0 12px rgba(255,255,255,0.6); }

/* Weather strip */
.wai-weather-strip {
  display: grid; grid-template-columns: repeat(7, 1fr);
  gap: 10px; margin-bottom: 28px;
}
@media (max-width: 900px) { .wai-weather-strip { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 520px) { .wai-weather-strip { grid-template-columns: repeat(2, 1fr); } }

.wai-weather-day {
  background: var(--wai-card);
  border: 1px solid var(--wai-border);
  border-radius: 18px;
  padding: 14px 10px 12px;
  text-align: center;
  position: relative;
  transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
}
.wai-weather-day:hover {
  transform: translateY(-3px);
  border-color: rgba(163,230,53,0.45);
  box-shadow: 0 12px 24px -12px rgba(0,0,0,0.9), 0 0 20px rgba(163,230,53,0.12);
}
.wai-weather-day.rainy {
  border-color: rgba(96,165,250,0.4);
  background: linear-gradient(180deg, rgba(96,165,250,0.08), rgba(17,17,17,1));
}
.wai-weather-day.rainy:hover {
  border-color: rgba(96,165,250,0.7);
  box-shadow: 0 12px 24px -12px rgba(0,0,0,0.9), 0 0 20px rgba(96,165,250,0.2);
}
.wai-weather-day.dry { border-color: rgba(163,230,53,0.3); }
.wai-weather-day-label {
  font-size: 0.68rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--wai-dim);
}
.wai-weather-day-date {
  font-size: 0.75rem; font-weight: 700; color: #fff; margin-top: 2px;
}
.wai-weather-day-icon {
  display: flex; justify-content: center;
  margin: 4px 0;
  min-height: 56px;
  align-items: center;
}
.wai-weather-day-icon .wf-wx-icon { width: 48px; height: 48px; }
.wai-weather-day-temp {
  font-size: 0.82rem; font-weight: 900; color: #fff;
}
.wai-weather-day-temp span {
  color: #71717a; font-weight: 600; font-size: 0.72rem; margin-left: 2px;
}
.wai-weather-day-rain {
  margin-top: 6px; font-size: 0.68rem; font-weight: 800;
  padding: 2px 8px; border-radius: 6px;
  background: var(--wai-lime-subtle); color: var(--wai-lime);
  display: inline-block;
}
.wai-weather-day-rain.warn {
  background: var(--wai-sky-subtle); color: var(--wai-sky);
}
.wai-weather-day-badge {
  position: absolute; top: 8px; right: 8px;
  font-size: 0.58rem; font-weight: 900;
  padding: 2px 6px; border-radius: 5px;
  background: var(--wai-lime); color: #000;
  letter-spacing: 0.04em;
}
.wai-weather-day.rainy .wai-weather-day-badge { background: var(--wai-sky); color: #000; }

/* Section headings */
.wai-section-head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 16px; gap: 12px; flex-wrap: wrap;
}
.wai-section-title {
  font-size: 1.05rem; font-weight: 800; color: #fff;
  letter-spacing: -0.01em;
}
.wai-section-title span { color: var(--wai-lime); }
.wai-section-hint {
  font-size: 0.72rem; color: var(--wai-dim);
  font-weight: 600; letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Itinerary grid */
.wai-itinerary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
  margin-bottom: 28px;
}
@media (max-width: 640px) { .wai-itinerary-grid { grid-template-columns: 1fr; } }

.wai-day-col {
  background: #0b0b0b;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 14px;
  display: flex; flex-direction: column; gap: 10px;
  min-height: 260px;
  transition: border-color 0.25s, box-shadow 0.25s;
}
.wai-day-col.rainy {
  border-color: rgba(96,165,250,0.3);
  background: linear-gradient(180deg, rgba(96,165,250,0.05), #0b0b0b);
}
.wai-day-col.today {
  border-color: rgba(163,230,53,0.5);
  box-shadow: 0 0 24px -8px rgba(163,230,53,0.25);
}
.wai-day-col-head {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.wai-day-col-head-left { display: flex; flex-direction: column; gap: 2px; }
.wai-day-col-name {
  font-size: 0.72rem; font-weight: 900;
  text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--wai-lime);
}
.wai-day-col-date { font-size: 0.78rem; font-weight: 800; color: #fff; }
.wai-day-col-wx {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.7rem; font-weight: 800; color: var(--wai-muted);
}
.wai-day-col-wx .wf-wx-icon { width: 26px; height: 26px; }
.wai-day-col-wx .wai-pct {
  padding: 2px 6px; border-radius: 6px;
  background: var(--wai-lime-subtle); color: var(--wai-lime);
}
.wai-day-col.rainy .wai-day-col-wx .wai-pct {
  background: var(--wai-sky-subtle); color: var(--wai-sky);
}

.wai-activity-list {
  display: flex; flex-direction: column; gap: 8px;
  flex: 1;
}
.wai-activity-card {
  background: #151515;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 10px 12px;
  display: flex; align-items: flex-start; gap: 10px;
  position: relative;
  transition: transform 0.25s, border-color 0.25s, background 0.25s;
  animation: waiSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes waiSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.wai-activity-card:hover {
  transform: translateX(2px);
  border-color: rgba(163,230,53,0.4);
  background: #1a1a1a;
}
.wai-activity-card.outdoor { border-left: 3px solid var(--wai-lime); }
.wai-activity-card.indoor { border-left: 3px solid var(--wai-amber); }
.wai-activity-card.moved { animation: waiPulseMove 1.4s ease-out; }
@keyframes waiPulseMove {
  0%   { box-shadow: 0 0 0 0 rgba(163,230,53,0.6); }
  100% { box-shadow: 0 0 0 14px rgba(163,230,53,0); }
}

.wai-activity-emoji { font-size: 1.1rem; flex-shrink: 0; margin-top: 1px; }
.wai-activity-body { flex: 1; min-width: 0; }
.wai-activity-name {
  font-size: 0.8rem; font-weight: 800; color: #fff;
  line-height: 1.25;
}
.wai-activity-meta {
  display: flex; align-items: center; gap: 6px;
  margin-top: 4px;
  font-size: 0.65rem; font-weight: 700;
  color: var(--wai-muted);
}
.wai-tag {
  font-size: 0.58rem; font-weight: 900;
  padding: 2px 6px; border-radius: 5px;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.wai-tag-outdoor { background: var(--wai-lime-subtle); color: var(--wai-lime); }
.wai-tag-indoor { background: var(--wai-amber-subtle); color: var(--wai-amber); }
.wai-tag-priority { background: rgba(255,255,255,0.08); color: #e5e5e5; }

.wai-day-col-empty {
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  color: var(--wai-dim);
  font-size: 0.72rem; font-weight: 700;
  padding: 20px 0;
}

/* AI panel */
.wai-ai-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 28px;
}
@media (max-width: 900px) { .wai-ai-panel { grid-template-columns: 1fr; } }

.wai-panel {
  background: #0b0b0b;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 20px 22px;
}
.wai-panel-label {
  font-size: 0.68rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.14em;
  color: var(--wai-dim); margin-bottom: 12px;
  display: flex; align-items: center; gap: 8px;
}
.wai-panel-label .wai-badge {
  background: var(--wai-lime); color: #000;
  padding: 2px 7px; border-radius: 5px;
  font-size: 0.62rem; letter-spacing: 0.06em;
}

.wai-stat-row {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.wai-stat {
  background: #000;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; padding: 14px 16px;
}
.wai-stat-label {
  font-size: 0.62rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--wai-dim);
}
.wai-stat-value {
  font-size: 1.5rem; font-weight: 900; color: #fff;
  letter-spacing: -0.03em; line-height: 1;
  margin-top: 6px;
}
.wai-stat-value.good { color: var(--wai-lime); }
.wai-stat-value span {
  font-size: 0.75rem; font-weight: 800; color: var(--wai-muted);
  margin-left: 4px;
}
.wai-stat-sub {
  font-size: 0.68rem; color: var(--wai-muted);
  margin-top: 6px; line-height: 1.4;
}

.wai-changes-list {
  display: flex; flex-direction: column; gap: 8px;
  max-height: 260px; overflow-y: auto;
  padding-right: 4px;
}
.wai-changes-list::-webkit-scrollbar { width: 4px; }
.wai-changes-list::-webkit-scrollbar-track { background: transparent; }
.wai-changes-list::-webkit-scrollbar-thumb {
  background: rgba(163,230,53,0.3); border-radius: 2px;
}
.wai-change-row {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 12px;
  background: #000;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  font-size: 0.76rem;
  line-height: 1.45;
}
.wai-change-arrow {
  color: var(--wai-lime); font-weight: 900;
  flex-shrink: 0; font-size: 0.9rem;
  margin-top: 1px;
}
.wai-change-text { color: #cbd5e1; }
.wai-change-text strong { color: #fff; font-weight: 800; }
.wai-change-reason {
  color: var(--wai-muted); font-size: 0.7rem;
  margin-top: 3px; font-weight: 500;
}
.wai-change-empty {
  color: var(--wai-dim); font-size: 0.78rem;
  padding: 14px; text-align: center;
}

.wai-score-bar {
  height: 8px; background: rgba(255,255,255,0.06);
  border-radius: 9999px; overflow: hidden;
  margin-top: 10px;
}
.wai-score-fill {
  height: 100%; border-radius: 9999px;
  background: linear-gradient(90deg, var(--wai-lime), var(--wai-lime-bright));
  box-shadow: 0 0 12px rgba(163,230,53,0.5);
  transition: width 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Skeleton */
.wai-skeleton {
  background: linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%);
  background-size: 200% 100%;
  animation: waiShimmer 1.4s infinite;
  border-radius: 18px;
  min-height: 160px;
  border: 1px solid var(--wai-border);
}
@keyframes waiShimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Legend */
.wai-legend {
  display: flex; flex-wrap: wrap; gap: 16px;
  padding: 16px 18px;
  background: #0b0b0b;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  font-size: 0.72rem; color: var(--wai-muted); font-weight: 600;
  margin-bottom: 28px;
}
.wai-legend-item { display: flex; align-items: center; gap: 8px; }
.wai-legend-dot {
  width: 10px; height: 10px; border-radius: 3px;
  flex-shrink: 0;
}
.wai-legend-dot.outdoor { background: var(--wai-lime); }
.wai-legend-dot.indoor { background: var(--wai-amber); }
.wai-legend-dot.rainy { background: var(--wai-sky); }

/* Footer */
.wai-footer {
  margin-top: 40px; padding-top: 24px;
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex; flex-wrap: wrap;
  justify-content: space-between; align-items: center;
  gap: 16px;
  font-size: 0.75rem; color: var(--wai-dim); font-weight: 600;
}
.wai-footer a { color: var(--wai-lime); text-decoration: none; font-weight: 700; }
.wai-footer a:hover { text-decoration: underline; }

@media (prefers-reduced-motion: reduce) {
  .wai-orb-1, .wai-orb-2, .wai-pulse,
  .wai-activity-card, .wai-activity-card.moved { animation: none !important; }
}

/* ─────────── Animated weather icon keyframes (moved from TripWeather.css) ─────────── */
.wf-wx-icon {
  width: 72px;
  height: 72px;
  display: block;
  flex-shrink: 0;
  overflow: visible;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.5));
}

@keyframes wfSunGlow {
  0%, 100% { transform: scale(1); opacity: 0.75; }
  50%      { transform: scale(1.22); opacity: 1; }
}
@keyframes wfSunRays {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes wfSunCore {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
}
.wf-wx-sun-glow { transform-origin: 40px 40px; animation: wfSunGlow 3.8s ease-in-out infinite; }
.wf-wx-sun-rays { transform-origin: 40px 40px; animation: wfSunRays 32s linear infinite; }
.wf-wx-sun-core { transform-origin: 40px 40px; animation: wfSunCore 3.8s ease-in-out infinite; }

@keyframes wfCloudDrift {
  0%, 100% { transform: translate(0, 0); }
  50%      { transform: translate(3px, -2px); }
}
@keyframes wfCloudDriftSlow {
  0%, 100% { transform: translate(0, 0); }
  50%      { transform: translate(-3px, 1px); }
}
.wf-wx-cloud      { transform-origin: 40px 40px; animation: wfCloudDrift 4.6s ease-in-out infinite; }
.wf-wx-cloud-back { transform-origin: 40px 40px; animation: wfCloudDriftSlow 5.4s ease-in-out infinite; }

@keyframes wfRainDrop {
  0%   { transform: translateY(-6px) rotate(0deg); opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { transform: translateY(10px) rotate(6deg); opacity: 0; }
}
.wf-wx-raindrop { animation: wfRainDrop 1.5s linear infinite; transform-origin: center; }

@keyframes wfSnowflake {
  0%   { transform: translate(0, -6px) rotate(0deg); opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translate(2px, 12px) rotate(180deg); opacity: 0; }
}
.wf-wx-snowflake { animation: wfSnowflake 3s linear infinite; transform-origin: center; }

@keyframes wfBoltFlash {
  0%, 55%, 100% { opacity: 0.35; filter: brightness(1); }
  60%, 72%      { opacity: 1;    filter: brightness(1.7); }
}
@keyframes wfBoltGlow {
  0%, 55%, 100% { opacity: 0; }
  60%, 72%      { opacity: 0.75; }
}
.wf-wx-bolt      { animation: wfBoltFlash 2.6s ease-in-out infinite; }
.wf-wx-bolt-glow { animation: wfBoltGlow 2.6s ease-in-out infinite; }

@keyframes wfFogWave {
  0%, 100% { transform: translateX(-5px); opacity: 0.4; }
  50%      { transform: translateX(5px);  opacity: 0.85; }
}
.wf-wx-fog-wave { animation: wfFogWave 3.8s ease-in-out infinite; }
.wf-wx-fog-wave:nth-of-type(1) { animation-delay: 0s;   }
.wf-wx-fog-wave:nth-of-type(2) { animation-delay: 0.5s; }
.wf-wx-fog-wave:nth-of-type(3) { animation-delay: 1s;   }

@media (prefers-reduced-motion: reduce) {
  .wf-wx-icon * { animation: none !important; }
}

/* ============================================================
   Animated weather icon keyframes
   ============================================================ */

.wf-wx-icon {
  width: 72px;
  height: 72px;
  display: block;
  flex-shrink: 0;
  overflow: visible;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.5));
}

/* ─────── Sun ─────── */
@keyframes wfSunGlow {
  0%, 100% { transform: scale(1); opacity: 0.75; }
  50%      { transform: scale(1.22); opacity: 1; }
}
@keyframes wfSunRays {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes wfSunCore {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
}
.wf-wx-sun-glow {
  transform-origin: 40px 40px;
  animation: wfSunGlow 3.8s ease-in-out infinite;
}
.wf-wx-sun-rays {
  transform-origin: 40px 40px;
  animation: wfSunRays 32s linear infinite;
}
.wf-wx-sun-core {
  transform-origin: 40px 40px;
  animation: wfSunCore 3.8s ease-in-out infinite;
}

/* ─────── Clouds ─────── */
@keyframes wfCloudDrift {
  0%, 100% { transform: translate(0, 0); }
  50%      { transform: translate(3px, -2px); }
}
@keyframes wfCloudDriftSlow {
  0%, 100% { transform: translate(0, 0); }
  50%      { transform: translate(-3px, 1px); }
}
.wf-wx-cloud {
  transform-origin: 40px 40px;
  animation: wfCloudDrift 4.6s ease-in-out infinite;
}
.wf-wx-cloud-back {
  transform-origin: 40px 40px;
  animation: wfCloudDriftSlow 5.4s ease-in-out infinite;
}

/* ─────── Rain ─────── */
@keyframes wfRainDrop {
  0%   { transform: translateY(-6px) rotate(0deg); opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { transform: translateY(10px) rotate(6deg); opacity: 0; }
}
.wf-wx-raindrop {
  animation: wfRainDrop 1.5s linear infinite;
  transform-origin: center;
}

/* ─────── Snow ─────── */
@keyframes wfSnowflake {
  0%   { transform: translate(0, -6px) rotate(0deg); opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translate(2px, 12px) rotate(180deg); opacity: 0; }
}
.wf-wx-snowflake {
  animation: wfSnowflake 3s linear infinite;
  transform-origin: center;
}

/* ─────── Thunder ─────── */
@keyframes wfBoltFlash {
  0%, 55%, 100% { opacity: 0.35; filter: brightness(1); }
  60%, 72%      { opacity: 1;    filter: brightness(1.7); }
}
@keyframes wfBoltGlow {
  0%, 55%, 100% { opacity: 0; }
  60%, 72%      { opacity: 0.75; }
}
.wf-wx-bolt      { animation: wfBoltFlash 2.6s ease-in-out infinite; }
.wf-wx-bolt-glow { animation: wfBoltGlow  2.6s ease-in-out infinite; }

/* ─────── Fog ─────── */
@keyframes wfFogWave {
  0%, 100% { transform: translateX(-5px); opacity: 0.4; }
  50%      { transform: translateX(5px);  opacity: 0.85; }
}
.wf-wx-fog-wave { animation: wfFogWave 3.8s ease-in-out infinite; }
.wf-wx-fog-wave:nth-of-type(1) { animation-delay: 0s;   }
.wf-wx-fog-wave:nth-of-type(2) { animation-delay: 0.5s; }
.wf-wx-fog-wave:nth-of-type(3) { animation-delay: 1s;   }

/* ─────── Reduced motion ─────── */
@media (prefers-reduced-motion: reduce) {
  .wf-wx-icon * { animation: none !important; }
}
```

### frontend/src/pages/WeatherAwareItinerary.jsx

```
import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import WeatherIcon, { decodeWeatherCode } from "../components/WeatherIcon";
import "./WeatherAwareItinerary.css";

/* ─────────── Date helpers ─────────── */
const isoDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const todayISO = () => isoDate(new Date());
const addDaysISO = (iso, n) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return isoDate(d);
};
const weekdayShort = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
const monthDay = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

/* ─────────── Demo destinations ─────────── */
const DESTINATIONS = {
  kyoto: {
    name: "Kyoto, Japan",
    icon: "⛩️",
    lat: 35.0116,
    lon: 135.7681,
    activities: [
      { id: "k1", name: "Fushimi Inari shrine hike", type: "outdoor", hours: 3, emoji: "⛩️", sensitivity: 5, priority: 3 },
      { id: "k2", name: "Arashiyama bamboo grove", type: "outdoor", hours: 2, emoji: "🎋", sensitivity: 4, priority: 3 },
      { id: "k3", name: "Kinkaku-ji golden pavilion", type: "outdoor", hours: 1.5, emoji: "🏯", sensitivity: 3, priority: 3 },
      { id: "k4", name: "Traditional tea ceremony", type: "indoor", hours: 1.5, emoji: "🍵", sensitivity: 1, priority: 2 },
      { id: "k5", name: "Nishiki market food tour", type: "outdoor", hours: 2, emoji: "🍢", sensitivity: 2, priority: 2 },
      { id: "k6", name: "Kyoto National Museum", type: "indoor", hours: 2, emoji: "🏛️", sensitivity: 1, priority: 2 },
      { id: "k7", name: "Philosopher's Path walk", type: "outdoor", hours: 2, emoji: "🌸", sensitivity: 4, priority: 2 },
      { id: "k8", name: "Izakaya dinner in Pontocho", type: "indoor", hours: 2, emoji: "🍶", sensitivity: 1, priority: 3 },
      { id: "k9", name: "Gion evening stroll", type: "outdoor", hours: 1.5, emoji: "🏮", sensitivity: 3, priority: 2 },
    ],
  },
  paris: {
    name: "Paris, France",
    icon: "🗼",
    lat: 48.8566,
    lon: 2.3522,
    activities: [
      { id: "p1", name: "Eiffel Tower summit visit", type: "outdoor", hours: 3, emoji: "🗼", sensitivity: 4, priority: 3 },
      { id: "p2", name: "Louvre Museum tour", type: "indoor", hours: 3, emoji: "🖼️", sensitivity: 1, priority: 3 },
      { id: "p3", name: "Seine river walk", type: "outdoor", hours: 2, emoji: "🚶", sensitivity: 3, priority: 2 },
      { id: "p4", name: "Montmartre & Sacré-Cœur", type: "outdoor", hours: 2.5, emoji: "⛪", sensitivity: 4, priority: 3 },
      { id: "p5", name: "Catacombs underground tour", type: "indoor", hours: 2, emoji: "💀", sensitivity: 1, priority: 2 },
      { id: "p6", name: "Luxembourg Gardens picnic", type: "outdoor", hours: 2, emoji: "🥖", sensitivity: 5, priority: 2 },
      { id: "p7", name: "Café hopping in Le Marais", type: "indoor", hours: 2, emoji: "☕", sensitivity: 1, priority: 2 },
      { id: "p8", name: "Orsay Museum", type: "indoor", hours: 2.5, emoji: "🎨", sensitivity: 1, priority: 2 },
      { id: "p9", name: "Champs-Élysées & Arc de Triomphe", type: "outdoor", hours: 2, emoji: "🏛️", sensitivity: 3, priority: 3 },
    ],
  },
  bali: {
    name: "Bali, Indonesia",
    icon: "🏝️",
    lat: -8.4095,
    lon: 115.1889,
    activities: [
      { id: "b1", name: "Tegallalang rice terrace trek", type: "outdoor", hours: 3, emoji: "🌾", sensitivity: 5, priority: 3 },
      { id: "b2", name: "Uluwatu temple sunset", type: "outdoor", hours: 2.5, emoji: "🛕", sensitivity: 4, priority: 3 },
      { id: "b3", name: "Balinese cooking class", type: "indoor", hours: 3, emoji: "🍛", sensitivity: 1, priority: 2 },
      { id: "b4", name: "Ubud art market", type: "outdoor", hours: 2, emoji: "🎨", sensitivity: 2, priority: 2 },
      { id: "b5", name: "Traditional Balinese spa", type: "indoor", hours: 2, emoji: "💆", sensitivity: 1, priority: 3 },
      { id: "b6", name: "Mount Batur sunrise hike", type: "outdoor", hours: 5, emoji: "🌋", sensitivity: 5, priority: 3 },
      { id: "b7", name: "Seminyak beach day", type: "outdoor", hours: 4, emoji: "🏖️", sensitivity: 5, priority: 2 },
      { id: "b8", name: "Yoga & meditation session", type: "indoor", hours: 1.5, emoji: "🧘", sensitivity: 1, priority: 2 },
      { id: "b9", name: "Tirta Empul water temple", type: "outdoor", hours: 2, emoji: "💧", sensitivity: 3, priority: 2 },
    ],
  },
};

/* ─────────── Activity classifier ─────────── */
const OUTDOOR_KEYWORDS = [
  "hike", "trek", "walk", "stroll", "park", "garden", "beach", "mountain",
  "lake", "river", "viewpoint", "bridge", "terrace", "farm", "ruins",
  "monument", "statue", "square", "plaza", "outdoor", "bike", "cycling",
  "kayak", "boat", "cruise", "sunrise", "sunset", "waterfall", "island",
  "desert", "valley", "forest",
];
const INDOOR_KEYWORDS = [
  "museum", "gallery", "indoor", "restaurant", "cafe", "café", "coffee",
  "bar", "pub", "theater", "theatre", "cinema", "spa", "hammam",
  "cooking class", "workshop", "show", "concert", "aquarium", "mall",
  "shopping", "shop", "palace", "church", "cathedral", "temple", "shrine",
  "basilica", "castle",
];

function pickEmoji(text) {
  if (text.includes("museum")) return "🏛️";
  if (text.includes("park") || text.includes("garden")) return "🌳";
  if (text.includes("hike") || text.includes("trek")) return "🥾";
  if (text.includes("beach")) return "🏖️";
  if (text.includes("temple") || text.includes("shrine")) return "⛩️";
  if (text.includes("market")) return "🛍️";
  if (text.includes("restaurant") || text.includes("dinner") || text.includes("lunch")) return "🍽️";
  if (text.includes("cafe") || text.includes("café") || text.includes("coffee")) return "☕";
  if (text.includes("palace") || text.includes("castle")) return "🏰";
  if (text.includes("church") || text.includes("cathedral")) return "⛪";
  if (text.includes("bridge")) return "🌉";
  if (text.includes("waterfall")) return "💦";
  if (text.includes("mountain")) return "⛰️";
  if (text.includes("lake") || text.includes("river")) return "🏞️";
  if (text.includes("zoo")) return "🦁";
  if (text.includes("aquarium")) return "🐠";
  if (text.includes("shopping") || text.includes("shop")) return "🛍️";
  if (text.includes("show") || text.includes("concert")) return "🎭";
  if (text.includes("spa")) return "💆";
  return "📍";
}

function classifyActivity(activity, dayIndex, actIndex) {
  const title = (activity.title || activity.name || "").toLowerCase();
  const desc = (activity.description || "").toLowerCase();
  const text = `${title} ${desc}`;

  let type = "outdoor";
  let sensitivity = 3;

  const isOutdoor = OUTDOOR_KEYWORDS.some((k) => text.includes(k));
  const isIndoor = INDOOR_KEYWORDS.some((k) => text.includes(k));

  if (isOutdoor) {
    type = "outdoor";
    if (/hike|trek|beach|kayak|boat|cruise|sunrise|sunset|mountain|viewpoint|waterfall/.test(text)) {
      sensitivity = 5;
    } else if (/walk|stroll|park|garden|bridge|bike|cycling|outdoor/.test(text)) {
      sensitivity = 4;
    } else {
      sensitivity = 3;
    }
  } else if (isIndoor) {
    type = "indoor";
    sensitivity = 1;
  }

  return {
    id: activity._id || `${dayIndex}-${actIndex}`,
    name: activity.title || activity.name || "Activity",
    type,
    hours: 2,
    emoji: pickEmoji(text),
    sensitivity,
    priority: 2,
    originalDay: dayIndex,
    time: activity.time,
    cost: activity.cost,
    description: activity.description,
  };
}

function classifyTripActivities(itinerary) {
  const out = [];
  (itinerary || []).forEach((day, dayIdx) => {
    (day.activities || []).forEach((act, actIdx) => {
      out.push(classifyActivity(act, dayIdx, actIdx));
    });
  });
  return out;
}

/* ─────────── Forecast ─────────── */
async function fetchForecast(lat, lon, startISO, days) {
  const endISO = addDaysISO(startISO, days - 1);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max` +
    `&timezone=auto&start_date=${startISO}&end_date=${endISO}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);
  const data = await res.json();
  const d = data.daily;
  return d.time.map((iso, i) => ({
    date: iso,
    code: d.weather_code[i],
    max: Math.round(d.temperature_2m_max[i]),
    min: Math.round(d.temperature_2m_min[i]),
    rain: d.precipitation_probability_max?.[i] ?? 0,
    wind: Math.round(d.wind_speed_10m_max?.[i] ?? 0),
    live: true,
  }));
}

function simulateForecast(placeName, startISO, days) {
  let seed = 7;
  for (const ch of placeName) seed = (seed * 31 + ch.charCodeAt(0)) % 233280;
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const codes = [0, 1, 2, 3, 45, 51, 61, 71, 80, 95];
  const out = [];
  for (let i = 0; i < days; i++) {
    const base = 8 + rng() * 20;
    const code = codes[Math.floor(rng() * codes.length)];
    out.push({
      date: addDaysISO(startISO, i),
      code,
      max: Math.round(base + 5),
      min: Math.round(base - 5),
      rain: Math.round(rng() * 100),
      wind: Math.round(rng() * 35),
      live: false,
    });
  }
  return out;
}

/* ─────────── Optimizer ─────────── */
function optimizeItinerary(activities, days, slotsPerDay) {
  const preferred = activities.map((a, i) => ({
    ...a,
    originalDay: a.originalDay ?? i % days.length,
  }));

  const outdoor = preferred
    .filter((a) => a.type === "outdoor")
    .sort((a, b) => b.sensitivity - a.sensitivity || b.priority - a.priority);
  const indoor = preferred
    .filter((a) => a.type === "indoor")
    .sort((a, b) => b.priority - a.priority);

  const slots = days.map(() => slotsPerDay);
  const assignment = days.map(() => []);

  for (const act of outdoor) {
    let bestDay = -1;
    let bestScore = Infinity;
    for (let d = 0; d < days.length; d++) {
      if (slots[d] <= 0) continue;
      const score = days[d].rain * (act.sensitivity / 5) - slots[d] * 4;
      if (score < bestScore) {
        bestScore = score;
        bestDay = d;
      }
    }
    if (bestDay < 0) continue;
    assignment[bestDay].push({ ...act, moved: bestDay !== act.originalDay });
    slots[bestDay]--;
  }

  for (const act of indoor) {
    let bestDay = -1;
    let bestScore = -Infinity;
    for (let d = 0; d < days.length; d++) {
      if (slots[d] <= 0) continue;
      const score = days[d].rain - slots[d] * 2;
      if (score > bestScore) {
        bestScore = score;
        bestDay = d;
      }
    }
    if (bestDay < 0) continue;
    assignment[bestDay].push({ ...act, moved: bestDay !== act.originalDay });
    slots[bestDay]--;
  }

  return { assignment };
}

function naiveItinerary(activities, days, slotsPerDay) {
  const slots = days.map(() => slotsPerDay);
  const assignment = days.map(() => []);
  activities.forEach((a) => {
    const day = a.originalDay ?? 0;
    if (slots[day] > 0) {
      assignment[day].push(a);
      slots[day]--;
    }
  });
  return assignment;
}

/* ─────────── Sub-components ─────────── */
function WeatherDay({ day, isToday }) {
  const wx = decodeWeatherCode(day.code);
  const rainy = day.rain >= 50;
  const dry = day.rain < 20;
  return (
    <div className={`wai-weather-day ${rainy ? "rainy" : dry ? "dry" : ""}`}>
      {isToday && <span className="wai-weather-day-badge">TODAY</span>}
      {!isToday && rainy && <span className="wai-weather-day-badge">WET</span>}
      {!isToday && dry && <span className="wai-weather-day-badge">DRY</span>}
      <div className="wai-weather-day-label">{weekdayShort(day.date)}</div>
      <div className="wai-weather-day-date">{monthDay(day.date)}</div>
      <div className="wai-weather-day-icon">
        <WeatherIcon type={wx.type} size={48} />
      </div>
      <div className="wai-weather-day-temp">
        {day.max}°<span>/{day.min}°</span>
      </div>
      <div className={`wai-weather-day-rain ${rainy ? "warn" : ""}`}>
        ☔ {day.rain}%
      </div>
    </div>
  );
}

function ActivityCard({ activity }) {
  const tag = activity.type === "outdoor" ? "wai-tag-outdoor" : "wai-tag-indoor";
  return (
    <div className={`wai-activity-card ${activity.type} ${activity.moved ? "moved" : ""}`}>
      <div className="wai-activity-emoji">{activity.emoji}</div>
      <div className="wai-activity-body">
        <div className="wai-activity-name">{activity.name}</div>
        <div className="wai-activity-meta">
          <span className={`wai-tag ${tag}`}>
            {activity.type === "outdoor" ? "OUTDOOR" : "INDOOR"}
          </span>
          <span className="wai-tag wai-tag-priority">{activity.hours}h</span>
        </div>
      </div>
    </div>
  );
}

function DayColumn({ day, index, activities, isToday }) {
  const wx = decodeWeatherCode(day.code);
  const rainy = day.rain >= 50;
  return (
    <div className={`wai-day-col ${rainy ? "rainy" : ""} ${isToday ? "today" : ""}`}>
      <div className="wai-day-col-head">
        <div className="wai-day-col-head-left">
          <div className="wai-day-col-name">
            Day {index + 1} · {weekdayShort(day.date)}
          </div>
          <div className="wai-day-col-date">{monthDay(day.date)}</div>
        </div>
        <div className="wai-day-col-wx">
          <WeatherIcon type={wx.type} size={26} />
          <span className="wai-pct">{day.rain}%</span>
        </div>
      </div>
      <div className="wai-activity-list">
        {activities.length === 0 ? (
          <div className="wai-day-col-empty">Free day — nothing scheduled</div>
        ) : (
          activities.map((a) => <ActivityCard key={a.id} activity={a} />)
        )}
      </div>
    </div>
  );
}

/* ─────────── Main ─────────── */
const WeatherAwareItinerary = () => {
  const { id } = useParams();
  const isRealTrip = Boolean(id);

  const [destinationKey, setDestinationKey] = useState("kyoto");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return isoDate(d);
  });

  const [trip, setTrip] = useState(null);
  const [tripLoading, setTripLoading] = useState(isRealTrip);
  const [tripError, setTripError] = useState("");

  const [mode, setMode] = useState("optimized");
  const [state, setState] = useState({ status: "idle" });

  useEffect(() => {
    if (!isRealTrip) return;
    let cancelled = false;
    (async () => {
      setTripLoading(true);
      setTripError("");
      try {
        const res = await api.get(`/trips/${id}`);
        if (cancelled) return;
        setTrip(res.data);
      } catch (err) {
        if (!cancelled)
          setTripError(err.response?.data?.message || "Failed to load trip");
      } finally {
        if (!cancelled) setTripLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isRealTrip]);

  const destination = useMemo(() => {
    if (isRealTrip) {
      if (!trip) return null;
      const activities = classifyTripActivities(trip.itinerary || []);
      return {
        name: trip.destination,
        icon: "🌤️",
        activities,
        startDate: isoDate(new Date(trip.startDate)),
        endDate: isoDate(new Date(trip.endDate)),
      };
    }
    const d = DESTINATIONS[destinationKey];
    return {
      name: d.name,
      icon: d.icon,
      lat: d.lat,
      lon: d.lon,
      activities: d.activities,
      startDate,
      endDate: addDaysISO(startDate, 6),
    };
  }, [isRealTrip, trip, destinationKey, startDate]);

  useEffect(() => {
    if (!destination) return;
    let cancelled = false;

    (async () => {
      setState({ status: "loading" });
      try {
        let lat = destination.lat;
        let lon = destination.lon;

        if (isRealTrip && (!lat || !lon)) {
          const wRes = await api.get(`/trips/${id}/weather`);
          lat = wRes.data?.location?.lat;
          lon = wRes.data?.location?.lng;
        }

        const sISO = destination.startDate;
        const eISO = destination.endDate;
        const dayCount = Math.max(
          1,
          Math.round((new Date(eISO) - new Date(sISO)) / 86400000) + 1
        );
        const capped = Math.min(dayCount, 14);

        if (!lat || !lon) throw new Error("No location for this trip");

        const days = await fetchForecast(lat, lon, sISO, capped);
        if (cancelled) return;
        setState({ status: "ready", days, mode: "live" });
      } catch (err) {
        if (cancelled) return;
        const dayCount = Math.max(
          1,
          Math.round(
            (new Date(destination.endDate) - new Date(destination.startDate)) /
              86400000
          ) + 1
        );
        const capped = Math.min(dayCount, 14);
        const days = simulateForecast(
          destination.name,
          destination.startDate,
          capped
        );
        setState({ status: "ready", days, mode: "simulated" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [destination, isRealTrip, id]);

  const itinerary = useMemo(() => {
    if (state.status !== "ready" || !destination) return null;
    const acts = destination.activities;
    const slotsPerDay = Math.max(
      2,
      Math.ceil(acts.length / state.days.length) + 1
    );

    if (mode === "naive") {
      return {
        assignment: naiveItinerary(acts, state.days, slotsPerDay),
      };
    }
    return optimizeItinerary(acts, state.days, slotsPerDay);
  }, [state, mode, destination]);

  const avgRain =
    state.status === "ready"
      ? Math.round(state.days.reduce((s, d) => s + d.rain, 0) / state.days.length)
      : 0;

  const today = todayISO();

  if (isRealTrip && tripLoading) {
    return (
      <div className="wai-root">
        <div className="wai-orb-1" />
        <div className="wai-orb-2" />
        <main className="wai-page">
          <div className="wai-skeleton" style={{ height: 220, marginBottom: 28 }} />
          <div className="wai-weather-strip">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="wai-skeleton" style={{ minHeight: 180 }} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (isRealTrip && tripError) {
    return (
      <div className="wai-root">
        <div className="wai-orb-1" />
        <div className="wai-orb-2" />
        <main className="wai-page">
          <Link
            to={`/trips/${id}`}
            style={{
              color: "#888",
              marginBottom: 20,
              display: "inline-block",
              textDecoration: "none",
            }}
          >
            ← Back to trip
          </Link>
          <div className="wai-panel">
            <div className="wai-panel-label">Error</div>
            <div className="wai-stat-value">{tripError}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="wai-root">
      <div className="wai-orb-1" />
      <div className="wai-orb-2" />

      <main className="wai-page">
        {isRealTrip && (
          <Link
            to={`/trips/${id}`}
            style={{
              color: "#888",
              marginBottom: 24,
              display: "inline-block",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            ← Back to trip
          </Link>
        )}

        <header className="wai-header">
          <div className="wai-tag">
            <span className="wai-pulse" />
            {isRealTrip ? "Your trip · Smart Weather" : "⭐⭐⭐⭐⭐ · Smart Weather"}
          </div>
          <h1 className="wai-title">
            Smart Weather <span>Plan</span>
          </h1>
          <p className="wai-subtitle">
            {isRealTrip
              ? `Live weather for ${destination?.name || "your trip"}. We move outdoor plans to sunny days and keep indoor plans for rainy days.`
              : "See how we move outdoor activities to sunny days and put indoor activities on rainy days."}
          </p>
        </header>

        {!isRealTrip && destination && (
          <div className="wai-control-panel">
            <div className="wai-field-grid">
              <div className="wai-field">
                <label className="wai-field-label">Destination</label>
                <div className="wai-field-input">
                  <span className="wai-field-icon">📍</span>
                  <select
                    value={destinationKey}
                    onChange={(e) => setDestinationKey(e.target.value)}
                  >
                    {Object.entries(DESTINATIONS).map(([key, d]) => (
                      <option key={key} value={key}>
                        {d.icon} {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="wai-field">
                <label className="wai-field-label">Trip start</label>
                <div className="wai-field-input">
                  <span className="wai-field-icon">📅</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="wai-field">
                <label className="wai-field-label">Trip length</label>
                <div className="wai-field-input">
                  <span className="wai-field-icon">⏱️</span>
                  <input type="text" value="7 days" readOnly />
                </div>
              </div>
              <button
                className="wai-btn-primary"
                onClick={() => setMode("optimized")}
                disabled={state.status !== "ready"}
              >
                <span>✨</span>
                Re-optimize
              </button>
            </div>
          </div>
        )}

        {isRealTrip && destination && (
          <div className="wai-control-panel">
            <div
              className="wai-field-grid"
              style={{ gridTemplateColumns: "2fr 1fr 1fr" }}
            >
              <div className="wai-field">
                <label className="wai-field-label">Destination</label>
                <div className="wai-field-input">
                  <span className="wai-field-icon">📍</span>
                  <input type="text" value={destination.name} readOnly />
                </div>
              </div>
              <div className="wai-field">
                <label className="wai-field-label">Start</label>
                <div className="wai-field-input">
                  <span className="wai-field-icon">📅</span>
                  <input
                    type="text"
                    value={monthDay(destination.startDate)}
                    readOnly
                  />
                </div>
              </div>
              <div className="wai-field">
                <label className="wai-field-label">End</label>
                <div className="wai-field-input">
                  <span className="wai-field-icon">🏁</span>
                  <input
                    type="text"
                    value={monthDay(destination.endDate)}
                    readOnly
                  />
                </div>
              </div>
            </div>
            <div className="wai-mode-toggle">
              <span className="wai-mode-toggle-label">Plan mode</span>
              <button
                className={`wai-mode-btn ${mode === "optimized" ? "active" : ""}`}
                onClick={() => setMode("optimized")}
              >
                ✨ Smart Weather
              </button>
              <button
                className={`wai-mode-btn ${mode === "naive" ? "active" : ""}`}
                onClick={() => setMode("naive")}
              >
                🗓️ Original order
              </button>
            </div>
          </div>
        )}

        {state.status === "ready" && (
          <div
            className={`wai-status-banner ${
              state.mode === "simulated" ? "baseline" : ""
            }`}
          >
            <span className="wai-dot" />
            <span>
              {state.mode === "live" ? (
                <>
                  Live weather loaded for <strong>{destination?.name}</strong> ·{" "}
                  {state.days.length} days · avg rain {avgRain}%
                </>
              ) : (
                <>
                  Live data unavailable — showing estimate for{" "}
                  <strong>{destination?.name}</strong>
                </>
              )}
            </span>
          </div>
        )}
        {state.status === "loading" && (
          <div className="wai-status-banner">
            <span className="wai-dot" />
            <span>Checking weather and adjusting your plan…</span>
          </div>
        )}

        {state.status === "ready" && (
          <>
            <div className="wai-section-head">
              <h2 className="wai-section-title">
                Trip <span>Weather</span>
              </h2>
              <span className="wai-section-hint">
                {state.days.filter((d) => d.rain < 20).length} sunny ·{" "}
                {state.days.filter((d) => d.rain >= 50).length} rainy
              </span>
            </div>
            <div className="wai-weather-strip">
              {state.days.map((day) => (
                <WeatherDay
                  key={day.date}
                  day={day}
                  isToday={day.date === today}
                />
              ))}
            </div>
          </>
        )}

        {state.status === "loading" && (
          <div className="wai-weather-strip">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="wai-skeleton"
                style={{ minHeight: 180 }}
              />
            ))}
          </div>
        )}

        {state.status === "ready" && itinerary && destination && (
          <>
            <div className="wai-section-head">
              <h2 className="wai-section-title">
                {mode === "optimized" ? (
                  <>
                    Smart Weather <span>Plan</span>
                  </>
                ) : (
                  <>
                    Original <span>Plan</span>
                  </>
                )}
              </h2>
              <span className="wai-section-hint">
                {mode === "optimized"
                  ? `Outdoor plans on sunny days · indoor on rainy`
                  : "Original order"}
              </span>
            </div>

            <div className="wai-itinerary-grid">
              {state.days.map((day, i) => (
                <DayColumn
                  key={day.date}
                  day={day}
                  index={i}
                  activities={itinerary.assignment[i]}
                  isToday={day.date === today}
                />
              ))}
            </div>

            <div className="wai-legend">
              <div className="wai-legend-item">
                <span className="wai-legend-dot outdoor" />
                Outdoor activity — placed on sunny days
              </div>
              <div className="wai-legend-item">
                <span className="wai-legend-dot indoor" />
                Indoor activity — placed on rainy days
              </div>
              <div className="wai-legend-item">
                <span className="wai-legend-dot rainy" />
                Rainy day (50% or more rain)
              </div>
            </div>
          </>
        )}

        <footer className="wai-footer">
          <span>Live weather data · Smart scheduling</span>
          <span>AI Travel Planner © Smart Weather Plan</span>
        </footer>
      </main>
    </div>
  );
};

export default WeatherAwareItinerary;
```

### frontend/src/pages/WeatherTrips.css

```
/* frontend/src/pages/WeatherTrips.css */

.wt-root {
  --wt-bg: #050505;
  --wt-card: #111111;
  --wt-border: rgba(255, 255, 255, 0.1);
  --wt-muted: #888888;
  --wt-dim: #52525b;
  --wt-lime: #a3e635;
  --wt-lime-bright: #bef264;
  --wt-lime-glow: rgba(163, 230, 53, 0.4);
  --wt-lime-subtle: rgba(163, 230, 53, 0.12);
  background: var(--wt-bg);
  color: #fff;
  min-height: 100vh;
  font-family: 'Poppins', system-ui, sans-serif;
  overflow-x: hidden;
  position: relative;
}

.wt-orb-1, .wt-orb-2 {
  position: fixed;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.wt-orb-1 {
  top: -120px; left: 8%;
  width: 500px; height: 500px;
  background: radial-gradient(circle, var(--wt-lime-glow) 0%, rgba(163,230,53,0.05) 50%, transparent 75%);
  animation: wtFloat 10s ease-in-out infinite alternate;
}
.wt-orb-2 {
  bottom: -120px; right: 8%;
  width: 450px; height: 450px;
  background: radial-gradient(circle, rgba(96,165,250,0.18) 0%, transparent 70%);
  animation: wtFloat 13s ease-in-out infinite alternate-reverse;
}
@keyframes wtFloat {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(40px, 40px) scale(1.15); }
}

.wt-page {
  position: relative;
  z-index: 10;
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

.wt-header {
  display: flex; flex-direction: column; gap: 14px;
  margin-bottom: 36px;
}
.wt-tag {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 0.7rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--wt-lime);
  background: var(--wt-lime-subtle);
  border: 1px solid rgba(163, 230, 53, 0.3);
  padding: 5px 12px; border-radius: 9999px;
  width: fit-content;
}
.wt-pulse {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--wt-lime);
  box-shadow: 0 0 10px var(--wt-lime);
  animation: wtPulse 1.5s infinite;
}
@keyframes wtPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}
.wt-title {
  font-size: clamp(1.9rem, 4.2vw, 3rem);
  font-weight: 900; line-height: 1.05;
  letter-spacing: -0.035em; color: #fff;
}
.wt-title span { color: var(--wt-lime); text-shadow: 0 0 30px var(--wt-lime-glow); }
.wt-subtitle {
  font-size: 0.95rem; color: var(--wt-muted);
  max-width: 640px; line-height: 1.6;
}

.wt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
  margin-bottom: 40px;
}

.wt-card {
  background: var(--wt-card);
  border: 1px solid var(--wt-border);
  border-radius: 20px;
  padding: 22px 20px;
  text-decoration: none;
  color: inherit;
  display: flex; flex-direction: column; gap: 10px;
  transition: transform 0.25s cubic-bezier(0.16,1,0.3,1),
              border-color 0.25s, box-shadow 0.25s, background 0.25s;
  animation: wtCardIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  position: relative;
}
@keyframes wtCardIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.wt-card:hover {
  transform: translateY(-5px);
  background: #181818;
  border-color: rgba(163, 230, 53, 0.5);
  box-shadow: 0 16px 30px -12px rgba(0,0,0,0.9),
              0 0 24px rgba(163,230,53,0.14);
}

.wt-card-thumb {
  width: 52px; height: 52px;
  border-radius: 14px;
  background: #000;
  border: 1px solid rgba(163, 230, 53, 0.4);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.6rem;
  overflow: hidden;
  flex-shrink: 0;
}
.wt-card-thumb img { width: 100%; height: 100%; object-fit: cover; }

.wt-card-name {
  font-size: 1.15rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.wt-card-meta {
  font-size: 0.78rem;
  color: var(--wt-muted);
  font-weight: 600;
}
.wt-card-cta {
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--wt-lime);
  transition: color 0.2s;
}
.wt-card:hover .wt-card-cta { color: var(--wt-lime-bright); }

.wt-skeleton {
  background: linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%);
  background-size: 200% 100%;
  animation: wtShimmer 1.4s infinite;
  border-radius: 20px;
  min-height: 180px;
  border: 1px solid var(--wt-border);
}
@keyframes wtShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.wt-empty {
  text-align: center;
  padding: 70px 20px;
  border: 1px dashed rgba(255,255,255,0.12);
  border-radius: 24px;
  background: rgba(255,255,255,0.01);
}
.wt-empty-icon { font-size: 3rem; margin-bottom: 16px; opacity: 0.5; }
.wt-empty-title {
  font-size: 1.15rem; font-weight: 800; color: #fff;
  margin-bottom: 8px;
}
.wt-empty-text {
  font-size: 0.85rem; color: var(--wt-muted);
  max-width: 400px; margin: 0 auto 20px; line-height: 1.6;
}
.wt-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, var(--wt-lime), var(--wt-lime-bright));
  color: #000;
  padding: 11px 22px;
  border-radius: 14px;
  font-size: 0.85rem; font-weight: 800;
  text-decoration: none;
  box-shadow: 0 8px 24px -6px rgba(163, 230, 53, 0.5);
  transition: transform 0.2s, box-shadow 0.2s;
}
.wt-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px -6px rgba(163, 230, 53, 0.7);
}

.wt-footer {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  font-size: 0.75rem;
  color: var(--wt-dim);
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .wt-orb-1, .wt-orb-2, .wt-pulse, .wt-card { animation: none !important; }
}
```

### frontend/src/pages/WeatherTrips.jsx

```
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import WeatherIcon, { decodeWeatherCode } from "../components/WeatherIcon";
import "./WeatherTrips.css";

function pickEmoji(destination) {
  const t = (destination || "").toLowerCase();
  if (t.includes("bali") || t.includes("beach")) return "🏝️";
  if (t.includes("tokyo") || t.includes("japan")) return "🗼";
  if (t.includes("kyoto")) return "⛩️";
  if (t.includes("new york") || t.includes("nyc")) return "🗽";
  if (t.includes("paris") || t.includes("france")) return "🥐";
  if (t.includes("rome") || t.includes("italy")) return "🏛️";
  if (t.includes("iceland") || t.includes("reyk")) return "🌋";
  if (t.includes("marrakech") || t.includes("morocco")) return "🕌";
  if (t.includes("dubai")) return "🌇";
  if (t.includes("london")) return "🎡";
  if (t.includes("india") || t.includes("goa") || t.includes("delhi")) return "🛕";
  return "✈️";
}

function daysBetween(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
}

const WeatherTrips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/trips");
        if (!cancelled) setTrips(res.data || []);
      } catch {
        if (!cancelled) setTrips([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="wt-root">
      <div className="wt-orb-1" />
      <div className="wt-orb-2" />

      <main className="wt-page">
        <header className="wt-header">
          <div className="wt-tag">
            <span className="wt-pulse" />
            Smart Weather Plan
          </div>
          <h1 className="wt-title">
            Weather for your <span>trips</span>
          </h1>
          <p className="wt-subtitle">
            Pick a trip to see its live weather and how outdoor plans can be
            moved to sunny days.
          </p>
        </header>

        {loading && (
          <div className="wt-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="wt-skeleton" />
            ))}
          </div>
        )}

        {!loading && trips.length === 0 && (
          <div className="wt-empty">
            <div className="wt-empty-icon">🌤️</div>
            <div className="wt-empty-title">No trips yet</div>
            <p className="wt-empty-text">
              Create a trip first, then come back here to see its weather plan.
            </p>
            <Link to="/trips/new" className="wt-btn-primary">
              ✨ Create a trip
            </Link>
          </div>
        )}

        {!loading && trips.length > 0 && (
          <div className="wt-grid">
            {trips.map((trip) => {
              const days = daysBetween(trip.startDate, trip.endDate);
              return (
                <Link
                  key={trip._id}
                  to={`/trips/${trip._id}/weather-itinerary`}
                  className="wt-card"
                >
                  <div className="wt-card-thumb">
                    {trip.image ? (
                      <img
                        src={trip.image}
                        alt={trip.destination}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      pickEmoji(trip.destination)
                    )}
                  </div>
                  <div className="wt-card-name">{trip.destination}</div>
                  <div className="wt-card-meta">
                    {days} day{days === 1 ? "" : "s"}
                  </div>
                  <div className="wt-card-cta">
                    View weather plan →
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <footer className="wt-footer">
          <span>Live data from Open-Meteo</span>
          <span>AI Travel Planner © Weather</span>
        </footer>
      </main>
    </div>
  );
};

export default WeatherTrips;
```

### frontend/tailwind.config.js

```
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        lime: {
          DEFAULT: "#A8D84A",
          light: "#E5F0C8",
          dark: "#8FBF2E",
        },
        forest: "#1A2E1A",
        ink: "#0A0A0A",
      },
      fontFamily: {
        sans: ["Poppins", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
```

### frontend/vite.config.js

```
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
```

---

## Configuration Files

### PROJECT_CODE.md

```
```

---

