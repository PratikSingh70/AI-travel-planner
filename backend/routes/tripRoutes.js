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