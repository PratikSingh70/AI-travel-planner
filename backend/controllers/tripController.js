import { getTouristPlaces } from "../services/placesService.js";
import { getDestinationImage } from "../services/imageService.js";
import { geocode, getWeather } from "../services/weatherService.js";
import Trip from "../models/Trip.js";
import { generateItinerary } from "../services/geminiService.js";

// CREATE - POST /api/trips
export const createTrip = async (req, res) => {
  try {
    const { destination, startDate, endDate, budget, travellers, interests } =
      req.body;

    if (!destination || !startDate || !endDate || !budget) {
      return res.status(400).json({ message: "Please fill all required fields" });
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
    res.json(trips);
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

    // call Gemini
    const itinerary = await generateItinerary(trip);

    // save to trip
    trip.itinerary = itinerary.days;
    await trip.save();

    res.json({
      message: "Itinerary generated",
      itinerary: trip.itinerary,
    });
    } catch (error) {
    console.error("Gemini error:", error);
    const raw = error.message || "";
    let friendly = "AI generation failed. Please try again.";

    if (raw.includes("503") || raw.includes("UNAVAILABLE") || raw.includes("high demand")) {
      friendly = "Gemini is busy right now. Please wait a moment and try again.";
    } else if (raw.includes("API key not valid")) {
      friendly = "Gemini API key is invalid. Check backend .env.";
    } else if (raw.includes("quota") || raw.includes("429")) {
      friendly = "Rate limit reached. Wait about a minute and retry.";
    } else if (raw.includes("valid JSON")) {
      friendly = "AI returned invalid JSON. Please retry.";
    }

    res.status(500).json({ message: friendly });
  }
};
// GET WEATHER FOR DESTINATION - GET /api/trips/:id/weather
export const getTripWeather = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) return res.status(404).json({ message: "Trip not found" });
    if (trip.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // geocode destination (with a tiny cache in the trip doc, optional)
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

    // geocode destination using existing weatherService helper
    const location = await geocode(trip.destination);
    const places = await getTouristPlaces(location.lat, location.lng);

    res.json({ location, places });
  } catch (error) {
    console.error("Places error:", error);
    res.status(500).json({ message: error.message || "Places fetch failed" });
  }
};