const STORAGE_KEYS = {
  requisitions: "procureit_requisitions",
  purchaseOrders: "procureit_purchaseOrders",
  counters: "procureit_counters",
};

/* ----- 1 Storage Configuration and Base Data Helpers ----- */
/* ----- Generic get/save, shared by all three record types ----- */

function getRecords(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Could not read " + storageKey + " from storage:", error);
    return [];
  }
}

function saveRecords(storageKey, records) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error("Could not save " + storageKey + " to storage:", error);
    return false;
  }
}

/* ----- Requisitions ----- */

let requisitionsCache = []; // filled by loadRequisitions()

/* Retrieves every requisition from the server */
async function loadRequisitions() {
  const response = await fetch("/api/requisitions");
  if (!response.ok) throw new Error("Server responded " + response.status);
  requisitionsCache = await response.json();
  return requisitionsCache;
}

function getRequisitions() {
  return JSON.parse(JSON.stringify(requisitionsCache));
}

async function sendToServer(url, method, body) {
  let response;
  try {
    response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error("Cannot reach the server. Is it running?");
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      result.error || "The server could not complete that request.",
    );
  }
  return result;
}

async function createRequisition(requisition) {
  const saved = await sendToServer("/api/requisitions", "POST", requisition);
  requisitionsCache.push(saved);
  return saved;
}

/* Changes one requisition on the server, e.g. updateRequisition("REQ-1001", { status: "Withdrawn" }) */
async function updateRequisition(id, changes) {
  const updated = await sendToServer(
    "/api/requisitions/" + encodeURIComponent(id),
    "PATCH",
    changes,
  );
  const index = requisitionsCache.findIndex((r) => r.id === id);
  if (index === -1) requisitionsCache.push(updated);
  else requisitionsCache[index] = updated;
  return updated;
}

async function startPage(setup) {
  try {
    await loadRequisitions();
  } catch (error) {
    console.error("Could not load requisitions from the server:", error);
    showMessage("Cannot reach the server. Start it with: npm start");
  }
  setup();
  setupRoleAccess();
}

/* ----- Purchase Orders ----- */

function getPurchaseOrders() {
  return getRecords(STORAGE_KEYS.purchaseOrders);
}

function savePurchaseOrders(purchaseOrders) {
  return saveRecords(STORAGE_KEYS.purchaseOrders, purchaseOrders);
}

/* ----- Delivery Receipts (stored in MongoDB) ----- */

let deliveriesCache = [];

/* Retrieves every saved delivery receipt from the server */
async function loadDeliveries() {
  const response = await fetch("/api/deliveries");
  if (!response.ok) throw new Error("Server responded " + response.status);
  deliveriesCache = await response.json();
  return deliveriesCache;
}

/* The receipts loaded so far (a copy), so the rest of the code keeps working as before */
function getDeliveries() {
  return JSON.parse(JSON.stringify(deliveriesCache));
}

/* Sends one new delivery receipt to the server to be stored; resolves with the saved record */
async function createDelivery(delivery) {
  let response;
  try {
    response = await fetch("/api/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(delivery),
    });
  } catch (error) {
    throw new Error("Cannot reach the server. Is it running?");
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "Could not save the delivery receipt.");
  }
  return result;
}
/* Frees the requisition behind a cancelled PO so a new PO can be made for it. */
async function releaseRequisitionFromPo(purchaseOrder) {
  try {
    await sendToServer("/api/requisitions/release", "POST", {
      poId: purchaseOrder.id,
    });
    await loadRequisitions();
  } catch (error) {
    console.error("Could not free the requisition:", error);
    showMessage(
      "The order was cancelled, but its requisition could not be freed: " +
        error.message,
    );
  }
}

/* ----- Invoices (stored in MongoDB) ----- */

let invoicesCache = [];

async function loadInvoices() {
  const response = await fetch("/api/invoices");
  if (!response.ok) throw new Error("Server responded " + response.status);
  invoicesCache = await response.json();
  return invoicesCache;
}

function getInvoices() {
  return JSON.parse(JSON.stringify(invoicesCache));
}

async function createInvoice(invoice) {
  const saved = await sendToServer("/api/invoices", "POST", invoice);
  invoicesCache.push(saved);
  return saved;
}

/* e.g. updateInvoice("INV-1001", { status: "Rejected", remarks: "..." }) */
async function updateInvoice(id, changes) {
  const updated = await sendToServer(
    "/api/invoices/" + encodeURIComponent(id),
    "PUT",
    changes,
  );
  const index = invoicesCache.findIndex((i) => i.id === id);
  if (index === -1) invoicesCache.push(updated);
  else invoicesCache[index] = updated;
  return updated;
}

/* ----- Vendors (stored in MongoDB) ----- */

let vendorsCache = [];

async function loadVendors() {
  const response = await fetch("/api/vendors");
  if (!response.ok) throw new Error("Server responded " + response.status);
  vendorsCache = await response.json();
  return vendorsCache;
}

function getVendors() {
  return JSON.parse(JSON.stringify(vendorsCache));
}

async function createVendor(vendor) {
  const saved = await sendToServer("/api/vendors", "POST", vendor);
  vendorsCache.push(saved);
  return saved;
}

/* e.g. updateVendor("VEN-1001", { status: "Inactive" }) */
async function updateVendor(id, changes) {
  const updated = await sendToServer(
    "/api/vendors/" + encodeURIComponent(id),
    "PUT",
    changes,
  );
  const index = vendorsCache.findIndex((v) => v.id === id);
  if (index === -1) vendorsCache.push(updated);
  else vendorsCache[index] = updated;
  return updated;
}
