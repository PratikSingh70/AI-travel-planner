# AI Travel Planner — Complete Source Code

### FILE: backend\package.json
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

### FILE: backend\server.js
```
import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";

connectDB();

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.json({ message: "API is running..." });
});

// routes
app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

### FILE: backend\user.js
```
```

### FILE: backend\config\db.js
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

### FILE: backend\controllers\authController.js
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

### FILE: backend\controllers\tripController.js
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
      console.log("â†’ Attempting Gemini...");
      itinerary = await generateItinerary(trip);
      console.log("âœ“ Gemini succeeded");
    } catch (geminiError) {
      console.warn("âœ— Gemini failed:", geminiError.message);
      console.log("â†’ Falling back to Groq...");
      provider = "groq";
      itinerary = await generateItineraryWithGroq(trip);
      console.log("âœ“ Groq succeeded");
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SHARE - POST /api/trips/:id/share  (protected)
// Generates a random 8-char shareId if not already present
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const shareTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) return res.status(404).json({ message: "Trip not found" });
    if (trip.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Generate a new shareId if missing
    if (!trip.shareId) {
      // 8-char random string using base36
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PUBLIC - GET /api/trips/shared/:shareId  (no auth)
// Returns a shared trip. Hides the owner's private info.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const getSharedTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ shareId: req.params.shareId }).populate(
      "user",
      "name"
    );

    if (!trip) {
      return res.status(404).json({ message: "Shared trip not found" });
    }

    // Return only safe fields (no email, no userId)
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

### FILE: backend\middleware\authMiddleware.js
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

### FILE: backend\models\Trip.js
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
    // â”€â”€â”€ AI-generated cover art URL â”€â”€â”€
    image: {
      type: String,
      default: "",
    },
    // â”€â”€â”€ unique share identifier for public links â”€â”€â”€
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

### FILE: backend\models\User.js
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
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
```

### FILE: backend\routes\authRoutes.js
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

### FILE: backend\routes\tripRoutes.js
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PUBLIC ROUTES â€” no authentication required
// These must come BEFORE router.use(protect)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get("/shared/:shareId", getSharedTrip);

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PROTECTED ROUTES â€” require valid JWT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

### FILE: backend\services\geminiService.js
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
      console.log(`â†’ ${model}`);
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
      console.log(`âœ“ ${model} succeeded`);
      return response.text;
    } catch (err) {
      lastError = err;
      const status = err?.status;
      const msg = String(err?.message || "").toLowerCase();

      const isNotFound = status === 404 || msg.includes("not found");
      const isRateLimit = status === 429 || msg.includes("quota");
      const isBusy =
        status === 503 ||
        msg.includes("unavailable") ||
        msg.includes("high demand");

      if (isNotFound || isRateLimit) {
        console.log(`  skipped (${isNotFound ? "404" : "429"})`);
      } else if (isBusy) {
        console.log(`  busy (503) â€” next model`);
      } else {
        console.log(`  failed: ${err?.message?.slice(0, 80)}`);
      }
      // Move on immediately â€” no retries
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
4. Provide a budget breakdown: flights, hotels, food, activities, total â€” all in INR.
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
    { "name": "string", "rating": 4.5, "price": "â‚¹3500/night", "address": "string" }
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

### FILE: backend\services\groqService.js
```
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
4. Provide a budget breakdown: flights, hotels, food, activities, total â€” all in INR.
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
      "price": "â‚¹3500/night",
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

        console.log(`[Groq] âœ“ SUCCESS with ${model}`);

        // Parse and validate â€” mirrors geminiService
        let itinerary;
        try {
          itinerary = JSON.parse(text);
        } catch (err) {
          console.error(
            "[Groq] Invalid JSON:",
            text?.slice(0, 300)
          );
          throw new Error("Groq returned invalid JSON. Please try again.");
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
      } catch (err) {
        lastError = err;
        const status = err?.status || err?.response?.status;
        const msg = String(err?.message || "").toLowerCase();

        console.log(
          `[Groq] âœ— Error from ${model}:`,
          status,
          err?.message?.slice(0, 120)
        );

        const isRateLimit =
          status === 429 || msg.includes("rate") || msg.includes("quota");
        const isBusy =
          status === 503 ||
          msg.includes("overloaded") ||
          msg.includes("unavailable");

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
```

### FILE: backend\services\imageService.js
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

### FILE: backend\services\placesService.js
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

### FILE: backend\services\weatherService.js
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

### FILE: frontend\eslint.config.js
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

### FILE: frontend\index.html
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

    <!-- Force light theme â€” never apply dark class -->
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

### FILE: frontend\package.json
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

### FILE: frontend\postcss.config.js
```
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### FILE: frontend\tailwind.config.js
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

### FILE: frontend\vite.config.js
```
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
```

### FILE: frontend\src\App.css
```
.counter {
  font-size: 16px;
  padding: 5px 10px;
  border-radius: 5px;
  color: var(--accent);
  background: var(--accent-bg);
  border: 2px solid transparent;
  transition: border-color 0.3s;
  margin-bottom: 24px;

  &:hover {
    border-color: var(--accent-border);
  }
  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
}

.hero {
  position: relative;

  .base,
  .framework,
  .vite {
    inset-inline: 0;
    margin: 0 auto;
  }

  .base {
    width: 170px;
    position: relative;
    z-index: 0;
  }

  .framework,
  .vite {
    position: absolute;
  }

  .framework {
    z-index: 1;
    top: 34px;
    height: 28px;
    transform: perspective(2000px) rotateZ(300deg) rotateX(44deg) rotateY(39deg)
      scale(1.4);
  }

  .vite {
    z-index: 0;
    top: 107px;
    height: 26px;
    width: auto;
    transform: perspective(2000px) rotateZ(300deg) rotateX(40deg) rotateY(39deg)
      scale(0.8);
  }
}

#center {
  display: flex;
  flex-direction: column;
  gap: 25px;
  place-content: center;
  place-items: center;
  flex-grow: 1;

  @media (max-width: 1024px) {
    padding: 32px 20px 24px;
    gap: 18px;
  }
}

#next-steps {
  display: flex;
  border-top: 1px solid var(--border);
  text-align: left;

  & > div {
    flex: 1 1 0;
    padding: 32px;
    @media (max-width: 1024px) {
      padding: 24px 20px;
    }
  }

  .icon {
    margin-bottom: 16px;
    width: 22px;
    height: 22px;
  }

  @media (max-width: 1024px) {
    flex-direction: column;
    text-align: center;
  }
}

#docs {
  border-right: 1px solid var(--border);

  @media (max-width: 1024px) {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
}

#next-steps ul {
  list-style: none;
  padding: 0;
  display: flex;
  gap: 8px;
  margin: 32px 0 0;

  .logo {
    height: 18px;
  }

  a {
    color: var(--text-h);
    font-size: 16px;
    border-radius: 6px;
    background: var(--social-bg);
    display: flex;
    padding: 6px 12px;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    transition: box-shadow 0.3s;

    &:hover {
      box-shadow: var(--shadow);
    }
    .button-icon {
      height: 18px;
      width: 18px;
    }
  }

  @media (max-width: 1024px) {
    margin-top: 20px;
    flex-wrap: wrap;
    justify-content: center;

    li {
      flex: 1 1 calc(50% - 8px);
    }

    a {
      width: 100%;
      justify-content: center;
      box-sizing: border-box;
    }
  }
}

#spacer {
  height: 88px;
  border-top: 1px solid var(--border);
  @media (max-width: 1024px) {
    height: 48px;
  }
}

.ticks {
  position: relative;
  width: 100%;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: -4.5px;
    border: 5px solid transparent;
  }

  &::before {
    left: 0;
    border-left-color: var(--border);
  }
  &::after {
    right: 0;
    border-right-color: var(--border);
  }
}
```

### FILE: frontend\src\App.jsx
```
import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Register from "./pages/Register";
import Login from "./pages/Login";
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
import TripComparison from "./pages/TripComparison";
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
  const hideNavbar = location.pathname === "/";

  return (
    <>
      <ScrollToTop />
      {!hideNavbar && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
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
        <Route path="/compare" element={<PrivateRoute><TripComparison /></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default App;
```

### FILE: frontend\src\index.css
```
@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap");
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ============================================================
   ROOT â€” Lime + White + Black only
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
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up { animation: fadeInUp 0.5s ease-out both; }
.animate-fade-in { animation: fadeInUp 0.4s ease-out both; }

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
   PARACHUTE EXPORT PDF BUTTON â€” Lime Theme
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
   LIQUID CHAMBER RISE BUTTON â€” Lime Theme, No Sound
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
  background-color: #e5e5e5;
  background-image: linear-gradient(90deg, #e5e5e5 0%, #f5f5f5 40%, #e5e5e5 80%);
  background-size: 500px 100%;
  background-repeat: no-repeat;
  animation: skeleton-shimmer 1.6s infinite linear;
  border-radius: 8px;
}
.skeleton-text   { height: 14px; }
.skeleton-img    { border-radius: 16px; }
.skeleton-circle { border-radius: 50%; }

/* ============================================================
   ITINERARY PAPER (for PDF export) â€” html2canvas safe
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
   (keeps the paper rendered off-screen so html2pdf can capture it)
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
   404 PAGE â€” Full-Screen Castaway Island
   ============================================================ */

.notfound-wrapper {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  font-family: "Nunito", system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #1f2d3d;
  background:
    radial-gradient(1100px 620px at 6% -12%, #ccfbf1 0%, transparent 58%),
    radial-gradient(1000px 640px at 100% 110%, #fef3c7 0%, transparent 60%),
    linear-gradient(160deg, #f7fdfc 0%, #fdf6ec 100%);
  background-attachment: fixed;
}

.notfound-card {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
  text-align: center;
  position: relative;
}

.notfound-card::before {
  display: none;
}

.notfound-scene {
  width: 100%;
  height: auto;
  max-height: 60vh;
  display: block;
  margin: 0 auto 24px;
  overflow: visible;
}

.notfound-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: "Baloo 2", sans-serif;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0d9488;
  background: #eafaf7;
  border: 1px solid #c3ece6;
  padding: 8px 18px;
  border-radius: 999px;
  margin-bottom: 24px;
}

.notfound-eyebrow .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fb7185;
  box-shadow: 0 0 0 4px rgba(251, 113, 133, 0.22);
  animation: notfoundPulse 2.4s ease-in-out infinite;
}

.notfound-title {
  font-family: "Baloo 2", sans-serif;
  font-weight: 800;
  font-size: clamp(40px, 7vw, 80px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin: 0 0 20px;
  color: #1f2d3d;
  max-width: 1000px;
  margin-left: auto;
  margin-right: auto;
}

.notfound-title .accent {
  background: linear-gradient(100deg, #14b8a6 0%, #22d3ee 45%, #fbbf24 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.notfound-subtext {
  font-size: clamp(17px, 2.2vw, 20px);
  line-height: 1.65;
  color: #55677a;
  max-width: 60ch;
  margin: 0 auto 36px;
}

.notfound-ai-box {
  display: flex;
  align-items: center;
  gap: 16px;
  text-align: left;
  background: linear-gradient(135deg, #f4fdfb 0%, #fffaf0 100%);
  border: 1.5px dashed #9fe6dc;
  border-radius: 22px;
  padding: 18px 22px;
  margin: 0 auto 36px;
  max-width: 680px;
  width: 100%;
}

.notfound-ai-icon {
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: #ffffff;
  border: 1px solid #d6f2ec;
  box-shadow: 0 4px 10px -4px rgba(13, 148, 136, 0.18);
  font-size: 24px;
}

.notfound-ai-content {
  flex: 1 1 auto;
  min-width: 0;
}

.notfound-ai-label {
  font-family: "Baloo 2", sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #0d9488;
  margin-bottom: 4px;
}

.notfound-ai-prompt {
  font-size: 15px;
  font-style: italic;
  color: #34495a;
  line-height: 1.5;
  margin: 0;
  word-wrap: break-word;
}

.notfound-copy-btn {
  flex: 0 0 auto;
  font-family: "Baloo 2", sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #1f2d3d;
  background: #ffffff;
  border: 1.5px solid #ece3d4;
  border-radius: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
  white-space: nowrap;
}

.notfound-copy-btn:hover {
  border-color: #14b8a6;
  color: #0d9488;
  transform: translateY(-1px);
}

.notfound-copy-btn:active {
  transform: translateY(0) scale(0.98);
}

.notfound-copy-btn.copied {
  background: #eafaf7;
  border-color: #14b8a6;
  color: #0d9488;
}

.notfound-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
  margin-bottom: 30px;
}

.notfound-btn {
  font-family: "Baloo 2", sans-serif;
  font-size: 17px;
  font-weight: 700;
  text-decoration: none;
  padding: 16px 36px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
  border: 0;
  cursor: pointer;
}

.notfound-btn-primary {
  color: #1a2e1a;
  background: linear-gradient(135deg, #b8e85a 0%, #a8d84a 50%, #8fbf2e 100%);
  box-shadow: 0 12px 26px -10px rgba(168, 216, 74, 0.85);
}

.notfound-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 32px -12px rgba(168, 216, 74, 0.95);
}

.notfound-btn-ghost {
  color: #1f2d3d;
  background: #ffffff;
  border: 1.5px solid #ece3d4;
}

.notfound-btn-ghost:hover {
  transform: translateY(-2px);
  border-color: #fb7185;
  color: #e11d48;
}

.notfound-footnote {
  margin: 0;
  font-size: 14px;
  color: #9aa8b6;
  letter-spacing: 0.01em;
}

.notfound-footnote code {
  font-family: "Roboto Mono", ui-monospace, monospace;
  font-size: 13px;
  background: #f4f7f9;
  border: 1px solid #e6edf2;
  border-radius: 6px;
  padding: 3px 8px;
  color: #6b7c8c;
}

/* â”€â”€â”€ Animations â”€â”€â”€ */
@keyframes notfoundFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-10px); }
}
@keyframes notfoundBob {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%      { transform: translateY(-5px) rotate(1.5deg); }
}
@keyframes notfoundPulse {
  0%, 100% { opacity: 0.4; transform: scale(0.94); }
  50%      { opacity: 0.85; transform: scale(1.06); }
}
@keyframes notfoundSway {
  0%, 100% { transform: rotate(-2.6deg); }
  50%      { transform: rotate(2.6deg); }
}
@keyframes notfoundDrift {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(14px); }
}

.notfound-float-slow { animation: notfoundFloat 7.5s ease-in-out infinite; }
.notfound-float-mid  { animation: notfoundFloat 5.6s ease-in-out infinite; }
.notfound-float-fast { animation: notfoundFloat 4.3s ease-in-out infinite; }
.notfound-bob        { animation: notfoundBob 3.6s ease-in-out infinite; }
.notfound-pulse      { animation: notfoundPulse 3.6s ease-in-out infinite; }
.notfound-drift      { animation: notfoundDrift 9s ease-in-out infinite; }

.notfound-sway {
  animation: notfoundSway 5.5s ease-in-out infinite;
  transform-box: view-box;
  transform-origin: 304px 162px;
}

.notfound-float-slow,
.notfound-float-mid,
.notfound-float-fast,
.notfound-bob,
.notfound-pulse,
.notfound-drift {
  transform-box: fill-box;
  transform-origin: center;
}

/* â”€â”€â”€ Responsive â”€â”€â”€ */
@media (max-width: 640px) {
  .notfound-wrapper { padding: 24px 16px; }
  .notfound-scene { max-height: 45vh; }
  .notfound-ai-box { flex-wrap: wrap; }
  .notfound-copy-btn { width: 100%; }
  .notfound-btn { flex: 1 1 100%; justify-content: center; }
}

@media (prefers-reduced-motion: reduce) {
  .notfound-float-slow,
  .notfound-float-mid,
  .notfound-float-fast,
  .notfound-bob,
  .notfound-pulse,
  .notfound-sway,
  .notfound-drift,
  .notfound-eyebrow .dot { animation: none; }
  .notfound-btn,
  .notfound-copy-btn { transition: none; }
}

/* ============================================================
   WEATHER SLIDER â€” Lime & Light Theme
   ============================================================ */

.ws-wrapper {
  position: relative;
}

.ws-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.ws-brand-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #1A2E1A;
  background: #E5F0C8;
  border: 1px solid #A8D84A;
  padding: 4px 12px;
  border-radius: 9999px;
  width: fit-content;
}

.ws-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #A8D84A;
  box-shadow: 0 0 10px #A8D84A;
  animation: wsPulseDot 1.5s infinite;
}

@keyframes wsPulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}

.ws-title {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #0a0a0a;
  margin: 6px 0 2px;
}

.ws-title span {
  color: #8FBF2E;
}

.ws-subtitle {
  font-size: 13px;
  color: #6b7280;
}

.ws-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ws-btn {
  background: #ffffff;
  color: #0a0a0a;
  border: 1px solid #e5e7eb;
  padding: 8px 14px;
  border-radius: 14px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.ws-btn:hover {
  background: #A8D84A;
  color: #1A2E1A;
  border-color: #A8D84A;
  box-shadow: 0 0 20px rgba(168, 216, 74, 0.5);
  transform: translateY(-2px);
}

.ws-btn.active {
  background: #A8D84A;
  color: #1A2E1A;
  border-color: #A8D84A;
  box-shadow: 0 0 15px rgba(168, 216, 74, 0.5);
}

.ws-nav-arrows {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
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
  color: #0a0a0a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.15s;
}

.ws-arrow-btn:hover {
  background: #A8D84A;
  color: #1A2E1A;
}

.ws-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.ws-chip {
  background: #ffffff;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.ws-chip:hover {
  color: #0a0a0a;
  border-color: #A8D84A;
}

.ws-chip.active {
  background: #A8D84A;
  color: #1A2E1A;
  border-color: #A8D84A;
  box-shadow: 0 0 15px rgba(168, 216, 74, 0.4);
}

.ws-track-wrapper {
  position: relative;
  margin-bottom: 16px;
}

.ws-edge-left,
.ws-edge-right {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 36px;
  pointer-events: none;
  z-index: 5;
}

.ws-edge-left {
  left: 0;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.95), transparent);
}

.ws-edge-right {
  right: 0;
  background: linear-gradient(to left, rgba(255, 255, 255, 0.95), transparent);
}

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CARDS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.ws-card {
  flex: 0 0 148px;
  scroll-snap-align: start;
  background: #ffffff;
  border: 1px solid #e5e7eb;
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
  background: #f9fdf0;
  border-color: #A8D84A;
  transform: translateY(-8px) scale(1.03);
  box-shadow: 0 16px 30px -10px rgba(0, 0, 0, 0.15), 0 0 25px rgba(168, 216, 74, 0.3);
}

.ws-card.active {
  background: #ffffff;
  border-color: #A8D84A;
  border-width: 2px;
  transform: translateY(-10px) scale(1.05);
  box-shadow:
    0 20px 40px -10px rgba(0, 0, 0, 0.15),
    0 0 35px rgba(168, 216, 74, 0.5);
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
  color: #0a0a0a;
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
  background: #A8D84A;
  color: #1A2E1A;
  box-shadow: 0 0 10px rgba(168, 216, 74, 0.5);
}

.ws-badge-climate {
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #e5e7eb;
}

.ws-card-icon-area {
  text-align: center;
  margin: 8px 0;
}

