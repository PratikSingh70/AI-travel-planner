import Trip from "../models/Trip.js";
import crypto from "node:crypto";
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

    const start = new Date(startDate);
    const end = new Date(endDate);
    const numericBudget = Number(budget);
    const numericTravellers = Number(travellers || 1);

    if (!destination || !startDate || !endDate || !Number.isFinite(numericBudget)) {
      return res
        .status(400)
        .json({ message: "Destination, dates and a valid budget are required" });
    }

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ message: "End date must be after start date" });
    }

    if (!Number.isInteger(numericTravellers) || numericTravellers < 1) {
      return res.status(400).json({ message: "Travellers must be at least 1" });
    }

    const trip = await Trip.create({
      user: req.user._id,
      destination,
      startDate,
      endDate,
      budget: numericBudget,
      travellers: numericTravellers,
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

    const allowed = [
      "destination",
      "startDate",
      "endDate",
      "budget",
      "travellers",
      "spotsCount",
      "interests",
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.startDate || updates.endDate) {
      const start = new Date(updates.startDate ?? trip.startDate);
      const end = new Date(updates.endDate ?? trip.endDate);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return res.status(400).json({ message: "End date must be after start date" });
      }
    }

    if (updates.budget !== undefined && !Number.isFinite(Number(updates.budget))) {
      return res.status(400).json({ message: "Budget must be a valid number" });
    }

    if (updates.travellers !== undefined) {
      const travellers = Number(updates.travellers);
      if (!Number.isInteger(travellers) || travellers < 1) {
        return res.status(400).json({ message: "Travellers must be at least 1" });
      }
    }

    const updated = await Trip.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

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

    const safeImages = async (query) => {
      try {
        const imgs = await getPlaceImages(query, 1);
        return imgs[0] || null;
      } catch {
        return null;
      }
    };

    const hotelsWithImages = await Promise.all(
      (trip.hotels || []).map(async (h) => ({
        ...h.toObject?.() || h,
        image: await safeImages(`${h.name || "hotel"} hotel`),
      }))
    );

    const itineraryWithImages = await Promise.all(
      (trip.itinerary || []).map(async (day) => {
        const acts = await Promise.all(
          (day.activities || []).map(async (act) => ({
            ...act,
            image: await safeImages(act.title || trip.destination),
          }))
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
      let created = false;

      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        const id = crypto.randomBytes(6).toString("base64url");
        const exists = await Trip.exists({ shareId: id });

        if (!exists) {
          trip.shareId = id;
          await trip.save();
          created = true;
        }
      }

      if (!created) {
        return res.status(500).json({ message: "Could not create share link" });
      }
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