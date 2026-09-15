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
} from "../controllers/tripController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// all trip routes require login
router.use(protect);

router.route("/").post(createTrip).get(getTrips);
router.post("/:id/generate", generateTripItinerary);
router.get("/:id/weather", getTripWeather);
router.route("/:id").get(getTripById).put(updateTrip).delete(deleteTrip);
router.get("/:id/image", getTripImage);
router.get("/:id/places", getTripPlaces);

export default router;