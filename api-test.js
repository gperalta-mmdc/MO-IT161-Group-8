/* ProcureIT API check: walks the whole workflow and tries the failure cases.
   Run the server first (npm start), then in a second terminal:  node api-test.js
   Optional: node api-test.js http://localhost:3000
   Needs Node 18+ (built-in fetch). Everything it creates is labelled "API-TEST". */

const http = require("node:http");

const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const TAG = "API-TEST";

let passed = 0;
let failed = 0;

function ok(label, condition, detail) {
  if (condition) {
    passed++;
    console.log("PASS  " + label);
  } else {
    failed++;
    console.log("FAIL  " + label + (detail ? "  ->  " + detail : ""));
  }
}

async function call(method, path, body) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const response = await fetch(BASE + path, options);
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
}

/* A GET that sends the path exactly as written (fetch would tidy "/./" away) */
function rawGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE);
    const req = http.request(
      { host: url.hostname, port: url.port || 80, path, method: "GET" },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

const today = new Date().toISOString().slice(0, 10);

function newRequisition(extra) {
  return {
    requestedBy: TAG + " Requester",
    department: "IT",
    dateSubmitted: today,
    items: [{ description: "Laptop", quantity: 2, unit: "pcs" }],
    reason: "automated check",
    ...extra,
  };
}

function newPo(requisitionId, extra) {
  return {
    requisitionId,
    dateCreated: today,
    requisitioner: TAG,
    department: "IT",
    vendor: "Test Vendor",
    shipToName: TAG,
    shipToAddress: "Makati",
    shipToPhone: "",
    shipVia: "Courier",
    fob: "Destination",
    shippingTerms: "Net 30",
    expectedDelivery: "",
    items: [
      { itemNo: "", description: "Laptop", quantity: 2, unitPrice: 45999.5 },
      { itemNo: "", description: "Mouse", quantity: 3, unitPrice: "350.10" },
    ],
    taxRate: "12",
    shipping: "100",
    notes: "",
    ...extra,
  };
}

function newDelivery(poId, condition, extra) {
  return {
    poId,
    dateReceived: today,
    receivedBy: TAG,
    condition,
    remarks: "",
    proofFileName: "",
    ...extra,
  };
}

const COMPLETE = "Complete & Good Condition";
const PARTIAL = "Partial Delivery";

async function createApproved() {
  const created = await call("POST", "/api/requisitions", newRequisition());
  const id = created.json && created.json.id;
  await call("PATCH", "/api/requisitions/" + id, {
    status: "Approved",
    decidedBy: TAG + " Approver",
    remarks: "",
  });
  return id;
}

async function createActivePo() {
  const reqId = await createApproved();
  const po = await call("POST", "/api/purchase-orders", newPo(reqId));
  return { reqId, poId: po.json && po.json.id };
}

async function run() {
  console.log("Checking " + BASE + "\n");

  /* ----- Requisitions ----- */
  console.log("-- Requisitions --");
  const r1 = await call("POST", "/api/requisitions", newRequisition());
  ok("create requisition -> 201", r1.status === 201, r1.status);
  ok(
    "id looks like REQ-1001",
    /^REQ-\d+$/.test(r1.json && r1.json.id),
    r1.json && r1.json.id,
  );
  ok("new requisition starts Pending", r1.json && r1.json.status === "Pending");
  const reqId = r1.json && r1.json.id;

  const r2 = await call("POST", "/api/requisitions", newRequisition());
  ok(
    "ids are different and increasing",
    r2.json &&
      r2.json.id !== reqId &&
      Number(r2.json.id.slice(4)) > Number(reqId.slice(4)),
  );

  ok(
    "bad department -> 400",
    (
      await call(
        "POST",
        "/api/requisitions",
        newRequisition({ department: "Cafeteria" }),
      )
    ).status === 400,
  );
  ok(
    "no items -> 400",
    (await call("POST", "/api/requisitions", newRequisition({ items: [] })))
      .status === 400,
  );
  ok(
    "6 items -> 400",
    (
      await call(
        "POST",
        "/api/requisitions",
        newRequisition({
          items: Array(6).fill({ description: "x", quantity: 1, unit: "p" }),
        }),
      )
    ).status === 400,
  );
  ok(
    "fractional quantity -> 400",
    (
      await call(
        "POST",
        "/api/requisitions",
        newRequisition({
          items: [{ description: "x", quantity: 1.5, unit: "p" }],
        }),
      )
    ).status === 400,
  );
  ok(
    "bad date -> 400",
    (
      await call(
        "POST",
        "/api/requisitions",
        newRequisition({ dateSubmitted: "15/10/2026" }),
      )
    ).status === 400,
  );
  ok(
    "object instead of text -> 400",
    (
      await call(
        "POST",
        "/api/requisitions",
        newRequisition({ requestedBy: { $ne: null } }),
      )
    ).status === 400,
  );
  ok(
    "malformed JSON -> 400",
    (await call("POST", "/api/requisitions", "{ not json")).status === 400,
  );

  const tricky = '<img src=x onerror=alert(1)> & "quotes"';
  const r3 = await call(
    "POST",
    "/api/requisitions",
    newRequisition({ requestedBy: TAG + " " + tricky }),
  );
  ok(
    "odd characters are stored exactly as typed",
    r3.json && r3.json.requestedBy === TAG + " " + tricky,
  );

  /* ----- Approvals ----- */
  console.log("\n-- Approvals --");
  ok(
    "approve without decidedBy -> 400",
    (await call("PATCH", "/api/requisitions/" + reqId, { status: "Approved" }))
      .status === 400,
  );
  ok(
    "unknown status -> 400",
    (await call("PATCH", "/api/requisitions/" + reqId, { status: "Banana" }))
      .status === 400,
  );
  ok(
    "unknown requisition -> 404",
    (
      await call("PATCH", "/api/requisitions/REQ-999999", {
        status: "Approved",
        decidedBy: TAG,
      })
    ).status === 404,
  );

  const approved = await call("PATCH", "/api/requisitions/" + reqId, {
    status: "Approved",
    decidedBy: TAG + " Approver",
    remarks: "ok",
  });
  ok(
    "approve -> 200 and Approved",
    approved.status === 200 && approved.json.status === "Approved",
    approved.status,
  );
  ok(
    "server records decidedBy",
    approved.json && approved.json.decidedBy === TAG + " Approver",
  );
  ok(
    "server records dateDecided (YYYY-MM-DD)",
    approved.json &&
      /^\d{4}-\d{2}-\d{2}$/.test(approved.json.dateDecided || ""),
  );
  ok(
    "second approval -> 409",
    (
      await call("PATCH", "/api/requisitions/" + reqId, {
        status: "Approved",
        decidedBy: TAG,
      })
    ).status === 409,
  );
  ok(
    "reject after approve -> 409",
    (
      await call("PATCH", "/api/requisitions/" + reqId, {
        status: "Rejected",
        decidedBy: TAG,
      })
    ).status === 409,
  );
  ok(
    "withdraw after approve -> 409",
    (await call("PATCH", "/api/requisitions/" + reqId, { status: "Withdrawn" }))
      .status === 409,
  );

  const rejectMe = (await call("POST", "/api/requisitions", newRequisition()))
    .json.id;
  const rejected = await call("PATCH", "/api/requisitions/" + rejectMe, {
    status: "Rejected",
    decidedBy: TAG,
    remarks: "no budget",
  });
  ok(
    "reject -> 200 and Rejected",
    rejected.status === 200 && rejected.json.status === "Rejected",
  );

  const withdrawMe = (await call("POST", "/api/requisitions", newRequisition()))
    .json.id;
  ok(
    "withdraw pending -> 200",
    (
      await call("PATCH", "/api/requisitions/" + withdrawMe, {
        status: "Withdrawn",
      })
    ).status === 200,
  );
  ok(
    "approve a withdrawn one -> 409",
    (
      await call("PATCH", "/api/requisitions/" + withdrawMe, {
        status: "Approved",
        decidedBy: TAG,
      })
    ).status === 409,
  );

  const raceReq = (await call("POST", "/api/requisitions", newRequisition()))
    .json.id;
  const raceResults = await Promise.all(
    [1, 2, 3, 4, 5].map(() =>
      call("PATCH", "/api/requisitions/" + raceReq, {
        status: "Approved",
        decidedBy: TAG,
      }),
    ),
  );
  ok(
    "5 simultaneous approvals -> exactly one wins",
    raceResults.filter((r) => r.status === 200).length === 1,
    raceResults.map((r) => r.status).join(","),
  );

  /* ----- Purchase orders ----- */
  console.log("\n-- Purchase orders --");
  const pendingReq = (await call("POST", "/api/requisitions", newRequisition()))
    .json.id;
  ok(
    "PO from a pending requisition -> 409",
    (await call("POST", "/api/purchase-orders", newPo(pendingReq))).status ===
      409,
  );
  ok(
    "PO from an unknown requisition -> 404",
    (await call("POST", "/api/purchase-orders", newPo("REQ-999999"))).status ===
      404,
  );
  ok(
    "PO with no items -> 400",
    (await call("POST", "/api/purchase-orders", newPo(reqId, { items: [] })))
      .status === 400,
  );
  ok(
    "PO with negative price -> 400",
    (
      await call(
        "POST",
        "/api/purchase-orders",
        newPo(reqId, {
          items: [{ description: "x", quantity: 1, unitPrice: -5 }],
        }),
      )
    ).status === 400,
  );
  ok(
    "PO with tax rate 150 -> 400",
    (
      await call(
        "POST",
        "/api/purchase-orders",
        newPo(reqId, { taxRate: "150" }),
      )
    ).status === 400,
  );

  const po1 = await call(
    "POST",
    "/api/purchase-orders",
    newPo(reqId, {
      total: 1,
      subtotal: 1,
      status: "Delivered",
      poNumber: "PO-HACK",
    }),
  );
  ok(
    "create PO -> 201",
    po1.status === 201,
    po1.status + " " + JSON.stringify(po1.json),
  );
  ok(
    "PO id looks like PO-1001",
    /^PO-\d+$/.test(po1.json && po1.json.id),
    po1.json && po1.json.id,
  );
  ok(
    "browser-sent status/number are ignored",
    po1.json && po1.json.status === "Active" && po1.json.id !== "PO-HACK",
  );
  ok(
    "subtotal is worked out by the server (93049.30)",
    po1.json && po1.json.subtotal === "93049.30",
    po1.json && po1.json.subtotal,
  );
  ok(
    "tax is 12% (11165.92)",
    po1.json && po1.json.tax === "11165.92",
    po1.json && po1.json.tax,
  );
  ok(
    "total includes shipping (104315.22)",
    po1.json && po1.json.total === "104315.22",
    po1.json && po1.json.total,
  );
  const poId1 = po1.json && po1.json.id;

  const reqList = (await call("GET", "/api/requisitions")).json || [];
  const linked = reqList.find((r) => r.id === reqId);
  ok(
    "requisition now points at its PO",
    linked && linked.poId === poId1,
    linked && linked.poId,
  );
  ok(
    "second PO from the same requisition -> 409",
    (await call("POST", "/api/purchase-orders", newPo(reqId))).status === 409,
  );
  ok(
    "cancel a requisition that already has a PO -> 409",
    (await call("PATCH", "/api/requisitions/" + reqId, { status: "Cancelled" }))
      .status === 409,
  );

  const raceApproved = await createApproved();
  const poRace = await Promise.all(
    [1, 2, 3, 4, 5].map(() =>
      call("POST", "/api/purchase-orders", newPo(raceApproved)),
    ),
  );
  ok(
    "5 simultaneous POs from one requisition -> exactly one wins",
    poRace.filter((r) => r.status === 201).length === 1,
    poRace.map((r) => r.status).join(","),
  );

  const cancelReq = await createApproved();
  ok(
    "cancel approved requisition without PO -> 200",
    (
      await call("PATCH", "/api/requisitions/" + cancelReq, {
        status: "Cancelled",
      })
    ).status === 200,
  );
  ok(
    "cancel it again -> 409",
    (
      await call("PATCH", "/api/requisitions/" + cancelReq, {
        status: "Cancelled",
      })
    ).status === 409,
  );
  ok(
    "PO from a cancelled requisition -> 409",
    (await call("POST", "/api/purchase-orders", newPo(cancelReq))).status ===
      409,
  );

  /* ----- Cancelling a PO ----- */
  console.log("\n-- Cancelling a purchase order --");
  const cancelCase = await createActivePo();
  const cancelled = await call(
    "PATCH",
    "/api/purchase-orders/" + cancelCase.poId,
    { status: "Cancelled" },
  );
  ok(
    "cancel active PO -> 200 and Cancelled",
    cancelled.status === 200 && cancelled.json.status === "Cancelled",
    cancelled.status,
  );
  ok(
    "cancel it again -> 409",
    (
      await call("PATCH", "/api/purchase-orders/" + cancelCase.poId, {
        status: "Cancelled",
      })
    ).status === 409,
  );
  ok(
    "cancel unknown PO -> 404",
    (
      await call("PATCH", "/api/purchase-orders/PO-999999", {
        status: "Cancelled",
      })
    ).status === 404,
  );
  ok(
    "other PO changes are refused -> 400",
    (
      await call("PATCH", "/api/purchase-orders/" + poId1, {
        status: "Delivered",
      })
    ).status === 400,
  );
  const afterCancel = (
    (await call("GET", "/api/requisitions")).json || []
  ).find((r) => r.id === cancelCase.reqId);
  ok(
    "cancelling the PO frees its requisition (no poId)",
    afterCancel && !afterCancel.poId,
    afterCancel && afterCancel.poId,
  );
  const rePo = await call(
    "POST",
    "/api/purchase-orders",
    newPo(cancelCase.reqId),
  );
  ok(
    "freed requisition can get a new PO -> 201",
    rePo.status === 201,
    rePo.status,
  );

  /* ----- Deliveries ----- */
  console.log("\n-- Delivery receipts --");
  ok(
    "bad condition -> 400",
    (await call("POST", "/api/deliveries", newDelivery(poId1, "Whatever")))
      .status === 400,
  );
  ok(
    "missing received by -> 400",
    (
      await call(
        "POST",
        "/api/deliveries",
        newDelivery(poId1, PARTIAL, { receivedBy: "" }),
      )
    ).status === 400,
  );
  ok(
    "delivery for unknown PO -> 404",
    (await call("POST", "/api/deliveries", newDelivery("PO-999999", PARTIAL)))
      .status === 404,
  );

  const partial = await call(
    "POST",
    "/api/deliveries",
    newDelivery(poId1, PARTIAL),
  );
  ok(
    "partial delivery -> 201",
    partial.status === 201,
    partial.status + " " + JSON.stringify(partial.json),
  );
  ok(
    "DR id looks like DR-1001",
    /^DR-\d+$/.test(partial.json && partial.json.id),
    partial.json && partial.json.id,
  );
  let poNow = ((await call("GET", "/api/purchase-orders")).json || []).find(
    (p) => p.id === poId1,
  );
  ok(
    "partial delivery keeps the PO Active",
    poNow && poNow.status === "Active",
    poNow && poNow.status,
  );

  const complete = await call(
    "POST",
    "/api/deliveries",
    newDelivery(poId1, COMPLETE),
  );
  ok("complete delivery -> 201", complete.status === 201, complete.status);
  poNow = ((await call("GET", "/api/purchase-orders")).json || []).find(
    (p) => p.id === poId1,
  );
  ok(
    "complete delivery closes the PO (Delivered)",
    poNow && poNow.status === "Delivered",
    poNow && poNow.status,
  );
  ok(
    "another delivery on a Delivered PO -> 409",
    (await call("POST", "/api/deliveries", newDelivery(poId1, PARTIAL)))
      .status === 409,
  );
  ok(
    "delivery on a Cancelled PO -> 409",
    (
      await call(
        "POST",
        "/api/deliveries",
        newDelivery(cancelCase.poId, PARTIAL),
      )
    ).status === 409,
  );
  ok(
    "cancel a Delivered PO -> 409",
    (
      await call("PATCH", "/api/purchase-orders/" + poId1, {
        status: "Cancelled",
      })
    ).status === 409,
  );

  const raceDelivery = await createActivePo();
  const dRace = await Promise.all(
    [1, 2, 3].map(() =>
      call("POST", "/api/deliveries", newDelivery(raceDelivery.poId, COMPLETE)),
    ),
  );
  ok(
    "3 simultaneous complete deliveries -> exactly one wins",
    dRace.filter((r) => r.status === 201).length === 1,
    dRace.map((r) => r.status).join(","),
  );

  const deliveries = (await call("GET", "/api/deliveries")).json || [];
  const drIds = deliveries.map((d) => d.id);
  ok("every DR number is unique", new Set(drIds).size === drIds.length);

  /* ----- Server basics ----- */
  console.log("\n-- Server basics --");
  const unknown = await call("GET", "/api/does-not-exist");
  ok(
    "unknown API route -> 404 JSON",
    unknown.status === 404 && unknown.json && unknown.json.error,
  );
  const lists = await Promise.all(
    ["/api/requisitions", "/api/purchase-orders", "/api/deliveries"].map((p) =>
      call("GET", p),
    ),
  );
  ok(
    "all three lists load -> 200 arrays",
    lists.every((l) => l.status === 200 && Array.isArray(l.json)),
  );
  ok(
    "list items use id, never _id or __v",
    lists.every((l) =>
      l.json.every((x) => x.id && !("_id" in x) && !("__v" in x)),
    ),
  );

  console.log("\n-- Private files must not be downloadable --");
  for (const path of [
    "/app.js",
    "//app.js",
    "/./app.js",
    "/package.json",
    "/models/Requisition.js",
    "/./models/Requisition.js",
    "/.env",
    "/app.js.",
  ]) {
    const status = await rawGet(path);
    ok("GET " + path + " -> 404", status === 404, "got " + status);
  }

  console.log("\n" + passed + " passed, " + failed + " failed.");
  console.log(
    "Test records are labelled " +
      TAG +
      ". To remove them, see the cleanup command.",
  );
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((error) => {
  console.error("\nThe check could not finish:", error.message);
  console.error("Is the server running at " + BASE + " ?");
  process.exit(2);
});
