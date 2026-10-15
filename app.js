require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const Delivery = require("./models/Delivery");
const Counter = require("./models/Counter");
const Requisition = require("./models/Requisition");
const PurchaseOrder = require("./models/PurchaseOrder");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(express.json({ limit: "100kb" }));

// Only these files and folders can be downloaded; everything else gets a 404
const PUBLIC_PATH =
  /^\/(?:[\w-]+\.(?:html|css)|rbac\.js|script\.js|js\/[\w-]+\.js|resources\/.+)?$/;
app.use((req, res, next) => {
  let requested;
  try {
    requested = decodeURIComponent(req.path);
  } catch (error) {
    return res.status(400).send("Bad request");
  }
  requested = path.posix
    .normalize("/" + requested.replace(/\\/g, "/"))
    .toLowerCase();
  if (requested.startsWith("/api/")) return next(); // the API has its own rules
  if (!PUBLIC_PATH.test(requested)) return res.status(404).send("Not found");
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

    // The receipt must be for a purchase order that is still waiting for delivery.
    const isComplete = delivery.condition === "Complete & Good Condition";
    let closedOrder = null;
    let available;
    if (isComplete) {
      closedOrder = await PurchaseOrder.findOneAndUpdate(
        { poNumber: delivery.poId, status: "Active" },
        { $set: { status: "Delivered" } },
      );
      available = Boolean(closedOrder);
    } else {
      available = Boolean(
        await PurchaseOrder.exists({
          poNumber: delivery.poId,
          status: "Active",
        }),
      );
    }
    if (!available) {
      const known = await PurchaseOrder.exists({ poNumber: delivery.poId });
      return known
        ? res
            .status(409)
            .json({ error: "This purchase order is not waiting for delivery." })
        : res.status(404).json({ error: "Purchase order not found." });
    }

    try {
      delivery.drNumber = await nextId("delivery", "DR");
      await delivery.save();
    } catch (saveError) {
      // Put the order back if the receipt could not be saved
      if (closedOrder) {
        await PurchaseOrder.updateOne(
          { poNumber: delivery.poId, status: "Delivered" },
          { $set: { status: "Active" } },
        );
      }
      throw saveError;
    }
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

// Change one requisition
app.patch("/api/requisitions/:id", async (req, res) => {
  try {
    const { status, decidedBy, remarks } = req.body || {};
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

/* ----- Purchase orders API ----- */

const toCents = (amount) => Math.round(amount * 100);

/* A wrong total can't be sent from the browser. */
function computeTotals(order) {
  let subtotalCents = 0;
  order.items.forEach((item) => {
    const lineCents = toCents(item.quantity * item.unitPrice);
    item.lineTotal = lineCents / 100;
    subtotalCents += lineCents;
  });
  const taxCents = Math.round(subtotalCents * (order.taxRate / 100));
  const shippingCents = toCents(order.shipping);
  order.subtotal = subtotalCents / 100;
  order.tax = taxCents / 100;
  order.total = (subtotalCents + taxCents + shippingCents) / 100;
}

/* An empty box in the form means "use the default" */
const blankToUndefined = (value) =>
  value === "" || value === null ? undefined : value;

// Retrieve every purchase order, oldest first
app.get("/api/purchase-orders", async (req, res) => {
  try {
    const orders = await PurchaseOrder.find().sort({ createdAt: 1 });
    res.set("Cache-Control", "no-store");
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load purchase orders." });
  }
});

// Receive a new purchase order, work out its totals
app.post("/api/purchase-orders", async (req, res) => {
  console.log("Received purchase order:", req.body);
  let claimToken = null;
  try {
    const body = req.body || {};

    // The number, status and all amounts are never taken from the browser
    const order = new PurchaseOrder({
      requisitionId: body.requisitionId,
      dateCreated: body.dateCreated,
      requisitioner: body.requisitioner,
      department: body.department,
      vendor: body.vendor,
      shipToName: body.shipToName,
      shipToAddress: body.shipToAddress,
      shipToPhone: body.shipToPhone,
      shipVia: body.shipVia,
      fob: body.fob,
      shippingTerms: body.shippingTerms,
      expectedDelivery: body.expectedDelivery,
      items: body.items,
      taxRate: blankToUndefined(body.taxRate),
      shipping: blankToUndefined(body.shipping),
      notes: body.notes,
    });

    await order.validate([
      "requisitionId",
      "dateCreated",
      "requisitioner",
      "department",
      "vendor",
      "shipToName",
      "shipToAddress",
      "shipToPhone",
      "shipVia",
      "fob",
      "shippingTerms",
      "expectedDelivery",
      "items",
      "taxRate",
      "shipping",
      "notes",
    ]);
    computeTotals(order);

    // Claim the requisition first, so two people can't both make a PO from it
    claimToken = "claim-" + new mongoose.Types.ObjectId().toString();
    const claimed = await Requisition.findOneAndUpdate(
      {
        reqNumber: order.requisitionId,
        status: "Approved",
        poId: { $exists: false },
      },
      { $set: { poId: claimToken } },
    );
    if (!claimed) {
      claimToken = null;
      const known = await Requisition.exists({
        reqNumber: order.requisitionId,
      });
      return known
        ? res.status(409).json({
            error:
              "This requisition is not available for a new purchase order.",
          })
        : res.status(404).json({ error: "Requisition not found." });
    }

    order.poNumber = await nextId("purchaseOrder", "PO");
    await order.save();

    // Replace the temporary claim with the real PO number
    await Requisition.updateOne(
      { reqNumber: order.requisitionId, poId: claimToken },
      { $set: { poId: order.poNumber } },
    );
    claimToken = null;
    res.status(201).json(order);
  } catch (error) {
    // Give the requisition back if the order could not be saved
    if (claimToken) {
      await Requisition.updateOne(
        { poId: claimToken },
        { $unset: { poId: "" } },
      ).catch((undoError) => console.error(undoError));
    }
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((e) => e.message)
        .join(" ");
      return res.status(400).json({ error: message });
    }
    console.error(error);
    res.status(500).json({ error: "Could not save the purchase order." });
  }
});

// Cancel an active purchase order and free its requisition for a new PO.
app.patch("/api/purchase-orders/:id", async (req, res) => {
  try {
    if (!req.body || req.body.status !== "Cancelled") {
      return res.status(400).json({ error: "That change is not supported." });
    }
    const updated = await PurchaseOrder.findOneAndUpdate(
      { poNumber: req.params.id, status: "Active" },
      { $set: { status: "Cancelled" } },
      { returnDocument: "after" },
    );
    if (!updated) {
      const known = await PurchaseOrder.exists({ poNumber: req.params.id });
      return known
        ? res
            .status(409)
            .json({ error: "Only an active purchase order can be cancelled." })
        : res.status(404).json({ error: "Purchase order not found." });
    }
    await Requisition.updateMany(
      { poId: updated.poNumber },
      { $unset: { poId: "" } },
    );
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not cancel the purchase order." });
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
