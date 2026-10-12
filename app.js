require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const Delivery = require("./models/Delivery");
const Counter = require("./models/Counter");
const Requisition = require("./models/Requisition");

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

/* ----- Requisitions API ----- */

/* Today's date used as the decision date */
function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

// Retrieve every requisition, oldest first
app.get("/api/requisitions", async (req, res) => {
  try {
    const requisitions = await Requisition.find().sort({ createdAt: 1 });
    res.set("Cache-Control", "no-store");
    res.json(requisitions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load requisitions." });
  }
});

// Receive a new requisition from the form and store it as Pending
app.post("/api/requisitions", async (req, res) => {
  console.log("Received requisition:", req.body);
  try {
    const { requestedBy, department, dateSubmitted, items, reason } =
      req.body || {};

    const requisition = new Requisition({
      requestedBy,
      department,
      dateSubmitted,
      items,
      reason,
    });

    await requisition.validate([
      "requestedBy",
      "department",
      "dateSubmitted",
      "items",
      "reason",
    ]);

    requisition.reqNumber = await nextId("requisition", "REQ");
    await requisition.save();
    res.status(201).json(requisition);
  } catch (error) {
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((e) => e.message)
        .join(" ");
      return res.status(400).json({ error: message });
    }
    console.error(error);
    res.status(500).json({ error: "Could not save the requisition." });
  }
});

app.post("/api/requisitions/release", async (req, res) => {
  const poId = req.body && req.body.poId;
  if (typeof poId !== "string" || poId.trim() === "") {
    return res
      .status(400)
      .json({ error: "A purchase order number is required." });
  }
  try {
    const result = await Requisition.updateMany(
      { poId: poId.trim() },
      { $unset: { poId: "" } },
    );
    res.json({ released: result.modifiedCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not release the requisition." });
  }
});

// Change one requisition
app.patch("/api/requisitions/:id", async (req, res) => {
  try {
    const { status, decidedBy, remarks, poId } = req.body || {};
    let filter;
    let update;
    let conflictMessage;

    if (status === "Approved" || status === "Rejected") {
      if (
        typeof decidedBy !== "string" ||
        decidedBy.trim() === "" ||
        decidedBy.length > 100
      ) {
        return res.status(400).json({ error: "Decided by is required." });
      }
      if (
        remarks !== undefined &&
        (typeof remarks !== "string" || remarks.length > 500)
      ) {
        return res
          .status(400)
          .json({ error: "Remarks must be 500 characters or fewer." });
      }
      filter = { status: "Pending" };
      update = {
        $set: {
          status,
          decidedBy: decidedBy.trim(),
          dateDecided: todayIso(), // the server's date, not the browser's
          remarks: (remarks || "").trim(),
        },
      };
      conflictMessage =
        "This requisition is no longer pending. Someone may have already decided it.";
    } else if (status === "Withdrawn") {
      filter = { status: "Pending" };
      update = { $set: { status } };
      conflictMessage = "Only a pending requisition can be withdrawn.";
    } else if (status === "Cancelled") {
      filter = { status: "Approved", poId: { $exists: false } };
      update = { $set: { status } };
      conflictMessage =
        "Only an approved requisition without a purchase order can be cancelled.";
    } else if (
      status === undefined &&
      typeof poId === "string" &&
      poId.trim() !== ""
    ) {
      filter = { status: "Approved", poId: { $exists: false } };
      update = { $set: { poId: poId.trim() } };
      conflictMessage =
        "This requisition is not available for a new purchase order.";
    } else {
      return res.status(400).json({ error: "That change is not supported." });
    }

    const updated = await Requisition.findOneAndUpdate(
      { reqNumber: req.params.id, ...filter },
      update,
      { returnDocument: "after", runValidators: true },
    );

    if (!updated) {
      const exists = await Requisition.exists({ reqNumber: req.params.id });
      return exists
        ? res.status(409).json({ error: conflictMessage })
        : res.status(404).json({ error: "Requisition not found." });
    }
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not update the requisition." });
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
