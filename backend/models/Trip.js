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
    // ─── NEW: unique share identifier for public links ───
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