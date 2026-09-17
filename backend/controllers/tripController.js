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

    // ---- Try Gemini first, fall back to Groq ----
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

    // Attach Pexels photos to hotels and activities (parallel)
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

    const location = await geocode(trip.destination);
    const weather = await getWeather(location.lat, location.lng);

    res.json({
      location,
      current: weather.current,
      daily: weather.daily,
    });
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