.ws-card-icon {
  font-size: 34px;
  display: inline-block;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ws-card:hover .ws-card-icon {
  transform: scale(1.2) rotate(6deg);
}

.ws-card-date {
  font-size: 11px;
  color: #6b7280;
  margin-top: 3px;
  font-weight: 600;
}

.ws-card-stats {
  border-top: 1px solid #f3f4f6;
  padding-top: 9px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ws-temp-high {
  font-size: 13px;
  font-weight: 900;
  color: #0a0a0a;
}

.ws-temp-low {
  font-size: 11px;
  color: #9ca3af;
  margin-left: 3px;
}

.ws-rain-stat {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
}

.ws-rain-safe {
  color: #1A2E1A;
  background: #E5F0C8;
}

.ws-rain-warning {
  color: #0a0a0a;
  background: #e5e7eb;
  border: 1px solid #9ca3af;
}

.ws-plan-b {
  margin-top: 8px;
  background: #0a0a0a;
  color: #A8D84A;
  font-size: 10px;
  font-weight: 800;
  padding: 4px 6px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 0 10px rgba(168, 216, 74, 0.2);
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PROGRESS BAR
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.ws-progress {
  width: 100%;
  height: 4px;
  background: #f3f4f6;
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 22px;
}

.ws-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #A8D84A, #C4E570);
  box-shadow: 0 0 15px #A8D84A;
  border-radius: 9999px;
  transition: width 0.15s ease-out;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   INSPECTOR PANEL
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.ws-inspector {
  background: #0a0a0a;
  border: 1px solid #1f2d1f;
  border-radius: 22px;
  padding: 20px 24px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-shadow: 0 15px 35px -10px rgba(0, 0, 0, 0.6);
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
  background: #111111;
  border: 1px solid #A8D84A;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  box-shadow: 0 0 20px rgba(168, 216, 74, 0.25);
  flex-shrink: 0;
}

.ws-inspector-info {
  min-width: 0;
}

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
  background: #A8D84A;
  color: #1A2E1A;
  box-shadow: 0 0 12px rgba(168, 216, 74, 0.5);
}

.ws-inspector-risk.rainy {
  background: #ffffff;
  color: #0a0a0a;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.3);
}

.ws-inspector-sub {
  font-size: 12.5px;
  color: #9ca3af;
  margin-top: 4px;
}

.ws-inspector-ai {
  background: #111111;
  border: 1px solid #2a2a2a;
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
  background: #A8D84A;
  font-size: 10px;
  font-weight: 900;
  padding: 2px 7px;
  border-radius: 6px;
  white-space: nowrap;
  text-transform: uppercase;
  flex-shrink: 0;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   RESPONSIVE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
@media (max-width: 768px) {
  .ws-card { flex: 0 0 132px; }
  .ws-inspector { flex-direction: column; align-items: flex-start; }
  .ws-title { font-size: 19px; }
}

@media (prefers-reduced-motion: reduce) {
  .ws-card,
  .ws-btn,
  .ws-chip,
  .ws-card-icon { transition: none; }
  .ws-card:hover,
  .ws-card.active { transform: none; }
  .ws-pulse-dot { animation: none; }
}

/* ============================================================
   SKY FLIGHT BUTTON â€” Lime Theme, No Sound, Compact
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

/* â”€â”€â”€ SKY LAYER â”€â”€â”€ */
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

/* â”€â”€â”€ STARS â”€â”€â”€ */
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

/* â”€â”€â”€ DRIFTING CLOUDS â”€â”€â”€ */
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

/* â”€â”€â”€ FLYING PLANE â”€â”€â”€ */
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

/* â”€â”€â”€ CONTRAIL â”€â”€â”€ */
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

/* â”€â”€â”€ SPEED STREAKS â”€â”€â”€ */
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

/* â”€â”€â”€ COMPLETION RIPPLE â”€â”€â”€ */
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

/* â”€â”€â”€ FOREGROUND â”€â”€â”€ */
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

/* â”€â”€â”€ LABEL CROSS-FADE â”€â”€â”€ */
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

/* â”€â”€â”€ LOADER DOTS â”€â”€â”€ */
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

### FILE: frontend\src\main.jsx
```
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { CurrencyProvider } from "./context/CurrencyContext.jsx";
import { TripActionsProvider } from "./context/TripActionsContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CurrencyProvider>
            <TripActionsProvider>
              <App />
            </TripActionsProvider>
          </CurrencyProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

### FILE: frontend\src\api\axios.js
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

### FILE: frontend\src\components\CurrencyToggle.css
```
/* frontend/src/components/CurrencyToggle.css */

.ct-wrap {
  position: relative;
  display: inline-block;
}

.ct-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #888;
  padding: 7px 12px;
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
  white-space: nowrap;
}
.ct-btn:hover {
  color: #fff;
  border-color: rgba(163, 230, 53, 0.5);
  background: rgba(163, 230, 53, 0.06);
}
.ct-btn.open {
  color: #a3e635;
  border-color: #a3e635;
  background: rgba(163, 230, 53, 0.12);
}
.ct-symbol {
  font-size: 0.95rem;
  font-weight: 700;
}
.ct-code {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.ct-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
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
  animation: ctMenuIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes ctMenuIn {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.ct-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  background: transparent;
  border: none;
  color: #e5e5e5;
  font-family: 'Poppins', system-ui, sans-serif;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}
.ct-item:hover {
  background: rgba(163, 230, 53, 0.1);
}
.ct-item.active {
  background: rgba(163, 230, 53, 0.12);
  color: #a3e635;
}
.ct-item-sym {
  font-size: 1.05rem;
  font-weight: 700;
  width: 20px;
  text-align: center;
  color: #a3e635;
}
.ct-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.ct-item-code {
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}
.ct-item-name {
  font-size: 0.68rem;
  color: #888;
  font-weight: 500;
}
.ct-item.active .ct-item-name {
  color: rgba(163, 230, 53, 0.7);
}
.ct-item-check {
  color: #a3e635;
  font-size: 0.9rem;
  font-weight: 900;
}

@media (max-width: 820px) {
  .ct-wrap {
    display: none;
  }
}
```

### FILE: frontend\src\components\CurrencyToggle.jsx
```
import { useState, useRef, useEffect } from "react";
import { useCurrency } from "../context/CurrencyContext";
import "./CurrencyToggle.css";

const CurrencyToggle = () => {
  const { currency, setCurrency, currencies } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="ct-wrap" ref={ref}>
      <button
        type="button"
        className={`ct-btn ${open ? "open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Change currency"
        aria-expanded={open}
      >
        <span className="ct-symbol">{currencies[currency].symbol}</span>
        <span className="ct-code">{currency}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="ct-menu">
          {Object.entries(currencies).map(([code, info]) => (
            <button
              key={code}
              type="button"
              className={`ct-item ${currency === code ? "active" : ""}`}
              onClick={() => {
                setCurrency(code);
                setOpen(false);
              }}
            >
              <span className="ct-item-sym">{info.symbol}</span>
              <span className="ct-item-info">
                <span className="ct-item-code">{code}</span>
                <span className="ct-item-name">{info.name}</span>
              </span>
              {currency === code && <span className="ct-item-check">âœ“</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CurrencyToggle;
```

### FILE: frontend\src\components\DeleteButton.css
```
/* frontend/src/components/DeleteButton.css */

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   DELETE-TRIP BUTTON â€” "Bin eats the label"
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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
  padding: 12px 22px 12px 18px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, #a3e635 0%, #84cc16 100%);
  color: #12200a;
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.01em;
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  box-shadow:
    0 6px 20px rgba(163, 230, 53, 0.42),
    0 1px 0 rgba(255, 255, 255, 0.35) inset;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  transition: box-shadow 0.25s ease, transform 0.15s ease;
}
.dtb-root:hover {
  box-shadow:
    0 10px 28px rgba(163, 230, 53, 0.6),
    0 1px 0 rgba(255, 255, 255, 0.5) inset;
  transform: translateY(-2px);
}
.dtb-root:active {
  transform: translateY(0);
}
.dtb-root:focus-visible {
  outline: 2px solid #a3e635;
  outline-offset: 4px;
}

/* â•â•â• Bin (stationary) â•â•â• */
.dtb-bin {
  position: relative;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  z-index: 3;
  will-change: transform;
  color: #12200a;
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

/* â•â•â• Sparks â•â•â• */
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
  background: #fef9c3;
  box-shadow: 0 0 6px rgba(254, 249, 195, 0.9);
}
.dtb-spark:nth-child(3n) {
  background: #bef264;
  box-shadow: 0 0 6px rgba(190, 242, 100, 0.9);
}

/* â•â•â• Label â•â•â• */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ANIMATION TIMELINE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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

/* Lid open â†’ hold â†’ snap */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CONFIRMATION MODAL
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

.dtb-modal-back {
  position: fixed;
  inset: 0;
  z-index: 5000;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
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
  background: #ffffff;
  border-radius: 24px;
  padding: 36px 32px 28px;
  text-align: center;
  box-shadow:
    0 30px 80px -30px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(0, 0, 0, 0.05);
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
  background: #fef2f2;
  border: 2px solid #fecaca;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
}
.dtb-modal__title {
  font-size: 1.35rem;
  font-weight: 900;
  color: #111;
  letter-spacing: -0.02em;
  margin: 0 0 10px;
}
.dtb-modal__text {
  font-size: 0.88rem;
  color: #6b7280;
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
  background: #f3f4f6;
  color: #374151;
}
.dtb-modal__btn--cancel:hover {
  background: #e5e7eb;
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

### FILE: frontend\src\components\DeleteButton.jsx
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

  /* â•â•â•â•â•â•â•â•â•â•â• Audio â•â•â•â•â•â•â•â•â•â•â• */
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

  /* â•â•â•â•â•â•â•â•â•â•â• Measure letters â†’ bin mouth â•â•â•â•â•â•â•â•â•â•â• */
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

  /* â•â•â•â•â•â•â•â•â•â•â• Click â€” no confirm, just delete â•â•â•â•â•â•â•â•â•â•â• */
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

### FILE: frontend\src\components\ExportPDFButton.css
```
/* frontend/src/components/ExportPDFButton.css */

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   BASE BUTTON
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SKY BACKGROUND (appears during animation)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PARACHUTE PAYLOAD
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SHOCKWAVE (when payload lands)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CHECKMARK BADGE (appears after drop)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   LABELS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

/* Running state â€” swap to "Dropping your PDFâ€¦" */
.pdf-btn.running .pdf-btn__lbl-default {
  opacity: 0;
  transform: translateY(-1.2em);
}
.pdf-btn.running .pdf-btn__lbl-drop {
  opacity: 1;
  transform: translateY(0);
  color: #1e40af;
}

/* Done state â€” swap to "PDF Downloaded!" */
.pdf-btn.win .pdf-btn__lbl-default { opacity: 0; transform: translateY(-1.2em); }
.pdf-btn.win .pdf-btn__lbl-drop    { opacity: 0; transform: translateY(-1.2em); }
.pdf-btn.win .pdf-btn__lbl-done    { opacity: 1; transform: translateY(0); }

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SR-ONLY
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   REDUCED MOTION
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

### FILE: frontend\src\components\ExportPDFButton.jsx
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

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     Audio setup â€” Web Audio API (no files needed)
     â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

  /* â”€â”€â”€ Sound 1: Button press â€” square blip â”€â”€â”€ */
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

  /* â”€â”€â”€ Sound 2: Parachute descent â€” filtered noise sweeping down â”€â”€â”€ */
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

  /* â”€â”€â”€ Sound 3: Landing thud â€” sine sweep down â”€â”€â”€ */
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

  /* â”€â”€â”€ Sound 4: Success ping â€” triangle ding â”€â”€â”€ */
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

  /* â”€â”€â”€ Sound 5: Victory chord â€” C-E-G-C â”€â”€â”€ */
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

  /* â”€â”€â”€ Play the full sequence â”€â”€â”€ */
  const playFull = () => {
    const ctx = getAudio();
    if (!ctx) {
      console.warn("[PDF Button] AudioContext unavailable");
      return;
    }
    const t = ctx.currentTime + 0.02;

    sPress(t);              // 0.00s â€” button click
    sDescent(t + 0.1, 1.6); // 0.10s â€” parachute descends (1.6s whoosh)
    sThud(t + 1.85);        // 1.85s â€” landing thud
    sPing(t + 2.0);         // 2.00s â€” ping when badge pops
    sVictory(t + 2.25);     // 2.25s â€” victory chord
  };

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     PDF export
     â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
     Click handler
     â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
          ðŸ“„ Export PDF Itinerary
        </span>
        <span className="pdf-btn__lbl pdf-btn__lbl-drop">
          ðŸª‚ Dropping your PDFâ€¦
        </span>
        <span className="pdf-btn__lbl pdf-btn__lbl-done">
          âœ… PDF Downloaded!
        </span>
      </span>
    </button>
  );
};

export default ExportPDFButton;
```

### FILE: frontend\src\components\ItineraryPaper.jsx
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
            {startDate} â€” {endDate}
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
            â‚¹{trip.budget?.toLocaleString?.() || trip.budget}
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
                          {!act.cost || act.cost === 0 ? "Free" : `â‚¹${act.cost}`}
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
                <div className="itn-hotel-row">ðŸ“ {h.address}</div>
                <div className="itn-hotel-row">
                  â­ {h.rating} Â· ðŸ’° {h.price}
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
                <div className="itn-hotel-row">ðŸ· {p.type}</div>
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
                <td>âœˆï¸ Flights</td>
                <td className="itn-col-cost">
                  <div className="itn-cost-val">
                    â‚¹{trip.budgetBreakdown.flights}
                  </div>
                </td>
              </tr>
              <tr>
                <td>ðŸ¨ Hotels</td>
                <td className="itn-col-cost">
                  <div className="itn-cost-val">
                    â‚¹{trip.budgetBreakdown.hotels}
                  </div>
                </td>
              </tr>
              <tr>
                <td>ðŸ½ Food</td>
                <td className="itn-col-cost">
                  <div className="itn-cost-val">
                    â‚¹{trip.budgetBreakdown.food}
                  </div>
                </td>
              </tr>
              <tr>
                <td>ðŸŽŸ Activities</td>
                <td className="itn-col-cost">
                  <div className="itn-cost-val">
                    â‚¹{trip.budgetBreakdown.activities}
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td className="itn-col-cost">
                  <div className="itn-cost-val">
                    <strong>â‚¹{trip.budgetBreakdown.total}</strong>
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
          Planned activity cost: â‚¹{totalSpent.toLocaleString?.() || totalSpent}
        </div>
        <div className="f-right">Safe Travels!</div>
      </footer>
    </main>
  );
};

export default ItineraryPaper;
```

### FILE: frontend\src\components\Navbar.css
```
/* frontend/src/components/Navbar.css */

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ROOT NAVBAR
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   BRAND
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   DESKTOP NAV LINKS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   AUTH ZONE (right side)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   NOT-LOGGED-IN CTAs
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MOBILE TOGGLE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MOBILE PANEL
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   THREE-DOT MENU
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TOAST
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   RESPONSIVE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SMALL FLOATING PDF PANEL (top-right)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

.pdf-mini {
  position: fixed;
  top: 76px;
  right: 24px;
  width: 200px;
  height: 220px;
  border-radius: 20px;
  background: #050505;
  border: 1px solid rgba(163, 230, 53, 0.35);
  box-shadow:
    0 24px 60px -20px rgba(0, 0, 0, 0.85),
    0 0 32px -8px rgba(163, 230, 53, 0.35);
  overflow: hidden;
  z-index: 300;
  pointer-events: none;
  font-family: 'Poppins', system-ui, sans-serif;
  animation: pdfMiniIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes pdfMiniIn {
  from { opacity: 0; transform: translateY(-12px) scale(0.94); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Sky background */
.pdf-mini__sky {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 50% 35%,
    rgba(163, 230, 53, 0.18) 0%,
    rgba(5, 5, 5, 0.95) 70%
  );
}

/* Parachute wrapper */
.pdf-mini__para {
  position: absolute;
  top: 20px;
  left: 50%;
  width: 60px;
  height: 68px;
  margin-left: -30px;
  opacity: 0;
  filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.55));
  animation: pdfMiniDrop 1.9s cubic-bezier(0.34, 0.94, 0.6, 1) forwards;
  will-change: transform, opacity;
}

@keyframes pdfMiniDrop {
  0% {
    opacity: 0;
    transform: translateY(-120px) scale(0.5) rotate(-10deg);
  }
  15% {
    opacity: 1;
    transform: translateY(-70px) scale(0.85) rotate(6deg);
  }
  45% {
    transform: translateY(-28px) scale(1) rotate(-4deg);
  }
  70% {
    transform: translateY(-6px) scale(1.06) rotate(3deg);
  }
  88% {
    transform: translateY(2px) scale(1.02) rotate(-1deg);
  }
  100% {
    opacity: 0;
    transform: translateY(8px) scale(0.75) rotate(0deg);
  }
}

.pdf-mini__para svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* Canopy sway */
.pdf-mini__para .mini-canopy {
  transform-origin: 20px 16px;
  animation: pdfMiniCanopySway 1.1s ease-in-out infinite alternate;
}

@keyframes pdfMiniCanopySway {
  from { transform: rotate(-4deg) scaleX(0.98); }
  to   { transform: rotate(4deg) scaleX(1.02); }
}

/* Crate swing */
.pdf-mini__para .mini-crate {
  transform-origin: 20px 26px;
  animation: pdfMiniCrateSwing 0.85s ease-in-out infinite alternate;
}

@keyframes pdfMiniCrateSwing {
  from { transform: rotate(-8deg); }
  to   { transform: rotate(8deg); }
}

/* Shockwave on landing */
.pdf-mini__shock {
  position: absolute;
  top: 88px;
  left: 50%;
  width: 40px;
  height: 40px;
  margin-left: -20px;
  border-radius: 50%;
  border: 2px solid rgba(163, 230, 53, 0.85);
  opacity: 0;
  animation: pdfMiniShock 0.9s 1.45s ease-out forwards;
}

@keyframes pdfMiniShock {
  0% {
    opacity: 0.9;
    transform: scale(0.4);
    border-color: rgba(163, 230, 53, 0.95);
  }
  100% {
    opacity: 0;
    transform: scale(3.4);
    border-color: rgba(163, 230, 53, 0);
  }
}

/* Checkmark badge after drop */
.pdf-mini__badge {
  position: absolute;
  top: 70px;
  left: 50%;
  width: 60px;
  height: 60px;
  margin-left: -30px;
  filter: drop-shadow(0 0 16px rgba(163, 230, 53, 0.6));
  animation: pdfMiniBadgePop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes pdfMiniBadgePop {
  0% {
    opacity: 0;
    transform: scale(0.3) rotate(-30deg);
  }
  60% {
    opacity: 1;
    transform: scale(1.2) rotate(8deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

/* Label under the animation */
.pdf-mini__label {
  position: absolute;
  bottom: 18px;
  left: 12px;
  right: 12px;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #a3e635;
  text-shadow: 0 0 14px rgba(163, 230, 53, 0.6);
  animation: pdfMiniLabelIn 0.4s ease-out forwards;
}

@keyframes pdfMiniLabelIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .pdf-mini,
  .pdf-mini__para,
  .pdf-mini__shock,
  .pdf-mini__badge,
  .pdf-mini__para .mini-canopy,
  .pdf-mini__para .mini-crate,
  .pdf-mini__label {
    animation: none !important;
    transition: opacity 0.2s ease !important;
  }
  .pdf-mini__para { opacity: 1; transform: none; }
  .pdf-mini__badge { opacity: 1; transform: none; }
}

/* Mobile */
@media (max-width: 480px) {
  .pdf-mini {
    top: 70px;
    right: 12px;
    width: 170px;
    height: 200px;
  }
}
```

### FILE: frontend\src\components\Navbar.jsx
```
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTripActions } from "../context/TripActionsContext";
import CurrencyToggle from "./CurrencyToggle";
import "./Navbar.css";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/trips/new", label: "Create" },
  { to: "/trips", label: "My Trips" },
  { to: "/compare", label: "Compare" },
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
  const [pdfAnim, setPdfAnim] = useState("idle"); // idle | dropping | done

  const menuRef = useRef(null);
  const audioRef = useRef({ ac: null, noiseBuf: null });
  const path = location.pathname;

  /* â”€â”€â”€ Audio helpers â”€â”€â”€ */
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
    g.gain.exponentialRampToValueAtTime(0.085, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.09);
  };

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

  const playPDFSounds = () => {
    const ctx = getAudio();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    sPress(t);
    sDescent(t + 0.1, 1.6);
    sThud(t + 1.85);
    sPing(t + 2.0);
    sVictory(t + 2.25);
  };

  /* â”€â”€â”€ PDF export â”€â”€â”€ */
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
    if (pdfAnim !== "idle") return;

    setPdfAnim("dropping");
    playPDFSounds();

    setTimeout(() => setPdfAnim("done"), 2000);
    setTimeout(() => runPDFExport(), 2300);
    setTimeout(() => setPdfAnim("idle"), 4800);
  };

  /* â”€â”€â”€ Nav helpers â”€â”€â”€ */
  const isLinkActive = (to) => {
    if (to === "/") return path === "/";
    if (to === "/trips/new") return path === "/trips/new";
    if (to === "/compare") return path === "/compare";
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

  const handleTripCalendar = () => {
    setMenuOpen(false);
    if (actions?.onCalendar) actions.onCalendar();
  };

  const handleTripCoverArt = () => {
    setMenuOpen(false);
    if (actions?.onCoverArt) actions.onCoverArt();
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
          {/* Brand */}
          <Link to="/" className="nb-brand" onClick={closeMobile}>
            <span className="nb-brand-text">
              AI Travel <span className="nb-brand-accent">Planner</span>
            </span>
          </Link>

          {/* Desktop links */}
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

          {/* Right side */}
          {user ? (
            <div className="nb-auth">
              <CurrencyToggle />
              <Link
                to="/profile"
                className="nb-avatar"
                title={user.name}
                aria-label="Your profile"
              >
                {initials}
              </Link>

              <button
                type="button"
                className="nb-logout"
                onClick={handleLogout}
              >
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
                          disabled={pdfAnim !== "idle"}
                        >
                          <span className="nb-menu-icon">ðŸ“„</span>
                          <span>
                            {pdfAnim === "dropping"
                              ? "Dropping your PDFâ€¦"
                              : pdfAnim === "done"
                              ? "PDF Downloaded!"
                              : "Export PDF"}
                          </span>
                        </button>

                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleTripCalendar}
                        >
                          <span className="nb-menu-icon">ðŸ“…</span>
                          <span>Add to Calendar</span>
                        </button>

                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleTripCoverArt}
                          disabled={actions.generatingArt}
                        >
                          <span className="nb-menu-icon">ðŸŽ¨</span>
                          <span>
                            {actions.generatingArt
                              ? "Generatingâ€¦"
                              : "Generate Cover Art"}
                          </span>
                        </button>

                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleTripJournal}
                        >
                          <span className="nb-menu-icon">ðŸ““</span>
                          <span>View Journal</span>
                        </button>

                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleTripShare}
                          disabled={actions.shareLoading}
                        >
                          <span className="nb-menu-icon">ðŸ”—</span>
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
                          <span className="nb-menu-icon">ðŸ”—</span>
                          <span>Share this page</span>
                        </button>
                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleCopyLink}
                        >
                          <span className="nb-menu-icon">ðŸ“‹</span>
                          <span>Copy link</span>
                        </button>
                        <div className="nb-menu-divider" />
                        <button
                          type="button"
                          className="nb-menu-item"
                          onClick={handleProfile}
                        >
                          <span className="nb-menu-icon">ðŸ‘¤</span>
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
              <CurrencyToggle />
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
                      <span className="nb-menu-icon">ðŸ”—</span>
                      <span>Share this page</span>
                    </button>
                    <button
                      type="button"
                      className="nb-menu-item"
                      onClick={handleCopyLink}
                    >
                      <span className="nb-menu-icon">ðŸ“‹</span>
                      <span>Copy link</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile toggle */}
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

        {/* Mobile panel */}
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
            <button
              type="button"
              className="nb-mobile-logout"
              onClick={handleShare}
            >
              ðŸ”— Share this page
            </button>
            <button
              type="button"
              className="nb-mobile-logout"
              onClick={handleCopyLink}
            >
              ðŸ“‹ Copy link
            </button>
          </div>

          {user ? (
            <>
              <Link
                to="/profile"
                className="nb-mobile-user"
                onClick={closeMobile}
              >
                <span className="nb-avatar">{initials}</span>
                <span className="nb-mobile-user-info">
                  <span className="nb-mobile-user-name">{user.name}</span>
                  <span className="nb-mobile-user-email">{user.email}</span>
                </span>
              </Link>
              <div className="nb-mobile-actions">
                <button
                  type="button"
                  className="nb-mobile-logout"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="nb-mobile-actions">
              <Link
                to="/register"
                className="nb-mobile-cta"
                onClick={closeMobile}
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="nb-mobile-cta-ghost"
                onClick={closeMobile}
              >
                Login
              </Link>
            </div>
          )}
        </div>
      </nav>

      {toast && <div className="nb-toast">{toast}</div>}

      {/* â•â•â•â•â•â•â•â•â•â•â• SMALL FLOATING PDF PANEL (top-right) â•â•â•â•â•â•â•â•â•â•â• */}
      {pdfAnim !== "idle" && (
        <div className={`pdf-mini ${pdfAnim}`} aria-hidden="true">
          <div className="pdf-mini__sky" />

          <div className="pdf-mini__para">
            <svg viewBox="0 0 40 46" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="miniCp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#C4E570" />
                  <stop offset="1" stopColor="#8FBF2E" />
                </linearGradient>
                <linearGradient id="miniCrate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ffe2a0" />
                  <stop offset="1" stopColor="#d99b2b" />
                </linearGradient>
                <linearGradient id="miniPack" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#A8D84A" />
                  <stop offset="1" stopColor="#1A2E1A" />
                </linearGradient>
              </defs>

              <g className="mini-canopy">
                <path
                  d="M20 1 C8 1 1 8 1 16 L39 16 C39 8 32 1 20 1 Z"
                  fill="url(#miniCp)"
                />
                <circle cx="7" cy="16" r="6" fill="url(#miniCp)" />
                <circle cx="20" cy="16" r="6" fill="url(#miniCp)" />
                <circle cx="33" cy="16" r="6" fill="url(#miniCp)" />
              </g>

              <g stroke="#DCF0A0" strokeWidth=".9" opacity=".85" fill="none">
                <line x1="7" y1="20" x2="17" y2="29" />
                <line x1="20" y1="21" x2="20" y2="29" />
                <line x1="33" y1="20" x2="23" y2="29" />
              </g>

              <g className="mini-crate">
                <rect x="15" y="24" width="10" height="6" rx="1.6" fill="url(#miniPack)" />
                <rect
                  x="11"
                  y="28"
                  width="18"
                  height="15"
                  rx="2.2"
                  fill="url(#miniCrate)"
                  stroke="#8a5a10"
                  strokeWidth=".9"
                />
              </g>
            </svg>
          </div>

          <div className="pdf-mini__shock" />

          {pdfAnim === "done" && (
            <div className="pdf-mini__badge">
              <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle
                  cx="20"
                  cy="20"
                  r="17"
                  fill="#1A2E1A"
                  stroke="#A8D84A"
                  strokeWidth="2.5"
                />
                <path
                  d="M11 20 L17 26 L29 13"
                  fill="none"
                  stroke="#A8D84A"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}

          <div className="pdf-mini__label">
            {pdfAnim === "dropping" ? "Dropping your PDFâ€¦" : "PDF Downloaded!"}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
```

### FILE: frontend\src\components\Skeleton.jsx
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

### FILE: frontend\src\components\SkyFlightButton.jsx
```
import { useEffect, useState } from "react";

const SkyFlightButton = ({
  label = "Generate My Trip",
  loadingLabel = "Curating Your Itinerary",
  doneLabel = "ðŸŽ‰ Itinerary Ready!",
  disabled = false,
  loading = false,
  onClick,
  onComplete,
  autoCompleteAfter = 2000,
}) => {
  const [state, setState] = useState("idle"); // idle | loading | complete

  // ---- External control via window (used by TripDetail) ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__skyTripBtn = {
      setComplete: () => setCompleteState(),
      setLoading: () => setLoadingState(),
      reset: () => resetState(),
    };
    return () => {
      delete window.__skyTripBtn;
    };
  }, [state]);

  // ---- Sync with external `loading` prop ----
  useEffect(() => {
    if (loading && state === "idle") setLoadingState();
  }, [loading, state]);

  const setLoadingState = () => {
    if (state === "loading") return;
    setState("loading");
  };

  const setCompleteState = () => {
    if (state === "complete") return;
    setState("complete");
    if (typeof onComplete === "function") onComplete();
  };

  const resetState = () => {
    if (state === "idle") return;
    setState("idle");
  };

  const handleClick = () => {
    if (state !== "idle" || disabled) return;
    setLoadingState();
    if (typeof onClick === "function") onClick();

    // Auto-complete (also handles case where backend hasn't responded yet)
    if (autoCompleteAfter > 0) {
      setTimeout(() => setCompleteState(), autoCompleteAfter);
    }
  };

  // Auto-reset after complete
  useEffect(() => {
    if (state === "complete") {
      const t = setTimeout(() => resetState(), 2800);
      return () => clearTimeout(t);
    }
  }, [state]);

  const cls = [
    "sky-btn",
    state === "idle" ? "is-idle" : "",
    state === "loading" ? "is-loading" : "",
    state === "complete" ? "is-complete" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={cls}
      onClick={handleClick}
      disabled={disabled || state !== "idle"}
      data-state={state}
      aria-live="polite"
      aria-busy={state === "loading"}
    >
      {/* Sky */}
      <span className="sky-btn__sky" aria-hidden="true">
        <span className="sky-btn__tint"></span>
        <span className="sky-btn__stars"></span>
        <span className="sky-btn__cloud c1"></span>
        <span className="sky-btn__cloud c2"></span>
        <span className="sky-btn__cloud c3"></span>
      </span>

      {/* Flying plane + contrail */}
      <span className="sky-btn__flyer" aria-hidden="true">
        <span className="sky-btn__trail"></span>
        <span className="sky-btn__streak s1"></span>
        <span className="sky-btn__streak s2"></span>
        <span className="sky-btn__streak s3"></span>
        <svg
          className="sky-btn__flyer-svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
        </svg>
      </span>

      {/* Completion ripple */}
      {state === "complete" && (
        <span className="sky-btn__ripple" aria-hidden="true"></span>
      )}

      {/* Foreground */}
      <span className="sky-btn__content">
        <span className="sky-btn__icon" aria-hidden="true">
          <svg
            className="sky-btn__icon-plane"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
          <svg
            className="sky-btn__icon-check"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4.5 12.6 9.3 17.4 19.5 7.2" />
          </svg>
        </span>

        <span className="sky-btn__swap">
          <span
            className={`sky-btn__label ${
              state === "idle" ? "is-active" : ""
            }`}
          >
            {label}
          </span>
          <span
            className={`sky-btn__label ${
              state === "loading" ? "is-active" : ""
            }`}
          >
            {loadingLabel}
            <span className="sky-btn__dots" aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
            </span>
          </span>
          <span
            className={`sky-btn__label ${
              state === "complete" ? "is-active" : ""
            }`}
          >
            {doneLabel}
          </span>
        </span>
      </span>
    </button>
  );
};

export default SkyFlightButton;
```

### FILE: frontend\src\components\TripMap.css
```
/* frontend/src/components/TripMap.css */

/* Wrapper isolates the map into its own stacking context */
.trip-map-wrap {
  position: relative;
  z-index: 0;            /* LOW â€” below navbar (100) and other UI */
  isolation: isolate;    /* creates a new stacking context */
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #f3f4f6;
}

/* Force the Leaflet container to stay inside the wrapper */
.trip-map-wrap .leaflet-container {
  z-index: 0 !important;
  border-radius: 16px;
  font-family: 'Poppins', system-ui, sans-serif;
}

/* Keep Leaflet's internal panes from escaping above the navbar */
.trip-map-wrap .leaflet-pane,
.trip-map-wrap .leaflet-top,
.trip-map-wrap .leaflet-bottom {
  z-index: auto !important;
}

.trip-map-wrap .leaflet-pane {
  z-index: 400 !important;
}
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

/* Match your site's rounded aesthetic */
.trip-map-wrap .leaflet-control-zoom a {
  background: #ffffff;
  color: #111111;
  border-color: #e5e7eb;
  font-weight: 700;
}
.trip-map-wrap .leaflet-control-zoom a:hover {
  background: #a3e635;
  color: #000;
  border-color: #a3e635;
}

/* Attribution styling */
.trip-map-wrap .leaflet-control-attribution {
  background: rgba(255, 255, 255, 0.85);
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 8px 0 0 0;
}
```

### FILE: frontend\src\components\TripMap.jsx
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

### FILE: frontend\src\components\WeatherIcon.jsx
```
// frontend/src/components/WeatherIcon.jsx â€” NEW FILE
import { useMemo } from "react";

/* WMO code â†’ animation type */
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

### FILE: frontend\src\components\WeatherSlider.jsx
```
import { useEffect, useMemo, useRef, useState } from "react";

/* ============================================================
   WMO CODE TABLE
   ============================================================ */
const WMO = {
  0: { icon: "â˜€ï¸", label: "Clear" },
  1: { icon: "ðŸŒ¤ï¸", label: "Mainly clear" },
  2: { icon: "â›…", label: "Partly cloudy" },
  3: { icon: "â˜ï¸", label: "Overcast" },
  45: { icon: "ðŸŒ«ï¸", label: "Fog" },
  48: { icon: "ðŸŒ«ï¸", label: "Rime fog" },
  51: { icon: "ðŸŒ¦ï¸", label: "Light drizzle" },
  53: { icon: "ðŸŒ¦ï¸", label: "Drizzle" },
  55: { icon: "ðŸŒ§ï¸", label: "Dense drizzle" },
  61: { icon: "ðŸŒ¦ï¸", label: "Light rain" },
  63: { icon: "ðŸŒ§ï¸", label: "Rain" },
  65: { icon: "ðŸŒ§ï¸", label: "Heavy rain" },
  71: { icon: "ðŸŒ¨ï¸", label: "Light snow" },
  73: { icon: "ðŸŒ¨ï¸", label: "Snow" },
  75: { icon: "â„ï¸", label: "Heavy snow" },
  77: { icon: "â„ï¸", label: "Snow grains" },
  80: { icon: "ðŸŒ¦ï¸", label: "Showers" },
  81: { icon: "ðŸŒ§ï¸", label: "Showers" },
  82: { icon: "â›ˆï¸", label: "Violent showers" },
  85: { icon: "ðŸŒ¨ï¸", label: "Snow showers" },
  86: { icon: "â„ï¸", label: "Heavy snow" },
  95: { icon: "â›ˆï¸", label: "Thunderstorm" },
  96: { icon: "â›ˆï¸", label: "Storm + hail" },
  99: { icon: "â›ˆï¸", label: "Storm + hail" },
};
const describe = (c) => WMO[c] || { icon: "ðŸŒ¡ï¸", label: "Unsettled" };

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
    return "âš ï¸ High rain chance â€” best for indoor museums, cafÃ©s, and shopping districts.";
  }
  if (day.pop >= 40) {
    return "Carry an umbrella â€” mix indoor and outdoor stops today.";
  }
  if (day.max >= 32) {
    return "â˜€ï¸ Hot day â€” plan outdoor activities early morning, stay hydrated.";
  }
  if (day.max <= 5) {
    return "â„ï¸ Cold day â€” dress warm, ideal for scenic walks and hot drinks.";
  }
  if (label.includes("clear") || label.includes("sunny")) {
    return "Perfect weather for outdoor sightseeing, photography, and walking tours.";
  }
  return "Comfortable weather â€” a great day to explore the destination.";
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

        // â”€â”€ Live 16-day fetch â”€â”€
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

        // â”€â”€ Climate tail (days 17â€“30) â”€â”€
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
    if (c === null || c === undefined) return "â€“";
    if (unit === "F") return `${Math.round((c * 9) / 5 + 32)}Â°F`;
    return `${c}Â°C`;
  };
  const tempShort = (c) => {
    if (c === null || c === undefined) return "â€“";
    if (unit === "F") return `${Math.round((c * 9) / 5 + 32)}Â°`;
    return `${c}Â°`;
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
      {/* â•â•â•â•â•â•â•â•â•â•â• HEADER â•â•â•â•â•â•â•â•â•â•â• */}
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
            Unit: Â°{unit}
          </button>
          <button
            className={`ws-btn ${motionOn ? "active" : ""}`}
            onClick={() => setMotionOn((v) => !v)}
          >
            <span>{motionOn ? "â¸" : "â–¶"}</span>
            <span>{motionOn ? "Pause" : "Auto-Scroll"}</span>
          </button>
          <div className="ws-nav-arrows">
            <button
              className="ws-arrow-btn"
              onClick={() => slide(-1)}
              aria-label="Previous"
            >
              â—€
            </button>
            <button
              className="ws-arrow-btn"
              onClick={() => slide(1)}
              aria-label="Next"
            >
              â–¶
            </button>
          </div>
        </div>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â• FILTERS â•â•â•â•â•â•â•â•â•â•â• */}
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
          â˜€ï¸ Clear Skies (&lt;20% Rain)
        </button>
        <button
          className={`ws-chip ${filter === "rain" ? "active" : ""}`}
          onClick={() => setFilter("rain")}
        >
          ðŸŒ§ï¸ Plan B Days (â‰¥50% Rain)
        </button>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â• TRACK â•â•â•â•â•â•â•â•â•â•â• */}
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

                {isRainy && <div className="ws-plan-b">âš¡ Plan B</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â• PROGRESS â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="ws-progress">
        <div
          className="ws-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â• INSPECTOR â•â•â•â•â•â•â•â•â•â•â• */}
      {activeData && (
        <div className="ws-inspector">
          <div className="ws-inspector-left">
            <div className="ws-inspector-icon">
              {describe(activeData.code).icon}
            </div>
            <div className="ws-inspector-info">
              <div className="ws-inspector-title">
                <span>
                  Day {activeDay}: {fmtShort(activeData.date)} â€”{" "}
                  {describe(activeData.code).label}
                </span>
                <span
                  className={`ws-inspector-risk ${
                    activeData.pop >= 50 ? "rainy" : ""
                  }`}
                >
                  {activeData.pop >= 50 ? "ðŸŒ§ï¸" : "â˜€ï¸"} {activeData.pop}% Rain
                  Risk
                </span>
              </div>
              <div className="ws-inspector-sub">
                High: {temp(activeData.max)} â€¢ Low: {temp(activeData.min)} â€¢
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

### FILE: frontend\src\context\AuthContext.jsx
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

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

### FILE: frontend\src\context\CurrencyContext.jsx
```
import { createContext, useContext, useState, useEffect } from "react";

const CurrencyContext = createContext();

const FALLBACK_RATES = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0094,
  JPY: 1.83,
};

const CURRENCIES = {
  INR: { symbol: "â‚¹", name: "Indian Rupee" },
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "â‚¬", name: "Euro" },
  GBP: { symbol: "Â£", name: "British Pound" },
  JPY: { symbol: "Â¥", name: "Japanese Yen" },
};

const STORAGE_KEY = "aitp.currency";
const RATES_CACHE_KEY = "aitp.rates";
const CACHE_TTL = 24 * 60 * 60 * 1000;

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && CURRENCIES[saved]) return saved;
    } catch {}
    return "INR";
  });

  const [rates, setRates] = useState(FALLBACK_RATES);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(RATES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (
          parsed.time &&
          Date.now() - parsed.time < CACHE_TTL &&
          parsed.rates
        ) {
          setRates(parsed.rates);
          return;
        }
      }
    } catch {}

    fetch("https://open.er-api.com/v6/latest/INR")
      .then((res) => res.json())
      .then((data) => {
        if (data?.rates) {
          const wanted = {};
          Object.keys(CURRENCIES).forEach((code) => {
            wanted[code] = data.rates[code] || FALLBACK_RATES[code] || 1;
          });
          wanted.INR = 1;
          setRates(wanted);
          try {
            localStorage.setItem(
              RATES_CACHE_KEY,
              JSON.stringify({ time: Date.now(), rates: wanted })
            );
          } catch {}
        }
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  const setCurrency = (code) => {
    if (!CURRENCIES[code]) return;
    setCurrencyState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {}
  };

  const convert = (amountInINR) => {
    if (amountInINR == null || isNaN(amountInINR)) return 0;
    const rate = rates[currency] || 1;
    return Number(amountInINR) * rate;
  };

  const format = (amountInINR) => {
    const value = convert(amountInINR);
    const sym = CURRENCIES[currency].symbol;
    const rounded =
      value >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
    return `${sym}${rounded.toLocaleString("en-US")}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        convert,
        format,
        currencies: CURRENCIES,
        rates,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx)
    throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
```

### FILE: frontend\src\context\ThemeContext.jsx
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

### FILE: frontend\src\context\TripActionsContext.jsx
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

### FILE: frontend\src\lib\utils.js
```
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

### FILE: frontend\src\pages\CreateTrip.css
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

.ct-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}
.ct-submit {
  background: linear-gradient(135deg, var(--ct-lime), var(--ct-lime-bright));
  color: #000;
  border: none;
  padding: 14px 28px;
  border-radius: 14px;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 24px -6px rgba(163, 230, 53, 0.5);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.ct-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px -6px rgba(163, 230, 53, 0.7);
}
.ct-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

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

@media (prefers-reduced-motion: reduce) {
  .ct-orb-1, .ct-orb-2, .ct-pulse, .ct-toast-dot { animation: none !important; }
}
```

### FILE: frontend\src\pages\CreateTrip.jsx
```
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./CreateTrip.css";

// Extract a short, geocode-friendly name from a Nominatim display_name
// Example: "Red Fort, Ring Road, Old Delhi, Delhi, 110003, India"
//      â†’ "Red Fort, Delhi, India"
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
  { id: "cheap", icon: "ðŸ’µ", label: "Cheap", desc: "Stay conscious of costs", budget: 15000 },
  { id: "moderate", icon: "ðŸ’°", label: "Moderate", desc: "Keep cost on the average side", budget: 30000 },
  { id: "luxury", icon: "ðŸ’Ž", label: "Luxury", desc: "Don't worry about cost", budget: 80000 },
];

