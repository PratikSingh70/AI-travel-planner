// backend/config/db.js
import dns from "node:dns/promises";
import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────
// Fix 1: Force Node to use public DNS.
// Solves "querySrv ETIMEOUT" errors caused by ISP DNS blocking.
// ─────────────────────────────────────────────────────────────
dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

let isConnected = false;
let retryTimer = null;
let keepAliveTimer = null;

// ─────────────────────────────────────────────────────────────
// Fix 2: Connect with proper pool + timeout settings.
// These prevent "connection reset" issues under load and after idle.
// ─────────────────────────────────────────────────────────────
const connectDB = async () => {
  if (isConnected) {
    console.log("MongoDB already connected");
    return mongoose.connection;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set in .env");
  }

  try {
    const conn = await mongoose.connect(uri, {
      // Prevent long hangs
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,

      // Connection pool — reuse sockets efficiently
      maxPoolSize: 10,
      minPoolSize: 1,

      // Retry writes automatically on transient failures
      retryWrites: true,
      retryReads: true,

      // Heartbeat: keeps socket alive during idle (Atlas free tier)
      heartbeatFrequencyMS: 10000,
    });

    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // ─────────────────────────────────────────────────────
    // Fix 3: Handle disconnects and auto-reconnect.
    // ─────────────────────────────────────────────────────
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected — scheduling reconnect...");
      isConnected = false;
      scheduleReconnect();
    });

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB runtime error:", err.message);
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
      isConnected = true;
    });

    // ─────────────────────────────────────────────────────
    // Fix 4: Keepalive ping every 4 minutes.
    // Prevents the free-tier Atlas cluster from pausing / idling out.
    // ─────────────────────────────────────────────────────
    if (keepAliveTimer) clearInterval(keepAliveTimer);
    keepAliveTimer = setInterval(async () => {
      try {
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.db.admin().ping();
        }
      } catch (err) {
        console.warn("Keepalive ping failed:", err.message);
      }
    }, 4 * 60 * 1000); // every 4 minutes

    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    isConnected = false;
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────
// Fix 5: Retry with exponential backoff on failure.
// ─────────────────────────────────────────────────────────────
const scheduleReconnect = (attempt = 1) => {
  if (retryTimer) clearTimeout(retryTimer);

  const delay = Math.min(30000, 1000 * Math.pow(2, attempt)); // 2s, 4s, 8s, 16s, 30s max
  console.log(`Reconnecting in ${delay / 1000}s (attempt ${attempt})...`);

  retryTimer = setTimeout(async () => {
    try {
      await connectDB();
    } catch (err) {
      scheduleReconnect(attempt + 1);
    }
  }, delay);
};

// ─────────────────────────────────────────────────────────────
// Graceful shutdown — close connection on Ctrl+C / SIGTERM
// ─────────────────────────────────────────────────────────────
export const disconnectDB = async () => {
  if (keepAliveTimer) clearInterval(keepAliveTimer);
  if (retryTimer) clearTimeout(retryTimer);
  await mongoose.connection.close();
  console.log("MongoDB connection closed");
};

process.on("SIGINT", async () => {
  await disconnectDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectDB();
  process.exit(0);
});

export default connectDB;