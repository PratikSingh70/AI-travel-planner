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
} from "../controllers/tripController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// public utility route
router.get("/photo", protect, searchPhotos);

// all other routes require login
router.use(protect);

router.route("/").post(createTrip).get(getTrips);
router.post("/:id/generate", generateTripItinerary);
router.get("/:id/weather", getTripWeather);
router.get("/:id/image", getTripImage);
router.get("/:id/places", getTripPlaces);
router.route("/:id").get(getTripById).put(updateTrip).delete(deleteTrip);

export default router;