const TRAVELER_OPTIONS = [
  { id: "solo", icon: "âœˆï¸", label: "Just Me", desc: "A sole traveler in exploration", count: 1 },
  { id: "couple", icon: "ðŸ¥‚", label: "A Couple", desc: "Two travelers in tandem", count: 2 },
  { id: "family", icon: "ðŸ ", label: "Family", desc: "A group of fun-loving adventurers", count: 4 },
  { id: "friends", icon: "â›µ", label: "Friends", desc: "A bunch of thrill-seekers", count: 5 },
];

const CreateTrip = () => {
  const navigate = useNavigate();
  const [destination, setDestination] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [days, setDays] = useState("");
  const [budget, setBudget] = useState("");
  const [travelerType, setTravelerType] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const suggestionsRef = useRef(null);

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
    if (!destination || !days || !budget || !travelerType) {
      return setError("Please fill all fields");
    }
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + Number(days));
    const selectedBudget = BUDGET_OPTIONS.find((b) => b.id === budget);
    const selectedTraveler = TRAVELER_OPTIONS.find((t) => t.id === travelerType);

    try {
      setLoading(true);
      const res = await api.post("/trips", {
        destination: shortenAddress(destination) || destination,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        budget: selectedBudget.budget,
        travellers: selectedTraveler.count,
        interests: [],
      });
      navigate(`/trips/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create trip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ct-root">
      <div className="ct-orb-1" />
      <div className="ct-orb-2" />

      {/* Loading toast */}
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
          Tell us your travel <span>preferences</span> ðŸ•ï¸
        </h1>
        <p className="ct-subtitle">
          Just provide some basic information, and our trip planner will
          generate a customized itinerary based on your preferences.
        </p>

        {error && <p className="ct-error">{error}</p>}

        <form onSubmit={handleSubmit} className="ct-form">
          {/* DESTINATION */}
          <div
            ref={suggestionsRef}
            className="ct-field"
            style={{ zIndex: 30 }}
          >
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
              placeholder="Search a city â€” try Paris, Tokyo, Baliâ€¦"
              className="ct-input"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="ct-suggestions">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDestination(shortenAddress(s.name));
                      setShowSuggestions(false);
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
              type="number"
              min="1"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="Ex. 3"
              className="ct-input"
            />
          </div>

          {/* BUDGET */}
          <div className="ct-field" style={{ zIndex: 10 }}>
            <label className="ct-label">What is Your Budget?</label>
            <div className="ct-options-grid">
              {BUDGET_OPTIONS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBudget(b.id)}
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
          <div className="ct-field" style={{ zIndex: 10 }}>
            <label className="ct-label">
              Who do you plan on traveling with on your next adventure?
            </label>
            <div className="ct-options-grid">
              {TRAVELER_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTravelerType(t.id)}
                  className={`ct-option ${travelerType === t.id ? "ct-selected" : ""}`}
                >
                  <div className="ct-option-icon">{t.icon}</div>
                  <div className="ct-option-title">{t.label}</div>
                  <div className="ct-option-desc">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* SUBMIT */}
          <div className="ct-actions" style={{ zIndex: 5 }}>
            <button
              type="submit"
              disabled={loading}
              className="ct-submit"
            >
              {loading ? "Generating..." : "Generate Trip"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTrip;
```

### FILE: frontend\src\pages\Dashboard.jsx
```
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-white py-12 px-6">
    <div className="max-w-4xl mx-auto">
      <Skeleton variant="text" width={130} height={14} />
      <div style={{ marginTop: 12 }}>
        <Skeleton variant="rectangular" width="55%" height={48} rounded="12px" />
      </div>
      <div style={{ marginTop: 20 }}>
        <Skeleton variant="text" width="80%" height={16} />
      </div>
      <div className="flex gap-4 mt-8 flex-wrap">
        <Skeleton variant="rectangular" width={180} height={48} rounded="9999px" />
        <Skeleton variant="rectangular" width={170} height={48} rounded="9999px" />
      </div>
      <div className="grid md:grid-cols-3 gap-4 mt-12">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-gray-100 rounded-2xl p-5">
            <Skeleton variant="circular" width={40} height={40} />
            <div style={{ marginTop: 12 }}>
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
    <div className="min-h-screen bg-white py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="animate-fade-in-up">
          <p className="text-gray-500 mb-2">Welcome back,</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-ink">
            Hey {user?.name} ðŸ‘‹
          </h1>
          <p className="text-gray-500 mt-4 max-w-lg">
            Ready to plan your next adventure? Let AI handle the details.
          </p>
          <div className="flex gap-4 mt-8 flex-wrap">
            <Link
              to="/trips/new"
              className="px-6 py-3 rounded-full bg-lime text-forest font-bold hover:bg-lime-dark btn-press transition"
            >
              âœ¨ Create a Trip
            </Link>
            <Link
              to="/trips"
              className="px-6 py-3 rounded-full border border-gray-200 text-ink font-bold hover:border-forest transition"
            >
              View My Trips
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-12">
          <div
            className="border border-gray-100 rounded-2xl p-5 card-hover animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="text-3xl mb-2">ðŸ—ºï¸</div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Trips</p>
            <p className="font-bold text-ink text-2xl mt-1">{trips.length}</p>
          </div>

          <div
            className="border border-gray-100 rounded-2xl p-5 card-hover animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="text-3xl mb-2">ðŸ’°</div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Budget</p>
            <p className="font-bold text-ink text-2xl mt-1">
              â‚¹{totalBudget.toLocaleString()}
            </p>
          </div>

          <div
            className="border border-gray-100 rounded-2xl p-5 card-hover animate-fade-in-up"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="text-3xl mb-2">ðŸ“…</div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Upcoming Trips</p>
            <p className="font-bold text-ink text-2xl mt-1">{upcomingTrips}</p>
          </div>
        </div>

        {recentTrips.length > 0 && (
          <div className="mt-12 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-2xl font-extrabold text-ink">Recent Trips</h2>
              <Link to="/trips" className="text-sm text-lime-dark font-semibold hover:underline">
                View all â†’
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {recentTrips.map((t) => {
                const days = Math.max(
                  1,
                  Math.round(
                    (new Date(t.endDate) - new Date(t.startDate)) / (1000 * 60 * 60 * 24)
                  )
                );
                return (
                  <Link
                    key={t._id}
                    to={`/trips/${t._id}`}
                    className="group border border-gray-100 rounded-2xl overflow-hidden card-hover"
                  >
                    <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                      <img
                        src={t.image || `https://picsum.photos/seed/${encodeURIComponent(t.destination)}/600/450`}
                        alt={t.destination}
                        className="w-full h-full object-cover img-zoom"
                        onError={(e) => {
                          e.target.src = `https://picsum.photos/seed/${encodeURIComponent(t.destination)}/600/450`;
                        }}
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-ink">{t.destination}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {days} Day{days > 1 ? "s" : ""} Â· â‚¹
                        {t.budget?.toLocaleString?.() || t.budget}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
```

### FILE: frontend\src\pages\EditTrip.jsx
```
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../api/axios";

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

  // Load existing trip
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

  // Destination autocomplete
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
      // â”€â”€â”€ navigate with autoGen flag so TripDetail regenerates AI â”€â”€â”€
      navigate(`/trips/${id}?autoGen=1`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not update trip");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full border border-gray-200 rounded-lg px-4 py-3.5 text-ink placeholder-gray-400 bg-white focus:outline-none focus:border-forest transition";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12 px-6">
      <div className="max-w-3xl mx-auto relative">
        <Link
          to={`/trips/${id}`}
          className="text-sm text-gray-500 hover:text-ink transition"
        >
          â† Back to trip
        </Link>

        <h1 className="mt-6 text-3xl md:text-4xl font-extrabold text-ink">
          Edit your trip âœï¸
        </h1>
        <p className="text-gray-500 mt-3 mb-12 max-w-xl">
          Update the details of your trip. Saving will regenerate the AI
          itinerary with your new preferences.
        </p>

        {error && (
          <p className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-6 text-sm">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* DESTINATION */}
          <div ref={suggestionsRef} className="relative" style={{ zIndex: 30 }}>
            <label className="block text-xl font-bold text-ink mb-4">
              Destination
            </label>
            <input
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Select..."
              className={inputClass}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div
                className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl max-h-72 overflow-y-auto"
                style={{ zIndex: 50 }}
              >
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDestination(shortenAddress(s.name));
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-b-0 text-ink"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DATES */}
          <div className="relative" style={{ zIndex: 10 }}>
            <label className="block text-xl font-bold text-ink mb-4">
              Trip dates
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-2">
                  Start date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-2">
                  End date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* PLACES COUNT â€” NEW */}
          <div className="relative" style={{ zIndex: 10 }}>
            <label className="block text-xl font-bold text-ink mb-4">
              How many places do you want to visit?
            </label>
            <p className="text-sm text-gray-500 mb-4 -mt-2">
              Total distinct spots within your destination. For example, 5 cities
              across Rajasthan, or 8 must-see spots in Tokyo.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {[3, 5, 7, 10, 15].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSpotsCount(n)}
                  className={`px-4 py-2 rounded-full border-2 text-sm font-bold transition ${
                    spotsCount === n
                      ? "border-forest bg-lime-light text-forest"
                      : "border-gray-200 text-gray-500 hover:border-gray-400"
                  }`}
                >
                  {n} places
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="50"
                value={spotsCount}
                onChange={(e) => setSpotsCount(Number(e.target.value) || 1)}
                className="w-32 border border-gray-200 rounded-lg px-4 py-3.5 text-ink placeholder-gray-400 bg-white focus:outline-none focus:border-forest transition text-center font-bold text-lg"
              />
              <span className="text-sm text-gray-500">
                places (custom â€” 1 to 50)
              </span>
            </div>
          </div>

          {/* BUDGET + TRAVELLERS */}
          <div
            className="relative grid grid-cols-1 md:grid-cols-2 gap-4"
            style={{ zIndex: 10 }}
          >
            <div>
              <label className="block text-xl font-bold text-ink mb-4">
                Budget (INR)
              </label>
              <input
                type="number"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="25000"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xl font-bold text-ink mb-4">
                Travellers
              </label>
              <input
                type="number"
                min="1"
                value={travellers}
                onChange={(e) => setTravellers(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div
            className="relative flex justify-end gap-3 pt-4"
            style={{ zIndex: 5 }}
          >
            <Link
              to={`/trips/${id}`}
              className="px-6 py-3.5 rounded-lg border border-gray-200 text-ink font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3.5 rounded-lg bg-lime text-forest font-bold hover:bg-lime-dark disabled:opacity-60 btn-press transition shadow-[0_6px_20px_-8px_rgba(168,216,74,0.8)]"
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

### FILE: frontend\src\pages\JournalTrips.css
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

### FILE: frontend\src\pages\JournalTrips.jsx
```
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import "./JournalTrips.css";

function pickEmoji(destination) {
  const t = (destination || "").toLowerCase();
  if (t.includes("bali") || t.includes("beach")) return "ðŸï¸";
  if (t.includes("tokyo") || t.includes("japan")) return "ðŸ—¼";
  if (t.includes("kyoto")) return "â›©ï¸";
  if (t.includes("new york") || t.includes("nyc")) return "ðŸ—½";
  if (t.includes("paris") || t.includes("france")) return "ðŸ¥";
  if (t.includes("rome") || t.includes("italy")) return "ðŸ›ï¸";
  if (t.includes("iceland") || t.includes("reyk")) return "ðŸŒ‹";
  if (t.includes("marrakech") || t.includes("morocco")) return "ðŸ•Œ";
  if (t.includes("dubai")) return "ðŸŒ‡";
  if (t.includes("london")) return "ðŸŽ¡";
  if (t.includes("india") || t.includes("goa") || t.includes("delhi")) return "ðŸ›•";
  return "âœˆï¸";
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
            <div className="jt-empty-icon">ðŸ““</div>
            <div className="jt-empty-title">No trips yet</div>
            <p className="jt-empty-text">
              Create a trip first, then come back to read its journal.
            </p>
            <Link to="/trips/new" className="jt-btn-primary">
              âœ¨ Create a trip
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
                      <span className="jt-card-warn"> Â· no itinerary yet</span>
                    )}
                  </div>
                  <div className="jt-card-cta">Open journal â†’</div>
                </Link>
              );
            })}
          </div>
        )}

        <footer className="jt-footer">
          <span>Two views Â· One journey</span>
          <span>AI Travel Planner Â© Journal</span>
        </footer>
      </main>
    </div>
  );
};

export default JournalTrips;
```

### FILE: frontend\src\pages\Landing.css
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
  --lp-card: #f0f0f0;
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Background scene â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
  min-height: 58vh;
  display: block;
}

.lp-floater {
  position: absolute;
  color: var(--lp-accent-dk);
  opacity: 0.22;
  animation: lpDrift 26s linear infinite;
  will-change: transform;
}
.lp-floater svg {
  display: block;
  width: 100%;
  height: 100%;
}

.lp-floater.p1 { top: 14%; left: -8%;  width: 64px; height: 64px; animation-duration: 28s; animation-delay: 0s;    opacity: 0.24; }
.lp-floater.p2 { top: 30%; left: -6%;  width: 46px; height: 46px; animation-duration: 34s; animation-delay: -9s;   opacity: 0.18; }
.lp-floater.p3 { top: 56%; left: -10%; width: 72px; height: 72px; animation-duration: 32s; animation-delay: -16s;  opacity: 0.20; }
.lp-floater.p4 { top: 20%; left: -8%;  width: 40px; height: 40px; animation-duration: 38s; animation-delay: -4s;   opacity: 0.15; }
.lp-floater.p5 { top: 74%; left: -6%;  width: 52px; height: 52px; animation-duration: 30s; animation-delay: -21s;  opacity: 0.18; }
.lp-floater.p6 { top: 44%; left: -9%;  width: 36px; height: 36px; animation-duration: 40s; animation-delay: -12s;  opacity: 0.14; }

@keyframes lpDrift {
  0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
  50%  { transform: translate3d(60vw, -50px, 0) rotate(12deg); }
  100% { transform: translate3d(125vw, -100px, 0) rotate(24deg); }
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Topbar â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.lp-topbar {
  position: relative;
  z-index: 10;
  background: var(--lp-bar);
  width: 100%;
}
.lp-topbar-inner {
  max-width: 1280px;
  margin: 0 auto;
  height: 66px;
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
  font-size: 1.02rem;
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
  gap: 6px;
  flex: 1;
  justify-content: center;
}
.lp-mainnav a {
  display: inline-block;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 0.92rem;
  font-weight: 600;
  color: #9d9d9d;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.18s ease, background 0.18s ease;
}
.lp-mainnav a:hover { color: #e6e6e6; }
.lp-mainnav a.lp-active {
  background: var(--lp-accent);
  color: #12200a;
  font-weight: 700;
}

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
.lp-btn-more {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #9d9d9d;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background 0.18s ease, color 0.18s ease;
}
.lp-btn-more:hover { background: #2a2a2a; color: #fff; }
.lp-btn-more svg { width: 18px; height: 18px; }

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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.lp-main {
  position: relative;
  z-index: 2;
  flex: 1;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: clamp(56px, 9vh, 100px) clamp(20px, 4vw, 48px) clamp(80px, 12vh, 140px);
  text-align: center;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Big 3-line headline â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.lp-headline {
  margin: 0 auto;
  max-width: 22ch;
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
  perspective: 900px;
}

.lp-headline-line {
  display: block;
  color: var(--lp-ink);
  animation: focusInExpandFwd 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  will-change: letter-spacing, filter, opacity;
}

.lp-headline-accent {
  color: var(--lp-accent);
  animation: blurContractBck 0.65s 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  will-change: transform, filter, opacity, letter-spacing;
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
  font-family: 'Poppins', system-ui, sans-serif;
  font-weight: 900;
  letter-spacing: -0.045em;
  color: var(--lp-accent);
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ANIMISTA-STYLE HERO ANIMATIONS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

@keyframes focusInExpandFwd {
  0% {
    letter-spacing: -0.5em;
    filter: blur(12px);
    opacity: 0;
  }
  60% {
    filter: blur(4px);
    opacity: 0.85;
  }
  100% {
    letter-spacing: -0.045em;
    filter: blur(0);
    opacity: 1;
  }
}

@keyframes blurContractBck {
  0% {
    letter-spacing: 0.35em;
    transform: translateZ(400px) scale(1.4);
    filter: blur(14px);
    opacity: 0;
  }
  60% {
    transform: translateZ(60px) scale(1.08);
    filter: blur(5px);
    opacity: 0.85;
  }
  100% {
    letter-spacing: -0.045em;
    transform: translateZ(0) scale(1);
    filter: blur(0);
    opacity: 1;
  }
}

@keyframes lpHeadlineIn {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* â”€â”€â”€ Subtitle â”€â”€â”€ */
.lp-sub {
  margin: clamp(22px, 3vh, 32px) auto 0;
  max-width: 620px;
  font-size: clamp(1rem, 1.5vw, 1.15rem);
  line-height: 1.6;
  font-weight: 500;
  color: var(--lp-muted);
  animation: lpFadeIn 0.45s 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* â”€â”€â”€ CTA â”€â”€â”€ */
.lp-cta {
  display: inline-block;
  margin-top: clamp(30px, 4vh, 44px);
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
  animation: lpFadeIn 0.45s 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.lp-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 42px -12px rgba(164, 209, 75, 1);
}
.lp-cta:active { transform: translateY(0); }

@keyframes lpFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* â”€â”€â”€ Features â”€â”€â”€ */
.lp-features {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 22px clamp(28px, 4vw, 60px);
  margin: clamp(46px, 7vh, 74px) 0 0;
  padding: 0;
  list-style: none;
  animation: lpFadeIn 0.45s 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.lp-features li {
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.lp-footer {
  position: relative;
  z-index: 10;
  width: 100%;
  background: var(--lp-ink);
  color: var(--lp-bg);
  padding: 56px 32px 24px;
  margin-top: 80px;
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

.lp-footer-column li {
  margin-bottom: 10px;
}

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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Responsive â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
@media (max-width: 1024px) {
  .lp-mainnav a { padding: 8px 13px; font-size: 0.88rem; }
  .lp-mainnav { gap: 2px; }
}

@media (max-width: 860px) {
  .lp-mainnav { display: none; }
  .lp-topbar-inner { justify-content: space-between; }
  .lp-brand-name { font-size: 0.98rem; }
}

@media (max-width: 768px) {
  .lp-headline {
    max-width: 20ch;
    font-size: clamp(2.1rem, 9vw, 3.4rem);
  }
  .lp-footer {
    padding: 44px 24px 20px;
    margin-top: 56px;
  }
  .lp-footer-content {
    flex-direction: column;
    gap: 28px;
  }
  .lp-footer-links {
    flex-direction: column;
    gap: 28px;
  }
  .lp-footer-bottom {
    flex-direction: column;
    text-align: center;
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .lp-brand-name { font-size: 0.9rem; }
  .lp-btn-logout { padding: 7px 12px; font-size: 0.8rem; }
  .lp-avatar { width: 32px; height: 32px; font-size: 0.72rem; }

  .lp-headline {
    font-size: clamp(1.9rem, 11vw, 3rem);
    max-width: 16ch;
  }

  .lp-features {
    flex-direction: column;
    align-items: flex-start;
    max-width: 320px;
    margin-left: auto;
    margin-right: auto;
    gap: 16px;
  }
  .lp-features li { white-space: normal; }

  .lp-floater.p3,
  .lp-floater.p6 { display: none; }
}

@media (max-width: 420px) {
  .lp-brand-name { font-size: 0.82rem; }
  .lp-cta { padding: 16px 34px; font-size: 0.98rem; }
  .lp-btn-logout { display: none; }
  .lp-headline { font-size: clamp(1.7rem, 12vw, 2.6rem); }
}

/* â”€â”€â”€ Reduced motion â”€â”€â”€ */
@media (prefers-reduced-motion: reduce) {
  .lp-floater { animation: none; }
  .lp-cta { transition: none; }
  .lp-rotator { transition: none; }
  .lp-headline-line,
  .lp-headline-accent,
  .lp-rotator,
  .lp-sub,
  .lp-cta,
  .lp-features {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   EXTRA BACKGROUND MOTION
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* â”€â”€â”€ Sun â€” very soft â”€â”€â”€ */
.lp-sun {
  position: absolute;
  top: 6%;
  right: 6%;
  width: 140px;
  height: 140px;
  pointer-events: none;
  opacity: 0.42;
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

/* â”€â”€â”€ Clouds â€” subtle â”€â”€â”€ */
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
  animation: lpCloudDrift 48s linear infinite;
}
.lp-cloud-2 {
  top: 25%;
  left: -30%;
  width: 180px;
  height: 75px;
  animation: lpCloudDrift 68s linear infinite;
  animation-delay: -22s;
  opacity: 0.28;
}
.lp-cloud-3 {
  top: 4%;
  left: -40%;
  width: 260px;
  height: 105px;
  animation: lpCloudDrift 82s linear infinite;
  animation-delay: -45s;
  opacity: 0.22;
}
@keyframes lpCloudDrift {
  0%   { transform: translateX(0); }
  100% { transform: translateX(140vw); }
}

/* â”€â”€â”€ Birds â€” subtle â”€â”€â”€ */
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
  animation: lpBirds1 36s linear infinite;
}
.lp-birds-2 {
  top: 35%;
  left: -15%;
  width: 70px;
  height: 24px;
  animation: lpBirds2 52s linear infinite;
  animation-delay: -14s;
  opacity: 0.22;
}
@keyframes lpBirds1 {
  0%   { transform: translateX(0) translateY(0); }
  25%  { transform: translateX(35vw) translateY(-30px); }
  50%  { transform: translateX(70vw) translateY(-15px); }
  75%  { transform: translateX(105vw) translateY(-40px); }
  100% { transform: translateX(140vw) translateY(-20px); }
}
@keyframes lpBirds2 {
  0%   { transform: translateX(0) translateY(0); }
  30%  { transform: translateX(40vw) translateY(-25px); }
  60%  { transform: translateX(80vw) translateY(-45px); }
  100% { transform: translateX(140vw) translateY(-10px); }
}

/* â”€â”€â”€ Swaying palm trees â”€â”€â”€ */
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

/* â”€â”€â”€ Twinkling sparkles â”€â”€â”€ */
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
.lp-sparkle.s1 { top: 14%; left: 22%;  animation: lpSparkle 3.2s ease-in-out infinite; }
.lp-sparkle.s2 { top: 28%; left: 62%;  animation: lpSparkle 4.1s ease-in-out infinite; animation-delay: 0.7s; }
.lp-sparkle.s3 { top: 8%;  left: 82%;  animation: lpSparkle 2.8s ease-in-out infinite; animation-delay: 1.4s; }
.lp-sparkle.s4 { top: 42%; left: 38%;  animation: lpSparkle 5s   ease-in-out infinite; animation-delay: 2.1s; }
.lp-sparkle.s5 { top: 55%; left: 78%;  animation: lpSparkle 3.6s ease-in-out infinite; animation-delay: 0.9s; }
.lp-sparkle.s6 { top: 22%; left: 8%;   animation: lpSparkle 4.5s ease-in-out infinite; animation-delay: 1.7s; }
@keyframes lpSparkle {
  0%, 100% { opacity: 0; transform: scale(0.4); }
  50%      { opacity: 1; transform: scale(1.3); }
}

/* â”€â”€â”€ Reduced motion for extra elements â”€â”€â”€ */
@media (prefers-reduced-motion: reduce) {
  .lp-sun-rays,
  .lp-sun-glow,
  .lp-sun-core,
  .lp-cloud,
  .lp-birds,
  .lp-palm,
  .lp-sparkle {
    animation: none !important;
  }
}

/* â”€â”€â”€ Mobile tweaks for extra elements â”€â”€â”€ */
@media (max-width: 640px) {
  .lp-sun {
    width: 90px;
    height: 90px;
    top: 4%;
    right: 4%;
  }
  .lp-cloud-1 { width: 150px; height: 60px; }
  .lp-cloud-2 { width: 120px; height: 50px; }
  .lp-cloud-3 { width: 180px; height: 72px; }
  .lp-birds-1 { width: 60px; height: 20px; }
  .lp-birds-2 { width: 50px; height: 17px; }
  .lp-sparkle { display: none; }
}
```

### FILE: frontend\src\pages\Landing.jsx
```
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Landing.css";

const ROTATE_WORDS = [
  "India",
  "Japan",
  "Bali",
  "America",
  "Canada",
  "Sri Lanka",
  "Nepal",
  "Saudi Arabia",
  "Thailand",
  "Dubai",
  "France",
  "Iceland",
];

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
    }, 1600);
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
      {/* â”€â”€â”€â”€â”€ Background scene â”€â”€â”€â”€â”€ */}
      <div className="lp-bg-scene" aria-hidden="true">

        {/* Sun with rotating rays */}
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
                <rect
                  key={i}
                  x="48.6"
                  y="2"
                  width="2.8"
                  height="12"
                  rx="1.4"
                  fill="#facc15"
                  opacity="0.7"
                  transform={`rotate(${(i * 360) / 12} 50 50)`}
                />
              ))}
            </g>
            <circle cx="50" cy="50" r="22" fill="url(#sunCore)" className="lp-sun-core" />
          </svg>
        </div>

        {/* Drifting clouds */}
        <div className="lp-cloud lp-cloud-1">
          <svg viewBox="0 0 120 50" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M20 42 C 6 42 2 32 10 26 C 8 16 18 10 28 14 C 34 4 50 2 60 12 C 70 4 86 6 92 18 C 104 14 116 22 114 34 C 118 42 108 46 96 44 L 20 42 Z"
              fill="#ffffff"
              opacity="0.55"
            />
          </svg>
        </div>
        <div className="lp-cloud lp-cloud-2">
          <svg viewBox="0 0 120 50" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M20 42 C 6 42 2 32 10 26 C 8 16 18 10 28 14 C 34 4 50 2 60 12 C 70 4 86 6 92 18 C 104 14 116 22 114 34 C 118 42 108 46 96 44 L 20 42 Z"
              fill="#ffffff"
              opacity="0.4"
            />
          </svg>
        </div>
        <div className="lp-cloud lp-cloud-3">
          <svg viewBox="0 0 120 50" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M20 42 C 6 42 2 32 10 26 C 8 16 18 10 28 14 C 34 4 50 2 60 12 C 70 4 86 6 92 18 C 104 14 116 22 114 34 C 118 42 108 46 96 44 L 20 42 Z"
              fill="#ffffff"
              opacity="0.35"
            />
          </svg>
        </div>

        {/* Bird flock 1 */}
        <div className="lp-birds lp-birds-1">
          <svg viewBox="0 0 60 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 10 Q 8 4 12 10 Q 16 4 20 10" stroke="#2f3a1f" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M28 6 Q 32 1 36 6 Q 40 1 44 6" stroke="#2f3a1f" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M36 15 Q 39 11 42 15 Q 45 11 48 15" stroke="#2f3a1f" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </svg>
        </div>

        {/* Bird flock 2 */}
        <div className="lp-birds lp-birds-2">
          <svg viewBox="0 0 60 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 12 Q 10 6 14 12 Q 18 6 22 12" stroke="#2f3a1f" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M34 4 Q 37 0 40 4 Q 43 0 46 4" stroke="#2f3a1f" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </svg>
        </div>

        {/* Landscape */}
        <svg
          className="lp-landscape"
          viewBox="0 0 1440 620"
          preserveAspectRatio="xMidYMax slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="lpHillFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dbe8a2" stopOpacity=".75" />
              <stop offset="100%" stopColor="#dbe8a2" stopOpacity=".28" />
            </linearGradient>
            <linearGradient id="lpHillNear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cfe08c" stopOpacity=".68" />
              <stop offset="100%" stopColor="#cfe08c" stopOpacity=".22" />
            </linearGradient>
            <linearGradient id="lpPathG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eef5cf" stopOpacity=".9" />
              <stop offset="100%" stopColor="#eef5cf" stopOpacity=".35" />
            </linearGradient>
          </defs>

          <path
            d="M0 430 Q 180 310 360 385 T 720 355 T 1080 395 T 1440 345 L1440 620 L0 620 Z"
            fill="url(#lpHillFar)"
          />

          <path
            d="M700 620 C 660 540, 765 500, 722 440 C 692 390, 762 360, 730 318"
            fill="none"
            stroke="url(#lpPathG)"
            strokeWidth="44"
            strokeLinecap="round"
            opacity=".55"
          />

          <path
            d="M0 505 Q 220 405 440 472 T 880 452 T 1440 482 L1440 620 L0 620 Z"
            fill="url(#lpHillNear)"
          />

          {/* Palm tree 1 (swaying) */}
          <g className="lp-palm lp-palm-1" opacity=".5" fill="#adc766">
            <path d="M100 575 C 108 500, 135 435, 168 382 L 180 375 C 150 435, 128 500, 135 575 Z" />
            <path d="M174 378 C 160 340, 135 315, 100 305 C 130 325, 155 355, 172 385 Z" />
            <path d="M174 378 C 178 335, 185 305, 198 275 C 190 310, 182 345, 178 380 Z" />
            <path d="M174 378 C 200 345, 232 325, 268 320 C 235 340, 200 360, 178 382 Z" />
            <path d="M174 378 C 215 380, 258 395, 295 425 C 255 405, 212 388, 176 383 Z" />
            <path d="M174 378 C 200 405, 225 440, 240 485 C 220 445, 198 408, 176 383 Z" />
            <path d="M174 378 C 148 408, 122 445, 105 490 C 125 450, 150 412, 172 383 Z" />
            <path d="M174 378 C 135 385, 95 400, 60 425 C 98 408, 140 393, 172 383 Z" />
            <circle cx="172" cy="385" r="5" />
            <circle cx="180" cy="382" r="4.5" />
            <circle cx="176" cy="391" r="4" />
          </g>

          {/* Palm tree 2 (swaying, opposite phase) */}
          <g className="lp-palm lp-palm-2" opacity=".5" fill="#adc766">
            <path d="M1275 575 C 1280 510, 1288 450, 1290 405 L 1305 400 C 1305 450, 1302 510, 1308 575 Z" />
            <path d="M1297 402 C 1270 375, 1240 360, 1205 358 C 1235 370, 1265 385, 1295 405 Z" />
            <path d="M1297 402 C 1290 365, 1285 335, 1290 305 C 1300 340, 1302 370, 1300 405 Z" />
            <path d="M1297 402 C 1325 375, 1355 360, 1390 358 C 1360 370, 1330 385, 1300 405 Z" />
            <path d="M1297 402 C 1335 400, 1375 408, 1410 430 C 1370 418, 1332 408, 1300 405 Z" />
            <path d="M1297 402 C 1258 400, 1220 408, 1185 430 C 1225 418, 1262 408, 1294 405 Z" />
            <path d="M1297 402 C 1325 425, 1345 455, 1355 490 C 1338 458, 1318 430, 1300 405 Z" />
            <path d="M1297 402 C 1270 425, 1250 455, 1240 490 C 1258 458, 1278 430, 1295 405 Z" />
          </g>

          <g opacity=".38" fill="#c6d98b">
            <ellipse cx="360" cy="562" rx="72" ry="30" />
            <ellipse cx="1080" cy="576" rx="92" ry="34" />
            <ellipse cx="620" cy="592" rx="60" ry="24" />
          </g>
        </svg>

        {/* Floating paper planes / pins / leaves */}
        <span className="lp-floater p1">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </span>
        <span className="lp-floater p2">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
          </svg>
        </span>
        <span className="lp-floater p3">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </span>
        <span className="lp-floater p4">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
          </svg>
        </span>
        <span className="lp-floater p5">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </span>
        <span className="lp-floater p6">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 3C9 3 4 8 4 16c0 1.5.3 3 .8 4.2l1.6-.7C6.1 18.5 6 17.3 6 16c0-6 4-10 11-10h2V3h-2z" />
            <path d="M20 3v2c0 8-5 13-13 13H5l1 2h1c9 0 15-6 15-15V3h-2z" opacity=".5" />
          </svg>
        </span>

        {/* Twinkling sparkles */}
        <span className="lp-sparkle s1" />
        <span className="lp-sparkle s2" />
        <span className="lp-sparkle s3" />
        <span className="lp-sparkle s4" />
        <span className="lp-sparkle s5" />
        <span className="lp-sparkle s6" />
      </div>

      {/* â”€â”€â”€â”€â”€ Topbar â”€â”€â”€â”€â”€ */}
      <header className="lp-topbar">
        <div className="lp-topbar-inner">
          <Link to="/" className="lp-brand" aria-label="AI travel planner home">
            <span className="lp-brand-name">
              AI Travel <span className="lp-brand-accent">Planner</span>
            </span>
          </Link>

          <nav className="lp-mainnav" aria-label="Primary">
            <Link to="/" className="lp-active">Home</Link>
            <Link to="/trips/new">Destinations</Link>
            <Link to="/weather">Weather</Link>
            <Link to="/trips">My Trips</Link>
          </nav>

          <div className="lp-user">
            {user ? (
              <>
                <Link to="/profile" className="lp-avatar" title={user.name} aria-hidden="true">
                  {initials}
                </Link>
                <button className="lp-btn-logout" type="button" onClick={handleLogout}>
                  Logout
                </button>
                <button className="lp-btn-more" type="button" aria-label="More options">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="12" cy="19" r="1.8" />
                  </svg>
                </button>
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

      {/* â”€â”€â”€â”€â”€ Main â”€â”€â”€â”€â”€ */}
      <main className="lp-main">
        <h1 className="lp-headline">
          <span className="lp-headline-line">Your next trip to</span>
          <span className="lp-headline-rotate">
            <span className={`lp-rotator${wordOut ? " out" : ""}`}>
              {ROTATE_WORDS[wordIndex]}
            </span>
          </span>
          <span className="lp-headline-line lp-headline-accent">
            planned in seconds.
          </span>
        </h1>

        <p className="lp-sub">
          Stop endlessly searching. Let AI craft your perfect itinerary so you
          can explore more and stress less.
        </p>

        <button className="lp-cta" type="button" onClick={handlePlanTrip}>
          Plan a New Trip
        </button>

        <ul className="lp-features">
          <li>
            <span className="lp-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="#12200a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            Tailored to Your Vibe
          </li>
          <li>
            <span className="lp-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="#12200a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            Zero Planning Burnout
          </li>
          <li>
            <span className="lp-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="#12200a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            Endless New Discoveries
          </li>
        </ul>
      </main>

      {/* â”€â”€â”€â”€â”€ Footer â”€â”€â”€â”€â”€ */}
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
                <li><span>Gemini Â· Groq</span></li>
                <li><span>Pexels</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <p>Â© {new Date().getFullYear()} AI Travel Planner. All rights reserved.</p>
          <p>Made with â¤ï¸ for travelers</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
```

### FILE: frontend\src\pages\Login.css
```
/* frontend/src/pages/Login.css */

.lg-root {
  --lg-bg: #050505;
  --lg-card: rgba(17, 17, 17, 0.9);
  --lg-muted: #888888;
  --lg-dim: #52525b;
  --lg-lime: #a3e635;
  --lg-lime-bright: #bef264;
  --lg-lime-glow: rgba(163, 230, 53, 0.4);
  --lg-lime-subtle: rgba(163, 230, 53, 0.12);
  background: var(--lg-bg);
  color: #fff;
  min-height: 100vh;
  font-family: 'Poppins', system-ui, sans-serif;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

/* â”€â”€â”€ Glow orbs â”€â”€â”€ */
.lg-orb-1, .lg-orb-2, .lg-orb-3 {
  position: fixed;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.lg-orb-1 {
  top: -140px; left: 10%;
  width: 520px; height: 520px;
  background: radial-gradient(circle, var(--lg-lime-glow) 0%, rgba(163,230,53,0.05) 50%, transparent 75%);
  animation: lgFloat 11s ease-in-out infinite alternate;
}
.lg-orb-2 {
  bottom: -160px; right: 8%;
  width: 480px; height: 480px;
  background: radial-gradient(circle, rgba(163,230,53,0.22) 0%, transparent 70%);
  animation: lgFloat 14s ease-in-out infinite alternate-reverse;
}
.lg-orb-3 {
  top: 40%; left: 45%;
  width: 380px; height: 380px;
  background: radial-gradient(circle, rgba(163,230,53,0.12) 0%, transparent 70%);
  animation: lgFloat 17s ease-in-out infinite alternate;
}
@keyframes lgFloat {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(50px, 40px) scale(1.2); }
}

/* â”€â”€â”€ Grid background â”€â”€â”€ */
.lg-grid-bg {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(163, 230, 53, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(163, 230, 53, 0.04) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(circle at center, black 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(circle at center, black 30%, transparent 75%);
}

/* â”€â”€â”€ Card â”€â”€â”€ */
.lg-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 440px;
  background: var(--lg-card);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px;
  padding: 44px 40px 40px;
  box-shadow:
    0 30px 80px -30px rgba(0, 0, 0, 0.9),
    0 0 40px -12px rgba(163, 230, 53, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  animation: lgCardIn 0.55s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes lgCardIn {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* â”€â”€â”€ Brand â”€â”€â”€ */
.lg-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;
}
.lg-brand-text {
  font-size: 1.15rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #fff;
}
.lg-brand-text .lg-brand-accent {
  color: var(--lg-lime);
}

/* â”€â”€â”€ Titles â”€â”€â”€ */
.lg-title {
  font-size: 2rem;
  font-weight: 900;
  text-align: center;
  letter-spacing: -0.03em;
  color: #fff;
  line-height: 1.1;
  margin-bottom: 10px;
}
.lg-title span {
  color: var(--lg-lime);
  text-shadow: 0 0 30px var(--lg-lime-glow);
}
.lg-subtitle {
  text-align: center;
  font-size: 0.9rem;
  color: var(--lg-muted);
  margin-bottom: 32px;
  line-height: 1.5;
}

/* â”€â”€â”€ Error â”€â”€â”€ */
.lg-error {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fecaca;
  padding: 12px 16px;
  border-radius: 14px;
  margin-bottom: 20px;
  font-size: 0.85rem;
  text-align: center;
}

/* â”€â”€â”€ Form â”€â”€â”€ */
.lg-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lg-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lg-label {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--lg-dim);
  padding-left: 4px;
}

.lg-input {
  width: 100%;
  background: #000;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 14px 16px;
  color: #fff;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  color-scheme: dark;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.lg-input::placeholder { color: var(--lg-dim); font-weight: 500; }
.lg-input:focus {
  outline: none;
  border-color: var(--lg-lime);
  box-shadow: 0 0 0 3px rgba(163, 230, 53, 0.15);
}

/* Password toggle */
.lg-pw-toggle {
  align-self: flex-end;
  margin-top: -4px;
  background: transparent;
  border: none;
  color: var(--lg-dim);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 6px;
  transition: color 0.2s;
}
.lg-pw-toggle:hover { color: var(--lg-lime); }

/* â”€â”€â”€ Submit â”€â”€â”€ */
.lg-submit {
  margin-top: 8px;
  background: linear-gradient(135deg, var(--lg-lime), var(--lg-lime-bright));
  color: #000;
  border: none;
  padding: 15px 24px;
  border-radius: 14px;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: 0 10px 30px -8px rgba(163, 230, 53, 0.55);
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.lg-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 14px 36px -8px rgba(163, 230, 53, 0.75);
}
.lg-submit:active:not(:disabled) {
  transform: translateY(0);
}
.lg-submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.lg-spinner {
  width: 14px; height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(0,0,0,0.25);
  border-top-color: #000;
  animation: lgSpin 0.7s linear infinite;
}
@keyframes lgSpin { to { transform: rotate(360deg); } }

/* â”€â”€â”€ Footer â”€â”€â”€ */
.lg-footer {
  text-align: center;
  font-size: 0.86rem;
  color: var(--lg-muted);
  margin-top: 28px;
}
.lg-footer a {
  color: var(--lg-lime);
  font-weight: 800;
  text-decoration: none;
  transition: color 0.2s, text-shadow 0.2s;
}
.lg-footer a:hover {
  color: var(--lg-lime-bright);
  text-shadow: 0 0 12px var(--lg-lime-glow);
}

/* â”€â”€â”€ Divider â”€â”€â”€ */
.lg-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0 8px;
  color: var(--lg-dim);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
.lg-divider::before,
.lg-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

/* â”€â”€â”€ Motion preferences â”€â”€â”€ */
@media (prefers-reduced-motion: reduce) {
  .lg-orb-1, .lg-orb-2, .lg-orb-3, .lg-spinner { animation: none !important; }
  .lg-card { animation: none !important; }
}

/* â”€â”€â”€ Small screens â”€â”€â”€ */
@media (max-width: 480px) {
  .lg-card { padding: 36px 24px 28px; border-radius: 22px; }
  .lg-title { font-size: 1.65rem; }
  .lg-brand-text { font-size: 1rem; }
}
```

### FILE: frontend\src\pages\Login.jsx
```
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg-root">
      <div className="lg-orb-1" />
      <div className="lg-orb-2" />
      <div className="lg-orb-3" />
      <div className="lg-grid-bg" />

      <div className="lg-card">
        {/* Brand */}
        <div className="lg-brand">
          <div className="lg-brand-text">
            AI Travel <span className="lg-brand-accent">Planner</span>
          </div>
        </div>

        <h1 className="lg-title">
          Sign <span>in</span>
        </h1>
        <p className="lg-subtitle">Continue planning your next adventure</p>

        {error && <p className="lg-error">{error}</p>}

        <form onSubmit={handleSubmit} className="lg-form">
          {/* Email */}
          <div className="lg-field">
            <label className="lg-label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              className="lg-input"
              required
            />
          </div>

          {/* Password */}
          <div className="lg-field">
            <label className="lg-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              className="lg-input"
              required
            />
            <button
              type="button"
              className="lg-pw-toggle"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button type="submit" disabled={loading} className="lg-submit">
            {loading ? (
              <>
                <span className="lg-spinner" />
                Signing inâ€¦
              </>
            ) : (
              <>Sign In â†’</>
            )}
          </button>
        </form>

        <div className="lg-divider">or</div>

        <p className="lg-footer">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
```

### FILE: frontend\src\pages\NotFound.jsx
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
            <span className="dot"></span> Error 404 Â· Castaway Status
          </span>
        </div>

        <h1 className="notfound-title">
          Mayday! You've Washed Up on{" "}
          <span className="accent">Page 404</span>
        </h1>

        <p className="notfound-subtext">
          No resorts, no Wi-Fi, and definitely no breakfast buffet here. Don't
          panic â€” our rescue boat is ready to take you back to safety.
        </p>

        <div className="notfound-ai-box">
          <div className="notfound-ai-icon" aria-hidden="true">
            ðŸŒ´
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
            {copied ? "Copied âœ“" : "Copy prompt"}
          </button>
        </div>

        <div className="notfound-actions">
          <Link to="/" className="notfound-btn notfound-btn-primary">
            ðŸ›Ÿ Rescue Me Home
          </Link>
          <Link to="/trips/new" className="notfound-btn notfound-btn-ghost">
            ðŸï¸ Plan a Real Trip
          </Link>
        </div>

        <p className="notfound-footnote">
          Last known coordinates: <code>/404</code> Â· No coconuts were harmed in
          the making of this page.
        </p>
      </main>
    </div>
  );
};

export default NotFound;
```

### FILE: frontend\src\pages\Profile.jsx
```
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

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
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d]">
        <div className="w-8 h-8 border-4 border-lime border-t-transparent rounded-full animate-spin" />
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

  const inputClass =
    "w-full rounded-xl px-4 py-3 transition " +
    "bg-[#1a1a1a] text-white placeholder-gray-500 " +
    "border border-white/10 " +
    "focus:outline-none focus:border-lime " +
    "focus:ring-2 focus:ring-lime/30";

  return (
    <div className="min-h-screen bg-[#0d0d0d] py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* HEADER CARD */}
        <div className="bg-[#141414] border border-white/10 rounded-3xl p-8 animate-fade-in-up">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* AVATAR */}
            <div className="w-24 h-24 rounded-full bg-lime flex items-center justify-center text-forest font-extrabold text-3xl flex-shrink-0 shadow-[0_0_30px_-5px_rgba(168,216,74,0.6)]">
              {initials}
            </div>

            {/* INFO */}
            <div className="flex-1 text-center md:text-left">
              {!editingName ? (
                <>
                  <div className="flex items-center gap-3 justify-center md:justify-start">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                      {profile.name}
                    </h1>
                    <button
                      onClick={() => {
                        setEditingName(true);
                        setNewName(profile.name);
                        setNameError("");
                        setNameSuccess("");
                      }}
                      className="text-xs text-gray-400 hover:text-lime border border-white/10 rounded-full px-3 py-1 transition"
                      title="Edit name"
                    >
                      âœï¸ Edit
                    </button>
                  </div>
                  <p className="text-gray-400 mt-2">{profile.email}</p>
                  <p className="text-xs text-gray-500 mt-3">
                    Joined {formatDate(profile.createdAt)}
                  </p>
                </>
              ) : (
                <form onSubmit={handleSaveName} className="space-y-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className={inputClass}
                    placeholder="Your name"
                    autoFocus
                  />
                  {nameError && (
                    <p className="text-red-400 text-sm">{nameError}</p>
                  )}
                  {nameSuccess && (
                    <p className="text-lime text-sm">{nameSuccess}</p>
                  )}
                  <div className="flex gap-2 justify-center md:justify-start">
                    <button
                      type="submit"
                      disabled={savingName}
                      className="px-4 py-2 rounded-lg bg-lime text-forest text-sm font-bold hover:bg-lime-dark disabled:opacity-60 btn-press transition"
                    >
                      {savingName ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      className="px-4 py-2 rounded-lg border border-white/10 text-gray-300 text-sm font-semibold hover:bg-white/5 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 animate-fade-in-up delay-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">
              Trips Planned
            </p>
            <p className="text-3xl font-extrabold text-white mt-2">
              {stats.trips}
            </p>
          </div>
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 animate-fade-in-up delay-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">
              Total Budget
            </p>
            <p className="text-3xl font-extrabold text-lime mt-2">
              â‚¹{stats.totalBudget.toLocaleString()}
            </p>
          </div>
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 animate-fade-in-up delay-300">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">
              Avg Budget / Trip
            </p>
            <p className="text-3xl font-extrabold text-white mt-2">
              â‚¹{stats.avgBudget.toLocaleString()}
            </p>
          </div>
        </div>

        {/* CHANGE PASSWORD */}
        <div className="bg-[#141414] border border-white/10 rounded-3xl p-8 mt-6 animate-fade-in-up delay-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-white">
                ðŸ”’ Change Password
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Update your account password
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="text-xs text-gray-400 hover:text-lime transition"
            >
              {showPasswords ? "Hide" : "Show"} passwords
            </button>
          </div>

          {pwdError && (
            <p className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl mb-4 text-sm">
              {pwdError}
            </p>
          )}
          {pwdSuccess && (
            <p className="bg-lime/10 border border-lime/30 text-lime p-3 rounded-xl mb-4 text-sm">
              {pwdSuccess}
            </p>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Current password
              </label>
              <input
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
                placeholder="Enter current password"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  New password
                </label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Confirm new password
                </label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-6 py-3 rounded-lg bg-lime text-forest font-bold hover:bg-lime-dark disabled:opacity-60 btn-press transition"
              >
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>

        {/* LOGOUT */}
        <div className="bg-[#141414] border border-white/10 rounded-3xl p-6 mt-6 flex flex-wrap justify-between items-center gap-4 animate-fade-in-up delay-300">
          <div>
            <h3 className="font-bold text-white">Sign out of this device</h3>
            <p className="text-sm text-gray-400 mt-1">
              You'll need to log in again to access your trips.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 rounded-full border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
```

### FILE: frontend\src\pages\Register.css
```
/* frontend/src/pages/Register.css */

.rg-root {
  --rg-bg: #050505;
  --rg-card: rgba(17, 17, 17, 0.9);
  --rg-muted: #888888;
  --rg-dim: #52525b;
  --rg-lime: #a3e635;
  --rg-lime-bright: #bef264;
  --rg-lime-glow: rgba(163, 230, 53, 0.4);
  --rg-lime-subtle: rgba(163, 230, 53, 0.12);
  background: var(--rg-bg);
  color: #fff;
  min-height: 100vh;
  font-family: 'Poppins', system-ui, sans-serif;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.rg-orb-1, .rg-orb-2, .rg-orb-3 {
  position: fixed;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.rg-orb-1 {
  top: -140px; left: 10%;
  width: 520px; height: 520px;
  background: radial-gradient(circle, var(--rg-lime-glow) 0%, rgba(163,230,53,0.05) 50%, transparent 75%);
  animation: rgFloat 11s ease-in-out infinite alternate;
}
.rg-orb-2 {
  bottom: -160px; right: 8%;
  width: 480px; height: 480px;
  background: radial-gradient(circle, rgba(163,230,53,0.22) 0%, transparent 70%);
  animation: rgFloat 14s ease-in-out infinite alternate-reverse;
}
.rg-orb-3 {
  top: 40%; left: 45%;
  width: 380px; height: 380px;
  background: radial-gradient(circle, rgba(163,230,53,0.12) 0%, transparent 70%);
  animation: rgFloat 17s ease-in-out infinite alternate;
}
@keyframes rgFloat {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(50px, 40px) scale(1.2); }
}

.rg-grid-bg {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(163, 230, 53, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(163, 230, 53, 0.04) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(circle at center, black 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(circle at center, black 30%, transparent 75%);
}

.rg-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 440px;
  background: var(--rg-card);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px;
  padding: 44px 40px 40px;
  box-shadow:
    0 30px 80px -30px rgba(0, 0, 0, 0.9),
    0 0 40px -12px rgba(163, 230, 53, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  animation: rgCardIn 0.55s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes rgCardIn {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* â”€â”€â”€ Brand â”€â”€â”€ */
.rg-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;
}
.rg-brand-text {
  font-size: 1.15rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #fff;
}
.rg-brand-text .rg-brand-accent {
  color: var(--rg-lime);
}

/* â”€â”€â”€ Titles â”€â”€â”€ */
.rg-title {
  font-size: 2rem;
  font-weight: 900;
  text-align: center;
  letter-spacing: -0.03em;
  color: #fff;
  line-height: 1.1;
  margin-bottom: 10px;
}
.rg-title span {
  color: var(--rg-lime);
  text-shadow: 0 0 30px var(--rg-lime-glow);
}
.rg-subtitle {
  text-align: center;
  font-size: 0.9rem;
  color: var(--rg-muted);
  margin-bottom: 32px;
  line-height: 1.5;
}

.rg-error {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fecaca;
  padding: 12px 16px;
  border-radius: 14px;
  margin-bottom: 20px;
  font-size: 0.85rem;
  text-align: center;
}

/* â”€â”€â”€ Form â”€â”€â”€ */
.rg-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rg-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rg-label {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--rg-dim);
  padding-left: 4px;
}

.rg-input {
  width: 100%;
  background: #000;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 14px 16px;
  color: #fff;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  color-scheme: dark;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.rg-input::placeholder { color: var(--rg-dim); font-weight: 500; }
.rg-input:focus {
  outline: none;
  border-color: var(--rg-lime);
  box-shadow: 0 0 0 3px rgba(163, 230, 53, 0.15);
}

.rg-pw-toggle {
  align-self: flex-end;
  margin-top: -4px;
  background: transparent;
  border: none;
  color: var(--rg-dim);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 6px;
  transition: color 0.2s;
}
.rg-pw-toggle:hover { color: var(--rg-lime); }

/* â”€â”€â”€ Submit â”€â”€â”€ */
.rg-submit {
  margin-top: 8px;
  background: linear-gradient(135deg, var(--rg-lime), var(--rg-lime-bright));
  color: #000;
  border: none;
  padding: 15px 24px;
  border-radius: 14px;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: 0 10px 30px -8px rgba(163, 230, 53, 0.55);
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.rg-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 14px 36px -8px rgba(163, 230, 53, 0.75);
}
.rg-submit:active:not(:disabled) {
  transform: translateY(0);
}
.rg-submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.rg-spinner {
  width: 14px; height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(0,0,0,0.25);
  border-top-color: #000;
  animation: rgSpin 0.7s linear infinite;
}
@keyframes rgSpin { to { transform: rotate(360deg); } }

/* â”€â”€â”€ Footer â”€â”€â”€ */
.rg-footer {
  text-align: center;
  font-size: 0.86rem;
  color: var(--rg-muted);
  margin-top: 24px;
}
.rg-footer a {
  color: var(--rg-lime);
  font-weight: 800;
  text-decoration: none;
  transition: color 0.2s, text-shadow 0.2s;
}
.rg-footer a:hover {
  color: var(--rg-lime-bright);
  text-shadow: 0 0 12px var(--rg-lime-glow);
}

.rg-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0 8px;
  color: var(--rg-dim);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
.rg-divider::before,
.rg-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

@media (prefers-reduced-motion: reduce) {
  .rg-orb-1, .rg-orb-2, .rg-orb-3, .rg-spinner { animation: none !important; }
  .rg-card { animation: none !important; }
}

@media (max-width: 480px) {
  .rg-card { padding: 36px 24px 28px; border-radius: 22px; }
  .rg-title { font-size: 1.65rem; }
  .rg-brand-text { font-size: 1rem; }
}
```

### FILE: frontend\src\pages\Register.jsx
```
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Register.css";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rg-root">
      <div className="rg-orb-1" />
      <div className="rg-orb-2" />
      <div className="rg-orb-3" />
      <div className="rg-grid-bg" />

      <div className="rg-card">
        {/* Brand */}
        <div className="rg-brand">
          <div className="rg-brand-text">
            AI Travel <span className="rg-brand-accent">Planner</span>
          </div>
        </div>

        <h1 className="rg-title">
          Create <span>account</span>
        </h1>
        <p className="rg-subtitle">Start planning your trips with AI</p>

        {error && <p className="rg-error">{error}</p>}

        <form onSubmit={handleSubmit} className="rg-form">
          {/* Name */}
          <div className="rg-field">
            <label className="rg-label" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              value={form.name}
              onChange={handleChange}
              className="rg-input"
              required
            />
          </div>

          {/* Email */}
          <div className="rg-field">
            <label className="rg-label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              className="rg-input"
              required
            />
          </div>

          {/* Password */}
          <div className="rg-field">
            <label className="rg-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={handleChange}
              className="rg-input"
              minLength={6}
              required
            />
            <button
              type="button"
              className="rg-pw-toggle"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button type="submit" disabled={loading} className="rg-submit">
            {loading ? (
              <>
                <span className="rg-spinner" />
                Creating accountâ€¦
              </>
            ) : (
              <>Create Account â†’</>
            )}
          </button>
        </form>

        <div className="rg-divider">or</div>

        <p className="rg-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
```

### FILE: frontend\src\pages\SharedTrip.jsx
```
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/Skeleton";
import TripMap from "../components/TripMap";

const Pill = ({ icon, children }) => (
  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-ink">
    <span className="w-5 h-5 rounded-full bg-lime flex items-center justify-center text-xs">
      {icon}
    </span>
    {children}
  </span>
);

const SharedTripSkeleton = () => (
  <div className="min-h-screen bg-white pb-20">
    <div className="max-w-6xl mx-auto px-6 pt-8">
      <Skeleton variant="rectangular" width={280} height={40} rounded="9999px" />
      <div style={{ marginTop: 16 }}>
        <Skeleton
          variant="rectangular"
          width="100%"
          style={{ aspectRatio: "21 / 9" }}
          rounded="24px"
        />
      </div>
      <div style={{ marginTop: 32 }}>
        <Skeleton variant="rectangular" width="55%" height={48} rounded="12px" />
      </div>
      <div className="flex flex-wrap gap-3 mt-5">
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

  // Fire-and-forget image + weather fetch (won't fail the page)
  useEffect(() => {
    if (!trip) return;
    const dest = trip.destination;

    // Destination cover image from Pexels via public fallback
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

    // Weather via Nominatim + Open-Meteo
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
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-6xl mb-4">ðŸ”</p>
          <h1 className="text-2xl font-extrabold text-ink mb-2">
            Trip not found
          </h1>
          <p className="text-gray-500 mb-8">{error}</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 rounded-full bg-lime text-forest font-bold hover:bg-lime-dark transition"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }
  if (!trip) return null;

  const days = Math.max(
    1,
    Math.round(
      (new Date(trip.endDate) - new Date(trip.startDate)) /
        (1000 * 60 * 60 * 24)
    )
  );
  const budgetLabel =
    trip.budget < 20000 ? "Cheap" : trip.budget < 50000 ? "Moderate" : "Luxury";

  const heroImg =
    coverImage ||
    `https://picsum.photos/seed/${encodeURIComponent(trip.destination)}/1600/700`;

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-6xl mx-auto px-6 pt-8">
        {/* Top banner */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 bg-lime-light border border-lime/30 rounded-full px-4 py-2">
            <span className="text-lg">ðŸ”—</span>
            <span className="text-sm font-bold text-forest">
              Shared trip Â· by {trip.sharedBy}
            </span>
          </div>
          <Link
            to="/register"
            className="text-sm font-bold text-forest hover:text-lime-dark transition"
          >
            Plan your own trip â†’
          </Link>
        </div>

        {/* Hero */}
        <div className="rounded-3xl overflow-hidden aspect-[21/9] bg-gray-100">
          <img
            src={heroImg}
            alt={trip.destination}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = `https://picsum.photos/seed/${encodeURIComponent(
                trip.destination
              )}/1600/700`;
            }}
          />
        </div>

        <div className="mt-8">
          <h1 className="text-3xl md:text-5xl font-extrabold text-ink">
            {trip.destination}
          </h1>
        </div>

        <div className="flex flex-wrap gap-3 mt-5">
          <Pill icon="ðŸ“…">
            {days} Day{days > 1 ? "s" : ""}
          </Pill>
          <Pill icon="ðŸ’°">{budgetLabel} Budget</Pill>
          <Pill icon="ðŸ‘¥">{trip.travellers} Traveller
            {trip.travellers > 1 ? "s" : ""}</Pill>
        </div>

        {/* INTERESTS */}
        {trip.interests?.length > 0 && (
          <div className="mt-6">
            <p className="text-xs uppercase font-bold text-gray-500 mb-2 tracking-widest">
              Interests
            </p>
            <div className="flex flex-wrap gap-2">
              {trip.interests.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-gray-100 text-ink px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* HOTELS */}
        {trip.hotels?.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-extrabold text-ink mb-6">
              Hotel Recommendation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {trip.hotels.map((h, i) => {
                const imgUrl =
                  h.image ||
                  `https://picsum.photos/seed/${encodeURIComponent(
                    h.name
                  )}/400/300`;
                return (
                  <div key={i}>
                    <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100">
                      <img
                        src={imgUrl}
                        alt={h.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="mt-3 font-bold text-ink text-sm leading-tight">
                      {h.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-2">ðŸ“ {h.address}</p>
                    <p className="text-sm font-bold text-ink mt-2">
                      ðŸ’° {h.price}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      â­ {h.rating} stars
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ITINERARY */}
        {trip.itinerary?.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-extrabold text-ink mb-8">
              Day-by-Day Itinerary
            </h2>
            {trip.itinerary.map((day) => (
              <div key={day.day} className="mb-10">
                <h3 className="text-xl font-extrabold text-ink mb-5">
                  Day {day.day}{" "}
                  <span className="text-sm text-gray-400 font-normal">
                    {day.date}
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {day.activities.map((act, idx) => {
                    const imgUrl =
                      act.image ||
                      `https://picsum.photos/seed/${encodeURIComponent(
                        act.title
                      )}/200/200`;
                    return (
                      <div key={idx} className="flex flex-col">
                        <p className="text-red-600 text-sm font-bold mb-2">
                          {act.time}
                        </p>
                        <div className="flex gap-4 p-4 border border-gray-100 rounded-2xl bg-white">
                          <img
                            src={imgUrl}
                            alt={act.title}
                            className="w-24 h-24 md:w-28 md:h-28 rounded-xl object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-ink text-base leading-tight">
                              {act.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                              {act.description}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              ðŸ“ {act.location}
                            </p>
                            <p className="text-xs font-bold text-ink mt-1">
                              â‚¹ {act.cost} per person
                            </p>
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

        {/* BUDGET BREAKDOWN */}
        {trip.budgetBreakdown?.total > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-extrabold text-ink mb-6">
              Budget Breakdown
            </h2>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md">
              {[
                { label: "âœˆï¸ Flights", value: trip.budgetBreakdown.flights },
                { label: "ðŸ¨ Hotels", value: trip.budgetBreakdown.hotels },
                { label: "ðŸ½ Food", value: trip.budgetBreakdown.food },
                { label: "ðŸŽŸ Activities", value: trip.budgetBreakdown.activities },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between py-2 border-b border-gray-100 last:border-b-0"
                >
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-bold text-ink">
                    â‚¹{item.value}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-3 mt-2 border-t-2 border-ink">
                <span className="font-extrabold text-ink">Total</span>
                <span className="font-extrabold text-ink">
                  â‚¹{trip.budgetBreakdown.total}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* MAP */}
        {weather?.location && (
          <section className="mt-16">
            <h2 className="text-2xl font-extrabold text-ink mb-6">
              Destination Map
            </h2>
            <div className="flex flex-wrap gap-3 mb-5">
              <Pill icon="ðŸŒ¤ï¸">
                {Math.round(weather.current?.temperature_2m ?? 0)}Â°C
              </Pill>
              <Pill icon="ðŸ’¨">
                {weather.current?.wind_speed_10m ?? 0} km/h wind
              </Pill>
            </div>
            <TripMap
              lat={weather.location.lat}
              lng={weather.location.lng}
              label={trip.destination}
            />
          </section>
        )}

        {/* CTA */}
        <div className="mt-16 bg-lime-light border-2 border-lime rounded-3xl p-8 text-center">
          <h3 className="text-2xl font-extrabold text-ink mb-2">
            Loved this itinerary?
          </h3>
          <p className="text-gray-600 mb-6">
            Create your own AI-powered trip in under a minute.
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-3.5 rounded-full bg-lime text-forest font-bold hover:bg-lime-dark transition shadow-[0_6px_20px_-8px_rgba(168,216,74,0.8)]"
          >
            âœ¨ Plan Your Own Trip
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SharedTrip;
```

### FILE: frontend\src\pages\TripComparison.css
```
/* frontend/src/pages/TripComparison.css */

.cmp-root {
  --cmp-bg: #050505;
  --cmp-card: #111111;
  --cmp-card-hover: #181818;
  --cmp-border: rgba(255, 255, 255, 0.1);
  --cmp-muted: #888888;
  --cmp-dim: #52525b;
  --cmp-lime: #a3e635;
  --cmp-lime-bright: #bef264;
  --cmp-lime-glow: rgba(163, 230, 53, 0.4);
  --cmp-lime-subtle: rgba(163, 230, 53, 0.12);

  position: relative;
  background: var(--cmp-bg);
  color: #fff;
  min-height: 100vh;
  font-family: 'Poppins', system-ui, sans-serif;
  overflow-x: hidden;
}

.cmp-orb-1, .cmp-orb-2 {
  position: fixed;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.cmp-orb-1 {
  top: -120px; left: 8%;
  width: 500px; height: 500px;
  background: radial-gradient(circle, var(--cmp-lime-glow) 0%, rgba(163,230,53,0.05) 50%, transparent 75%);
  animation: cmpFloat 10s ease-in-out infinite alternate;
}
.cmp-orb-2 {
  bottom: -120px; right: 8%;
  width: 450px; height: 450px;
  background: radial-gradient(circle, rgba(96,165,250,0.18) 0%, transparent 70%);
  animation: cmpFloat 13s ease-in-out infinite alternate-reverse;
}
@keyframes cmpFloat {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(40px, 40px) scale(1.15); }
}

.cmp-page {
  position: relative;
  z-index: 10;
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

.cmp-header {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 36px;
}
.cmp-tag {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 0.7rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--cmp-lime);
  background: var(--cmp-lime-subtle);
  border: 1px solid rgba(163, 230, 53, 0.3);
  padding: 5px 12px; border-radius: 9999px;
  width: fit-content;
}
.cmp-pulse {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--cmp-lime);
  box-shadow: 0 0 10px var(--cmp-lime);
  animation: cmpPulse 1.5s infinite;
}
@keyframes cmpPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.4; transform: scale(0.8); }
}
.cmp-title {
  font-size: clamp(1.9rem, 4.2vw, 3rem);
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.035em;
  color: #fff;
  margin: 0;
}
.cmp-title span {
  color: var(--cmp-lime);
  text-shadow: 0 0 30px var(--cmp-lime-glow);
}
.cmp-subtitle {
  font-size: 0.95rem;
  color: var(--cmp-muted);
  max-width: 640px;
  line-height: 1.6;
  margin: 0;
}

/* â”€â”€â”€ Selection bar â”€â”€â”€ */
.cmp-select {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 14px;
  align-items: end;
  margin-bottom: 32px;
  padding: 20px;
  background: var(--cmp-card);
  border: 1px solid var(--cmp-border);
  border-radius: 20px;
}
@media (max-width: 640px) {
  .cmp-select {
    grid-template-columns: 1fr;
  }
}

.cmp-select-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cmp-select-label {
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--cmp-dim);
}
.cmp-select-input {
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
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.cmp-select-input:focus {
  border-color: var(--cmp-lime);
  box-shadow: 0 0 0 3px rgba(163, 230, 53, 0.15);
}

.cmp-swap {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  border: 1px solid rgba(163, 230, 53, 0.35);
  background: var(--cmp-lime-subtle);
  color: var(--cmp-lime);
  font-size: 1.25rem;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.25s, background 0.2s, box-shadow 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: end;
}
.cmp-swap:hover {
  background: var(--cmp-lime);
  color: #000;
  transform: rotate(180deg);
  box-shadow: 0 0 20px var(--cmp-lime-glow);
}
@media (max-width: 640px) {
  .cmp-swap {
    width: 100%;
    align-self: stretch;
  }
}

/* â”€â”€â”€ Trip header cards â”€â”€â”€ */
.cmp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 20px;
}
@media (max-width: 640px) {
  .cmp-grid { grid-template-columns: 1fr; }
}

.cmp-card {
  background: var(--cmp-card);
  border: 1px solid var(--cmp-border);
  border-radius: 20px;
  padding: 20px;
  text-align: center;
  transition: border-color 0.25s, transform 0.25s;
}
.cmp-card:hover {
  border-color: rgba(163, 230, 53, 0.4);
  transform: translateY(-3px);
}
.cmp-card-thumb {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 14px;
  overflow: hidden;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}
.cmp-card-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.cmp-card-emoji {
  font-size: 3rem;
}
.cmp-card-name {
  font-size: 1.15rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
}
.cmp-card-link {
  color: var(--cmp-lime);
  font-size: 0.78rem;
  font-weight: 800;
  text-decoration: none;
  transition: color 0.2s;
}
.cmp-card-link:hover {
  color: var(--cmp-lime-bright);
}

/* â”€â”€â”€ Comparison table â”€â”€â”€ */
.cmp-table {
  background: var(--cmp-card);
  border: 1px solid var(--cmp-border);
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 24px;
}

.cmp-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 12px;
  padding: 16px 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
}
.cmp-row:last-child {
  border-bottom: none;
}
.cmp-row-head {
  background: rgba(163, 230, 53, 0.06);
  font-weight: 800;
  padding-top: 18px;
  padding-bottom: 18px;
}
.cmp-row-head .cmp-row-label,
.cmp-row-head .cmp-row-val {
  color: #fff;
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.cmp-row-label {
  color: var(--cmp-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.cmp-row-val {
  font-size: 0.9rem;
  font-weight: 700;
  color: #fff;
  padding: 6px 10px;
  border-radius: 10px;
  transition: background 0.25s;
}

.cmp-row-val.win {
  color: var(--cmp-lime);
  background: var(--cmp-lime-subtle);
  box-shadow: inset 0 0 0 1px rgba(163, 230, 53, 0.3);
}

@media (max-width: 640px) {
  .cmp-row {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 14px 18px;
  }
  .cmp-row-head {
    display: none;
  }
  .cmp-row-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .cmp-row-val {
    display: flex;
    justify-content: space-between;
  }
}

/* â”€â”€â”€ Summary â”€â”€â”€ */
.cmp-summary {
  text-align: center;
  padding: 18px;
  font-size: 0.82rem;
  color: var(--cmp-muted);
}

/* â”€â”€â”€ Empty state â”€â”€â”€ */
.cmp-empty {
  text-align: center;
  padding: 80px 20px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.01);
  margin-top: 40px;
}
.cmp-empty-icon {
  font-size: 3.5rem;
  margin-bottom: 16px;
  opacity: 0.6;
}
.cmp-empty-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 10px;
}
.cmp-empty-text {
  font-size: 0.88rem;
  color: var(--cmp-muted);
  max-width: 400px;
  margin: 0 auto 24px;
  line-height: 1.6;
}
.cmp-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, var(--cmp-lime), var(--cmp-lime-bright));
  color: #000;
  padding: 12px 24px;
  border-radius: 14px;
  font-size: 0.88rem;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 8px 22px -6px rgba(163, 230, 53, 0.55);
  transition: transform 0.2s, box-shadow 0.2s;
}
.cmp-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px -6px rgba(163, 230, 53, 0.75);
}

@media (prefers-reduced-motion: reduce) {
  .cmp-orb-1, .cmp-orb-2, .cmp-pulse { animation: none !important; }
}
```

### FILE: frontend\src\pages\TripComparison.jsx
```
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/Skeleton";
import "./TripComparison.css";

function daysBetween(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
}

function getStats(trip) {
  if (!trip) return null;
  const days = daysBetween(trip.startDate, trip.endDate);
  const activities = (trip.itinerary || []).reduce(
    (sum, day) => sum + (day.activities?.length || 0),
    0
  );
  const hotels = (trip.hotels || []).length;
  const travellers = trip.travellers || 1;
  const costPerDay = Math.round((trip.budget || 0) / days);
  const costPerPerson = Math.round((trip.budget || 0) / travellers);
  const costPerActivity =
    activities > 0 ? Math.round((trip.budget || 0) / activities) : 0;
  return {
    days,
    activities,
    hotels,
    travellers,
    costPerDay,
    costPerPerson,
    costPerActivity,
  };
}

const TripComparison = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tripAId, setTripAId] = useState("");
  const [tripBId, setTripBId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/trips");
        if (cancelled) return;
        const list = res.data || [];
        setTrips(list);
        if (list.length >= 1) setTripAId(list[0]._id);
        if (list.length >= 2) setTripBId(list[1]._id);
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

  const tripA = useMemo(
    () => trips.find((t) => t._id === tripAId) || null,
    [trips, tripAId]
  );
  const tripB = useMemo(
    () => trips.find((t) => t._id === tripBId) || null,
    [trips, tripBId]
  );

  const statsA = useMemo(() => getStats(tripA), [tripA]);
  const statsB = useMemo(() => getStats(tripB), [tripB]);

  const swap = () => {
    setTripAId(tripBId);
    setTripBId(tripAId);
  };

  if (loading) {
    return (
      <div className="cmp-root">
        <div className="cmp-orb-1" />
        <div className="cmp-orb-2" />
        <main className="cmp-page">
          <Skeleton variant="rectangular" width="100%" height={200} rounded="24px" />
          <div style={{ marginTop: 24 }}>
            <Skeleton variant="rectangular" width="100%" height={400} rounded="20px" />
          </div>
        </main>
      </div>
    );
  }

  if (trips.length < 2) {
    return (
      <div className="cmp-root">
        <div className="cmp-orb-1" />
        <div className="cmp-orb-2" />
        <main className="cmp-page">
          <div className="cmp-empty">
            <div className="cmp-empty-icon">âš–ï¸</div>
            <div className="cmp-empty-title">Not enough trips to compare</div>
            <p className="cmp-empty-text">
              You need at least <strong>2 trips</strong> to use comparison.
              Create another trip to get started.
            </p>
            <Link to="/trips/new" className="cmp-btn-primary">
              âœ¨ Create a trip
            </Link>
          </div>
        </main>
      </div>
    );
  }

  /* â”€â”€â”€ Row helper â€” key is unique per row â”€â”€â”€ */
  const compareRow = (label, key, better = "lower", format = (v) => v) => {
    const a = statsA?.[key];
    const b = statsB?.[key];
    let aWins = false;
    let bWins = false;
    if (a != null && b != null && a !== b && better !== "neutral") {
      if (better === "lower") {
        aWins = a < b;
        bWins = b < a;
      } else {
        aWins = a > b;
        bWins = b > a;
      }
    }
    return (
      <div className="cmp-row" key={`row-${key}-${label}`}>
        <div className="cmp-row-label">{label}</div>
        <div className={`cmp-row-val ${aWins ? "win" : ""}`}>
          {a != null ? format(a) : "â€”"}
        </div>
        <div className={`cmp-row-val ${bWins ? "win" : ""}`}>
          {b != null ? format(b) : "â€”"}
        </div>
      </div>
    );
  };

  return (
    <div className="cmp-root">
      <div className="cmp-orb-1" />
      <div className="cmp-orb-2" />

      <main className="cmp-page">
        <header className="cmp-header">
          <div className="cmp-tag">
            <span className="cmp-pulse" />
            Side-by-side
          </div>
          <h1 className="cmp-title">
            Compare your <span>trips</span>
          </h1>
          <p className="cmp-subtitle">
            Pick two trips and see how they stack up on budget, days, cost per
            person, and activity count. Winning stats are highlighted in lime.
          </p>
        </header>

        {/* Selection bar */}
        <div className="cmp-select">
          <div className="cmp-select-col">
            <label className="cmp-select-label">Trip A</label>
            <select
              value={tripAId}
              onChange={(e) => setTripAId(e.target.value)}
              className="cmp-select-input"
            >
              {trips.map((t) => (
                <option key={`a-${t._id}`} value={t._id}>
                  {t.destination}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="cmp-swap"
            onClick={swap}
            aria-label="Swap trips"
          >
            â‡„
          </button>

          <div className="cmp-select-col">
            <label className="cmp-select-label">Trip B</label>
            <select
              value={tripBId}
              onChange={(e) => setTripBId(e.target.value)}
              className="cmp-select-input"
            >
              {trips.map((t) => (
                <option key={`b-${t._id}`} value={t._id}>
                  {t.destination}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Trip cards */}
        <div className="cmp-grid">
          <div className="cmp-card">
            <div className="cmp-card-thumb">
              {tripA.image ? (
                <img src={tripA.image} alt={tripA.destination} />
              ) : (
                <span className="cmp-card-emoji">ðŸŒ</span>
              )}
            </div>
            <h2 className="cmp-card-name">{tripA.destination}</h2>
            <Link to={`/trips/${tripA._id}`} className="cmp-card-link">
              View trip â†’
            </Link>
          </div>

          <div className="cmp-card">
            <div className="cmp-card-thumb">
              {tripB.image ? (
                <img src={tripB.image} alt={tripB.destination} />
              ) : (
                <span className="cmp-card-emoji">ðŸŒ</span>
              )}
            </div>
            <h2 className="cmp-card-name">{tripB.destination}</h2>
            <Link to={`/trips/${tripB._id}`} className="cmp-card-link">
              View trip â†’
            </Link>
          </div>
        </div>

        {/* Comparison table â€” 7 unique rows, no duplicates */}
        <div className="cmp-table">
          <div className="cmp-row cmp-row-head" key="row-head">
            <div className="cmp-row-label">Metric</div>
            <div className="cmp-row-val">{tripA.destination}</div>
            <div className="cmp-row-val">{tripB.destination}</div>
          </div>

          {compareRow("Duration", "days", "neutral", (v) => `${v} days`)}
          {compareRow(
            "Budget per Day",
            "costPerDay",
            "lower",
            (v) => `â‚¹${v.toLocaleString("en-IN")}`
          )}
          {compareRow(
            "Cost per Person",
            "costPerPerson",
            "lower",
            (v) => `â‚¹${v.toLocaleString("en-IN")}`
          )}
          {compareRow("Travellers", "travellers", "neutral", (v) => `${v}`)}
          {compareRow(
            "Activities Planned",
            "activities",
            "higher",
            (v) => `${v} activities`
          )}
          {compareRow(
            "Hotels Suggested",
            "hotels",
            "higher",
            (v) => `${v} hotels`
          )}
          {compareRow(
            "Cost per Activity",
            "costPerActivity",
            "lower",
            (v) => (v ? `â‚¹${v.toLocaleString("en-IN")}` : "â€”")
          )}
        </div>

        <div className="cmp-summary">
          <p>
            <strong style={{ color: "#a3e635" }}>Green</strong> = winning value
            in that row. Neutral rows have no winner.
          </p>
        </div>
      </main>
    </div>
  );
};

export default TripComparison;
```

### FILE: frontend\src\pages\TripDetail.css
```
/* frontend/src/pages/TripDetail.css */

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TOP ROW â€” Back link + Three-dot menu
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

.td-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  min-height: 40px;
  position: relative;
  z-index: 40;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   THREE-DOT MENU (top right)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

.td-more-wrap {
  position: relative;
  display: inline-flex;
}

.td-more-btn {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1.5px solid #e5e7eb;
  background: #ffffff;
  color: #111111;
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
  background: #f7fee7;
  color: #3f6212;
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

/* Dropdown panel â€” opens below the top-right button */
.td-more-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 260px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 8px;
  box-shadow:
    0 24px 48px -16px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(163, 230, 53, 0.08);
  z-index: 100;
  animation: tdMenuIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top right;
}

@keyframes tdMenuIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.td-more-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  background: transparent;
  border: none;
  color: #111111;
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
  padding: 11px 14px;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.td-more-item:hover:not(:disabled) {
  background: #f7fee7;
  color: #3f6212;
  transform: translateX(2px);
}

.td-more-item:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.td-more-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  font-size: 15px;
  flex-shrink: 0;
}

/* PDF button inside the menu */
.td-more-item-pdf {
  padding: 4px;
  margin-bottom: 4px;
  border-bottom: 1px solid #f3f4f6;
}

.td-more-item-pdf .pdf-btn {
  width: 100%;
  justify-content: center;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   BOTTOM ACTION BAR â€” Edit (left) Â· Delete (right)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

.td-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-top: 28px;
  border-top: 1px solid #f0f0f0;
  margin-top: 64px;
  flex-wrap: wrap;
}

/* â”€â”€â”€ Base pill button â”€â”€â”€ */
.td-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 20px;
  border-radius: 999px;
  border: 1.5px solid transparent;
  background: #ffffff;
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #111111;
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

/* Shine sweep */
.td-btn::before {
  content: "";
  position: absolute;
  top: 0;
  left: -75%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(255, 255, 255, 0.7) 50%,
    transparent 100%
  );
  transform: skewX(-20deg);
  transition: left 0.65s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}

.td-btn:hover::before {
  left: 125%;
}

.td-btn:hover {
  transform: translateY(-3px);
}

.td-btn:active {
  transform: translateY(-1px);
}

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

.td-btn:hover .td-btn-icon {
  transform: scale(1.25) rotate(-8deg);
}

/* â”€â”€â”€ Edit variant â”€â”€â”€ */
.td-btn-edit {
  background: #ffffff;
  color: #111111;
  border-color: #e5e7eb;
}

.td-btn-edit:hover {
  border-color: #1a2e1a;
  color: #1a2e1a;
  box-shadow:
    0 14px 30px -10px rgba(26, 46, 26, 0.25),
    0 0 0 4px rgba(26, 46, 26, 0.08);
}

.td-btn-edit:hover .td-btn-icon {
  transform: scale(1.15) rotate(-10deg);
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   RESPONSIVE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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

  .td-actions-bar .td-btn {
    justify-content: center;
  }

  .td-more-menu {
    min-width: 230px;
    right: -4px;
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   REDUCED MOTION
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

@media (prefers-reduced-motion: reduce) {
  .td-btn,
  .td-btn::before,
  .td-btn-icon,
  .td-more-btn,
  .td-more-item,
  .td-more-menu {
    animation: none !important;
    transition: none !important;
  }
}

/* â”€â”€â”€ Delete Trip button â”€â”€â”€ */
.delete-trip-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 20px;
  border-radius: 999px;
  border: 1.5px solid #fecaca;
  background: #fff;
  color: #b91c1c;
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
  background: #fef2f2;
  border-color: #ef4444;
  color: #991b1b;
  transform: translateY(-3px);
  box-shadow:
    0 14px 30px -10px rgba(239, 68, 68, 0.4),
    0 0 0 4px rgba(239, 68, 68, 0.1);
}
.delete-trip-btn:active:not(:disabled) {
  transform: translateY(-1px);
}
.delete-trip-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.delete-trip-btn__icon {
  font-size: 14px;
  line-height: 1;
}
```

### FILE: frontend\src\pages\TripDetail.jsx
```
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import Skeleton from "../components/Skeleton";
import TripMap from "../components/TripMap";
import DeleteButton from "../components/DeleteButton";
import ItineraryPaper from "../components/ItineraryPaper";
import SkyFlightButton from "../components/SkyFlightButton";
import { downloadICS } from "../utils/ics";
import { buildCoverArtUrl, preloadImage } from "../utils/coverArt";
import { useCurrency } from "../context/CurrencyContext";
import { useTripActions } from "../context/TripActionsContext";
import "./TripDetail.css";

const Pill = ({ icon, children }) => (
  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-ink">
    <span className="w-5 h-5 rounded-full bg-lime flex items-center justify-center text-xs">
      {icon}
    </span>
    {children}
  </span>
);

const TripDetailSkeleton = () => (
  <div className="min-h-screen bg-white pb-20">
    <div className="max-w-6xl mx-auto px-6 pt-8">
      <Skeleton variant="text" width={120} height={14} />
      <div style={{ marginTop: 16 }}>
        <Skeleton
          variant="rectangular"
          width="100%"
          style={{ aspectRatio: "21 / 9" }}
          rounded="24px"
        />
      </div>
      <div style={{ marginTop: 32 }}>
        <Skeleton variant="rectangular" width="55%" height={48} rounded="12px" />
      </div>
      <div className="flex flex-wrap gap-3 mt-5">
        <Skeleton variant="rectangular" width={110} height={40} rounded="9999px" />
        <Skeleton variant="rectangular" width={140} height={40} rounded="9999px" />
        <Skeleton variant="rectangular" width={180} height={40} rounded="9999px" />
      </div>
      <div style={{ marginTop: 32 }}>
        <Skeleton variant="rectangular" width={280} height={54} rounded="9999px" />
      </div>
    </div>
  </div>
);

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { format } = useCurrency();
  const { setActions } = useTripActions();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [weather, setWeather] = useState(null);
  const [places, setPlaces] = useState([]);
  const [coverImage, setCoverImage] = useState(null);

  const [generatingArt, setGeneratingArt] = useState(false);
  const [artError, setArtError] = useState("");

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
      generatingArt,
      shareLoading,
      onCalendar: () => {
        try {
          downloadICS(trip);
        } catch (err) {
          console.error(err);
        }
      },
      onCoverArt: async () => {
        setArtError("");
        setGeneratingArt(true);
        try {
          const url = buildCoverArtUrl(trip, Date.now() % 1000);
          const ok = await preloadImage(url);
          if (!ok) throw new Error("Image service unavailable");
          await api.put(`/trips/${id}`, { image: url });
          setTrip((prev) => ({ ...prev, image: url }));
        } catch (err) {
          console.error(err);
          setArtError("Could not generate cover art. Try again.");
        } finally {
          setGeneratingArt(false);
        }
      },
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
  }, [trip, id, generatingArt, shareLoading]);

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
      if (window.__skyTripBtn?.setComplete) window.__skyTripBtn.setComplete();
    } catch (err) {
      setGenError(err.response?.data?.message || "AI generation failed");
      if (window.__skyTripBtn?.reset) window.__skyTripBtn.reset();
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
      alert("Could not copy â€” please copy manually");
    }
  };

  const handleDelete = async () => {
    await api.delete(`/trips/${id}`);
    navigate("/trips");
  };

  if (loading) return <TripDetailSkeleton />;
  if (!trip) return null;

  const days = Math.max(
    1,
    Math.round(
      (new Date(trip.endDate) - new Date(trip.startDate)) /
        (1000 * 60 * 60 * 24)
    )
  );
  const budgetLabel =
    trip.budget < 20000 ? "Cheap" : trip.budget < 50000 ? "Moderate" : "Luxury";

  const heroImg =
    trip.image ||
    coverImage ||
    `https://picsum.photos/seed/${encodeURIComponent(trip.destination)}/1600/700`;

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-6xl mx-auto px-6 pt-8">
        {/* â”€â”€â”€ Top row: back link only â”€â”€â”€ */}
        <div className="td-top-row">
          <Link
            to="/trips"
            className="text-sm text-gray-500 hover:text-ink transition"
          >
            â† Back to trips
          </Link>
        </div>

        <div className="mt-4 rounded-3xl overflow-hidden aspect-[21/9] bg-gray-100">
          <img
            src={heroImg}
            alt={trip.destination}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = `https://picsum.photos/seed/${encodeURIComponent(
                trip.destination
              )}/1600/700`;
            }}
          />
        </div>

        <div className="mt-8">
          <h1 className="text-3xl md:text-5xl font-extrabold text-ink">
            {trip.destination}
          </h1>
        </div>

        <div className="flex flex-wrap gap-3 mt-5">
          <Pill icon="ðŸ“…">
            {days} Day{days > 1 ? "s" : ""}
          </Pill>
          {trip.spotsCount > 0 && (
            <Pill icon="ðŸ“">{trip.spotsCount} places</Pill>
          )}
          <Pill icon="ðŸ’°">
            {format(trip.budget)} Â· {budgetLabel}
          </Pill>
          <Pill icon="ðŸ‘¥">No. Of Traveler: {trip.travellers}</Pill>
        </div>

        {genError && (
          <p className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mt-6 text-sm">
            {genError}
          </p>
        )}

        {artError && (
          <p className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mt-6 text-sm">
            {artError}
          </p>
        )}

        <div className="mt-8">
          <SkyFlightButton
            label={trip.itinerary?.length ? "Regenerate Trip" : "Generate Trip"}
            loadingLabel="Curating Your Itinerary"
            doneLabel="ðŸŽ‰ Itinerary Ready!"
            disabled={generating}
            loading={generating}
            onClick={handleGenerate}
            autoCompleteAfter={0}
          />
        </div>

        {trip.hotels?.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-extrabold text-ink mb-6">
              Hotel Recommendation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {trip.hotels.map((h, i) => {
                const imgUrl =
                  h.image ||
                  `https://picsum.photos/seed/${encodeURIComponent(h.name)}/400/300`;
                return (
                  <div key={i}>
                    <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100">
                      <img
                        src={imgUrl}
                        alt={h.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = `https://picsum.photos/seed/${encodeURIComponent(
                            h.name
                          )}/400/300`;
                        }}
                      />
                    </div>
                    <h3 className="mt-3 font-bold text-ink text-sm leading-tight">
                      {h.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-2">ðŸ“ {h.address}</p>
                    <p className="text-sm font-bold text-ink mt-2">ðŸ’° {h.price}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      â­ {h.rating} stars
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {trip.itinerary?.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-extrabold text-ink mb-8">
              Places to Visit
            </h2>
            {trip.itinerary.map((day) => (
              <div key={day.day} className="mb-10">
                <h3 className="text-xl font-extrabold text-ink mb-5">
                  Day {day.day}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {day.activities.map((act, idx) => {
                    const imgUrl =
                      act.image ||
                      `https://picsum.photos/seed/${encodeURIComponent(
                        act.title
                      )}/200/200`;
                    return (
                      <div key={idx} className="flex flex-col">
                        <p className="text-red-600 text-sm font-bold mb-2">
                          {act.time}
                        </p>
                        <div className="flex gap-4 p-4 border border-gray-100 rounded-2xl card-hover bg-white">
                          <img
                            src={imgUrl}
                            alt={act.title}
                            className="w-24 h-24 md:w-28 md:h-28 rounded-xl object-cover flex-shrink-0"
                            onError={(e) => {
                              e.target.src = `https://picsum.photos/seed/${encodeURIComponent(
                                act.title
                              )}/200/200`;
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-ink text-base leading-tight">
                              {act.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                              {act.description}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              â± {act.time?.split("-")[1]?.trim() || "Flexible"}
                            </p>
                            <p className="text-xs font-bold text-ink mt-1">
                              {format(act.cost)} per person
                            </p>
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
          <section className="mt-16">
            <h2 className="text-2xl font-extrabold text-ink mb-6">
              Famous Tourist Spots Nearby
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {places.map((p) => {
                const imgUrl =
                  p.image ||
                  `https://picsum.photos/seed/${encodeURIComponent(p.name)}/400/300`;
                return (
                  <div key={p.id}>
                    <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100">
                      <img
                        src={imgUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = `https://picsum.photos/seed/${encodeURIComponent(
                            p.name
                          )}/400/300`;
                        }}
                      />
                    </div>
                    <div className="flex justify-between items-start gap-2 mt-3">
                      <h3 className="font-bold text-ink text-sm leading-tight">
                        {p.name}
                      </h3>
                      <span className="text-xs bg-lime-light text-forest px-2 py-0.5 rounded-full whitespace-nowrap font-semibold">
                        {p.type}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {p.description}
                      </p>
                    )}
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-lime-dark font-semibold hover:underline mt-2 inline-block"
                    >
                      View on map â†’
                    </a>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {weather?.location && (
          <section className="mt-16">
            <h2 className="text-2xl font-extrabold text-ink mb-6">
              Destination Map
            </h2>
            <div className="flex flex-wrap gap-3 mb-5">
              <Pill icon="ðŸŒ¤ï¸">
                {Math.round(weather.current?.temperature_2m ?? 0)}Â°C
              </Pill>
              <Pill icon="ðŸ’¨">
                {weather.current?.wind_speed_10m ?? 0} km/h wind
              </Pill>
            </div>
            <TripMap
              lat={weather.location.lat}
              lng={weather.location.lng}
              label={trip.destination}
              places={places}
            />
          </section>
        )}

        {weather?.location && (
          <section className="mt-16">
            <div className="rounded-3xl border-2 border-lime/30 bg-gradient-to-br from-lime-light/50 to-white p-8 md:p-10">
              <div className="flex items-start justify-between gap-8 flex-wrap">
                <div className="flex-1 min-w-[260px]">
                  <p className="text-xs font-bold uppercase tracking-widest text-lime-dark mb-2">
                    Smart Weather Plan
                  </p>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-ink leading-tight">
                    Plan your trip around the weather
                  </h2>
                  <p className="text-sm text-gray-600 mt-3 max-w-lg leading-relaxed">
                    We check the weather for each day of your trip. Outdoor
                    plans go on sunny days, and indoor plans go on rainy days.
                  </p>
                  <Link
                    to={`/trips/${id}/weather-itinerary`}
                    className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-lime text-forest font-bold hover:bg-lime-dark btn-press transition shadow-[0_6px_20px_-8px_rgba(168,216,74,0.8)]"
                  >
                    See Smart Weather Plan â†’
                  </Link>
                </div>

                <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 px-6 py-5 shadow-sm">
                  <span className="text-4xl leading-none">ðŸŒ¤ï¸</span>
                  <div>
                    <p className="text-3xl font-extrabold text-ink leading-none">
                      {Math.round(weather.current?.temperature_2m ?? 0)}Â°
                      <span className="text-base text-gray-400 ml-1">C</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-2 font-semibold">
                      ðŸ’¨ {Math.round(weather.current?.wind_speed_10m ?? 0)} km/h wind
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â• BOTTOM ACTION BAR: Edit (left) Â· Delete (right) â•â•â•â•â•â•â•â•â•â•â• */}
        <div className="td-actions-bar">
          <Link to={`/trips/${id}/edit`} className="td-btn td-btn-edit">
            <span className="td-btn-icon">âœï¸</span>
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
          className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
          onClick={() => {
            setShareUrl("");
            setCopied(false);
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-ink">
                  ðŸ”— Share this trip
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Anyone with this link can view your itinerary.
                </p>
              </div>
              <button
                onClick={() => {
                  setShareUrl("");
                  setCopied(false);
                }}
                className="text-gray-400 hover:text-ink text-xl leading-none"
                aria-label="Close"
              >
                âœ•
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={shareUrl}
                onClick={(e) => e.target.select()}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-ink bg-gray-50 focus:outline-none"
              />
              <button
                onClick={copyShareUrl}
                className="px-4 py-2.5 rounded-lg bg-lime text-forest font-bold text-sm hover:bg-lime-dark transition whitespace-nowrap"
              >
                {copied ? "âœ“ Copied" : "Copy"}
              </button>
            </div>

            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-lime-dark font-semibold hover:underline"
            >
              Open in new tab â†’
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDetail;
```

### FILE: frontend\src\pages\TripJournal.css
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
   LAYOUT 1 â€” ZIGZAG
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
   LAYOUT 2 â€” STREAM
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
```

### FILE: frontend\src\pages\TripJournal.jsx
```
import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import "./TripJournal.css";

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Demo data (Japan trip) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const DEMO_ENTRIES = [
  { type: "destination", day: 1, time: "Morning", title: "Tokyo", emoji: "ðŸ—¼",
    desc: "Arrive at Narita, transfer to Shinjuku, and settle in for four nights in the capital.",
    chips: ["4 nights", "Shinjuku base"] },
  { type: "hotel", day: 1, time: "Afternoon", title: "Park Hyatt Tokyo", emoji: "ðŸ¨",
    desc: "High-rise above Shinjuku with Mount Fuji views on clear days. Walking distance to the metro.",
    chips: ["Shinjuku", "4 nights"] },
  { type: "activity", day: 2, time: "Morning", title: "Tsukiji Outer Market", emoji: "ðŸ£",
    desc: "Fresh sushi, tamagoyaki, and matcha from the stalls that never left after the market moved.",
    chips: ["Food", "2 hrs"] },
  { type: "activity", day: 2, time: "Afternoon", title: "Senso-ji & Asakusa", emoji: "â›©ï¸",
    desc: "Tokyo's oldest temple, the Nakamise shopping street, and a slow walk along the Sumida.",
    chips: ["Culture", "3 hrs"] },
  { type: "activity", day: 3, time: "All day", title: "Shibuya, Harajuku & Omotesando", emoji: "ðŸ›ï¸",
    desc: "The scramble crossing, Takeshita Street, and the tree-lined avenue of flagship boutiques.",
    chips: ["Shopping", "Full day"] },
  { type: "transport", day: 5, time: "Morning", title: "Tokyo â†’ Hakone", emoji: "ðŸš„",
    desc: "Shinkansen to Odawara, then the Tozan Railway up into the mountains.",
    chips: ["90 min", "Shinkansen"] },
  { type: "destination", day: 5, time: "Midday", title: "Hakone", emoji: "ðŸŒ‹",
    desc: "An onsen town inside the Fuji-Hakone-Izu National Park. Two nights of hot springs and mountain air.",
    chips: ["2 nights", "Onsen"] },
  { type: "hotel", day: 5, time: "Afternoon", title: "Gora Kadan Ryokan", emoji: "â™¨ï¸",
    desc: "A traditional ryokan with private onsen, kaiseki dinner, and tatami rooms overlooking the valley.",
    chips: ["Ryokan", "2 nights"] },
  { type: "activity", day: 6, time: "All day", title: "Lake Ashi & Owakudani", emoji: "ðŸš¡",
    desc: "Pirate ship across Lake Ashi, ropeway over the volcanic valley, black eggs at the summit.",
    chips: ["Outdoor", "Full day"] },
  { type: "transport", day: 7, time: "Morning", title: "Hakone â†’ Kyoto", emoji: "ðŸš„",
    desc: "Back down to Odawara, then a two-hour shinkansen ride west to Kyoto Station.",
    chips: ["2 hrs", "Reserved seats"] },
  { type: "destination", day: 7, time: "Afternoon", title: "Kyoto", emoji: "â›©ï¸",
    desc: "Japan's former capital â€” 1,600 temples, 400 shrines, and the country's most refined food culture.",
    chips: ["3 nights", "Old capital"] },
  { type: "hotel", day: 7, time: "Evening", title: "The Ritz-Carlton Kyoto", emoji: "ðŸ¨",
    desc: "Riverside property on the Kamogawa with a quiet garden courtyard and modern-Japanese rooms.",
    chips: ["Kamogawa", "3 nights"] },
  { type: "activity", day: 8, time: "Dawn", title: "Fushimi Inari at Sunrise", emoji: "â›©ï¸",
    desc: "Ten thousand vermilion torii gates up Mount Inari, blissfully empty before seven a.m.",
    chips: ["Hike", "3 hrs"] },
  { type: "activity", day: 8, time: "Afternoon", title: "Arashiyama Bamboo Grove", emoji: "ðŸŽ‹",
    desc: "The famous path through the bamboo, plus the monkey park and Togetsukyo Bridge.",
    chips: ["Nature", "Half day"] },
  { type: "activity", day: 9, time: "All day", title: "Gion & Kiyomizu-dera", emoji: "ðŸµ",
    desc: "Morning at the hillside temple, afternoon tea ceremony, evening walk through Gion's lantern-lit lanes.",
    chips: ["Culture", "Full day"] },
  { type: "transport", day: 10, time: "Morning", title: "Kyoto â†’ Osaka", emoji: "ðŸš„",
    desc: "A fifteen-minute shinkansen hop â€” barely enough time to finish a station bento.",
    chips: ["15 min", "Short hop"] },
  { type: "destination", day: 10, time: "Midday", title: "Osaka", emoji: "ðŸ¯",
    desc: "Japan's kitchen and nightlife capital. Two nights of street food, neon, and Dotonbori chaos.",
    chips: ["2 nights", "Street food"] },
  { type: "hotel", day: 10, time: "Afternoon", title: "Conrad Osaka", emoji: "ðŸ¨",
    desc: "Skyline views from Nakanoshima, walkable to Umeda and a short metro to Dotonbori.",
    chips: ["Nakanoshima", "2 nights"] },
  { type: "activity", day: 11, time: "Evening", title: "Dotonbori Food Crawl", emoji: "ðŸ¢",
    desc: "Takoyaki, okonomiyaki, kushikatsu, and the Glico running man. Come hungry.",
    chips: ["Food", "4 hrs"] },
  { type: "transport", day: 12, time: "Morning", title: "Osaka â†’ Kansai Airport", emoji: "ðŸš†",
    desc: "The Nankai Rapi:t express to KIX â€” forty minutes through Osaka's southern suburbs.",
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Transform a real trip into journal entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
    emoji: "ðŸ“",
    desc: `${daysBetween(trip.startDate, trip.endDate)}-day trip starting ${new Date(
      trip.startDate
    ).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}.`,
    chips: [
      `${trip.travellers || 1} traveller${trip.travellers > 1 ? "s" : ""}`,
      `â‚¹ ${(trip.budget || 0).toLocaleString()}`,
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
        emoji: "ðŸ¨",
        desc: h.address || "Accommodation for your trip.",
        chips: [
          h.rating ? `â­ ${h.rating}` : null,
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
        const isTransport = /â†’|->|train|flight|drive|taxi|transfer|travel|shinkansen|airport|metro|bus/i.test(
          text
        );

        // Detect indoor/outdoor for emoji
        let emoji = "ðŸ“";
        if (isTransport) emoji = "ðŸš†";
        else if (/museum|gallery/.test(text)) emoji = "ðŸ›ï¸";
        else if (/beach/.test(text)) emoji = "ðŸ–ï¸";
        else if (/temple|shrine/.test(text)) emoji = "â›©ï¸";
        else if (/park|garden|nature/.test(text)) emoji = "ðŸŒ³";
        else if (/hike|trek/.test(text)) emoji = "ðŸ¥¾";
        else if (/food|restaurant|dinner|lunch|cafe|eat/.test(text)) emoji = "ðŸ½ï¸";
        else if (/market|shop/.test(text)) emoji = "ðŸ›ï¸";
        else if (/castle|palace/.test(text)) emoji = "ðŸ°";
        else if (/boat|ferry|cruise/.test(text)) emoji = "â›µ";
        else if (/sunrise|sunset|viewpoint/.test(text)) emoji = "ðŸŒ…";

        const chips = [];
        if (act.time) chips.push(act.time);
        if (act.cost) chips.push(`â‚¹ ${act.cost}`);

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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Entry components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
            â† Back to trip
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
            â† Back to trip
          </Link>
        )}

        <header className="tj-masthead">
          <div className="tj-masthead-left">
            <div className="tj-kicker">
              {isRealTrip
                ? `${entries.filter((e) => e.type === "activity").length} activities Â· Field Notes`
                : "Japan Â· Field Notes Â· Vol. 01"}
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
              â†” Zigzag Journal
            </button>
            <button
              type="button"
              className={activeView === "stream" ? "active" : ""}
              onClick={() => setActiveView("stream")}
            >
              â†“ Vertical Stream
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
            <div style={{ fontSize: "3rem", marginBottom: 16, opacity: 0.5 }}>ðŸ““</div>
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
          <span>Two views Â· One journey Â· Filter categories</span>
          <span>AI Travel Planner Â© Field Journal</span>
        </footer>
      </main>
    </div>
  );
};

export default TripJournal;
```

### FILE: frontend\src\pages\Trips.css
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

### FILE: frontend\src\pages\Trips.jsx
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
  { key: "az", label: "A â†’ Z" },
  { key: "za", label: "Z â†’ A" },
];

const CART_STORAGE_KEY = "aitp.selectedTrips";

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* Pick a nice emoji based on destination text */
function pickEmoji(destination) {
  const t = (destination || "").toLowerCase();
  if (t.includes("bali") || t.includes("beach")) return "ðŸï¸";
  if (t.includes("tokyo") || t.includes("japan")) return "ðŸ—¼";
  if (t.includes("kyoto")) return "â›©ï¸";
  if (t.includes("new york") || t.includes("nyc")) return "ðŸ—½";
  if (t.includes("paris") || t.includes("france")) return "ðŸ¥";
  if (t.includes("rome") || t.includes("italy")) return "ðŸ›ï¸";
  if (t.includes("iceland") || t.includes("reyk")) return "ðŸŒ‹";
  if (t.includes("marrakech") || t.includes("morocco")) return "ðŸ•Œ";
  if (t.includes("cape town") || t.includes("africa")) return "ðŸ¦";
  if (t.includes("lisbon") || t.includes("portugal")) return "ðŸš‹";
  if (t.includes("bangkok") || t.includes("thai")) return "ðŸ›•";
  if (t.includes("dubai")) return "ðŸŒ‡";
  if (t.includes("barcelona") || t.includes("spain")) return "ðŸŽ¨";
  if (t.includes("santorini") || t.includes("greece")) return "ðŸ–ï¸";
  if (t.includes("hanoi") || t.includes("vietnam")) return "ðŸœ";
  if (t.includes("sydney") || t.includes("australia")) return "ðŸŒ‰";
  if (t.includes("peru") || t.includes("machu")) return "ðŸ”ï¸";
  if (t.includes("zermatt") || t.includes("switzerland")) return "ðŸ‚";
  if (t.includes("india") || t.includes("delhi") || t.includes("mumbai")) return "ðŸ›•";
  if (t.includes("london")) return "ðŸŽ¡";
  if (t.includes("egypt") || t.includes("cairo")) return "ðŸ«";
  return "âœˆï¸";
}

/* Extract a short country/region from destination string */
function extractCountry(destination) {
  if (!destination) return "";
  const parts = destination.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 1];
  return "";
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Skeleton grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const SkeletonGrid = () => (
  <div className="tr-grid">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="tr-skeleton" />
    ))}
  </div>
);

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const Trips = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [tier, setTier] = useState(searchParams.get("tier") || "all");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");

  const [selected, setSelected] = useState(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, text: "", icon: "âœ“" });
  const [badgeBump, setBadgeBump] = useState(false);

  const searchRef = useRef(null);
  const toastTimerRef = useRef(null);

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

  /* Persist cart */
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(selected));
    } catch {}
  }, [selected]);

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
        if (drawerOpen) setDrawerOpen(false);
        else if (document.activeElement === searchRef.current) {
          setQuery("");
          searchRef.current?.blur();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  /* Toast */
  const showToast = (text, icon = "âœ“") => {
    setToast({ show: true, text, icon });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 1800);
  };

  /* Selection toggle */
  const toggleTrip = (id) => {
    setSelected((prev) => {
      const isSel = prev.includes(id);
      if (isSel) {
        showToast("Removed from selection", "Ã—");
        return prev.filter((x) => x !== id);
      }
      showToast("Added to selection", "âœ“");
      return [...prev, id];
    });
    setBadgeBump(true);
    setTimeout(() => setBadgeBump(false), 300);
  };

  const clearCart = () => {
    if (selected.length === 0) return;
    setSelected([]);
    showToast("Selection cleared", "ðŸ—‘ï¸");
  };

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

  const selectedTrips = useMemo(
    () =>
      selected
        .map((id) => trips.find((t) => t._id === id))
        .filter(Boolean),
    [selected, trips]
  );

  const totalDays = useMemo(
    () =>
      selectedTrips.reduce(
        (sum, t) => sum + daysBetween(t.startDate, t.endDate),
        0
      ),
    [selectedTrips]
  );

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

  const buildPlan = () => {
    const names = selectedTrips.map((t) => t.destination).join(", ");
    showToast(`Building plan for ${names}`, "âœ¨");
    setDrawerOpen(false);
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
                Search, filter, and sort your trips. Tap{" "}
                <strong>ï¼‹ Select</strong> on any card to add it to your
                selection â€” the cart keeps your picks even after a refresh.
              </p>
            </div>

            <button
              className={`tr-cart-btn ${selected.length > 0 ? "has-items" : ""}`}
              onClick={() => setDrawerOpen(true)}
              type="button"
              aria-label="Open selected trips"
            >
              <span>ðŸ›’</span>
              <span>Selected</span>
              <span className={`tr-cart-badge ${badgeBump ? "bump" : ""}`}>
                {selected.length}
              </span>
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="tr-filter-panel">
          <div className="tr-filter-grid">
            <label className="tr-field">
              <span className="tr-label">Search destinations</span>
              <span className="tr-input-wrap">
                <span className="tr-field-icon">ðŸ”</span>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder='Try "Japan", "Paris", "Bali"â€¦'
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
                    Ã—
                  </button>
                )}
              </span>
            </label>

            <label className="tr-field">
              <span className="tr-label">Budget tier</span>
              <span className="tr-input-wrap">
                <span className="tr-field-icon">ðŸ’°</span>
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
                <span className="tr-field-icon">â†•ï¸</span>
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
                  Ã—
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
                  Ã—
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
                  Ã—
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
            <div className="tr-empty-icon">ðŸ—ºï¸</div>
            <div className="tr-empty-title">No trips yet</div>
            <p className="tr-empty-text">
              Start planning your first adventure and let AI craft the perfect
              itinerary for you.
            </p>
            <Link to="/trips/new" className="tr-btn-primary">
              âœ¨ Create your first trip
            </Link>
          </div>
        )}

        {!loading && trips.length > 0 && visibleTrips.length === 0 && (
          <div className="tr-empty">
            <div className="tr-empty-icon">ðŸ”</div>
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
              âœ¨ Clear all filters
            </button>
          </div>
        )}

        {!loading && visibleTrips.length > 0 && (
          <div className="tr-grid">
            {visibleTrips.map((trip, i) => {
              const tier = getBudgetTier(trip.budget);
              const days = daysBetween(trip.startDate, trip.endDate);
              const isSel = selected.includes(trip._id);
              const country = extractCountry(trip.destination);
              const emoji = pickEmoji(trip.destination);

              return (
                <article
                  key={trip._id}
                  className={`tr-card tier-${tier} ${isSel ? "selected" : ""}`}
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
                      <button
                        type="button"
                        className={`tr-select ${isSel ? "selected" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTrip(trip._id);
                        }}
                        aria-pressed={isSel}
                      >
                        {isSel ? (
                          <>
                            <span>âœ“</span> Selected
                          </>
                        ) : (
                          <>
                            <span>ï¼‹</span> Select
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="tr-name">{trip.destination}</h3>
                    {country && <p className="tr-country">{country}</p>}
                  </div>

                  <div className="tr-meta">
                    <span className="days">{days} days</span>
                    <span className="sep">Â·</span>
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
          <span>Filters sync to the URL Â· Selections saved locally</span>
          <span>AI Travel Planner Â© My Trips</span>
        </footer>
      </main>

      {/* Overlay */}
      <div
        className={`tr-overlay ${drawerOpen ? "open" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Drawer */}
      <aside className={`tr-drawer ${drawerOpen ? "open" : ""}`}>
        <div className="tr-drawer-head">
          <div className="tr-drawer-title">
            ðŸ›’ Selected <span>({selected.length})</span>
          </div>
          <button
            className="tr-drawer-close"
            onClick={() => setDrawerOpen(false)}
            type="button"
            aria-label="Close drawer"
          >
            Ã—
          </button>
        </div>

        <div className="tr-drawer-summary">
          <div className="tr-summary-stat">
            <div className="tr-summary-label">Trips</div>
            <div className="tr-summary-value">
              {selected.length}
              <span>selected</span>
            </div>
          </div>
          <div className="tr-summary-stat">
            <div className="tr-summary-label">Total days</div>
            <div className="tr-summary-value accent">
              {totalDays}
              <span>days</span>
            </div>
          </div>
        </div>

        <div className="tr-drawer-body">
          {selectedTrips.length === 0 ? (
            <div className="tr-cart-empty">
              <div className="tr-cart-empty-icon">ðŸ›’</div>
              <div className="tr-cart-empty-title">Nothing selected yet</div>
              <p className="tr-cart-empty-text">
                Tap <strong>ï¼‹ Select</strong> on any trip card to add it here.
                Your picks are saved locally.
              </p>
            </div>
          ) : (
            selectedTrips.map((trip) => {
              const tier = getBudgetTier(trip.budget);
              const days = daysBetween(trip.startDate, trip.endDate);
              const emoji = pickEmoji(trip.destination);
              return (
                <div
                  key={trip._id}
                  className={`tr-cart-item tier-${tier}`}
                >
                  <div className="tr-cart-item-thumb">
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
                  <div className="tr-cart-item-body">
                    <div className="tr-cart-item-name">
                      {trip.destination}
                    </div>
                    <div className="tr-cart-item-meta">{days} days</div>
                  </div>
                  <button
                    type="button"
                    className="tr-cart-item-remove"
                    onClick={() => toggleTrip(trip._id)}
                    aria-label={`Remove ${trip.destination}`}
                  >
                    Ã—
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="tr-drawer-foot">
          <div className="tr-drawer-actions">
            <button
              className="tr-btn-cart-primary"
              type="button"
              disabled={selectedTrips.length === 0}
              onClick={buildPlan}
            >
              âœ¨ Build itinerary
            </button>
            <button
              className="tr-btn-cart-ghost"
              type="button"
              onClick={clearCart}
            >
              Clear
            </button>
          </div>
        </div>
      </aside>

      {/* Toast */}
      <div className={`tr-toast ${toast.show ? "show" : ""}`}>
        <span>{toast.icon}</span>
        <span>{toast.text}</span>
      </div>
    </div>
  );
};

export default Trips;
```

### FILE: frontend\src\pages\WeatherAwareItinerary.css
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Animated weather icon keyframes (moved from TripWeather.css) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€ Sun â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€ Clouds â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€ Rain â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€ Snow â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€ Thunder â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€ Fog â”€â”€â”€â”€â”€â”€â”€ */
@keyframes wfFogWave {
  0%, 100% { transform: translateX(-5px); opacity: 0.4; }
  50%      { transform: translateX(5px);  opacity: 0.85; }
}
.wf-wx-fog-wave { animation: wfFogWave 3.8s ease-in-out infinite; }
.wf-wx-fog-wave:nth-of-type(1) { animation-delay: 0s;   }
.wf-wx-fog-wave:nth-of-type(2) { animation-delay: 0.5s; }
.wf-wx-fog-wave:nth-of-type(3) { animation-delay: 1s;   }

/* â”€â”€â”€â”€â”€â”€â”€ Reduced motion â”€â”€â”€â”€â”€â”€â”€ */
@media (prefers-reduced-motion: reduce) {
  .wf-wx-icon * { animation: none !important; }
}
```

### FILE: frontend\src\pages\WeatherAwareItinerary.jsx
```
import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import WeatherIcon, { decodeWeatherCode } from "../components/WeatherIcon";
import "./WeatherAwareItinerary.css";

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Date helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Demo destinations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const DESTINATIONS = {
  kyoto: {
    name: "Kyoto, Japan",
    icon: "â›©ï¸",
    lat: 35.0116,
    lon: 135.7681,
    activities: [
      { id: "k1", name: "Fushimi Inari shrine hike", type: "outdoor", hours: 3, emoji: "â›©ï¸", sensitivity: 5, priority: 3 },
      { id: "k2", name: "Arashiyama bamboo grove", type: "outdoor", hours: 2, emoji: "ðŸŽ‹", sensitivity: 4, priority: 3 },
      { id: "k3", name: "Kinkaku-ji golden pavilion", type: "outdoor", hours: 1.5, emoji: "ðŸ¯", sensitivity: 3, priority: 3 },
      { id: "k4", name: "Traditional tea ceremony", type: "indoor", hours: 1.5, emoji: "ðŸµ", sensitivity: 1, priority: 2 },
      { id: "k5", name: "Nishiki market food tour", type: "outdoor", hours: 2, emoji: "ðŸ¢", sensitivity: 2, priority: 2 },
      { id: "k6", name: "Kyoto National Museum", type: "indoor", hours: 2, emoji: "ðŸ›ï¸", sensitivity: 1, priority: 2 },
      { id: "k7", name: "Philosopher's Path walk", type: "outdoor", hours: 2, emoji: "ðŸŒ¸", sensitivity: 4, priority: 2 },
      { id: "k8", name: "Izakaya dinner in Pontocho", type: "indoor", hours: 2, emoji: "ðŸ¶", sensitivity: 1, priority: 3 },
      { id: "k9", name: "Gion evening stroll", type: "outdoor", hours: 1.5, emoji: "ðŸ®", sensitivity: 3, priority: 2 },
    ],
  },
  paris: {
    name: "Paris, France",
    icon: "ðŸ—¼",
    lat: 48.8566,
    lon: 2.3522,
    activities: [
      { id: "p1", name: "Eiffel Tower summit visit", type: "outdoor", hours: 3, emoji: "ðŸ—¼", sensitivity: 4, priority: 3 },
      { id: "p2", name: "Louvre Museum tour", type: "indoor", hours: 3, emoji: "ðŸ–¼ï¸", sensitivity: 1, priority: 3 },
      { id: "p3", name: "Seine river walk", type: "outdoor", hours: 2, emoji: "ðŸš¶", sensitivity: 3, priority: 2 },
      { id: "p4", name: "Montmartre & SacrÃ©-CÅ“ur", type: "outdoor", hours: 2.5, emoji: "â›ª", sensitivity: 4, priority: 3 },
      { id: "p5", name: "Catacombs underground tour", type: "indoor", hours: 2, emoji: "ðŸ’€", sensitivity: 1, priority: 2 },
      { id: "p6", name: "Luxembourg Gardens picnic", type: "outdoor", hours: 2, emoji: "ðŸ¥–", sensitivity: 5, priority: 2 },
      { id: "p7", name: "CafÃ© hopping in Le Marais", type: "indoor", hours: 2, emoji: "â˜•", sensitivity: 1, priority: 2 },
      { id: "p8", name: "Orsay Museum", type: "indoor", hours: 2.5, emoji: "ðŸŽ¨", sensitivity: 1, priority: 2 },
      { id: "p9", name: "Champs-Ã‰lysÃ©es & Arc de Triomphe", type: "outdoor", hours: 2, emoji: "ðŸ›ï¸", sensitivity: 3, priority: 3 },
    ],
  },
  bali: {
    name: "Bali, Indonesia",
    icon: "ðŸï¸",
    lat: -8.4095,
    lon: 115.1889,
    activities: [
      { id: "b1", name: "Tegallalang rice terrace trek", type: "outdoor", hours: 3, emoji: "ðŸŒ¾", sensitivity: 5, priority: 3 },
      { id: "b2", name: "Uluwatu temple sunset", type: "outdoor", hours: 2.5, emoji: "ðŸ›•", sensitivity: 4, priority: 3 },
      { id: "b3", name: "Balinese cooking class", type: "indoor", hours: 3, emoji: "ðŸ›", sensitivity: 1, priority: 2 },
      { id: "b4", name: "Ubud art market", type: "outdoor", hours: 2, emoji: "ðŸŽ¨", sensitivity: 2, priority: 2 },
      { id: "b5", name: "Traditional Balinese spa", type: "indoor", hours: 2, emoji: "ðŸ’†", sensitivity: 1, priority: 3 },
      { id: "b6", name: "Mount Batur sunrise hike", type: "outdoor", hours: 5, emoji: "ðŸŒ‹", sensitivity: 5, priority: 3 },
      { id: "b7", name: "Seminyak beach day", type: "outdoor", hours: 4, emoji: "ðŸ–ï¸", sensitivity: 5, priority: 2 },
      { id: "b8", name: "Yoga & meditation session", type: "indoor", hours: 1.5, emoji: "ðŸ§˜", sensitivity: 1, priority: 2 },
      { id: "b9", name: "Tirta Empul water temple", type: "outdoor", hours: 2, emoji: "ðŸ’§", sensitivity: 3, priority: 2 },
    ],
  },
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Activity classifier â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const OUTDOOR_KEYWORDS = [
  "hike", "trek", "walk", "stroll", "park", "garden", "beach", "mountain",
  "lake", "river", "viewpoint", "bridge", "terrace", "farm", "ruins",
  "monument", "statue", "square", "plaza", "outdoor", "bike", "cycling",
  "kayak", "boat", "cruise", "sunrise", "sunset", "waterfall", "island",
  "desert", "valley", "forest",
];
const INDOOR_KEYWORDS = [
  "museum", "gallery", "indoor", "restaurant", "cafe", "cafÃ©", "coffee",
  "bar", "pub", "theater", "theatre", "cinema", "spa", "hammam",
  "cooking class", "workshop", "show", "concert", "aquarium", "mall",
  "shopping", "shop", "palace", "church", "cathedral", "temple", "shrine",
  "basilica", "castle",
];

function pickEmoji(text) {
  if (text.includes("museum")) return "ðŸ›ï¸";
  if (text.includes("park") || text.includes("garden")) return "ðŸŒ³";
  if (text.includes("hike") || text.includes("trek")) return "ðŸ¥¾";
  if (text.includes("beach")) return "ðŸ–ï¸";
  if (text.includes("temple") || text.includes("shrine")) return "â›©ï¸";
  if (text.includes("market")) return "ðŸ›ï¸";
  if (text.includes("restaurant") || text.includes("dinner") || text.includes("lunch")) return "ðŸ½ï¸";
  if (text.includes("cafe") || text.includes("cafÃ©") || text.includes("coffee")) return "â˜•";
  if (text.includes("palace") || text.includes("castle")) return "ðŸ°";
  if (text.includes("church") || text.includes("cathedral")) return "â›ª";
  if (text.includes("bridge")) return "ðŸŒ‰";
  if (text.includes("waterfall")) return "ðŸ’¦";
  if (text.includes("mountain")) return "â›°ï¸";
  if (text.includes("lake") || text.includes("river")) return "ðŸžï¸";
  if (text.includes("zoo")) return "ðŸ¦";
  if (text.includes("aquarium")) return "ðŸ ";
  if (text.includes("shopping") || text.includes("shop")) return "ðŸ›ï¸";
  if (text.includes("show") || text.includes("concert")) return "ðŸŽ­";
  if (text.includes("spa")) return "ðŸ’†";
  return "ðŸ“";
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Forecast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Optimizer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
        {day.max}Â°<span>/{day.min}Â°</span>
      </div>
      <div className={`wai-weather-day-rain ${rainy ? "warn" : ""}`}>
        â˜” {day.rain}%
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
            Day {index + 1} Â· {weekdayShort(day.date)}
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
          <div className="wai-day-col-empty">Free day â€” nothing scheduled</div>
        ) : (
          activities.map((a) => <ActivityCard key={a.id} activity={a} />)
        )}
      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
        icon: "ðŸŒ¤ï¸",
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
            â† Back to trip
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
            â† Back to trip
          </Link>
        )}

        <header className="wai-header">
          <div className="wai-tag">
            <span className="wai-pulse" />
            {isRealTrip ? "Your trip Â· Smart Weather" : "â­â­â­â­â­ Â· Smart Weather"}
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
                  <span className="wai-field-icon">ðŸ“</span>
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
                  <span className="wai-field-icon">ðŸ“…</span>
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
                  <span className="wai-field-icon">â±ï¸</span>
                  <input type="text" value="7 days" readOnly />
                </div>
              </div>
              <button
                className="wai-btn-primary"
                onClick={() => setMode("optimized")}
                disabled={state.status !== "ready"}
              >
                <span>âœ¨</span>
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
                  <span className="wai-field-icon">ðŸ“</span>
                  <input type="text" value={destination.name} readOnly />
                </div>
              </div>
              <div className="wai-field">
                <label className="wai-field-label">Start</label>
                <div className="wai-field-input">
                  <span className="wai-field-icon">ðŸ“…</span>
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
                  <span className="wai-field-icon">ðŸ</span>
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
                âœ¨ Smart Weather
              </button>
              <button
                className={`wai-mode-btn ${mode === "naive" ? "active" : ""}`}
                onClick={() => setMode("naive")}
              >
                ðŸ—“ï¸ Original order
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
                  Live weather loaded for <strong>{destination?.name}</strong> Â·{" "}
                  {state.days.length} days Â· avg rain {avgRain}%
                </>
              ) : (
                <>
                  Live data unavailable â€” showing estimate for{" "}
                  <strong>{destination?.name}</strong>
                </>
              )}
            </span>
          </div>
        )}
        {state.status === "loading" && (
          <div className="wai-status-banner">
            <span className="wai-dot" />
            <span>Checking weather and adjusting your planâ€¦</span>
          </div>
        )}

        {state.status === "ready" && (
          <>
            <div className="wai-section-head">
              <h2 className="wai-section-title">
                Trip <span>Weather</span>
              </h2>
              <span className="wai-section-hint">
                {state.days.filter((d) => d.rain < 20).length} sunny Â·{" "}
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
                  ? `Outdoor plans on sunny days Â· indoor on rainy`
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
                Outdoor activity â€” placed on sunny days
              </div>
              <div className="wai-legend-item">
                <span className="wai-legend-dot indoor" />
                Indoor activity â€” placed on rainy days
              </div>
              <div className="wai-legend-item">
                <span className="wai-legend-dot rainy" />
                Rainy day (50% or more rain)
              </div>
            </div>
          </>
        )}

        <footer className="wai-footer">
          <span>Live weather data Â· Smart scheduling</span>
          <span>AI Travel Planner Â© Smart Weather Plan</span>
        </footer>
      </main>
    </div>
  );
};

export default WeatherAwareItinerary;
```

### FILE: frontend\src\pages\WeatherTrips.css
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

### FILE: frontend\src\pages\WeatherTrips.jsx
```
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import WeatherIcon, { decodeWeatherCode } from "../components/WeatherIcon";
import "./WeatherTrips.css";

function pickEmoji(destination) {
  const t = (destination || "").toLowerCase();
  if (t.includes("bali") || t.includes("beach")) return "ðŸï¸";
  if (t.includes("tokyo") || t.includes("japan")) return "ðŸ—¼";
  if (t.includes("kyoto")) return "â›©ï¸";
  if (t.includes("new york") || t.includes("nyc")) return "ðŸ—½";
  if (t.includes("paris") || t.includes("france")) return "ðŸ¥";
  if (t.includes("rome") || t.includes("italy")) return "ðŸ›ï¸";
  if (t.includes("iceland") || t.includes("reyk")) return "ðŸŒ‹";
  if (t.includes("marrakech") || t.includes("morocco")) return "ðŸ•Œ";
  if (t.includes("dubai")) return "ðŸŒ‡";
  if (t.includes("london")) return "ðŸŽ¡";
  if (t.includes("india") || t.includes("goa") || t.includes("delhi")) return "ðŸ›•";
  return "âœˆï¸";
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
            <div className="wt-empty-icon">ðŸŒ¤ï¸</div>
            <div className="wt-empty-title">No trips yet</div>
            <p className="wt-empty-text">
              Create a trip first, then come back here to see its weather plan.
            </p>
            <Link to="/trips/new" className="wt-btn-primary">
              âœ¨ Create a trip
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
                    View weather plan â†’
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <footer className="wt-footer">
          <span>Live data from Open-Meteo</span>
          <span>AI Travel Planner Â© Weather</span>
        </footer>
      </main>
    </div>
  );
};

export default WeatherTrips;
```

### FILE: frontend\src\utils\coverArt.js
```
// frontend/src/utils/coverArt.js
// Generates an AI image URL for a trip using Pollinations.ai (free, no key).

/**
 * Build a good image prompt from the trip data.
 * @param {Object} trip
 * @returns {string}
 */
function buildPrompt(trip) {
  const dest = trip.destination || "a beautiful destination";
  const interests = Array.isArray(trip.interests)
    ? trip.interests.filter(Boolean).slice(0, 3)
    : [];

  const parts = [
    `stunning travel photography of ${dest}`,
    interests.length ? interests.join(", ") : "",
    "golden hour lighting, vibrant colors, cinematic composition, high detail, 4k, professional shot",
  ];

  return parts.filter(Boolean).join(", ");
}

/**
 * Build the Pollinations URL.
 * Uses a seed so the image is deterministic per trip + regeneration count.
 * @param {Object} trip
 * @param {number} seed
 * @returns {string}
 */
export function buildCoverArtUrl(trip, seed = 1) {
  const prompt = buildPrompt(trip);
  const encoded = encodeURIComponent(prompt);
  const tripSeed =
    (trip._id || trip.destination || "trip")
      .split("")
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + seed * 1000;

  return (
    `https://image.pollinations.ai/prompt/${encoded}` +
    `?width=1200&height=630&nologo=true&seed=${tripSeed}`
  );
}

/**
 * Preload an image so we know it's ready before swapping the src.
 * @param {string} url
 * @returns {Promise<boolean>}
 */
export function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}
```

### FILE: frontend\src\utils\ics.js
```
// frontend/src/utils/ics.js
// Generates a standard .ics calendar file from a trip.
// Spec: RFC 5545

const pad = (n) => String(n).padStart(2, "0");

function toICSDate(date) {
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    "00Z"
  );
}

function escapeICS(text) {
  if (!text) return "";
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/* Parse "09:00 AM" or "Morning" or "All day" into { hour, minute } */
function parseTime(timeStr) {
  if (!timeStr) return { hour: 9, minute: 0 };
  const s = String(timeStr).trim();

  // "09:00 AM" / "9:30 PM" / "14:00"
  const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2] || "0", 10);
    const ap = ampm[3].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return { hour: h, minute: m };
  }

  // "14:00" / "9:30"
  const hhmm = s.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    return {
      hour: parseInt(hhmm[1], 10),
      minute: parseInt(hhmm[2], 10),
    };
  }

  // Named times
  const named = s.toLowerCase();
  if (named.includes("morning")) return { hour: 9, minute: 0 };
  if (named.includes("afternoon")) return { hour: 14, minute: 0 };
  if (named.includes("evening")) return { hour: 18, minute: 0 };
  if (named.includes("night")) return { hour: 20, minute: 0 };
  if (named.includes("dawn")) return { hour: 6, minute: 0 };
  if (named.includes("midday") || named.includes("noon"))
    return { hour: 12, minute: 0 };
  if (named.includes("all day") || named.includes("full day"))
    return { hour: 9, minute: 0 };

  return { hour: 9, minute: 0 };
}

function eventDurationHours(title) {
  const t = (title || "").toLowerCase();
  if (/full day|all day/.test(t)) return 8;
  if (/hike|trek|tour|day trip/.test(t)) return 3;
  if (/dinner|lunch|breakfast|meal/.test(t)) return 2;
  if (/museum|temple|shrine|visit/.test(t)) return 2;
  return 2;
}

/**
 * Build the .ics content string from a trip object.
 * @param {Object} trip - MongoDB trip document
 * @returns {string} ICS file content
 */
export function generateICS(trip) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI Travel Planner//Trip Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICS(trip.destination || "Trip")}`,
    `X-WR-CALDESC:${escapeICS(
      `Itinerary for ${trip.destination || "trip"}`
    )}`,
  ];

  const tripStart = new Date(trip.startDate || Date.now());
  const destination = trip.destination || "Trip";

  // Hero event on day 1
  lines.push(
    "BEGIN:VEVENT",
    `UID:trip-start-${trip._id || Date.now()}@aitravelplanner`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(tripStart)}`,
    `DTEND:${toICSDate(
      new Date(tripStart.getTime() + 60 * 60 * 1000)
    )}`,
    `SUMMARY:${escapeICS("âœˆï¸ Arrive â€” " + destination)}`,
    `DESCRIPTION:${escapeICS(
      `Trip starts. ${trip.travellers || 1} traveller(s), budget â‚¹${
        trip.budget || 0
      }.`
    )}`,
    `LOCATION:${escapeICS(destination)}`,
    "END:VEVENT"
  );

  // Each activity becomes an event
  (trip.itinerary || []).forEach((day, dayIdx) => {
    const dayDate = new Date(tripStart);
    dayDate.setDate(dayDate.getDate() + dayIdx);

    (day.activities || []).forEach((act, actIdx) => {
      const { hour, minute } = parseTime(act.time);
      const start = new Date(dayDate);
      start.setHours(hour, minute, 0, 0);

      const durationH = eventDurationHours(act.title);
      const end = new Date(start.getTime() + durationH * 60 * 60 * 1000);

      const desc = [
        act.description,
        act.cost ? `Cost: â‚¹${act.cost} per person` : "",
        act.location ? `Location: ${act.location}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      lines.push(
        "BEGIN:VEVENT",
        `UID:day${dayIdx}-act${actIdx}-${trip._id || Date.now()}@aitravelplanner`,
        `DTSTAMP:${toICSDate(new Date())}`,
        `DTSTART:${toICSDate(start)}`,
        `DTEND:${toICSDate(end)}`,
        `SUMMARY:${escapeICS("ðŸ“ " + (act.title || "Activity"))}`,
        `DESCRIPTION:${escapeICS(desc)}`,
        `LOCATION:${escapeICS(act.location || destination)}`,
        "END:VEVENT"
      );
    });
  });

  // Hotels as optional events on check-in day
  (trip.hotels || []).forEach((hotel, hIdx) => {
    const checkIn = new Date(tripStart);
    const start = new Date(checkIn);
    start.setHours(15, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    lines.push(
      "BEGIN:VEVENT",
      `UID:hotel${hIdx}-${trip._id || Date.now()}@aitravelplanner`,
      `DTSTAMP:${toICSDate(new Date())}`,
      `DTSTART:${toICSDate(start)}`,
      `DTEND:${toICSDate(end)}`,
      `SUMMARY:${escapeICS("ðŸ¨ " + (hotel.name || "Hotel"))}`,
      `DESCRIPTION:${escapeICS(
        [
          hotel.address,
          hotel.price ? `Price: ${hotel.price}` : "",
          hotel.rating ? `Rating: ${hotel.rating}â˜…` : "",
        ]
          .filter(Boolean)
          .join("\n")
      )}`,
      `LOCATION:${escapeICS(hotel.address || destination)}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");

  // ICS requires CRLF line endings
  return lines.join("\r\n");
}

/**
 * Trigger the browser to download the trip's .ics file.
 */
export function downloadICS(trip) {
  if (!trip) return;
  const content = generateICS(trip);
  const blob = new Blob([content], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const filename =
    (trip.destination || "trip").replace(/\s+/g, "-").toLowerCase() +
    "-itinerary.ics";
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return filename;
}
```

