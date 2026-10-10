require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const Delivery = require("./models/Delivery");
const Counter = require("./models/Counter");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(express.json({ limit: "100kb" }));

const PRIVATE_PATHS = [
  "/app.js",
  "/package.json",
  "/package-lock.json",
  "/node_modules",
  "/models",
  "/.env",
  "/test-deliveries.js",
];
app.use((req, res, next) => {
  let requested;
  try {
    requested = decodeURIComponent(req.path);
  } catch (error) {
    return res.status(400).send("Bad request");
  }
  requested = requested.replace(/\\/g, "/").toLowerCase();
  const blocked = PRIVATE_PATHS.some(
    (p) => requested === p || requested.startsWith(p + "/"),
  );
  if (blocked) return res.status(404).send("Not found");
  next();
});

/* Hands out the next number for a record type */
async function nextId(type, prefix) {
  const counter = await Counter.findByIdAndUpdate(
    type,
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true },
  );
  return prefix + "-" + (1000 + counter.seq);
}

/* ----- Delivery receipts API ----- */

// Retrieve every stored delivery receipt, oldest first
app.get("/api/deliveries", async (req, res) => {
  try {
    const deliveries = await Delivery.find().sort({ createdAt: 1 });
    res.set("Cache-Control", "no-store");
    res.json(deliveries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load delivery receipts." });
  }
});

// Receive a new delivery receipt from the form and store it
app.post("/api/deliveries", async (req, res) => {
  console.log("Received delivery receipt:", req.body); // shows each submission in the terminal
  try {
    const {
      poId,
      dateReceived,
      receivedBy,
      condition,
      remarks,
      proofFileName,
    } = req.body || {};

    const delivery = new Delivery({
      poId,
      dateReceived,
      receivedBy,
      condition,
      remarks,
      proofFileName,
    });

    // Check the form's fields first, so a bad request doesn't use up a DR number
    await delivery.validate([
      "poId",
      "dateReceived",
      "receivedBy",
      "condition",
      "remarks",
      "proofFileName",
    ]);

    delivery.drNumber = await nextId("delivery", "DR");
    await delivery.save();
    res.status(201).json(delivery);
  } catch (error) {
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((e) => e.message)
        .join(" ");
      return res.status(400).json({ error: message });
    }
    console.error(error);
    res.status(500).json({ error: "Could not save the delivery receipt." });
  }
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found." });
});

/* ----- The website itself ----- */

app.use(express.static(__dirname));

// The home page: http://localhost:3000/
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body is not valid JSON." });
  }
  console.error(err);
  res.status(500).json({ error: "Server error." });
});

/* ----- Connect to MongoDB, then start listening ----- */

if (!MONGODB_URI) {
  console.error(
    "MONGODB_URI is missing. Add it to a .env file (see .env.example).",
  );
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 }) // give up after 5 seconds if MongoDB is not running
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log("ProcureIT running at http://localhost:" + PORT);
    });
  })
  .catch((error) => {
    console.error("Could not connect to MongoDB:", error.message);
    process.exit(1);
  });
